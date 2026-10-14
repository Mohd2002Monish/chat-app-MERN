import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import Message from "./models/MessagesModel.js";
import RoomMessage from "./models/RoomMessageModel.js";
import Room from "./models/RoomModel.js";
import {
    saveFallbackRoom,
    saveFallbackRoomMessage,
} from "./services/fallbackStore.js";

const setupSocket = (server) => {
    const io = new SocketIOServer(server, {
        cors: {
            origin: process.env.ORIGIN ? [process.env.ORIGIN] : true,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            credentials: true,
        },
    });

    const userSocketMap = new Map();
    // Maps roomId -> Map(socketId, user)
    const roomUsersMap = new Map();
    // Maps socketId -> Set(roomId)
    const socketRoomsMap = new Map();

    const disconnect = (socket) => {
        console.log(`Client disconnected from socket ID: ${socket.id}`);

        // Clean up direct message user mapping
        for (const [userId, socketId] of userSocketMap.entries()) {
            if (socketId === socket.id) {
                userSocketMap.delete(userId);
                break;
            }
        }

        // Clean up room memberships
        const joinedRooms = socketRoomsMap.get(socket.id);
        if (joinedRooms) {
            joinedRooms.forEach((roomId) => {
                const roomMembers = roomUsersMap.get(roomId);
                if (roomMembers) {
                    const leavingUser = roomMembers.get(socket.id);
                    roomMembers.delete(socket.id);

                    if (roomMembers.size === 0) {
                        roomUsersMap.delete(roomId);
                    } else {
                        socket.to(roomId).emit("user-left", {
                            socketId: socket.id,
                            user: leavingUser,
                            activeUsers: Array.from(roomMembers.values()),
                        });
                    }
                }
            });
            socketRoomsMap.delete(socket.id);
        }
    };

    // Legacy direct message handler
    const sendMessage = async (message) => {
        try {
            const senderSocketId = userSocketMap.get(message.sender);
            const recipientSocketId = userSocketMap.get(message.recipient);

            const createdMessage = await Message.create(message);

            const messageData = await Message.findById(createdMessage._id)
                .populate("sender", "id email firstName lastName image color")
                .populate("recipient", "id email firstName lastName image color");

            if (recipientSocketId) {
                io.to(recipientSocketId).emit("receiveMessage", messageData);
            }
            if (senderSocketId) {
                io.to(senderSocketId).emit("receiveMessage", messageData);
            }
        } catch (error) {
            console.error("Error in sendMessage socket event:", error);
        }
    };

    // Legacy channel message handler
    const sendChannelMessage = async (message) => {
        try {
            const { channelId, sender, content, messageType, fileUrl } = message;
            const createdMessage = await Message.create({
                sender,
                recipient: null,
                content,
                messageType,
                fileUrl,
            });
            const messageData = await Message.findById(createdMessage._id)
                .populate("sender", "id email firstName lastName image color")
                .exec();

            if (typeof Channel !== "undefined") {
                await Channel.findByIdAndUpdate(channelId, {
                    $push: { messages: createdMessage._id },
                });

                const channel = await Channel.findById(channelId).populate("members");

                const finalData = {
                    ...messageData._doc,
                    channelId: channel._id,
                };

                if (channel && channel.members) {
                    channel.members.forEach((member) => {
                        const memberSocketId = userSocketMap.get(member.id.toString());
                        if (memberSocketId) {
                            io.to(memberSocketId).emit("receive-channel-message", finalData);
                        }
                    });
                    const adminSocketId = userSocketMap.get(channel.admin?._id?.toString());
                    if (adminSocketId) {
                        io.to(adminSocketId).emit("receive-channel-message", finalData);
                    }
                }
            }
        } catch (error) {
            console.error("Error in sendChannelMessage socket event:", error);
        }
    };

    // End-to-End Encrypted Room Handlers
    const handleJoinRoom = (socket, { roomId, user }) => {
        if (!roomId) return;
        socket.join(roomId);

        if (!roomUsersMap.has(roomId)) {
            roomUsersMap.set(roomId, new Map());
        }
        const roomMembers = roomUsersMap.get(roomId);
        const userInfo = {
            socketId: socket.id,
            id: user?.id || socket.id,
            name: user?.name || "Anonymous",
            color: user?.color !== undefined ? user.color : 0,
            joinedAt: Date.now(),
        };
        roomMembers.set(socket.id, userInfo);

        if (!socketRoomsMap.has(socket.id)) {
            socketRoomsMap.set(socket.id, new Set());
        }
        socketRoomsMap.get(socket.id).add(roomId);

        const activeUsers = Array.from(roomMembers.values());
        // Emit current active users to the user who just joined
        socket.emit("room-users", activeUsers);

        // Notify other room members that someone joined
        socket.to(roomId).emit("user-joined", {
            user: userInfo,
            activeUsers,
        });

        console.log(`Socket ${socket.id} joined room ${roomId}. Active in room: ${activeUsers.length}`);

        // Register room membership and update activity (for 15-day lifecycle)
        if (mongoose.connection.readyState === 1) {
            Room.findOneAndUpdate(
                { roomId },
                {
                    $addToSet: { members: userInfo.id },
                    $setOnInsert: {
                        name: `Room ${roomId.slice(-4).toUpperCase()}`,
                        createdAt: new Date(),
                        creatorId: userInfo.id,
                    },
                    lastActive: new Date(),
                },
                { upsert: true }
            ).catch((err) => console.warn("Async room register warning:", err.message));
        } else {
            saveFallbackRoom({
                roomId,
                userId: userInfo.id,
                name: `Room ${roomId.slice(-4).toUpperCase()}`,
            });
        }
    };

    const handleLeaveRoom = (socket, { roomId }) => {
        if (!roomId) return;
        socket.leave(roomId);

        const roomMembers = roomUsersMap.get(roomId);
        if (roomMembers) {
            const leavingUser = roomMembers.get(socket.id);
            roomMembers.delete(socket.id);
            const activeUsers = Array.from(roomMembers.values());
            socket.to(roomId).emit("user-left", {
                socketId: socket.id,
                user: leavingUser,
                activeUsers,
            });
        }

        const joinedRooms = socketRoomsMap.get(socket.id);
        if (joinedRooms) {
            joinedRooms.delete(roomId);
        }
    };

    const handleSendRoomMessage = async (data) => {
        try {
            const {
                roomId,
                senderId,
                senderName,
                senderColor,
                encryptedPayload,
                iv,
                messageType = "text",
                fileUrl = null,
                fileName = null,
                fileSize = null,
                timestamp = Date.now(),
                clientMsgId = null,
            } = data;

            if (!roomId || !encryptedPayload || !iv) {
                console.error("Invalid encrypted room message payload");
                return;
            }

            const messageId = new mongoose.Types.ObjectId();
            const messagePayload = {
                _id: messageId,
                clientMsgId,
                roomId,
                senderId: senderId || "anonymous",
                senderName: senderName || "Anonymous",
                senderColor: senderColor || 0,
                messageType,
                encryptedPayload,
                iv,
                fileUrl,
                fileName,
                fileSize,
                timestamp: new Date(timestamp),
            };

            // 1. INSTANT BROADCAST (0ms latency, does not block on DB roundtrip)
            io.to(roomId).emit("receive-room-message", messagePayload);

            // 2. Persist to MongoDB if connected, or fallback store
            if (mongoose.connection.readyState === 1) {
                RoomMessage.create(messagePayload).catch((dbErr) => {
                    console.warn("Async room message save warning:", dbErr.message);
                });

                // Reset 15-day activity timer and update room snippet in MongoDB
                Room.findOneAndUpdate(
                    { roomId },
                    {
                        lastActive: new Date(),
                        lastMessage: messageType === "file" ? "📎 Encrypted file" : "🔒 Encrypted message",
                        $addToSet: { members: senderId },
                    }
                ).catch((dbErr) => {
                    console.warn("Async room activity update warning:", dbErr.message);
                });
            } else {
                saveFallbackRoomMessage(messagePayload);
                saveFallbackRoom({
                    roomId,
                    userId: senderId,
                    lastMessage: messageType === "file" ? "📎 Encrypted file" : "🔒 Encrypted message",
                });
            }
        } catch (error) {
            console.error("Error in handleSendRoomMessage:", error);
        }
    };

    const handleRoomTyping = (socket, { roomId, user, isTyping }) => {
        if (!roomId) return;
        socket.to(roomId).emit("peer-typing", { user, isTyping });
    };

    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId;
        if (userId) {
            userSocketMap.set(userId, socket.id);
            console.log(`User connected: ${userId} with socket ID: ${socket.id}`);
        } else {
            console.log(`Anonymous client connected with socket ID: ${socket.id}`);
        }

        // Legacy socket events
        socket.on("sendMessage", sendMessage);
        socket.on("send-channel-message", sendChannelMessage);

        // E2EE Room events
        socket.on("join-room", (data) => handleJoinRoom(socket, data));
        socket.on("leave-room", (data) => handleLeaveRoom(socket, data));
        socket.on("send-room-message", handleSendRoomMessage);
        socket.on("room-typing", (data) => handleRoomTyping(socket, data));

        socket.on("disconnect", () => disconnect(socket));
    });
};

export default setupSocket;
