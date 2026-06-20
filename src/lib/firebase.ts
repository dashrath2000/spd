import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// 🔥 FIREBASE CONFIG
// Replace these values with your own Firebase project config.
// Go to: Firebase Console → Project Settings → Your Apps → Web App → Config
// ─────────────────────────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: "AIzaSyBJt13-QGdbVW5n1BOxLQNI_O3XqIE-56w",
  authDomain: "jew-pos-3e17b.firebaseapp.com",
  projectId: "jew-pos-3e17b",
  storageBucket: "jew-pos-3e17b.firebasestorage.app",
  messagingSenderId: "888143881238",
  appId: "1:888143881238:web:8550cbbc79a5bf36198137",
  measurementId: "G-E8C0N5R2SB"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export default app;

