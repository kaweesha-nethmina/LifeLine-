import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING } from '../constants';
import useNotifications from '../hooks/useNotifications';

/**
 * Notification Tab Icon with Unread Badge
 * Shows notification icon with unread count badge
 */
const NotificationTabIcon = ({ focused, color, size = 24 }) => {
  const { unreadCount } = useNotifications({ autoRefresh: true });

  return (
    <View style={styles.container}>
      <Ionicons 
        name={focused ? 'notifications' : 'notifications-outline'} 
        size={size} 
        color={color} 
      />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: COLORS.EMERGENCY,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.WHITE,
  },
  badgeText: {
    color: COLORS.WHITE,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default NotificationTabIcon;