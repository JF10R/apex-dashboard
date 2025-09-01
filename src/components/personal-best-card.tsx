'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { PersonalBestRecord } from '@/lib/personal-bests-types'

interface PersonalBestCardProps {
  record: PersonalBestRecord
  onSelect?: (record: PersonalBestRecord) => void
}

export function PersonalBestCard({ record, onSelect }: PersonalBestCardProps) {
  return (
    <Card className='cursor-pointer hover:bg-muted/50' onClick={() => onSelect?.(record)}>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium truncate'>
          {record.trackName}
          {record.configName ? ` (${record.configName})` : ''}
        </CardTitle>
        <CardDescription className='text-xs text-muted-foreground truncate'>
          {record.carName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{record.fastestLap}</div>
        {record.iratingAnalysis && (
          <p className='text-xs text-muted-foreground'>
            iR eq: {record.iratingAnalysis.iratingEquivalency.estimatedIRating}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
