/**
 * iRacing API Persistent Authentication Module
 * 
 * This module provides enhanced authentication with session persistence,
 * automatic token refresh, and smart retry logic to minimize the need
 * for frequent re-authentication.
 */

import IracingAPI from 'iracing-api';
import { ApiError, ApiErrorType } from './iracing-auth';

// Helper function to create user-friendly error messages
const createUserFriendlyErrorMessage = (type: ApiErrorType): string => {
  switch (type) {
    case ApiErrorType.CAPTCHA_REQUIRED:
      return `
🔒 CAPTCHA Verification Required

iRacing is requesting CAPTCHA verification, which typically happens when:
- Logging in from a new location/device
- After multiple failed login attempts
- As a security measure

To resolve this:
1. Open a web browser and go to https://members.iracing.com/
2. Log in manually with your iRacing credentials
3. Complete the CAPTCHA challenge
4. After successful login, wait a few minutes and try again

This is a security feature from iRacing that cannot be bypassed programmatically.
      `.trim();
    
    case ApiErrorType.INVALID_CREDENTIALS:
      return `
❌ Invalid Credentials

Your iRacing email or password is incorrect. Please:
1. Check your .env.local file for typos
2. Verify your credentials work at https://members.iracing.com/
3. Update your environment variables if needed
      `.trim();
    
    case ApiErrorType.NOT_CONFIGURED:
      return `
⚙️ API Not Configured

iRacing API credentials are missing. Please:
1. Create a .env.local file in your project root
2. Add your iRacing credentials:
   IRACING_EMAIL=your-email@example.com
   IRACING_PASSWORD=your-password
3. Restart your development server
      `.trim();
    
    case ApiErrorType.LOGIN_FAILED:
      return `
🚫 Login Failed

Unable to authenticate with iRacing API. This could be due to:
- Server issues on iRacing's end
- Network connectivity problems
- Account restrictions

Please try again in a few minutes.
      `.trim();
    
    default:
      return 'An unexpected error occurred with the iRacing API.';
  }
};

// Session storage interface
interface AuthSession {
  loginTime: number;
  expiryTime: number;
  sessionData?: any; // Store any session-related data from the API
  lastActivity: number;
}

// Authentication configuration
const AUTH_CONFIG = {
  SESSION_DURATION: parseInt(process.env.IRACING_SESSION_DURATION_HOURS || '4') * 60 * 60 * 1000, // 4 hours default
  REFRESH_THRESHOLD: parseInt(process.env.IRACING_REFRESH_THRESHOLD_MINUTES || '30') * 60 * 1000, // 30 minutes before expiry
  MAX_RETRY_ATTEMPTS: parseInt(process.env.IRACING_MAX_RETRY_ATTEMPTS || '3'),
  RETRY_DELAY_MS: parseInt(process.env.IRACING_RETRY_DELAY_MS || '5000'), // 5 seconds
  ENABLE_PERSISTENCE: process.env.IRACING_ENABLE_SESSION_PERSISTENCE !== 'false', // Default enabled
};

// In-memory session storage (could be enhanced with file system or database persistence)
let currentSession: AuthSession | null = null;
let api: IracingAPI | null = null;
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

const email = process.env.IRACING_EMAIL ?? null;
const password = process.env.IRACING_PASSWORD ?? null;

/**
 * Create a new authentication session
 */
function createSession(loginResponse?: any): AuthSession {
  const now = Date.now();
  return {
    loginTime: now,
    expiryTime: now + AUTH_CONFIG.SESSION_DURATION,
    sessionData: loginResponse,
    lastActivity: now,
  };
}

/**
 * Check if current session is valid and not expired
 */
function isSessionValid(): boolean {
  if (!currentSession || !api) {
    return false;
  }

  const now = Date.now();
  const isExpired = now > currentSession.expiryTime;
  const needsRefresh = now > (currentSession.expiryTime - AUTH_CONFIG.REFRESH_THRESHOLD);

  if (isExpired) {
    console.log('🕐 Session expired, need to re-authenticate');
    return false;
  }

  if (needsRefresh && AUTH_CONFIG.ENABLE_PERSISTENCE) {
    console.log('🔄 Session approaching expiry, should refresh soon');
    // Session is still valid but approaching expiry
    // We'll handle refresh in ensureValidSession
  }

  return true;
}

