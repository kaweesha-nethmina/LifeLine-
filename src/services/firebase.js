import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
// Note: Firebase Storage is replaced by Supabase Storage
import { Platform } from 'react-native';

// Platform-specific Firebase configuration
const getFirebaseConfig = () => {
  const baseConfig = {
    authDomain: "lifelineplus-b7c27.firebaseapp.com",
    projectId: "lifelineplus-b7c27",
    storageBucket: "lifelineplus-b7c27.firebasestorage.app",
    messagingSenderId: "860802675389"
  };

  if (Platform.OS === 'ios') {
    return {
      ...baseConfig,
      apiKey: "AIzaSyDCtwP2ms353zEdlhvDVrKR8e06Rfn50iw",
      appId: "1:860802675389:ios:71643b56576cebe486bdd4"
    };
  } else if (Platform.OS === 'android') {
    return {
      ...baseConfig,
      apiKey: "AIzaSyDY2o-E6kfxIN8YJs_3hcMRSTCsHCQ7LS4",
      appId: "1:860802675389:android:b5bb365360e42c2e86bdd4"
    };
  } else {
    // Fallback for web or other platforms - use iOS config
    return {
      ...baseConfig,
      apiKey: "AIzaSyDCtwP2ms353zEdlhvDVrKR8e06Rfn50iw",
      appId: "1:860802675389:ios:71643b56576cebe486bdd4"
    };
  }
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase only once
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log(`Firebase app initialized for ${Platform.OS} with real services`);
  console.log('Using API Key:', firebaseConfig.apiKey.substring(0, 10) + '...');
} else {
  app = getApps()[0];
  console.log(`Using existing Firebase app for ${Platform.OS}`);
}

// Initialize Firebase services with error handling
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
  console.log('Firebase Auth initialized with AsyncStorage persistence');
} catch (error) {
  // If auth is already initialized, get the existing instance
  if (error.code === 'auth/already-initialized') {
    const { getAuth } = require('firebase/auth');
    auth = getAuth(app);
    console.log('Using existing Firebase Auth instance');
  } else {
    console.error('Firebase Auth initialization error:', error);
    throw error;
  }
}

const db = getFirestore(app);
// Note: Using Supabase Storage instead of Firebase Storage

// Export Firebase functions directly from the SDK
export {
  // Auth functions
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

export {
  // Firestore functions
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';

// Note: Firebase Storage functions removed - using Supabase Storage instead
// For file uploads, use supabaseStorage from '../services/supabase'

console.log(`Real Firebase services initialized successfully for ${Platform.OS}`);

export { auth, db };
export default app;
