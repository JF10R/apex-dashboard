# iRacing API TypeScript Interfaces - Complete Implementation

## Overview

The iRacing API TypeScript interfaces have been completely updated to align with the official iRacing API documentation and best practices. This implementation provides comprehensive type safety, data validation using Zod schemas, and enhanced data transformation utilities based on `themich4/iracing-api`.

## Key Improvements

### 1. Official API Schema Compliance
- All interfaces now match the official iRacing API responses from `themich4/iracing-api`
- Complete Zod schema definitions for validation
- Proper handling of all data types and optional fields

### 2. Enhanced Type Safety
- Strict TypeScript interfaces with proper null handling
- Zod runtime validation for API responses
- Type guards for data validation

### 3. Comprehensive Data Transformation
- Dedicated transformation utilities in `iracing-data-transform.ts`
- Proper lap time formatting from 10,000ths of a second
- Enhanced lap data processing with validation

## Key Files

### `src/lib/iracing-types.ts`
- Contains all official iRacing API interfaces and Zod schemas
- Provides TypeScript types derived from the official API structure
- Includes both new interfaces and legacy interfaces for backward compatibility

### `src/lib/iracing-data-transform.ts`
- Utility functions for transforming iRacing API responses to our application interfaces
- Data validation using Zod schemas
- Helper functions for lap time formatting and calculations

### `src/lib/mock-data.ts`
- Re-exports types from `iracing-types.ts` for backward compatibility
- Maintains existing interface names for gradual migration

## Usage Examples

### 1. Race Result Data Validation

```typescript
import { GetResultResponseSchema, validateIracingRaceResult } from '@/lib/iracing-types'

// Validate API response
const isValidResponse = validateIracingRaceResult(apiResponse)

// Or use Zod parsing for detailed validation
try {
  const validatedData = GetResultResponseSchema.parse(apiResponse)
  // Use validatedData with full type safety
} catch (error) {
  console.error('Invalid API response structure:', error)
}
```

### 2. Data Transformation

```typescript
import { transformIracingRaceResult } from '@/lib/iracing-data-transform'

// Transform official API response to our RecentRace interface
const raceData = await iracingApi.results.getResult({ subsessionId: 12345 })
const recentRace = transformIracingRaceResult(raceData, 12345)
```

### 3. Lap Time Formatting

```typescript
import { formatLapTimeFrom10000ths, lapTimeToMs } from '@/lib/iracing-data-transform'

// Convert from iRacing's 10,000ths second format
const lapTime = formatLapTimeFrom10000ths(651234) // "1:05.123"

// Convert lap time string to milliseconds for comparison
const timeInMs = lapTimeToMs("1:05.123") // 65123
```

## Interface Migration

### Legacy Interfaces (for backward compatibility)
- `RaceParticipant`
- `RecentRace`
- `Driver`
- `SearchedDriver`

### New Official iRacing API Interfaces
- `IracingRaceParticipant` - Direct mapping to API response
- `IracingRaceData` - Full race session data
- `GetResultResponse` - Complete API response structure
- `RaceResult` - Individual participant result
- `SessionResult` - Session-level data (practice, qualifying, race)

## Data Validation

All interfaces use Zod schemas for runtime validation:

```typescript
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
