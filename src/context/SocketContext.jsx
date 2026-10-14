"use client";

import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { getAnonymousUser } from "@/lib/anonymous-user";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [activeSocket, setActiveSocket] = useState(null);
  const { userInfo } = useAppStore();

  useEffect(() => {
    // Determine effective user ID (authenticated user or anonymous guest)
    const anonUser = getAnonymousUser();
    const effectiveUserId = userInfo?.id || anonUser.id;

    if (!socketRef.current) {
      const socket = io(HOST || undefined, {
        withCredentials: true,
        query: { userId: effectiveUserId },
      });

      socket.on("connect", () => {
        console.log("Connected to socket server with ID:", socket.id);
        setActiveSocket(socket);
      });

      const handleReceiveMessage = (messageData) => {
        const {
          selectedChatType,
          selectedChatData,
          addMessage,
          addContactsInDMContacts,
        } = useAppStore.getState();

        if (
          selectedChatType !== undefined &&
          (selectedChatData?._id === messageData.sender?._id ||
            selectedChatData?._id === messageData.recipient?._id)
        ) {
          console.log("message received: ", messageData);
          addMessage(messageData);
        }
        addContactsInDMContacts(messageData);
      };

      socket.on("receiveMessage", handleReceiveMessage);
      socketRef.current = socket;
      setActiveSocket(socket);
    }

    return () => {
      // Keep connection alive across sub-navigation if same tab
    };
  }, [userInfo]);

  return (
    <SocketContext.Provider value={activeSocket}>
      {children}
    </SocketContext.Provider>
  );
};
