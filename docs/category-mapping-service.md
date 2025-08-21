# Category Mapping Service

The CategoryMappingService provides unified category mapping functionality using iRacing's official constants API. It replaces hardcoded category mappings with API-driven lookups and implements proper caching for performance.

## Overview

Previously, the application used hardcoded category mappings in multiple files:
- `iracing-api-core.ts` - Fallback mappings and fuzzy matching
- `data-actions.ts` - Car to category mapping logic
- `/api/cars/route.ts` - Duplicate mapping logic

The CategoryMappingService consolidates all category mapping logic into a single, cache-enabled service that uses iRacing's official API data.

## Features

- **API-Driven**: Uses iRacing's official constants API for categories and cars
- **Intelligent Caching**: 24-hour cache duration with automatic refresh
- **Fallback Support**: Graceful degradation when API is unavailable
- **Unified Interface**: Single service for all category mapping needs
- **Performance Optimized**: Cached lookups with sub-millisecond response times
- **Type Safe**: Full TypeScript support with proper typing

## Usage

### Basic Category Lookups

```typescript
import { CategoryMappingService } from '@/lib/category-mapping-service';

// Get category ID by name
const categoryId = await CategoryMappingService.getCategoryId('Road');
console.log(categoryId); // e.g., 2

// Get category name by ID
const categoryName = await CategoryMappingService.getCategoryName(2);
console.log(categoryName); // e.g., "Road"

// Enhanced lookup with fallback
const enhancedId = await CategoryMappingService.getCategoryIdWithFallback('Sports Car');
console.log(enhancedId); // API result or fallback ID
```

### Car Category Mapping

```typescript
// Get category for a specific car
const carCategory = await CategoryMappingService.getCarCategory(1);
console.log(carCategory); // e.g., "Sports Car"

// Map API category to our RaceCategory type
const raceCategory = await CategoryMappingService.mapApiCategoryToRaceCategory('Road');
console.log(raceCategory); // e.g., "Sports Car"
```

### Cache Management

```typescript
// Pre-warm the cache (recommended at application startup)
await CategoryMappingService.preWarmCache();

// Get cache statistics
const stats = CategoryMappingService.getCacheStats();
console.log(stats);
/*
{
  isValid: true,
  expiresAt: "2025-08-22T10:00:00.000Z",
  categoriesCount: 5,
  carsCount: 150,
  apiCategoriesCount: 5,
  timeUntilExpiry: "1380 minutes"
}
*/

// Clear cache (useful for testing)
CategoryMappingService.clearCache();
```

### Available Categories

```typescript
// Get all available API categories
const categories = await CategoryMappingService.getAvailableCategories();
console.log(categories); // e.g., ["Road", "Oval", "Dirt", "Formula", "Sports Car"]
```

## API Reference

### Methods

#### `getCategoryId(categoryName: string): Promise<number | null>`
Get category ID by category name. Supports both API names and RaceCategory types.

#### `getCategoryName(categoryId: number): Promise<string | null>`
Get category name by category ID.

#### `getCarCategory(carId: number): Promise<RaceCategory | null>`
Get RaceCategory type for a car ID.

#### `mapApiCategoryToRaceCategory(apiCategoryName: string): Promise<RaceCategory | null>`
Map API category name to our RaceCategory type.

#### `getAvailableCategories(): Promise<string[]>`
Get all available API categories.

#### `getCategoryIdWithFallback(categoryName: string): Promise<number | null>`
Enhanced category lookup with automatic fallback to hardcoded mappings when API fails.

