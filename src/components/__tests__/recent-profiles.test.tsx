import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import RecentProfiles from '../recent-profiles'
import { useRecentProfiles, type RecentProfile } from '@/hooks/use-recent-profiles'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className} data-testid="card-title">{children}</h2>,
  CardDescription: ({ children, className }: any) => <p className={className} data-testid="card-description">{children}</p>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, title, ...props }: any) => 
    <button className={className} onClick={onClick} title={title} data-testid="button" {...props}>
      {children}
    </button>
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Clock: ({ className }: any) => <span className={className} data-testid="clock-icon">Clock</span>,
  X: ({ className }: any) => <span className={className} data-testid="x-icon">X</span>,
  User: ({ className }: any) => <span className={className} data-testid="user-icon">User</span>
}))

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

// Mock the recent profiles hook
const mockAddRecentProfile = jest.fn()
const mockRemoveRecentProfile = jest.fn()
const mockClearRecentProfiles = jest.fn()

jest.mock('@/hooks/use-recent-profiles', () => ({
  useRecentProfiles: jest.fn(),
}))

const mockUseRecentProfiles = useRecentProfiles as jest.MockedFunction<typeof useRecentProfiles>

describe('RecentProfiles Component', () => {
  const mockProfiles: RecentProfile[] = [
    {
      name: 'Jeff Noel',
      custId: '539129',
      lastAccessed: '2024-01-15T10:00:00.000Z'
    },
    {
      name: 'John Doe',
      custId: '123456',
      lastAccessed: '2024-01-14T15:30:00.000Z'
    },
    {
      name: 'Jane Smith',
      custId: '789012',
      lastAccessed: '2024-01-13T09:15:00.000Z'
    }
  ]

  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    })

    mockUseRecentProfiles.mockReturnValue({
      recentProfiles: mockProfiles,
      addRecentProfile: mockAddRecentProfile,
      removeRecentProfile: mockRemoveRecentProfile,
      clearRecentProfiles: mockClearRecentProfiles
    })
  })

  describe('Rendering', () => {
    test('renders recent profiles when profiles exist', () => {
      render(<RecentProfiles />)

      expect(screen.getByText('Recently Viewed')).toBeDefined()
      expect(screen.getByText('Quick access to recently viewed driver profiles')).toBeDefined()
      expect(screen.getByText('Jeff Noel')).toBeDefined()
      expect(screen.getByText('John Doe')).toBeDefined()
      expect(screen.getByText('Jane Smith')).toBeDefined()
    })

    test('does not render when no recent profiles exist', () => {
      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: [],
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      const { container } = render(<RecentProfiles />)
      
      expect(container.firstChild).toBeNull()
    })

    test('renders Clear all button when profiles exist', () => {
      render(<RecentProfiles />)

      expect(screen.getByText('Clear all')).toBeDefined()
    })

    test('does not render Clear all button when no profiles exist', () => {
      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: [],
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      expect(screen.queryByText('Clear all')).toBeNull()
    })

    test('applies custom className when provided', () => {
      const { container } = render(<RecentProfiles className="custom-class" />)
      
      const cardElement = container.querySelector('.custom-class')
      expect(cardElement).toBeDefined()
    })
  })

  describe('Time Formatting', () => {
    test('displays "Just now" for very recent profiles', () => {
      const recentProfile = {
        name: 'Recent Driver',
        custId: '999999',
        lastAccessed: new Date().toISOString()
      }

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: [recentProfile],
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      expect(screen.getByText('Just now')).toBeDefined()
    })

    test('displays minutes ago for recent profiles', () => {
      const minutesAgo = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      const recentProfile = {
        name: 'Recent Driver',
        custId: '999999',
        lastAccessed: minutesAgo.toISOString()
      }

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: [recentProfile],
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      expect(screen.getByText('30m ago')).toBeDefined()
    })

    test('displays hours ago for profiles from earlier today', () => {
      const hoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
      const recentProfile = {
        name: 'Recent Driver',
        custId: '999999',
        lastAccessed: hoursAgo.toISOString()
      }

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: [recentProfile],
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      expect(screen.getByText('5h ago')).toBeDefined()
    })

    test('displays days ago for profiles from recent days', () => {
      const daysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      const recentProfile = {
        name: 'Recent Driver',
        custId: '999999',
        lastAccessed: daysAgo.toISOString()
      }

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: [recentProfile],
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      expect(screen.getByText('3d ago')).toBeDefined()
    })

    test('displays date for older profiles', () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      const oldProfile = {
        name: 'Old Driver',
        custId: '999999',
        lastAccessed: oldDate.toISOString()
      }

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: [oldProfile],
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      expect(screen.getByText(oldDate.toLocaleDateString())).toBeDefined()
    })
  })

  describe('Interactions', () => {
    test('calls clearRecentProfiles when Clear all button is clicked', () => {
      render(<RecentProfiles />)

      const clearButton = screen.getByText('Clear all')
      fireEvent.click(clearButton)

      expect(mockClearRecentProfiles).toHaveBeenCalledTimes(1)
    })

    test('calls removeRecentProfile when remove button is clicked', () => {
      render(<RecentProfiles />)

      // Find all remove buttons (X buttons)
      const removeButtons = screen.getAllByTitle('Remove from recent')
      
      // Click the first remove button (should be for Jeff Noel)
      fireEvent.click(removeButtons[0])

      expect(mockRemoveRecentProfile).toHaveBeenCalledWith('539129')
    })

    test('prevents event propagation when remove button is clicked', () => {
      render(<RecentProfiles />)

      const removeButtons = screen.getAllByTitle('Remove from recent')
      const clickEvent = new MouseEvent('click', { bubbles: true })
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault')
      const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation')

      fireEvent(removeButtons[0], clickEvent)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(stopPropagationSpy).toHaveBeenCalled()
    })

    test('remove buttons are hidden by default and show on hover', () => {
      render(<RecentProfiles />)

      const removeButtons = screen.getAllByTitle('Remove from recent')
      
      // Remove buttons should have opacity-0 class (hidden by default)
      removeButtons.forEach(button => {
        expect(button.className).toContain('opacity-0')
        expect(button.className).toContain('group-hover:opacity-100')
      })
    })
  })

  describe('Navigation', () => {
    test('creates correct links for each profile', () => {
      render(<RecentProfiles />)

      // Check that links are created with correct hrefs
      const jeffLink = screen.getByText('Jeff Noel').closest('a')
      const johnLink = screen.getByText('John Doe').closest('a')
      const janeLink = screen.getByText('Jane Smith').closest('a')

      expect(jeffLink?.getAttribute('href')).toBe('/539129')
      expect(johnLink?.getAttribute('href')).toBe('/123456')
      expect(janeLink?.getAttribute('href')).toBe('/789012')
    })

    test('profile cards have proper hover effects', () => {
      render(<RecentProfiles />)

      const profileCards = screen.getAllByText('Jeff Noel').map(el => 
        el.closest('.group')?.querySelector('.hover\\:border-primary\\/50')
      ).filter(Boolean)

      expect(profileCards.length).toBeGreaterThan(0)
    })
  })

  describe('Layout and Styling', () => {
    test('renders profiles in a responsive grid', () => {
      render(<RecentProfiles />)

      const gridContainer = screen.getByText('Jeff Noel').closest('.grid')
      expect(gridContainer?.className).toContain('grid-cols-1')
      expect(gridContainer?.className).toContain('sm:grid-cols-2')
      expect(gridContainer?.className).toContain('lg:grid-cols-4')
    })

    test('displays user icons for each profile', () => {
      render(<RecentProfiles />)

      // Check for User icons (should be 3 for our mock profiles)
      const userIcons = screen.getAllByTestId('user-icon')
      
      // Each profile should have a user icon
      expect(userIcons.length).toBeGreaterThanOrEqual(3)
    })

    test('displays clock icon in header', () => {
      render(<RecentProfiles />)

      // Should have a clock icon in the header
      const clockIcon = screen.getByTestId('clock-icon')
      
      expect(clockIcon).toBeDefined()
    })

    test('truncates long driver names', () => {
      const longNameProfile = {
        name: 'Very Long Driver Name That Should Be Truncated',
        custId: '999999',
        lastAccessed: '2024-01-15T10:00:00.000Z'
      }

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: [longNameProfile],
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      const nameElement = screen.getByText('Very Long Driver Name That Should Be Truncated')
      expect(nameElement.className).toContain('truncate')
    })
  })

  describe('Edge Cases', () => {
    test('handles single profile correctly', () => {
      const singleProfile = [mockProfiles[0]]

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: singleProfile,
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      expect(screen.getByText('Jeff Noel')).toBeDefined()
      expect(screen.getByText('Clear all')).toBeDefined()
      expect(screen.getAllByTitle('Remove from recent')).toHaveLength(1)
    })

    test('handles many profiles correctly', () => {
      const manyProfiles = Array.from({ length: 8 }, (_, i) => ({
        name: `Driver ${i + 1}`,
        custId: `${i + 1}`,
        lastAccessed: new Date(Date.now() - i * 1000).toISOString()
      }))

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: manyProfiles,
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      expect(screen.getByText('Driver 1')).toBeDefined()
      expect(screen.getByText('Driver 8')).toBeDefined()
      expect(screen.getAllByTitle('Remove from recent')).toHaveLength(8)
    })

    test('handles profiles with empty or special character names', () => {
      const specialProfiles = [
        { name: '', custId: '1', lastAccessed: '2024-01-15T10:00:00.000Z' },
        { name: 'José María', custId: '2', lastAccessed: '2024-01-15T10:00:00.000Z' },
        { name: 'Driver-123_Test', custId: '3', lastAccessed: '2024-01-15T10:00:00.000Z' }
      ]

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: specialProfiles,
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      expect(screen.getByText('José María')).toBeDefined()
      expect(screen.getByText('Driver-123_Test')).toBeDefined()
    })

    test('handles invalid date gracefully', () => {
      const invalidDateProfile = {
        name: 'Invalid Date Driver',
        custId: '999999',
        lastAccessed: 'invalid-date-string'
      }

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: [invalidDateProfile],
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      // Should not throw an error
      expect(() => render(<RecentProfiles />)).not.toThrow()
      
      expect(screen.getByText('Invalid Date Driver')).toBeDefined()
    })
  })

  describe('Jeff Noel Specific Tests', () => {
    test('displays Jeff Noel profile correctly', () => {
      const jeffOnlyProfile = [mockProfiles[0]] // Jeff Noel

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: jeffOnlyProfile,
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      expect(screen.getByText('Jeff Noel')).toBeDefined()
      
      const jeffLink = screen.getByText('Jeff Noel').closest('a')
      expect(jeffLink?.getAttribute('href')).toBe('/539129')
    })

    test('removes Jeff Noel when his remove button is clicked', () => {
      const jeffOnlyProfile = [mockProfiles[0]] // Jeff Noel

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: jeffOnlyProfile,
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      const removeButton = screen.getByTitle('Remove from recent')
      fireEvent.click(removeButton)

      expect(mockRemoveRecentProfile).toHaveBeenCalledWith('539129')
    })

    test('Jeff Noel appears first when most recently accessed', () => {
      const profilesWithJeffFirst = [
        mockProfiles[0], // Jeff Noel - most recent
        mockProfiles[1], // John Doe
        mockProfiles[2]  // Jane Smith
      ]

      mockUseRecentProfiles.mockReturnValue({
        recentProfiles: profilesWithJeffFirst,
        addRecentProfile: mockAddRecentProfile,
        removeRecentProfile: mockRemoveRecentProfile,
        clearRecentProfiles: mockClearRecentProfiles
      })

      render(<RecentProfiles />)

      const allProfiles = screen.getAllByText(/^(Jeff Noel|John Doe|Jane Smith)$/)
      expect(allProfiles[0].textContent).toBe('Jeff Noel')
    })

    test('integrates with existing recent profiles alongside Jeff Noel', () => {
      render(<RecentProfiles />)

      // All three profiles should be visible
      expect(screen.getByText('Jeff Noel')).toBeDefined()
      expect(screen.getByText('John Doe')).toBeDefined()
      expect(screen.getByText('Jane Smith')).toBeDefined()

      // All should have remove buttons
      const removeButtons = screen.getAllByTitle('Remove from recent')
      expect(removeButtons).toHaveLength(3)

      // Clear all should be available
      expect(screen.getByText('Clear all')).toBeDefined()
    })
  })

  describe('Accessibility', () => {
    test('remove buttons have proper titles for screen readers', () => {
      render(<RecentProfiles />)

      const removeButtons = screen.getAllByTitle('Remove from recent')
      expect(removeButtons).toHaveLength(3)
      
      removeButtons.forEach(button => {
        expect(button.getAttribute('title')).toBe('Remove from recent')
      })
    })

    test('links are properly structured for screen readers', () => {
      render(<RecentProfiles />)

      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(3)
      
      links.forEach(link => {
        expect(link.getAttribute('href')).toMatch(/^\/\d+$/)
      })
    })

    test('proper heading structure', () => {
      render(<RecentProfiles />)

      expect(screen.getByText('Recently Viewed')).toBeDefined()
      expect(screen.getByText('Quick access to recently viewed driver profiles')).toBeDefined()
    })
  })
})
