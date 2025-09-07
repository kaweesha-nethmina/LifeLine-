import { useState, useEffect, useCallback } from 'react';
import NotificationService from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for managing user notifications
 * Provides real-time updates and notification management functions
 */
export const useNotifications = (options = {}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    autoRefresh = true,
    limitCount = 50,
    unreadOnly = false,
    type = null
  } = options;

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const userNotifications = await NotificationService.getUserNotifications(
        user.uid,
        { limitCount, unreadOnly, type }
      );
      
      setNotifications(userNotifications);
      
      // Get unread count if not filtering for unread only
      if (!unreadOnly) {
        const count = await NotificationService.getUnreadCount(user.uid);
        setUnreadCount(count);
      } else {
        setUnreadCount(userNotifications.length);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, limitCount, unreadOnly, type]);

  // Set up real-time listener
  useEffect(() => {
    if (!user?.uid || !autoRefresh) {
      loadNotifications();
      return;
    }

    console.log('Setting up notification listener for user:', user.uid);
    
    const unsubscribe = NotificationService.subscribeToUserNotifications(
      user.uid,
      (updatedNotifications) => {
        setNotifications(updatedNotifications);
        const count = updatedNotifications.filter(n => !n.read).length;
        setUnreadCount(count);
        setLoading(false);
        setError(null);
      },
      { limitCount, unreadOnly, type }
    );

    return unsubscribe;
  }, [user?.uid, autoRefresh, limitCount, unreadOnly, type, loadNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      // Optimistically update UI
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true, readAt: new Date() }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Update in Firebase
      await NotificationService.markAsRead(notificationId);
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Revert optimistic update
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: false, readAt: null }
            : notification
        )
      );
      setUnreadCount(prev => prev + 1);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Optimistically update UI
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true, readAt: new Date() }))
      );
      setUnreadCount(0);
      
      // Update in Firebase
      const updatedCount = await NotificationService.markAllAsRead(user.uid);
      return updatedCount;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Revert optimistic update
      loadNotifications();
      throw err;
    }
  }, [user?.uid, notifications, loadNotifications]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const notificationToDelete = notifications.find(n => n.id === notificationId);
      
      // Optimistically update UI
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notificationToDelete && !notificationToDelete.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Delete from Firebase
      await NotificationService.deleteNotification(notificationId);
    } catch (err) {
      console.error('Error deleting notification:', err);
      // Revert optimistic update
      loadNotifications();
      throw err;
    }
  }, [notifications, loadNotifications]);

  // Create new notification
  const createNotification = useCallback(async (targetUserId, notificationData) => {
    try {
      const newNotification = await NotificationService.createNotification(
        targetUserId,
        notificationData
      );
      
      // If creating notification for current user, update local state
      if (targetUserId === user?.uid) {
        setNotifications(prev => [newNotification, ...prev]);
        if (!newNotification.read) {
          setUnreadCount(prev => prev + 1);
        }
      }
      
      return newNotification;
    } catch (err) {
      console.error('Error creating notification:', err);
      throw err;
    }
  }, [user?.uid]);

  // Refresh notifications
  const refresh = useCallback(() => {
    return loadNotifications();
  }, [loadNotifications]);

  // Clean up expired notifications
  const cleanupExpired = useCallback(async () => {
    if (!user?.uid) return 0;
    
    try {
      const deletedCount = await NotificationService.cleanupExpiredNotifications(user.uid);
      if (deletedCount > 0) {
        await loadNotifications();
      }
      return deletedCount;
    } catch (err) {
      console.error('Error cleaning up expired notifications:', err);
      throw err;
    }
  }, [user?.uid, loadNotifications]);

  return {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    
    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    refresh,
    cleanupExpired,
    
    // Utils
    hasUnread: unreadCount > 0,
    isEmpty: notifications.length === 0
  };
};

export default useNotifications;