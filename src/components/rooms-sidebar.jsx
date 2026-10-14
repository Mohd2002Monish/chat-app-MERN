"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getStoredRooms,
  saveRoomToVault,
  updateRoomName,
  removeRoomFromVault,
  syncRoomsWithDatabase,
} from "@/lib/rooms-manager";
import { generateRoomKey } from "@/lib/crypto";
import {
  getAnonymousUser,
  saveAnonymousUser,
  generateRandomName,
} from "@/lib/anonymous-user";
import { toast } from "sonner";
import moment from "moment";

import {
  FiPlus,
  FiSearch,
  FiCopy,
  FiTrash2,
  FiEdit2,
  FiCheck,
  FiX,
  FiLink,
  FiRefreshCw,
  FiMessageSquare,
} from "react-icons/fi";
import { RiCloseFill } from "react-icons/ri";

const AVATAR_BG_PALETTE = [
  "bg-zinc-800 text-zinc-200 border-zinc-700/60",
  "bg-slate-800 text-slate-200 border-slate-700/60",
  "bg-neutral-800 text-neutral-200 border-neutral-700/60",
  "bg-stone-800 text-stone-200 border-stone-700/60",
  "bg-[#1c202e] text-blue-300 border-blue-900/40",
];

export default function RoomsSidebar({
  activeRoomId,
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [copiedRoomId, setCopiedRoomId] = useState(null);

  // Join Link Modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinLinkInput, setJoinLinkInput] = useState("");

  // Nickname edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");

  const refreshRooms = () => {
    setRooms(getStoredRooms());
  };

  useEffect(() => {
    refreshRooms();
    syncRoomsWithDatabase().then((synced) => {
      if (synced && synced.length) setRooms(synced);
    });
    const handleUpdate = () => refreshRooms();
    window.addEventListener("rooms_vault_updated", handleUpdate);
    return () => {
      window.removeEventListener("rooms_vault_updated", handleUpdate);
    };
  }, []);

  const filteredRooms = rooms.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.roomId && r.roomId.toLowerCase().includes(q)) ||
      (r.lastMessage && r.lastMessage.toLowerCase().includes(q))
    );
  });

  const handleCreateNewRoom = async () => {
    try {
      const { keyString } = await generateRoomKey();
      const randomPart = Math.random().toString(36).substring(2, 7);
      const timePart = Date.now().toString(36).slice(-3);
      const newRoomId = `c-${randomPart}${timePart}`;
      const defaultName = `Conversation ${newRoomId.slice(-4).toUpperCase()}`;

      saveRoomToVault({
        roomId: newRoomId,
        key: keyString,
        name: defaultName,
        lastMessage: "Active",
      });

      router.push(`/room/${newRoomId}#${keyString}`);
      if (onClose) onClose();
    } catch (err) {
      console.error("Failed to create room:", err);
      toast.error("Could not start conversation.");
    }
  };

  const handleSelectRoom = (room) => {
    if (room.roomId === activeRoomId) return;
    const targetUrl = room.key
      ? `/room/${room.roomId}#${room.key}`
      : `/room/${room.roomId}`;
    router.push(targetUrl);
    if (onClose) onClose();
  };

  const handleCopyRoomLink = (e, room) => {
    e.stopPropagation();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = `${origin}/room/${room.roomId}${room.key ? `#${room.key}` : ""}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedRoomId(room.roomId);
      toast.success("Link copied");
      setTimeout(() => setCopiedRoomId(null), 2000);
    });
  };

  const handleDeleteRoom = (e, roomId, roomName) => {
    e.stopPropagation();
    if (confirm(`Remove "${roomName}"?`)) {
      removeRoomFromVault(roomId);
      if (roomId === activeRoomId) {
        const remaining = rooms.filter((r) => r.roomId !== roomId);
        if (remaining.length > 0) {
          const next = remaining[0];
          router.push(
            next.key ? `/room/${next.roomId}#${next.key}` : `/room/${next.roomId}`
          );
        } else {
          handleCreateNewRoom();
        }
      }
    }
  };

  const handleSaveRename = (e, roomId) => {
    e.stopPropagation();
    if (editingName.trim()) {
      updateRoomName(roomId, editingName.trim());
      setEditingRoomId(null);
    }
  };

  const handleJoinViaLink = (e) => {
    e.preventDefault();
    if (!joinLinkInput.trim()) return;

    let input = joinLinkInput.trim();
    let targetRoomId = "";
    let targetKey = "";

    try {
      if (input.includes("/room/")) {
        const url = new URL(input.startsWith("http") ? input : `http://${input}`);
        const parts = url.pathname.split("/room/");
        if (parts[1]) {
          targetRoomId = parts[1].split("/")[0];
        }
        targetKey = url.hash.replace(/^#/, "");
      } else {
        const [rId, k] = input.split("#");
        targetRoomId = rId;
        targetKey = k || "";
      }

      if (!targetRoomId) {
        toast.error("Invalid link");
        return;
      }

      saveRoomToVault({
        roomId: targetRoomId,
        key: targetKey,
        name: `Chat ${targetRoomId.slice(-4).toUpperCase()}`,
        lastMessage: "Joined",
      });

      setShowJoinModal(false);
      setJoinLinkInput("");
      const targetUrl = targetKey
        ? `/room/${targetRoomId}#${targetKey}`
        : `/room/${targetRoomId}`;
      router.push(targetUrl);
      if (onClose) onClose();
    } catch {
      toast.error("Could not parse link");
    }
  };

  const handleSaveProfile = () => {
    if (!profileNameInput.trim()) {
      setIsEditingProfile(false);
      return;
    }
    const updated = {
      ...currentUser,
      name: profileNameInput.trim(),
    };
    saveAnonymousUser(updated);
    if (onUpdateUser) onUpdateUser(updated);
    setIsEditingProfile(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:relative top-0 bottom-0 left-0 z-50 flex h-full w-72 sm:w-80 flex-col border-r border-white/[0.06] bg-[#0c0d12] text-zinc-100 transition-transform duration-200 ease-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 border border-white/5">
              <FiMessageSquare className="h-3.5 w-3.5 text-zinc-300" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              Chats
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowJoinModal(true)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors"
              title="Join with link"
            >
              <FiLink className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleCreateNewRoom}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors"
              title="New Chat"
            >
              <FiPlus className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 md:hidden"
            >
              <RiCloseFill className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-white/[0.04]">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-white/[0.06] bg-[#14151c] py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              {searchTerm ? "No conversations found" : "No chats yet"}
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = room.roomId === activeRoomId;

              return (
                <div
                  key={room.roomId}
                  onClick={() => handleSelectRoom(room)}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
                    isActive
                      ? "bg-white/[0.08] text-white shadow-sm"
                      : "hover:bg-white/[0.03] text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                    {/* Circle Avatar */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium border ${
                        isActive
                          ? "bg-zinc-800 text-zinc-100 border-white/[0.15]"
                          : "bg-zinc-900 text-zinc-400 border-white/[0.06]"
                      }`}
                    >
                      {room.name ? room.name.charAt(0).toUpperCase() : "#"}
                    </div>

                    {/* Room Info */}
                    <div className="overflow-hidden flex-1 min-w-0">
                      {editingRoomId === room.roomId ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full rounded bg-zinc-900 px-2 py-0.5 text-xs text-white border border-zinc-600 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(e, room.roomId);
                              if (e.key === "Escape") setEditingRoomId(null);
                            }}
                          />
                          <button
                            onClick={(e) => handleSaveRename(e, room.roomId)}
                            className="p-1 text-emerald-400 hover:text-emerald-300"
                          >
                            <FiCheck className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRoomId(null);
                            }}
                            className="p-1 text-zinc-400 hover:text-white"
                          >
                            <FiX className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`truncate text-xs font-medium ${
                                isActive ? "text-zinc-100" : "text-zinc-300"
                              }`}
                            >
                              {room.name || `Chat ${room.roomId.slice(-4)}`}
                            </span>
                            {room.lastActive && (
                              <span className="shrink-0 text-[10px] text-zinc-500 font-mono">
                                {moment(room.lastActive).format("HH:mm")}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-zinc-500 mt-0.5 font-normal">
                            {room.lastMessage || "Empty"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions on hover */}
                  {editingRoomId !== room.roomId && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
                      <button
                        onClick={(e) => handleCopyRoomLink(e, room)}
                        className={`p-1.5 rounded-md transition-colors ${
                          copiedRoomId === room.roomId
                            ? "text-emerald-400"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
                        }`}
                        title="Copy link"
                      >
                        {copiedRoomId === room.roomId ? (
                          <FiCheck className="h-3 w-3" />
                        ) : (
                          <FiCopy className="h-3 w-3" />
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRoomId(room.roomId);
                          setEditingName(room.name || "");
                        }}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                        title="Rename"
                      >
                        <FiEdit2 className="h-3 w-3" />
                      </button>

                      <button
                        onClick={(e) =>
                          handleDeleteRoom(e, room.roomId, room.name)
                        }
                        className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-white/[0.06] transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: User Identity */}
        <div className="border-t border-white/[0.06] p-3 bg-[#0a0a0e]">
          {isEditingProfile ? (
            <div className="space-y-2">
              <input
                type="text"
                value={profileNameInput}
                onChange={(e) => setProfileNameInput(e.target.value)}
                placeholder="Display name..."
                className="w-full rounded-lg border border-white/[0.1] bg-[#14151c] px-3 py-1.5 text-xs text-white focus:border-zinc-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveProfile();
                  if (e.key === "Escape") setIsEditingProfile(false);
                }}
                autoFocus
              />
              <div className="flex justify-between items-center text-[11px]">
                <button
                  type="button"
                  onClick={() => setProfileNameInput(generateRandomName())}
                  className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300"
                >
                  <FiRefreshCw className="h-3 w-3" /> Randomize
                </button>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="px-2 py-0.5 rounded text-zinc-400 hover:bg-white/[0.06]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="px-2.5 py-0.5 rounded bg-zinc-200 font-medium text-black hover:bg-white transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold text-xs border ${
                    AVATAR_BG_PALETTE[
                      (currentUser?.color || 0) % AVATAR_BG_PALETTE.length
                    ]
                  }`}
                >
                  {currentUser?.name?.charAt(0) || "A"}
                </div>
                <div className="overflow-hidden">
                  <div className="truncate text-xs font-medium text-zinc-200">
                    {currentUser?.name || "User"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setProfileNameInput(currentUser?.name || "");
                  setIsEditingProfile(true);
                }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors"
                title="Edit name"
              >
                <FiEdit2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Join Room via Link Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#12131a] p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-semibold text-zinc-100">Join Chat</h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                <RiCloseFill className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleJoinViaLink} className="mt-4 space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Paste invite link..."
                  value={joinLinkInput}
                  onChange={(e) => setJoinLinkInput(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#181922] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!joinLinkInput.trim()}
                  className="rounded-lg bg-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-white disabled:opacity-40 transition-colors"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
