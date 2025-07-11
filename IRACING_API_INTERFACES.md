# iRacing API TypeScript Interfaces

## Overview

This document describes the TypeScript interfaces and data transformation utilities used for iRacing API integration. The implementation is based on the official `themich4/iracing-api` package and provides comprehensive type safety with runtime validation.

## Architecture

### Core Files

- **`src/lib/iracing-types.ts`** - Official API interfaces and Zod schemas
- **`src/lib/iracing-data-transform.ts`** - Data transformation utilities
- **`src/lib/iracing-api-core.ts`** - Core API implementation with caching

### Key Features

- ✅ **Type Safety**: Complete TypeScript interfaces matching official API
- ✅ **Runtime Validation**: Zod schemas for all API responses
- ✅ **Data Transformation**: Utilities for converting API data to application format
- ✅ **Error Handling**: Comprehensive validation and graceful error recovery
- ✅ **Performance**: Intelligent caching and efficient data processing

## Usage Examples

### Race Result Processing

```typescript
import { transformIracingRaceResult, validateIracingRaceResult } from '@/lib/iracing-data-transform'

// Fetch and validate race result
const apiResponse = await iracingApi.results.getResult({ subsessionId: 12345 })

if (validateIracingRaceResult(apiResponse)) {
  // Transform to application format with lap data
  const raceData = transformIracingRaceResult(apiResponse, 12345, lapDataMap)
  // Use raceData as RecentRace interface
}
```

### Lap Time Formatting

```typescript
import { formatLapTimeFrom10000ths, lapTimeToSeconds } from '@/lib/iracing-data-transform'

// Convert from iRacing's 10,000ths second format
const displayTime = formatLapTimeFrom10000ths(651234) // "1:05.123"

// Convert for calculations
const seconds = lapTimeToSeconds("1:05.123") // 65.123
```

### Data Validation

```typescript
import { GetResultResponseSchema } from '@/lib/iracing-types'

try {
  const validatedData = GetResultResponseSchema.parse(apiResponse)
  // Data is guaranteed to match interface
} catch (error) {
  // Handle validation errors
}
```

## Key Interfaces

### Race Data
```typescript
interface RecentRace {
  id: string
  trackName: string
  date: string
  participants: RaceParticipant[]
  strengthOfField: number
  avgRaceIncidents: number
  // ... complete race information
}
```

### Participant Data
```typescript
interface RaceParticipant {
  name: string
  custId: number
  startPosition: number
  finishPosition: number
  incidents: number
  fastestLap: string
  irating: number
  laps: Lap[]
  // ... complete participant data
}
```

### Lap Data
```typescript
interface Lap {
  lapNumber: number
  time: string          // Formatted as "M:SS.mmm"
  invalid: boolean      // Based on incidents/track limits
}
```

## Data Flow

1. **API Call** → Raw iRacing API response
2. **Validation** → Zod schema validation
3. **Transformation** → Convert to application interfaces
4. **Caching** → Store processed data for performance
5. **UI Rendering** → Type-safe component data

## Error Handling

The system includes comprehensive error handling:

- **API Errors**: Network, authentication, rate limiting
- **Data Validation**: Malformed responses, missing fields
- **Transformation Errors**: Invalid data formats, calculation failures
- **User Feedback**: Clear error messages and recovery options

## Performance Optimizations

- **Caching Strategy**: Multi-level caching for race results and driver data
- **Lazy Loading**: Load lap data only when needed
- **Data Aggregation**: Efficient processing of large datasets
- **Background Updates**: Non-blocking data refresh

## Development Notes

### Adding New Interfaces

1. Define Zod schema in `iracing-types.ts`
2. Create transformation utility in `iracing-data-transform.ts`
3. Add validation and error handling
4. Update API implementation in `iracing-api-core.ts`

### Testing Data Transformations

```typescript
// Validate transformation with real API data
const result = transformIracingRaceResult(mockApiResponse, 12345)
expect(result).toMatchSchema(RecentRaceSchema)
```

This architecture ensures type safety, data integrity, and optimal performance throughout the application.
import { ResultSchema } from '@/lib/iracing-types'

// Validate participant data
try {
  const participant = ResultSchema.parse(rawParticipantData)
  // participant is now fully typed and validated
} catch (error) {
  console.error('Invalid participant data:', error.errors)
}
```

## Benefits

1. **Type Safety**: Full TypeScript support with proper typing from the official API
2. **Runtime Validation**: Zod schemas catch data inconsistencies at runtime
3. **Better Error Handling**: Clear validation errors when API responses change
4. **Future-Proof**: Easy to update when iRacing API changes
5. **Backward Compatibility**: Existing code continues to work during migration

## Migration Guide

### Step 1: Update Imports
```typescript
// Old
import { RaceParticipant } from '@/lib/mock-data'

// New
import { RaceParticipant } from '@/lib/iracing-types'
```

### Step 2: Add Validation
```typescript
// Add validation to API responses
const validatedData = GetResultResponseSchema.parse(apiResponse)
```

### Step 3: Use Transformation Utilities
```typescript
// Transform API data consistently
const raceData = transformIracingRaceResult(apiResponse, subsessionId)
```

## Error Handling

The new interfaces provide better error handling:

```typescript
import { validateIracingRaceResult } from '@/lib/iracing-data-transform'

if (!validateIracingRaceResult(apiResponse)) {
  throw new Error('Invalid iRacing API response structure')
}

// Response is now guaranteed to match expected structure
const raceSession = apiResponse.sessionResults.find(s => s.simsessionName.includes('RACE'))
```

## Future Enhancements

1. **Lap Data Integration**: Add support for detailed lap-by-lap data
2. **Driver Comparison**: Enhanced interfaces for comparing multiple drivers
3. **Series Analytics**: Interfaces for season and series-level statistics
4. **Real-time Data**: Support for live timing and scoring data

## Contributing

When adding new iRacing API endpoints:

1. Add the corresponding Zod schema to `iracing-types.ts`
2. Create transformation utilities in `iracing-data-transform.ts`
3. Add TypeScript types derived from the schema
4. Update this documentation with usage examples
