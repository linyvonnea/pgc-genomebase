"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Mail, 
  FileText, 
  Clock, 
  UserCheck, 
  CreditCard,
  Shield,
  Sparkles,
  ArrowRight,
  Zap
} from "lucide-react";

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);

  // Auto-cycle through steps for demonstration
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#F69122]/10 to-[#912ABD]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[#166FB5]/10 to-[#4038AF]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        
        {/* Left Section - Logo, Welcome & CTA */}
        <div className="space-y-10 text-center lg:text-left">
          {/* Logo */}
          <div className="text-center lg:text-left">
            <Image
              src="/assets/pgc-logo.png"
              alt="PGC Logo"
              width={500}
              height={300}
              className="object-contain mx-auto lg:mx-0"
            />
          </div>

          {/* Welcome */}
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-[#F69122] via-[#B9273A] to-[#166FB5] bg-clip-text text-transparent leading-tight">
              Welcome to PGC GenomeBase
            </h1>
            <p className="text-lg text-slate-600 max-w-md mx-auto lg:mx-0">
              Your gateway to professional genomic services
            </p>
            
            {/* Simple badges */}
            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <Badge className="bg-[#166FB5] text-white border-0 hover:bg-[#166FB5]/90">
                <Shield className="w-3 h-3 mr-1" />
                Secure
              </Badge>
              <Badge className="bg-[#912ABD] text-white border-0 hover:bg-[#912ABD]/90">
                <Zap className="w-3 h-3 mr-1" />
                Fast
              </Badge>
              <Badge className="bg-[#F69122] text-white border-0 hover:bg-[#F69122]/90">
                <Sparkles className="w-3 h-3 mr-1" />
                Modern
              </Badge>
            </div>
          </div>

          {/* CTA Button */}
          <div className="space-y-4">
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 bg-gradient-to-r from-[#F69122] via-[#B9273A] to-[#912ABD] hover:from-[#F69122]/90 hover:via-[#B9273A]/90 hover:to-[#912ABD]/90 text-white font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 text-base">
                Request a Quote
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-slate-500">Get started in minutes</p>
          </div>
        </div>

        {/* Right Section - Simple Steps */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">How to Get Started</h2>
              <p className="text-slate-600">Follow these simple steps</p>
            </div>
            
            <div className="space-y-4">
              {[
                { icon: Mail, title: "Sign in with Google", description: "Your account will be used to communicate with PGC Visayas", color: "text-[#166FB5]" },
                { icon: FileText, title: "Submit Inquiry Form", description: "Indicate services or objectives", color: "text-[#F69122]" },
                { icon: Clock, title: "Wait for Response", description: "Receive a quotation or follow-up via email", color: "text-[#B9273A]" },
                { icon: UserCheck, title: "Get Approved", description: "PGC will send credentials (Inquiry ID) to your email", color: "text-[#912ABD]" },
                { icon: FileText, title: "Complete Forms", description: "Log in and fill out Client and Project info", color: "text-[#6E308E]" },
                { icon: CreditCard, title: "Receive Charge Slip", description: "It will be sent via email", color: "text-[#4038AF]" }
              ].map((step, index) => {
                const IconComponent = step.icon;
                const isActive = index === currentStep;
                return (
                  <div 
                    key={index} 
                    className={`flex items-start gap-4 p-3 rounded-lg transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#F69122]/10 to-[#912ABD]/10 scale-105 shadow-md' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isActive ? 'bg-gradient-to-r from-[#F69122] to-[#912ABD]' : 'bg-slate-100'
                    }`}>
                      <IconComponent className={`h-4 w-4 ${isActive ? 'text-white' : step.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 mt-1">
                      {index + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
