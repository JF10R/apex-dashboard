/**
 * iRacing API Authentication Module
 * 
 * Handles authentication and API initialization for the iRacing API.
 * This module provides the core authentication logic and ensures
 * proper session management across the application.
 */

import IracingAPI from 'iracing-api';

export enum ApiErrorType {
  CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  LOGIN_FAILED = 'LOGIN_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public originalResponse?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

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

const email = process.env.IRACING_EMAIL ?? null;
const password = process.env.IRACING_PASSWORD ?? null;

let api: IracingAPI | null = null;
let apiInitializationPromise: Promise<void> | null = null;
let apiInitializedSuccessfully = false;

async function initializeAndLogin() {
  if (!email || !password) {
    const error = new ApiError(
      ApiErrorType.NOT_CONFIGURED,
      'iRacing API credentials are not configured.'
    );
    console.warn(createUserFriendlyErrorMessage(ApiErrorType.NOT_CONFIGURED));
    apiInitializedSuccessfully = false;
    return;
  }

  try {
    // Use a temporary instance for login, then assign to the global `api`
    const tempApi = new IracingAPI({ logger: true });
    console.log('Attempting to log in to iRacing API...');
    const loginResponse = await tempApi.login(email, password);
    console.log('Raw login API response:', JSON.stringify(loginResponse, null, 2));

    // Check the actual login response content for success indication
    if (loginResponse && loginResponse.error) {
      // Case 1: Explicit error in response
      api = null;
      apiInitializedSuccessfully = false;
      const error = new ApiError(
        ApiErrorType.LOGIN_FAILED,
        'Failed to authenticate with iRacing API: Error in login response.',
        loginResponse
      );
      console.error(createUserFriendlyErrorMessage(ApiErrorType.LOGIN_FAILED));
      console.error('Full login response:', JSON.stringify(loginResponse, null, 2));
    } else if (loginResponse && loginResponse.verificationRequired === true) {
      // Case 2: Recaptcha is explicitly required
      api = null;
      apiInitializedSuccessfully = false;
      const error = new ApiError(
        ApiErrorType.CAPTCHA_REQUIRED,
        'iRacing API requires CAPTCHA verification.',
        loginResponse
      );
      console.error(createUserFriendlyErrorMessage(ApiErrorType.CAPTCHA_REQUIRED));
      console.error('Login response indicating CAPTCHA required:', JSON.stringify(loginResponse, null, 2));
    } else if (loginResponse && loginResponse.message && loginResponse.message.toLowerCase().includes('invalid email address or password')) {
      // Case 3: Invalid credentials
      api = null;
      apiInitializedSuccessfully = false;
      const error = new ApiError(
        ApiErrorType.INVALID_CREDENTIALS,
        'Invalid iRacing email address or password.',
        loginResponse
      );
      console.error(createUserFriendlyErrorMessage(ApiErrorType.INVALID_CREDENTIALS));
      console.error('Login response:', JSON.stringify(loginResponse, null, 2));
    } else if (!loginResponse || (loginResponse.authcode !== undefined && loginResponse.authcode === 0 && loginResponse.verificationRequired !== false)) {
      // Case 4: No response or unsuccessful login (authcode 0 usually means failure)
      api = null;
      apiInitializedSuccessfully = false;
      const error = new ApiError(
        ApiErrorType.LOGIN_FAILED,
        'Login unsuccessful - received invalid response from iRacing API.',
        loginResponse
      );
      console.error(createUserFriendlyErrorMessage(ApiErrorType.LOGIN_FAILED));
      console.error('Unexpected login response:', JSON.stringify(loginResponse, null, 2));
    } else {
      // Case 5: Successful login
      api = tempApi;
      apiInitializedSuccessfully = true;
      console.log('✅ iRacing API initialized and login appears successful.');
      console.log('Login response:', JSON.stringify(loginResponse, null, 2));
    }
  } catch (error) {
    console.error('Failed to initialize or login to iRacing API (exception during login call):', error);
    console.error(createUserFriendlyErrorMessage(ApiErrorType.NETWORK_ERROR));
    api = null;
    apiInitializedSuccessfully = false;
  }
}

// Immediately attempt to initialize and log in when the module loads
apiInitializationPromise = initializeAndLogin();

/**
 * Helper function for API functions to ensure initialization is complete and successful
 */
export async function ensureApiInitialized(): Promise<IracingAPI> {
  if (!apiInitializationPromise) {
    console.warn('API initialization promise was not set, attempting to initialize now.');
    apiInitializationPromise = initializeAndLogin();
  }
  await apiInitializationPromise;

  if (!apiInitializedSuccessfully || !api) {
    if (!email || !password) {
      console.error(createUserFriendlyErrorMessage(ApiErrorType.NOT_CONFIGURED));
      throw new ApiError(
        ApiErrorType.NOT_CONFIGURED,
        'iRacing API credentials are not configured.'
      );
    }
    console.error(createUserFriendlyErrorMessage(ApiErrorType.LOGIN_FAILED));
    throw new ApiError(
      ApiErrorType.LOGIN_FAILED,
      'iRacing API not configured or login failed.'
    );
  }
  return api;
}

/**
 * Get authentication status
 */
export const getAuthStatus = () => ({
  isInitialized: apiInitializedSuccessfully,
  hasCredentials: !!(email && password),
  lastInitialization: apiInitializationPromise ? 'Promise exists' : 'No promise'
});
