"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import { 
  Shield,
  ArrowRight,
  Info,
  Mail,
  ArrowLeft,
  FileSearch,
  HelpCircle,
  Home
} from "lucide-react";

export default function InquirePage() {
  const [agreed, setAgreed] = useState(false);
  const { signIn, user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const isLoginDisabled = !agreed || loading;

  const handleLogin = async () => {
    if (!agreed) {
      toast.warning("Please agree to the privacy notice and terms of service.");
      return;
    }

    try {
      await signIn();
    } catch (err) {
      toast.error("Sign-in failed. Please try again.");
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Back Home Button */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0 z-20">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-white rounded-full border border-slate-200 text-slate-600 text-xs font-semibold transition-all shadow-sm hover:shadow group"
        >
          <Home className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
          Back Home
        </Link>
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#F69122]/10 to-[#912ABD]/10 rounded-full blur-3xl motion-safe:animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[#166FB5]/10 to-[#4038AF]/10 rounded-full blur-3xl motion-safe:animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Inquire Card */}
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-3 pb-3 pt-4">
            {/* Logo */}
            <div className="flex justify-center -mt-1">
              <Image
                src="/assets/pgc-logo.png"
                alt="PGC Logo"
                width={140}
                height={50}
                className="object-contain"
                priority
                sizes="(max-width: 640px) 120px, 140px"
              />
            </div>
            
            {/* Inquire Icon */}
            <div className="relative mx-auto mt-1">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F69122] via-[#B9273A] to-[#912ABD] rounded-full flex items-center justify-center shadow-md">
                <FileSearch className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gradient-to-r from-[#166FB5] to-[#4038AF] rounded-full flex items-center justify-center border-2 border-white">
                <Shield className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">Submit Inquiry</CardTitle>
              <CardDescription className="text-slate-500 text-sm">
                Sign in to proceed with your service request
              </CardDescription>
              <div className="pt-1">
                <Link href="/faqs" className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-full transition-colors border border-blue-100">
                  <HelpCircle className="h-3 w-3" />
                  Have questions? View our FAQs
                </Link>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pb-4 px-5">
            {/* Privacy Notice */}
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-[#166FB5]/10 via-[#4038AF]/10 to-[#912ABD]/10 p-3.5 rounded-xl border border-[#166FB5]/20 relative overflow-hidden">
                <div className="absolute top-1.5 right-1.5">
                  <Info className="h-3 w-3 text-[#166FB5]" />
                </div>
                <h3 className="font-semibold text-[11px] mb-1.5 text-[#166FB5] flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Privacy Notice
                </h3>
                <p className="text-[10px] text-[#4038AF] leading-snug">
                  We respect your privacy and are committed to protecting your personal data. 
                  Your information will be used solely for genomic service purposes and 
                  communication with PGC Visayas.
                </p>
              </div>
              
              <div className="flex items-start gap-2.5 px-1">
                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                    className="mt-0.5 h-3.5 w-3.5 data-[state=checked]:bg-[#166FB5] data-[state=checked]:border-[#166FB5]"
                  />
                <label htmlFor="agree" className="text-xs leading-tight cursor-pointer select-none text-slate-700">
                  I agree to the privacy notice and terms of service.
                </label>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Login Button */}
            <div className="space-y-3">
              <Button
                onClick={handleLogin}
                disabled={isLoginDisabled}
                aria-disabled={isLoginDisabled}
                aria-busy={loading}
                aria-label="Sign in with Google to submit your inquiry"
                className="w-full h-11 bg-gradient-to-r from-[#F69122] via-[#B9273A] to-[#912ABD] hover:from-[#F69122]/90 hover:via-[#B9273A]/90 hover:to-[#912ABD]/90 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Sign in with Google to Inquire
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </div>
                )}
              </Button>

              <div className="text-center space-y-1">
                {loading && (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground" role="status" aria-live="polite">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <span>Connecting to authentication...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Need help section */}
            <div className="text-center pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground">
                Need help? Contact us at{" "}
                <a href="mailto:pgc.upvisayas@up.edu.ph" className="text-[#166FB5] hover:underline">
                  pgc.upvisayas@up.edu.ph
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
