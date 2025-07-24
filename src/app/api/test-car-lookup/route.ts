import { NextRequest, NextResponse } from 'next/server'
import { getCarName } from '@/lib/iracing-api-core'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const carIdParam = searchParams.get('carId')
    
    if (!carIdParam) {
      return NextResponse.json({ error: 'Please provide carId parameter' }, { status: 400 })
    }
    
    const carId = parseInt(carIdParam, 10)
    if (isNaN(carId)) {
      return NextResponse.json({ error: 'carId must be a valid number' }, { status: 400 })
    }
    
    console.log(`🔍 Testing car lookup for carId: ${carId}`)
    
    const startTime = Date.now()
    const carName = await getCarName(carId)
    const lookupTime = Date.now() - startTime
    
    return NextResponse.json({
      carId,
      carName,
      lookupTimeMs: lookupTime,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Car lookup test error:', error)
    return NextResponse.json({
      error: 'Car lookup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
