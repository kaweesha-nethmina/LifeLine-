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
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../constants';
import Card from '../components/Card';
import Button from '../components/Button';
import useProfilePicture from '../hooks/useProfilePicture';
import LabResultModal from '../components/LabResultModal';

const MedicalHistoryScreen = ({ navigation, route }) => {
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { fetchUserProfilePicture, getCachedProfilePicture } = useProfilePicture();
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, appointments, lab-results, prescriptions, diagnoses
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedLabResult, setSelectedLabResult] = useState(null);
  const [showLabResultModal, setShowLabResultModal] = useState(false);

  useEffect(() => {
    loadMedicalHistory();
    loadProfilePicture();
    
    // Set filter type from route params if provided
    if (route?.params?.filterType) {
      setFilterType(route.params.filterType);
    }
  }, [route?.params?.filterType]);

  const loadProfilePicture = async () => {
    try {
      if (user?.uid) {
        // First check if we have it cached
        const cachedPicture = getCachedProfilePicture(user.uid);
        if (cachedPicture && cachedPicture !== null) {
          setProfilePicture(cachedPicture);
        } else {
          // Fetch from Firestore if not cached
          const pictureUrl = await fetchUserProfilePicture(user.uid);
          if (pictureUrl && pictureUrl !== null) {
            setProfilePicture(pictureUrl);
          } else {
            // Explicitly set to null if no picture found
            setProfilePicture(null);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile picture:', error);
      // Set to null on error to show initials
      setProfilePicture(null);
    }
  };

  const loadMedicalHistory = async () => {
    try {
      // Fetch medical history from Firebase
      if (user && user.uid) {
        // Fetch from user's medicalHistory subcollection
        // Removed orderBy to avoid composite index requirement
        const medicalHistoryQuery = query(
          collection(db, 'users', user.uid, 'medicalHistory')
          // Removed orderBy('date', 'desc') to avoid composite index
        );
        
        const medicalHistorySnapshot = await getDocs(medicalHistoryQuery);
        const medicalHistoryData = [];
        medicalHistorySnapshot.forEach((doc) => {
          medicalHistoryData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Fetch appointments from appointments collection
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('patientId', '==', user.uid)
          // Removed orderBy('date', 'desc') to avoid composite index
        );
        
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointmentsData = [];
        appointmentsSnapshot.forEach((doc) => {
          const appointment = doc.data();
          appointmentsData.push({
            id: doc.id,
            type: 'appointment',
            title: `Appointment with Dr. ${appointment.doctorName || 'Unknown Doctor'}`,
            date: appointment.appointmentDate,
            doctor: appointment.doctorName || 'Unknown Doctor',
            details: `Time: ${appointment.appointmentTime || 'N/A'}\nStatus: ${appointment.status || 'N/A'}`,
            summary: `Appointment scheduled with ${appointment.doctorName || 'Unknown Doctor'} on ${appointment.appointmentDate || 'N/A'}`,
            critical: false
          });
        });
        
        // Fetch lab results from labResults subcollection
        const labResultsQuery = query(
          collection(db, 'users', user.uid, 'labResults')
          // Removed orderBy to avoid composite index requirement
        );
        
        const labResultsSnapshot = await getDocs(labResultsQuery);
        const labResultsData = [];
        labResultsSnapshot.forEach((doc) => {
          const labResult = doc.data();
          labResultsData.push({
            id: doc.id,
            type: 'lab-result',
            title: labResult.title || 'Lab Result',
            date: labResult.uploadDate,
            doctor: labResult.doctorName || 'Unknown Doctor',
            doctorName: labResult.doctorName || 'Unknown Doctor',
            doctorLicense: labResult.doctorLicense || 'N/A',
            patientName: labResult.patientName || 'Unknown Patient',
            fileName: labResult.fileName || 'Unknown File',
            fileType: labResult.fileType || 'Unknown Type',
            fileSize: labResult.fileSize || 0,
            fileUrl: labResult.fileUrl || '',
            uploadDate: labResult.uploadDate || new Date().toISOString(),
            details: `Doctor: ${labResult.doctorName || 'Unknown Doctor'}\nLicense: ${labResult.doctorLicense || 'N/A'}`,
            summary: `Lab result titled "${labResult.title || 'Untitled'}" uploaded by ${labResult.doctorName || 'Unknown Doctor'}`,
            critical: false
          });
        });
        
        // Combine all data sets
        const combinedData = [...medicalHistoryData, ...appointmentsData, ...labResultsData];
        
        // Sort in memory instead of using Firestore orderBy
        combinedData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setMedicalHistory(combinedData);
      }
    } catch (error) {
      console.error('Error loading medical history:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedicalHistory();
    setRefreshing(false);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'appointment':
        return 'calendar';
      case 'lab-result':
        return 'flask';
      case 'prescription':
        return 'medical';
      case 'diagnosis':
        return 'clipboard';
      case 'vaccination':
        return 'shield-checkmark';
      case 'surgery':
        return 'cut';
      default:
        return 'document-text';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'appointment':
        return theme.PRIMARY;
      case 'lab-result':
        return theme.INFO;
      case 'prescription':
        return theme.SUCCESS;
      case 'diagnosis':
        return theme.WARNING;
      case 'vaccination':
        return theme.SUCCESS;
      case 'surgery':
        return theme.EMERGENCY;
      default:
        return theme.GRAY_MEDIUM;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleRecordPress = (record) => {
    // Handle different record types
    if (record.type === 'lab-result') {
      // For lab results, show the detailed modal with all data
      setSelectedLabResult(record);
      setShowLabResultModal(true);
    } else {
      // Navigate to detailed view or show more information
      Alert.alert(
        record.title,
        `Date: ${formatDate(record.date)}

Details: ${record.details}

Doctor: ${record.doctor}`,
        [{ text: 'OK' }]
      );
    }
  };

  const filteredHistory = medicalHistory.filter(record => {
    if (filterType === 'all') return true;
    return record.type === filterType;
  });

  const FilterButton = ({ type, title, count, active, onPress }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        active && styles.activeFilterButton,
        { 
          backgroundColor: active ? theme.PRIMARY : theme.GRAY_LIGHT,
          borderColor: theme.BORDER
        }
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.filterButtonText,
        active && styles.activeFilterButtonText,
        { 
          color: active ? theme.WHITE : theme.TEXT_SECONDARY
        }
      ]}>
        {title} {count > 0 && `(${count})`}
      </Text>
    </TouchableOpacity>
  );

  const MedicalRecordCard = ({ record }) => (
    <TouchableOpacity
      style={[styles.recordCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}
      onPress={() => handleRecordPress(record)}
    >
      <View style={styles.recordHeader}>
        <View style={[styles.recordIcon, { backgroundColor: getTypeColor(record.type) }]}>
          <Ionicons name={getTypeIcon(record.type)} size={20} color={theme.WHITE} />
        </View>
        <View style={styles.recordInfo}>
          <Text style={[styles.recordTitle, { color: theme.TEXT_PRIMARY }]}>{record.title}</Text>
          <Text style={[styles.recordDate, { color: theme.TEXT_SECONDARY }]}>{formatDate(record.date)}</Text>
          <Text style={[styles.recordDoctor, { color: theme.PRIMARY }]}>{record.doctor}</Text>
        </View>
        <View style={styles.recordStatus}>
          <View style={[styles.statusDot, { backgroundColor: record.critical ? theme.EMERGENCY : theme.SUCCESS }]} />
          <Ionicons name="chevron-forward" size={20} color={theme.GRAY_MEDIUM} />
        </View>
      </View>
      <Text style={[styles.recordSummary, { color: theme.TEXT_SECONDARY }]} numberOfLines={2}>
        {record.summary}
      </Text>
    </TouchableOpacity>
  );

  const getSummaryStats = () => {
    const stats = {
      total: medicalHistory.length,
      appointments: medicalHistory.filter(r => r.type === 'appointment').length,
      labResults: medicalHistory.filter(r => r.type === 'lab-result').length,
      prescriptions: medicalHistory.filter(r => r.type === 'prescription').length,
      diagnoses: medicalHistory.filter(r => r.type === 'diagnosis').length
    };
    return stats;
  };

  const stats = getSummaryStats();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
        <Text style={[styles.title, { color: theme.TEXT_PRIMARY }]}>Medical History</Text>
        <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>Complete health record overview</Text>
      </View>

      {/* Patient Info Summary */}
      <Card style={[styles.patientSummary, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
        <View style={styles.summaryHeader}>
          <View style={[styles.patientAvatar, { backgroundColor: theme.PRIMARY }]}>
            {profilePicture && profilePicture !== null ? (
              <Image 
                source={{ uri: profilePicture }} 
                style={styles.patientAvatarImage}
                onError={() => {
                  console.log('Profile picture load error');
                  // Fallback to initials if image fails to load
                  setProfilePicture(null);
                }}
              />
            ) : (
              <Ionicons name="person" size={24} color={theme.WHITE} />
            )}
          </View>
          <View style={styles.patientInfo}>
            <Text style={[styles.patientName, { color: theme.TEXT_PRIMARY }]}>
              {userProfile?.firstName} {userProfile?.lastName}
            </Text>
            <Text style={[styles.patientDetails, { color: theme.TEXT_SECONDARY }]}>
              Age: {userProfile?.age || 'N/A'} • Blood Type: {userProfile?.bloodType || 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={[styles.statsRow, { borderTopColor: theme.BORDER }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.PRIMARY }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Total Records</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.PRIMARY }]}>{stats.appointments}</Text>
            <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Appointments</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.PRIMARY }]}>{stats.labResults}</Text>
            <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Lab Results</Text>
          </View>
        </View>
      </Card>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton
            type="all"
            title="All"
            count={stats.total}
            active={filterType === 'all'}
            onPress={() => setFilterType('all')}
          />
          <FilterButton
            type="appointment"
            title="Appointments"
            count={stats.appointments}
            active={filterType === 'appointment'}
            onPress={() => setFilterType('appointment')}
          />
          <FilterButton
            type="lab-result"
            title="Lab Results"
            count={stats.labResults}
            active={filterType === 'lab-result'}
            onPress={() => setFilterType('lab-result')}
          />
          <FilterButton
            type="prescription"
            title="Prescriptions"
            count={stats.prescriptions}
            active={filterType === 'prescription'}
            onPress={() => setFilterType('prescription')}
          />
          <FilterButton
            type="diagnosis"
            title="Diagnoses"
            count={stats.diagnoses}
            active={filterType === 'diagnosis'}
            onPress={() => setFilterType('diagnosis')}
          />
        </ScrollView>
      </View>

      {/* Records List */}
      <ScrollView
        style={styles.recordsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.PRIMARY]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredHistory.length === 0 ? (
          <Card style={[styles.emptyState, { backgroundColor: theme.CARD_BACKGROUND }]}>
            <Ionicons name="document-text-outline" size={64} color={theme.GRAY_MEDIUM} />
            <Text style={[styles.emptyTitle, { color: theme.TEXT_PRIMARY }]}>No Records Found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.TEXT_SECONDARY }]}>
              {filterType === 'all' 
                ? 'Your medical history will appear here as you visit doctors and receive care.'
                : `No ${filterType.replace('-', ' ')} records to display.`
              }
            </Text>
            <Button
              title="Book Appointment"
              onPress={() => navigation.navigate('Consultation')}
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          filteredHistory.map((record) => (
            <MedicalRecordCard key={record.id} record={record} />
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.PRIMARY }]}
        onPress={() => Alert.alert('Feature Coming Soon', 'Add new medical record functionality will be available soon.')}
      >
        <Ionicons name="add" size={24} color={theme.WHITE} />
      </TouchableOpacity>
      
      {/* Lab Result Modal */}
      <LabResultModal
        visible={showLabResultModal}
        onClose={() => setShowLabResultModal(false)}
        labResult={selectedLabResult}
        currentUser={user}
        onDelete={loadMedicalHistory}
      />
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  title: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
  },
  patientSummary: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  patientAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  patientDetails: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: theme.BORDER,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: theme.CARD_BACKGROUND,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  filterButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.XL,
    marginRight: SPACING.SM,
    backgroundColor: theme.BUTTON_SECONDARY,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  activeFilterButton: {
    backgroundColor: theme.PRIMARY,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: theme.WHITE,
  },
  recordsList: {
    flex: 1,
    padding: SPACING.MD,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.XXL,
    marginTop: SPACING.XL,
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
    marginBottom: SPACING.LG,
    paddingHorizontal: SPACING.LG,
  },
  emptyButton: {
    paddingHorizontal: SPACING.XL,
  },
  recordCard: {
    backgroundColor: theme.CARD_BACKGROUND,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    shadowColor: theme.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  recordDate: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  recordDoctor: {
    fontSize: FONT_SIZES.SM,
    color: theme.PRIMARY,
    fontWeight: '500',
  },
  recordStatus: {
    alignItems: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: SPACING.XS,
  },
  recordSummary: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.LG,
    right: SPACING.LG,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default MedicalHistoryScreen;