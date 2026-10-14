import mongoose from "mongoose";
import Room from "../models/RoomModel.js";
import RoomMessage from "../models/RoomMessageModel.js";
import { cleanupFallbackInactiveRooms } from "./fallbackStore.js";

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

/**
 * Deletes any rooms and their encrypted chat history that have been inactive for more than 15 days.
 */
export async function cleanupInactiveRooms() {
  try {
    const cutoffDate = new Date(Date.now() - FIFTEEN_DAYS_MS);

    // Always clean inactive rooms in the fallback store
    cleanupFallbackInactiveRooms(cutoffDate);

    // Only query MongoDB if connected
    if (mongoose.connection.readyState !== 1) {
      return { deletedCount: 0 };
    }

    // Find all rooms where lastActive is older than 15 days
    const inactiveRooms = await Room.find({
      lastActive: { $lt: cutoffDate },
    }).select("roomId name lastActive");

    if (inactiveRooms.length === 0) {
      return { deletedCount: 0 };
    }

    const inactiveRoomIds = inactiveRooms.map((r) => r.roomId);

    // 1. Delete all encrypted chat messages for the inactive rooms
    const deletedMessages = await RoomMessage.deleteMany({
      roomId: { $in: inactiveRoomIds },
    });

    // 2. Delete the inactive room records
    const deletedRooms = await Room.deleteMany({
      roomId: { $in: inactiveRoomIds },
    });

    console.log(
      `[Room Cleanup] Successfully purged ${deletedRooms.deletedCount} rooms inactive for >15 days and ${deletedMessages.deletedCount} associated messages.`
    );

    return {
      deletedCount: deletedRooms.deletedCount,
      deletedMessagesCount: deletedMessages.deletedCount,
    };
  } catch (error) {
    console.error("[Room Cleanup] Error during inactive room cleanup:", error.message);
    return { error: error.message };
  }
}

/**
 * Start the recurring background task to clean inactive rooms
 * Runs on startup and then every 6 hours
 */
export function startRoomCleanupSchedule() {
  // Run once after initial delay
  setTimeout(() => {
    cleanupInactiveRooms();
  }, 5000);

  // Run every 6 hours
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    cleanupInactiveRooms();
  }, SIX_HOURS_MS);

  console.log("[Room Cleanup] 15-day auto-purge scheduler initialized.");
}
