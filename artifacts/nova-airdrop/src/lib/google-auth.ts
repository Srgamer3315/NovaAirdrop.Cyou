import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../firebase-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export const getFirebaseAuth = (): Auth | null => {
  if (authInstance) return authInstance;
  try {
    if (!appInstance) {
      appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    }
    authInstance = getAuth(appInstance);
    return authInstance;
  } catch (err) {
    console.warn('Firebase Auth could not be initialized:', err);
    return null;
  }
};

// In-memory caching for access token (never in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
) => {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      if (onAuthFailure) onAuthFailure();
      return () => {};
    }

    return onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        if (cachedAccessToken) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else if (!isSigningIn) {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      } else {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    });
  } catch (err) {
    console.warn('Error setting up onAuthStateChanged listener:', err);
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Google Authentication is unavailable in this environment.');
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Sheets access token.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleLogout = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
  cachedAccessToken = null;
};
