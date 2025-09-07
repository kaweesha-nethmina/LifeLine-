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
  TextInput,
  Modal,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';
import useProfilePicture from '../../hooks/useProfilePicture';

const DoctorPatientsScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { fetchUserProfilePicture, getCachedProfilePicture } = useProfilePicture();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, active, inactive, emergency
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const patientsListenerRef = useRef(null);

  useEffect(() => {
    loadPatients();
    return () => {
      // Clean up listener when component unmounts
      if (patientsListenerRef.current) {
        patientsListenerRef.current();
      }
    };
  }, []);

  useEffect(() => {
    filterPatients();
  }, [patients, searchQuery, filterType]);

  const loadPatients = async () => {
    try {
      if (!userProfile?.uid) return;
      
      // Get all appointments for this doctor to identify patients
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', userProfile.uid)
      );
      
      // Set up real-time listener for appointments
      patientsListenerRef.current = onSnapshot(appointmentsQuery, async (snapshot) => {
        const patientIds = new Set();
        snapshot.forEach((doc) => {
          const appointment = doc.data();
          if (appointment.patientId) {
            patientIds.add(appointment.patientId);
          }
        });
        
        // Fetch patient details for each unique patient ID
        const patientDataPromises = [];
        for (const patientId of patientIds) {
          try {
            const patientDoc = await getDocs(query(
              collection(db, 'users'),
              where('uid', '==', patientId),
              where('role', '==', 'patient')
            ));
            
            patientDoc.forEach((doc) => {
              const userData = doc.data();
              // Create a promise to fetch appointment data for this patient
              const patientDataPromise = getPatientAppointmentData(patientId).then(appointmentData => ({
                id: userData.uid,
                name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown Patient',
                email: userData.email || '',
                phoneNumber: userData.phone || '',
                gender: userData.gender || 'Not specified',
                birthDate: userData.dateOfBirth || '',
                bloodType: userData.bloodType || 'Unknown',
                status: 'active', // Default status
                medicalHistory: userData.medicalHistory || [],
                allergies: userData.allergies || [],
                medications: userData.medications || [],
                totalVisits: appointmentData.totalVisits,
                lastVisit: appointmentData.lastVisit
              }));
              patientDataPromises.push(patientDataPromise);
            });
          } catch (error) {
            console.error('Error fetching patient data:', error);
          }
        }
        
        // Wait for all patient data to be fetched
        const patientData = await Promise.all(patientDataPromises);
        
        setPatients(patientData);
      }, (error) => {
        console.error('Error listening to appointments:', error);
        setPatients([]);
      });
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  };

  const filterPatients = () => {
    let filtered = patients;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phoneNumber.includes(searchQuery)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(patient => patient.status === filterType);
    }

    setFilteredPatients(filtered);
  };

  const getPatientStatusColor = (status) => {
    switch (status) {
      case 'active':
        return COLORS.SUCCESS;
      case 'inactive':
        return COLORS.GRAY_MEDIUM;
      case 'emergency':
        return COLORS.EMERGENCY;
      default:
        return COLORS.INFO;
    }
  };

  const getPatientStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return 'checkmark-circle';
      case 'inactive':
        return 'pause-circle';
      case 'emergency':
        return 'warning';
      default:
        return 'help-circle';
    }
  };

  const handlePatientAction = (patient, action) => {
    switch (action) {
      case 'view':
        setSelectedPatient(patient);
        setShowPatientModal(true);
        break;
      case 'chat':
        navigation.navigate('Chat', {
          doctorId: userProfile?.uid,
          doctorName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'Doctor',
          patientId: patient.id,
          patientName: patient.name
        });
        break;
      case 'prescription':
        console.log('Navigating to Prescriptions screen with params:', {
          patientId: patient.id,
          patientName: patient.name,
          action: 'create'
        });
        navigation.navigate('Prescriptions', {
          patientId: patient.id,
          patientName: patient.name,
          action: 'create'
        });
        break;
      case 'schedule':
        Alert.alert(
          'Schedule Appointment',
          `Schedule an appointment with ${patient.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Schedule', onPress: () => Alert.alert('Feature Coming Soon', 'Appointment scheduling will be available soon.') }
          ]
        );
        break;
      case 'emergency':
        Alert.alert(
          'Emergency Contact',
          `Contact ${patient.name} for emergency?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Call', onPress: () => Alert.alert('Emergency Call', `Calling ${patient.phoneNumber}...`) }
          ]
        );
        break;
      default:
        break;
    }
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getUpcomingAppointments = async (patientId) => {
    try {
      // Query upcoming appointments for this patient
      // Removed orderBy to avoid composite index requirement
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', patientId),
        where('appointmentDate', '>', new Date())
        // Removed orderBy('appointmentDate', 'asc') to avoid composite index
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      // Sort in memory instead of using Firestore orderBy
      const appointmentsData = [];
      appointmentsSnapshot.forEach((doc) => {
        appointmentsData.push(doc.data());
      });
      appointmentsData.sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
      return appointmentsData.length;
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error);
      return 0;
    }
  };

  const getPatientAppointmentData = async (patientId) => {
    try {
      // Query all appointments for this patient
      // Removed orderBy to avoid composite index requirement
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', patientId)
        // Removed orderBy('appointmentDate', 'desc') to avoid composite index
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      // Sort in memory instead of using Firestore orderBy
      const appointmentsData = [];
      appointmentsSnapshot.forEach((doc) => {
        appointmentsData.push(doc.data());
      });
      appointmentsData.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
      const totalVisits = appointmentsData.length;
      
      // Get the last visit date (most recent appointment)
      let lastVisit = null;
      if (totalVisits > 0) {
        const mostRecentAppointment = appointmentsData[0];
        lastVisit = mostRecentAppointment.appointmentDate;
      }
      
      return { totalVisits, lastVisit };
    } catch (error) {
      console.error('Error fetching patient appointment data:', error);
      return { totalVisits: 0, lastVisit: null };
    }
  };

  const FilterButton = ({ type, title, count, active, onPress }) => (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.activeFilterButton]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, active && styles.activeFilterButtonText]}>
        {title} {count !== undefined && `(${count})`}
      </Text>
    </TouchableOpacity>
  );

  const PatientCard = ({ patient }) => {
    const [upcomingAppointments, setUpcomingAppointments] = useState(0);
    const age = calculateAge(patient.birthDate);
    
    const [profilePicture, setProfilePicture] = useState(null);
    const [loadingProfilePicture, setLoadingProfilePicture] = useState(false);

    // Fetch profile picture when component mounts or when patient.id changes
    useEffect(() => {
      const loadProfilePicture = async () => {
        if (patient.id) {
          console.log('Loading profile picture for patient:', patient.id);
          setLoadingProfilePicture(true);
          try {
            // First check if we have it cached
            const cachedPicture = getCachedProfilePicture(patient.id);
            console.log('Cached picture:', cachedPicture);
            if (cachedPicture && cachedPicture !== null) {
              setProfilePicture(cachedPicture);
            } else {
              // Fetch from Firestore if not cached
              const pictureUrl = await fetchUserProfilePicture(patient.id);
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
    }, [patient.id, getCachedProfilePicture, fetchUserProfilePicture]);

    useEffect(() => {
      const fetchUpcomingAppointments = async () => {
        const count = await getUpcomingAppointments(patient.id);
        setUpcomingAppointments(count);
      };
      
      fetchUpcomingAppointments();
    }, [patient.id]);

    return (
      <Card style={styles.patientCard}>
        <TouchableOpacity onPress={() => handlePatientAction(patient, 'view')}>
          <View style={styles.patientHeader}>
            <View style={styles.patientInfo}>
              <View style={styles.patientAvatar}>
                {profilePicture && profilePicture !== null ? (
                  <Image 
                    source={{ uri: profilePicture }} 
                    style={styles.patientAvatarImage}
                    onError={() => {
                      console.log('Profile picture load error for patient:', patient.id);
                      // Fallback to initials if image fails to load
                      setProfilePicture(null);
                    }}
                  />
                ) : (
                  <Text style={styles.patientInitial}>{patient.name.charAt(0)}</Text>
                )}
              </View>
              <View style={styles.patientDetails}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientMeta}>
                  Age: {age} • {patient.gender} • {patient.bloodType}
                </Text>
                <Text style={styles.patientContact}>
                  {patient.phoneNumber} • {patient.email}
                </Text>
              </View>
            </View>
            <View style={styles.patientStatus}>
              <View style={[styles.statusBadge, { backgroundColor: getPatientStatusColor(patient.status) }]}>
                <Ionicons 
                  name={getPatientStatusIcon(patient.status)} 
                  size={12} 
                  color={COLORS.WHITE} 
                />
                <Text style={styles.statusText}>
                  {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.patientStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{patient.totalVisits}</Text>
              <Text style={styles.statLabel}>Total Visits</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{upcomingAppointments}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{patient.lastVisit ? 'Recent' : 'None'}</Text>
              <Text style={styles.statLabel}>Last Visit</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.patientActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePatientAction(patient, 'chat')}
          >
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.SUCCESS} />
            <Text style={[styles.actionText, { color: COLORS.SUCCESS }]}>Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePatientAction(patient, 'prescription')}
          >
            <Ionicons name="medical-outline" size={18} color={COLORS.PRIMARY} />
            <Text style={[styles.actionText, { color: COLORS.PRIMARY }]}>Prescribe</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePatientAction(patient, 'schedule')}
          >
            <Ionicons name="calendar-outline" size={18} color={COLORS.INFO} />
            <Text style={[styles.actionText, { color: COLORS.INFO }]}>Schedule</Text>
          </TouchableOpacity>
          
          {patient.status === 'emergency' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePatientAction(patient, 'emergency')}
            >
              <Ionicons name="call-outline" size={18} color={COLORS.EMERGENCY} />
              <Text style={[styles.actionText, { color: COLORS.EMERGENCY }]}>Emergency</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  const PatientDetailModal = () => {
    if (!selectedPatient) return null;

    const age = calculateAge(selectedPatient.birthDate);

    return (
      <Modal
        visible={showPatientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPatientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedPatient.name}</Text>
              <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Age:</Text>
                  <Text style={styles.detailValue}>{age} years old</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gender:</Text>
                  <Text style={styles.detailValue}>{selectedPatient.gender}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Blood Type:</Text>
                  <Text style={styles.detailValue}>{selectedPatient.bloodType}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedPatient.phoneNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedPatient.email}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Medical Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Visits:</Text>
                  <Text style={styles.detailValue}>{selectedPatient.totalVisits}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Visit:</Text>
                  <Text style={styles.detailValue}>
                    {selectedPatient.lastVisit ? new Date(selectedPatient.lastVisit).toLocaleDateString() : 'No previous visits'}
                  </Text>
                </View>
                {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Allergies:</Text>
                    <Text style={styles.detailValue}>{selectedPatient.allergies.join(', ')}</Text>
                  </View>
                )}
                {selectedPatient.conditions && selectedPatient.conditions.length > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Conditions:</Text>
                    <Text style={styles.detailValue}>{selectedPatient.conditions.join(', ')}</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="View History"
                onPress={() => {
                  setShowPatientModal(false);
                  Alert.alert('Feature Coming Soon', 'Patient medical history view will be available soon.');
                }}
                style={styles.modalActionButton}
                variant="outline"
              />
              <Button
                title="Start Chat"
                onPress={() => {
                  setShowPatientModal(false);
                  handlePatientAction(selectedPatient, 'chat');
                }}
                style={styles.modalActionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const getFilterCounts = () => {
    return {
      all: patients.length,
      active: patients.filter(p => p.status === 'active').length,
      inactive: patients.filter(p => p.status === 'inactive').length,
      emergency: patients.filter(p => p.status === 'emergency').length
    };
  };

  const counts = getFilterCounts();

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.GRAY_MEDIUM} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.GRAY_MEDIUM}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.GRAY_MEDIUM} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{counts.all}</Text>
          <Text style={styles.statTitle}>Total Patients</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.SUCCESS }]}>{counts.active}</Text>
          <Text style={styles.statTitle}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.EMERGENCY }]}>{counts.emergency}</Text>
          <Text style={styles.statTitle}>Emergency</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton
            type="all"
            title="All"
            count={counts.all}
            active={filterType === 'all'}
            onPress={() => setFilterType('all')}
          />
          <FilterButton
            type="active"
            title="Active"
            count={counts.active}
            active={filterType === 'active'}
            onPress={() => setFilterType('active')}
          />
          <FilterButton
            type="inactive"
            title="Inactive"
            count={counts.inactive}
            active={filterType === 'inactive'}
            onPress={() => setFilterType('inactive')}
          />
          <FilterButton
            type="emergency"
            title="Emergency"
            count={counts.emergency}
            active={filterType === 'emergency'}
            onPress={() => setFilterType('emergency')}
          />
        </ScrollView>
      </View>

      {/* Patients List */}
      <ScrollView
        style={styles.patientsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredPatients.length === 0 ? (
          <Card style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={COLORS.GRAY_MEDIUM} />
            <Text style={styles.emptyTitle}>No Patients Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? `No patients match "${searchQuery}"`
                : 'No patients in this category'
              }
            </Text>
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))
        )}
      </ScrollView>

      <PatientDetailModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  searchContainer: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  statsHeader: {
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
  statTitle: {
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
  patientsList: {
    flex: 1,
    padding: SPACING.MD,
  },
  patientCard: {
    marginBottom: SPACING.MD,
  },
  patientHeader: {
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  patientInitial: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  patientAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  patientMeta: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  patientContact: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.GRAY_MEDIUM,
  },
  patientStatus: {
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
  patientStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    marginBottom: SPACING.SM,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  patientActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: SPACING.XS,
    paddingHorizontal: SPACING.SM,
  },
  actionText: {
    fontSize: FONT_SIZES.XS,
    marginTop: SPACING.XS / 2,
    fontWeight: '500',
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
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  modalTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalBody: {
    maxHeight: 400,
  },
  detailSection: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.XS,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  detailLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.MD,
  },
  modalActionButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
});

export default DoctorPatientsScreen;