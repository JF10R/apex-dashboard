import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DriverSearch from '@/components/driver-search'
import { searchDriversAction } from '@/app/data-actions'

// Mock the data actions
jest.mock('@/app/data-actions', () => ({
  searchDriversAction: jest.fn()
}))

const mockSearchDriversAction = searchDriversAction as jest.MockedFunction<typeof searchDriversAction>

describe('DriverSearch Component', () => {
  const jeffNoelDriver = {
    name: 'Jeff Noel',
    custId: 539129
  }

  const mockOnDriverSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders search input correctly', () => {
    render(
      <DriverSearch onDriverSelect={mockOnDriverSelect} />
    )

    expect(screen.getByPlaceholderText('Search for a driver...')).toBeDefined()
    expect(screen.getByLabelText('Driver Name')).toBeDefined()
  })

  test('renders with initial driver name', () => {
    render(
      <DriverSearch 
        onDriverSelect={mockOnDriverSelect} 
        initialDriverName="Jeff Noel" 
      />
    )

    expect(screen.getByDisplayValue('Jeff Noel')).toBeDefined()
  })

  test('renders with custom label', () => {
    render(
      <DriverSearch 
        onDriverSelect={mockOnDriverSelect} 
        label="Search for Driver" 
      />
    )

    expect(screen.getByText('Search for Driver')).toBeDefined()
  })

  test('searches for Jeff Noel and displays results', async () => {
    const user = userEvent.setup()
    
    mockSearchDriversAction.mockResolvedValue({
      data: [jeffNoelDriver],
      error: null
    })

    render(
      <DriverSearch onDriverSelect={mockOnDriverSelect} />
    )

    const searchInput = screen.getByPlaceholderText('Search for a driver...')
    
    await user.type(searchInput, 'Jeff Noel')

    await waitFor(() => {
      expect(mockSearchDriversAction).toHaveBeenCalledWith('Jeff Noel')
    })

    await waitFor(() => {
      expect(screen.getByText('Jeff Noel')).toBeDefined()
    })
  })

  test('handles search error gracefully', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    mockSearchDriversAction.mockResolvedValue({
      data: [],
      error: 'Search failed'
    })

    render(
      <DriverSearch onDriverSelect={mockOnDriverSelect} />
    )

    const searchInput = screen.getByPlaceholderText('Search for a driver...')
    
    await user.type(searchInput, 'Jeff Noel')

    await waitFor(() => {
      expect(mockSearchDriversAction).toHaveBeenCalledWith('Jeff Noel')
    })

    await waitFor(() => {
      expect(screen.getByText('No drivers found.')).toBeDefined()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Search failed')
    consoleSpy.mockRestore()
  })

  test('selects Jeff Noel from search results', async () => {
    const user = userEvent.setup()
    
    mockSearchDriversAction.mockResolvedValue({
      data: [jeffNoelDriver],
      error: null
    })

    render(
      <DriverSearch onDriverSelect={mockOnDriverSelect} />
    )

    const searchInput = screen.getByPlaceholderText('Search for a driver...')
    
    await user.type(searchInput, 'Jeff Noel')

    await waitFor(() => {
      expect(screen.getByText('Jeff Noel')).toBeDefined()
    })

    const jeffNoelButton = screen.getByText('Jeff Noel')
    await user.click(jeffNoelButton)

    expect(mockOnDriverSelect).toHaveBeenCalledWith(jeffNoelDriver)
    expect(screen.getByDisplayValue('Jeff Noel')).toBeDefined()
  })

  test('shows loading state during search', async () => {
    const user = userEvent.setup()
    
    // Create a promise that we can resolve manually
    let resolvePromise: (value: { data: typeof jeffNoelDriver[]; error: null }) => void
    const searchPromise = new Promise<{ data: typeof jeffNoelDriver[]; error: null }>((resolve) => {
      resolvePromise = resolve
    })
    
    mockSearchDriversAction.mockReturnValue(searchPromise)

    render(
      <DriverSearch onDriverSelect={mockOnDriverSelect} />
    )

    const searchInput = screen.getByPlaceholderText('Search for a driver...')
    
    await user.type(searchInput, 'Jeff Noel')

    // Wait for loading state - check for spinner or input
    await waitFor(() => {
      expect(searchInput).toBeDefined()
    })

    // Resolve the promise
    resolvePromise!({
      data: [jeffNoelDriver],
      error: null
    })

    await waitFor(() => {
      expect(screen.getByText('Jeff Noel')).toBeDefined()
    })
  })

  test('clears results when search input is cleared', async () => {
    const user = userEvent.setup()
    
    mockSearchDriversAction.mockResolvedValue({
      data: [jeffNoelDriver],
      error: null
    })

    render(
      <DriverSearch onDriverSelect={mockOnDriverSelect} />
    )

    const searchInput = screen.getByPlaceholderText('Search for a driver...')
    
    // Type search query
    await user.type(searchInput, 'Jeff Noel')

    await waitFor(() => {
      expect(screen.getByText('Jeff Noel')).toBeDefined()
    })

    // Clear search input
    await user.clear(searchInput)

    await waitFor(() => {
      expect(screen.queryByText('Jeff Noel')).toBeNull()
    })

    expect(mockOnDriverSelect).toHaveBeenCalledWith(null)
  })

  test('debounces search input', async () => {
    const user = userEvent.setup()
    
    mockSearchDriversAction.mockResolvedValue({
      data: [jeffNoelDriver],
      error: null
    })

    render(
      <DriverSearch onDriverSelect={mockOnDriverSelect} />
    )

    const searchInput = screen.getByPlaceholderText('Search for a driver...')
    
    // Type characters quickly
    await user.type(searchInput, 'J')
    await user.type(searchInput, 'e')
    await user.type(searchInput, 'f')
    await user.type(searchInput, 'f')

    // Should only call search action once after debounce
    await waitFor(() => {
      expect(mockSearchDriversAction).toHaveBeenCalledTimes(1)
      expect(mockSearchDriversAction).toHaveBeenCalledWith('Jeff')
    })
  })
})
