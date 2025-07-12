import { NextRequest, NextResponse } from 'next/server'
import { getAllCars } from '@/lib/iracing-api-modular'

export async function GET(request: NextRequest) {
  try {
    const cars = await getAllCars()
    
    // Transform to include car-to-category mapping using the actual iRacing structure
    const carsWithCategories = cars
      .filter(car => car && car.carId && car.carName) // Filter out invalid cars
      .map(car => ({
        car_id: car.carId,
        car_name: car.carName,
        category: mapCarToCategory(car)
      }))
    
    return NextResponse.json(carsWithCategories)
  } catch (error) {
    console.error('Error fetching cars:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cars data', details: String(error) },
      { status: 500 }
    )
  }
}

// Helper function to map car to category using iRacing's categories and car types
function mapCarToCategory(car: any): string {
  // First, try to use the categories array from iRacing
  if (car.categories && car.categories.length > 0) {
    const category = car.categories[0]
    if (category.categoryName) {
      // Map iRacing category names to our category system
      const categoryName = category.categoryName.toLowerCase()
      if (categoryName.includes('formula')) return 'Formula Car'
      if (categoryName.includes('oval') && categoryName.includes('dirt')) return 'Dirt Oval'
      if (categoryName.includes('oval')) return 'Oval'
      if (categoryName.includes('prototype')) return 'Prototype'
      if (categoryName.includes('sports') || categoryName.includes('road')) return 'Sports Car'
    }
  }
  
  // Fallback to car types if categories don't work
  if (car.carTypes && car.carTypes.length > 0) {
    const carType = car.carTypes[0]
    if (carType.carType) {
      const typeName = carType.carType.toLowerCase()
      if (typeName.includes('formula')) return 'Formula Car'
      if (typeName.includes('oval') && typeName.includes('dirt')) return 'Dirt Oval'
      if (typeName.includes('oval')) return 'Oval'
      if (typeName.includes('prototype')) return 'Prototype'
    }
  }
  
  // Final fallback to car name analysis
  const carName = (car.carName || '').toLowerCase()
  if (carName.includes('formula') || carName.includes('skip barber') || carName.includes('f1') || carName.includes('f3') || carName.includes('fr2.0')) {
    return 'Formula Car'
  } else if (carName.includes('legends') || carName.includes('modified') || carName.includes('sprint') || carName.includes('late model') || carName.includes('super speedway')) {
    return 'Oval'
  } else if (carName.includes('dirt') && carName.includes('oval')) {
    return 'Dirt Oval'
  } else if (carName.includes('prototype') || carName.includes('lmp') || carName.includes('dpi') || carName.includes('radical')) {
    return 'Prototype'
  } else {
    // Default for GT3, Challenge, and most road cars
    return 'Sports Car'
  }
}
