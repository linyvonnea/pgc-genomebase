import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

// GET - List available backups
export async function GET(request: NextRequest) {
  try {
    const backupsDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupsDir)) {
      return NextResponse.json({ backups: [] });
    }
    
    const backupFolders = fs.readdirSync(backupsDir)
      .filter(name => name.startsWith('firestore-backup-'))
      .map(name => {
        const backupPath = path.join(backupsDir, name);
        const metadataPath = path.join(backupPath, 'backup-metadata.json');
        
        let metadata = { 
          timestamp: 'Unknown', 
          totalDocuments: 0,
          collections: [],
          backupDuration: 0
        };
        
        if (fs.existsSync(metadataPath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          } catch (error) {
            console.warn(`⚠️  Could not read metadata for ${name}`);
          }
        }
        
        // Calculate folder size
        let size = 0;
        try {
          const stats = fs.statSync(backupPath);
          if (stats.isDirectory()) {
            size = getDirectorySize(backupPath);
          }
        } catch (error) {
          // Ignore size calculation errors
        }
        
        return {
          id: name,
          name,
          timestamp: metadata.timestamp,
          totalDocuments: metadata.totalDocuments,
          size: formatBytes(size),
          collections: metadata.collections,
          duration: metadata.backupDuration
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return NextResponse.json({ backups: backupFolders });
    
  } catch (error) {
    console.error('❌ Error listing backups:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}

// POST - Restore from backup
export async function POST(request: NextRequest) {
  try {
    const { backupId } = await request.json();
    
    if (!backupId) {
      return NextResponse.json(
        { error: 'Backup ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`🔄 Starting restore from backup: ${backupId}`);
    
    // Path to restore script
    const scriptPath = path.join(process.cwd(), 'scripts', 'firestore-restore.js');
    
    // Execute restore script with backup ID
    const { stdout, stderr } = await execAsync(`echo "${backupId}" | node "${scriptPath}"`);
    
    if (stderr) {
      console.error('Restore stderr:', stderr);
    }
    
    console.log('✅ Restore completed:', stdout);
    
    return NextResponse.json({
      success: true,
      message: 'Restore completed successfully',
      output: stdout
    });
    
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
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('backupId');
    
    if (!backupId) {
      return NextResponse.json(
        { error: 'Backup ID is required' },
        { status: 400 }
      );
    }
    
    const backupPath = path.join(process.cwd(), 'backups', backupId);
    
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      );
    }
    
    // Delete backup directory
    fs.rmSync(backupPath, { recursive: true, force: true });
    
    console.log(`🗑️  Deleted backup: ${backupId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting backup:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 }
    );
  }
}

// Helper functions
function getDirectorySize(dirPath: string): number {
  let totalSize = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Ignore errors for individual files
  }
  
  return totalSize;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}