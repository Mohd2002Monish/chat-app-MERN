import { animationDefaultOptions } from "@/lib/utils";
import Lottie from "react-lottie";
import Logo from "/main-icon.svg";

const EmptyChatContainer = () => {
  return (
    <div className="flex-1 md:bg-[#1c1d25] md:flex flex-col justify-center items-center hidden duration-1000 transition-all">
      <Lottie
        isClickToPauseDisabled={true}
        height={200}
        width={200}
        options={animationDefaultOptions}
      />
      <div className="text-opacity-80 text-white flex flex-col gap-5 ic mt-10 lg:text-4xl text-3xl transition-all duration-300 text-center">
        <h3 className="poppins-medium">
          Hi<span className="text-green-500">,</span>{" "}
          Welcome to{" "}
          <img
            src={Logo}
            className="inline-flex h-10 w-10 bg-white rounded-full"
            alt="Chat logo"
          />{" "}
          <span className="text-green-500"> Chat.</span>
        </h3>
      </div>
    </div>
  );
};

export default EmptyChatContainer;
