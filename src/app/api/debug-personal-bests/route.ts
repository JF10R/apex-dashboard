import { NextRequest, NextResponse } from 'next/server'
import { getDriverPageData } from '@/app/data-actions'
import { transformRecentRacesToPersonalBests } from '@/lib/personal-bests'

/**
 * Debug endpoint for Personal Bests data pipeline
 * Provides comprehensive visibility into data transformation process
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const custIdParam = searchParams.get('custId')
  
  if (!custIdParam) {
    return NextResponse.json({ error: 'custId parameter required' }, { status: 400 })
  }
  
  const custId = parseInt(custIdParam, 10)
  if (isNaN(custId)) {
    return NextResponse.json({ error: 'Invalid custId parameter' }, { status: 400 })
  }

  try {
    console.log('🔍 DEBUG: Fetching driver data for custId:', custId)
    
    // Step 1: Get raw driver data
    const { data: driver, error: driverError } = await getDriverPageData(custId)
    
    if (driverError) {
      return NextResponse.json({
        step: 'driver-data-fetch',
        success: false,
        error: driverError,
        custId
      }, { status: 500 })
    }

    if (!driver) {
      return NextResponse.json({
        step: 'driver-data-fetch',
        success: false,
        error: 'Driver not found',
        custId
      }, { status: 404 })
    }

    console.log('🔍 DEBUG: Driver data received:', {
      name: driver.name,
      recentRacesCount: driver.recentRaces?.length || 0,
      hasRecentRaces: !!driver.recentRaces,
      recentRacesType: typeof driver.recentRaces
    })

    // Ensure recentRaces exists
    const recentRaces = driver.recentRaces || [];

    // Step 2: Analyze raw recent races data
    const racesAnalysis = {
      totalRaces: recentRaces.length,
      sampleRaces: recentRaces.slice(0, 3).map(race => ({
        id: race.id,
        trackName: race.trackName,
        category: race.category,
        categoryType: typeof race.category,
        seriesName: race.seriesName,
        car: race.car,
        fastestLap: race.fastestLap,
        participants: race.participants?.length || 0,
        hasValidParticipants: race.participants?.some(p => p.fastestLap && p.fastestLap !== 'N/A') || false
      })),
      categoryDistribution: recentRaces.reduce((acc, race) => {
        const category = race.category || 'undefined'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      seriesDistribution: recentRaces.reduce((acc, race) => {
        const series = race.seriesName || 'undefined'
        acc[series] = (acc[series] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      lapTimeDistribution: {
        withFastestLap: recentRaces.filter(r => r.fastestLap && r.fastestLap !== 'N/A').length,
        withParticipants: recentRaces.filter(r => r.participants && r.participants.length > 0).length,
        withValidParticipantLaps: recentRaces.filter(r => 
          r.participants?.some(p => p.fastestLap && p.fastestLap !== 'N/A')
        ).length
      }
    }

    console.log('🔍 DEBUG: Races analysis:', racesAnalysis)

    // Step 3: Test transformation with detailed logging
    console.log('🔍 DEBUG: Starting transformation...')
    
    let transformResult;
    try {
      transformResult = transformRecentRacesToPersonalBests(
        custId,
        driver.name,
        recentRaces
      );
    } catch (transformError) {
      return NextResponse.json({
        step: 'transformation-error',
        success: false,
        error: transformError instanceof Error ? transformError.message : String(transformError),
        stack: transformError instanceof Error ? transformError.stack : undefined,
        custId,
        rawDataSummary: {
          name: driver.name,
          recentRacesCount: recentRaces.length,
          hasRecentRaces: !!driver.recentRaces,
          recentRacesType: typeof driver.recentRaces
        }
      }, { status: 500 });
    }

    console.log('🔍 DEBUG: Transformation result:', {
      totalRaces: transformResult.personalBests.totalRaces,
      totalSeries: transformResult.personalBests.totalSeries,
      seriesCount: Object.keys(transformResult.personalBests.seriesBests).length,
      seriesNames: Object.keys(transformResult.personalBests.seriesBests),
      ignoredRaces: transformResult.context.ignoredRaces.length,
      errors: transformResult.errors.length,
      warnings: transformResult.context.warnings.length
    })

    // Step 4: Return comprehensive diagnostic data
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      custId,
      driverName: driver.name,
      
      // Raw data analysis
      rawData: {
        driver: {
          name: driver.name,
          currentIRating: driver.currentIRating,
          recentRacesCount: recentRaces.length
        },
        racesAnalysis
      },
      
      // Transformation results
      transformation: {
        input: {
          racesProvided: recentRaces.length,
          firstThreeRaces: recentRaces.slice(0, 3)
        },
        output: {
          personalBests: transformResult.personalBests,
          context: transformResult.context,
          errors: transformResult.errors,
          warnings: transformResult.context.warnings
        },
        metrics: {
          racesProcessed: transformResult.personalBests.totalRaces,
          racesIgnored: transformResult.context.ignoredRaces.length,
          seriesGenerated: Object.keys(transformResult.personalBests.seriesBests).length,
          trackLayoutsGenerated: Object.values(transformResult.personalBests.seriesBests)
            .reduce((acc, series) => acc + Object.keys(series.trackLayoutBests).length, 0),
          carBestsGenerated: Object.values(transformResult.personalBests.seriesBests)
            .reduce((acc, series) => 
              acc + Object.values(series.trackLayoutBests)
                .reduce((acc2, layout) => acc2 + Object.keys(layout.carBests).length, 0), 0)
        }
      },
      
      // Detailed failure analysis
      failures: {
        ignoredRaces: transformResult.context.ignoredRaces,
        errors: transformResult.errors,
        warnings: transformResult.context.warnings,
        potentialCauses: {
          noValidLapTimes: racesAnalysis.lapTimeDistribution.withFastestLap === 0,
          noParticipants: racesAnalysis.lapTimeDistribution.withParticipants === 0,
          categoryIssues: Object.keys(racesAnalysis.categoryDistribution).includes('undefined'),
          emptyTrackNames: recentRaces.some(r => !r.trackName || r.trackName.trim() === '')
        }
      }
    })

  } catch (error) {
    console.error('🔍 DEBUG: Unexpected error:', error)
    return NextResponse.json({
      step: 'unexpected-error',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      custId
    }, { status: 500 })
  }
}