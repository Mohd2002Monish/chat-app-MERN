"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";

export default function HomePage() {
  const router = useRouter();
  const { userInfo } = useAppStore();

  useEffect(() => {
    if (userInfo === undefined) return;

    if (!userInfo) {
      router.replace("/auth");
    } else if (!userInfo.profileSetup) {
      router.replace("/profile");
    } else {
      router.replace("/chat");
    }
  }, [userInfo, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1b1c24] text-white">
      <div className="animate-pulse text-xl poppins-medium">Redirecting...</div>
    </div>
  );
}
