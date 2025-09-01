'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { PersonalBestRecord } from '@/lib/personal-bests-types'

interface PersonalBestsDetailModalProps {
  record: PersonalBestRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PersonalBestsDetailModal({ record, open, onOpenChange }: PersonalBestsDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {record && (
          <>
            <DialogHeader>
              <DialogTitle>{record.trackName}</DialogTitle>
              <DialogDescription>{record.carName}</DialogDescription>
            </DialogHeader>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Fastest Lap</span>
                <span className='font-medium'>{record.fastestLap}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Series</span>
                <span className='font-medium'>{record.seriesName}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Strength of Field</span>
                <span className='font-medium'>{record.strengthOfField}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Finish Position</span>
                <span className='font-medium'>{record.finishPosition}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Race Date</span>
                <span className='font-medium'>{new Date(record.raceDate).toLocaleDateString()}</span>
              </div>
              {record.iratingAnalysis && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>iR Est.</span>
                  <span className='font-medium'>
                    {record.iratingAnalysis.iratingEquivalency.estimatedIRating}
                  </span>
                </div>
              )}
              {record.weatherConditions?.temperature && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Track Temp</span>
                  <span className='font-medium'>{record.weatherConditions.temperature}°C</span>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
