import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Firestore backup...');
    
    // Get directory from request body if provided
    const body = await request.json().catch(() => ({}));
    const customDirectory = body.directory;
    
    // Path to backup script
    const scriptPath = path.join(process.cwd(), 'scripts', 'firestore-backup.js');
    
    // Execute backup script with optional directory parameter
    let command = `node "${scriptPath}"`;
    if (customDirectory) {
      // Pass directory as environment variable or command line argument
      command = `node "${scriptPath}" "${customDirectory}"`;
    }
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Backup stderr:', stderr);
    }
    
    console.log('✅ Backup completed:', stdout);
    
    return NextResponse.json({
      success: true,
      message: 'Backup completed successfully',
      output: stdout,
      directory: customDirectory || 'default'
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