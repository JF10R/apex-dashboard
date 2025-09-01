'use client'

import { useState } from 'react'
import type { SeriesPersonalBests, PersonalBestRecord } from '@/lib/personal-bests-types'
import { PersonalBestCard } from './personal-best-card'
import { PersonalBestsDetailModal } from './personal-bests-detail-modal'

interface PersonalBestsSeriesSectionProps {
  series: SeriesPersonalBests
}

export function PersonalBestsSeriesSection({ series }: PersonalBestsSeriesSectionProps) {
  const [selected, setSelected] = useState<PersonalBestRecord | null>(null)

  const records = Object.values(series.trackLayoutBests).flatMap((layout) =>
    Object.values(layout.carBests)
  )

  return (
    <section className='space-y-4'>
      <h2 className='text-xl font-semibold'>{series.seriesName}</h2>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {records.map((record) => (
          <PersonalBestCard
            key={record.id}
            record={record}
            onSelect={(r) => setSelected(r)}
          />
        ))}
      </div>
      <PersonalBestsDetailModal
        record={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </section>
  )
}
