/**
 * Microsoft Authentication Library (MSAL) Configuration
 *
 * Configures MSAL Browser for Microsoft Entra ID (Azure AD) authentication.
 * Supports both popup and redirect flows for Microsoft SSO.
 */

import {
  PublicClientApplication,
  LogLevel,
  BrowserCacheLocation
} from '@azure/msal-browser';

import type { Configuration } from '@azure/msal-browser';

// MSAL configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_MICROSOFT_REDIRECT_URI || window.location.origin + '/auth/callback',
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage, // Use sessionStorage to match current auth pattern
    storeAuthStateInCookie: false, // Set to true for IE11 compatibility
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error('[MSAL]', message);
            return;
          case LogLevel.Warning:
            console.warn('[MSAL]', message);
            return;
          case LogLevel.Info:
            console.info('[MSAL]', message);
            return;
          case LogLevel.Verbose:
            console.debug('[MSAL]', message);
            return;
          default:
            return;
        }
      },
      logLevel: LogLevel.Warning, // Only log warnings and errors in production
    },
  },
};

// Login request configuration
export const loginRequest = {
  scopes: ['https://graph.microsoft.com/User.Read'], // Microsoft Graph scope for user profile
};

// Silent SSO request (for SharePoint scenario)
export const ssoSilentRequest = {
  scopes: ['https://graph.microsoft.com/User.Read'],
  prompt: 'none', // Don't show UI, fail if user interaction required
};

// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
export const initializeMsal = async (): Promise<void> => {
  try {
    await msalInstance.initialize();
    console.log('[MSAL] Initialized successfully');

    // Handle redirect promise (for redirect flow)
  await msalInstance.handleRedirectPromise();
  } catch (error) {
    console.error('[MSAL] Initialization failed:', error);
    throw error;
  }
};
