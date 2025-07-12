/**
 * iRacing Lookup Module
 * 
 * Handles lookup data from the iRacing API including drivers, countries, and clubs.
 * Provides search functionality with proper caching.
 */

import { ensureApiInitialized } from './iracing-auth';
import { getCached, caches } from './iracing-cache';

// Based on official iRacing API Lookup types
export interface IracingDriver {
  cust_id: number;
  display_name: string;
  helmet?: {
    pattern: number;
    color1: string;
    color2: string;
    color3: string;
    face_type: number;
    helmet_type: number;
  };
  last_login?: string;
  member_since?: string;
  club_id?: number;
  club_name?: string;
  country?: string;
  country_code?: string;
}

export interface IracingCountry {
  country_code: string;
  country_name: string;
}

export interface IracingClub {
  club_id: number;
  club_name: string;
  country?: string;
  description?: string;
  region?: string;
}

export interface IracingLicense {
  license_id: number;
  license_level: number;
  license_name: string;
  color: string;
  group_name: string;
  group_id: number;
}

export interface DriverSearchOptions {
  searchTerm: string;
  leagueId?: number;
}

/**
 * Search for drivers by name or partial name
 */
export const searchDrivers = async (searchTerm: string, leagueId?: number): Promise<IracingDriver[]> => {
  const cacheKey = `drivers-search-${searchTerm.toLowerCase()}${leagueId ? `-league-${leagueId}` : ''}`;
  
  return getCached(
    caches.lookup,
    cacheKey,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🔍 Searching for drivers: "${searchTerm}"${leagueId ? ` in league ${leagueId}` : ''}`);
      
      const options: DriverSearchOptions = { searchTerm };
      if (leagueId) options.leagueId = leagueId;
      
      const response = await iracingApi.lookup.getDrivers(options);
      
      const drivers = Array.isArray(response) ? response : [];
      console.log(`✅ Found ${drivers.length} drivers matching "${searchTerm}"`);
      
      // Map API response to our expected format
      return drivers.map((driver: any) => ({
        cust_id: driver.custId || driver.cust_id,
        display_name: driver.displayName || driver.display_name,
        helmet: driver.helmet ? {
          pattern: driver.helmet.pattern,
          color1: driver.helmet.color1,
          color2: driver.helmet.color2,
          color3: driver.helmet.color3,
          face_type: driver.helmet.faceType || driver.helmet.face_type,
          helmet_type: driver.helmet.helmetType || driver.helmet.helmet_type,
        } : undefined,
        last_login: driver.lastLogin || driver.last_login,
        member_since: driver.memberSince || driver.member_since,
        club_id: driver.clubId || driver.club_id,
        club_name: driver.clubName || driver.club_name,
        country: driver.country,
        country_code: driver.countryCode || driver.country_code,
      })) as IracingDriver[];
    },
    300 // 5 minutes cache for driver searches
  );
};

/**
 * Get all countries from the iRacing API
 */
export const getAllCountries = async (): Promise<IracingCountry[]> => {
  return getCached(
    caches.lookup,
    'countries',
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log('🌍 Fetching countries from iRacing API...');
      
      // Note: The actual API might not have getCountries, so we'll return mock data for now
      // This can be updated when the actual API method is confirmed
      const countries: IracingCountry[] = [
        { country_code: 'US', country_name: 'United States' },
        { country_code: 'CA', country_name: 'Canada' },
        { country_code: 'GB', country_name: 'United Kingdom' },
        { country_code: 'DE', country_name: 'Germany' },
        { country_code: 'FR', country_name: 'France' },
        { country_code: 'AU', country_name: 'Australia' },
        { country_code: 'BR', country_name: 'Brazil' },
        { country_code: 'NL', country_name: 'Netherlands' },
        { country_code: 'BE', country_name: 'Belgium' },
        { country_code: 'ES', country_name: 'Spain' },
        { country_code: 'IT', country_name: 'Italy' },
        { country_code: 'SE', country_name: 'Sweden' },
        { country_code: 'NO', country_name: 'Norway' },
        { country_code: 'FI', country_name: 'Finland' },
        { country_code: 'DK', country_name: 'Denmark' },
      ];
      
      console.log(`✅ Fetched ${countries.length} countries (mock data)`);
      
      return countries;
    },
    86400 // 24 hours cache for countries (they rarely change)
  );
};

/**
 * Get all clubs from the iRacing API
 */
export const getAllClubs = async (): Promise<IracingClub[]> => {
  return getCached(
    caches.lookup,
    'clubs',
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log('🏁 Fetching clubs from iRacing API...');
      
      // Note: The actual API might not have getClubs, so we'll return mock data for now
      // This can be updated when the actual API method is confirmed
      const clubs: IracingClub[] = [
        {
          club_id: 1,
          club_name: 'Virtual Racing Club',
          country: 'United States',
          description: 'Premier iRacing club',
          region: 'North America',
        }
      ];
      
      console.log(`✅ Fetched ${clubs.length} clubs (mock data)`);
      
      return clubs;
    },
    86400 // 24 hours cache for clubs
  );
};

/**
 * Get all licenses from the iRacing API
 */
export const getAllLicenses = async (): Promise<IracingLicense[]> => {
  return getCached(
    caches.lookup,
    'licenses',
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log('📋 Fetching licenses from iRacing API...');
      
      // Note: The actual API might not have getLicenses, so we'll return mock data for now
      // This can be updated when the actual API method is confirmed
      const licenses: IracingLicense[] = [
        {
          license_id: 1,
          license_level: 1,
          license_name: 'Rookie',
          color: '#FFA500',
          group_name: 'Road',
          group_id: 1,
        },
        {
          license_id: 2,
          license_level: 2,
          license_name: 'Class D',
          color: '#FF4500',
          group_name: 'Road',
          group_id: 1,
        },
        {
          license_id: 3,
          license_level: 3,
          license_name: 'Class C',
          color: '#32CD32',
          group_name: 'Road',
          group_id: 1,
        },
        {
          license_id: 4,
          license_level: 4,
          license_name: 'Class B',
          color: '#1E90FF',
          group_name: 'Road',
          group_id: 1,
        },
        {
          license_id: 5,
          license_level: 5,
          license_name: 'Class A',
          color: '#FFD700',
          group_name: 'Road',
          group_id: 1,
        },
        {
          license_id: 6,
          license_level: 6,
          license_name: 'Pro',
          color: '#FF1493',
          group_name: 'Road',
          group_id: 1,
        },
      ];
      
      console.log(`✅ Fetched ${licenses.length} licenses (mock data)`);
      
      return licenses;
    },
    86400 // 24 hours cache for licenses
  );
};

/**
 * Get country by country code
 */
export const getCountryByCode = async (countryCode: string): Promise<IracingCountry | null> => {
  try {
    const countries = await getAllCountries();
    const country = countries.find(c => c.country_code === countryCode);
    return country || null;
  } catch (error) {
    console.error(`Error getting country for code "${countryCode}":`, error);
    return null;
  }
};

/**
 * Get club by club ID
 */
export const getClubById = async (clubId: number): Promise<IracingClub | null> => {
  try {
    const clubs = await getAllClubs();
    const club = clubs.find(c => c.club_id === clubId);
    return club || null;
  } catch (error) {
    console.error(`Error getting club for ID ${clubId}:`, error);
    return null;
  }
};

/**
 * Get license by license ID
 */
export const getLicenseById = async (licenseId: number): Promise<IracingLicense | null> => {
  try {
    const licenses = await getAllLicenses();
    const license = licenses.find(l => l.license_id === licenseId);
    return license || null;
  } catch (error) {
    console.error(`Error getting license for ID ${licenseId}:`, error);
    return null;
  }
};

/**
 * Search clubs by name or region
 */
export const searchClubs = async (searchTerm: string): Promise<IracingClub[]> => {
  try {
    const clubs = await getAllClubs();
    const searchLower = searchTerm.toLowerCase();
    
    return clubs.filter(club => 
      club.club_name.toLowerCase().includes(searchLower) ||
      club.country?.toLowerCase().includes(searchLower) ||
      club.region?.toLowerCase().includes(searchLower)
    );
  } catch (error) {
    console.error(`Error searching clubs for "${searchTerm}":`, error);
    return [];
  }
};

/**
 * Search countries by name
 */
export const searchCountries = async (searchTerm: string): Promise<IracingCountry[]> => {
  try {
    const countries = await getAllCountries();
    const searchLower = searchTerm.toLowerCase();
    
    return countries.filter(country => 
      country.country_name.toLowerCase().includes(searchLower) ||
      country.country_code.toLowerCase().includes(searchLower)
    );
  } catch (error) {
    console.error(`Error searching countries for "${searchTerm}":`, error);
    return [];
  }
};

/**
 * Get driver by customer ID (single driver lookup)
 */
export const getDriverById = async (custId: number): Promise<IracingDriver | null> => {
  try {
    // Try searching by customer ID as string since some APIs expect it this way
    const drivers = await searchDrivers(custId.toString());
    const exactMatch = drivers.find(driver => driver.cust_id === custId);
    return exactMatch || null;
  } catch (error) {
    console.error(`Error getting driver for ID ${custId}:`, error);
    return null;
  }
};

/**
 * Get multiple drivers by their customer IDs efficiently
 */
export const getMultipleDrivers = async (custIds: number[]): Promise<Map<number, IracingDriver>> => {
  const driverMap = new Map<number, IracingDriver>();
  
  if (custIds.length === 0) return driverMap;
  
  try {
    // For multiple drivers, we'd ideally want to batch the request,
    // but since the search API might not support that, we'll search individually
    // and cache each result
    const driverPromises = custIds.map(custId => getDriverById(custId));
    const drivers = await Promise.all(driverPromises);
    
    drivers.forEach((driver, index) => {
      if (driver) {
        driverMap.set(custIds[index], driver);
      }
    });
    
    console.log(`🔍 Loaded ${driverMap.size}/${custIds.length} driver profiles`);
    
  } catch (error) {
    console.error('Error fetching multiple drivers:', error);
  }
  
  return driverMap;
};

/**
 * Pre-warm the lookup cache with commonly used data
 */
export const preWarmLookupCache = async (): Promise<void> => {
  try {
    console.log('🔥 Pre-warming lookup cache...');
    await Promise.all([
      getAllCountries(),
      getAllClubs(),
      getAllLicenses()
    ]);
    console.log('✅ Lookup cache pre-warmed successfully');
  } catch (error) {
    console.error('Failed to pre-warm lookup cache:', error);
  }
};

/**
 * Get lookup cache statistics
 */
export const getLookupCacheStats = () => {
  return caches.lookup.getStats();
};
