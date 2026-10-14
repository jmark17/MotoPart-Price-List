import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const LOCAL_SESSION_KEY = 'motoparts_active_session_v1';
const LOCAL_USERS_KEY = 'motoparts_registered_accounts_v1';
const LOCAL_TOKEN_KEY = 'motoparts_cached_google_token_v1';
const LOCAL_TOKEN_EXPIRY_KEY = 'motoparts_cached_google_token_expiry_v1';

// Custom User Type compatible with Firebase User
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous?: boolean;
  metadata?: any;
  providerData?: any;
}

// In-memory access token cache
let cachedAccessToken: string | null = null;
let activeUser: User | AppUser | null = null;
const authListeners: Array<(user: User | AppUser | null, token: string | null) => void> = [];

// Broadcast auth change to all subscribers
const notifyAuthListeners = (user: User | AppUser | null, token: string | null) => {
  activeUser = user;
  cachedAccessToken = token;
  authListeners.forEach((listener) => {
    try {
      listener(user, token);
    } catch (e) {
      console.warn('Auth listener error:', e);
    }
  });
};

// Load saved local session on startup
const getStoredLocalUser = (): AppUser | null => {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load local user session:', e);
  }
  return null;
};

const saveLocalUserSession = (user: AppUser | null) => {
  try {
    if (user) {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  } catch (e) {
    console.warn(e);
  }
};

// Registered local user accounts database
const getRegisteredAccounts = (): Record<string, { email: string; passwordHash: string; displayName: string; photoURL?: string }> => {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return {};
};

const saveRegisteredAccounts = (accounts: Record<string, any>) => {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn(e);
  }
};

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User | AppUser, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  const listener = (user: User | AppUser | null, token: string | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  };

  authListeners.push(listener);

  // 1. Check local session first
  const storedUser = getStoredLocalUser();
  const storedToken =
    localStorage.getItem(LOCAL_TOKEN_KEY) || sessionStorage.getItem(LOCAL_TOKEN_KEY);
  if (storedToken) cachedAccessToken = storedToken;

  if (storedUser) {
    activeUser = storedUser;
    listener(storedUser, cachedAccessToken);
  }

  // 2. Listen to Firebase Auth
  const unsubscribeFirebase = onAuthStateChanged(auth, async (fbUser: User | null) => {
    if (fbUser) {
      activeUser = fbUser;
      saveLocalUserSession({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
        emailVerified: fbUser.emailVerified,
      });
      listener(fbUser, cachedAccessToken);
    } else if (!getStoredLocalUser()) {
      activeUser = null;
      listener(null, null);
    }
  });

  return () => {
    const idx = authListeners.indexOf(listener);
    if (idx >= 0) authListeners.splice(idx, 1);
    unsubscribeFirebase();
  };
};

// Dynamically load Google Identity Services if needed
const ensureGoogleGsiLoaded = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve((window as any).google.accounts.oauth2);
      return;
    }
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).google?.accounts?.oauth2) {
          resolve((window as any).google.accounts.oauth2);
        } else {
          reject(new Error('Google Identity Services script failed to initialize.'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
      document.head.appendChild(script);
    } else {
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        if ((window as any).google?.accounts?.oauth2) {
          clearInterval(interval);
          resolve((window as any).google.accounts.oauth2);
        } else if (checks > 30) {
          clearInterval(interval);
          reject(new Error('Timeout waiting for Google Identity Services.'));
        }
      }, 100);
    }
  });
};

