import { GET } from '@/app/api/driver/[custId]/route'
import { getDriverPageData } from '@/app/data-actions'
import { NextRequest } from 'next/server'

// Mock the data actions
jest.mock('@/app/data-actions', () => ({
  getDriverPageData: jest.fn()
}))

const mockGetDriverPageData = getDriverPageData as jest.MockedFunction<typeof getDriverPageData>

describe('/api/driver/[custId]', () => {
  const jeffNoelData = {
    id: 539129,
    name: 'Jeff Noel',
    currentIRating: 2150,
    currentSafetyRating: 'A 3.42',
    avgRacePace: '1:42.123',
    iratingHistories: {
      'Sports Car': [
        { month: 'Jan 2023', value: 2000 },
        { month: 'Feb 2023', value: 2150 }
      ]
    },
    safetyRatingHistory: [
      { month: 'Jan', value: 3.2 },
      { month: 'Feb', value: 3.42 }
    ],
    racePaceHistory: [
      { month: 'Jan', value: 102.5 },
      { month: 'Feb', value: 102.123 }
    ],
    recentRaces: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('successfully retrieves Jeff Noel driver data', async () => {
    mockGetDriverPageData.mockResolvedValue({
      data: jeffNoelData,
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/driver/539129')
    const response = await GET(request, { params: Promise.resolve({ custId: '539129' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.driver).toEqual(jeffNoelData)
    expect(data.custId).toBe(539129)
    expect(data.timestamp).toBeDefined()
    expect(mockGetDriverPageData).toHaveBeenCalledWith(539129, false)
  })

  test('returns error for invalid customer ID', async () => {
    const request = new NextRequest('http://localhost:3000/api/driver/invalid')
    const response = await GET(request, { params: Promise.resolve({ custId: 'invalid' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid customer ID')
    expect(mockGetDriverPageData).not.toHaveBeenCalled()
  })

  test('handles driver not found error', async () => {
    mockGetDriverPageData.mockResolvedValue({
      data: null,
      error: 'Driver not found'
    })

    const request = new NextRequest('http://localhost:3000/api/driver/999999')
    const response = await GET(request, { params: Promise.resolve({ custId: '999999' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Driver not found')
    expect(mockGetDriverPageData).toHaveBeenCalledWith(999999, false)
  })

  test('handles unexpected errors gracefully', async () => {
    mockGetDriverPageData.mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost:3000/api/driver/539129')
    const response = await GET(request, { params: Promise.resolve({ custId: '539129' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
    expect(mockGetDriverPageData).toHaveBeenCalledWith(539129, false)
  })

  test('handles zero customer ID', async () => {
    mockGetDriverPageData.mockResolvedValue({
      data: { ...jeffNoelData, id: 0 },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/driver/0')
    const response = await GET(request, { params: Promise.resolve({ custId: '0' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetDriverPageData).toHaveBeenCalledWith(0, false)
  })

  test('handles negative customer ID', async () => {
    mockGetDriverPageData.mockResolvedValue({
      data: { ...jeffNoelData, id: -1 },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/driver/-1')
    const response = await GET(request, { params: Promise.resolve({ custId: '-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetDriverPageData).toHaveBeenCalledWith(-1, false)
  })

  test('handles large customer ID numbers', async () => {
    const largeCustId = '9999999999'
    mockGetDriverPageData.mockResolvedValue({
      data: { ...jeffNoelData, id: 9999999999 },
      error: null
    })

    const request = new NextRequest(`http://localhost:3000/api/driver/${largeCustId}`)
    const response = await GET(request, { params: Promise.resolve({ custId: largeCustId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.custId).toBe(9999999999)
    expect(mockGetDriverPageData).toHaveBeenCalledWith(9999999999, false)
  })
})
