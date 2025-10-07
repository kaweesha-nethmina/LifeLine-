import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import PushNotificationService from '../services/pushNotificationService';

/**
 * Custom hook for managing push notifications
 * Handles notification permissions, token management, and notification listeners
 */
const usePushNotifications = () => {
  const { user } = useAuth();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Initialize push notifications when user logs in
    const initializePushNotifications = async () => {
      if (user) {
        const pushToken = await PushNotificationService.requestPermissions();
        if (pushToken) {
          await PushNotificationService.savePushTokenToProfile(pushToken);
        }
      }
    };

    initializePushNotifications();

    // Handle notifications that are received while app is in foreground
    notificationListener.current = PushNotificationService.addNotificationReceivedListener(notification => {
      console.log('Foreground notification received:', notification);
      // Handle the notification (e.g., show in-app alert)
    });

    // Handle notifications that are tapped on by the user
    responseListener.current = PushNotificationService.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      const { data } = response.notification.request.content;
      
      // Handle different notification types
      switch (data?.type) {
        case 'appointment_reminder':
          // Navigate to appointments screen
          console.log('Appointment reminder tapped');
          break;
        case 'medication_reminder':
          // Navigate to medications screen
          console.log('Medication reminder tapped');
          break;
        case 'emergency_alert':
          // Navigate to emergency screen
          console.log('Emergency alert tapped');
          break;
        case 'chat_message':
          // Navigate to chat screen
          console.log('Chat message notification tapped');
          break;
        default:
          console.log('Unknown notification type tapped');
      }
    });

    // Cleanup listeners
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]);

  return {
    // Functions for scheduling different types of notifications
    scheduleAppointmentReminder: PushNotificationService.scheduleAppointmentReminder,
    scheduleMedicationReminder: PushNotificationService.scheduleMedicationReminder,
    sendPushNotification: PushNotificationService.sendPushNotification,
    cancelAllScheduledNotifications: PushNotificationService.cancelAllScheduledNotifications,
  };
};

export default usePushNotifications;