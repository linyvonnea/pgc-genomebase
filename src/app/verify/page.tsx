"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { signInWithPopup, GoogleAuthProvider, getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ClientVerifyPage() {
  const [agreed, setAgreed] = useState(false);
  const [inquiryId, setInquiryId] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [googleUser, setGoogleUser] = useState<{ email: string } | null>(null);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    if (!agreed) {
      toast.warning("Please agree to the privacy notice before signing in with Google.");
      return;
    }
    setVerifyError("");
    setVerifying(true);
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (!user.email) {
        toast.error("Google account has no email.");
        setVerifying(false);
        return;
      }
      setGoogleUser({ email: user.email });
    } catch (err) {
      toast.error("Google sign-in failed.");
    } finally {
      setVerifying(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.warning("Please agree to the privacy notice.");
      return;
    }
    setVerifyError("");
    setVerifying(true);
    try {
      if (!googleUser?.email) {
        toast.error("Please sign in with Google first.");
        setVerifying(false);
        return;
      }
      if (!inquiryId) {
        toast.error("Please enter your Inquiry ID.");
        setVerifying(false);
        return;
      }
      const inquiryDoc = await getDoc(doc(db, "inquiries", inquiryId));
      if (!inquiryDoc.exists()) {
        toast.error("Inquiry ID not found.");
        setVerifying(false);
        return;
      }
      const inquiry = inquiryDoc.data();
      if (!inquiry.isApproved) {
        toast.error("This inquiry has not been approved yet.");
        setVerifying(false);
        return;
      }
      // Check if contact person has submitted
      const contactClientSnap = await getDoc(doc(db, "clients", inquiry.email));
      const contactClient = contactClientSnap.exists() ? contactClientSnap.data() : null;
      if (googleUser.email === inquiry.email) {
        // Contact person can always proceed
        router.push(`/client/client-info?email=${encodeURIComponent(googleUser.email)}&inquiryId=${encodeURIComponent(inquiryId)}`);
      } else if (contactClient && contactClient.haveSubmitted === true) {
        // Any other email can proceed if contact person has submitted
        router.push(`/client/client-info?email=${encodeURIComponent(googleUser.email)}&inquiryId=${encodeURIComponent(inquiryId)}`);
      } else {
        toast.error("Only the contact person can proceed until they have submitted their client info.");
        setVerifying(false);
        return;
      }
    } catch (err) {
      toast.error("Verification failed. Please check your Inquiry ID and Google account.");
    } finally {
      setVerifying(false);
    }
  };

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
          <h2 className="text-lg font-semibold">Client Verification</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Please sign in with Google and enter your Inquiry ID to proceed to the client information form.
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
              onClick={handleGoogleSignIn}
              className="w-full bg-white text-black hover:bg-gray-100 transition"
              disabled={verifying || !!googleUser}
            >
              {googleUser ? `Signed in as ${googleUser.email}` : "Sign in with Google"}
            </Button>
            {googleUser && (
              <form onSubmit={handleVerify} className="space-y-4 pt-2">
                <div>
                  <Label>Inquiry ID <span className="text-red-500">*</span></Label>
                  <Input
                    value={inquiryId}
                    onChange={e => setInquiryId(e.target.value)}
                    placeholder=""
                    required
                    className="bg-white/10"
                  />
                </div>
                <Button type="submit" className="w-full bg-white text-black hover:bg-gray-100 transition" disabled={verifying}>
                  {verifying ? "Verifying..." : "Verify"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