/**
 * Update session activity timestamp
 */
function updateSessionActivity(): void {
  if (currentSession) {
    currentSession.lastActivity = Date.now();
  }
}

/**
 * Perform fresh login to iRacing API
 */
async function performLogin(): Promise<void> {
  if (!email || !password) {
    throw new ApiError(
      ApiErrorType.NOT_CONFIGURED,
      'iRacing API credentials are not configured.'
    );
  }

  console.log('🔐 Performing fresh login to iRacing API...');
  
  const tempApi = new IracingAPI({ logger: true });
  const loginResponse = await tempApi.login(email, password);
  
  console.log('📡 Login response received:', {
    hasError: !!(loginResponse?.error),
    verificationRequired: loginResponse?.verificationRequired,
    authcode: loginResponse?.authcode,
    message: loginResponse?.message?.substring(0, 100) // Truncate long messages
  });

  // Validate login response
  if (loginResponse?.error) {
    throw new ApiError(
      ApiErrorType.LOGIN_FAILED,
      'Failed to authenticate with iRacing API: Error in login response.',
      loginResponse
    );
  }

  if (loginResponse?.verificationRequired === true) {
    throw new ApiError(
      ApiErrorType.CAPTCHA_REQUIRED,
      'iRacing API requires CAPTCHA verification.',
      loginResponse
    );
  }

  if (loginResponse?.message?.toLowerCase().includes('invalid email address or password')) {
    throw new ApiError(
      ApiErrorType.INVALID_CREDENTIALS,
      'Invalid iRacing email address or password.',
      loginResponse
    );
  }

  if (!loginResponse || (loginResponse.authcode !== undefined && loginResponse.authcode === 0 && loginResponse.verificationRequired !== false)) {
    throw new ApiError(
      ApiErrorType.LOGIN_FAILED,
      'Login unsuccessful - received invalid response from iRacing API.',
      loginResponse
    );
  }

  // Success! Store the session and API instance
  api = tempApi;
  currentSession = createSession(loginResponse);
  
  console.log('✅ Login successful, session created:', {
    loginTime: new Date(currentSession.loginTime).toISOString(),
    expiryTime: new Date(currentSession.expiryTime).toISOString(),
    durationHours: (currentSession.expiryTime - currentSession.loginTime) / (1000 * 60 * 60)
  });
}

/**
 * Refresh the current session if needed
 */
