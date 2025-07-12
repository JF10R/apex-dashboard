import { NextResponse } from 'next/server';
import { ensureApiInitialized } from '@/lib/iracing-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const custId = parseInt(searchParams.get('custId') || '539129');
    
    console.log(`🔍 Testing DIRECT iRacing API wrapper for customer ID: ${custId}`);
    
    const iracingApi = await ensureApiInitialized();
    
    // Test the direct API call
    const response = await iracingApi.stats.getMemberRecentRaces({
      customerId: custId,
    });
    
    console.log('Raw API wrapper response:', JSON.stringify(response, null, 2));
    
    return NextResponse.json({
      success: true,
      custId,
      rawApiWrapperResponse: response,
      responseType: typeof response,
      isArray: Array.isArray(response),
      responseKeys: response ? Object.keys(response) : [],
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Error testing direct API wrapper:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test direct API wrapper',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