#### `getFallbackCategoryId(categoryName: string): number | null`
Get fallback category ID for RaceCategory types (doesn't require async).

#### `getCacheStats(): object`
Get cache statistics for monitoring.

#### `clearCache(): void`
Clear the cache.

#### `preWarmCache(): Promise<void>`
Pre-warm the cache by loading all data.

## Category Mappings

### RaceCategory Types
The service works with these RaceCategory types:
- `'Sports Car'` - GT3, Challenge, and most road cars
- `'Formula Car'` - Open wheel cars, Formula series
- `'Prototype'` - LMP, DPi, and prototype cars
- `'Oval'` - Stock cars, legends, modified
- `'Dirt Oval'` - Dirt oval racing cars

### API Category Mapping
The service intelligently maps iRacing's API categories to our RaceCategory types:
- API "Road" → "Sports Car"
- API "Oval" → "Oval"  
- API "Dirt" → "Dirt Oval"
- API categories with "Formula" → "Formula Car"
- API categories with "Prototype" → "Prototype"

### Fallback Mappings
When API is unavailable, these fallback mappings are used:
- `'Sports Car'` → ID 2 (Road)
- `'Formula Car'` → ID 2 (Road)
- `'Prototype'` → ID 2 (Road)
- `'Oval'` → ID 1 (Oval)
- `'Dirt Oval'` → ID 3 (Dirt Oval)

## Cache Behavior

- **Duration**: 24 hours (categories don't change often)
- **Auto-refresh**: Cache automatically rebuilds when expired
- **Thread-safe**: Prevents multiple simultaneous loads
- **Memory efficient**: Only stores essential mapping data

## Error Handling

The service provides graceful error handling:
- API failures fall back to hardcoded mappings
- Invalid inputs return `null`
- Cache failures don't break the application
- Detailed logging for debugging

## Performance

- **Cached lookups**: < 1ms response time
- **API rebuilds**: ~2-5 seconds (happens once per 24 hours)
- **Memory usage**: Minimal (only essential mappings cached)
- **Network calls**: Minimized through intelligent caching

## Testing

### Test Scripts

```bash
# Run basic functionality tests
npm run test:category-mapping

# Run backwards compatibility tests
npm run test:backwards-compatibility

# Run diagnostics
npm run category:diagnostics
```

### Utility Scripts

```bash
# Pre-warm cache
npm run category:prewarm

# Show cache info
npm run category:info

# Test mappings
npm run category:test

# Clear cache
npm run category:clear
```

## Migration from Hardcoded Mappings

The service maintains backwards compatibility while providing enhanced functionality:

### Before (Hardcoded)
```typescript
const fallbackMapping: Record<RaceCategory, number> = {
  'Sports Car': 2,
  'Formula Car': 2,
  'Prototype': 2,
  'Oval': 1,
  'Dirt Oval': 3,
};
const categoryId = fallbackMapping[category];
```

### After (API-Driven)
```typescript
const categoryId = await CategoryMappingService.getCategoryIdWithFallback(category);
```

The new approach:
- Uses real API data when available
- Falls back to the same hardcoded values when needed
- Provides better accuracy through dynamic car-to-category mapping
- Enables future expansion as iRacing adds new categories

## Integration Points

The CategoryMappingService is integrated into:
- `iracing-api-core.ts` - Chart data category lookups
- `data-actions.ts` - Car info and category mapping
- `/api/cars/route.ts` - Car listing with categories

All existing functionality is preserved while gaining the benefits of API-driven data.

## Best Practices

1. **Pre-warm at startup**: Call `preWarmCache()` during application initialization
2. **Monitor cache**: Use `getCacheStats()` for health monitoring
3. **Handle errors gracefully**: The service provides fallbacks, but check for null returns
4. **Use enhanced methods**: Prefer `getCategoryIdWithFallback()` over basic `getCategoryId()`
5. **Test thoroughly**: Use the provided test scripts to verify functionality

## Troubleshooting

### Common Issues

**Cache not loading**: Check iRacing API credentials and network connectivity

**Unexpected category mappings**: Verify API data with `getAvailableCategories()`

**Performance issues**: Check cache stats and consider pre-warming

**Backwards compatibility**: Use test scripts to verify existing functionality

### Debugging

```typescript
// Check cache status
const stats = CategoryMappingService.getCacheStats();
console.log('Cache valid:', stats.isValid);

// See available categories
const categories = await CategoryMappingService.getAvailableCategories();
console.log('API categories:', categories);

// Test specific mapping
const id = await CategoryMappingService.getCategoryIdWithFallback('Sports Car');
console.log('Sports Car ID:', id);
```