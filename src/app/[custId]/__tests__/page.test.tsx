import { render, screen, waitFor } from '@testing-library/react'
import { useParams, useRouter } from 'next/navigation'
import CustomerPage from '@/app/[custId]/page'

// Stable mock functions for hooks
const addTrackedDriver = jest.fn()
const removeTrackedDriver = jest.fn()
const isDriverTracked = jest.fn(() => false)
const addRecentProfile = jest.fn()

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn()
}))

// Mock the hooks with stable references
jest.mock('@/hooks/use-tracked-drivers', () => ({
  useTrackedDrivers: () => ({
    addTrackedDriver,
    removeTrackedDriver,
    isDriverTracked,
  }),
}))

jest.mock('@/hooks/use-recent-profiles', () => ({
  useRecentProfiles: () => ({
    addRecentProfile,
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

// Mock fetch globally - ensure no real API calls during tests
const mockFetch = jest.fn()
global.fetch = mockFetch

// Safeguard: fail test if any unmocked fetch calls are attempted
const originalFetch = global.fetch
global.fetch = jest.fn().mockImplementation((url) => {
  throw new Error(`Unmocked fetch call attempted to: ${url}. All API calls should be mocked in tests.`)
})

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

  // Mock console.error to suppress expected error logs during testing
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset fetch mock to our controlled version
    global.fetch = mockFetch
    
    ;(useParams as jest.Mock).mockReturnValue({ custId: '539129' })
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack
    })
  })

  afterAll(() => {
    // Restore console.error after all tests
    mockConsoleError.mockRestore()
  })

  test('renders loading state initially', () => {
    mockFetch.mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    )

    render(<CustomerPage />)

    expect(screen.getByText(/Loading Driver Data/i)).toBeDefined()
    expect(screen.getByText(/Preparing driver data request/i)).toBeDefined()
    // Check for progress bar
    expect(screen.getByRole('progressbar')).toBeDefined()
  })

  test('shows dynamic loading stages with progress', async () => {
    // Create a delayed promise to test loading stages
    let resolvePromise: (value: any) => void
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    
    mockFetch.mockReturnValue(delayedPromise)

    render(<CustomerPage />)

    // Should start with initializing stage
    expect(screen.getByText(/Preparing driver data request/i)).toBeDefined()
    expect(screen.getByText('10%')).toBeDefined()
    expect(screen.getByText('initializing')).toBeDefined()

    // Resolve the promise after a short delay to allow stages to progress
    setTimeout(() => {
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({
          driver: jeffNoelData,
          custId: 539129,
          timestamp: new Date().toISOString()
        })
      })
    }, 100)

    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.getByText(/Driver profile for Jeff Noel/i)).toBeDefined()
    }, { timeout: 3000 })
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
      expect(screen.getByText(/Driver profile for Jeff Noel/i)).toBeDefined()
    }, { timeout: 5000 })

    expect(screen.getByTestId('driver-dashboard')).toBeDefined()
    expect(screen.getByText(/Driver: Jeff Noel/i)).toBeDefined()
    expect(screen.getByText(/Customer ID: 539129/i)).toBeDefined()
  })

  test('handles API error gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Driver not found' })
    })

    render(<CustomerPage />)

    await waitFor(() => {
      expect(screen.getByText(/Error loading driver data: Failed to fetch driver data: 404/i)).toBeDefined()
    })

    expect(screen.getByText(/Back/i)).toBeDefined()
  })

  test('handles network error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<CustomerPage />)

    await waitFor(() => {
      expect(screen.getByText(/Error loading driver data: Network error/i)).toBeDefined()
    })

    expect(screen.getByText(/Back/i)).toBeDefined()
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
      expect(screen.getByText(/Error loading driver data: Driver data not available/i)).toBeDefined()
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
      expect(screen.getByText(/Driver profile for Driver 539129/i)).toBeDefined()
    })

    expect(screen.getByText(/Driver: Driver 539129/i)).toBeDefined()
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
      expect(screen.getByText(/Customer ID: 123456/i)).toBeDefined()
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
      expect(screen.getByText(/Back to Search/i)).toBeDefined()
    })

    const backButton = screen.getByText(/Back to Search/i)
    backButton.click()

    expect(mockPush).toHaveBeenCalledWith('/')
  })

  test('calls addRecentProfile when driver data loads successfully', async () => {
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
      expect(screen.getByText(/Driver profile for Jeff Noel/i)).toBeDefined()
    }, { timeout: 5000 })

    // Should call addRecentProfile with the driver data
    expect(addRecentProfile).toHaveBeenCalledWith({
      name: 'Jeff Noel',
      custId: '539129'
    })
  })

  test('calls addRecentProfile with fallback name when driver name is missing', async () => {
    const driverDataWithoutName = { ...jeffNoelData, name: undefined }
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        driver: driverDataWithoutName,
        custId: 539129,
        timestamp: new Date().toISOString()
      })
    })

    render(<CustomerPage />)

    await waitFor(() => {
      expect(screen.getByText(/Driver profile for Driver 539129/i)).toBeDefined()
    }, { timeout: 5000 })

    // Should call addRecentProfile with fallback name
    expect(addRecentProfile).toHaveBeenCalledWith({
      name: 'Driver 539129',
      custId: '539129'
    })
  })

  test('does not call addRecentProfile when there is an error loading driver data', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Driver not found' })
    })

    render(<CustomerPage />)

    await waitFor(() => {
      expect(screen.getByText(/Error loading driver data: Failed to fetch driver data: 404/i)).toBeDefined()
    })

    // Should not call addRecentProfile when there's an error
    expect(addRecentProfile).not.toHaveBeenCalled()
  })
})
