import { NextRequest, NextResponse } from 'next/server'
import { getPersonalBestsData } from '@/app/data-actions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ custId: string }> }
) {
  try {
    const resolvedParams = await params
    const custId = parseInt(resolvedParams.custId, 10)
    
    if (isNaN(custId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    const result = await getPersonalBestsData(custId)
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('API Error in personal-bests:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    )
  }
}