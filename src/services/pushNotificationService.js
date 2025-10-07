import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { auth } from './firebase';
import { db, doc, setDoc } from 'firebase/firestore';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Push Notification Service for LifeLine+ Healthcare App
 * Manages push notifications for appointments, emergencies, prescriptions, and chat messages
 */
class PushNotificationService {
  /**
   * Request permission to send push notifications
   */
  static async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      return await this.getPushToken();
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return null;
    }
  }

  /**
   * Get push notification token
   */
  static async getPushToken() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Get projectId from Constants
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || 
                       Constants?.expoConfig?.projectId ||
                       null; // Don't use fallback that isn't a valid UUID
      
      // Only pass projectId if it's available and valid
      let tokenResult;
      if (projectId) {
        tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
      } else {
        tokenResult = await Notifications.getExpoPushTokenAsync();
      }
      
      const token = tokenResult.data;
      console.log('Push token:', token);
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Save push token to user profile in Firebase
   */
  static async savePushTokenToProfile(token) {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user logged in, cannot save push token');
        return false;
      }

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { pushToken: token }, { merge: true });
      console.log('Push token saved to user profile');
      return true;
    } catch (error) {
      console.error('Error saving push token to profile:', error);
      return false;
    }
  }

  /**
   * Send push notification to a specific device token
   */
  static async sendPushNotification(token, title, body, data = {}) {
    try {
      // For Expo push notifications, we would typically send to a backend service
      // For now, we'll simulate by showing a local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Immediately
      });
      
      console.log('Push notification sent:', { token, title, body, data });
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Schedule appointment reminder
   */
  static async scheduleAppointmentReminder(appointmentData) {
    try {
      const trigger = new Date(appointmentData.date);
      // Schedule 1 hour before appointment
      trigger.setHours(trigger.getHours() - 1);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Appointment Reminder',
          body: `Your appointment with ${appointmentData.doctorName} is in 1 hour`,
          data: { 
            type: 'appointment_reminder',
            appointmentId: appointmentData.id,
            doctorName: appointmentData.doctorName
          },
          sound: 'default',
        },
        trigger,
      });
      
      console.log('Appointment reminder scheduled:', appointmentData);
      return true;
    } catch (error) {
      console.error('Error scheduling appointment reminder:', error);
      return false;
    }
  }

  /**
   * Schedule medication reminder
   */
  static async scheduleMedicationReminder(medicationData) {
    try {
      // Schedule daily at the specified time
      const [hours, minutes] = medicationData.time.split(':').map(Number);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Medication Reminder',
          body: `Time to take ${medicationData.name} (${medicationData.dosage})`,
          data: { 
            type: 'medication_reminder',
            medicationId: medicationData.id,
            medicationName: medicationData.name
          },
          sound: 'default',
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });
      
      console.log('Medication reminder scheduled:', medicationData);
      return true;
    } catch (error) {
      console.error('Error scheduling medication reminder:', error);
      return false;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllScheduledNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All scheduled notifications cancelled');
      return true;
    } catch (error) {
      console.error('Error cancelling scheduled notifications:', error);
      return false;
    }
  }

  /**
   * Handle notification response (when user taps on notification)
   */
  static addNotificationResponseReceivedListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      callback(response);
    });
  }

  /**
   * Handle foreground notifications
   */
  static addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      callback(notification);
    });
  }
}

export default PushNotificationService;