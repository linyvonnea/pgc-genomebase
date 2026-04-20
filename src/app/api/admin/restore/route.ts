import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// GET - List available backups from local `backups` folder (if present)
export async function GET(request: NextRequest) {
  try {
    const backupsDir = path.join(process.cwd(), "backups");

    if (!fs.existsSync(backupsDir)) {
      return NextResponse.json({ backups: [] });
    }

    const names = fs.readdirSync(backupsDir).filter((n) => n.startsWith("firestore-backup-"));

    const backups = names.map((name) => {
      const dir = path.join(backupsDir, name);
      const metadataPath = path.join(dir, "backup-metadata.json");

      let timestamp = "";
      let totalDocuments = 0;
      let collections: string[] = [];
      let size = "";

      try {
        if (fs.existsSync(metadataPath)) {
          const raw = fs.readFileSync(metadataPath, "utf8");
          const meta = JSON.parse(raw || "{}");
          timestamp = meta.timestamp || meta.createdAt || name.replace("firestore-backup-", "");
          totalDocuments = meta.totalDocuments || meta.total_docs || 0;
          collections = meta.collections || [];
        }
      } catch (err) {
        // ignore parsing errors
      }

      // compute directory size (bytes)
      const getDirSize = (p: string): number => {
        let total = 0;
        const files = fs.readdirSync(p, { withFileTypes: true });
        for (const f of files) {
          try {
            const fp = path.join(p, f.name);
            if (f.isDirectory()) total += getDirSize(fp);
            else total += fs.statSync(fp).size;
          } catch (e) {
            // ignore
          }
        }
        return total;
      };

      try {
        const bytes = getDirSize(dir);
        if (bytes > 1024 * 1024) size = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        else if (bytes > 1024) size = `${(bytes / 1024).toFixed(2)} KB`;
        else size = `${bytes} B`;
      } catch (e) {
        size = "-";
      }

      return {
        id: name,
        name,
        timestamp,
        totalDocuments,
        size,
        collections,
        path: dir,
      };
    });

    // sort by folder name descending (newest first)
    backups.sort((a, b) => (a.name < b.name ? 1 : -1));

    return NextResponse.json({ backups });
  } catch (error) {
    console.error("❌ Error listing backups:", error);
    return NextResponse.json({ error: "Failed to list backups" }, { status: 500 });
  }
}

// POST - Restore from backup
export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Restore functionality not available in serverless environment',
        message: 'Please use local scripts for restore operations'
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('❌ Restore failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Restore failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete backup
export async function DELETE(request: NextRequest) {
  try {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Delete functionality not available in serverless environment',
        message: 'Please use external storage management for backup deletion'
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('❌ Error deleting backup:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 }
    );
  }
}