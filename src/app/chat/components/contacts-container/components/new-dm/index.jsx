"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  animationDefaultOptions,
  getColor,
} from "@/lib/utils";
import LottieAnimation from "@/components/LottieAnimation";
import { apiClient } from "@/lib/api-client";
import {
  HOST,
  SEARCH_CONTACTS_ROUTE,
} from "@/utils/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Avatar,
  AvatarImage,
} from "@/components/ui/avatar";
import { BsSearch } from "react-icons/bs";
import { useAppStore } from "@/store";

const NewDM = () => {
  const { setSelectedChatType, setSelectedChatData } =
    useAppStore();
  const [openNewContactModal, setOpenNewContactModal] =
    useState(false);
  const [searchedContacts, setSearchedContacts] = useState([]);
  const [currentSearchTerm, setCurrentSearchTerm] =
    useState("");

  const searchContacts = async (searchTerm) => {
    try {
      if (searchTerm.length <= 0) {
        setSearchedContacts([]);
        return;
      }
      const response = await apiClient.post(
        SEARCH_CONTACTS_ROUTE,
        { searchTerm },
        { withCredentials: true }
      );
      if (response.status === 200 && response.data) {
        setSearchedContacts(response.data);
      }
    } catch (error) {
      console.error("Failed to search contacts", error);
    }
  };

  const selectNewContact = (contact) => {
    setCurrentSearchTerm("");
    setSearchedContacts([]);
    setOpenNewContactModal(false);
    setSelectedChatType("contact");
    setSelectedChatData(contact);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <FaPlus
              className="text-neutral-400 font-light text-opacity-90 text-sm hover:text-neutral-100 cursor-pointer transition-all duration-300"
              onClick={() => setOpenNewContactModal(true)}
            />
          </TooltipTrigger>
          <TooltipContent className="bg-[#29282c] border-none mb-2 p-3 text-white">
            Select New Contact
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog
        open={openNewContactModal}
        onOpenChange={setOpenNewContactModal}
      >
        <DialogContent className="bg-[#181920] border-none text-white w-[400px] h-[400px] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Please select a contact
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="flex bg-[#2c2e3b] rounded-lg items-center justify-between">
            <input
              type="text"
              placeholder="Search Contacts"
              className="flex-1 p-3 text-sm text-neutral-400 bg-transparent border-none focus:border-none focus:outline-none"
              onChange={(e) => {
                setCurrentSearchTerm(e.target.value);
                if (e.target.value === "")
                  setSearchedContacts([]);
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  currentSearchTerm.trim().length > 0
                ) {
                  e.preventDefault();
                  searchContacts(currentSearchTerm);
                }
              }}
              value={currentSearchTerm}
            />
            <button
              className="text-neutral-500 pr-3 focus:border-none focus:outline-none focus:text-white duration-300 transition-all"
              onClick={() => searchContacts(currentSearchTerm)}
            >
              <BsSearch className="text-lg" />
            </button>
          </div>

          {searchedContacts.length > 0 ? (
            <ScrollArea className="h-[250px]">
              <div className="flex flex-col gap-5">
                {searchedContacts.map((c) => {
                  const imageUrl = c.image
                    ? (HOST ? `${HOST}/${c.image}` : `/${c.image}`)
                    : null;

                  return (
                    <div
                      key={c._id}
                      className="flex gap-3 items-center cursor-pointer rounded-md px-2 py-1 transition-all duration-300 hover:bg-[#2c2e3b]"
                      onClick={() => selectNewContact(c)}
                    >
                      <div className="w-12 h-12 relative">
                        <Avatar className="h-12 w-12 rounded-full overflow-hidden">
                          {imageUrl ? (
                            <AvatarImage
                              src={imageUrl}
                              alt="Profile Picture"
                              className="object-cover w-full h-full bg-black rounded-full"
                            />
                          ) : (
                            <div
                              className={`uppercase h-12 w-12 text-lg border-[1px] flex items-center justify-center rounded-full ${getColor(
                                c.color
                              )}`}
                            >
                              {c.firstName
                                ? c.firstName.split("").shift()
                                : c.email?.split("").shift()}
                            </div>
                          )}
                        </Avatar>
                      </div>
                      <div className="flex flex-col">
                        <span>
                          {c.firstName && c.lastName
                            ? `${c.firstName} ${c.lastName}`
                            : c.email}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {c.email}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 md:flex mt-10 md:mt-0 flex-col justify-center items-center duration-1000 transition-all">
              <LottieAnimation
                isClickToPauseDisabled={true}
                height={100}
                width={100}
                options={animationDefaultOptions}
              />
              <div className="text-opacity-80 text-white mt-3 md:mt-1 flex flex-col gap-5 items-center lg:text-2xl text-xl transition-all duration-300 text-center">
                <h3 className="poppins-medium">
                  Hi
                  <span className="text-green-500">,</span>{" "}
                  Search a new
                  <span className="text-green-500">
                    {" "}
                    Contact
                  </span>
                </h3>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewDM;
