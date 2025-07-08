import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import Home from '@/app/page'
import { searchDriversAction } from '@/app/data-actions'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock the data actions
jest.mock('@/app/data-actions', () => ({
  searchDriversAction: jest.fn()
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

const mockSearchDriversAction = searchDriversAction as jest.MockedFunction<typeof searchDriversAction>
const mockPush = jest.fn()

describe('Home Page Integration Tests', () => {
  const jeffNoelDriver = {
    name: 'Jeff Noel',
    custId: 539129
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    })
  })

  test('complete flow: search for Jeff Noel, select driver, and view dashboard', async () => {
    const user = userEvent.setup()
    
    mockSearchDriversAction.mockResolvedValue({
      data: [jeffNoelDriver],
      error: null
    })

    render(<Home />)

    // Verify initial state
    expect(screen.getByText('Apex Stats')).toBeDefined()
    expect(screen.getByText('Your iRacing performance dashboard.')).toBeDefined()
    expect(screen.getByPlaceholderText('Search for a driver...')).toBeDefined()

    // Search for Jeff Noel
    const searchInput = screen.getByPlaceholderText('Search for a driver...')
    await user.type(searchInput, 'Jeff Noel')

    // Wait for search results
    await waitFor(() => {
      expect(mockSearchDriversAction).toHaveBeenCalledWith('Jeff Noel')
    })

    await waitFor(() => {
      expect(screen.getByText('Jeff Noel')).toBeDefined()
    })

    // Select Jeff Noel from results
    const jeffNoelButton = screen.getByText('Jeff Noel')
    await user.click(jeffNoelButton)

    // Verify driver dashboard appears
    await waitFor(() => {
      expect(screen.getByTestId('driver-dashboard')).toBeDefined()
    })

    expect(screen.getByText('Driver: Jeff Noel')).toBeDefined()
    expect(screen.getByText('Customer ID: 539129')).toBeDefined()
  })

  test('compare button updates href when driver is selected', async () => {
    const user = userEvent.setup()
    
    mockSearchDriversAction.mockResolvedValue({
      data: [jeffNoelDriver],
      error: null
    })

    render(<Home />)

    // Initially, compare button should have default href
    const compareButton = screen.getByText('Compare')
    const initialLink = compareButton.closest('a')
    expect(initialLink?.getAttribute('href')).toBe('/compare')

    // Search and select Jeff Noel
    const searchInput = screen.getByPlaceholderText('Search for a driver...')
    await user.type(searchInput, 'Jeff Noel')

    await waitFor(() => {
      expect(screen.getByText('Jeff Noel')).toBeDefined()
    })

    const jeffNoelButton = screen.getByText('Jeff Noel')
    await user.click(jeffNoelButton)

    // Compare button should now have Jeff Noel pre-selected
    await waitFor(() => {
      const updatedLink = compareButton.closest('a')
      expect(updatedLink?.getAttribute('href')).toBe('/compare?driverA=Jeff%20Noel&custIdA=539129')
    })
  })

  test('handles search with no results', async () => {
    const user = userEvent.setup()
    
    mockSearchDriversAction.mockResolvedValue({
      data: [],
      error: null
    })

    render(<Home />)

    const searchInput = screen.getByPlaceholderText('Search for a driver...')
    await user.type(searchInput, 'NonExistentDriver')

    await waitFor(() => {
      expect(mockSearchDriversAction).toHaveBeenCalledWith('NonExistentDriver')
    })

    await waitFor(() => {
      expect(screen.getByText('No drivers found.')).toBeDefined()
    })

    // Dashboard should not appear
    expect(screen.queryByTestId('driver-dashboard')).toBeNull()
  })

  test('handles search error gracefully', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    mockSearchDriversAction.mockResolvedValue({
      data: [],
      error: 'API service unavailable'
    })

    render(<Home />)

    const searchInput = screen.getByPlaceholderText('Search for a driver...')
    await user.type(searchInput, 'Jeff Noel')

    await waitFor(() => {
      expect(mockSearchDriversAction).toHaveBeenCalledWith('Jeff Noel')
    })

    await waitFor(() => {
      expect(screen.getByText('No drivers found.')).toBeDefined()
    })

    expect(consoleSpy).toHaveBeenCalledWith('API service unavailable')
    consoleSpy.mockRestore()
  })

  test('clears driver selection when search is cleared', async () => {
    const user = userEvent.setup()
    
    mockSearchDriversAction.mockResolvedValue({
      data: [jeffNoelDriver],
      error: null
    })

    render(<Home />)

    const searchInput = screen.getByPlaceholderText('Search for a driver...')
    
    // Search and select Jeff Noel
    await user.type(searchInput, 'Jeff Noel')
    
    await waitFor(() => {
      expect(screen.getByText('Jeff Noel')).toBeDefined()
    })

    const jeffNoelButton = screen.getByText('Jeff Noel')
    await user.click(jeffNoelButton)

    // Verify dashboard appears
    await waitFor(() => {
      expect(screen.getByTestId('driver-dashboard')).toBeDefined()
    })

    // Clear search
    await user.clear(searchInput)

    // Dashboard should disappear
    await waitFor(() => {
      expect(screen.queryByTestId('driver-dashboard')).toBeNull()
    })

    // Compare button should reset
    const compareButton = screen.getByText('Compare')
    const resetLink = compareButton.closest('a')
    expect(resetLink?.getAttribute('href')).toBe('/compare')
  })

  test('handles multiple search results including Jeff Noel', async () => {
    const user = userEvent.setup()
    
    const multipleDrivers = [
      jeffNoelDriver,
      { name: 'Jeff Johnson', custId: 123456 },
      { name: 'Jeff Smith', custId: 789012 }
    ]

    mockSearchDriversAction.mockResolvedValue({
      data: multipleDrivers,
      error: null
    })

    render(<Home />)

    const searchInput = screen.getByPlaceholderText('Search for a driver...')
    await user.type(searchInput, 'Jeff')

    await waitFor(() => {
      expect(mockSearchDriversAction).toHaveBeenCalledWith('Jeff')
    })

    // All Jeff drivers should appear
    await waitFor(() => {
      expect(screen.getByText('Jeff Noel')).toBeDefined()
      expect(screen.getByText('Jeff Johnson')).toBeDefined()
      expect(screen.getByText('Jeff Smith')).toBeDefined()
    })

    // Select Jeff Noel specifically
    const jeffNoelButton = screen.getByText('Jeff Noel')
    await user.click(jeffNoelButton)

    // Verify correct driver is selected
    await waitFor(() => {
      expect(screen.getByText('Driver: Jeff Noel')).toBeDefined()
      expect(screen.getByText('Customer ID: 539129')).toBeDefined()
    })
  })
})
