import { renderHook, act } from '@testing-library/react'
import { useRecentProfiles, type RecentProfile } from '../use-recent-profiles'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

// Mock console.error to suppress expected error logs during testing
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

// Replace the global localStorage with our mock
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

describe('useRecentProfiles', () => {
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

  beforeEach(() => {
    jest.clearAllMocks()
    mockConsoleError.mockClear()
  })

  afterAll(() => {
    mockConsoleError.mockRestore()
  })

  describe('Initialization', () => {
    test('should initialize with empty array when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useRecentProfiles())
      
      expect(result.current.recentProfiles).toEqual([])
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('apex-stats-recent-profiles')
    })

    test('should load existing profiles from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockProfiles))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      expect(result.current.recentProfiles).toEqual(mockProfiles)
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('apex-stats-recent-profiles')
    })

    test('should sort profiles by lastAccessed date (most recent first)', () => {
      const unsortedProfiles = [
        { name: 'Old Profile', custId: '111', lastAccessed: '2024-01-10T10:00:00.000Z' },
        { name: 'New Profile', custId: '222', lastAccessed: '2024-01-20T10:00:00.000Z' },
        { name: 'Mid Profile', custId: '333', lastAccessed: '2024-01-15T10:00:00.000Z' }
      ]
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(unsortedProfiles))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      expect(result.current.recentProfiles[0].name).toBe('New Profile')
      expect(result.current.recentProfiles[1].name).toBe('Mid Profile')
      expect(result.current.recentProfiles[2].name).toBe('Old Profile')
    })

    test('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json data')
      
      const { result } = renderHook(() => useRecentProfiles())
      
      expect(result.current.recentProfiles).toEqual([])
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to load recent profiles:', expect.any(SyntaxError))
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('apex-stats-recent-profiles')
    })

    test('should handle localStorage access errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied')
      })
      
      const { result } = renderHook(() => useRecentProfiles())
      
      expect(result.current.recentProfiles).toEqual([])
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to load recent profiles:', expect.any(Error))
    })
  })

  describe('addRecentProfile', () => {
    test('should add a new profile with current timestamp', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      const newProfile = { name: 'Jeff Noel', custId: '539129' }
      
      act(() => {
        result.current.addRecentProfile(newProfile)
      })
      
      expect(result.current.recentProfiles).toHaveLength(1)
      expect(result.current.recentProfiles[0].name).toBe('Jeff Noel')
      expect(result.current.recentProfiles[0].custId).toBe('539129')
      expect(result.current.recentProfiles[0].lastAccessed).toBeDefined()
      expect(new Date(result.current.recentProfiles[0].lastAccessed)).toBeInstanceOf(Date)
    })

    test('should save to localStorage when adding profile', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.addRecentProfile({ name: 'Jeff Noel', custId: '539129' })
      })
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'apex-stats-recent-profiles',
        expect.stringContaining('Jeff Noel')
      )
    })

    test('should update existing profile when same custId is added', () => {
      const existingProfile = {
        name: 'Jeff Noel Old',
        custId: '539129',
        lastAccessed: '2024-01-10T10:00:00.000Z'
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([existingProfile]))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.addRecentProfile({ name: 'Jeff Noel Updated', custId: '539129' })
      })
      
      expect(result.current.recentProfiles).toHaveLength(1)
      expect(result.current.recentProfiles[0].name).toBe('Jeff Noel Updated')
      expect(result.current.recentProfiles[0].custId).toBe('539129')
      expect(new Date(result.current.recentProfiles[0].lastAccessed).getTime()).toBeGreaterThan(
        new Date(existingProfile.lastAccessed).getTime()
      )
    })

    test('should add new profile to beginning of list', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockProfiles))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.addRecentProfile({ name: 'New Driver', custId: '999999' })
      })
      
      expect(result.current.recentProfiles[0].name).toBe('New Driver')
      expect(result.current.recentProfiles).toHaveLength(4)
    })

    test('should limit profiles to MAX_RECENT_PROFILES (8)', () => {
      const manyProfiles = Array.from({ length: 10 }, (_, i) => ({
        name: `Driver ${i}`,
        custId: `${i}`,
        lastAccessed: new Date(Date.now() - i * 1000).toISOString()
      }))
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(manyProfiles))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.addRecentProfile({ name: 'New Driver', custId: '999' })
      })
      
      expect(result.current.recentProfiles).toHaveLength(8)
      expect(result.current.recentProfiles[0].name).toBe('New Driver')
    })

    test('should handle localStorage save errors gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]))
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.addRecentProfile({ name: 'Jeff Noel', custId: '539129' })
      })
      
      expect(result.current.recentProfiles).toHaveLength(1)
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to save recent profiles:', expect.any(Error))
    })
  })

  describe('removeRecentProfile', () => {
    test('should remove profile by custId', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockProfiles))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.removeRecentProfile('123456')
      })
      
      expect(result.current.recentProfiles).toHaveLength(2)
      expect(result.current.recentProfiles.find(p => p.custId === '123456')).toBeUndefined()
      expect(result.current.recentProfiles.find(p => p.custId === '539129')).toBeDefined()
    })

    test('should save to localStorage after removing profile', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockProfiles))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.removeRecentProfile('123456')
      })
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'apex-stats-recent-profiles',
        expect.not.stringContaining('John Doe')
      )
    })

    test('should handle removing non-existent profile gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockProfiles))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.removeRecentProfile('999999')
      })
      
      expect(result.current.recentProfiles).toHaveLength(3)
      expect(result.current.recentProfiles).toEqual(mockProfiles)
    })

    test('should handle localStorage save errors gracefully during removal', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockProfiles))
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.removeRecentProfile('123456')
      })
      
      expect(result.current.recentProfiles).toHaveLength(2)
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to save recent profiles:', expect.any(Error))
    })
  })

  describe('clearRecentProfiles', () => {
    test('should clear all profiles', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockProfiles))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.clearRecentProfiles()
      })
      
      expect(result.current.recentProfiles).toEqual([])
    })

    test('should remove data from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockProfiles))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.clearRecentProfiles()
      })
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('apex-stats-recent-profiles')
    })

    test('should handle localStorage removal in non-browser environment', () => {
      const originalWindow = global.window
      delete (global as any).window
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.clearRecentProfiles()
      })
      
      expect(result.current.recentProfiles).toEqual([])
      
      global.window = originalWindow
    })
  })

  describe('Edge Cases', () => {
    test('should handle non-browser environment gracefully', () => {
      // Reset localStorage mock to return null for this test
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const originalWindow = global.window
      delete (global as any).window
      
      const { result } = renderHook(() => useRecentProfiles())
      
      expect(result.current.recentProfiles).toEqual([])
      
      act(() => {
        result.current.addRecentProfile({ name: 'Test', custId: '123' })
      })
      
      expect(result.current.recentProfiles).toHaveLength(1)
      
      global.window = originalWindow
    })

    test('should handle invalid date strings gracefully', () => {
      const profilesWithInvalidDates = [
        { name: 'Valid', custId: '1', lastAccessed: '2024-01-15T10:00:00.000Z' },
        { name: 'Invalid', custId: '2', lastAccessed: 'invalid-date' },
        { name: 'Missing', custId: '3', lastAccessed: '' }
      ]
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(profilesWithInvalidDates))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      // Should still load the profiles, even with invalid dates
      expect(result.current.recentProfiles).toHaveLength(3)
    })

    test('should handle empty string custId', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.addRecentProfile({ name: 'Empty ID', custId: '' })
      })
      
      expect(result.current.recentProfiles).toHaveLength(1)
      expect(result.current.recentProfiles[0].custId).toBe('')
    })
  })

  describe('Jeff Noel Specific Tests', () => {
    test('should handle Jeff Noel profile correctly', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.addRecentProfile({ name: 'Jeff Noel', custId: '539129' })
      })
      
      expect(result.current.recentProfiles).toHaveLength(1)
      expect(result.current.recentProfiles[0].name).toBe('Jeff Noel')
      expect(result.current.recentProfiles[0].custId).toBe('539129')
    })

    test('should update Jeff Noel when accessed multiple times', () => {
      const existingJeff = {
        name: 'Jeff Noel',
        custId: '539129',
        lastAccessed: '2024-01-10T10:00:00.000Z'
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([existingJeff]))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.addRecentProfile({ name: 'Jeff Noel', custId: '539129' })
      })
      
      expect(result.current.recentProfiles).toHaveLength(1)
      expect(new Date(result.current.recentProfiles[0].lastAccessed).getTime()).toBeGreaterThan(
        new Date(existingJeff.lastAccessed).getTime()
      )
    })

    test('should remove Jeff Noel correctly', () => {
      const jeffWithOthers = [
        { name: 'Jeff Noel', custId: '539129', lastAccessed: '2024-01-15T10:00:00.000Z' },
        { name: 'Other Driver', custId: '123456', lastAccessed: '2024-01-14T10:00:00.000Z' }
      ]
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(jeffWithOthers))
      
      const { result } = renderHook(() => useRecentProfiles())
      
      act(() => {
        result.current.removeRecentProfile('539129')
      })
      
      expect(result.current.recentProfiles).toHaveLength(1)
      expect(result.current.recentProfiles[0].name).toBe('Other Driver')
      expect(result.current.recentProfiles.find(p => p.name === 'Jeff Noel')).toBeUndefined()
    })
  })
})
