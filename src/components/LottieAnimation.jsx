"use client";

import dynamic from "next/dynamic";
import React from "react";

const Lottie = dynamic(() => import("react-lottie"), {
  ssr: false,
  loading: () => <div className="h-[100px] w-[100px]" />,
});

export default function LottieAnimation(props) {
  return <Lottie {...props} />;
}
