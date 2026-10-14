import mongoose from "mongoose";

const roomMessageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  senderName: {
    type: String,
    default: "Anonymous",
  },
  senderColor: {
    type: Number,
    default: 0,
  },
  messageType: {
    type: String,
    enum: ["text", "file"],
    default: "text",
  },
  encryptedPayload: {
    type: String,
    required: true,
  },
  iv: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
    default: null,
  },
  fileName: {
    type: String,
    default: null,
  },
  fileSize: {
    type: Number,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const RoomMessage =
  mongoose.models.RoomMessage ||
  mongoose.model("RoomMessage", roomMessageSchema);

export default RoomMessage;
