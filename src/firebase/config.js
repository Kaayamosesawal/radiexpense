import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  EmailAuthProvider,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ─── App ──────────────────────────────────────────────────────────────────────
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = getAuth(app);

// Provider 1: Google
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Provider 2: Email / Password
// EmailAuthProvider itself is the provider — no extra config needed.
// Export it so components can call EmailAuthProvider.credential(email, password)
// for re-authentication flows (e.g. before sensitive operations).
export const emailProvider = new EmailAuthProvider();

// ─── Firestore ────────────────────────────────────────────────────────────────
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  // Already initialised (e.g. hot-reload) — fall back to the existing instance
  db = getFirestore(app);
}
export { db };

// ─── Messaging (FCM) ─────────────────────────────────────────────────────────
// Resolved lazily; null in environments that don't support the API (e.g. Safari < 16)
export const messaging = isSupported()
  .then((supported) => (supported ? getMessaging(app) : null))
  .catch(() => null);

export default app;