// Client Login Page
// Allows users to sign in with Google, agree to privacy, and verify their password to access project/client forms.

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { signInWithPopup, GoogleAuthProvider, getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getProjectRequest } from "@/services/projectRequestService";
import { 
  UserCheck, 
  Shield,
  ArrowLeft,
  CheckCircle,
  Mail
} from "lucide-react";

export default function ClientVerifyPage() {
  // State for privacy agreement, inquiry ID, errors, loading, and Google user
  const [agreed, setAgreed] = useState(false);
  const [inquiryId, setInquiryId] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [googleUser, setGoogleUser] = useState<{ email: string } | null>(null);
  const router = useRouter();

  // Handle Google sign-in and set user
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

  // Handle verification of Inquiry ID and permissions
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
        toast.error("Please enter your password.");
        setVerifying(false);
        return;
      }
      // Fetch inquiry document from Firestore
      const inquiryDoc = await getDoc(doc(db, "inquiries", inquiryId));
      if (!inquiryDoc.exists()) {
        toast.error("Password not found.");
        setVerifying(false);
        return;
      }
      const inquiry = inquiryDoc.data();
      if (!inquiry.isApproved) {
        toast.error("This inquiry has not been approved yet.");
        setVerifying(false);
        return;
      }

      // Check if project already exists for this inquiry
      let projectPid = "";
      const projectsRef = collection(db, "projects");
      const projectQuery = query(projectsRef, where("iid", "==", inquiryId));
      const projectSnapshot = await getDocs(projectQuery);
      
      if (!projectSnapshot.empty) {
        projectPid = projectSnapshot.docs[0].data().pid;
      }

      // Permission logic: contact person or after contact person submits
      if (googleUser.email === inquiry.email || inquiry.haveSubmitted === true) {
        const params = new URLSearchParams({
          email: googleUser.email,
          inquiryId: inquiryId,
        });
        
        // Check for draft project first
        const draftProject = await getProjectRequest(inquiryId);
        const hasDraft = draftProject && draftProject.status === "draft";
        
        if (projectPid || hasDraft) {
          // Project exists (real or draft) - go to Client Portal
          if (projectPid) {
            params.set("pid", projectPid);
          }
          router.push(`/client/client-info?${params.toString()}`);
        } else {
          // No project exists - go to Project Information Form
          router.push(`/client/project-info?${params.toString()}`);
        }
      } else {
        toast.error("Only the contact person can proceed until they have submitted their client info.");
        setVerifying(false);
        return;
      }
    } catch (err) {
      toast.error("Login failed. Please check your password and Google account.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main 
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
      }}
    >
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            {/* PGC Logo */}
            <div className="flex justify-center mb-6">
              <Image
                src="/assets/pgc-logo.png"
                alt="PGC Logo"
                width={150}
                height={75}
                className="h-auto"
              />
            </div>
            <CardTitle className="text-xl lg:text-2xl font-bold text-gray-800">Client Portal Login</CardTitle>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              Sign in with <strong>Google</strong> and enter your <strong>Password</strong> to access your project information.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Privacy Notice Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Shield className="w-4 h-4" />
                Privacy Notice
              </div>
              <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg border leading-relaxed">
                Your personal information will be processed in accordance with our privacy policy. 
                We collect and use your data solely for project management and communication purposes.
                Your information is securely stored and will not be shared with third parties without consent.
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacy-agreement"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="mt-0.5"
                />
                <label 
                  htmlFor="privacy-agreement" 
                  className="text-xs text-gray-600 leading-relaxed cursor-pointer"
                >
                  I agree to the privacy notice and terms of service
                </label>
              </div>
            </div>

            <Separator />

            {/* Google Sign In Section */}
            <div className="space-y-4">
              <Button
                onClick={handleGoogleSignIn}
                disabled={verifying || !!googleUser}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm transition-all duration-200 h-11"
                variant="outline"
              >
                <Mail className="w-4 h-4 mr-2" />
                {googleUser ? `Signed in as ${googleUser.email}` : "Sign in with Google"}
              </Button>
              {/* Show success if signed in */}
              {googleUser && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Successfully authenticated</span>
                </div>
              )}
            </div>

            {/* Verification Form Section */}
            {googleUser && (
              <>
                <Separator />
                <form onSubmit={handleVerify} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="inquiry-id" className="text-sm font-medium text-gray-700">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="inquiry-id"
                      value={inquiryId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInquiryId(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 h-11"
                    />
                    <p className="text-xs text-gray-500 leading-relaxed">
                      This password was provided on the email sent by PGC Visayas.
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={verifying || !inquiryId.trim()}
                    className="w-full h-12 px-8 bg-gradient-to-r from-[#F69122] via-[#B9273A] to-[#912ABD] hover:from-[#F69122]/90 hover:via-[#B9273A]/90 hover:to-[#912ABD]/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {verifying ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
