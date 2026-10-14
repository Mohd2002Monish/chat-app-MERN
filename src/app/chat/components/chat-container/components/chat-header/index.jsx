"use client";

import {
  Avatar,
  AvatarImage,
} from "@/components/ui/avatar";
import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { RiCloseFill } from "react-icons/ri";

const ChatHeader = () => {
  const { selectedChatData, selectedChatType, closeChat } =
    useAppStore();

  if (!selectedChatData) return null;

  const imageUrl = selectedChatData.image
    ? (HOST ? `${HOST}/${selectedChatData.image}` : `/${selectedChatData.image}`)
    : null;

  return (
    <div className="md:h-[10vh] h-[5vh] border-b-2 border-[#2f303b] flex items-center justify-between px-10">
      <div className="flex gap-5 items-center justify-between w-full">
        <div className="flex gap-3 items-center justify-center">
          <div className="w-12 h-12 relative">
            {selectedChatType === "contact" ? (
              <Avatar className="h-12 w-12 rounded-full overflow-hidden">
                {imageUrl ? (
                  <AvatarImage
                    src={imageUrl}
                    alt="Profile Picture"
                    className="object-cover w-full h-full bg-black"
                  />
                ) : (
                  <div
                    className={`uppercase h-12 w-12 text-lg border-[1px] flex items-center justify-center rounded-full ${getColor(
                      selectedChatData.color
                    )}`}
                  >
                    {selectedChatData.firstName
                      ? selectedChatData.firstName.split("").shift()
                      : selectedChatData.email?.split("").shift()}
                  </div>
                )}
              </Avatar>
            ) : (
              <div className="bg-[#ffffff22] h-12 w-12 flex items-center justify-center rounded-full">
                #
              </div>
            )}
          </div>
          <div>
            {selectedChatType === "channel" &&
              selectedChatData.name}
            {selectedChatType === "contact" &&
              (selectedChatData.firstName && selectedChatData.lastName
                ? `${selectedChatData.firstName} ${selectedChatData.lastName}`
                : selectedChatData.email)}
          </div>
        </div>
        <div className="flex items-center justify-center gap-5">
          <button
            className="text-neutral-500 focus:border-none focus:outline-none focus:text-white duration-300 transition-all"
            onClick={closeChat}
          >
            <RiCloseFill className="text-3xl" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
