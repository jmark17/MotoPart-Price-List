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

// Helper to construct GoogleAuthProvider
export const getGoogleProvider = (includeWorkspaceScopes = false) => {
  const provider = new GoogleAuthProvider();
  if (includeWorkspaceScopes) {
    SCOPES.forEach((scope) => {
      provider.addScope(scope);
    });
  }
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
};

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory (never localStorage per security rules)
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In with popup. Handles both standard login and workspace token acquisition.
export const googleSignIn = async (
  requestWorkspaceScopes = false
): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = getGoogleProvider(requestWorkspaceScopes);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    const token =
      credential?.accessToken ||
      (result as any)._tokenResponse?.oauthAccessToken ||
      (result as any)._tokenResponse?.idToken ||
      null;

    if (token) {
      cachedAccessToken = token;
    }

    return { user: result.user, accessToken: token || '' };
  } catch (error: any) {
    console.error('Google Sign in error:', error);

    // If requesting workspace scopes failed with insufficient permissions, retry with basic Google profile
    if (requestWorkspaceScopes && (error.code === 'auth/invalid-credential' || error.code === 'auth/access-denied')) {
      try {
        const basicProvider = getGoogleProvider(false);
        const basicResult = await signInWithPopup(auth, basicProvider);
        return { user: basicResult.user, accessToken: '' };
      } catch (retryErr) {
        console.error('Retry basic Google Sign-in error:', retryErr);
      }
    }

    // Friendly, actionable error messages
    if (error.code === 'auth/popup-blocked') {
      throw new Error(
        'Sign-in popup was blocked by your browser. Please allow popups for this site or sign in using Email & Password below.'
      );
    }
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      throw new Error('Sign-in window was closed before completion. Please try again.');
    }
    if (error.code === 'auth/unauthorised-domain' || error.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      throw new Error(
        `Domain "${currentHost}" is not yet in Firebase Authorized Domains. You can sign in using Email & Password below!`
      );
    }
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error(
        'Google provider is not enabled in Firebase Authentication console. Please use Email & Password sign-in below!'
      );
    }
    if (error.code === 'auth/disallowed_useragent') {
      throw new Error(
        'Google OAuth blocks embedded WebViews. Please sign in using Email & Password below!'
      );
    }
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    }

    throw new Error(error.message || 'Google sign-in failed. Please try Email & Password below.');
  } finally {
    isSigningIn = false;
  }
};

// Explicit Workspace Token Request (e.g. When connecting Google Sheets)
export const requestWorkspaceAccess = async (): Promise<string | null> => {
  const res = await googleSignIn(true);
  return res?.accessToken || null;
};

// Email & Password Sign-In
export const emailSignIn = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Email sign in error:', error);
    throw error;
  }
};

// Email & Password Sign-Up with Display Name
export const emailSignUp = async (
  email: string,
  password: string,
  displayName?: string
): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName && displayName.trim()) {
      await updateProfile(userCredential.user, {
        displayName: displayName.trim(),
      });
    }
    return userCredential.user;
  } catch (error: any) {
    console.error('Email sign up error:', error);
    throw error;
  }
};

// Password Reset Email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error: any) {
    console.error('Email password reset error:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
