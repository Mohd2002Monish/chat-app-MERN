import http from "http";
import express from "express";
import next from "next";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import authRoutes from "./server/routes/AuthRoutes.js";
import contactsRoute from "./server/routes/ContactRoutes.js";
import messagesRoute from "./server/routes/MessageRoutes.js";
import roomRoutes from "./server/routes/RoomRoutes.js";
import setupSocket from "./server/socket.js";
import { startRoomCleanupSchedule } from "./server/services/roomCleanup.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

// Ensure upload directories exist
const profileUploads = path.join(__dirname, "uploads/profiles");
const fileUploads = path.join(__dirname, "uploads/files");
if (!fs.existsSync(profileUploads)) fs.mkdirSync(profileUploads, { recursive: true });
if (!fs.existsSync(fileUploads)) fs.mkdirSync(fileUploads, { recursive: true });

const mongoUri = process.env.MONGO_URI;

await nextApp.prepare();

const expressApp = express();

expressApp.use(
  cors({
    origin: process.env.ORIGIN ? [process.env.ORIGIN] : true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

expressApp.use(cookieParser());
expressApp.use(express.json());

// Serve static uploaded files
expressApp.use("/uploads/profiles", express.static(profileUploads));
expressApp.use("/uploads/files", express.static(fileUploads));

// Express API routes
expressApp.use("/api/auth", authRoutes);
expressApp.use("/api/contacts", contactsRoute);
expressApp.use("/api/messages", messagesRoute);
expressApp.use("/api/rooms", roomRoutes);

// Delegate all other routes to Next.js (App Router pages, assets, etc.)
expressApp.all("*", (req, res) => {
  return handle(req, res);
});

const server = http.createServer(expressApp);

// Setup Socket.IO on the same HTTP server instance
setupSocket(server);

// Prevent Mongoose from freezing operations for 10s when DB is not connected
mongoose.set("bufferCommands", false);

// Connect Database and Start Server
if (mongoUri) {
  mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    })
    .then(() => {
      console.log("Database connected successfully!");
    })
    .catch((error) => {
      console.error("Database connection failed (bad auth or network):", error.message);
      console.log("-> Running smoothly in zero-latency fallback mode.");
    });
} else {
  console.warn("WARNING: MONGO_URI is not set in environment.");
}

// Start 15-day inactive room auto-cleanup scheduler (cleans both DB & fallback store)
startRoomCleanupSchedule();

server.listen(port, "0.0.0.0", () => {
  console.log(`> Ready on http://localhost:${port}`);
});
