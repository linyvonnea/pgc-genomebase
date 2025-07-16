"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail } from "lucide-react";

export default function InquiryThankYouPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200); // 1.2s loading
    return () => clearTimeout(timer);
  }, []);

  const handleNewInquiry = () => {
    router.push("/client/inquiry-request");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50/50 to-blue-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-lg text-blue-700 font-semibold">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent mb-4">
            Thank You!
          </h1>

          {/* Message */}
          <p className="text-slate-700 mb-8 leading-relaxed">
            Thank you for submitting your inquiry. PGC Visayas will reach out to
            you via email.
          </p>

          {/* Action Button */}
          <Button
            onClick={handleNewInquiry}
            className="w-full h-12 bg-gradient-to-r from-[#166FB5] to-[#4038AF] hover:from-[#166FB5]/90 hover:to-[#4038AF]/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 mb-8"
          >
            Make Another Inquiry
          </Button>

          {/* Divider */}
          <div className="border-t border-slate-200 mb-6"></div>

          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-800">
              Have Questions?
            </h3>
            <p className="text-slate-600 text-sm">
              If you have any inquiries, kindly email us at:
            </p>
            <div className="flex items-center justify-center gap-2 text-[#166FB5] font-medium">
              <Mail className="w-4 h-4" />
              <a
                href="mailto:pgc.upvisayas@up.edu.ph"
                className="hover:underline"
              >
                pgc.upvisayas@up.edu.ph
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
