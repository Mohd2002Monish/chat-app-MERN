"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateRoomKey } from "@/lib/crypto";
import { getStoredRooms, saveRoomToVault } from "@/lib/rooms-manager";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function initInbox() {
      try {
        if (!active) return;

        const storedRooms = getStoredRooms();
        if (storedRooms.length > 0 && storedRooms[0]?.roomId) {
          const latest = storedRooms[0];
          router.replace(
            latest.key
              ? `/room/${latest.roomId}#${latest.key}`
              : `/room/${latest.roomId}`
          );
          return;
        }

        const { keyString } = await generateRoomKey();
        const randomPart = Math.random().toString(36).substring(2, 8);
        const timePart = Date.now().toString(36).slice(-4);
        const roomId = `r-${randomPart}${timePart}`;
        const defaultName = `Chat ${roomId.slice(-4).toUpperCase()}`;

        saveRoomToVault({
          roomId,
          key: keyString,
          name: defaultName,
          lastMessage: "Conversation ready",
        });

        router.replace(`/room/${roomId}#${keyString}`);
      } catch (error) {
        console.error("Inbox setup error:", error);
        const fallbackId = `r-${Math.random().toString(36).substring(2, 8)}`;
        router.replace(`/room/${fallbackId}`);
      }
    }

    initInbox();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#090a0f]">
      <div className="h-5 w-5 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
    </div>
  );
}
