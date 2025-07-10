"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import { 
  UserCheck, 
  Shield,
  ArrowRight,
  Info,
  Mail,
  ArrowLeft
} from "lucide-react";

export default function LoginPage() {
  const [agreed, setAgreed] = useState(false);
  const { signIn, user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!agreed) {
      toast.warning("Please agree to the privacy notice and terms of service.");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#F69122]/10 to-[#912ABD]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[#166FB5]/10 to-[#4038AF]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-6 pb-6">
            {/* Logo */}
            <div className="flex justify-center">
              <Image
                src="/assets/pgc-logo.png"
                alt="PGC Logo"
                width={180}
                height={65}
                className="object-contain"
              />
            </div>
            
            {/* User Icon */}
            <div className="relative mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-[#F69122] via-[#B9273A] to-[#912ABD] rounded-full flex items-center justify-center shadow-lg">
                <UserCheck className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-[#166FB5] to-[#4038AF] rounded-full flex items-center justify-center border-2 border-white">
                <Shield className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold">Sign In</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Enhanced Privacy Notice */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#166FB5]/10 via-[#4038AF]/10 to-[#912ABD]/10 p-5 rounded-xl border border-[#166FB5]/30 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <Info className="h-4 w-4 text-[#166FB5]" />
                </div>
                <h3 className="font-semibold text-sm mb-3 text-[#166FB5] flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Privacy Notice
                </h3>
                <p className="text-xs text-[#4038AF] leading-relaxed">
                  We respect your privacy and are committed to protecting your personal data. 
                  Your information will be used solely for genomic service purposes and 
                  communication with PGC Visayas.
                </p>
              </div>
              
              <div className="flex items-start gap-3 p-2">                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                    className="mt-1 data-[state=checked]:bg-[#166FB5] data-[state=checked]:border-[#166FB5]"
                  />
                <label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer select-none">
                  I agree to the privacy notice and terms of service.
                </label>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Enhanced Login Button */}
            <div className="space-y-4">
              <Button
                onClick={handleLogin}
                disabled={!agreed || loading}
                className="w-full h-14 bg-gradient-to-r from-[#F69122] via-[#B9273A] to-[#912ABD] hover:from-[#F69122]/90 hover:via-[#B9273A]/90 hover:to-[#912ABD]/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5" />
                    Sign in with Google
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </div>
                )}
              </Button>

              <div className="text-center space-y-2">
                
                {loading && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <span>Connecting to authentication service...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Need help section */}
            <div className="text-center pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Need help? Contact us at{" "}
                <a href="mailto:support@pgc-genomebase.com" className="text-[#166FB5] hover:underline">
                  support@pgc-genomebase.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}