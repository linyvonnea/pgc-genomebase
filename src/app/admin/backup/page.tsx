"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Download, 
  Upload, 
  Database, 
  Calendar, 
  FileText, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  HardDrive,
  RefreshCw,
  FolderOpen,
  Cloud,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { PermissionGuard } from "@/components/PermissionGuard";
import useAuth from "@/hooks/useAuth";

interface BackupItem {
  id: string;
  name: string;
  timestamp: string;
  totalDocuments: number;
  size: string;
  collections: string[];
  duration?: number;
}

interface DatabaseStats {
  totalCollections: number;
  totalDocuments: number;
  estimatedSize: string;
}

export default function BackupPage() {
  return (
    <PermissionGuard module="databaseBackup" action="view">
      <BackupPageContent />
    </PermissionGuard>
  );
}

function BackupPageContent() {
  const { adminInfo } = useAuth();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [googleDriveStatus, setGoogleDriveStatus] = useState<any>(null);
  const { toast } = useToast();

  // Load existing backups and database stats on component mount
  useEffect(() => {
    loadBackups();
    loadDatabaseStats();
    loadGoogleDriveStatus();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/admin/restore');
      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
      toast({
        title: "Error",
        description: "Failed to load existing backups",
        variant: "destructive",
      });
    }
  };

  const loadDatabaseStats = async () => {
    try {
      const response = await fetch('/api/admin/backup/stats');
      if (response.ok) {
        const data = await response.json();
        setDbStats(data);
      }
    } catch (error) {
      console.error('Failed to load database stats:', error);
    }
  };

  const loadGoogleDriveStatus = async () => {
    try {
      const response = await fetch('/api/admin/backup/scheduled');
      if (response.ok) {
        const data = await response.json();
        setGoogleDriveStatus(data);
      }
    } catch (error) {
      console.error('Failed to load Google Drive status:', error);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(0);

    try {
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setBackupProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Backup failed');
      }

      const result = await response.json();
      setBackupProgress(100);

      toast({
        title: "Success",
        description: `Database backup created successfully in the server backups folder`,
        variant: "default",
      });

      // Reload backups list
      setTimeout(() => {
        loadBackups();
        setBackupProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Backup failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create backup",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    setRestoringBackupId(backupId);
    setIsRestoring(true);
    setRestoreProgress(0);

    try {
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setRestoreProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 800);

      const response = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backupId }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Restore failed');
      }

      setRestoreProgress(100);

      toast({
        title: "Success",
        description: "Database restored successfully",
        variant: "default",
      });

      // Reload database stats
      setTimeout(() => {
        loadDatabaseStats();
        setRestoreProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Restore failed:', error);
      toast({
        title: "Error",
        description: "Failed to restore backup",
        variant: "destructive",
      });
    } finally {
      setRestoringBackupId(null);
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      const response = await fetch(`/api/admin/restore?backupId=${backupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      toast({
        title: "Success",
        description: "Backup deleted successfully",
        variant: "default",
      });

      loadBackups();

    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: "Error",
        description: "Failed to delete backup",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 300);

      // Fetch backup data from API
      console.log('📡 Fetching backup data from server...');
      const response = await fetch('/api/admin/backup/download', {
        method: 'POST',
      });

      clearInterval(progressInterval);

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Backup failed:', errorData);
        const errorMessage = errorData.details || errorData.error || 'Backup download failed';
        
        // Show setup instructions if credentials are missing
        if (errorMessage.includes('credentials') || errorMessage.includes('not configured')) {
          throw new Error('Firebase Admin not configured. Please add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to your environment variables. See FIREBASE_ADMIN_SETUP.md for instructions.');
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Backup data received:', result.backup?.metadata);
      setDownloadProgress(100);

      // Convert backup data to JSON string
      console.log('📦 Creating backup file...');
      const backupJson = JSON.stringify(result.backup, null, 2);
      const blob = new Blob([backupJson], { type: 'application/json' });
      const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      console.log(`📦 Backup size: ${fileSizeMB} MB`);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `firestore-backup-${timestamp}.json`;

      // Try to use File System Access API for directory selection (Chrome/Edge)
      console.log('💾 Opening save dialog...');
      if ('showSaveFilePicker' in window) {
        console.log('✅ Browser supports File System Access API');
        try {
          // @ts-ignore
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] }
            }]
          });

          console.log('💾 User selected location, writing file...');
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          console.log('✅ File saved successfully!');

          toast({
            title: "Success",
            description: `Backup saved successfully (${result.backup.metadata.totalDocuments} documents, ${fileSizeMB} MB)`,
            variant: "default",
          });
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            console.log('⚠️ User cancelled save dialog');
            throw new Error('Save cancelled');
          }
          console.error('❌ File picker error:', error);
          // Fallback to regular download
          console.log('⚠️ Falling back to standard download');
          downloadFile(blob, filename);
          
          toast({
            title: "Success",
            description: `Backup downloaded successfully (${result.backup.metadata.totalDocuments} documents, ${fileSizeMB} MB)`,
            variant: "default",
          });
        }
      } else {
        // Fallback for browsers that don't support File System Access API
        console.log('⚠️ Browser does not support File System Access API, using standard download');
        downloadFile(blob, filename);
        
        toast({
          title: "Success",
          description: `Backup downloaded to Downloads folder (${result.backup.metadata.totalDocuments} documents, ${fileSizeMB} MB)`,
          variant: "default",
        });
      }

      // Reset progress after a delay
      setTimeout(() => {
        setDownloadProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Backup download failed:', error);
      setDownloadProgress(0);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download backup",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper function to trigger file download
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Database Backup</h1>
          <p className="text-slate-600 mt-1">
            Create and manage Firestore database backups
          </p>
        </div>
        
        <Button 
          onClick={loadBackups}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Database Stats Card */}
      {dbStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#166FB5]" />
              Database Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{dbStats.totalCollections}</div>
                <div className="text-sm text-slate-600">Collections</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{dbStats.totalDocuments}</div>
                <div className="text-sm text-slate-600">Documents</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{dbStats.estimatedSize}</div>
                <div className="text-sm text-slate-600">Est. Size</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-[#166FB5]" />
            Download Backup to Your Computer
          </CardTitle>
          <CardDescription>
            Choose where to save your database backup on your local computer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Setup Instructions Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-900 mb-1">Setup Required</h4>
                  <p className="text-sm text-amber-800 mb-2">
                    To use this feature, you need to configure Firebase Admin SDK credentials first.
                  </p>
                  <div className="text-sm text-amber-800 bg-amber-100 rounded p-2 font-mono">
                    <strong>Quick Setup:</strong><br />
                    1. Get credentials from Firebase Console<br />
                    2. Add to .env.local file:<br />
                    &nbsp;&nbsp;• FIREBASE_CLIENT_EMAIL<br />
                    &nbsp;&nbsp;• FIREBASE_PRIVATE_KEY<br />
                    3. Restart server: npm run dev
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    📖 See <strong>QUICK_START.md</strong> or <strong>FIREBASE_ADMIN_SETUP.md</strong> for detailed instructions.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <FolderOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Save Anywhere on Your Computer</h4>
                  <p className="text-sm text-blue-800">
                    Click the button below to download the database backup. You'll be able to choose where 
                    to save it on your computer (works on any browser and device).
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    <strong>Chrome/Edge users:</strong> You can select the exact folder where to save the backup.<br />
                    <strong>Other browsers:</strong> The backup will download to your default Downloads folder.
                  </p>
                </div>
              </div>
            </div>
            
            {isDownloading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Preparing backup for download...</span>
                  <span>{Math.round(downloadProgress)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div 
                    className="bg-[#166FB5] h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <Button 
              onClick={handleDownloadBackup}
              disabled={isDownloading}
              className="gap-2 bg-[#166FB5] hover:bg-[#145ca3]"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Preparing Download...' : 'Download Backup to My Computer'}
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 text-sm">Works on Any Device</p>
                  <p className="text-xs text-green-800">Desktop, laptop, or mobile</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <HardDrive className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-900 text-sm">Save Anywhere</p>
                  <p className="text-xs text-purple-800">Choose your preferred location</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#166FB5]" />
            Server Backup (Advanced)
          </CardTitle>
          <CardDescription>
            Create backup on the server for automated processes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Server-Side Backup</h4>
                  <p className="text-sm text-blue-800">
                    This creates a backup on the server (Vercel) in the project's backups folder. 
                    The backup is stored in the server filesystem and is included in the list below.
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    💡 <strong>Tip:</strong> For local backups on your computer, use the CLI command: <code className="bg-blue-100 px-2 py-0.5 rounded">npm run backup</code>
                  </p>
                </div>
              </div>
            </div>
            
            {isBackingUp && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Creating backup...</span>
                  <span>{Math.round(backupProgress)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div 
                    className="bg-[#166FB5] h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${backupProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  disabled={isBackingUp}
                  className="gap-2 bg-[#166FB5] hover:bg-[#145ca3]"
                >
                  <Download className="w-4 h-4" />
                  Create Server Backup
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Create Database Backup</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create a complete backup of your Firestore database on the server. 
                    The process may take several minutes depending on your data size.
                    The backup will be stored in the server's backups folder.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCreateBackup}>
                    Create Backup
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Local Backup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#166FB5]" />
            Local Computer Backup
          </CardTitle>
          <CardDescription>
            Create backups directly on your local computer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-slate-600">
              To create backups on your local computer with a custom directory, use the command line:
            </p>
            
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500"># Default location (project/backups folder)</span>
                  <div className="text-green-400">npm run backup</div>
                </div>
                <div className="mt-4">
                  <span className="text-slate-500"># Custom directory</span>
                  <div className="text-green-400">node scripts/firestore-backup.js "C:\YourPath\Backups"</div>
                </div>
                <div className="mt-4">
                  <span className="text-slate-500"># Mac/Linux custom directory</span>
                  <div className="text-green-400">node scripts/firestore-backup.js "/home/user/backups"</div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 mb-1">Note:</p>
                <p className="text-amber-800">
                  Local backups require Node.js and Firebase Admin SDK credentials on your computer. 
                  Ensure you have the <code className="bg-amber-100 px-1 rounded">serviceAccountKey.json</code> file 
                  in the scripts folder.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Google Drive Automatic Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#166FB5]" />
            Google Drive Automatic Backup
          </CardTitle>
          <CardDescription>
            Automatic incremental backups to Google Drive every Friday
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">Backup Schedule</p>
                  <p className="text-sm text-slate-600">Every Friday at 6:00 PM (Server Time)</p>
                </div>
              </div>
              <Badge variant={googleDriveStatus?.configured ? "default" : "secondary"}>
                {googleDriveStatus?.configured ? "Configured" : "Not Configured"}
              </Badge>
            </div>

            {/* Last Backup Info */}
            {googleDriveStatus?.lastBackup && (
              <div className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Last Backup</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Date:</span>
                    <p className="font-medium">{new Date(googleDriveStatus.lastBackup.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Documents Changed:</span>
                    <p className="font-medium">{googleDriveStatus.lastBackup.changedDocuments}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Type:</span>
                    <p className="font-medium">{googleDriveStatus.lastBackup.isIncremental ? "Incremental" : "Full"}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Collections:</span>
                    <p className="font-medium">{googleDriveStatus.lastBackup.collections?.length || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Status */}
            {!googleDriveStatus?.configured && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">Setup Required</h4>
                    <p className="text-sm text-yellow-800 mb-3">
                      To enable automatic backups to Google Drive, you need to configure the following environment variables:
                    </p>
                    <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                      <li><code className="bg-yellow-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_EMAIL</code></li>
                      <li><code className="bg-yellow-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code></li>
                      <li><code className="bg-yellow-100 px-1 rounded">GOOGLE_DRIVE_BACKUP_FOLDER_ID</code> (optional)</li>
                      <li><code className="bg-yellow-100 px-1 rounded">CRON_SECRET</code> (optional, for security)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Incremental Backups</p>
                  <p className="text-sm text-blue-800">Only backs up changed documents to save space</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Weekly Schedule</p>
                  <p className="text-sm text-green-800">Automatically runs every Friday</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <Cloud className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-900">Cloud Storage</p>
                  <p className="text-sm text-purple-800">Secure backups stored in Google Drive</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">Automated</p>
                  <p className="text-sm text-orange-800">No manual intervention required</p>
                </div>
              </div>
            </div>

            {/* Test Backup Button */}
            {googleDriveStatus?.configured && (
              <Button 
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Test Backup",
                    description: "This feature will be available in the admin panel. Check the setup guide for manual testing.",
                  });
                }}
                className="gap-2"
              >
                <Cloud className="w-4 h-4" />
                Test Backup Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Backups Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#166FB5]" />
            Existing Backups ({backups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No backups found. Create your first backup above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-[#166FB5]" />
                        <h3 className="font-medium text-slate-900">{backup.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {backup.size}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatDate(backup.timestamp)}
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {backup.totalDocuments} documents
                        </div>
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          {backup.collections.length} collections
                        </div>
                      </div>
                      
                      {backup.duration && backup.duration > 0 && (
                        <div className="mt-2 text-xs text-slate-500">
                          Backup completed in {formatDuration(backup.duration)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={isRestoring}
                            className="gap-2"
                          >
                            {restoringBackupId === backup.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Restoring...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Restore
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore Database</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will restore your database to the state of this backup. 
                              <strong className="text-red-600"> This action cannot be undone.</strong>
                              <br /><br />
                              Backup: {backup.name}<br />
                              Created: {formatDate(backup.timestamp)}<br />
                              Documents: {backup.totalDocuments}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleRestoreBackup(backup.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Restore Database
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="gap-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this backup? This action cannot be undone.
                              <br /><br />
                              <strong>{backup.name}</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteBackup(backup.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Backup
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Progress */}
      {isRestoring && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#166FB5]" />
                <span className="font-medium">Restoring Database...</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="text-slate-500">{restoreProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-[#166FB5] h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${restoreProgress}%` }}
                ></div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  Please do not close this page or navigate away during the restore process.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}