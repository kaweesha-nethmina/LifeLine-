import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../constants';
import videoCallNotificationService from '../services/videoCallNotificationService';

// Navigation Components
import AppTabNavigator from './AppTabNavigator';
import DoctorTabNavigator from './DoctorTabNavigator';
import EmergencyTabNavigator from './EmergencyTabNavigator';
import AuthNavigator from './AuthNavigator';

// Loading and Error Components
import LoadingScreen from '../screens/LoadingScreen';
import FirebaseError from '../components/FirebaseError';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, userProfile, loading, error } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const [notificationListener, setNotificationListener] = useState(null);
  const navigationRef = useRef();

  // Initialize video call notifications
  useEffect(() => {
    if (userProfile && navigationRef.current) {
      const userRole = userProfile.role || USER_ROLES.PATIENT;
      videoCallNotificationService.initializeForUser(
        userProfile.uid,
        userRole,
        navigationRef.current
      );
    }

    return () => {
      videoCallNotificationService.cleanup();
    };
  }, [userProfile]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    // Force re-render to retry Firebase initialization
    window.location?.reload?.() || require('react-native').DevSettings?.reload?.();
  };

  // Handle notification response (when user taps on notification)
  useEffect(() => {
    const listener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      const notification = response.notification;
      const data = notification.request.content.data;
      
      // Handle chat notifications
      if (data && data.type === 'chat_message') {
        // Extract chat parameters
        const { doctorId, patientId, doctorName, patientName } = data;
        
        // Validate required parameters
        if (doctorId && patientId) {
          // Navigate to chat screen
          // Note: This is a simplified approach. In a real app, you would need to
          // access the navigation container ref to navigate programmatically
          console.log('Would navigate to chat with:', { doctorId, patientId, doctorName, patientName });
        }
      }
    });

    setNotificationListener(listener);

    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  // Show Firebase error if there's a Firebase-related error
  if (error && (error.includes('Firebase') || error.includes('auth has not been registered'))) {
    return <FirebaseError error={error} onRetry={handleRetry} />;
  }

  // Determine which navigator to show based on user role
  const getMainNavigator = () => {
    if (!userProfile?.role) {
      return AppTabNavigator; // Default to patient interface
    }

    switch (userProfile.role) {
      case USER_ROLES.DOCTOR:
        return DoctorTabNavigator;
      case USER_ROLES.EMERGENCY_OPERATOR:
        return EmergencyTabNavigator;
      case USER_ROLES.PATIENT:
      default:
        return AppTabNavigator;
    }
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={getMainNavigator()} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;