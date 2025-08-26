import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  NOTIFICATION_TYPES
} from '../constants';
import Card from '../components/Card';
import useNotifications from '../hooks/useNotifications';

const NotificationsScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const [filter, setFilter] = useState('all'); // all, unread, appointment, health
  
  // Use the custom notifications hook
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead: hookMarkAllAsRead,
    deleteNotification: hookDeleteNotification,
    refresh,
    hasUnread
  } = useNotifications({
    autoRefresh: true,
    limitCount: 100
  });
  
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      Alert.alert('Error', 'Failed to refresh notifications');
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!hasUnread) return;
    
    try {
      const updatedCount = await hookMarkAllAsRead();
      Alert.alert('Success', `All ${updatedCount} notifications marked as read`);
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await hookDeleteNotification(notificationId);
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          }
        }
      ]
    );
  };

  const handleNotificationPress = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case NOTIFICATION_TYPES.APPOINTMENT:
        navigation.navigate('Consultation');
        break;
      case NOTIFICATION_TYPES.CONSULTATION:
        // For chat notifications, we need to determine the correct navigation based on user role
        const { doctorId, patientId, doctorName, patientName } = notification.data || {};
        
        // Validate required parameters
        if (!doctorId || !patientId) {
          console.warn('Missing required parameters for chat notification');
          navigation.navigate('Consultation');
          return;
        }
        
        navigation.navigate('Consultation', { 
          screen: 'Chat',
          params: {
            doctorId,
            doctorName: doctorName || 'Doctor',
            patientId,
            patientName: patientName || 'Patient'
          }
        });
        break;
      case NOTIFICATION_TYPES.REMINDER:
        // Show reminder details
        Alert.alert('Reminder', notification.message);
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.APPOINTMENT:
        return 'calendar';
      case NOTIFICATION_TYPES.EMERGENCY:
        return 'warning';
      case NOTIFICATION_TYPES.REMINDER:
        return 'alarm';
      case NOTIFICATION_TYPES.HEALTH_TIP:
        return 'heart';
      case NOTIFICATION_TYPES.CONSULTATION:
        return 'chatbubble';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.APPOINTMENT:
        return COLORS.PRIMARY;
      case NOTIFICATION_TYPES.EMERGENCY:
        return COLORS.EMERGENCY;
      case NOTIFICATION_TYPES.REMINDER:
        return COLORS.WARNING;
      case NOTIFICATION_TYPES.HEALTH_TIP:
        return COLORS.SUCCESS;
      case NOTIFICATION_TYPES.CONSULTATION:
        return COLORS.INFO;
      default:
        return COLORS.GRAY_MEDIUM;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'appointment':
        return notification.type === NOTIFICATION_TYPES.APPOINTMENT;
      case 'health':
        return notification.type === NOTIFICATION_TYPES.HEALTH_TIP || 
               notification.type === NOTIFICATION_TYPES.REMINDER;
      default:
        return true;
    }
  });

  const NotificationCard = ({ notification }) => {
    const timeAgo = getTimeAgo(notification.timestamp);
    const iconName = getNotificationIcon(notification.type);
    const iconColor = getNotificationColor(notification.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !notification.read && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.notificationIcon, { backgroundColor: iconColor }]}>
            <Ionicons name={iconName} size={20} color={COLORS.WHITE} />
          </View>
          
          <View style={styles.notificationText}>
            <Text style={[
              styles.notificationTitle,
              !notification.read && styles.unreadTitle
            ]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
            <Text style={styles.notificationTime}>{timeAgo}</Text>
          </View>
          
          {!notification.read && <View style={styles.unreadDot} />}
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteNotification(notification.id)}
        >
          <Ionicons name="close" size={20} color={COLORS.GRAY_MEDIUM} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ title, value, active, onPress }) => (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.activeFilterButton]}
      onPress={onPress}
    >
      <Text style={[
        styles.filterButtonText,
        active && styles.activeFilterButtonText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton
            title={`All (${notifications.length})`}
            value="all"
            active={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <FilterButton
            title={`Unread (${unreadCount})`}
            value="unread"
            active={filter === 'unread'}
            onPress={() => setFilter('unread')}
          />
          <FilterButton
            title="Appointments"
            value="appointment"
            active={filter === 'appointment'}
            onPress={() => setFilter('appointment')}
          />
          <FilterButton
            title="Health"
            value="health"
            active={filter === 'health'}
            onPress={() => setFilter('health')}
          />
        </ScrollView>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        /* Notifications List */
        <ScrollView
          style={styles.notificationsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredNotifications.length === 0 ? (
            <Card style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={64} color={COLORS.GRAY_MEDIUM} />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'all' 
                  ? "You're all caught up! No new notifications."
                  : `No ${filter} notifications to display.`
                }
              </Text>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// Helper function to calculate time ago
const getTimeAgo = (timestamp) => {
  const now = new Date();
  const notificationTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now - notificationTime) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return notificationTime.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  unreadBadge: {
    backgroundColor: COLORS.EMERGENCY,
    borderRadius: BORDER_RADIUS.CIRCLE,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.SM,
  },
  unreadBadgeText: {
    color: COLORS.WHITE,
    fontSize: FONT_SIZES.XS,
    fontWeight: 'bold',
  },
  markAllButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: BORDER_RADIUS.SM,
  },
  markAllText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  filterButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.XL,
    marginRight: SPACING.SM,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  activeFilterButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: COLORS.WHITE,
  },
  notificationsList: {
    flex: 1,
    padding: SPACING.MD,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.XL,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.XXL,
    marginTop: SPACING.XL,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 18,
    marginBottom: SPACING.XS / 2,
  },
  notificationTime: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
    marginLeft: SPACING.SM,
    marginTop: SPACING.XS,
  },
  deleteButton: {
    padding: SPACING.XS,
    marginLeft: SPACING.SM,
  },
});

export default NotificationsScreen;