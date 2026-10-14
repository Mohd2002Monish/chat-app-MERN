/**
 * Zero-Knowledge Client-Side End-to-End Encryption (E2EE) Module
 * Uses standard Web Crypto API (AES-GCM 256-bit)
 *
 * Keys are kept strictly in the client's browser and URL hash (#key).
 * The server and network layer NEVER have access to the encryption key or plaintext.
 */

// Helper to convert ArrayBuffer to URL-safe Base64
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper to convert URL-safe Base64 to Uint8Array
export function base64ToBuffer(base64) {
  let str = base64.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4 !== 0) {
    str += "=";
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a new 256-bit AES-GCM cryptographic key
 * @returns {Promise<{ key: CryptoKey, keyString: string }>}
 */
export async function generateRoomKey() {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available in this environment.");
  }

  const cryptoKey = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable so we can place it in URL hash
    ["encrypt", "decrypt"]
  );

  const exportedRaw = await window.crypto.subtle.exportKey("raw", cryptoKey);
  const keyString = bufferToBase64(exportedRaw);

  return { key: cryptoKey, keyString };
}

/**
 * Import a 256-bit AES-GCM key from a URL-safe Base64 string
 * @param {string} keyString
 * @returns {Promise<CryptoKey>}
 */
export async function importRoomKey(keyString) {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available in this environment.");
  }

  const rawBuffer = base64ToBuffer(keyString);
  return await window.crypto.subtle.importKey(
    "raw",
    rawBuffer,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // non-extractable once imported
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a string or JSON object
 * @param {string | object} data
 * @param {CryptoKey} cryptoKey
 * @returns {Promise<{ ciphertext: string, iv: string }>}
 */
export async function encryptData(data, cryptoKey) {
  const plaintext = typeof data === "string" ? data : JSON.stringify(data);
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(plaintext);

  // Generate a random 12-byte IV for every single message
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    cryptoKey,
    encodedData
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

/**
 * Decrypt ciphertext
 * @param {string} ciphertextBase64
 * @param {string} ivBase64
 * @param {CryptoKey} cryptoKey
 * @returns {Promise<string>}
 */
export async function decryptData(ciphertextBase64, ivBase64, cryptoKey) {
  try {
    const ciphertext = base64ToBuffer(ciphertextBase64);
    const iv = base64ToBuffer(ivBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv),
      },
      cryptoKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    return "[Decryption error: Invalid key or corrupted ciphertext]";
  }
}

/**
 * Encrypt an arbitrary file/blob with AES-GCM
 * @param {Blob | File} file
 * @param {CryptoKey} cryptoKey
 * @returns {Promise<{ encryptedBlob: Blob, iv: string, originalName: string, mimeType: string, size: number }>}
 */
export async function encryptFileBlob(file, cryptoKey) {
  const arrayBuffer = await file.arrayBuffer();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    cryptoKey,
    arrayBuffer
  );

  const encryptedBlob = new Blob([encryptedBuffer], {
    type: "application/octet-stream",
  });

  return {
    encryptedBlob,
    iv: bufferToBase64(iv.buffer),
    originalName: file.name || "attachment",
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  };
}

/**
 * Decrypt an encrypted ArrayBuffer back into a readable Blob
 * @param {ArrayBuffer} encryptedBuffer
 * @param {string} ivBase64
 * @param {CryptoKey} cryptoKey
 * @param {string} mimeType
 * @returns {Promise<Blob>}
 */
export async function decryptFileBlob(
  encryptedBuffer,
  ivBase64,
  cryptoKey,
  mimeType = "application/octet-stream"
) {
  const iv = base64ToBuffer(ivBase64);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    cryptoKey,
    encryptedBuffer
  );

  return new Blob([decryptedBuffer], { type: mimeType });
}

/**
 * Generate a visual Safety Number / Fingerprint for verifying encryption
 * @param {string} keyString
 * @returns {Promise<string>}
 */
export async function getKeyFingerprint(keyString) {
  try {
    const rawBuffer = base64ToBuffer(keyString);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", rawBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Format into 4 chunks of 4 hex digits
    return hashArray
      .slice(0, 8)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join("")
      .match(/.{1,4}/g)
      .join(" · ");
  } catch {
    return "E2EE-ACTIVE";
  }
}
