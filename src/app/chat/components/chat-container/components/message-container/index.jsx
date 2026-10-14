"use client";

import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/store";
import {
  GET_ALL_MESSAGES_ROUTE,
  HOST,
} from "@/utils/constants";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { MdFolderZip } from "react-icons/md";
import { IoMdArrowDown, IoMdClose } from "react-icons/io";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { getColor } from "@/lib/utils";

const MessageContainer = () => {
  const scrollRef = useRef(null);
  const {
    selectedChatType,
    selectedChatData,
    userInfo,
    selectedChatMessages,
    setSelectedChatMessages,
    setIsDownloading,
    setFileDownloadProgress,
  } = useAppStore();
  const [showImage, setShowImage] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  const getMediaUrl = (path) => {
    if (!path) return "";
    return HOST ? `${HOST}/${path}` : `/${path}`;
  };

  useEffect(() => {
    const getMessages = async () => {
      try {
        const response = await apiClient.post(
          GET_ALL_MESSAGES_ROUTE,
          { id: selectedChatData._id },
          { withCredentials: true }
        );
        if (response.status === 200 && response.data?.messages) {
          setSelectedChatMessages(response.data.messages);
        }
      } catch (error) {
        console.error("Failed to fetch messages", error);
      }
    };

    if (selectedChatData?._id) {
      if (selectedChatType === "contact") {
        getMessages();
      }
    }
  }, [
    selectedChatData,
    selectedChatType,
    setSelectedChatMessages,
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [selectedChatMessages]);

  const checkIfImage = (filePath) => {
    const imageRegex =
      /\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp|svg|ico|heic|heif)$/i;
    return imageRegex.test(filePath);
  };

  const downloadFile = async (fileUrl) => {
    setIsDownloading(true);
    setFileDownloadProgress(0);
    try {
      const response = await apiClient.get(
        getMediaUrl(fileUrl),
        {
          responseType: "blob",
          onDownloadProgress: (progressEvent) => {
            const { loaded, total } = progressEvent;
            if (total) {
              const percentCompleted = Math.round(
                (loaded * 100) / total
              );
              setFileDownloadProgress(percentCompleted);
            }
          },
        }
      );
      const urlBlob = window.URL.createObjectURL(
        new Blob([response.data])
      );
      const link = document.createElement("a");
      link.href = urlBlob;
      link.setAttribute(
        "download",
        fileUrl.split("/").at(-1) || "download"
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
      console.error("File download error", error);
    } finally {
      setIsDownloading(false);
      setFileDownloadProgress(0);
    }
  };

  const renderDMMessages = (message) => {
    const isSender = message.sender === userInfo?.id || message.sender?._id === userInfo?.id;

    return (
      <div className={isSender ? "text-right" : "text-left"}>
        {message.messageType === "text" && (
          <div
            className={`${
              isSender
                ? "bg-green-600/5 text-green-600/90 border-green-600/50"
                : "bg-[#2a2b33]/5 text-white/80 border-[#ffffff]/20"
            } p-3 border inline-block rounded my-1 max-w-[50%] break-words`}
          >
            {message.content}
          </div>
        )}
        {message.messageType === "file" && (
          <div
            className={`${
              isSender
                ? "bg-green-600/5 text-green-600/90 border-green-600/50"
                : "bg-[#2a2b33]/5 text-white/80 border-[#ffffff]/20"
            } p-3 border inline-block rounded my-1 max-w-[50%] break-words`}
          >
            {checkIfImage(message.fileUrl) ? (
              <div
                className="cursor-pointer"
                onClick={() => {
                  setShowImage(true);
                  setImageUrl(message.fileUrl);
                }}
              >
                <img
                  src={getMediaUrl(message.fileUrl)}
                  alt="Attachment"
                  className="rounded max-h-56 object-cover"
                />
              </div>
            ) : (
              <div className="flex items-center justify-evenly gap-4">
                <span className="text-white/8 text-lg sm:text-xl bg-black/20 rounded-full p-3">
                  <MdFolderZip />
                </span>
                <span className="max-w-[50%] text-sm lg:max-w-full break-words">
                  {message.fileUrl?.split("/").at(-1)}
                </span>
                {!isSender && (
                  <span
                    className="bg-black/20 p-3 text-lg sm:text-xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300"
                    onClick={() => downloadFile(message.fileUrl)}
                  >
                    <IoMdArrowDown />
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        <div className="text-xs text-gray-500">
          {moment(message.timestamp).format("LT")}
        </div>
      </div>
    );
  };

  const renderChannelMessages = (message) => {
    const isSender = message.sender?._id === userInfo?.id || message.sender === userInfo?.id;

    return (
      <div className={`mt-5 ${isSender ? "text-right" : "text-left"}`}>
        {message.messageType === "text" && (
          <div
            className={`${
              isSender
                ? "bg-green-600/5 text-green-600/90 border-green-600/50"
                : "bg-[#2a2b33]/5 text-white/80 border-[#ffffff]/20"
            } p-3 border inline-block rounded mt-1 mb-1 max-w-[50%] break-words ml-10`}
          >
            {message.content}
          </div>
        )}
        {message.messageType === "file" && (
          <div
            className={`${
              isSender
                ? "bg-green-600/5 text-green-600/90 border-green-600/50"
                : "bg-[#2a2b33]/5 text-white/80 border-[#ffffff]/20"
            } p-3 border inline-block rounded mt-2 mb-1 ml-11 max-w-[50%] break-words`}
          >
            {checkIfImage(message.fileUrl) ? (
              <div
                className="cursor-pointer"
                onClick={() => {
                  setShowImage(true);
                  setImageUrl(message.fileUrl);
                }}
              >
                <img
                  src={getMediaUrl(message.fileUrl)}
                  alt="Attachment"
                  className="rounded max-h-56 object-cover"
                />
              </div>
            ) : (
              <div className="flex items-center justify-evenly gap-4">
                <span className="text-white/8 text-lg sm:text-xl bg-black/20 rounded-full p-3">
                  <MdFolderZip />
                </span>
                <span className="max-w-[50%] text-sm lg:max-w-full break-words">
                  {message.fileUrl?.split("/").at(-1)}
                </span>
                {!isSender && (
                  <span
                    className="bg-black/20 p-3 text-lg sm:text-xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300"
                    onClick={() => downloadFile(message.fileUrl)}
                  >
                    <IoMdArrowDown />
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        {!isSender && message.sender ? (
          <div className="flex items-center justify-start gap-3">
            <Avatar className="h-8 w-8 rounded-full overflow-hidden">
              {message.sender.image && (
                <AvatarImage
                  src={getMediaUrl(message.sender.image)}
                  alt="Profile Picture"
                  className="object-cover w-full h-full bg-black"
                />
              )}
              <AvatarFallback
                className={`uppercase h-8 w-8 text-lg flex items-center justify-center rounded-full ${getColor(
                  message.sender.color
                )}`}
              >
                {message.sender.firstName
                  ? message.sender.firstName.split("").shift()
                  : message.sender.email?.split("").shift()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-white/60">
              {`${message.sender.firstName || ""} ${message.sender.lastName || ""}`}
            </span>
            <span className="text-xs text-white/60">
              {moment(message.timestamp).format("LT")}
            </span>
          </div>
        ) : (
          <div className="text-xs text-white/60">
            {moment(message.timestamp).format("LT")}
          </div>
        )}
      </div>
    );
  };

  const renderMessages = () => {
    let lastDate = null;
    return selectedChatMessages.map((message, index) => {
      const messageDate = moment(message.timestamp).format("YYYY-MM-DD");
      const showDate = messageDate !== lastDate;
      lastDate = messageDate;
      return (
        <div key={message._id || index}>
          {showDate && (
            <div className="text-center text-black my-2">
              <span className="bg-gray-300/90 rounded-lg py-1 px-3 text-sm">
                {moment(message.timestamp).format("LL")}
              </span>
            </div>
          )}
          {selectedChatType === "contact" && renderDMMessages(message)}
          {selectedChatType === "channel" && renderChannelMessages(message)}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hidden p-4 px-8 md:w-[65vw] lg:w-[70vw] xl:w-[80vw] w-full">
      {renderMessages()}
      <div ref={scrollRef} />
      {showImage && (
        <div className="fixed z-[1000] top-0 left-0 h-[100vh] w-[100vw] flex items-center justify-center backdrop-blur-lg flex-col">
          <div>
            <img
              src={getMediaUrl(imageUrl)}
              alt="Expanded Attachment"
              className="h-[80vh] w-full object-contain"
            />
          </div>
          <div className="flex gap-5 fixed top-0 mt-5">
            <button
              className="bg-black/20 p-3 text-lg sm:text-xl rounded-full border-2 border-white/10 hover:bg-black/50 cursor-pointer transition-all duration-300"
              onClick={() => downloadFile(imageUrl)}
            >
              <IoMdArrowDown />
            </button>
            <button
              className="bg-black/20 p-3 text-lg sm:text-xl rounded-full border-2 border-white/10 hover:bg-black/50 cursor-pointer transition-all duration-300"
              onClick={() => {
                setShowImage(false);
                setImageUrl(null);
              }}
            >
              <IoMdClose />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageContainer;
