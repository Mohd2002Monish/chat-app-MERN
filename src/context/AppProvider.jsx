"use client";

import React, { useEffect, useState } from "react";
import { useAppStore } from "@/store";
import { apiClient } from "@/lib/api-client";
import { GET_USER_INFO } from "@/utils/constants";
import { SocketProvider } from "@/context/SocketContext";
import { Toaster } from "@/components/ui/sonner";

export default function AppProvider({ children }) {
  const { userInfo, setUserInfo } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const response = await apiClient.get(GET_USER_INFO, {
          withCredentials: true,
        });
        if (response.status === 200 && response.data?.id) {
          setUserInfo(response.data);
        } else {
          setUserInfo(null);
        }
      } catch (error) {
        setUserInfo(null);
      } finally {
        setLoading(false);
      }
    };

    if (userInfo === undefined) {
      getUserData();
    } else {
      setLoading(false);
    }
  }, [userInfo, setUserInfo]);

  return (
    <SocketProvider>
      {loading ? (
        <div className="flex h-screen w-screen items-center justify-center bg-[#1b1c24] text-white">
          <div className="animate-pulse text-lg">Loading...</div>
        </div>
      ) : (
        children
      )}
      <Toaster closeButton />
    </SocketProvider>
  );
}
