import mongoose from "mongoose";
import Room from "../models/RoomModel.js";
import {
  saveFallbackRoom,
  getFallbackUserRooms,
  renameFallbackRoom,
} from "../services/fallbackStore.js";

/**
 * Save or update a room in the database and register user as a member
 */
export const saveOrUpdateRoom = async (req, res) => {
  try {
    const { roomId, name, userId, lastMessage } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    // Check if MongoDB is connected (readyState === 1)
    if (mongoose.connection.readyState === 1) {
      const updateFields = {
        lastActive: new Date(),
      };

      if (name) updateFields.name = name;
      if (lastMessage) updateFields.lastMessage = lastMessage;

      const updateQuery = {
        $set: updateFields,
      };

      if (userId) {
        updateQuery.$addToSet = { members: userId };
      }

      const room = await Room.findOneAndUpdate(
        { roomId },
        updateQuery,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({ room });
    } else {
      // MongoDB not connected: use zero-latency fallback store
      const room = saveFallbackRoom({ roomId, name, userId, lastMessage });
      return res.status(200).json({ room });
    }
  } catch (error) {
    console.error("Error in saveOrUpdateRoom:", error.message);
    const room = saveFallbackRoom(req.body);
    return res.status(200).json({ room });
  }
};

/**
 * Fetch all rooms that a user belongs to
 */
export const getUserRooms = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (mongoose.connection.readyState === 1) {
      const rooms = await Room.find({
        $or: [{ members: userId }, { creatorId: userId }],
      }).sort({ lastActive: -1 });

      return res.status(200).json({ rooms });
    } else {
      const rooms = getFallbackUserRooms(userId);
      return res.status(200).json({ rooms });
    }
  } catch (error) {
    console.error("Error in getUserRooms:", error.message);
    const rooms = getFallbackUserRooms(req.params.userId);
    return res.status(200).json({ rooms });
  }
};

/**
 * Rename a room
 */
export const renameRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name } = req.body;

    if (!roomId || !name?.trim()) {
      return res.status(400).json({ message: "roomId and name are required" });
    }

    if (mongoose.connection.readyState === 1) {
      const room = await Room.findOneAndUpdate(
        { roomId },
        { name: name.trim(), lastActive: new Date() },
        { new: true }
      );
      return res.status(200).json({ room });
    } else {
      const room = renameFallbackRoom(roomId, name);
      return res.status(200).json({ room });
    }
  } catch (error) {
    console.error("Error in renameRoom:", error.message);
    const room = renameFallbackRoom(req.params.roomId, req.body.name);
    return res.status(200).json({ room });
  }
};

/**
 * Remove user from a room (leave room)
 */
export const leaveRoom = async (req, res) => {
  try {
    const { roomId, userId } = req.params;

    if (!roomId || !userId) {
      return res.status(400).json({ message: "roomId and userId are required" });
    }

    if (mongoose.connection.readyState === 1) {
      await Room.findOneAndUpdate(
        { roomId },
        { $pull: { members: userId } }
      );
    }

    return res.status(200).json({ message: "Left room successfully" });
  } catch (error) {
    return res.status(200).json({ message: "Left room successfully" });
  }
};
