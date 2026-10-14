"use client";

import { useAppStore } from "@/store";
import { Avatar, AvatarImage } from "./ui/avatar";
import { HOST } from "@/utils/constants";
import { getColor } from "@/lib/utils";

const ContactList = ({ contacts = [], isChannel = false }) => {
  const {
    selectedChatData,
    setSelectedChatData,
    setSelectedChatType,
    setSelectedChatMessages,
  } = useAppStore();

  const handleClick = (contact) => {
    if (isChannel) {
      setSelectedChatType("channel");
    } else {
      setSelectedChatType("contact");
    }
    setSelectedChatData(contact);
    if (
      selectedChatData &&
      selectedChatData._id !== contact._id
    ) {
      setSelectedChatMessages([]);
    }
  };

  return (
    <div className="mt-5">
      {contacts.map((contact) => {
        const isSelected = selectedChatData && selectedChatData._id === contact._id;
        const imageUrl = contact.image
          ? (HOST ? `${HOST}/${contact.image}` : `/${contact.image}`)
          : null;

        return (
          <div
            key={contact._id}
            className={`ml-5 pl-5 py-2 rounded-tl-lg rounded-bl-lg transition-all duration-300 cursor-pointer ${
              isSelected
                ? "bg-neutral-700 hover:bg-neutral-800"
                : "hover:bg-[#f1f1f111]"
            }`}
            onClick={() => handleClick(contact)}
          >
            <div className="flex gap-3 items-center justify-start text-neutral-300">
              {!isChannel && (
                <div className="flex gap-3 items-center justify-center">
                  <Avatar className="h-10 w-10 rounded-full overflow-hidden">
                    {imageUrl ? (
                      <AvatarImage
                        src={imageUrl}
                        alt="Profile Picture"
                        className="object-cover w-full h-full bg-black"
                      />
                    ) : (
                      <div
                        className={`uppercase h-10 w-10 text-lg border-[1px] flex items-center justify-center rounded-full ${
                          isSelected
                            ? "bg-neutral-700 border border-white/70"
                            : getColor(contact.color)
                        }`}
                      >
                        {contact.firstName
                          ? contact.firstName.split("").shift()
                          : contact.email?.split("").shift()}
                      </div>
                    )}
                  </Avatar>
                </div>
              )}
              {isChannel && (
                <div className="bg-[#ffffff22] h-10 w-10 flex items-center justify-center rounded-full">
                  #
                </div>
              )}
              {isChannel ? (
                <span>{contact.name}</span>
              ) : (
                <span>
                  {contact.firstName && contact.lastName
                    ? `${contact.firstName} ${contact.lastName}`
                    : contact.email}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ContactList;