async function refreshSession(): Promise<void> {
  if (isRefreshing) {
    // Wait for existing refresh to complete
    if (refreshPromise) {
      await refreshPromise;
    }
    return;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      console.log('🔄 Refreshing iRacing API session...');
      
      // For iRacing API, we need to perform a fresh login
      // The API doesn't have a traditional "refresh token" mechanism
      await performLogin();
      
      console.log('✅ Session refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh session:', error);
      // Clear the session on refresh failure
      currentSession = null;
      api = null;
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  await refreshPromise;
}

/**
 * Ensure we have a valid, authenticated session
 */
async function ensureValidSession(): Promise<void> {
  // Check if session is completely invalid
  if (!isSessionValid()) {
    await performLogin();
    return;
  }

  // Check if session needs refresh
  const now = Date.now();
  const needsRefresh = currentSession && 
    now > (currentSession.expiryTime - AUTH_CONFIG.REFRESH_THRESHOLD);

  if (needsRefresh && AUTH_CONFIG.ENABLE_PERSISTENCE && !isRefreshing) {
    // Refresh in background but don't wait for it
    // This allows current request to proceed with valid session
    refreshSession().catch(error => {
      console.warn('Background session refresh failed:', error);
    });
  }

  updateSessionActivity();
}

/**
 * Get authenticated API instance with automatic session management
 */
export async function ensureApiInitialized(): Promise<IracingAPI> {
  // Check for build time
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                     (process.env.npm_lifecycle_event === 'build' && process.env.NODE_ENV !== 'development');

  if (isBuildTime) {
    throw new ApiError(
      ApiErrorType.NOT_CONFIGURED,
      'iRacing API is not available during build process'
    );
  }

  let retryCount = 0;
  
  while (retryCount < AUTH_CONFIG.MAX_RETRY_ATTEMPTS) {
    try {
      await ensureValidSession();
      
      if (!api) {
        throw new Error('API instance not available after session validation');
      }
      
      return api;
    } catch (error) {
      retryCount++;
      
      if (error instanceof ApiError) {
        // Don't retry configuration or CAPTCHA errors
        if (error.type === ApiErrorType.NOT_CONFIGURED || 
            error.type === ApiErrorType.CAPTCHA_REQUIRED ||
            error.type === ApiErrorType.INVALID_CREDENTIALS) {
          console.error(createUserFriendlyErrorMessage(error.type));
          throw error;
        }
      }
      
      if (retryCount >= AUTH_CONFIG.MAX_RETRY_ATTEMPTS) {
        console.error(`❌ Failed to authenticate after ${AUTH_CONFIG.MAX_RETRY_ATTEMPTS} attempts`);
        throw error;
      }
      
      console.warn(`⚠️ Authentication attempt ${retryCount} failed, retrying in ${AUTH_CONFIG.RETRY_DELAY_MS}ms...`);
      console.warn('Error:', error);
      
      // Clear failed session
      currentSession = null;
      api = null;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, AUTH_CONFIG.RETRY_DELAY_MS));
    }
  }
  
  throw new Error('Maximum retry attempts exceeded');
}

/**
 * Force session refresh (useful for testing or manual refresh)
 */
export async function forceRefreshSession(): Promise<void> {
  console.log('🔄 Force refreshing session...');
  currentSession = null;
  api = null;
  await ensureValidSession();
}

/**
 * Get current session status and statistics
 */
export function getSessionStatus() {
  const now = Date.now();
  
  if (!currentSession) {
    return {
      isAuthenticated: false,
      hasSession: false,
      sessionAge: null,
      timeUntilExpiry: null,
      needsRefresh: false,
      lastActivity: null,
    };
  }
  
  const sessionAge = now - currentSession.loginTime;
  const timeUntilExpiry = currentSession.expiryTime - now;
  const needsRefresh = timeUntilExpiry < AUTH_CONFIG.REFRESH_THRESHOLD;
  const timeSinceActivity = now - currentSession.lastActivity;
  
  return {
    isAuthenticated: !!api,
    hasSession: true,
    sessionAge: Math.round(sessionAge / 1000), // seconds
    timeUntilExpiry: Math.round(timeUntilExpiry / 1000), // seconds
    needsRefresh,
    lastActivity: Math.round(timeSinceActivity / 1000), // seconds
    loginTime: new Date(currentSession.loginTime).toISOString(),
    expiryTime: new Date(currentSession.expiryTime).toISOString(),
    config: {
      sessionDurationHours: AUTH_CONFIG.SESSION_DURATION / (1000 * 60 * 60),
      refreshThresholdMinutes: AUTH_CONFIG.REFRESH_THRESHOLD / (1000 * 60),
      persistenceEnabled: AUTH_CONFIG.ENABLE_PERSISTENCE,
    }
  };
}

/**
 * Clear current session (useful for logout or testing)
 */
export function clearSession(): void {
  console.log('🗑️ Clearing authentication session');
  currentSession = null;
  api = null;
  isRefreshing = false;
  refreshPromise = null;
}

/**
 * Get authentication configuration
 */
export function getAuthConfig() {
  return {
    ...AUTH_CONFIG,
    hasCredentials: !!(email && password),
  };
}

// Re-export error types and utilities for convenience
export { ApiError, ApiErrorType } from './iracing-auth';
