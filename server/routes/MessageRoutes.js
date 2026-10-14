import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import {
  getMessages,
  uploadFile,
  getRoomMessages,
  uploadRoomFile,
  clearRoomMessages,
} from "../controllers/MessagesController.js";
import multer from "multer";

const messagesRoute = Router();
const upload = multer({
  dest: "uploads/files",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Authenticated legacy routes
messagesRoute.post(
  "/get-messages",
  verifyToken,
  getMessages
);

messagesRoute.post(
  "/upload-file",
  verifyToken,
  upload.single("file"),
  uploadFile
);

// End-to-End Encrypted Room routes (No login required)
messagesRoute.get("/room/:roomId", getRoomMessages);
messagesRoute.post("/upload-room-file", upload.single("file"), uploadRoomFile);
messagesRoute.delete("/room/:roomId", clearRoomMessages);

export default messagesRoute;
