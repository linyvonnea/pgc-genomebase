import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle, Mail, LogOut } from "lucide-react";

interface ConfirmationPageProps {
  title?: string;
  message?: string;
  emailInfo?: string;
  showEmail?: boolean;
  showLogout?: boolean;
  onLogout?: () => void;
  buttonLabel?: string;
}

export default function ConfirmationPage({
  title = "Thank You!",
  message = "Your project information has been successfully submitted. Our team will review your submission and get back to you shortly.",
  emailInfo = "Thank you for coordinating with PGC Visayas",
  showEmail = true,
  showLogout = true,
  onLogout,
  buttonLabel = "Logout",
}: ConfirmationPageProps) {
  return (
    <main className="min-h-screen flex justify-center px-4">
      <div className="w-full max-w-lg">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-6">
              <Image
                src="/assets/pgc-logo.png"
                alt="PGC Logo"
                width={150}
                height={75}
                className="h-auto"
              />
            </div>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {title}
            </h1>
            <p className="text-base text-gray-600 leading-relaxed">
              {emailInfo}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            {showEmail && (
              <div className="p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-sm font-large text-blue-800">Have Questions?</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  If you have any inquiries, kindly email us at:
                </p>
                <a 
                  href="mailto:pgc.upvisayas@up.edu.ph"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  pgc.upvisayas@up.edu.ph
                </a>
              </div>
            )}
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {message}
              </p>
              {showLogout && onLogout && (
                <div className="pt-4">
                  <Button 
                    onClick={onLogout}
                    className="w-full h-12 px-8 bg-gradient-to-r from-[#166FB5] to-[#4038AF] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {buttonLabel}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
