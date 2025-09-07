import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { USER_ROLES } from '../constants';
import PushNotificationService from '../services/pushNotificationService';

// Auth Context
const AuthContext = createContext();

// Auth Actions
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  LOGOUT: 'LOGOUT'
};

// Initial State
const initialState = {
  user: null,
  userProfile: null,
  loading: true,
  error: null
};

// Auth Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case AUTH_ACTIONS.SET_USER:
      return { 
        ...state, 
        user: action.payload.user, 
        userProfile: action.payload.profile,
        loading: false, 
        error: null 
      };
    case AUTH_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    case AUTH_ACTIONS.LOGOUT:
      return { ...state, user: null, userProfile: null, loading: false };
    default:
      return state;
  }
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    let unsubscribe = () => {};
    
    const initializeAuth = async () => {
      try {
        // Check if auth is properly initialized
        if (!auth) {
          throw new Error('Firebase Authentication is not initialized');
        }

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          try {
            if (user) {
              console.log('User authenticated:', user.uid);
              const userDocRef = doc(db, 'users', user.uid);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                const userProfile = userDoc.data();
                dispatch({
                  type: AUTH_ACTIONS.SET_USER,
                  payload: { user, profile: userProfile }
                });
              } else {
                console.log('User document does not exist, creating minimal profile');
                dispatch({
                  type: AUTH_ACTIONS.SET_USER,
                  payload: { user, profile: null }
                });
              }
            } else {
              console.log('User not authenticated');
              dispatch({ type: AUTH_ACTIONS.LOGOUT });
            }
          } catch (error) {
            console.error('Error in auth state change handler:', error);
            dispatch({
              type: AUTH_ACTIONS.SET_ERROR,
              payload: `Error loading user data: ${error.message}`
            });
          }
        });
      } catch (error) {
        console.error('Firebase auth initialization error:', error);
        
        // Check if this is a Firebase configuration issue
        if (error.message.includes('auth has not been registered') || 
            error.message.includes('Firebase Authentication is not initialized')) {
          dispatch({
            type: AUTH_ACTIONS.SET_ERROR,
            payload: 'Firebase Authentication service is not properly configured. Please enable Authentication in your Firebase console and ensure Email/Password provider is enabled.'
          });
        } else {
          dispatch({
            type: AUTH_ACTIONS.SET_ERROR,
            payload: `Firebase initialization error: ${error.message}`
          });
        }
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    initializeAuth();

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Register function
  const register = async (email, password, userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      // Check if Firebase is properly initialized
      if (!auth) {
        throw new Error('Firebase Authentication is not initialized. Please check your Firebase configuration.');
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update user profile
      await updateProfile(user, {
        displayName: `${userData.firstName} ${userData.lastName}`,
      });

      // Create user document in Firestore
      const userProfileData = {
        uid: user.uid,
        email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        role: userData.role,
        phone: userData.phone || '',
        dateOfBirth: userData.dateOfBirth || '',
        gender: userData.gender || '',
        address: userData.address || '',
        emergencyContact: userData.emergencyContact || '',
        bloodType: userData.bloodType || '',
        allergies: userData.allergies || [],
        medicalHistory: userData.medicalHistory || [],
        specialization: userData.specialization || null, // For doctors
        licenseNumber: userData.licenseNumber || null, // For doctors
        experience: userData.experience || null, // For doctors
        languages: userData.languages || ['en'],
        isVerified: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Filter out undefined values to prevent Firestore errors
      const userProfile = Object.fromEntries(
        Object.entries(userProfileData).filter(([_, value]) => value !== undefined)
      );

      await setDoc(doc(db, 'users', user.uid), userProfile);

      dispatch({
        type: AUTH_ACTIONS.SET_USER,
        payload: { user, profile: userProfile }
      });

      return { success: true, user };
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = error.message;
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('Firebase')) {
        errorMessage = 'Firebase service is not available. Please check your internet connection.';
      }
      
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user profile from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userProfile = userDoc.data();
        dispatch({
          type: AUTH_ACTIONS.SET_USER,
          payload: { user, profile: userProfile }
        });
        
        // Initialize push notifications
        const pushToken = await PushNotificationService.requestPermissions();
        if (pushToken) {
          await PushNotificationService.savePushTokenToProfile(pushToken);
        }
        
        return { success: true, user, profile: userProfile };
      } else {
        throw new Error('User profile not found');
      }
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      return { success: true };
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Update profile function
  const updateUserProfile = async (updates) => {
    try {
      if (!state.user) throw new Error('No user logged in');

      const userDocRef = doc(db, 'users', state.user.uid);
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await setDoc(userDocRef, updatedData, { merge: true });

      // Update local state
      const updatedProfile = { ...state.userProfile, ...updatedData };
      dispatch({
        type: AUTH_ACTIONS.SET_USER,
        payload: { user: state.user, profile: updatedProfile }
      });

      return { success: true };
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    user: state.user,
    userProfile: state.userProfile,
    loading: state.loading,
    error: state.error,
    register,
    login,
    logout,
    updateUserProfile,
    clearError,
    isPatient: state.userProfile?.role === USER_ROLES.PATIENT,
    isDoctor: state.userProfile?.role === USER_ROLES.DOCTOR,
    isEmergencyOperator: state.userProfile?.role === USER_ROLES.EMERGENCY_OPERATOR
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};