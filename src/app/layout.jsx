import "./globals.css";
import AppProvider from "@/context/AppProvider";

export const metadata = {
  title: "Chat App",
  description: "Realtime Chat Application",
  icons: {
    icon: "/main-icon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/main-icon.svg" />
      </head>
      <body className="bg-[#090a0f] text-[#f1f3f9] antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
