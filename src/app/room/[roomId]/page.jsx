"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/context/SocketContext";
import {
  generateRoomKey,
  importRoomKey,
  encryptData,
  decryptData,
  encryptFileBlob,
  decryptFileBlob,
} from "@/lib/crypto";
import { getAnonymousUser } from "@/lib/anonymous-user";
import {
  saveRoomToVault,
  updateRoomLastMessage,
} from "@/lib/rooms-manager";
import {
  GET_ROOM_MESSAGES_ROUTE,
  UPLOAD_ROOM_FILE_ROUTE,
  HOST,
} from "@/utils/constants";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import moment from "moment";
import RoomsSidebar from "@/components/rooms-sidebar";

// Icons
import {
  FiCopy,
  FiCheck,
  FiPaperclip,
  FiArrowUp,
  FiPlus,
  FiDownload,
  FiImage,
  FiFileText,
  FiMenu,
} from "react-icons/fi";
import { RiCloseFill } from "react-icons/ri";

export default function RoomChatPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId;
  const socket = useSocket();

  // User state
  const [currentUser, setCurrentUser] = useState(() => getAnonymousUser());

  // Cryptographic state
  const [cryptoKey, setCryptoKey] = useState(null);
  const [keyString, setKeyString] = useState("");
  const [keyError, setKeyError] = useState(false);
  const [manualKeyInput, setManualKeyInput] = useState("");

  // Room presence & messages
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const [peerTyping, setPeerTyping] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [decryptedBlobs, setDecryptedBlobs] = useState({});

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const textareaRef = useRef(null);

  // 1. Initialize Key from URL Hash
  useEffect(() => {
    let active = true;

    async function initKey() {
      if (typeof window === "undefined") return;

      let hashKey = window.location.hash
        ? window.location.hash.replace(/^#/, "")
        : "";

      if (!hashKey) {
        const storedKey = sessionStorage.getItem(`room_key_${roomId}`);
        if (storedKey) {
          hashKey = storedKey;
          window.location.hash = hashKey;
        } else {
          setKeyError(true);
          return;
        }
      }

      try {
        const imported = await importRoomKey(hashKey);
        if (active) {
          setCryptoKey(imported);
          setKeyString(hashKey);
          sessionStorage.setItem(`room_key_${roomId}`, hashKey);
          setKeyError(false);

          saveRoomToVault({
            roomId,
            key: hashKey,
            name: `Chat ${roomId.slice(-4).toUpperCase()}`,
          });
        }
      } catch (err) {
        console.error("Invalid key:", err);
        if (active) setKeyError(true);
      }
    }

    initKey();

    return () => {
      active = false;
    };
  }, [roomId]);

  // 2. Fetch and decrypt message history
  const loadMessageHistory = useCallback(
    async (key) => {
      if (!roomId || !key) return;
      try {
        const res = await apiClient.get(`${GET_ROOM_MESSAGES_ROUTE}/${roomId}`);
        if (res.status === 200 && Array.isArray(res.data?.messages)) {
          const rawMsgs = res.data.messages;
          const decryptedList = await Promise.all(
            rawMsgs.map(async (msg) => {
              const plain = await decryptData(
                msg.encryptedPayload,
                msg.iv,
                key
              );
              return {
                ...msg,
                decryptedContent: plain,
                isDecrypted: true,
              };
            })
          );
          setMessages(decryptedList);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    },
    [roomId]
  );

  useEffect(() => {
    if (cryptoKey) {
      loadMessageHistory(cryptoKey);
    }
  }, [cryptoKey, loadMessageHistory]);

  // 3. Socket Lifecycle
  useEffect(() => {
    if (!socket || !roomId || !cryptoKey) return;

    socket.emit("join-room", {
      roomId,
      user: currentUser,
    });

    const handleRoomUsers = (users) => {
      setActiveUsers(users);
    };

    const handleUserJoined = ({ user, activeUsers }) => {
      setActiveUsers(activeUsers);
    };

    const handleUserLeft = ({ user, activeUsers }) => {
      setActiveUsers(activeUsers);
    };

    const handleReceiveRoomMessage = async (msg) => {
      if (msg.senderId === currentUser.id && msg.clientMsgId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMsgId === msg.clientMsgId
              ? { ...m, _id: msg._id || m._id, isOptimistic: false }
              : m
          )
        );
        return;
      }

      let decryptedContent = "";
      try {
        decryptedContent = await decryptData(
          msg.encryptedPayload,
          msg.iv,
          cryptoKey
        );
      } catch {
        decryptedContent = "";
      }

      setMessages((prev) => {
        if (msg._id && prev.some((m) => m._id === msg._id)) {
          return prev;
        }
        return [
          ...prev,
          {
            ...msg,
            decryptedContent,
            isDecrypted: true,
          },
        ];
      });

      updateRoomLastMessage(roomId, decryptedContent || "Attachment");
    };

    const handlePeerTyping = ({ user, isTyping }) => {
      if (user?.id !== currentUser.id) {
        setPeerTyping(isTyping ? user.name : null);
      }
    };

    socket.on("room-users", handleRoomUsers);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("receive-room-message", handleReceiveRoomMessage);
    socket.on("peer-typing", handlePeerTyping);

    return () => {
      socket.emit("leave-room", { roomId });
      socket.off("room-users", handleRoomUsers);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("receive-room-message", handleReceiveRoomMessage);
      socket.off("peer-typing", handlePeerTyping);
    };
  }, [socket, roomId, cryptoKey, currentUser]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, peerTyping]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Auto-adjust textarea height up to 120px
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    if (!socket || !roomId) return;

    socket.emit("room-typing", {
      roomId,
      user: currentUser,
      isTyping: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("room-typing", {
        roomId,
        user: currentUser,
        isTyping: false,
      });
    }, 1200);
  };

  // 4. Send Message (Optimistic 0ms update)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const plainText = inputText.trim();
    if (!plainText || !cryptoKey || !socket || isSending) return;

    setIsSending(true);
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const clientMsgId =
        "c_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      const timestamp = Date.now();

      const { ciphertext, iv } = await encryptData(plainText, cryptoKey);

      const optimisticMsg = {
        _id: clientMsgId,
        clientMsgId,
        roomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderColor: currentUser.color,
        messageType: "text",
        content: plainText,
        decryptedContent: plainText,
        isDecrypted: true,
        encryptedPayload: ciphertext,
        iv: iv,
        timestamp,
        isOptimistic: true,
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      updateRoomLastMessage(roomId, plainText);

      socket.emit("send-room-message", {
        clientMsgId,
        roomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderColor: currentUser.color,
        messageType: "text",
        encryptedPayload: ciphertext,
        iv: iv,
        timestamp,
      });

      socket.emit("room-typing", {
        roomId,
        user: currentUser,
        isTyping: false,
      });
    } catch (err) {
      console.error("Send error:", err);
      toast.error("Failed to send");
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 5. Send Attachment
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !cryptoKey || !socket) return;

    setIsUploading(true);

    try {
      const { encryptedBlob, originalName, mimeType, size } =
        await encryptFileBlob(file, cryptoKey);

      const formData = new FormData();
      formData.append(
        "file",
        encryptedBlob,
        `enc_${Date.now()}_${encodeURIComponent(originalName)}`
      );

      const res = await apiClient.post(UPLOAD_ROOM_FILE_ROUTE, formData);

      if (res.status === 200 && res.data?.filePath) {
        const metadataString = JSON.stringify({
          name: originalName,
          type: mimeType,
          size: size,
        });
        const encryptedMetadata = await encryptData(metadataString, cryptoKey);

        const payload = {
          roomId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderColor: currentUser.color,
          messageType: "file",
          encryptedPayload: encryptedMetadata.ciphertext,
          iv: encryptedMetadata.iv,
          fileUrl: res.data.filePath,
          fileName: originalName,
          fileSize: size,
          timestamp: Date.now(),
        };

        socket.emit("send-room-message", payload);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to attach file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 6. Decrypt & Download File
  const handleDownloadFile = async (message) => {
    if (!message.fileUrl || !cryptoKey) return;
    try {
      const fullUrl = HOST ? `${HOST}/${message.fileUrl}` : `/${message.fileUrl}`;
      const res = await fetch(fullUrl);
      const encryptedBuffer = await res.arrayBuffer();

      const decryptedBlob = await decryptFileBlob(
        encryptedBuffer,
        message.iv,
        cryptoKey
      );

      const blobUrl = URL.createObjectURL(decryptedBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = message.fileName || "attachment";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Download failed");
    }
  };

  const previewImage = async (message) => {
    if (decryptedBlobs[message.fileUrl]) {
      setExpandedImage(decryptedBlobs[message.fileUrl]);
      return;
    }
    try {
      const fullUrl = HOST ? `${HOST}/${message.fileUrl}` : `/${message.fileUrl}`;
      const res = await fetch(fullUrl);
      const encryptedBuffer = await res.arrayBuffer();
      const decryptedBlob = await decryptFileBlob(
        encryptedBuffer,
        message.iv,
        cryptoKey,
        "image/png"
      );
      const blobUrl = URL.createObjectURL(decryptedBlob);
      setDecryptedBlobs((prev) => ({ ...prev, [message.fileUrl]: blobUrl }));
      setExpandedImage(blobUrl);
    } catch {
      toast.error("Preview failed");
    }
  };

  const copyShareLink = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      toast.success("Link copied");
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const createNewChat = async () => {
    try {
      const { keyString: newKey } = await generateRoomKey();
      const newRoomId =
        "r-" +
        Math.random().toString(36).substring(2, 7) +
        Date.now().toString(36).slice(-3);
      router.push(`/room/${newRoomId}#${newKey}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualKeySubmit = async (e) => {
    e.preventDefault();
    if (!manualKeyInput.trim()) return;
    try {
      const imported = await importRoomKey(manualKeyInput.trim());
      setCryptoKey(imported);
      setKeyString(manualKeyInput.trim());
      window.location.hash = manualKeyInput.trim();
      sessionStorage.setItem(`room_key_${roomId}`, manualKeyInput.trim());
      setKeyError(false);
    } catch {
      toast.error("Invalid key");
    }
  };

  // Screen for locked conversation without key in URL
  if (keyError) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#090a0f] p-4 text-white">
        <div className="w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#11131a] p-6 shadow-xl">
          <h2 className="text-sm font-semibold text-zinc-100">
            Access Key
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Enter key to open this conversation.
          </p>

          <form onSubmit={handleManualKeySubmit} className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="Paste key..."
              value={manualKeyInput}
              onChange={(e) => setManualKeyInput(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-[#181a23] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-200 py-2 text-xs font-semibold text-black hover:bg-white transition-colors"
            >
              Unlock
            </button>
          </form>

          <div className="mt-3.5 text-center">
            <button
              onClick={createNewChat}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Start new conversation
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPeerOnline =
    activeUsers.filter((u) => u.id !== currentUser.id).length > 0;
  const roomDisplayName = `Chat ${roomId?.slice(-4).toUpperCase() || ""}`;

  return (
    <div className="flex h-screen w-full bg-[#090a0f] text-zinc-100 overflow-hidden font-sans">
      {/* Rooms Sidebar */}
      <RoomsSidebar
        activeRoomId={roomId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentUser={currentUser}
        onUpdateUser={setCurrentUser}
      />

      {/* Main Conversation Canvas */}
      <div className="flex flex-1 flex-col h-full overflow-hidden min-w-0 bg-[#090a0f]">
        {/* Sleek Header */}
        <header className="flex h-13 w-full items-center justify-between border-b border-white/[0.06] bg-[#0c0e14] px-4 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/[0.08] text-zinc-400 hover:text-white md:hidden"
            >
              <FiMenu className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-300 border border-white/[0.06]">
                {roomDisplayName.charAt(0)}
              </div>

              <div className="min-w-0 flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-medium tracking-tight text-zinc-100 truncate">
                  {roomDisplayName}
                </h1>
                <div className="flex items-center gap-1.5 pl-1">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isPeerOnline ? "bg-emerald-500" : "bg-zinc-600"
                    }`}
                  />
                  <span className="text-[11px] text-zinc-500 font-normal">
                    {isPeerOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={copyShareLink}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                copiedLink
                  ? "bg-emerald-600 text-white"
                  : "bg-white/[0.05] hover:bg-white/[0.09] text-zinc-300 hover:text-white border border-white/[0.06]"
              }`}
            >
              {copiedLink ? (
                <>
                  <FiCheck className="h-3.5 w-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <FiCopy className="h-3.5 w-3.5" />
                  <span>Copy link</span>
                </>
              )}
            </button>

            <button
              onClick={createNewChat}
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="New Chat"
            >
              <FiPlus className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1">
          {/* Subtle Date Marker */}
          <div className="flex justify-center my-3">
            <span className="text-[11px] text-zinc-500 font-medium px-2.5 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.04]">
              Today
            </span>
          </div>

          {/* Empty Conversation State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[55vh] text-center">
              <span className="text-xs text-zinc-500 font-normal">
                No messages yet
              </span>
              <button
                onClick={copyShareLink}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] px-3 py-1.5 text-xs text-zinc-300 hover:text-white transition-colors"
              >
                <FiCopy className="h-3.5 w-3.5 text-zinc-400" />
                <span>{copiedLink ? "Link copied" : "Copy invite link"}</span>
              </button>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.id;
            const timeStr = moment(msg.timestamp).format("HH:mm");

            // Check if grouped with previous message
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
            const isCloseInTime =
              prevMsg && Math.abs(msg.timestamp - prevMsg.timestamp) < 120000;
            const isGrouped = isSameSender && isCloseInTime;

            return (
              <div
                key={msg._id || index}
                className={`flex flex-col ${
                  isMe ? "items-end" : "items-start"
                } ${isGrouped ? "mt-1" : "mt-3"}`}
              >
                {/* Peer Name (only shown on the first message of a group) */}
                {!isMe && !isGrouped && (
                  <span className="text-[11px] font-medium text-zinc-500 mb-1 px-1">
                    {msg.senderName || "Peer"}
                  </span>
                )}

                {/* Message Bubble */}
                <div
                  className={`group relative max-w-[82%] sm:max-w-[65%] px-3.5 py-2 break-words shadow-sm ${
                    isMe
                      ? `bg-blue-600 text-white ${
                          isGrouped
                            ? "rounded-2xl rounded-r-sm"
                            : "rounded-2xl rounded-br-sm"
                        }`
                      : `bg-[#151822] text-zinc-100 border border-white/[0.06] ${
                          isGrouped
                            ? "rounded-2xl rounded-l-sm"
                            : "rounded-2xl rounded-bl-sm"
                        }`
                  }`}
                >
                  {/* Text */}
                  {msg.messageType === "text" && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">
                      {msg.decryptedContent || msg.content}
                    </p>
                  )}

                  {/* Attachment */}
                  {msg.messageType === "file" && (
                    <div className="space-y-2 py-0.5">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-black/20 p-2 text-white">
                          <FiFileText className="h-4 w-4" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="truncate text-xs font-medium text-white max-w-[180px]">
                            {msg.fileName || "File"}
                          </div>
                          {msg.fileSize && (
                            <div className="text-[10px] text-white/60 font-mono">
                              {(msg.fileSize / 1024).toFixed(1)} KB
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                        <button
                          onClick={() => handleDownloadFile(msg)}
                          className="flex items-center gap-1 rounded bg-black/30 hover:bg-black/50 px-2 py-1 text-[11px] text-white transition-colors"
                        >
                          <FiDownload className="h-3 w-3" />
                          <span>Save</span>
                        </button>
                        {msg.fileName?.match(/\.(png|jpe?g|gif|webp|svg)$/i) && (
                          <button
                            onClick={() => previewImage(msg)}
                            className="flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-[11px] text-white transition-colors"
                          >
                            <FiImage className="h-3 w-3" />
                            <span>View</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Time & Delivery Indicator */}
                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] font-mono select-none ${
                      isMe ? "text-blue-200/80" : "text-zinc-500"
                    }`}
                  >
                    <span>{timeStr}</span>
                    {isMe && (
                      <span className="text-[10px] leading-none opacity-80">
                        {isPeerOnline ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {peerTyping && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 px-2 py-1 mt-1">
              <span className="flex gap-1 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse delay-150" />
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse delay-300" />
              </span>
              <span className="text-[11px] text-zinc-500 font-normal">
                {peerTyping} is typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* File Upload Status */}
        {isUploading && (
          <div className="bg-[#11131a] border-t border-white/[0.06] px-4 py-1.5 text-xs text-zinc-400 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
            <span>Sending attachment...</span>
          </div>
        )}

        {/* Input Bar */}
        <footer className="border-t border-white/[0.06] bg-[#090a0f] p-3 sm:p-4">
          <form
            onSubmit={handleSendMessage}
            className="mx-auto flex max-w-3xl items-end gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="flex flex-1 items-end rounded-xl bg-[#141620] border border-white/[0.08] px-3 py-1.5 focus-within:border-blue-500/60 transition-colors">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40 mb-0.5"
                title="Attach file"
              >
                <FiPaperclip className="h-4 w-4" />
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                className="w-full bg-transparent px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-[120px] leading-relaxed"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-20 disabled:hover:bg-blue-600 mb-0.5"
                title="Send"
              >
                <FiArrowUp className="h-4 w-4" />
              </button>
            </div>
          </form>
        </footer>
      </div>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={expandedImage}
              alt="Attachment"
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute -top-10 right-0 rounded-full bg-zinc-800 p-2 text-white hover:bg-zinc-700"
            >
              <RiCloseFill className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
