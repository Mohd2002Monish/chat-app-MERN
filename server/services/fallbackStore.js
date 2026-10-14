import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");

const ROOMS_FILE = path.join(DATA_DIR, "fallback-rooms.json");
const MESSAGES_FILE = path.join(DATA_DIR, "fallback-messages.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return [];
    const data = fs.readFileSync(file, "utf8");
    return JSON.parse(data || "[]");
  } catch (err) {
    return [];
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write to fallback store:", err.message);
  }
}

export function saveFallbackRoom({ roomId, name, userId, lastMessage }) {
  const rooms = readJSON(ROOMS_FILE);
  const now = new Date();
  const existingIdx = rooms.findIndex((r) => r.roomId === roomId);

  if (existingIdx !== -1) {
    const existing = rooms[existingIdx];
    const members = Array.isArray(existing.members) ? existing.members : [];
    if (userId && !members.includes(userId)) {
      members.push(userId);
    }
    rooms[existingIdx] = {
      ...existing,
      name: name || existing.name,
      lastMessage: lastMessage || existing.lastMessage,
      lastActive: now,
      members,
    };
  } else {
    rooms.push({
      roomId,
      name: name || `Room ${roomId.slice(-4).toUpperCase()}`,
      creatorId: userId || null,
      members: userId ? [userId] : [],
      lastMessage: lastMessage || "Encrypted channel ready",
      createdAt: now,
      lastActive: now,
    });
  }

  writeJSON(ROOMS_FILE, rooms);
  return rooms.find((r) => r.roomId === roomId);
}

export function getFallbackUserRooms(userId) {
  const rooms = readJSON(ROOMS_FILE);
  return rooms
    .filter(
      (r) =>
        r.creatorId === userId ||
        (Array.isArray(r.members) && r.members.includes(userId))
    )
    .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
}

export function renameFallbackRoom(roomId, newName) {
  const rooms = readJSON(ROOMS_FILE);
  const room = rooms.find((r) => r.roomId === roomId);
  if (room) {
    room.name = newName.trim();
    room.lastActive = new Date();
    writeJSON(ROOMS_FILE, rooms);
  }
  return room;
}

export function saveFallbackRoomMessage(msg) {
  const messages = readJSON(MESSAGES_FILE);
  messages.push({
    ...msg,
    timestamp: msg.timestamp || new Date(),
  });
  // Cap messages per file to prevent unbounded growth in fallback
  if (messages.length > 5000) {
    messages.splice(0, messages.length - 5000);
  }
  writeJSON(MESSAGES_FILE, messages);
}

export function getFallbackRoomMessages(roomId) {
  const messages = readJSON(MESSAGES_FILE);
  return messages.filter((m) => m.roomId === roomId);
}

export function cleanupFallbackInactiveRooms(cutoffDate) {
  const rooms = readJSON(ROOMS_FILE);
  const activeRooms = [];
  const purgedRoomIds = [];

  for (const r of rooms) {
    if (new Date(r.lastActive) < cutoffDate) {
      purgedRoomIds.push(r.roomId);
    } else {
      activeRooms.push(r);
    }
  }

  if (purgedRoomIds.length > 0) {
    writeJSON(ROOMS_FILE, activeRooms);
    const messages = readJSON(MESSAGES_FILE);
    const activeMessages = messages.filter((m) => !purgedRoomIds.includes(m.roomId));
    writeJSON(MESSAGES_FILE, activeMessages);
    console.log(`[Fallback Store] Cleaned up ${purgedRoomIds.length} inactive rooms.`);
  }
}
