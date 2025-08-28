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
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
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

const MedicalHistoryScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const { fetchUserProfilePicture, getCachedProfilePicture } = useProfilePicture();
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, appointments, lab-results, prescriptions, diagnoses
  const [profilePicture, setProfilePicture] = useState(null);

  useEffect(() => {
    loadMedicalHistory();
    loadProfilePicture();
  }, []);

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
        
        // Combine both data sets
        const combinedData = [...medicalHistoryData, ...appointmentsData];
        
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
        return COLORS.PRIMARY;
      case 'lab-result':
        return COLORS.INFO;
      case 'prescription':
        return COLORS.SUCCESS;
      case 'diagnosis':
        return COLORS.WARNING;
      case 'vaccination':
        return COLORS.SUCCESS;
      case 'surgery':
        return COLORS.EMERGENCY;
      default:
        return COLORS.GRAY_MEDIUM;
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
    // Navigate to detailed view or show more information
    Alert.alert(
      record.title,
      `Date: ${formatDate(record.date)}\n\nDetails: ${record.details}\n\nDoctor: ${record.doctor}`,
      [{ text: 'OK' }]
    );
  };

  const filteredHistory = medicalHistory.filter(record => {
    if (filterType === 'all') return true;
    return record.type === filterType;
  });

  const FilterButton = ({ type, title, count, active, onPress }) => (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.activeFilterButton]}
      onPress={onPress}
    >
      <Text style={[
        styles.filterButtonText,
        active && styles.activeFilterButtonText
      ]}>
        {title} {count > 0 && `(${count})`}
      </Text>
    </TouchableOpacity>
  );

  const MedicalRecordCard = ({ record }) => (
    <TouchableOpacity
      style={styles.recordCard}
      onPress={() => handleRecordPress(record)}
    >
      <View style={styles.recordHeader}>
        <View style={[styles.recordIcon, { backgroundColor: getTypeColor(record.type) }]}>
          <Ionicons name={getTypeIcon(record.type)} size={20} color={COLORS.WHITE} />
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordTitle}>{record.title}</Text>
          <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
          <Text style={styles.recordDoctor}>{record.doctor}</Text>
        </View>
        <View style={styles.recordStatus}>
          <View style={[styles.statusDot, { backgroundColor: record.critical ? COLORS.EMERGENCY : COLORS.SUCCESS }]} />
          <Ionicons name="chevron-forward" size={20} color={COLORS.GRAY_MEDIUM} />
        </View>
      </View>
      <Text style={styles.recordSummary} numberOfLines={2}>
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Medical History</Text>
        <Text style={styles.subtitle}>Complete health record overview</Text>
      </View>

      {/* Patient Info Summary */}
      <Card style={styles.patientSummary}>
        <View style={styles.summaryHeader}>
          <View style={styles.patientAvatar}>
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
              <Ionicons name="person" size={24} color={COLORS.WHITE} />
            )}
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>
              {userProfile?.firstName} {userProfile?.lastName}
            </Text>
            <Text style={styles.patientDetails}>
              Age: {userProfile?.age || 'N/A'} • Blood Type: {userProfile?.bloodType || 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Records</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.appointments}</Text>
            <Text style={styles.statLabel}>Appointments</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.labResults}</Text>
            <Text style={styles.statLabel}>Lab Results</Text>
          </View>
        </View>
      </Card>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredHistory.length === 0 ? (
          <Card style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.GRAY_MEDIUM} />
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptySubtitle}>
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
        style={styles.fab}
        onPress={() => Alert.alert('Feature Coming Soon', 'Add new medical record functionality will be available soon.')}
      >
        <Ionicons name="add" size={24} color={COLORS.WHITE} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  title: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  patientSummary: {
    margin: SPACING.MD,
    marginBottom: SPACING.SM,
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
    backgroundColor: COLORS.PRIMARY,
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
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  patientDetails: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FONT_SIZES.LG,
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
  recordsList: {
    flex: 1,
    padding: SPACING.MD,
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
    marginBottom: SPACING.LG,
    paddingHorizontal: SPACING.LG,
  },
  emptyButton: {
    paddingHorizontal: SPACING.XL,
  },
  recordCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  recordDate: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  recordDoctor: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
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
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.LG,
    right: SPACING.LG,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default MedicalHistoryScreen;