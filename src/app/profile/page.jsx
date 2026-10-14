"use client";

import { useAppStore } from "@/store";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IoArrowBack } from "react-icons/io5";
import {
  Avatar,
  AvatarImage,
} from "@/components/ui/avatar";
import { colors, getColor } from "@/lib/utils";
import { FaPlus, FaTrash } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import {
  ADD_PROFILE_IMAGE_ROUTE,
  HOST,
  REMOVE_PROFILE_IMAGE_ROUTE,
  UPDATE_PROFILE_ROUTE,
} from "@/utils/constants";

const Profile = () => {
  const router = useRouter();
  const { userInfo, setUserInfo } = useAppStore();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [image, setImage] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [selectedColor, setSelectedColor] = useState(0);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (userInfo === undefined) return;
    if (!userInfo) {
      router.push("/auth");
      return;
    }

    if (userInfo.profileSetup) {
      setFirstName(userInfo.firstName || "");
      setLastName(userInfo.lastName || "");
      setSelectedColor(userInfo.color ?? 0);
    }
    if (userInfo.image) {
      setImage(HOST ? `${HOST}/${userInfo.image}` : `/${userInfo.image}`);
    }
  }, [userInfo, router]);

  const validateProfile = () => {
    if (!firstName.trim()) {
      toast.error("First Name is required!");
      return false;
    }
    if (!lastName.trim()) {
      toast.error("Last Name is required!");
      return false;
    }
    return true;
  };

  const saveChanges = async () => {
    if (!validateProfile()) {
      return;
    }
    const loadingToast = toast.loading("Saving changes....");
    try {
      const response = await apiClient.post(
        UPDATE_PROFILE_ROUTE,
        { firstName, lastName, color: selectedColor },
        { withCredentials: true }
      );
      toast.dismiss(loadingToast);
      if (response.status === 200 && response.data) {
        setUserInfo({ ...response.data });
        toast.success("Profile updated successfully!");
        router.push("/chat");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      if (
        error.response?.status === 400 ||
        error.response?.status === 404
      ) {
        toast.error(error.response.data);
      } else {
        toast.error("Failed to update profile.");
      }
    }
  };

  const handleNavigate = () => {
    if (userInfo?.profileSetup) {
      router.push("/chat");
    } else {
      toast.error("Please complete profile.");
    }
  };

  const handleFileInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const loadingToast = toast.loading("Updating image....");
      const formData = new FormData();
      formData.append("profile-image", file);
      try {
        const response = await apiClient.post(
          ADD_PROFILE_IMAGE_ROUTE,
          formData,
          { withCredentials: true }
        );
        toast.dismiss(loadingToast);
        if (response.status === 200 && response.data?.image) {
          setUserInfo({
            ...userInfo,
            image: response.data.image,
          });
          setImage(HOST ? `${HOST}/${response.data.image}` : `/${response.data.image}`);
          toast.success("Profile Picture Updated!");
        }
      } catch (error) {
        toast.dismiss(loadingToast);
        if (
          error.response?.status === 400 ||
          error.response?.status === 404
        ) {
          toast.error(error.response.data);
        } else {
          toast.error("Failed to upload image.");
        }
      }
    }
  };

  const handleDeleteImage = async () => {
    const loadingToast = toast.loading("Removing image....");
    try {
      const response = await apiClient.delete(
        REMOVE_PROFILE_IMAGE_ROUTE,
        { withCredentials: true }
      );
      toast.dismiss(loadingToast);
      if (response.status === 200) {
        setUserInfo({ ...userInfo, image: null });
        setImage(null);
        toast.success("Image removed");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      if (
        error.response?.status === 400 ||
        error.response?.status === 404
      ) {
        toast.error(error.response.data);
      } else {
        toast.error("Failed to remove image.");
      }
    }
  };

  if (!userInfo) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1b1c24] text-white">
        <div className="animate-pulse text-lg">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#1b1c24] h-[100vh] flex items-center justify-center flex-col gap-10">
      <div className="flex flex-col gap-10 w-[80vw] md:w-max">
        <div>
          <IoArrowBack
            className="text-4xl lg:text-6xl text-white/90 cursor-pointer"
            onClick={handleNavigate}
          />
        </div>
        <div className="grid grid-cols-2 gap-8 items-center">
          <div
            className="h-full sm:h-32 w-32 md:w-48 md:h-48 relative flex items-center justify-center"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <Avatar className="h-32 w-32 md:w-48 md:h-48 rounded-full overflow-hidden">
              {image ? (
                <AvatarImage
                  src={image}
                  alt="Profile Picture"
                  className="object-cover w-full h-full bg-black"
                />
              ) : (
                <div
                  className={`uppercase h-32 w-32 md:w-48 md:h-48 text-5xl border-[1px] flex items-center justify-center rounded-full ${getColor(
                    selectedColor
                  )}`}
                >
                  {firstName
                    ? firstName.split("").shift()
                    : userInfo.email?.split("").shift()}
                </div>
              )}
            </Avatar>
            {hovered && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/75 rounded-full cursor-pointer"
                onClick={
                  image
                    ? handleDeleteImage
                    : handleFileInputClick
                }
              >
                {image ? (
                  <FaTrash className="text-white text-3xl cursor-pointer" />
                ) : (
                  <FaPlus className="text-white text-3xl cursor-pointer" />
                )}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageChange}
              name="profile-image"
              accept=".png, .jpg, .jpeg, .svg, .webp"
            />
          </div>
          <div className="flex min-w-32 md:min-w-64 flex-col gap-5 text-white items-center justify-center">
            <div className="w-full">
              <Input
                placeholder="Email"
                type="email"
                disabled
                value={userInfo.email || ""}
                className="rounded-lg p-6 bg-[#2c2e3b] border-none text-neutral-400"
              />
            </div>
            <div className="w-full">
              <Input
                placeholder="First Name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-lg p-6 bg-[#2c2e3b] border-none text-white"
              />
            </div>
            <div className="w-full">
              <Input
                placeholder="Last Name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded-lg p-6 bg-[#2c2e3b] border-none text-white"
              />
            </div>
            <div className="w-full flex gap-5">
              {colors.map((color, index) => (
                <div
                  className={`${color} h-6 w-6 rounded-full cursor-pointer transition-all duration-300 ${
                    selectedColor === index && "outline outline-white outline-2"
                  }`}
                  key={index}
                  onClick={() => setSelectedColor(index)}
                ></div>
              ))}
            </div>
          </div>
        </div>
        <div className="w-full">
          <Button
            className="h-16 w-full bg-green-600 hover:bg-green-800 transition-all duration-300 text-white text-lg"
            onClick={saveChanges}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
