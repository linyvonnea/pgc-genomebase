"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { testEmailSystem } from "@/app/actions/inquiryActions"
import { toast } from "sonner"

export default function TestEmailPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<null | { success: boolean; message: string; emailDocId?: string; error?: string }>(null)

  const handleTestEmail = async () => {
    setIsLoading(true)
    try {
      const response = await testEmailSystem()
      setResult(response)
      if (response.success) {
        toast.success("Test email queued successfully!")
      } else {
        toast.error("Test email failed: " + response.message)
      }
    } catch (error) {
      toast.error("Failed to test email system")
      setResult({
        success: false,
        message: "Error testing email system",
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6">Email System Test</h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            This test will attempt to send an email to madayon1@up.edu.ph using the Firebase Trigger Email extension.
            Use this to diagnose email delivery issues.
          </p>
        </div>

        <Button 
          onClick={handleTestEmail} 
          disabled={isLoading}
          className="mb-6"
        >
          {isLoading ? "Testing..." : "Test Email System"}
        </Button>

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? "✅ Test Completed" : "❌ Test Failed"}
            </h3>
            <p className={`mt-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
              {result.message}
            </p>
            {result.emailDocId && (
              <p className="text-sm text-gray-600 mt-2">
                Email Document ID: {result.emailDocId}
              </p>
            )}
            {result.error && (
              <p className="text-sm text-red-600 mt-2">
                Error: {result.error}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Troubleshooting Steps:</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Check Firebase Console → Extensions for "Trigger Email"</li>
            <li>2. Verify email provider configuration (SendGrid, Mailgun, etc.)</li>
            <li>3. Check Firestore → mail collection for email documents</li>
            <li>4. Verify templates exist in Firestore → templates collection</li>
            <li>5. Check Firebase Functions logs for errors</li>
          </ol>
        </div>
      </div>
    </div>
  )
}