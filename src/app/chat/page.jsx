"use client";

import { useAppStore } from "@/store";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ContactsContainer from "./components/contacts-container";
import EmptyChatContainer from "./components/empty-chat-container";
import ChatContainer from "./components/chat-container";

const Chat = () => {
  const {
    userInfo,
    selectedChatType,
    isUploading,
    isDownloading,
    fileUploadProgress,
    fileDownloadProgress,
  } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (userInfo === undefined) return;
    if (!userInfo) {
      router.push("/auth");
      return;
    }
    if (!userInfo.profileSetup) {
      toast.info("Please setup your profile to access chats...");
      router.push("/profile");
    }
  }, [userInfo, router]);

  if (!userInfo) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1b1c24] text-white">
        <div className="animate-pulse text-lg">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[100vh] text-white overflow-hidden">
      {isUploading && (
        <div className="h-[100vh] w-[100vw] fixed top-0 z-10 left-0 bg-black/80 flex items-center justify-center flex-col gap-5 backdrop-blur-lg">
          <h5 className="text-5xl animate-pulse">Uploading File</h5>
          {fileUploadProgress} %
        </div>
      )}
      {isDownloading && (
        <div className="h-[100vh] w-[100vw] fixed top-0 z-10 left-0 bg-black/80 flex items-center justify-center flex-col gap-5 backdrop-blur-lg">
          <h5 className="text-5xl animate-pulse">Downloading File</h5>
          {fileDownloadProgress} %
        </div>
      )}
      <ContactsContainer />
      {selectedChatType === undefined ? (
        <EmptyChatContainer />
      ) : (
        <ChatContainer />
      )}
    </div>
  );
};

export default Chat;
