import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';

const SimpleEmergencyDashboardScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Emergency Control Center</Text>
            <Text style={styles.operatorName}>
              Operator {userProfile?.firstName || 'Emergency'} {userProfile?.lastName || 'Operator'}
            </Text>
            <Text style={styles.shiftInfo}>Shift: {new Date().toLocaleDateString()} - Day Shift</Text>
          </View>
          <TouchableOpacity
            style={styles.alertButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications" size={24} color={COLORS.WHITE} />
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Statistics Grid */}
        <View style={styles.statisticsGrid}>
          <Card style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: COLORS.ERROR }]}>
                <Ionicons name="warning" size={20} color={COLORS.WHITE} />
              </View>
            </View>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Active Emergencies</Text>
            <Text style={styles.statSubtitle}>Needs immediate attention</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: COLORS.PRIMARY }]}>
                <Ionicons name="car-sport" size={20} color={COLORS.WHITE} />
              </View>
            </View>
            <Text style={styles.statValue}>8</Text>
            <Text style={styles.statLabel}>Dispatched Units</Text>
            <Text style={styles.statSubtitle}>Currently en route</Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <Card style={styles.quickActionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: COLORS.ERROR }]}
              onPress={() => Alert.alert('Emergency Alert', 'Broadcasting emergency alert to all units...')}
            >
              <Ionicons name="warning" size={24} color={COLORS.WHITE} />
              <Text style={styles.quickActionText}>Emergency Alert</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: COLORS.PRIMARY }]}
              onPress={() => navigation.navigate('Dispatch')}
            >
              <Ionicons name="car-sport" size={24} color={COLORS.WHITE} />
              <Text style={styles.quickActionText}>Dispatch Unit</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Active Emergencies */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Emergencies</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SOS')}>
              <Text style={styles.viewAllText}>View All (3)</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.SUCCESS} />
            <Text style={styles.emptyTitle}>No Active Emergencies</Text>
            <Text style={styles.emptySubtitle}>All emergencies have been handled</Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.LG,
    backgroundColor: theme.EMERGENCY,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: theme.WHITE,
    marginBottom: SPACING.XS,
  },
  operatorName: {
    fontSize: FONT_SIZES.MD,
    color: theme.WHITE,
    marginBottom: SPACING.XS / 2,
  },
  shiftInfo: {
    fontSize: FONT_SIZES.SM,
    color: theme.WHITE,
    opacity: 0.9,
  },
  alertButton: {
    position: 'relative',
    padding: SPACING.SM,
  },
  alertBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: theme.WARNING,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    fontSize: FONT_SIZES.XS,
    color: theme.WHITE,
    fontWeight: 'bold',
  },
  statisticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
  },
  statCard: {
    width: '48%',
    marginBottom: SPACING.MD,
    marginHorizontal: '1%',
    backgroundColor: theme.CARD_BACKGROUND,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  statSubtitle: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
  },
  quickActionsCard: {
    margin: SPACING.MD,
    marginTop: 0,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.SM,
  },
  quickActionText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    color: theme.WHITE,
    marginTop: SPACING.SM,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  viewAllText: {
    fontSize: FONT_SIZES.SM,
    color: theme.PRIMARY,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.XXL,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
  },
});

export default SimpleEmergencyDashboardScreen;