"use client";

import {
  Avatar,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import { HOST, LOGOUT_ROUTE } from "@/utils/constants";
import { FiEdit2 } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { IoLogOutOutline } from "react-icons/io5";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const ProfileInfo = () => {
  const { userInfo, setUserInfo } = useAppStore();
  const router = useRouter();

  const logOut = async () => {
    try {
      const response = await apiClient.post(
        LOGOUT_ROUTE,
        {},
        { withCredentials: true }
      );
      if (response.status === 200) {
        setUserInfo(null);
        toast.info(response.data || "Logged out");
        router.push("/auth");
      }
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (!userInfo) return null;

  const imageUrl = userInfo.image
    ? (HOST ? `${HOST}/${userInfo.image}` : `/${userInfo.image}`)
    : null;

  return (
    <div className="absolute bottom-0 h-16 flex items-center justify-between px-8 w-full bg-[#2a2b33]">
      <div className="flex gap-3 items-center justify-center">
        <div className="w-12 h-12 relative">
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
                  userInfo.color
                )}`}
              >
                {userInfo.firstName
                  ? userInfo.firstName.split("").shift()
                  : userInfo.email?.split("").shift()}
              </div>
            )}
          </Avatar>
        </div>
        <div>
          {userInfo.firstName && userInfo.lastName
            ? `${userInfo.firstName} ${userInfo.lastName}`
            : userInfo.email}
        </div>
      </div>
      <div className="flex gap-5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <FiEdit2
                className="text-green-500 text-xl font-medium cursor-pointer"
                onClick={() => router.push("/profile")}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-[#1c1b1e] border-none text-white">
              Edit Profile
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <IoLogOutOutline
                className="text-red-500 text-2xl font-medium cursor-pointer"
                onClick={logOut}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-[#1c1b1e] border-none text-white">
              Logout
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default ProfileInfo;
