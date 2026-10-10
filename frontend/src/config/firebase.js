/**
 * Firebase Authentication Configuration
 * Provides Google Sign-In via Firebase Auth SDK.
 */
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() || 'AIzaSyBBglK3UXtYok6fcJTsL-e2Rk-SMtCdWYs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || 'aitravelagent-27ad0.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || 'aitravelagent-27ad0',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || 'aitravelagent-27ad0.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '376024911834',
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() || '1:376024911834:web:cf0146bb2e6e7eeb847ae3',
}

/**
 * Checks whether valid Firebase credentials have been configured.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
)

let authInstance = null

/**
 * Lazily returns the Firebase Auth instance if configured.
 */
export function getFirebaseAuth() {
  if (!isFirebaseConfigured) return null
  if (!authInstance) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    authInstance = getAuth(app)
  }
  return authInstance
}

/**
 * Initiates the Google Sign-In popup with Firebase Auth.
 * Returns normalized user profile data and the verified Firebase ID Token.
 */
export async function signInWithGoogleFirebase() {
  if (!isFirebaseConfigured) {
    const err = new Error('Firebase Auth is not yet configured in frontend/.env')
    err.code = 'FIREBASE_NOT_CONFIGURED'
    throw err
  }

  const auth = getFirebaseAuth()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const userCredential = await signInWithPopup(auth, provider)
  const user = userCredential.user
  const idToken = await user.getIdToken()

  return {
    credential: idToken,
    email: user.email,
    name: user.displayName || user.email?.split('@')[0],
    picture: user.photoURL,
    google_id: user.uid,
  }
}
