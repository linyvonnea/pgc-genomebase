"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle, Mail, Home } from "lucide-react";

export default function ThankYouPage() {
  useEffect(() => {
    // Optional: Add confetti or celebration effect here
  }, []);

  return (
    <main 
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
      }}
    >
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
              Thank You!
            </h1>
            <p className="text-base text-gray-600 leading-relaxed">
              Thank you for coordinating with PGC Visayas
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6 text-center">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Have Questions?</span>
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

            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Your project information has been successfully submitted. Our team will review your submission and get back to you shortly.
              </p>
              
              <div className="pt-4">
                <Link href="/login">
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-200 h-11 font-medium"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Return to Home
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
