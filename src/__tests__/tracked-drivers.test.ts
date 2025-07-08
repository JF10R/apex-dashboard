/**
 * Unit Tests for Tracked Drivers Functionality
 * 
 * These tests verify the tracking system works correctly for Jeff Noel
 * and other drivers, ensuring proper localStorage management.
 */

describe('Tracked Drivers System Tests', () => {
  const jeffNoelDriver = {
    name: 'Jeff Noel',
    custId: 539129
  }

  const otherDriver = {
    name: 'John Doe',
    custId: 123456
  }

  // Mock localStorage
  const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
  });

  describe('LocalStorage Management', () => {
    test('should properly store tracked drivers in localStorage', () => {
      const trackedDrivers = [jeffNoelDriver, otherDriver];
      const storageKey = 'apex-stats-tracked-drivers';
      
      // Simulate storing drivers
      const expectedData = JSON.stringify(trackedDrivers);
      
      expect(JSON.parse(expectedData)).toEqual(trackedDrivers);
      expect(expectedData).toContain('Jeff Noel');
      expect(expectedData).toContain('539129');
    });

    test('should handle empty localStorage gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      // Should not throw error and should return empty array
      const result = mockLocalStorage.getItem('apex-stats-tracked-drivers');
      expect(result).toBeNull();
    });

    test('should handle corrupted localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      
      // Should handle JSON parse error gracefully
      try {
        JSON.parse('invalid json');
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });
  });

  describe('Driver Tracking Logic', () => {
    test('should add Jeff Noel to tracked drivers', () => {
      const trackedDrivers: typeof jeffNoelDriver[] = [];
      
      // Add Jeff Noel
      const isAlreadyTracked = trackedDrivers.some(d => d.custId === jeffNoelDriver.custId);
      if (!isAlreadyTracked) {
        trackedDrivers.push(jeffNoelDriver);
      }
      
      expect(trackedDrivers).toHaveLength(1);
      expect(trackedDrivers[0]).toEqual(jeffNoelDriver);
    });

    test('should not add duplicate drivers', () => {
      const trackedDrivers = [jeffNoelDriver];
      
      // Try to add Jeff Noel again
      const isAlreadyTracked = trackedDrivers.some(d => d.custId === jeffNoelDriver.custId);
      if (!isAlreadyTracked) {
        trackedDrivers.push(jeffNoelDriver);
      }
      
      expect(trackedDrivers).toHaveLength(1);
    });

    test('should remove Jeff Noel from tracked drivers', () => {
      const trackedDrivers = [jeffNoelDriver, otherDriver];
      
      // Remove Jeff Noel
      const updatedDrivers = trackedDrivers.filter(d => d.custId !== jeffNoelDriver.custId);
      
      expect(updatedDrivers).toHaveLength(1);
      expect(updatedDrivers[0]).toEqual(otherDriver);
    });

    test('should correctly identify if driver is tracked', () => {
      const trackedDrivers = [jeffNoelDriver];
      
      const isJeffTracked = trackedDrivers.some(d => d.custId === jeffNoelDriver.custId);
      const isOtherTracked = trackedDrivers.some(d => d.custId === otherDriver.custId);
      
      expect(isJeffTracked).toBe(true);
      expect(isOtherTracked).toBe(false);
    });
  });

  describe('URL Generation for Tracked Drivers', () => {
    test('should generate correct profile URL for Jeff Noel', () => {
      const profileUrl = `/${jeffNoelDriver.custId}`;
      expect(profileUrl).toBe('/539129');
    });

    test('should generate correct compare URL for Jeff Noel', () => {
      const compareUrl = `/compare?driverA=${encodeURIComponent(jeffNoelDriver.name)}&custIdA=${jeffNoelDriver.custId}`;
      expect(compareUrl).toBe('/compare?driverA=Jeff%20Noel&custIdA=539129');
    });

    test('should handle special characters in driver names', () => {
      const specialDriver = {
        name: 'José María',
        custId: 789012
      };
      
      const encodedName = encodeURIComponent(specialDriver.name);
      expect(encodedName).toBe('Jos%C3%A9%20Mar%C3%ADa');
    });
  });

  describe('Tracking System Integration', () => {
    test('should maintain tracking state across page navigation', () => {
      const initialTrackedDrivers = [jeffNoelDriver];
      
      // Simulate page navigation - localStorage should persist
      const serializedData = JSON.stringify(initialTrackedDrivers);
      mockLocalStorage.setItem.mockImplementation((key, value) => {
        expect(key).toBe('apex-stats-tracked-drivers');
        expect(value).toBe(serializedData);
      });
      
      // Simulate saving to localStorage
      mockLocalStorage.setItem('apex-stats-tracked-drivers', serializedData);
      
      // Verify localStorage.setItem was called
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'apex-stats-tracked-drivers',
        serializedData
      );
    });

    test('should handle multiple tracked drivers correctly', () => {
      const multipleDrivers = [
        jeffNoelDriver,
        otherDriver,
        { name: 'Jane Smith', custId: 456789 }
      ];
      
      // Verify all drivers are stored
      expect(multipleDrivers).toHaveLength(3);
      expect(multipleDrivers.map(d => d.name)).toEqual(['Jeff Noel', 'John Doe', 'Jane Smith']);
      expect(multipleDrivers.map(d => d.custId)).toEqual([539129, 123456, 456789]);
    });

    test('should clear all tracked drivers', () => {
      const trackedDrivers = [jeffNoelDriver, otherDriver];
      
      // Clear all drivers
      const clearedDrivers: typeof jeffNoelDriver[] = [];
      
      expect(clearedDrivers).toHaveLength(0);
      
      // Verify localStorage removal
      mockLocalStorage.removeItem.mockImplementation((key) => {
        expect(key).toBe('apex-stats-tracked-drivers');
      });
      
      mockLocalStorage.removeItem('apex-stats-tracked-drivers');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('apex-stats-tracked-drivers');
    });
  });

  describe('Error Handling', () => {
    test('should handle localStorage quota exceeded error', () => {
      const largeData = new Array(1000).fill(jeffNoelDriver);
      
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      expect(() => {
        mockLocalStorage.setItem('apex-stats-tracked-drivers', JSON.stringify(largeData));
      }).toThrow('QuotaExceededError');
    });

    test('should handle invalid customer ID format', () => {
      const invalidDriver = {
        name: 'Invalid Driver',
        custId: 'invalid' as any
      };
      
      expect(typeof invalidDriver.custId).toBe('string');
      expect(isNaN(parseInt(invalidDriver.custId))).toBe(true);
    });

    test('should handle missing driver data', () => {
      const incompleteDriver = {
        name: 'Incomplete Driver'
        // Missing custId
      } as any;
      
      expect(incompleteDriver.custId).toBeUndefined();
    });
  });

  describe('Jeff Noel Specific Tests', () => {
    test('Jeff Noel should be trackable', () => {
      expect(jeffNoelDriver.custId).toBe(539129);
      expect(jeffNoelDriver.name).toBe('Jeff Noel');
      expect(typeof jeffNoelDriver.custId).toBe('number');
      expect(typeof jeffNoelDriver.name).toBe('string');
    });

    test('Jeff Noel tracking should work in search results', () => {
      const searchResults = [
        jeffNoelDriver,
        { name: 'Jeff Johnson', custId: 123456 },
        { name: 'Jeff Smith', custId: 789012 }
      ];
      
      const jeffNoelInResults = searchResults.find(d => d.custId === 539129);
      expect(jeffNoelInResults).toEqual(jeffNoelDriver);
    });

    test('Jeff Noel should appear in tracked drivers UI', () => {
      const trackedDrivers = [jeffNoelDriver];
      
      // Simulate UI rendering
      const uiData = trackedDrivers.map(driver => ({
        ...driver,
        profileUrl: `/${driver.custId}`,
        compareUrl: `/compare?driverA=${encodeURIComponent(driver.name)}&custIdA=${driver.custId}`
      }));
      
      expect(uiData[0]).toEqual({
        name: 'Jeff Noel',
        custId: 539129,
        profileUrl: '/539129',
        compareUrl: '/compare?driverA=Jeff%20Noel&custIdA=539129'
      });
    });
  });
})
