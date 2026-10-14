/**
 * Zero-Knowledge Room Vault & Database Sync
 * Manages user's multiple encrypted rooms stored in browser localStorage
 * and synced with MongoDB (with 15-day inactivity lifecycle).
 */

import { apiClient } from "./api-client";
import { getAnonymousUser } from "./anonymous-user";

const STORAGE_KEY = "e2ee_user_rooms";

export function getStoredRooms() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const rooms = JSON.parse(raw);
    return Array.isArray(rooms) ? rooms : [];
  } catch (err) {
    console.error("Failed to read stored rooms:", err);
    return [];
  }
}

/**
 * Save room to local storage and sync with MongoDB
 */
export function saveRoomToVault({ roomId, key, name, lastMessage }) {
  if (typeof window === "undefined" || !roomId) return [];

  const rooms = getStoredRooms();
  const existingIdx = rooms.findIndex((r) => r.roomId === roomId);

  const now = Date.now();
  let updatedRooms;
  const roomName = name || (existingIdx !== -1 ? rooms[existingIdx].name : `Room ${roomId.slice(-4).toUpperCase()}`);

  if (existingIdx !== -1) {
    const existing = rooms[existingIdx];
    const updated = {
      ...existing,
      key: key || existing.key,
      name: roomName,
      lastActive: now,
      lastMessage: lastMessage !== undefined ? lastMessage : existing.lastMessage,
    };
    rooms.splice(existingIdx, 1);
    updatedRooms = [updated, ...rooms];
  } else {
    const newRoom = {
      roomId,
      key: key || "",
      name: roomName,
      createdAt: now,
      lastActive: now,
      lastMessage: lastMessage || "New conversation",
    };
    updatedRooms = [newRoom, ...rooms];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRooms));
  window.dispatchEvent(new Event("rooms_vault_updated"));

  // Async sync to MongoDB in background
  syncRoomToDatabase({
    roomId,
    name: roomName,
    lastMessage,
  });

  return updatedRooms;
}

/**
 * Persist room and user association to MongoDB
 */
export function syncRoomToDatabase({ roomId, name, lastMessage }) {
  if (typeof window === "undefined" || !roomId) return;
  try {
    const user = getAnonymousUser();
    apiClient
      .post("/api/rooms", {
        roomId,
        name,
        userId: user.id,
        lastMessage,
      })
      .catch((err) => {
        // Silently handle offline/network blips
      });
  } catch (err) {
    console.warn("Could not sync room to database:", err);
  }
}

/**
 * Sync and merge rooms from MongoDB (e.g. on load, or checking if room was deleted after 15 days)
 */
export async function syncRoomsWithDatabase() {
  if (typeof window === "undefined") return [];
  try {
    const user = getAnonymousUser();
    if (!user?.id) return getStoredRooms();

    const res = await apiClient.get(`/api/rooms/user/${user.id}`);
    if (res.status === 200 && Array.isArray(res.data?.rooms)) {
      const dbRooms = res.data.rooms;
      const localRooms = getStoredRooms();

      // If a room in localRooms is older than 15 days and no longer in DB, remove it
      const dbRoomIds = new Set(dbRooms.map((r) => r.roomId));
      const activeLocalRooms = localRooms.filter((lr) => {
        // Keep if in DB or created less than 15 days ago
        const isRecent = lr.createdAt && Date.now() - lr.createdAt < 15 * 24 * 60 * 60 * 1000;
        return dbRoomIds.has(lr.roomId) || isRecent;
      });

      // Merge DB room names and lastActive into local rooms
      const merged = activeLocalRooms.map((lr) => {
        const dbMatch = dbRooms.find((dr) => dr.roomId === lr.roomId);
        if (dbMatch) {
          return {
            ...lr,
            name: lr.name || dbMatch.name,
            lastMessage: dbMatch.lastMessage || lr.lastMessage,
            lastActive: new Date(dbMatch.lastActive).getTime() || lr.lastActive,
          };
        }
        return lr;
      });

      // Also add any room from DB not in local (without key until opened)
      for (const dr of dbRooms) {
        if (!merged.some((m) => m.roomId === dr.roomId)) {
          merged.push({
            roomId: dr.roomId,
            key: "",
            name: dr.name || `Room ${dr.roomId.slice(-4).toUpperCase()}`,
            createdAt: new Date(dr.createdAt).getTime(),
            lastActive: new Date(dr.lastActive).getTime(),
            lastMessage: dr.lastMessage || "Active",
          });
        }
      }

      // Sort by newest activity
      merged.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new Event("rooms_vault_updated"));
      return merged;
    }
  } catch (err) {
    // Offline or network error, fallback to local rooms
  }
  return getStoredRooms();
}

export function updateRoomName(roomId, newName) {
  if (typeof window === "undefined" || !roomId || !newName.trim()) return;
  const rooms = getStoredRooms();
  const updated = rooms.map((r) =>
    r.roomId === roomId ? { ...r, name: newName.trim() } : r
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("rooms_vault_updated"));

  // Update in DB
  apiClient
    .put(`/api/rooms/${roomId}/rename`, { name: newName.trim() })
    .catch(() => {});

  return updated;
}

export function updateRoomLastMessage(roomId, messageSnippet) {
  if (typeof window === "undefined" || !roomId) return;
  const rooms = getStoredRooms();
  const updated = rooms.map((r) =>
    r.roomId === roomId
      ? { ...r, lastMessage: messageSnippet, lastActive: Date.now() }
      : r
  );
  updated.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("rooms_vault_updated"));

  // Background update in DB
  syncRoomToDatabase({ roomId, lastMessage: messageSnippet });
  return updated;
}

export function removeRoomFromVault(roomId) {
  if (typeof window === "undefined" || !roomId) return [];
  const rooms = getStoredRooms();
  const filtered = rooms.filter((r) => r.roomId !== roomId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new Event("rooms_vault_updated"));

  // Disassociate user from room in DB
  try {
    const user = getAnonymousUser();
    if (user?.id) {
      apiClient.delete(`/api/rooms/${roomId}/user/${user.id}`).catch(() => {});
    }
  } catch {}

  return filtered;
}
