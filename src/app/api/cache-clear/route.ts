import { NextResponse } from 'next/server';
import { clearAllCaches } from '@/lib/iracing-cache';

export async function POST() {
  try {
    clearAllCaches();
    
    return NextResponse.json({
      success: true,
      message: 'All caches cleared successfully',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Error clearing caches:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear caches',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
