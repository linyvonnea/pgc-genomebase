"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";

export default function LoginPage() {
  const [agreed, setAgreed] = useState(false);
  const { signIn, user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!agreed) {
      toast.warning("Please agree to the privacy notice.");
      return;
    }

    try {
      await signIn();
    } catch (err) {
      toast.error("Login failed. Please try again.");
      console.error(err);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/client/inquiry-request");
      }
    }
  }, [user, isAdmin, loading, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* Left Section */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">WELCOME TO PGC GENOMEBASE!</h1>
          <div className="flex justify-center">
            <Image
              src="/assets/pgc-logo.png"
              alt="PGC Logo"
              width={280}
              height={140}
              className="mb-2"
            />
          </div>
          <h2 className="text-lg font-semibold">Quote Request</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
            ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
            laboris nisi ut aliquip ex ea commodo consequat.
          </p>
        </div>

        {/* Right Section */}
        <div
          className="rounded-3xl p-6 md:p-8 shadow-lg backdrop-blur-lg"
          style={{
            background:
              "linear-gradient(135deg, #F69122 0%, #B9273A 15%, #912ABD 33%, #6E30BE 46%, #633190 58%, #40388F 88%, #166FB5 100%)",
          }}
        >
          <div className="space-y-4 text-white">
            <h2 className="text-lg font-bold">Privacy Notice</h2>
            <div className="border border-white/50 rounded-md p-4 text-sm bg-white/10">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
              ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
              laboris nisi ut aliquip ex ea commodo consequat.
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="border-white data-[state=checked]:bg-white"
              />
              <label htmlFor="agree" className="text-sm">
                I Agree
              </label>
            </div>
            <Button
              onClick={handleLogin}
              className="w-full bg-white text-black hover:bg-gray-100 transition"
            >
              Sign in with Google
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}