import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  type User as FirebaseUser 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { User } from '../types';

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const DRIVE_TOKEN_KEY = 'vaharai_ds_drive_token';
const DRIVE_USER_KEY = 'vaharai_ds_drive_user';

// In-memory + session cached token
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize cached token from storage on startup
try {
  if (typeof window !== 'undefined') {
    const savedToken = sessionStorage.getItem(DRIVE_TOKEN_KEY) || localStorage.getItem(DRIVE_TOKEN_KEY);
    if (savedToken) {
      cachedAccessToken = savedToken;
    }

    // Check if returning from a signInWithRedirect operation
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            setGoogleAccessToken(credential.accessToken);
            const userInfo = {
              email: result.user.email,
              displayName: result.user.displayName,
            };
            setGoogleDriveUser(userInfo);
            window.dispatchEvent(new CustomEvent('vaharai_db_updated', { detail: { action: 'DRIVE_CONNECTED' } }));
          }
        }
      })
      .catch((err) => {
        console.warn('Firebase redirect result check:', err);
      });
  }
} catch {
  // ignore storage errors
}

export const getGoogleDriveUser = (): { email?: string; displayName?: string } | null => {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(DRIVE_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  } catch {
    // ignore
  }
  return null;
};

export const setGoogleDriveUser = (user: { email?: string | null; displayName?: string | null } | null) => {
  try {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem(DRIVE_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(DRIVE_USER_KEY);
      }
    }
  } catch {
    // ignore
  }
};

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account',
});

export const initFirebaseAuth = (
  onSuccess?: (user: FirebaseUser, token: string) => void,
  onFail?: () => void
) => {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const token = getGoogleAccessToken();
      if (token) {
        if (onSuccess) onSuccess(fbUser, token);
      } else if (!isSigningIn) {
        if (onFail) onFail();
      }
    } else {
      if (!getGoogleAccessToken()) {
        if (onFail) onFail();
      }
    }
  });
};

export const signInWithGoogleDriveRedirect = async () => {
  await signInWithRedirect(auth, provider);
};

export const signInWithGoogleDrive = async (): Promise<{ user: { email?: string | null; displayName?: string | null }; accessToken: string }> => {
  isSigningIn = true;
  try {
    // Attempt standard Firebase Auth popup
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google Drive access token from credential');
    }
    setGoogleAccessToken(credential.accessToken);
    const userInfo = {
      email: result.user.email,
      displayName: result.user.displayName,
    };
    setGoogleDriveUser(userInfo);
    return { user: userInfo, accessToken: credential.accessToken };
  } catch (err: any) {
    console.warn('Firebase sign-in error, testing GIS fallback:', err);

    // If unauthorized-domain error or popup blocked, try Google Identity Services (GIS) token client if loaded
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const gisResult = await requestAccessTokenViaGis();
        return gisResult;
      } catch (gisErr: any) {
        console.error('GIS fallback also failed:', gisErr);
      }
    }

    if (err.code === 'auth/unauthorized-domain') {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'இந்த முகவரி';
      throw new Error(`டொமைன் (${host}) Firebase Authorized Domains இல் இணைக்கப்படவில்லை. Firebase Console -> Authentication -> Settings -> Authorized Domains இல் '${host}' ஐ சேர்க்கவும்.`);
    }

    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      throw new Error('பாப்-அப் சாளரம் மூடப்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும் அல்லது முழு பக்க திருப்பிவிடல் (Redirect) முறையைப் பயன்படுத்தவும்.');
    }

    throw err;
  } finally {
    isSigningIn = false;
  }
};

const requestAccessTokenViaGis = async (): Promise<{ user: { email: string; displayName: string }; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services library is not loaded.'));
      return;
    }
    const oAuthClientId = (firebaseConfig as any).oAuthClientId;
    if (!oAuthClientId) {
      reject(new Error('No oAuthClientId configured in firebase-applet-config.json'));
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: oAuthClientId,
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: async (resp: any) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
            return;
          }
          if (resp.access_token) {
            setGoogleAccessToken(resp.access_token);
            let email = 'Google Account';
            let displayName = 'Drive User';
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` },
              });
              if (res.ok) {
                const info = await res.json();
                email = info.email || email;
                displayName = info.name || displayName;
              }
            } catch {
              // fallback
            }
            const userInfo = { email, displayName };
            setGoogleDriveUser(userInfo);
            resolve({
              user: userInfo,
              accessToken: resp.access_token,
            });
          } else {
            reject(new Error('No access token received from Google Identity Services'));
          }
        },
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      reject(e);
    }
  });
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (typeof window !== 'undefined') {
      if (token) {
        sessionStorage.setItem(DRIVE_TOKEN_KEY, token);
        localStorage.setItem(DRIVE_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(DRIVE_TOKEN_KEY);
        localStorage.removeItem(DRIVE_TOKEN_KEY);
        localStorage.removeItem(DRIVE_USER_KEY);
      }
    }
  } catch {
    // ignore
  }
};

export const getGoogleAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    if (typeof window !== 'undefined') {
      const savedToken = sessionStorage.getItem(DRIVE_TOKEN_KEY) || localStorage.getItem(DRIVE_TOKEN_KEY);
      if (savedToken) {
        cachedAccessToken = savedToken;
        return savedToken;
      }
    }
  } catch {
    // ignore
  }
  return null;
};

export const isGoogleDriveAuthenticated = (): boolean => {
  return !!getGoogleAccessToken();
};

export const disconnectGoogleDrive = async () => {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  setGoogleAccessToken(null);
  setGoogleDriveUser(null);
};

// Application Session Storage (for DS Staff User ID / Password login)
const ACTIVE_SESSION_KEY = 'vaharai_ds_active_user';

export const getActiveUserSession = (): User | null => {
  try {
    const raw = sessionStorage.getItem(ACTIVE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setActiveUserSession = (user: User | null) => {
  if (user) {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
  }
};
