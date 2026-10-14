import mongoose from "mongoose";
import Message from "../models/MessagesModel.js";
import RoomMessage from "../models/RoomMessageModel.js";
import { getFallbackRoomMessages } from "../services/fallbackStore.js";
import { mkdirSync, renameSync } from "fs";
import path from "path";

export const getMessages = async (req, res, next) => {
  try {
    const user1 = req.userId;
    const user2 = req.body.id;
    if (!user1 || !user2) {
      return res
        .status(400)
        .send("Both user ID's are required");
    }
    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 },
      ],
    }).sort({ timestamp: 1 });
    return res.status(200).json({ messages });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const uploadFile = async (req, res, next) => {
  try {
    const { userId } = req;
    if (!req.file) {
      return res.status(400).send("File is required!");
    }
    const date = Date.now();
    let fileDir = `uploads/files/${date}`;
    let fileName = `${fileDir}/${req.file.originalname}`;

    mkdirSync(fileDir, { recursive: true });
    renameSync(req.file.path, fileName);

    return res.status(200).json({
      filePath: fileName,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal Server Error");
  }
};

// End-to-End Encrypted Room Controllers (No Login Required)
export const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    if (mongoose.connection.readyState === 1) {
      const messages = await RoomMessage.find({ roomId })
        .sort({ timestamp: 1 })
        .limit(200);
      return res.status(200).json({ messages });
    } else {
      const messages = getFallbackRoomMessages(roomId);
      return res.status(200).json({ messages });
    }
  } catch (error) {
    console.error("Error fetching room messages:", error.message);
    const messages = getFallbackRoomMessages(req.params.roomId);
    return res.status(200).json({ messages });
  }
};

export const uploadRoomFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required!" });
    }
    const date = Date.now();
    const fileDir = `uploads/files/encrypted/${date}`;
    mkdirSync(fileDir, { recursive: true });

    // Store with safe unique name while keeping extension
    const safeBaseName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const targetPath = `${fileDir}/${safeBaseName}`;
    renameSync(req.file.path, targetPath);

    return res.status(200).json({
      filePath: targetPath,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
  } catch (error) {
    console.error("Error in uploadRoomFile:", error);
    return res.status(500).json({ message: "Failed to upload encrypted file" });
  }
};

export const clearRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }
    await RoomMessage.deleteMany({ roomId });
    return res.status(200).json({ message: "Room messages cleared successfully" });
  } catch (error) {
    console.error("Error clearing room messages:", error);
    return res.status(500).json({ message: "Failed to clear room messages" });
  }
};