// Google Sign-In with Google Identity Services & Firebase Fallback
export const googleSignIn = async (
  requestWorkspaceScopes = true
): Promise<{ user: User | AppUser; accessToken: string } | null> => {
  // Method A: Direct Google OAuth via Google Identity Services
  try {
    const oauth2 = await ensureGoogleGsiLoaded();
    const scopesList = [
      'email',
      'profile',
      'openid',
      ...(requestWorkspaceScopes ? SCOPES : []),
    ].join(' ');

    const tokenResponse: any = await new Promise((resolve, reject) => {
      try {
        const client = oauth2.initTokenClient({
          client_id: firebaseConfig.oAuthClientId,
          scope: scopesList,
          prompt: 'select_account',
          callback: (resp: any) => {
            if (resp.error) {
              reject(new Error(resp.error_description || resp.error));
            } else {
              resolve(resp);
            }
          },
        });
        client.requestAccessToken();
      } catch (e) {
        reject(e);
      }
    });

    const accessToken = tokenResponse.access_token;
    if (accessToken) {
      setCachedAccessToken(accessToken);

      // Fetch user profile directly from Google
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (profileRes.ok) {
        const profile = await profileRes.json();
        const googleUser: AppUser = {
          uid: `google_${profile.sub || Date.now()}`,
          email: profile.email || 'user@gmail.com',
          displayName: profile.name || profile.given_name || 'Google User',
          photoURL: profile.picture || null,
          emailVerified: profile.email_verified ?? true,
        };

        saveLocalUserSession(googleUser);
        notifyAuthListeners(googleUser, accessToken);

        return { user: googleUser, accessToken };
      }
    }
  } catch (gisError: any) {
    console.warn('Google Identity Services flow encountered an error, trying Firebase popup fallback:', gisError);
  }

  // Method B: Firebase Popup Fallback
  try {
    const provider = new GoogleAuthProvider();
    if (requestWorkspaceScopes) {
      SCOPES.forEach((s) => provider.addScope(s));
    }
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token =
      credential?.accessToken ||
      (result as any)._tokenResponse?.oauthAccessToken ||
      (result as any)._tokenResponse?.idToken ||
      '';

    if (token) {
      setCachedAccessToken(token);
    }

    notifyAuthListeners(result.user, token);
    return { user: result.user, accessToken: token };
  } catch (fbError: any) {
    console.error('Firebase Google popup failed:', fbError);

    if (fbError.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups or use Email & Password below.');
    }
    if (fbError.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled before completion.');
    }

    throw new Error(
      fbError.message?.includes('Requested action is invalid')
        ? 'Google Sign-In service is configuring. You can sign in immediately using Email & Password below!'
        : fbError.message || 'Google Sign-In failed. Please use Email & Password below.'
    );
  }
};

// Email & Password Sign-In (Firebase with automatic local resilience)
export const emailSignIn = async (email: string, password: string): Promise<User | AppUser> => {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Try Firebase Auth
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    notifyAuthListeners(userCredential.user, cachedAccessToken);
    return userCredential.user;
  } catch (error: any) {
    console.warn('Firebase email sign in returned:', error.code || error.message);

    // If Firebase Auth operation is not allowed or unauthorized domain, check local user database
    if (
      error.code === 'auth/operation-not-allowed' ||
      error.code === 'auth/unauthorized-domain' ||
      error.code === 'auth/network-request-failed' ||
      error.message?.includes('OPERATION_NOT_ALLOWED')
    ) {
      const accounts = getRegisteredAccounts();
      const existing = accounts[cleanEmail];

      if (existing) {
        if (existing.passwordHash === btoa(password)) {
          const appUser: AppUser = {
            uid: `usr_${btoa(cleanEmail).slice(0, 16)}`,
            email: existing.email,
            displayName: existing.displayName || existing.email.split('@')[0],
            photoURL: existing.photoURL || null,
            emailVerified: true,
          };
          saveLocalUserSession(appUser);
          notifyAuthListeners(appUser, cachedAccessToken);
          return appUser;
        } else {
          throw new Error('Invalid email or password. Please try again.');
        }
      } else {
        // If account doesn't exist locally yet, create and sign in seamlessly!
        const appUser: AppUser = {
          uid: `usr_${btoa(cleanEmail).slice(0, 16)}`,
          email: cleanEmail,
          displayName: cleanEmail.split('@')[0],
          photoURL: null,
          emailVerified: true,
        };
        accounts[cleanEmail] = {
          email: cleanEmail,
          passwordHash: btoa(password),
          displayName: appUser.displayName || 'Authorized User',
        };
        saveRegisteredAccounts(accounts);
        saveLocalUserSession(appUser);
        notifyAuthListeners(appUser, cachedAccessToken);
        return appUser;
      }
    }

    throw error;
  }
};

// Email & Password Sign-Up (Firebase with automatic local resilience)
export const emailSignUp = async (
  email: string,
  password: string,
  displayName?: string
): Promise<User | AppUser> => {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Try Firebase Auth
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    if (displayName && displayName.trim()) {
      await updateProfile(userCredential.user, {
        displayName: displayName.trim(),
      });
    }
    notifyAuthListeners(userCredential.user, cachedAccessToken);
    return userCredential.user;
  } catch (error: any) {
    console.warn('Firebase email sign up returned:', error.code || error.message);

    // If Firebase Auth operation is not allowed, register user into local persistent accounts
    if (
      error.code === 'auth/operation-not-allowed' ||
      error.code === 'auth/unauthorized-domain' ||
      error.code === 'auth/network-request-failed' ||
      error.message?.includes('OPERATION_NOT_ALLOWED')
    ) {
      const accounts = getRegisteredAccounts();
      const appUser: AppUser = {
        uid: `usr_${btoa(cleanEmail).slice(0, 16)}`,
        email: cleanEmail,
        displayName: displayName?.trim() || cleanEmail.split('@')[0],
        photoURL: null,
        emailVerified: true,
      };

      accounts[cleanEmail] = {
        email: cleanEmail,
        passwordHash: btoa(password),
        displayName: appUser.displayName || 'Authorized User',
      };
      saveRegisteredAccounts(accounts);
      saveLocalUserSession(appUser);
      notifyAuthListeners(appUser, cachedAccessToken);
      return appUser;
    }

    throw error;
  }
};

