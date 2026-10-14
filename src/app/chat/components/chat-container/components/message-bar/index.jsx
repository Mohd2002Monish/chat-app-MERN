"use client";

import { useRef, useState } from "react";
import { GrAttachment } from "react-icons/gr";
import { IoSend } from "react-icons/io5";
import { useAppStore } from "@/store";
import { useSocket } from "@/context/SocketContext";
import { apiClient } from "@/lib/api-client";
import { UPLOAD_FILE_ROUTE } from "@/utils/constants";

const MessageBar = () => {
  const fileInputRef = useRef(null);
  const socket = useSocket();
  const {
    selectedChatType,
    selectedChatData,
    userInfo,
    setIsUploading,
    setFileUploadProgress,
  } = useAppStore();
  const [message, setMessage] = useState("");

  const handleSendMessage = async () => {
    if (!socket || !message.trim()) return;

    if (selectedChatType === "contact") {
      socket.emit("sendMessage", {
        sender: userInfo.id,
        recipient: selectedChatData._id,
        messageType: "text",
        content: message.trim(),
        fileUrl: undefined,
      });
    } else if (selectedChatType === "channel") {
      socket.emit("send-channel-message", {
        sender: userInfo.id,
        messageType: "text",
        content: message.trim(),
        fileUrl: undefined,
        channelId: selectedChatData._id,
      });
    }
    setMessage("");
  };

  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAttachmentChange = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        setIsUploading(true);
        const response = await apiClient.post(
          UPLOAD_FILE_ROUTE,
          formData,
          {
            withCredentials: true,
            onUploadProgress: (data) => {
              const { loaded, total } = data;
              if (total) {
                const percentCompleted = Math.round(
                  (loaded * 100) / total
                );
                setFileUploadProgress(percentCompleted);
              }
            },
          }
        );
        if (response.status === 200 && response.data?.filePath) {
          setIsUploading(false);
          setFileUploadProgress(0);
          if (socket) {
            if (selectedChatType === "contact") {
              socket.emit("sendMessage", {
                sender: userInfo.id,
                recipient: selectedChatData._id,
                messageType: "file",
                content: undefined,
                fileUrl: response.data.filePath,
              });
            } else if (selectedChatType === "channel") {
              socket.emit("send-channel-message", {
                sender: userInfo.id,
                messageType: "file",
                content: undefined,
                fileUrl: response.data.filePath,
                channelId: selectedChatData._id,
              });
            }
          }
        }
      }
    } catch (error) {
      setIsUploading(false);
      setFileUploadProgress(0);
      console.error("File upload failed", error);
    }
  };

  return (
    <div className="h-[10vh] bg-[#1c1d25] flex justify-center items-center px-8 mb-6 gap-6">
      <div className="flex-1 flex bg-[#2a2b33] rounded-md items-center gap-5 pr-5 justify-between">
        <input
          type="text"
          placeholder="Write Message"
          className="flex-1 p-5 bg-transparent rounded-md focus:border-none focus:outline-none text-white placeholder-neutral-400"
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && message.trim().length > 0) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          value={message}
        />
        <button
          className="text-neutral-500 focus:border-none focus:outline-none focus:text-white duration-300 transition-all hover:text-white"
          onClick={handleAttachmentClick}
          type="button"
        >
          <GrAttachment className="text-2xl" />
        </button>
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleAttachmentChange}
        />
      </div>
      <button
        className="bg-green-700 rounded-md flex items-center justify-center p-5 focus:border-none hover:bg-green-800 focus:bg-green-800 focus:outline-none focus:text-white duration-300 transition-all text-white"
        onClick={handleSendMessage}
        type="button"
      >
        <IoSend className="text-2xl" />
      </button>
    </div>
  );
};

export default MessageBar;
