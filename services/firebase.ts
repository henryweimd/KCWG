import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/analytics';

// Configuration is now retrieved from environment variables for security.
// Ensure these variables are set in your deployment environment.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

let app;
let auth: firebase.auth.Auth;
let db: firebase.firestore.Firestore;
let googleProvider: firebase.auth.GoogleAuthProvider;
let analytics: firebase.analytics.Analytics;

try {
  // Only attempt initialization if the API key is present
  if (firebaseConfig.apiKey) {
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.app();
    }
    
    auth = firebase.auth();
    db = firebase.firestore();
    
    if (typeof window !== 'undefined') {
      try {
        analytics = firebase.analytics();
      } catch (e) {
        console.warn("Firebase Analytics could not be initialized:", e);
      }
    }
    
    googleProvider = new firebase.auth.GoogleAuthProvider();
    console.log("Firebase initialized successfully with secure environment variables.");
  } else {
    console.warn("Firebase API key not found in environment variables. Cloud features (Sync/Firestore) will be unavailable.");
  }
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

export { auth, db, googleProvider };
export default firebase;