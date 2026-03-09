"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QuotationThread } from "@/types/QuotationThread";
import { Inquiry } from "@/types/Inquiry";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle2, Clock, MessageSquare, FileText } from "lucide-react";
import { subscribeToQuotationThread } from "@/services/quotationThreadService";

interface QuotationThreadPageClientProps {
  thread: QuotationThread;
  inquiry: Inquiry;
}

/**
 * Status badge styling based on inquiry status
 */
const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "under_review":
      return "bg-blue-100 text-blue-800";
    case "quoted":
      return "bg-purple-100 text-purple-800";
    case "negotiating":
      return "bg-orange-100 text-orange-800";
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "converted":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/**
 * Format status for display (convert snake_case to Title Case)
 */
const formatStatus = (status: string) => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function QuotationThreadPageClient({
  thread: initialThread,
  inquiry,
}: QuotationThreadPageClientProps) {
  const router = useRouter();
  const [thread, setThread] = useState(initialThread);
  const [activeTab, setActiveTab] = useState("details");

  // Subscribe to real-time thread updates
  useEffect(() => {
    const unsubscribe = subscribeToQuotationThread(
      initialThread.id,
      (updatedThread) => {
        if (updatedThread) {
          setThread(updatedThread);
        }
      }
    );

    return () => unsubscribe();
  }, [initialThread.id]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/inquiry")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inquiries
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Quotation Thread</h1>
            <p className="text-sm text-muted-foreground">
              Inquiry ID: {inquiry.id}
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(thread.status)}>
          {formatStatus(thread.status)}
        </Badge>
      </div>

      {/* Client Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>Details about the inquiring client</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-base">{thread.clientName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base">{thread.clientEmail}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Affiliation
              </p>
              <p className="text-base">{thread.clientAffiliation}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Service Type
              </p>
              <p className="text-base capitalize">{inquiry.serviceType}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">
            <FileText className="h-4 w-4 mr-2" />
            Inquiry Details
          </TabsTrigger>
          <TabsTrigger value="quotation">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Quotation
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
            {thread.unreadCount.admin > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {thread.unreadCount.admin}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* Inquiry Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Inquiry Details</CardTitle>
              <CardDescription>
                Complete information from the inquiry submission
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inquiry.species && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Species
                  </p>
                  <p className="text-base">
                    {inquiry.species}
                    {inquiry.otherSpecies && ` (${inquiry.otherSpecies})`}
                  </p>
                </div>
              )}
              {inquiry.researchOverview && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Research Overview
                  </p>
                  <p className="text-base whitespace-pre-wrap">
                    {inquiry.researchOverview}
                  </p>
                </div>
              )}
              {inquiry.methodologyFileUrl && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Methodology File
                  </p>
                  <a
                    href={inquiry.methodologyFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Uploaded File
                  </a>
                </div>
              )}
              {inquiry.sampleCount && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Number of Samples
                  </p>
                  <p className="text-base">{inquiry.sampleCount}</p>
                </div>
              )}
              {inquiry.workflowType && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Workflow Type
                  </p>
                  <p className="text-base capitalize">
                    {inquiry.workflowType.replace("_", " ")}
                  </p>
                </div>
              )}
              {inquiry.individualAssayDetails && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Individual Assay Details
                  </p>
                  <p className="text-base whitespace-pre-wrap">
                    {inquiry.individualAssayDetails}
                  </p>
                </div>
              )}
              {inquiry.workflows && inquiry.workflows.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Workflows
                  </p>
                  <ul className="list-disc list-inside">
                    {inquiry.workflows.map((workflow: string, index: number) => (
                      <li key={index} className="text-base">
                        {workflow}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {inquiry.additionalInfo && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Additional Information
                  </p>
                  <p className="text-base whitespace-pre-wrap">
                    {inquiry.additionalInfo}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotation Tab */}
        <TabsContent value="quotation">
          <Card>
            <CardHeader>
              <CardTitle>Quotation Management</CardTitle>
              <CardDescription>
                Create and manage quotations for this inquiry
              </CardDescription>
            </CardHeader>
            <CardContent>
              {thread.quotations && thread.quotations.length > 0 ? (
                <div className="space-y-4">
                  {thread.quotations.map((quotation) => (
                    <div
                      key={quotation.quotationNumber}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{quotation.quotationNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Version {quotation.version}
                          </p>
                        </div>
                        <Badge>{quotation.status}</Badge>
                      </div>
                      <p className="text-2xl font-bold">
                        ₱{quotation.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created on{" "}
                        {quotation.createdAt.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No quotations created yet
                  </p>
                  <Button>Create Quotation</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>
                Communication history with the client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Message interface coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>
                Chronological history of thread activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Timeline view coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
