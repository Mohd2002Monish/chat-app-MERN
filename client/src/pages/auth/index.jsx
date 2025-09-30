import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import {
  LOGIN_ROUTE,
  SIGNUP_ROUTE,
} from "@/utils/constants";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";

const Auth = () => {
  const navigate = useNavigate();
  const { setUserInfo } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const validateSignup = () => {
    if (!email.length) {
      toast.error("Email is required!");
      return false;
    }
    if (!password.length) {
      toast.error("Password is required!");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error(
        "Password and Confirm password shoud be same!"
      );
      return false;
    }
    return true;
  };

  const validateLogin = () => {
    if (!email.length) {
      toast.error("Email is required!");
      return false;
    }
    if (!password.length) {
      toast.error("Password is required!");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateLogin()) {
      return;
    }
    const loadingToast = toast.loading("Logging in....");
    try {
      const response = await apiClient.post(
        LOGIN_ROUTE,
        { email, password },
        { withCredentials: true }
      );
      console.log(response);
      toast.dismiss(loadingToast);
      if (response.data.user.id) {
        setUserInfo(response.data.user);
        toast.success("Login successfull");
        if (response.data.user.profileSetup) {
          navigate("/chat");
        } else navigate("/profile");
      }
    } catch (error) {
      console.log(error);
      if (
        error.response.status === 400 ||
        error.response.status === 404
      ) {
        toast.dismiss(loadingToast);
        toast.error(error.response.data);
        return;
      }
    }
  };

  const handleSignup = async () => {
    if (!validateSignup()) {
      return;
    }
    const loadingToast = toast.loading("Registering....");
    try {
      const response = await apiClient.post(
        SIGNUP_ROUTE,
        { email, password },
        { withCredentials: true }
      );
      console.log(response);
      toast.dismiss(loadingToast);
      if (response.status === 201) {
        setUserInfo(response.data.user);
        navigate("/profile");
      }
    } catch (error) {
      console.log(error,'jsjsjsj');
      if (
        error.response.status === 400 ||
        error.response.status === 404 ||
        error.response.status === 409
      ) {
        toast.dismiss(loadingToast);
        toast.error(error.response.data);
        return;
      }
    }
  };

  return (
    <div className="h-[100vh] w-[100vw] flex items-center justify-center">
      <div className="h-[80vh] bg-white border-2 border-green-100 text-opacity-90 shadow-2xl w-[80vw] md:w-[90vw] lg:w-[70vw] xl:w-[60vw] rounded-3xl flex items-center justify-center">
        <div className="flex flex-col gap-10 items-center justify-center w-full">
          <div className="flex items-center justify-center flex-col">
            <div className="flex items-center justify-center">
              <h1 className="text-3xl font-bold sm:text-5xl">
                Welcome
              </h1>
            </div>
            <p className="font-small sm:font-medium text-center p-3">
              Fill in the details to get started with your
              personal chat app!
            </p>
          </div>
          <div className="flex items-center justify-center w-full">
            <Tabs className="w-3/4" defaultValue="login">
              <TabsList className="bg-transparent rounded-none w-full">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-transparent text-black text-opacity-90 border-b-2 rounded-none w-full data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:border-b-green-500 p-3 transition-all duration-300"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="data-[state=active]:bg-transparent text-black text-opacity-90 border-b-2 rounded-none w-full data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:border-b-green-500 p-3 transition-all duration-300"
                >
                  Signup
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent
                className="flex flex-col gap-5 mt-10"
                value="login"
              >
                <Input
                  placeholder="Email"
                  type="email"
                  className="rounded-full p-6"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLogin();
                    }
                  }}
                />
                <Input
                  placeholder="Password"
                  type="password"
                  className="rounded-full p-6"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLogin();
                    }
                  }}
                />
                <Button
                  className="rounded-full p-6"
                  onClick={handleLogin}
                >
                  Login
                </Button>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent
                className="flex flex-col gap-5"
                value="signup"
              >
                <Input
                  placeholder="Email"
                  type="email"
                  className="rounded-full p-6"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSignup();
                    }
                  }}
                />
                <Input
                  placeholder="Password"
                  type="password"
                  className="rounded-full p-6"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSignup();
                    }
                  }}
                />
                <Input
                  placeholder="Confirm Password"
                  type="password"
                  className="rounded-full p-6"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSignup();
                    }
                  }}
                />
                <Button
                  className="rounded-full p-6"
                  onClick={handleSignup}
                >
                  Signup
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
