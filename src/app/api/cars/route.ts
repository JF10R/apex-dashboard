import { NextRequest, NextResponse } from 'next/server'
import { getAllCars } from '@/lib/iracing-api-core'
import { CategoryMappingService } from '@/lib/category-mapping-service'

export async function GET(request: NextRequest) {
  try {
    const cars = await getAllCars()
    
    // Transform to include car-to-category mapping using the CategoryMappingService
    const carsWithCategories = await Promise.all(
      cars
        .filter(car => car && car.carId && car.carName) // Filter out invalid cars
        .map(async car => ({
          car_id: car.carId,
          car_name: car.carName,
          category: await mapCarToCategory(car)
        }))
    )
    
    return NextResponse.json(carsWithCategories)
  } catch (error) {
    console.error('Error fetching cars:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cars data', details: String(error) },
      { status: 500 }
    )
  }
}

// Helper function to map car to category using the unified CategoryMappingService
async function mapCarToCategory(car: any): Promise<string> {
  try {
    // Use the CategoryMappingService for consistent category mapping
    const category = await CategoryMappingService.getCarCategory(car.carId);
    if (category) {
      return category;
    }
    
    // If carId lookup fails, fall back to manual analysis using the service's logic
    if (car.categories && car.categories.length > 0) {
      const categoryInfo = car.categories[0];
      if (categoryInfo.categoryName) {
        const mapped = await CategoryMappingService.mapApiCategoryToRaceCategory(categoryInfo.categoryName);
        if (mapped) return mapped;
      }
    }
    
    // Final fallback to car name analysis
    const carName = (car.carName || '').toLowerCase();
    if (carName.includes('formula') || carName.includes('skip barber') || carName.includes('f1') || carName.includes('f3') || carName.includes('fr2.0')) {
      return 'Formula Car';
    } else if (carName.includes('legends') || carName.includes('modified') || carName.includes('sprint') || carName.includes('late model') || carName.includes('super speedway')) {
      return 'Oval';
    } else if (carName.includes('dirt') && carName.includes('oval')) {
      return 'Dirt Oval';
    } else if (carName.includes('prototype') || carName.includes('lmp') || carName.includes('dpi') || carName.includes('radical')) {
      return 'Prototype';
    } else {
      // Default for GT3, Challenge, and most road cars
      return 'Sports Car';
    }
  } catch (error) {
    console.error('Error mapping car to category:', error);
    return 'Sports Car'; // Safe fallback
  }
}
