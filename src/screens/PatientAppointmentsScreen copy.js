import React, { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '../context/AuthContext';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  CONSULTATION_STATUS
} from '../constants';
import Card from '../components/Card';
import useProfilePicture from '../hooks/useProfilePicture';

const PatientAppointmentsScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { fetchUserProfilePicture, getCachedProfilePicture } = useProfilePicture();
  const [appointments, setAppointments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, upcoming, completed, cancelled
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
      
      // Set up real-time listener for patient's appointments
      // Removed orderBy to avoid composite index requirement
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', userProfile.uid)
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
          return dateB - dateA; // Sort by date descending (newest first)
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

  const getStatusColor = (status) => {
    switch (status) {
      case CONSULTATION_STATUS.PENDING:
        return COLORS.WARNING;
      case CONSULTATION_STATUS.CONFIRMED:
        return COLORS.PRIMARY;
      case CONSULTATION_STATUS.ONGOING:
        return COLORS.SUCCESS;
      case CONSULTATION_STATUS.COMPLETED:
        return COLORS.INFO;
      case CONSULTATION_STATUS.CANCELLED:
        return COLORS.ERROR;
      default:
        return COLORS.GRAY_MEDIUM;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case CONSULTATION_STATUS.PENDING:
        return 'Pending';
      case CONSULTATION_STATUS.CONFIRMED:
        return 'Confirmed';
      case CONSULTATION_STATUS.ONGOING:
        return 'Ongoing';
      case CONSULTATION_STATUS.COMPLETED:
        return 'Completed';
      case CONSULTATION_STATUS.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (filterStatus === 'all') return true;
    return appointment.status === filterStatus;
  });

  const AppointmentCard = ({ appointment }) => {
    const [profilePicture, setProfilePicture] = useState(null);
    const [loadingProfilePicture, setLoadingProfilePicture] = useState(false);

    // Fetch profile picture when component mounts
    useEffect(() => {
      const loadProfilePicture = async () => {
        if (appointment.doctorId) {
          setLoadingProfilePicture(true);
          try {
            // First check if we have it cached
            const cachedPicture = getCachedProfilePicture(appointment.doctorId);
            if (cachedPicture) {
              setProfilePicture(cachedPicture);
            } else {
              // Fetch from Firestore if not cached
              const pictureUrl = await fetchUserProfilePicture(appointment.doctorId);
              setProfilePicture(pictureUrl);
            }
          } catch (error) {
            console.error('Error loading profile picture:', error);
          } finally {
            setLoadingProfilePicture(false);
          }
        }
      };

      loadProfilePicture();
    }, [appointment.doctorId]);

    return (
      <Card style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.doctorInfo}>
            <View style={styles.doctorAvatar}>
              {profilePicture ? (
                <Image 
                  source={{ uri: profilePicture }} 
                  style={styles.doctorAvatarImage}
                  onError={() => {
                    console.log('Profile picture load error for doctor:', appointment.doctorId);
                    // Fallback to default icon if image fails to load
                    setProfilePicture(null);
                  }}
                />
              ) : (
                <Ionicons name="person" size={20} color={COLORS.WHITE} />
              )}
            </View>
            <View style={styles.doctorDetails}>
              <Text style={styles.appointmentTitle}>{appointment.doctorName}</Text>
              <Text style={styles.appointmentSubtitle}>
                {appointment.specialization}
              </Text>
            </View>
          </View>
          <View style={styles.appointmentStatus}>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(appointment.status) }
            ]}>
              <Text style={styles.statusText}>
                {getStatusText(appointment.status)}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.appointmentDate}>
          {appointment.appointmentDate} at {appointment.appointmentTime}
        </Text>
        <View style={styles.appointmentActions}>
          {appointment.status === CONSULTATION_STATUS.ONGOING && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => {
                if (appointment.type === 'video') {
                  navigation.navigate('Consultation', {
                    screen: 'VideoCall',
                    params: {
                      consultationId: appointment.id,
                      doctorId: appointment.doctorId,
                      doctorName: appointment.doctorName
                    }
                  });
                } else if (appointment.type === 'chat') {
                  navigation.navigate('Consultation', {
                    screen: 'Chat',
                    params: {
                      appointmentId: appointment.id,
                      doctorId: appointment.doctorId,
                      doctorName: appointment.doctorName,
                      patientId: userProfile.uid,
                      patientName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Patient'
                    }
                  });
                }
              }}
            >
              <Text style={styles.joinButtonText}>Join Now</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => Alert.alert(
              'Appointment Details',
              `Doctor: ${appointment.doctorName}\n` +
              `Date: ${appointment.appointmentDate}\n` +
              `Time: ${appointment.appointmentTime}\n` +
              `Status: ${getStatusText(appointment.status)}\n` +
              `Type: ${appointment.type?.charAt(0).toUpperCase() + appointment.type?.slice(1) || 'In-person'}`
            )}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const FilterButton = ({ title, value, active, onPress }) => (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.activeFilterButton]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, active && styles.activeFilterButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton
            title="All"
            value="all"
            active={filterStatus === 'all'}
            onPress={() => setFilterStatus('all')}
          />
          <FilterButton
            title="Upcoming"
            value="upcoming"
            active={filterStatus === 'upcoming'}
            onPress={() => setFilterStatus(CONSULTATION_STATUS.CONFIRMED)}
          />
          <FilterButton
            title="Completed"
            value="completed"
            active={filterStatus === CONSULTATION_STATUS.COMPLETED}
            onPress={() => setFilterStatus(CONSULTATION_STATUS.COMPLETED)}
          />
          <FilterButton
            title="Cancelled"
            value="cancelled"
            active={filterStatus === CONSULTATION_STATUS.CANCELLED}
            onPress={() => setFilterStatus(CONSULTATION_STATUS.CANCELLED)}
          />
        </ScrollView>
      </View>

      {/* Appointments List */}
      <ScrollView
        style={styles.appointmentsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.GRAY_MEDIUM} />
            <Text style={styles.emptyTitle}>No Appointments</Text>
            <Text style={styles.emptySubtitle}>
              {filterStatus === 'all' 
                ? "You don't have any appointments yet."
                : `No ${getStatusText(filterStatus).toLowerCase()} appointments to display.`}
            </Text>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => navigation.navigate('Consultation', { screen: 'DoctorList' })}
            >
              <Text style={styles.bookButtonText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredAppointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    paddingTop: SPACING.LG,
  },
  backButton: {
    padding: SPACING.XS,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    textAlign: 'center',
    marginLeft: -30, // Adjust for back button
  },
  headerSpacer: {
    width: 30, // Match back button width
  },
  filterContainer: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  filterButton: {
    backgroundColor: COLORS.GRAY_LIGHT,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.XL,
    marginRight: SPACING.SM,
    marginBottom: SPACING.XS,
  },
  activeFilterButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  activeFilterButtonText: {
    color: COLORS.WHITE,
  },
  appointmentsList: {
    flex: 1,
    padding: SPACING.MD,
  },
  appointmentCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  appointmentTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  appointmentStatus: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS / 2,
    borderRadius: BORDER_RADIUS.SM,
  },
  statusText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  appointmentSubtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  appointmentDate: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
    marginBottom: SPACING.MD,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  joinButton: {
    backgroundColor: COLORS.SUCCESS,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
    flex: 1,
    marginRight: SPACING.SM,
  },
  joinButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.WHITE,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailsButton: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
    flex: 1,
    marginLeft: SPACING.SM,
  },
  detailsButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
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
    marginBottom: SPACING.LG,
  },
  bookButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.SM,
  },
  bookButtonText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
});

export default PatientAppointmentsScreen;