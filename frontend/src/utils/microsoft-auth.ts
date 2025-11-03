/**
 * Microsoft Authentication Utilities
 *
 * Helper functions for Microsoft SSO using MSAL Browser.
 * Supports popup, redirect, and silent authentication flows.
 */

import {
  msalInstance,
  loginRequest,
  ssoSilentRequest
} from '../config/msalConfig';
import type {
  AuthenticationResult,
  AccountInfo,
  SilentRequest
} from '@azure/msal-browser';

/**
 * Check if user has an active Microsoft session (for SharePoint SSO).
 * Uses ssoSilent to attempt authentication without user interaction.
 *
 * @returns Authentication result if successful, null otherwise
 */
export const attemptSilentSSO = async (): Promise<AuthenticationResult | null> => {
  try {
    // Try to get accounts from cache
    const accounts = msalInstance.getAllAccounts();

    if (accounts.length > 0) {
      // User has previously signed in, try silent token acquisition
      console.log('[Microsoft Auth] Found cached account, attempting silent token acquisition');

      const silentRequest: SilentRequest = {
        ...ssoSilentRequest,
        account: accounts[0],
      };

      const response = await msalInstance.acquireTokenSilent(silentRequest);
      console.log('[Microsoft Auth] Silent token acquisition successful');
      return response;
    } else {
      // No cached accounts, try ssoSilent (for SharePoint scenario)
      // This attempts to sign in using existing browser session
      console.log('[Microsoft Auth] No cached account, attempting ssoSilent');

      const response = await msalInstance.ssoSilent(ssoSilentRequest);
      console.log('[Microsoft Auth] ssoSilent successful');
      return response;
    }
  } catch (error) {
    console.log('[Microsoft Auth] Silent SSO failed:', error);
    return null;
  }
};

/**
 * Login with Microsoft using popup window.
 *
 * @returns Authentication result with tokens
 * @throws Error if login fails
 */
export const loginWithMicrosoftPopup = async (): Promise<AuthenticationResult> => {
  try {
    console.log('[Microsoft Auth] Initiating popup login');
    const response = await msalInstance.loginPopup(loginRequest);
    console.log('[Microsoft Auth] Popup login successful');
    return response;
  } catch (error) {
    console.error('[Microsoft Auth] Popup login failed:', error);
    throw error;
  }
};

/**
 * Login with Microsoft using redirect flow.
 *
 * Note: This will redirect the browser to Microsoft login page.
 * Use handleMicrosoftRedirect() to process the response after redirect back.
 */
export const loginWithMicrosoftRedirect = async (): Promise<void> => {
  try {
    console.log('[Microsoft Auth] Initiating redirect login');
    await msalInstance.loginRedirect(loginRequest);
  } catch (error) {
    console.error('[Microsoft Auth] Redirect login failed:', error);
    throw error;
  }
};

/**
 * Handle redirect callback after Microsoft login.
 * Call this on app initialization to process redirect responses.
 *
 * @returns Authentication result if redirect was processed, null otherwise
 */
export const handleMicrosoftRedirect = async (): Promise<AuthenticationResult | null> => {
  try {
    console.log('[Microsoft Auth] Handling redirect callback');
    const response = await msalInstance.handleRedirectPromise();

    if (response) {
      console.log('[Microsoft Auth] Redirect callback processed successfully');
    }

    return response;
  } catch (error) {
    console.error('[Microsoft Auth] Error handling redirect:', error);
    throw error;
  }
};

/**
 * Get current Microsoft account from cache.
 *
 * @returns Current account info or null if not authenticated
 */
export const getMicrosoftAccount = (): AccountInfo | null => {
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
};

/**
 * Check if user is authenticated with Microsoft.
 *
 * @returns True if user has active Microsoft session
 */
export const isMicrosoftAuthenticated = (): boolean => {
  return msalInstance.getAllAccounts().length > 0;
};

/**
 * Logout from Microsoft.
 *
 * @param logoutType 'popup' or 'redirect' (default: 'popup')
 */
export const logoutFromMicrosoft = async (logoutType: 'popup' | 'redirect' = 'popup'): Promise<void> => {
  try {
    const account = getMicrosoftAccount();

    if (!account) {
      console.log('[Microsoft Auth] No account to logout');
      return;
    }

    console.log('[Microsoft Auth] Logging out from Microsoft');

    if (logoutType === 'redirect') {
      await msalInstance.logoutRedirect({ account });
    } else {
      await msalInstance.logoutPopup({ account });
    }

    console.log('[Microsoft Auth] Logout successful');
  } catch (error) {
    console.error('[Microsoft Auth] Logout failed:', error);
    throw error;
  }
};

/**
 * Get ID token from authentication result or cached account.
 *
 * @returns ID token string or null
 */
export const getIdToken = (): string | null => {
  const account = getMicrosoftAccount();

  if (!account) {
    return null;
  }

  return account.idToken || null;
};
