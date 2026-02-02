import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Firestore backup...');
    
    // Path to backup script
    const scriptPath = path.join(process.cwd(), 'scripts', 'firestore-backup.js');
    
    // Execute backup script
    const { stdout, stderr } = await execAsync(`node "${scriptPath}"`);
    
    if (stderr) {
      console.error('Backup stderr:', stderr);
    }
    
    console.log('✅ Backup completed:', stdout);
    
    return NextResponse.json({
      success: true,
      message: 'Backup completed successfully',
      output: stdout
    });
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Backup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}