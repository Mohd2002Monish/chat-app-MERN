/**
 * Anonymous User Identity Management
 * Provides instant frictionless identity without passwords or sign-up.
 */

const ADJECTIVES = [
  "Silent",
  "Cosmic",
  "Shadow",
  "Hyper",
  "Cyber",
  "Phantom",
  "Quantum",
  "Neon",
  "Ghost",
  "Solar",
  "Velvet",
  "Echo",
  "Astral",
  "Mystic",
  "Stealth",
];

const NOUNS = [
  "Fox",
  "Falcon",
  "Phoenix",
  "Wolf",
  "Viper",
  "Owl",
  "Raven",
  "Hawk",
  "Lynx",
  "Tiger",
  "Cipher",
  "Nomad",
  "Pioneer",
  "Drifter",
  "Spectre",
];

export function generateRandomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj} ${noun} ${num}`;
}

export function getAnonymousUser() {
  if (typeof window === "undefined") {
    return {
      id: "anon_" + Math.random().toString(36).substring(2, 10),
      name: "Anonymous User",
      color: 0,
    };
  }

  const stored = localStorage.getItem("e2ee_anon_user");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.id && parsed.name) {
        return parsed;
      }
    } catch {
      // fall through to regenerate
    }
  }

  const newUser = {
    id: "anon_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
    name: generateRandomName(),
    color: Math.floor(Math.random() * 5),
  };

  localStorage.setItem("e2ee_anon_user", JSON.stringify(newUser));
  return newUser;
}

export function saveAnonymousUser(user) {
  if (typeof window !== "undefined") {
    localStorage.setItem("e2ee_anon_user", JSON.stringify(user));
  }
  return user;
}
