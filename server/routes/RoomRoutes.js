import { Router } from "express";
import {
  saveOrUpdateRoom,
  getUserRooms,
  renameRoom,
  leaveRoom,
} from "../controllers/RoomController.js";

const roomRoutes = Router();

roomRoutes.post("/", saveOrUpdateRoom);
roomRoutes.get("/user/:userId", getUserRooms);
roomRoutes.put("/:roomId/rename", renameRoom);
roomRoutes.delete("/:roomId/user/:userId", leaveRoom);

export default roomRoutes;
