import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { NotificationService } from '../../services/notificationService';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  CONSULTATION_STATUS
} from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';
import useProfilePicture from '../../hooks/useProfilePicture';

const DoctorDashboardScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { theme } = useTheme();
  const { fetchUserProfilePicture, getCachedProfilePicture } = useProfilePicture();
  const [dashboardData, setDashboardData] = useState({
    todayAppointments: [],
    pendingRequests: [],
    statistics: {
      todayAppointments: 0,
      weeklyAppointments: 0,
      totalPatients: 0,
      rating: 0
    },
    notifications: []
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Set up real-time updates
    const unsubscribeAppointments = setupAppointmentsListener();
    const unsubscribeNotifications = setupNotificationsListener();
    
    // Cleanup listeners on unmount
    return () => {
      if (unsubscribeAppointments) unsubscribeAppointments();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, []);

  const setupAppointmentsListener = () => {
    try {
      // Listen for doctor's appointments
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', userProfile.uid)
      );
      
      return onSnapshot(appointmentsQuery, (snapshot) => {
        const appointmentsData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          appointmentsData.push({
            id: doc.id,
            ...data,
            patientName: data.patientName || 'Unknown Patient',
            time: data.time || 'N/A',
            type: data.type || 'Consultation',
            reason: data.reason || 'No reason provided',
            timeAgo: data.timeAgo || 'Unknown time',
            appointmentDate: data.appointmentDate || null,
            appointmentTime: data.appointmentTime || null
          });
        });
        
        // Sort appointments by date
        appointmentsData.sort((a, b) => {
          const dateA = new Date(a.appointmentDate);
          const dateB = new Date(b.appointmentDate);
          return dateA - dateB;
        });
        
        // Get today's appointments
        const today = new Date().toDateString();
        const todaysAppointments = appointmentsData.filter(apt => {
          const aptDate = new Date(apt.appointmentDate).toDateString();
          return aptDate === today;
        }).map(apt => ({
          ...apt,
          patientName: apt.patientName || 'Unknown Patient',
          time: apt.time || 'N/A',
          type: apt.type || 'Consultation',
          reason: apt.reason || 'No reason provided',
          appointmentDate: apt.appointmentDate || null,
          appointmentTime: apt.appointmentTime || null
        }));
        
        // Get pending requests (pending appointments that need doctor confirmation)
        const pendingRequests = appointmentsData.filter(apt => 
          apt.status === CONSULTATION_STATUS.PENDING
        ).map(apt => ({
          ...apt,
          patientName: apt.patientName || 'Unknown Patient',
          type: apt.type || 'Consultation',
          timeAgo: apt.timeAgo || 'Unknown time',
          reason: apt.reason || 'No reason provided'
        }));
        
        setDashboardData(prev => ({
          ...prev,
          todayAppointments: todaysAppointments,
          pendingRequests: pendingRequests
        }));
        
        // Update statistics
        updateStatistics(appointmentsData);
      }, (error) => {
        console.error('Error listening to appointments:', error);
      });
    } catch (error) {
      console.error('Error setting up appointments listener:', error);
      return null;
    }
  };

  const setupNotificationsListener = () => {
    try {
      // Listen for doctor's notifications
      return NotificationService.subscribeToUserNotifications(
        userProfile.uid,
        (notifications) => {
          setDashboardData(prev => ({
            ...prev,
            notifications: (notifications || []).slice(0, 3) // Show only first 3 notifications
          }));
        },
        { limitCount: 3 }
      );
    } catch (error) {
      console.error('Error setting up notifications listener:', error);
      return null;
    }
  };

  const updateStatistics = (appointmentsData) => {
    try {
      // Calculate statistics
      const today = new Date().toDateString();
      const todaysAppointments = appointmentsData.filter(apt => {
        const aptDate = new Date(apt.appointmentDate).toDateString();
        return aptDate === today;
      });
      
      // Calculate weekly appointments (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyAppointments = appointmentsData.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate >= oneWeekAgo;
      });
      
      // Calculate total patients (unique patient IDs)
      const uniquePatients = [...new Set(appointmentsData.map(apt => apt.patientId))];
      
      const statistics = {
        todayAppointments: todaysAppointments.length || 0,
        weeklyAppointments: weeklyAppointments.length || 0,
        totalPatients: uniquePatients.length || 0,
        rating: userProfile?.rating || 0
      };
      
      setDashboardData(prev => ({
        ...prev,
        statistics: statistics
      }));
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load appointments
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', userProfile.uid)
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointmentsData = [];
      appointmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        appointmentsData.push({
          id: doc.id,
          ...data,
          patientName: data.patientName || 'Unknown Patient',
          time: data.time || 'N/A',
          type: data.type || 'Consultation',
          reason: data.reason || 'No reason provided',
          timeAgo: data.timeAgo || 'Unknown time',
          appointmentDate: data.appointmentDate || null,
          appointmentTime: data.appointmentTime || null,
          patientId: data.patientId || null
        });
      });
      
      // Sort appointments by date
      appointmentsData.sort((a, b) => {
        const dateA = new Date(a.appointmentDate);
        const dateB = new Date(b.appointmentDate);
        return dateA - dateB;
      });
      
      // Get today's appointments
      const today = new Date().toDateString();
      const todaysAppointments = appointmentsData.filter(apt => {
        const aptDate = new Date(apt.appointmentDate).toDateString();
        return aptDate === today;
      }).map(apt => ({
        ...apt,
        patientName: apt.patientName || 'Unknown Patient',
        time: apt.time || 'N/A',
        type: apt.type || 'Consultation',
        reason: apt.reason || 'No reason provided',
        appointmentDate: apt.appointmentDate || null,
        appointmentTime: apt.appointmentTime || null
      }));
      
      // Get pending requests (pending appointments that need doctor confirmation)
      const pendingRequests = appointmentsData.filter(apt => 
        apt.status === CONSULTATION_STATUS.PENDING
      ).map(apt => ({
        ...apt,
        patientName: apt.patientName || 'Unknown Patient',
        type: apt.type || 'Consultation',
        timeAgo: apt.timeAgo || 'Unknown time',
        reason: apt.reason || 'No reason provided'
      }));
      
      // Load notifications
      const notifications = await NotificationService.getUserNotifications(
        userProfile.uid,
        { limitCount: 3 }
      );
      
      // Calculate statistics
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyAppointments = appointmentsData.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate >= oneWeekAgo;
      });
      
      const uniquePatients = [...new Set(appointmentsData.map(apt => apt.patientId))];
      
      const statistics = {
        todayAppointments: todaysAppointments.length,
        weeklyAppointments: weeklyAppointments.length,
        totalPatients: uniquePatients.length,
        rating: userProfile?.rating || 0
      };
      
      setDashboardData({
        todayAppointments: todaysAppointments,
        pendingRequests: pendingRequests,
        statistics: statistics,
        notifications: notifications || []
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleEmergencyRequest = () => {
    Alert.alert(
      'Emergency Request',
      'You have received an emergency consultation request. Would you like to accept?',
      [
        { text: 'Decline', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            Alert.alert('Emergency Accepted', 'Connecting you to the emergency consultation...');
            // Navigate to emergency consultation
          }
        }
      ]
    );
  };

  const QuickActionCard = ({ title, subtitle, icon, color, onPress, badge }) => (
    <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: theme.CARD_BACKGROUND }]} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color={theme.WHITE} />
        {badge && badge > 0 && (
          <View style={styles.badge}>
            <Text style={[styles.badgeText, { color: theme.WHITE }]}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.actionTitle, { color: theme.TEXT_PRIMARY }]}>{title || 'Action'}</Text>
      <Text style={[styles.actionSubtitle, { color: theme.TEXT_SECONDARY }]}>{subtitle || 'Description'}</Text>
    </TouchableOpacity>
  );

  const StatisticCard = ({ label, value, icon, color, trend }) => (
    <Card style={[styles.statisticCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <View style={styles.statisticHeader}>
        <View style={[styles.statisticIcon, { backgroundColor: color }]}>
          <Ionicons name={icon} size={20} color={theme.WHITE} />
        </View>
        {trend && (
          <View style={styles.trendContainer}>
            <Ionicons 
              name={trend > 0 ? 'trending-up' : 'trending-down'} 
              size={16} 
              color={trend > 0 ? theme.SUCCESS : theme.ERROR} 
            />
            <Text style={[styles.trendText, { color: trend > 0 ? theme.SUCCESS : theme.ERROR }]}>
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.statisticValue, { color: theme.TEXT_PRIMARY }]}>{value}</Text>
      <Text style={[styles.statisticLabel, { color: theme.TEXT_SECONDARY }]}>{label}</Text>
    </Card>
  );

  const formatAppointmentDateTime = (appointmentDate, appointmentTime) => {
    // Handle potential invalid date or time values
    if (!appointmentDate || !appointmentTime) {
      return 'Date/Time not set';
    }
    
    // Try to create a proper date string
    try {
      const dateTimeString = `${appointmentDate}T${appointmentTime}`;
      const date = new Date(dateTimeString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        // Fallback to just showing the date and time separately
        return `${appointmentDate || 'Unknown Date'} at ${appointmentTime || 'Unknown Time'}`;
      }
      
      // Format the date properly
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      
      // Format the time properly
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return `${formattedDate} at ${formattedTime}`;
    } catch (error) {
      // Fallback to just showing the date and time separately
      return `${appointmentDate || 'Unknown Date'} at ${appointmentTime || 'Unknown Time'}`;
    }
  };

  const AppointmentCard = ({ appointment }) => {
    const [profilePicture, setProfilePicture] = useState(null);
    const [loadingProfilePicture, setLoadingProfilePicture] = useState(false);

    // Fetch profile picture when component mounts or when appointment.patientId changes
    useEffect(() => {
      const loadProfilePicture = async () => {
        if (appointment.patientId) {
          console.log('Loading profile picture for patient:', appointment.patientId);
          setLoadingProfilePicture(true);
          try {
            // First check if we have it cached
            const cachedPicture = getCachedProfilePicture(appointment.patientId);
            console.log('Cached picture:', cachedPicture);
            if (cachedPicture && cachedPicture !== null) {
              setProfilePicture(cachedPicture);
            } else {
              // Fetch from Firestore if not cached
              const pictureUrl = await fetchUserProfilePicture(appointment.patientId);
              console.log('Fetched picture URL:', pictureUrl);
              if (pictureUrl && pictureUrl !== null) {
                setProfilePicture(pictureUrl);
              } else {
                // Explicitly set to null if no picture found
                setProfilePicture(null);
              }
            }
          } catch (error) {
            console.error('Error loading profile picture:', error);
            // Set to null on error to show initials
            setProfilePicture(null);
          } finally {
            setLoadingProfilePicture(false);
          }
        }
      };

      loadProfilePicture();
    }, [appointment.patientId, getCachedProfilePicture, fetchUserProfilePicture]);

    return (
      <Card style={[styles.appointmentCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
        <View style={styles.appointmentHeader}>
          <View style={styles.patientInfo}>
            <View style={[styles.patientAvatar, { backgroundColor: theme.PRIMARY }]}>
              {profilePicture && profilePicture !== null ? (
                <Image 
                  source={{ uri: profilePicture }} 
                  style={styles.patientAvatarImage}
                  onError={() => {
                    console.log('Profile picture load error for patient:', appointment.patientId);
                    // Fallback to initials if image fails to load
                    setProfilePicture(null);
                  }}
                />
              ) : (
                <Text style={[styles.patientInitial, { color: theme.WHITE }]}>
                  {appointment.patientName ? appointment.patientName.charAt(0) : 'U'}
                </Text>
              )}
            </View>
            <View style={styles.appointmentDetails}>
              <Text style={[styles.patientName, { color: theme.TEXT_PRIMARY }]}>{appointment.patientName || 'Unknown Patient'}</Text>
              <Text style={[styles.appointmentTime, { color: theme.PRIMARY }]}>
                {formatAppointmentDateTime(appointment.appointmentDate, appointment.appointmentTime) || 'N/A'} • {appointment.type || 'Consultation'}
              </Text>
              <Text style={[styles.appointmentReason, { color: theme.TEXT_SECONDARY }]}>{appointment.symptoms || appointment.reason || 'No symptoms provided'}</Text>
            </View>
          </View>
          <View style={styles.appointmentActions}>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Appointments', { screen: 'AppointmentsMain' })}
            >
              <Ionicons name="calendar" size={20} color={theme.PRIMARY} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Consultations', { screen: 'ConsultationsMain' })}
            >
              <Ionicons name="chatbubble" size={20} color={theme.SUCCESS} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  const PendingRequestCard = ({ request }) => (
    <Card style={[styles.requestCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER, borderLeftColor: request.urgent ? theme.EMERGENCY : theme.WARNING }]}>
      <View style={styles.requestHeader}>
        <View style={[
          styles.urgencyIndicator, 
          { backgroundColor: request.urgent ? theme.EMERGENCY : theme.WARNING }
        ]}>
          <Ionicons 
            name={request.urgent ? "warning" : "time"} 
            size={16} 
            color={theme.WHITE} 
          />
        </View>
        <View style={styles.requestInfo}>
          <Text style={[styles.requestPatient, { color: theme.TEXT_PRIMARY }]}>{request.patientName || 'Unknown Patient'}</Text>
          <Text style={[styles.requestType, { color: theme.TEXT_SECONDARY }]}>{request.type || 'Consultation'} Request</Text>
          <Text style={[styles.requestTime, { color: theme.GRAY_MEDIUM }]}>{request.timeAgo || 'Unknown time'}</Text>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity 
            style={[styles.requestBtn, styles.acceptBtn, { backgroundColor: theme.SUCCESS }]}
            onPress={() => {
              Alert.alert(
                'Confirm Appointment',
                `Are you sure you want to confirm the appointment with ${request.patientName || 'this patient'}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Confirm',
                    onPress: async () => {
                      await updateAppointmentStatus(request.id, CONSULTATION_STATUS.CONFIRMED);
                      Alert.alert('Success', 'Appointment confirmed successfully');
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="checkmark" size={16} color={theme.WHITE} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.requestBtn, styles.declineBtn, { backgroundColor: theme.ERROR }]}
            onPress={() => {
              Alert.alert(
                'Decline Appointment',
                `Are you sure you want to decline the appointment with ${request.patientName || 'this patient'}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                      await updateAppointmentStatus(request.id, CONSULTATION_STATUS.CANCELLED);
                      Alert.alert('Success', 'Appointment declined successfully');
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="close" size={16} color={theme.WHITE} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.requestReason, { color: theme.TEXT_SECONDARY }]}>{request.reason || 'No reason provided'}</Text>
    </Card>
  );

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Get the appointment data to create notification
      const appointment = dashboardData.pendingRequests.find(a => a.id === appointmentId) || 
                         dashboardData.todayAppointments.find(a => a.id === appointmentId);
      
      if (appointment) {
        await NotificationService.createAppointmentNotification(
          appointment.patientId,
          appointment,
          newStatus
        );
      }
      
      console.log(`Appointment ${appointmentId} status updated to ${newStatus}`);
      // Refresh the data to reflect the changes
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      Alert.alert('Error', 'Failed to update appointment status');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      <ScrollView 
        style={styles.content} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.PRIMARY]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
          <View style={styles.welcomeContainer}>
            <Text style={[styles.welcomeText, { color: theme.TEXT_SECONDARY }]}>Good morning,</Text>
            <Text style={[styles.doctorName, { color: theme.TEXT_PRIMARY }]}>
              Dr. {userProfile?.firstName || ''} {userProfile?.lastName || ''}
            </Text>
            <Text style={[styles.specialization, { color: theme.PRIMARY }]}>{userProfile?.specialization || 'General Practitioner'}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Dashboard', { screen: 'Notifications' })}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.TEXT_PRIMARY} />
            <View style={[styles.notificationBadge, { backgroundColor: theme.ERROR }]}>
              <Text style={[styles.notificationBadgeText, { color: theme.WHITE }]}>
                {dashboardData.notifications.length || 0}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Emergency Alert */}
        <TouchableOpacity style={[styles.emergencyAlert, { backgroundColor: theme.EMERGENCY }]} onPress={handleEmergencyRequest}>
          <Ionicons name="warning" size={24} color={theme.WHITE} />
          <View style={styles.emergencyText}>
            <Text style={[styles.emergencyTitle, { color: theme.WHITE }]}>Emergency Standby</Text>
            <Text style={[styles.emergencySubtitle, { color: theme.WHITE }]}>Available for emergency consultations</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.WHITE} />
        </TouchableOpacity>

        {/* Statistics */}
        <View style={styles.statisticsGrid}>
          <StatisticCard
            label="Today's Appointments"
            value={dashboardData.statistics.todayAppointments || 0}
            icon="calendar"
            color={theme.PRIMARY}
            trend={12}
          />
          <StatisticCard
            label="This Week"
            value={dashboardData.statistics.weeklyAppointments || 0}
            icon="bar-chart"
            color={theme.SUCCESS}
            trend={-5}
          />
          <StatisticCard
            label="Total Patients"
            value={dashboardData.statistics.totalPatients || 0}
            icon="people"
            color={theme.INFO}
            trend={8}
          />
          <StatisticCard
            label="Rating"
            value={`${dashboardData.statistics.rating || 0}/5`}
            icon="star"
            color={theme.WARNING}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              title="My Schedule"
              subtitle="View appointments"
              icon="calendar-outline"
              color={theme.PRIMARY}
              onPress={() => navigation.navigate('Appointments', { screen: 'AppointmentsMain' })}
              badge={dashboardData.todayAppointments.length || 0}
            />
            <QuickActionCard
              title="Patients"
              subtitle="Manage patients"
              icon="people-outline"
              color={theme.SUCCESS}
              onPress={() => navigation.navigate('Patients', { screen: 'PatientsMain' })}
            />
            <QuickActionCard
              title="Consultations"
              subtitle="Video/Chat"
              icon="videocam-outline"
              color={theme.INFO}
              onPress={() => navigation.navigate('Consultations', { screen: 'ConsultationsMain' })}
            />
            <QuickActionCard
              title="Prescriptions"
              subtitle="Write prescriptions"
              icon="medical-outline"
              color={theme.WARNING}
              onPress={() => navigation.navigate('Patients', { screen: 'Prescriptions' })}
            />
          </View>
        </View>

        {/* Today's Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Today's Appointments</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Appointments', { screen: 'AppointmentsMain' })}>
              <Text style={[styles.viewAllText, { color: theme.PRIMARY }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {dashboardData.todayAppointments.length === 0 ? (
            <Card style={[styles.emptyState, { backgroundColor: theme.CARD_BACKGROUND }]}>
              <Ionicons name="calendar-outline" size={48} color={theme.GRAY_MEDIUM} />
              <Text style={[styles.emptyTitle, { color: theme.TEXT_PRIMARY }]}>No Appointments Today</Text>
              <Text style={[styles.emptySubtitle, { color: theme.TEXT_SECONDARY }]}>
                You have a free schedule today
              </Text>
            </Card>
          ) : (
            dashboardData.todayAppointments.slice(0, 3).map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </View>

        {/* Pending Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Pending Requests</Text>
            <View style={[styles.requestsCount, { backgroundColor: theme.ERROR }]}>
              <Text style={[styles.requestsCountText, { color: theme.WHITE }]}>
                {dashboardData.pendingRequests.length || 0}
              </Text>
            </View>
          </View>
          
          {dashboardData.pendingRequests.length === 0 ? (
            <Card style={[styles.emptyState, { backgroundColor: theme.CARD_BACKGROUND }]}>
              <Ionicons name="checkmark-circle-outline" size={48} color={theme.GRAY_MEDIUM} />
              <Text style={[styles.emptyTitle, { color: theme.TEXT_PRIMARY }]}>All Caught Up!</Text>
              <Text style={[styles.emptySubtitle, { color: theme.TEXT_SECONDARY }]}>
                No pending requests at the moment
              </Text>
            </Card>
          ) : (
            dashboardData.pendingRequests.slice(0, 3).map((request) => (
              <PendingRequestCard key={request.id} request={request} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  doctorName: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.XS / 2,
  },
  specialization: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  notificationButton: {
    position: 'relative',
    padding: SPACING.SM,
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: COLORS.ERROR,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: COLORS.WHITE,
    fontSize: FONT_SIZES.XS,
    fontWeight: 'bold',
  },
  emergencyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.EMERGENCY,
    margin: SPACING.MD,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
  },
  emergencyText: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  emergencyTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  emergencySubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.WHITE,
    opacity: 0.9,
  },
  statisticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  statisticCard: {
    width: '48%',
    marginRight: '2%',
    marginBottom: SPACING.SM,
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  statisticHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  statisticIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: FONT_SIZES.XS,
    fontWeight: '600',
    marginLeft: SPACING.XS / 2,
  },
  statisticValue: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  statisticLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
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
    color: COLORS.TEXT_PRIMARY,
  },
  viewAllText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  requestsCount: {
    backgroundColor: COLORS.ERROR,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestsCountText: {
    color: COLORS.WHITE,
    fontSize: FONT_SIZES.XS,
    fontWeight: 'bold',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: COLORS.WHITE,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    marginBottom: SPACING.SM,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    position: 'relative',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.ERROR,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.WHITE,
    fontSize: FONT_SIZES.XS,
    fontWeight: 'bold',
  },
  actionTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.XS / 2,
  },
  actionSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  appointmentCard: {
    marginBottom: SPACING.SM,
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  patientInitial: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  patientAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  appointmentDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  appointmentTime: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  appointmentReason: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  appointmentActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    padding: SPACING.SM,
    marginLeft: SPACING.SM,
  },
  requestCard: {
    marginBottom: SPACING.SM,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.WARNING,
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  urgencyIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  requestInfo: {
    flex: 1,
  },
  requestPatient: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  requestType: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  requestTime: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.GRAY_MEDIUM,
  },
  requestActions: {
    flexDirection: 'row',
  },
  requestBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.SM,
  },
  acceptBtn: {
    backgroundColor: COLORS.SUCCESS,
  },
  declineBtn: {
    backgroundColor: COLORS.ERROR,
  },
  requestReason: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    paddingLeft: 44, // Align with patient info
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.XL,
    backgroundColor: COLORS.WHITE,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});

export default DoctorDashboardScreen;