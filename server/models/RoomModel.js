import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    default: "Encrypted Room",
  },
  creatorId: {
    type: String,
    default: null,
  },
  members: {
    type: [String],
    default: [],
    index: true,
  },
  lastMessage: {
    type: String,
    default: "Encrypted channel ready",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActive: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

export default Room;
