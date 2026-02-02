import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Firestore backup via API...');
    
    // Path to backup script
    const scriptPath = path.join(process.cwd(), 'scripts', 'firestore-backup.js');
    
    console.log('📁 Script path:', scriptPath);
    
    // Execute backup script with increased timeout (5 minutes)
    const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large output
      timeout: 300000 // 5 minutes timeout
    });
    
    if (stderr) {
      console.error('⚠️  Backup stderr:', stderr);
      // Don't fail on stderr as some output goes there
    }
    
    console.log('✅ Backup completed successfully');
    console.log('📊 Output:', stdout.substring(0, 500)); // Log first 500 chars
    
    return NextResponse.json({
      success: true,
      message: 'Backup completed successfully',
      output: stdout.split('\n').slice(-5).join('\n') // Return last 5 lines
    });
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error && 'stderr' in error ? (error as any).stderr : '';
    
    console.error('Error details:', errorDetails);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Backup failed',
        details: errorMessage,
        stderr: errorDetails
      },
      { status: 500 }
    );
  }
}