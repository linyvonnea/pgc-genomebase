"use client";

// Admin Client Conforme Management Page
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileCheck, 
  Calendar, 
  User, 
  Building2, 
  Search, 
  Download,
  Shield,
  Clock,
  CheckCircle2,
  ExternalLink 
} from "lucide-react";
import { ClientConforme } from "@/types/ClientConforme";
import { getClientConformesByInquiry } from "@/services/clientConformeService";
import { getDocs, collection, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import DownloadConformeButton from "@/components/pdf/DownloadConformeButton";

export default function ClientConformesPage() {
  const [conformes, setConformes] = useState<ClientConforme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConforme, setSelectedConforme] = useState<ClientConforme | null>(null);

  useEffect(() => {
    loadRecentConformes();
  }, []);

  const loadRecentConformes = async () => {
    try {
      setLoading(true);
      
      // Get recent conformes (last 50)
      const q = query(
        collection(db, "clientConformes"),
        orderBy("data.createdAt", "desc"),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      const conformesList = snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data().data
      })) as ClientConforme[];

      setConformes(conformesList);
    } catch (error) {
      console.error("Error loading conformes:", error);
      toast.error("Failed to load Client Conforme records");
    } finally {
      setLoading(false);
    }
  };

  const filteredConformes = conformes.filter(conforme =>
    conforme.data.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conforme.data.inquiryId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conforme.data.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conforme.data.affiliation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case "pending_director":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending Director</Badge>;
      case "signed":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><FileCheck className="w-3 h-3 mr-1" />Signed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 mt-2">Loading Client Conforme records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Client Conforme Records</h1>
          <p className="text-slate-600 mt-1">Legal agreement records and digital signatures</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Shield className="w-4 h-4" />
          <span>Legal Documents</span>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by client name, inquiry ID, project title, or affiliation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={loadRecentConformes} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid gap-4">
        {filteredConformes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">
                {searchQuery ? "No conformes found matching your search." : "No Client Conforme records found."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredConformes.map((conforme) => (
            <Card key={conforme.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">
                      {conforme.data.clientName}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {conforme.data.designation} • {conforme.data.affiliation}
                    </p>
                  </div>
                  {getStatusBadge(conforme.data.status)}
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileCheck className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Project:</span>
                      <span className="text-slate-600">{conforme.data.projectTitle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Funding:</span>
                      <span className="text-slate-600">{conforme.data.fundingAgency}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Inquiry ID:</span>
                      <span className="text-slate-600 font-mono">{conforme.data.inquiryId}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Agreed:</span>
                      <span className="text-slate-600">{formatDate(conforme.data.agreementDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">IP Address:</span>
                      <span className="text-slate-600 font-mono">{conforme.data.clientIpAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileCheck className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Doc Version:</span>
                      <span className="text-slate-600">{conforme.data.documentVersion}</span>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-slate-700 mb-2">Digital Signatures</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-slate-600">Client Signature:</p>
                      {conforme.data.clientSignature ? (
                        <div className="mt-1">
                          <p className="text-slate-700">{conforme.data.clientSignature.data}</p>
                          <p className="text-xs text-slate-500">{formatDate(conforme.data.clientSignature.timestamp)}</p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">Not signed</p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-600">Program Director:</p>
                      {conforme.data.programDirectorSignature ? (
                        <div className="mt-1">
                          <p className="text-slate-700">{conforme.data.programDirectorSignature.data}</p>
                          <p className="text-xs text-slate-500">{formatDate(conforme.data.programDirectorSignature.timestamp)}</p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">Pending signature</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="text-xs text-slate-500 font-mono">
                    ID: {conforme.id}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setSelectedConforme(conforme)}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <DownloadConformeButton conforme={conforme} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">{conformes.length}</p>
              <p className="text-sm text-slate-600">Total Records</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {conformes.filter(c => c.data.status === "completed").length}
              </p>
              <p className="text-sm text-slate-600">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {conformes.filter(c => c.data.status === "pending_director").length}
              </p>
              <p className="text-sm text-slate-600">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {conformes.filter(c => c.data.status === "signed").length}
              </p>
              <p className="text-sm text-slate-600">Signed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}