import { render, screen, waitFor } from '@testing-library/react'
import { useParams, useRouter } from 'next/navigation'
import CustomerPage from '@/app/[custId]/page'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn()
}))

// Mock the hooks
jest.mock('@/hooks/use-tracked-drivers', () => ({
  useTrackedDrivers: () => ({
    addTrackedDriver: jest.fn(),
    removeTrackedDriver: jest.fn(),
    isDriverTracked: jest.fn(() => false),
  }),
}))

jest.mock('@/hooks/use-recent-profiles', () => ({
  useRecentProfiles: () => ({
    addRecentProfile: jest.fn(),
  }),
}))

// Mock the DriverDashboard component
jest.mock('@/components/driver-dashboard', () => {
  return function MockDriverDashboard({ custId, driverName }: { custId: number; driverName: string }) {
    return (
      <div data-testid="driver-dashboard">
        <p>Driver: {driverName}</p>
        <p>Customer ID: {custId}</p>
      </div>
    )
  }
})

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('CustomerPage', () => {
  const jeffNoelData = {
    id: 539129,
    name: 'Jeff Noel',
    currentIRating: 2150,
    currentSafetyRating: 'A 3.42',
    avgRacePace: '1:42.123',
    iratingHistory: [],
    safetyRatingHistory: [],
    racePaceHistory: [],
    recentRaces: []
  }

  const mockPush = jest.fn()
  const mockBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useParams as jest.Mock).mockReturnValue({ custId: '539129' })
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack
    })
  })

  test('renders loading state initially', () => {
    mockFetch.mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    )

    render(<CustomerPage />)

    expect(screen.getByText('Loading Driver Data...')).toBeDefined()
    expect(screen.getByText('Please wait while we fetch the driver information.')).toBeDefined()
  })

  test('successfully loads Jeff Noel driver data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        driver: jeffNoelData,
        custId: 539129,
        timestamp: new Date().toISOString()
      })
    })

    render(<CustomerPage />)

    await waitFor(() => {
      expect(screen.getByText('Driver profile for Jeff Noel')).toBeDefined()
    }, { timeout: 5000 })

    expect(screen.getByTestId('driver-dashboard')).toBeDefined()
    expect(screen.getByText('Driver: Jeff Noel')).toBeDefined()
    expect(screen.getByText('Customer ID: 539129')).toBeDefined()
  })

  test('handles API error gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Driver not found' })
    })

    render(<CustomerPage />)

    await waitFor(() => {
      expect(screen.getByText('Error loading driver data: Failed to fetch driver data: 404')).toBeDefined()
    })

    expect(screen.getByText('Back')).toBeDefined()
  })

  test('handles network error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<CustomerPage />)

    await waitFor(() => {
      expect(screen.getByText('Error loading driver data: Network error')).toBeDefined()
    })

    expect(screen.getByText('Back')).toBeDefined()
  })

  test('handles API response with error field', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        error: 'Driver data not available',
        driver: null
      })
    })

    render(<CustomerPage />)

    await waitFor(() => {
      expect(screen.getByText('Error loading driver data: Driver data not available')).toBeDefined()
    })
  })

  test('uses fallback driver name when driver data is incomplete', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        driver: { ...jeffNoelData, name: undefined },
        custId: 539129,
        timestamp: new Date().toISOString()
      })
    })

    render(<CustomerPage />)

    await waitFor(() => {
      expect(screen.getByText('Driver profile for Driver 539129')).toBeDefined()
    })

    expect(screen.getByText('Driver: Driver 539129')).toBeDefined()
  })

  test('makes API call with correct customer ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        driver: jeffNoelData,
        custId: 539129,
        timestamp: new Date().toISOString()
      })
    })

    render(<CustomerPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/driver/539129')
    })
  })

  test('handles different customer IDs from URL params', async () => {
    ;(useParams as jest.Mock).mockReturnValue({ custId: '123456' })
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        driver: { ...jeffNoelData, id: 123456 },
        custId: 123456,
        timestamp: new Date().toISOString()
      })
    })

    render(<CustomerPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/driver/123456')
    })

    await waitFor(() => {
      expect(screen.getByText('Customer ID: 123456')).toBeDefined()
    })
  })

  test('back button navigates to home page', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        driver: jeffNoelData,
        custId: 539129,
        timestamp: new Date().toISOString()
      })
    })

    render(<CustomerPage />)

    await waitFor(() => {
      expect(screen.getByText('Back to Search')).toBeDefined()
    })

    const backButton = screen.getByText('Back to Search')
    backButton.click()

    expect(mockPush).toHaveBeenCalledWith('/')
  })
})