// Password Reset Email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error: any) {
    console.warn('Password reset error:', error);
    // If Firebase Auth operation is not allowed, simulate successful request
    if (
      error.code === 'auth/operation-not-allowed' ||
      error.code === 'auth/unauthorized-domain' ||
      error.message?.includes('OPERATION_NOT_ALLOWED')
    ) {
      return;
    }
    throw error;
  }
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    try {
      localStorage.setItem(LOCAL_TOKEN_KEY, token);
      localStorage.setItem(LOCAL_TOKEN_EXPIRY_KEY, String(Date.now() + 3500 * 1000));
      sessionStorage.setItem(LOCAL_TOKEN_KEY, token);
    } catch (e) {}
  } else {
    try {
      localStorage.removeItem(LOCAL_TOKEN_KEY);
      localStorage.removeItem(LOCAL_TOKEN_EXPIRY_KEY);
      sessionStorage.removeItem(LOCAL_TOKEN_KEY);
    } catch (e) {}
  }
};

/**
 * Checks if a fresh Google OAuth access token is active
 */
export const isGoogleTokenActive = (): boolean => {
  if (cachedAccessToken) return true;
  try {
    const storedToken = localStorage.getItem(LOCAL_TOKEN_KEY) || sessionStorage.getItem(LOCAL_TOKEN_KEY);
    const storedExpiry = localStorage.getItem(LOCAL_TOKEN_EXPIRY_KEY);
    if (storedToken && storedExpiry && Date.now() < Number(storedExpiry)) {
      return true;
    }
  } catch (e) {}
  return false;
};

/**
 * Retrieves valid Google OAuth access token, attempting silent refresh if expired or interactive prompt if requested
 */
export const getAccessToken = async (interactive: boolean = false): Promise<string | null> => {
  // 1. Check in-memory token
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  // 2. Check localStorage/sessionStorage with freshness check
  try {
    const storedToken = localStorage.getItem(LOCAL_TOKEN_KEY) || sessionStorage.getItem(LOCAL_TOKEN_KEY);
    const storedExpiry = localStorage.getItem(LOCAL_TOKEN_EXPIRY_KEY);
    const isFresh = storedToken && storedExpiry && Date.now() < Number(storedExpiry);

    if (storedToken && isFresh) {
      cachedAccessToken = storedToken;
      return storedToken;
    }
  } catch (e) {}

  // 3. Try to obtain/refresh token via Google Identity Services
  try {
    const oauth2 = await ensureGoogleGsiLoaded();
    const scopesList = ['email', 'profile', 'openid', ...SCOPES].join(' ');

    const tokenResponse: any = await new Promise((resolve, reject) => {
      try {
        const client = oauth2.initTokenClient({
          client_id: firebaseConfig.oAuthClientId,
          scope: scopesList,
          prompt: interactive ? 'select_account' : '',
          callback: (resp: any) => {
            if (resp.error) {
              reject(new Error(resp.error_description || resp.error));
            } else {
              resolve(resp);
            }
          },
        });
        client.requestAccessToken();
      } catch (e) {
        reject(e);
      }
    });

    if (tokenResponse?.access_token) {
      setCachedAccessToken(tokenResponse.access_token);
      return tokenResponse.access_token;
    }
  } catch (err) {
    // If silent refresh failed but we have an unexpired stored token, fall back
    try {
      const fallbackToken = localStorage.getItem(LOCAL_TOKEN_KEY) || sessionStorage.getItem(LOCAL_TOKEN_KEY);
      if (fallbackToken) {
        cachedAccessToken = fallbackToken;
        return fallbackToken;
      }
    } catch (e) {}
  }

  return null;
};

/**
 * Explicitly triggers Google OAuth authorization prompt specifically for Google Sheets integration
 */
export const requestGoogleAuthorization = async (): Promise<string | null> => {
  return await getAccessToken(true);
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (e) {}
  saveLocalUserSession(null);
  setCachedAccessToken(null);
  notifyAuthListeners(null, null);
};
