import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { NOTIFICATION_TYPES } from '../constants';
import PushNotificationService from './pushNotificationService';

/**
 * Notification Service for Firebase Firestore
 * Manages user-specific notifications with real-time updates
 */
export class NotificationService {
  
  /**
   * Create a new notification for a specific user
   * @param {string} userId - Target user ID
   * @param {Object} notificationData - Notification details
   */
  static async createNotification(userId, notificationData) {
    try {
      const notification = {
        userId: userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || NOTIFICATION_TYPES.REMINDER,
        read: false,
        timestamp: serverTimestamp(),
        data: notificationData.data || {},
        priority: notificationData.priority || 'normal', // low, normal, high, urgent
        expiresAt: notificationData.expiresAt || null,
        actionUrl: notificationData.actionUrl || null,
        createdBy: notificationData.createdBy || 'system',
        category: notificationData.category || 'general'
      };

      const docRef = await addDoc(collection(db, 'notifications'), notification);
      console.log('Notification created with ID:', docRef.id);
      
      // Send push notification if user has a push token
      await this.sendPushNotification(userId, notificationData.title, notificationData.message, notificationData.data);
      
      return {
        id: docRef.id,
        ...notification,
        timestamp: new Date() // Convert serverTimestamp for immediate use
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to a user
   * @param {string} userId - Target user ID
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data
   */
  static async sendPushNotification(userId, title, body, data = {}) {
    try {
      // Get user's push token from their profile
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().pushToken) {
        const pushToken = userDoc.data().pushToken;
        console.log('Sending push notification to user:', userId);
        return await PushNotificationService.sendPushNotification(pushToken, title, body, data);
      } else {
        console.log('User does not have a push token, skipping push notification');
        return false;
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Create prescription-related notifications
   */
  static async createPrescriptionNotification(userId, prescriptionData) {
    const notificationData = {
      title: 'New Prescription',
      message: `Dr. ${prescriptionData.doctorName} has prescribed ${prescriptionData.medicationName}`,
      type: NOTIFICATION_TYPES.CONSULTATION,
      category: 'prescription',
      priority: 'normal',
      data: {
        prescriptionId: prescriptionData.id,
        doctorName: prescriptionData.doctorName,
        medicationName: prescriptionData.medicationName,
        dosage: prescriptionData.dosage,
        frequency: prescriptionData.frequency,
        prescriptionDate: prescriptionData.createdAt,
        type: 'prescription'
      },
      actionUrl: `/prescription/${prescriptionData.id}`
    };

    return this.createNotification(userId, notificationData);
  }

  /**
   * Create appointment-related notifications
   */
  static async createAppointmentNotification(userId, appointmentData, type = 'created') {
    const notificationData = {
      title: this.getAppointmentNotificationTitle(type),
      message: this.getAppointmentNotificationMessage(type, appointmentData),
      type: NOTIFICATION_TYPES.APPOINTMENT,
      category: 'appointment',
      priority: type === 'cancelled' ? 'high' : 'normal',
      data: {
        appointmentId: appointmentData.id,
        doctorName: appointmentData.doctorName,
        appointmentDate: appointmentData.appointmentDate,
        appointmentTime: appointmentData.appointmentTime,
        type: type
      },
      actionUrl: `/consultation/${appointmentData.id}`
    };

    return this.createNotification(userId, notificationData);
  }

  /**
   * Create emergency notifications
   */
  static async createEmergencyNotification(userId, emergencyData) {
    const notificationData = {
      title: 'Emergency Alert',
      message: emergencyData.message || 'Emergency assistance has been requested',
      type: NOTIFICATION_TYPES.EMERGENCY,
      category: 'emergency',
      priority: 'urgent',
      data: {
        emergencyId: emergencyData.id,
        location: emergencyData.location,
        timestamp: emergencyData.timestamp
      },
      actionUrl: `/emergency/${emergencyData.id}`
    };

    return this.createNotification(userId, notificationData);
  }

  /**
   * Create prescription reminder notifications
   */
  static async createPrescriptionReminderNotification(userId, prescriptionData) {
    const notificationData = {
      title: 'Medication Reminder',
      message: `Time to take ${prescriptionData.medication} (${prescriptionData.dosage})`,
      type: NOTIFICATION_TYPES.REMINDER,
      category: 'medication',
      priority: 'normal',
      data: {
        prescriptionId: prescriptionData.id,
        medication: prescriptionData.medication,
        dosage: prescriptionData.dosage,
        frequency: prescriptionData.frequency,
        time: prescriptionData.time
      },
      actionUrl: `/prescription/${prescriptionData.id}`
    };

    return this.createNotification(userId, notificationData);
  }

  /**
   * Create chat message notifications
   */
  static async createChatMessageNotification(userId, messageData) {
    // Prepare notification data with conditional fields
    const notificationData = {
      title: 'New Message',
      message: `${messageData.senderName}: ${messageData.text.substring(0, 50)}${messageData.text.length > 50 ? '...' : ''}`,
      type: NOTIFICATION_TYPES.CONSULTATION,
      category: 'chat',
      priority: 'normal',
      data: {
        type: 'chat_message',
        messageId: messageData.id,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        doctorId: messageData.doctorId,
        patientId: messageData.patientId,
        doctorName: messageData.doctorName,
        patientName: messageData.patientName
      }
    };

    // Only include appointmentId if it exists (for appointment-based chats)
    if (messageData.appointmentId) {
      notificationData.data.appointmentId = messageData.appointmentId;
      notificationData.actionUrl = `/chat/${messageData.appointmentId}`;
    } 
    // For direct messaging, use chatId if available
    else if (messageData.chatId) {
      notificationData.data.chatId = messageData.chatId;
      notificationData.actionUrl = `/chat/direct/${messageData.chatId}`;
    }

    return this.createNotification(userId, notificationData);
  }

  /**
   * Schedule appointment reminder
   */
  static async scheduleAppointmentReminder(userId, appointmentData) {
    try {
      // Get user's push token
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().pushToken) {
        const pushToken = userDoc.data().pushToken;
        
        // Schedule push notification 1 hour before appointment
        const appointmentDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
        // Validate that the date is valid
        if (isNaN(appointmentDateTime.getTime())) {
          console.error('Invalid appointment date/time:', appointmentData.appointmentDate, appointmentData.appointmentTime);
          return false;
        }
        
        const reminderTime = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000); // 1 hour before
        
        await PushNotificationService.scheduleAppointmentReminder({
          id: appointmentData.id,
          date: reminderTime,
          doctorName: appointmentData.doctorName
        });
        
        console.log('Appointment reminder scheduled for user:', userId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error scheduling appointment reminder:', error);
      return false;
    }
  }

  /**
   * Schedule prescription reminder
   */
  static async schedulePrescriptionReminder(userId, prescriptionData) {
    try {
      // Get user's push token
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().pushToken) {
        const pushToken = userDoc.data().pushToken;
        
        // Schedule daily medication reminder
        await PushNotificationService.scheduleMedicationReminder({
          id: prescriptionData.id,
          name: prescriptionData.medication,
          dosage: prescriptionData.dosage,
          time: prescriptionData.time
        });
        
        console.log('Prescription reminder scheduled for user:', userId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error scheduling prescription reminder:', error);
      return false;
    }
  }

  /**
   * Get notifications for a specific user with filtering options
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   */
  static async getUserNotifications(userId, options = {}) {
    try {
      const {
        unreadOnly = false,
        type = null,
        limitCount = 50,
        category = null
      } = options;

      let q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );

      // Add filters
      if (unreadOnly) {
        q = query(q, where('read', '==', false));
      }

      if (type) {
        q = query(q, where('type', '==', type));
      }

      if (category) {
        q = query(q, where('category', '==', category));
      }

      // Add ordering and limit - Remove orderBy to avoid index requirement
      // We'll sort in memory instead
      // q = query(q, orderBy('timestamp', 'desc'), limit(limitCount));

      const snapshot = await getDocs(q);
      const notifications = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp ? 
            (typeof data.timestamp.toDate === 'function' ? data.timestamp.toDate() : data.timestamp) : 
            new Date()
        });
      });

      // Sort in memory by timestamp (newest first) and apply limit
      const sortedNotifications = notifications
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limitCount);

      return sortedNotifications;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   */
  static async getUnreadCount(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   * @param {string} notificationId - Notification ID
   */
  static async markAsRead(notificationId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
      console.log('Notification marked as read:', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   */
  static async markAllAsRead(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach((doc) => {
        batch.update(doc.ref, {
          read: true,
          readAt: serverTimestamp()
        });
      });

      await batch.commit();
      console.log(`Marked ${snapshot.size} notifications as read for user:`, userId);
      return snapshot.size;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   */
  static async deleteNotification(notificationId) {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      console.log('Notification deleted:', notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all notifications for a user
   * @param {string} userId - User ID
   */
  static async deleteAllUserNotifications(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Deleted ${snapshot.size} notifications for user:`, userId);
      return snapshot.size;
    } catch (error) {
      console.error('Error deleting all user notifications:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time notifications for a user
   * @param {string} userId - User ID
   * @param {Function} callback - Callback function for updates
   * @param {Object} options - Filter options
   */
  static subscribeToUserNotifications(userId, callback, options = {}) {
    try {
      const {
        unreadOnly = false,
        type = null,
        limitCount = 50
      } = options;

      let q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );

      if (unreadOnly) {
        q = query(q, where('read', '==', false));
      }

      if (type) {
        q = query(q, where('type', '==', type));
      }

      // Remove orderBy to avoid index requirement - sort in memory instead
      // q = query(q, orderBy('timestamp', 'desc'), limit(limitCount));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          notifications.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp ? 
              (typeof data.timestamp.toDate === 'function' ? data.timestamp.toDate() : data.timestamp) : 
              new Date()
          });
        });

        // Sort in memory by timestamp (newest first) and apply limit
        const sortedNotifications = notifications
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, limitCount);

        callback(sortedNotifications);
      }, (error) => {
        console.error('Error in notification subscription:', error);
        callback([]); // Return empty array on error
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      return () => {}; // Return dummy unsubscribe function
    }
  }

  /**
   * Subscribe to real-time appointment status updates
   * @param {string} appointmentId - Appointment ID
   * @param {Function} callback - Callback function for updates
   */
  static subscribeToAppointmentStatus(appointmentId, callback) {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      
      const unsubscribe = onSnapshot(appointmentRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const appointmentData = {
            id: doc.id,
            ...data,
            createdAt: data.createdAt ? 
              (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : data.createdAt) : 
              new Date(),
            updatedAt: data.updatedAt ? 
              (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : data.updatedAt) : 
              new Date()
          };
          callback(appointmentData);
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Error in appointment status subscription:', error);
        callback(null);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to appointment status:', error);
      return () => {}; // Return dummy unsubscribe function
    }
  }

  /**
   * Helper methods for notification content
   */
  static getAppointmentNotificationTitle(type) {
    switch (type) {
      case 'created': return 'Appointment Booked';
      case 'confirmed': return 'Appointment Confirmed';
      case 'cancelled': return 'Appointment Cancelled';
      case 'reminder': return 'Appointment Reminder';
      case 'completed': return 'Appointment Completed';
      default: return 'Appointment Update';
    }
  }

  static getAppointmentNotificationMessage(type, appointmentData) {
    const { doctorName, appointmentDate, appointmentTime } = appointmentData;
    
    switch (type) {
      case 'created':
        return `Your appointment with ${doctorName} has been scheduled for ${appointmentDate} at ${appointmentTime}`;
      case 'confirmed':
        return `Your appointment with ${doctorName} on ${appointmentDate} at ${appointmentTime} has been confirmed`;
      case 'cancelled':
        return `Your appointment with ${doctorName} on ${appointmentDate} at ${appointmentTime} has been cancelled`;
      case 'reminder':
        return `Reminder: You have an appointment with ${doctorName} today at ${appointmentTime}`;
      case 'completed':
        return `Your appointment with ${doctorName} has been completed. Please rate your experience.`;
      default:
        return `Your appointment with ${doctorName} has been updated`;
    }
  }

  /**
   * Clean up expired notifications
   * @param {string} userId - User ID (optional, if not provided cleans all expired)
   */
  static async cleanupExpiredNotifications(userId = null) {
    try {
      let q = query(
        collection(db, 'notifications'),
        where('expiresAt', '<=', new Date())
      );

      if (userId) {
        q = query(q, where('userId', '==', userId));
      }

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Cleaned up ${snapshot.size} expired notifications`);
      return snapshot.size;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }
}

export default NotificationService;