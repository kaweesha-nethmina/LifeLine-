import NotificationService from '../services/notificationService';
import { NOTIFICATION_TYPES } from '../constants';

/**
 * Utility functions for testing notification functionality
 * These functions create sample notifications for development and testing
 */

/**
 * Create sample notifications for a user
 * @param {string} userId - User ID to create notifications for
 */
export const createSampleNotifications = async (userId) => {
  try {
    console.log('Creating sample notifications for user:', userId);
    
    const sampleNotifications = [
      {
        title: 'Appointment Confirmed',
        message: 'Your appointment with Dr. Sarah Johnson has been confirmed for tomorrow at 10:00 AM',
        type: NOTIFICATION_TYPES.APPOINTMENT,
        category: 'appointment',
        priority: 'high',
        data: {
          doctorName: 'Dr. Sarah Johnson',
          appointmentDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          appointmentTime: '10:00 AM',
          appointmentId: 'apt_sample_1'
        }
      },
      {
        title: 'Medication Reminder',
        message: 'Time to take your daily vitamins! Don\'t forget your evening dose.',
        type: NOTIFICATION_TYPES.REMINDER,
        category: 'health',
        priority: 'normal',
        data: {
          medicationName: 'Daily Vitamins',
          dosageTime: 'Evening'
        }
      },
      {
        title: 'Lab Results Available',
        message: 'Your blood test results from last week are now available in your health records.',
        type: NOTIFICATION_TYPES.HEALTH_TIP,
        category: 'health',
        priority: 'normal',
        data: {
          reportType: 'Blood Test',
          reportId: 'lab_001'
        }
      },
      {
        title: 'New Message from Dr. Chen',
        message: 'Dr. Michael Chen has sent you a message regarding your recent consultation.',
        type: NOTIFICATION_TYPES.CONSULTATION,
        category: 'consultation',
        priority: 'high',
        data: {
          doctorName: 'Dr. Michael Chen',
          messageId: 'msg_001'
        }
      },
      {
        title: 'Emergency Contact Updated',
        message: 'Your emergency contact information has been successfully updated.',
        type: NOTIFICATION_TYPES.REMINDER,
        category: 'system',
        priority: 'low',
        data: {
          updateType: 'emergency_contact'
        }
      }
    ];

    const createdNotifications = [];
    
    for (const notificationData of sampleNotifications) {
      try {
        const notification = await NotificationService.createNotification(userId, notificationData);
        createdNotifications.push(notification);
        console.log('Created sample notification:', notification.title);
      } catch (error) {
        console.error('Error creating sample notification:', error);
      }
    }
    
    console.log(`Created ${createdNotifications.length} sample notifications`);
    return createdNotifications;
    
  } catch (error) {
    console.error('Error creating sample notifications:', error);
    throw error;
  }
};

/**
 * Create an emergency notification for testing
 * @param {string} userId - User ID to create notification for
 */
export const createEmergencyNotification = async (userId) => {
  try {
    const emergencyData = {
      id: 'emergency_' + Date.now(),
      location: 'Sample Location',
      message: 'Emergency assistance has been requested. Help is on the way.',
      severity: 'high',
      timestamp: new Date().toISOString()
    };
    
    return await NotificationService.createEmergencyNotification(userId, emergencyData);
  } catch (error) {
    console.error('Error creating emergency notification:', error);
    throw error;
  }
};

/**
 * Create an appointment notification for testing
 * @param {string} userId - User ID to create notification for
 * @param {string} type - Type of appointment notification (created, confirmed, cancelled, etc.)
 */
export const createAppointmentNotification = async (userId, type = 'created') => {
  try {
    const appointmentData = {
      id: 'apt_' + Date.now(),
      doctorName: 'Dr. Test Doctor',
      appointmentDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      appointmentTime: '2:00 PM',
      specialization: 'General Practitioner'
    };
    
    return await NotificationService.createAppointmentNotification(userId, appointmentData, type);
  } catch (error) {
    console.error('Error creating appointment notification:', error);
    throw error;
  }
};

/**
 * Clean up all notifications for a user (for testing)
 * @param {string} userId - User ID to clean notifications for
 */
export const cleanupAllNotifications = async (userId) => {
  try {
    const deletedCount = await NotificationService.deleteAllUserNotifications(userId);
    console.log(`Cleaned up ${deletedCount} notifications for user:`, userId);
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    throw error;
  }
};

/**
 * Test notification system with various operations (without index requirements)
 * @param {string} userId - User ID to test with
 */
export const testNotificationSystem = async (userId) => {
  try {
    console.log('=== Testing Notification System (No Index Required) ===');
    
    // 1. Create sample notifications
    console.log('1. Creating sample notifications...');
    const notifications = await createSampleNotifications(userId);
    
    // 2. Test getUserNotifications (uses in-memory sorting)
    console.log('2. Testing getUserNotifications (in-memory sorting)...');
    const userNotifications = await NotificationService.getUserNotifications(userId, {
      limitCount: 10
    });
    console.log('Retrieved notifications (sorted in memory):', userNotifications.length);
    
    // 3. Get unread count
    console.log('3. Getting unread count...');
    const unreadCount = await NotificationService.getUnreadCount(userId);
    console.log('Unread notifications:', unreadCount);
    
    // 4. Mark first notification as read
    if (notifications.length > 0) {
      console.log('4. Marking first notification as read...');
      await NotificationService.markAsRead(notifications[0].id);
    }
    
    // 5. Create emergency notification
    console.log('5. Creating emergency notification...');
    await createEmergencyNotification(userId);
    
    // 6. Test subscription (also uses in-memory sorting)
    console.log('6. Testing real-time subscription (in-memory sorting)...');
    const unsubscribe = NotificationService.subscribeToUserNotifications(
      userId,
      (updatedNotifications) => {
        console.log('Real-time update received:', updatedNotifications.length, 'notifications');
        
        // Verify sorting (newest first)
        if (updatedNotifications.length > 1) {
          const isProperlysorted = updatedNotifications.every((notification, index) => {
            if (index === 0) return true;
            const current = new Date(notification.timestamp);
            const previous = new Date(updatedNotifications[index - 1].timestamp);
            return current <= previous;
          });
          console.log('Notifications properly sorted (newest first):', isProperlysorted);
        }
        
        // Unsubscribe after first update
        unsubscribe();
      },
      { limitCount: 10 }
    );
    
    // 7. Get updated unread count
    console.log('7. Getting updated unread count...');
    const newUnreadCount = await NotificationService.getUnreadCount(userId);
    console.log('New unread notifications:', newUnreadCount);
    
    console.log('=== Notification System Test Complete (Success - No Index Required) ===');
    
  } catch (error) {
    console.error('Error testing notification system:', error);
    throw error;
  }
};

export default {
  createSampleNotifications,
  createEmergencyNotification,
  createAppointmentNotification,
  cleanupAllNotifications,
  testNotificationSystem
};