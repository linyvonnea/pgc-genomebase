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
  Zap,
  HelpCircle,
  FileCheck,
  Upload,
  BarChart3
} from "lucide-react";

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);

  // Auto-cycle through steps for demonstration
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % 7);
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

      <div className="w-full max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6 items-center">
          
          {/* Left Section - Logo, Welcome & CTA */}
          <div className="lg:col-span-6 space-y-5 text-center lg:text-left">
            {/* Logo */}
            <div className="text-center lg:text-left">
              <Image
                src="/assets/pgc-logo.png"
                alt="PGC Logo"
                width={1300}
                height={700}
                className="object-contain w-auto h-auto mx-auto lg:mx-0"
                priority
              />
            </div>

            {/* Welcome */}
            <div className="space-y-3">
              <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-[#F69122] via-[#B9273A] to-[#166FB5] bg-clip-text text-transparent leading-tight">
                PGC Visayas Genomic Service Request Portal
              </h1>
              <p className="text-base lg:text-lg text-slate-600 max-w-md mx-auto lg:mx-0">
                Start your journey with our laboratory, equipment, or bioinformatics services.
              </p>
            </div>

            {/* CTA Buttons - Best Practice Order: Primary (Submit) -> Secondary (Portal) -> Utility (FAQs) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 justify-center lg:justify-start">
                <Link href="/inquire">
                  <Button className="h-10 px-5 bg-gradient-to-r from-[#F69122] via-[#B9273A] to-[#912ABD] hover:from-[#F69122]/90 hover:via-[#B9273A]/90 hover:to-[#912ABD]/90 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 text-xs border-2 border-transparent whitespace-nowrap">
                    Submit an Inquiry
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
                <Link href="/portal">
                  <Button variant="outline" className="h-10 px-5 bg-white border-2 border-[#166FB5] text-[#166FB5] hover:bg-[#166FB5] hover:text-white font-semibold shadow-sm hover:shadow-md transition-all duration-300 text-xs group whitespace-nowrap">
                    Login to Client Portal
                    <UserCheck className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:scale-110" />
                  </Button>
                </Link>
                <Link href="/faqs">
                  <Button variant="outline" className="h-10 px-5 bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold shadow-sm hover:shadow-md transition-all duration-300 text-xs group whitespace-nowrap">
                    <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                    View FAQs
                  </Button>
                </Link>
              </div>
              <Link href="/login">
                <p className="text-sm text-slate-400 hover:text-[#166FB5] transition-colors cursor-pointer mt-4 inline-block">
                  Sign in as Admin
                </p>
              </Link>
            </div>
          </div>

          {/* Right Section - Simple Steps (col-start-8 pushes it right, away from buttons) */}
          <div className="lg:col-span-5 lg:col-start-8 bg-white/80 backdrop-blur-sm rounded-2xl p-5 lg:p-6 shadow-xl border border-white/20">
            <div className="space-y-4 lg:space-y-6">
              <div className="text-center">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1 lg:mb-2 whitespace-nowrap">How to Get Started</h2>
                <p className="text-sm text-slate-600">Follow these simple steps</p>
              </div>
            
              <div className="space-y-1.5 lg:space-y-2">
                {[
                  { icon: FileText, title: "Submit an Inquiry", description: "Enter your research and service details.", color: "text-[#166FB5]" },
                  { icon: Clock, title: "Wait for Assessment", description: "Receive your quotation.", color: "text-[#F69122]" },
                  { icon: CheckCircle, title: "Confirm and Proceed", description: "Approve the quote and proceed with the service", color: "text-[#B9273A]" },
                  { icon: FileCheck, title: "Submit Sample Information", description: "Send the Sample Submission Form", color: "text-[#912ABD]" },
                  { icon: CreditCard, title: "Receive Charge Slip", description: "Settle payment while sample processing begins", color: "text-[#6E308E]" },
                  { icon: Upload, title: "Upload Official Receipt", description: "Upload proof of payment", color: "text-[#166FB5]" },
                  { icon: BarChart3, title: "Receive Service Reports", description: "Access your results", color: "text-[#4038AF]" }
                ].map((step, index) => {
                  const IconComponent = step.icon;
                  const isActive = index === currentStep;
                  return (
                    <div 
                      key={index} 
                      className={`flex items-start gap-3 p-1.5 lg:p-2 rounded-lg transition-all duration-300 relative ${
                        isActive 
                          ? 'bg-gradient-to-r from-[#F69122]/10 to-[#912ABD]/10 scale-[1.01] shadow-sm' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-6 h-6 lg:w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isActive ? 'bg-gradient-to-r from-[#F69122] to-[#912ABD]' : 'bg-slate-100'
                      }`}>
                        <IconComponent className={`h-2.5 w-2.5 lg:h-3.5 w-3.5 ${isActive ? 'text-white' : step.color}`} />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className={`text-xs lg:text-sm font-medium ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                          {step.title}
                        </h3>
                        <p className="text-[9px] lg:text-[12px] text-slate-500 leading-tight lg:leading-tight">
                          {step.description}
                        </p>
                      </div>
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] lg:text-[11px] font-bold text-slate-300">
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
    </div>
  );
}
