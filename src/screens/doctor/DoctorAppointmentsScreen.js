import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  CONSULTATION_STATUS
} from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';
import NotificationService from '../../services/notificationService';
import useProfilePicture from '../../hooks/useProfilePicture';

const DoctorAppointmentsScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { fetchUserProfilePicture, getCachedProfilePicture } = useProfilePicture();
  const [appointments, setAppointments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('all'); // all, upcoming, completed, cancelled
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const appointmentsListenerRef = useRef(null);

  useEffect(() => {
    loadAppointments();
    return () => {
      // Clean up listener when component unmounts
      if (appointmentsListenerRef.current) {
        appointmentsListenerRef.current();
      }
    };
  }, []);

  const loadAppointments = async () => {
    try {
      if (!userProfile?.uid) return;
      
      // Set up real-time listener for doctor's appointments
      // Removed orderBy to avoid composite index requirement
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', userProfile.uid)
        // Removed orderBy('appointmentDate', 'asc') to avoid composite index
      );
      
      appointmentsListenerRef.current = onSnapshot(appointmentsQuery, (snapshot) => {
        const appointmentsData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Handle timestamp conversion properly
          const createdAt = data.createdAt ? 
            (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : data.createdAt) : 
            new Date();
          const updatedAt = data.updatedAt ? 
            (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : data.updatedAt) : 
            new Date();
          
          appointmentsData.push({
            id: doc.id,
            ...data,
            createdAt,
            updatedAt
          });
        });
        
        // Sort in memory instead of using Firestore orderBy
        appointmentsData.sort((a, b) => {
          const dateA = new Date(a.appointmentDate);
          const dateB = new Date(b.appointmentDate);
          return dateA - dateB;
        });
        
        setAppointments(appointmentsData);
      }, (error) => {
        console.error('Error listening to appointments:', error);
        setAppointments([]);
      });
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Create notification for patient
      const appointment = appointments.find(a => a.id === appointmentId);
      if (appointment) {
        await NotificationService.createAppointmentNotification(
          appointment.patientId,
          appointment,
          newStatus
        );
      }
      
      console.log(`Appointment ${appointmentId} status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      Alert.alert('Error', 'Failed to update appointment status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case CONSULTATION_STATUS.CONFIRMED:
        return COLORS.PRIMARY;
      case CONSULTATION_STATUS.ONGOING:
        return COLORS.SUCCESS;
      case CONSULTATION_STATUS.COMPLETED:
        return COLORS.INFO;
      case CONSULTATION_STATUS.CANCELLED:
        return COLORS.ERROR;
      case 'rescheduled':
        return COLORS.WARNING;
      default:
        return COLORS.GRAY_MEDIUM;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case CONSULTATION_STATUS.CONFIRMED:
        return 'time';
      case CONSULTATION_STATUS.ONGOING:
        return 'videocam';
      case CONSULTATION_STATUS.COMPLETED:
        return 'checkmark-circle';
      case CONSULTATION_STATUS.CANCELLED:
        return 'close-circle';
      case 'rescheduled':
        return 'refresh-circle';
      default:
        return 'help-circle';
    }
  };

  // Function to check if an appointment is in the future
  const isFutureAppointment = (appointment) => {
    // Handle potential invalid date or time values
    if (!appointment || !appointment.appointmentDate || !appointment.appointmentTime) {
      return false;
    }
    
    try {
      const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
      // Check if the date is valid
      if (isNaN(appointmentDateTime.getTime())) {
        return false;
      }
      
      const now = new Date();
      return appointmentDateTime > now; // Appointment is in the future
    } catch (error) {
      return false;
    }
  };

  const getTodaysAppointments = () => {
    const today = new Date().toDateString();
    return appointments.filter(apt => {
      // Handle potential invalid date values
      if (!apt || !apt.appointmentDate) {
        return false;
      }
      
      try {
        const aptDate = new Date(apt.appointmentDate).toDateString();
        return aptDate === today;
      } catch (error) {
        return false;
      }
    });
  };

  const handleAppointmentAction = (appointment, action) => {
    switch (action) {
      case 'confirm':
        Alert.alert(
          'Confirm Appointment',
          `Are you sure you want to confirm the appointment with ${appointment.patientName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Confirm',
              onPress: async () => {
                await updateAppointmentStatus(appointment.id, CONSULTATION_STATUS.CONFIRMED);
                Alert.alert('Success', 'Appointment confirmed successfully');
              }
            }
          ]
        );
        break;
      case 'start':
        Alert.alert(
          'Start Consultation',
          `Start consultation with ${appointment.patientName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Start Video Call',
              onPress: () => {
                navigation.navigate('VideoCall', {
                  consultationId: appointment.id,
                  patientId: appointment.patientId,
                  patientName: appointment.patientName
                });
              }
            }
          ]
        );
        break;
      case 'reschedule':
        setSelectedAppointment(appointment);
        setShowRescheduleModal(true);
        break;
      case 'cancel':
        Alert.alert(
          'Cancel Appointment',
          `Are you sure you want to cancel the appointment with ${appointment.patientName}?`,
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes, Cancel',
              style: 'destructive',
              onPress: async () => {
                await updateAppointmentStatus(appointment.id, CONSULTATION_STATUS.CANCELLED);
                Alert.alert('Success', 'Appointment cancelled successfully');
              }
            }
          ]
        );
        break;
      case 'complete':
        updateAppointmentStatus(appointment.id, CONSULTATION_STATUS.COMPLETED);
        Alert.alert('Success', 'Appointment marked as completed');
        break;
      default:
        break;
    }
  };

  // Filter appointments based on selected filter
  const filteredAppointments = useMemo(() => {
    if (filterStatus === 'all') return appointments;
    
    // Special handling for "Today" filter
    if (filterStatus === 'today') {
      return getTodaysAppointments();
    }
    
    // Special handling for "Upcoming" filter - should show confirmed appointments that are in the future
    if (filterStatus === 'upcoming') {
      return appointments.filter(appointment => 
        appointment.status === CONSULTATION_STATUS.CONFIRMED && isFutureAppointment(appointment)
      );
    }
    
    return appointments.filter(appointment => appointment.status === filterStatus);
  }, [appointments, filterStatus]);

  const todaysAppointments = useMemo(() => getTodaysAppointments(), [appointments]);

  const FilterButton = ({ status, title, active, onPress }) => (
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

  const AppointmentCard = ({ appointment }) => {
    const isPending = appointment.status === CONSULTATION_STATUS.PENDING;
    const canConfirm = appointment.status === CONSULTATION_STATUS.PENDING;
    const canStart = appointment.status === CONSULTATION_STATUS.CONFIRMED && isAppointmentTime(appointment);
    const canReschedule = [CONSULTATION_STATUS.CONFIRMED].includes(appointment.status);
    const canCancel = [CONSULTATION_STATUS.CONFIRMED, CONSULTATION_STATUS.PENDING, 'rescheduled'].includes(appointment.status);
    const canComplete = appointment.status === CONSULTATION_STATUS.ONGOING;
    
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
      <Card style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.patientInfo}>
            <View style={styles.patientAvatar}>
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
                <Text style={styles.patientInitial}>
                  {appointment.patientName ? appointment.patientName.charAt(0) : 'U'}
                </Text>
              )}
            </View>
            <View style={styles.appointmentDetails}>
              <Text style={styles.patientName}>{appointment.patientName || 'Unknown Patient'}</Text>
              <Text style={styles.appointmentTime}>
                {formatAppointmentDateTime(appointment.appointmentDate, appointment.appointmentTime) || 'Date/Time not set'} • {appointment.duration || 30} min
              </Text>
              <Text style={styles.appointmentType}>
                {appointment.type === 'video' ? 'Video Consultation' : 
                 appointment.type === 'chat' ? 'Chat Consultation' : 
                 appointment.type === 'in-person' ? 'In-Person' : (appointment.type || 'Consultation')}
              </Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
              <Ionicons 
                name={getStatusIcon(appointment.status)} 
                size={12} 
                color={COLORS.WHITE} 
              />
              <Text style={styles.statusText}>
                {appointment.status ? appointment.status.replace('_', ' ').charAt(0).toUpperCase() + appointment.status.replace('_', ' ').slice(1) : 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.appointmentReason}>{appointment.symptoms || 'No symptoms provided'}</Text>

        <View style={styles.appointmentActions}>
          {canConfirm && (
            <Button
              title="Confirm"
              onPress={() => handleAppointmentAction(appointment, 'confirm')}
              style={styles.actionButton}
              variant="success"
              size="small"
            />
          )}
          {canStart && (
            <Button
              title="Start Call"
              onPress={() => handleAppointmentAction(appointment, 'start')}
              style={styles.actionButton}
              variant="primary"
              size="small"
            />
          )}
          {canComplete && (
            <Button
              title="Complete"
              onPress={() => handleAppointmentAction(appointment, 'complete')}
              style={styles.actionButton}
              variant="success"
              size="small"
            />
          )}
          {canReschedule && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleAppointmentAction(appointment, 'reschedule')}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleAppointmentAction(appointment, 'cancel')}
            >
              <Ionicons name="close-outline" size={20} color={COLORS.ERROR} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Chat', {
              appointmentId: appointment.id,
              doctorId: appointment.doctorId,
              doctorName: appointment.doctorName,
              patientId: appointment.patientId,
              patientName: appointment.patientName
            })}
          >
            <Ionicons name="chatbubble-outline" size={20} color={COLORS.SUCCESS} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };



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

  const isAppointmentTime = (appointment) => {
    const now = new Date();
    // Handle potential invalid date or time values
    if (!appointment || !appointment.appointmentDate || !appointment.appointmentTime) {
      return false;
    }
    
    try {
      const appointmentTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
      // Check if the date is valid
      if (isNaN(appointmentTime.getTime())) {
        return false;
      }
      
      const timeDiff = appointmentTime.getTime() - now.getTime();
      return timeDiff <= 15 * 60 * 1000 && timeDiff >= -15 * 60 * 1000; // Within 15 minutes
    } catch (error) {
      return false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{getTodaysAppointments().length}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {appointments.filter(apt => apt.status === CONSULTATION_STATUS.CONFIRMED && isFutureAppointment(apt)).length}
          </Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {appointments.filter(apt => apt.status === CONSULTATION_STATUS.COMPLETED).length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton
            status="all"
            title="All"
            active={filterStatus === 'all'}
            onPress={() => setFilterStatus('all')}
          />
          <FilterButton
            status="today"
            title="Today"
            active={filterStatus === 'today'}
            onPress={() => setFilterStatus('today')}
          />
          <FilterButton
            status={CONSULTATION_STATUS.PENDING}
            title="Pending"
            active={filterStatus === CONSULTATION_STATUS.PENDING}
            onPress={() => setFilterStatus(CONSULTATION_STATUS.PENDING)}
          />
          <FilterButton
            status="upcoming"
            title="Upcoming"
            active={filterStatus === 'upcoming'}
            onPress={() => setFilterStatus('upcoming')}
          />
          <FilterButton
            status={CONSULTATION_STATUS.CONFIRMED}
            title="Confirmed"
            active={filterStatus === CONSULTATION_STATUS.CONFIRMED}
            onPress={() => setFilterStatus(CONSULTATION_STATUS.CONFIRMED)}
          />
          <FilterButton
            status={CONSULTATION_STATUS.ONGOING}
            title="In Progress"
            active={filterStatus === CONSULTATION_STATUS.ONGOING}
            onPress={() => setFilterStatus(CONSULTATION_STATUS.ONGOING)}
          />
          <FilterButton
            status={CONSULTATION_STATUS.COMPLETED}
            title="Completed"
            active={filterStatus === CONSULTATION_STATUS.COMPLETED}
            onPress={() => setFilterStatus(CONSULTATION_STATUS.COMPLETED)}
          />
          <FilterButton
            status={CONSULTATION_STATUS.CANCELLED}
            title="Cancelled"
            active={filterStatus === CONSULTATION_STATUS.CANCELLED}
            onPress={() => setFilterStatus(CONSULTATION_STATUS.CANCELLED)}
          />
        </ScrollView>
      </View>

      {/* Appointments List */}
      <ScrollView
        style={styles.appointmentsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredAppointments.length === 0 ? (
          <Card style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.GRAY_MEDIUM} />
            <Text style={styles.emptyTitle}>No Appointments</Text>
            <Text style={styles.emptySubtitle}>
              {filterStatus === 'all' 
                ? 'You have no appointments scheduled.'
                : `No ${filterStatus} appointments found.`
              }
            </Text>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))
        )}
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal
        visible={showRescheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reschedule Appointment</Text>
            <Text style={styles.modalSubtitle}>
              {selectedAppointment && `Patient: ${selectedAppointment.patientName}`}
            </Text>
            
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowRescheduleModal(false)}
                style={styles.modalButton}
                variant="outline"
              />
              <Button
                title="Reschedule"
                onPress={() => {
                  setShowRescheduleModal(false);
                  Alert.alert('Success', 'Appointment reschedule request sent to patient');
                }}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  statNumber: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
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
  appointmentsList: {
    flex: 1,
    padding: SPACING.MD,
  },
  appointmentCard: {
    marginBottom: SPACING.MD,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
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
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  appointmentTime: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  appointmentType: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS / 2,
    borderRadius: BORDER_RADIUS.SM,
  },
  statusText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.WHITE,
    marginLeft: SPACING.XS / 2,
    fontWeight: '600',
  },
  appointmentReason: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
    lineHeight: 18,
  },
  appointmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionButton: {
    marginRight: SPACING.SM,
    paddingHorizontal: SPACING.MD,
  },
  iconButton: {
    padding: SPACING.SM,
    marginLeft: SPACING.XS,
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
    paddingHorizontal: SPACING.MD,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.LG,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
});

export default DoctorAppointmentsScreen;