import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy
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
import Button from '../components/Button';

const HealthRecordsScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [healthData, setHealthData] = useState({
    appointments: [],
    prescriptions: [],
    recentDocuments: [],
    labResults: [],
    vitals: {}
  });
  const [loading, setLoading] = useState(true);
  const appointmentsListenerRef = useRef(null);
  const prescriptionsListenerRef = useRef(null);
  const documentsListenerRef = useRef(null);

  useEffect(() => {
    loadHealthData();
    const unsubscribeAppointments = setupAppointmentsListener();
    const unsubscribePrescriptions = setupPrescriptionsListener();
    const unsubscribeDocuments = setupDocumentsListener();
    const unsubscribeLabResults = setupLabResultsListener();
    
    return () => {
      if (unsubscribeAppointments) unsubscribeAppointments();
      if (unsubscribePrescriptions) unsubscribePrescriptions();
      if (unsubscribeDocuments) unsubscribeDocuments();
      if (unsubscribeLabResults) unsubscribeLabResults();
    };
  }, []);

  const setupAppointmentsListener = () => {
    try {
      // Listen for user's appointments in real-time
      // Removed orderBy to avoid composite index requirement
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', user.uid)
        // Removed orderBy('appointmentDate', 'desc') to avoid composite index
      );
      
      return onSnapshot(appointmentsQuery, (snapshot) => {
        const appointmentsData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          appointmentsData.push({
            id: doc.id,
            ...data
          });
        });
        
        // Sort in memory instead of using Firestore orderBy
        appointmentsData.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
        
        setHealthData(prev => ({
          ...prev,
          appointments: appointmentsData
        }));
      }, (error) => {
        console.error('Error listening to appointments:', error);
      });
    } catch (error) {
      console.error('Error setting up appointments listener:', error);
      return null;
    }
  };

  const setupPrescriptionsListener = () => {
    try {
      // Listen for user's prescriptions in real-time
      // Removed orderBy to avoid composite index requirement
      const prescriptionsQuery = query(
        collection(db, 'prescriptions'),
        where('patientId', '==', user.uid)
        // Removed orderBy('createdAt', 'desc') to avoid composite index
      );
      
      return onSnapshot(prescriptionsQuery, (snapshot) => {
        const prescriptionsData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          prescriptionsData.push({
            id: doc.id,
            ...data
          });
        });
        
        // Sort in memory instead of using Firestore orderBy
        prescriptionsData.sort((a, b) => {
          const dateA = a.createdAt ? (typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate() : a.createdAt) : new Date(0);
          const dateB = b.createdAt ? (typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate() : b.createdAt) : new Date(0);
          return new Date(dateB) - new Date(dateA);
        });
        
        setHealthData(prev => ({
          ...prev,
          prescriptions: prescriptionsData
        }));
      }, (error) => {
        console.error('Error listening to prescriptions:', error);
      });
    } catch (error) {
      console.error('Error setting up prescriptions listener:', error);
      return null;
    }
  };

  const setupDocumentsListener = () => {
    try {
      // Listen for user's documents in real-time
      // Removed orderBy to avoid composite index requirement
      const documentsQuery = query(
        collection(db, 'users', user.uid, 'documents')
        // Removed orderBy('uploadDate', 'desc') to avoid composite index
      );
      
      return onSnapshot(documentsQuery, (snapshot) => {
        const documentsData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          documentsData.push({
            id: doc.id,
            ...data
          });
        });
        
        // Sort in memory instead of using Firestore orderBy
        documentsData.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        
        setHealthData(prev => ({
          ...prev,
          recentDocuments: documentsData.slice(0, 5) // Show only first 5 documents
        }));
      }, (error) => {
        console.error('Error listening to documents:', error);
      });
    } catch (error) {
      console.error('Error setting up documents listener:', error);
      return null;
    }
  };

  const setupLabResultsListener = () => {
    try {
      // Listen for user's lab results in real-time
      // Removed orderBy to avoid composite index requirement
      const labResultsQuery = query(
        collection(db, 'users', user.uid, 'labResults')
        // Removed orderBy('uploadDate', 'desc') to avoid composite index
      );
      
      return onSnapshot(labResultsQuery, (snapshot) => {
        const labResultsData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          labResultsData.push({
            id: doc.id,
            ...data
          });
        });
        
        // Sort in memory instead of using Firestore orderBy
        labResultsData.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        
        setHealthData(prev => ({
          ...prev,
          labResults: labResultsData
        }));
      }, (error) => {
        console.error('Error listening to lab results:', error);
      });
    } catch (error) {
      console.error('Error setting up lab results listener:', error);
      return null;
    }
  };

  const loadLabResults = async () => {
    try {
      // Load lab results
      // Removed orderBy to avoid composite index requirement
      const labResultsQuery = query(
        collection(db, 'users', user.uid, 'labResults')
        // Removed orderBy('uploadDate', 'desc') to avoid composite index
      );
      
      const labResultsSnapshot = await getDocs(labResultsQuery);
      const labResultsData = [];
      labResultsSnapshot.forEach((doc) => {
        const data = doc.data();
        labResultsData.push({
          id: doc.id,
          ...data
        });
      });
      
      // Sort in memory instead of using Firestore orderBy
      labResultsData.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      
      return labResultsData;
    } catch (error) {
      console.error('Error loading lab results:', error);
      return [];
    }
  };

  const loadHealthData = async () => {
    try {
      setLoading(true);
      
      // Load appointments
      // Removed orderBy to avoid composite index requirement
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', user.uid)
        // Removed orderBy('appointmentDate', 'desc') to avoid composite index
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointmentsData = [];
      appointmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        appointmentsData.push({
          id: doc.id,
          ...data
        });
      });
      
      // Sort in memory instead of using Firestore orderBy
      appointmentsData.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
      
      // Load prescriptions
      // Removed orderBy to avoid composite index requirement
      const prescriptionsQuery = query(
        collection(db, 'prescriptions'),
        where('patientId', '==', user.uid)
        // Removed orderBy('createdAt', 'desc') to avoid composite index
      );
      
      const prescriptionsSnapshot = await getDocs(prescriptionsQuery);
      const prescriptionsData = [];
      prescriptionsSnapshot.forEach((doc) => {
        const data = doc.data();
        prescriptionsData.push({
          id: doc.id,
          ...data
        });
      });
      
      // Sort in memory instead of using Firestore orderBy
      prescriptionsData.sort((a, b) => {
        const dateA = a.createdAt ? (typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate() : a.createdAt) : new Date(0);
        const dateB = b.createdAt ? (typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate() : b.createdAt) : new Date(0);
        return new Date(dateB) - new Date(dateA);
      });
      
      // Load documents
      // Removed orderBy to avoid composite index requirement
      const documentsQuery = query(
        collection(db, 'users', user.uid, 'documents')
        // Removed orderBy('uploadDate', 'desc') to avoid composite index
      );
      
      const documentsSnapshot = await getDocs(documentsQuery);
      const documentsData = [];
      documentsSnapshot.forEach((doc) => {
        const data = doc.data();
        documentsData.push({
          id: doc.id,
          ...data
        });
      });
      
      // Sort in memory instead of using Firestore orderBy
      documentsData.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      
      // Load lab results
      const labResultsData = await loadLabResults();
      
      setHealthData({
        appointments: appointmentsData,
        prescriptions: prescriptionsData,
        recentDocuments: documentsData.slice(0, 5), // Show only first 5 documents
        labResults: labResultsData,
        vitals: {} // Will be populated from other sources
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading health records:', error);
      setLoading(false);
    }
  };

  const QuickActionCard = ({ title, icon, color, onPress, count }) => (
    <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: theme.CARD_BACKGROUND }]} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color={theme.WHITE} />
      </View>
      <Text style={[styles.actionTitle, { color: theme.TEXT_PRIMARY }]}>{title}</Text>
      {count !== undefined && (
        <Text style={[styles.actionCount, { color: theme.TEXT_SECONDARY }]}>{count} items</Text>
      )}
    </TouchableOpacity>
  );

  const HealthSummaryCard = () => (
    <Card style={[styles.summaryCard, { backgroundColor: theme.CARD_BACKGROUND }]}>
      <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Health Summary</Text>
      
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.TEXT_SECONDARY }]}>Blood Type</Text>
          <Text style={[styles.summaryValue, { color: theme.TEXT_PRIMARY }]}>{userProfile?.bloodType || 'Not set'}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.TEXT_SECONDARY }]}>Allergies</Text>
          <Text style={[styles.summaryValue, { color: theme.TEXT_PRIMARY }]}>
            {userProfile?.allergies?.length > 0 ? userProfile.allergies.join(', ') : 'None'}
          </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.TEXT_SECONDARY }]}>Emergency Contact</Text>
          <Text style={[styles.summaryValue, { color: theme.TEXT_PRIMARY }]}>{userProfile?.emergencyContact || 'Not set'}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.TEXT_SECONDARY }]}>Last Checkup</Text>
          <Text style={[styles.summaryValue, { color: theme.TEXT_PRIMARY }]}>March 15, 2024</Text>
        </View>
      </View>
    </Card>
  );

  const RecentDocumentItem = ({ document }) => (
    <TouchableOpacity style={[styles.documentItem, { borderBottomColor: theme.BORDER }]}>
      <View style={[styles.documentIcon, { backgroundColor: theme.GRAY_LIGHT }]}>
        <Ionicons 
          name={document.type === 'pdf' ? 'document-text' : 'image'} 
          size={20} 
          color={theme.PRIMARY} 
        />
      </View>
      <View style={styles.documentInfo}>
        <Text style={[styles.documentName, { color: theme.TEXT_PRIMARY }]}>{document.name}</Text>
        <Text style={[styles.documentDate, { color: theme.TEXT_SECONDARY }]}>{document.date}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.GRAY_MEDIUM} />
    </TouchableOpacity>
  );

  const PrescriptionItem = ({ prescription }) => (
    <TouchableOpacity style={[styles.prescriptionItem, { borderBottomColor: theme.BORDER }]}>
      <View style={styles.prescriptionInfo}>
        <Text style={[styles.medicationName, { color: theme.TEXT_PRIMARY }]}>{prescription.medication}</Text>
        <Text style={[styles.prescriptionDetails, { color: theme.TEXT_SECONDARY }]}>
          {prescription.dosage} • {prescription.frequency}
        </Text>
        <Text style={[styles.prescriptionDoctor, { color: theme.TEXT_SECONDARY }]}>Prescribed by {prescription.doctor}</Text>
      </View>
      <View style={[styles.statusBadge, 
        { backgroundColor: prescription.status === 'active' ? theme.SUCCESS : theme.WARNING }
      ]}>
        <Text style={[styles.statusText, { color: theme.WHITE }]}>{prescription.status}</Text>
      </View>
    </TouchableOpacity>
  );

  // Update LabResultItem component to handle file viewing
  const LabResultItem = ({ labResult }) => (
    <TouchableOpacity 
      style={[styles.documentItem, { borderBottomColor: theme.BORDER }]}
      onPress={() => {
        // Show options for viewing the lab result
        Alert.alert(
          labResult.title,
          `Doctor: ${labResult.doctorName}\nLicense: ${labResult.doctorLicense}\n\nUploaded: ${new Date(labResult.uploadDate).toLocaleDateString()}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'View File', 
              onPress: () => {
                // In a real implementation, you would open the file
                // For now, just show the URL
                Alert.alert('File URL', labResult.fileUrl || 'File URL not available', [{ text: 'OK' }]);
              } 
            }
          ]
        );
      }}
    >
      <View style={[styles.documentIcon, { backgroundColor: theme.GRAY_LIGHT }]}>
        <Ionicons 
          name={labResult.fileType?.includes('pdf') ? 'document-text' : 'image'} 
          size={20} 
          color={theme.INFO} 
        />
      </View>
      <View style={styles.documentInfo}>
        <Text style={[styles.documentName, { color: theme.TEXT_PRIMARY }]}>{labResult.title}</Text>
        <Text style={[styles.documentDate, { color: theme.TEXT_SECONDARY }]}>
          {new Date(labResult.uploadDate).toLocaleDateString()} • {labResult.doctorName}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.GRAY_MEDIUM} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.PRIMARY} />
          <Text style={[styles.loadingText, { color: theme.TEXT_SECONDARY }]}>Loading health records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.TEXT_PRIMARY }]}>Health Records</Text>
          <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>Manage your medical information</Text>
        </View>

        {/* Health Summary */}
        <HealthSummaryCard />

        {/* Quick Actions */}
        <View style={styles.quickActionsGrid}>
          <QuickActionCard
            title="Medical History"
            icon="time-outline"
            color={theme.PRIMARY}
            count={healthData.appointments.length}
            onPress={() => navigation.navigate('MedicalHistory')}
          />
          <QuickActionCard
            title="Upload Document"
            icon="cloud-upload-outline"
            color={theme.SUCCESS}
            onPress={() => navigation.navigate('UploadDocument')}
          />
          <QuickActionCard
            title="Prescriptions"
            icon="medical-outline"
            color={theme.ACCENT || theme.WARNING}
            count={healthData.prescriptions.length}
            onPress={() => navigation.navigate('Prescription')}
          />
          <QuickActionCard
            title="Lab Results"
            icon="flask-outline"
            color={theme.INFO}
            count={healthData.labResults.length}
            onPress={() => navigation.navigate('MedicalHistory', { filterType: 'lab-result' })}
          />
        </View>

        {/* Recent Documents */}
        <Card style={[styles.section, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Recent Documents</Text>
            <TouchableOpacity onPress={() => navigation.navigate('UploadDocument')}>
              <Text style={[styles.viewAllText, { color: theme.PRIMARY }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {healthData.recentDocuments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={theme.GRAY_MEDIUM} />
              <Text style={[styles.emptyTitle, { color: theme.TEXT_PRIMARY }]}>No Documents</Text>
              <Text style={[styles.emptySubtitle, { color: theme.TEXT_SECONDARY }]}>Upload your medical documents to keep them safe</Text>
              <Button
                title="Upload Document"
                onPress={() => navigation.navigate('UploadDocument')}
                style={styles.uploadButton}
                variant="outline"
              />
            </View>
          ) : (
            healthData.recentDocuments.map((document) => (
              <RecentDocumentItem key={document.id} document={document} />
            ))
          )}
        </Card>

        {/* Lab Results Section */}
        <Card style={[styles.section, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Recent Lab Results</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MedicalHistory', { filterType: 'lab-result' })}>
              <Text style={[styles.viewAllText, { color: theme.PRIMARY }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {healthData.labResults.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flask-outline" size={48} color={theme.GRAY_MEDIUM} />
              <Text style={[styles.emptyTitle, { color: theme.TEXT_PRIMARY }]}>No Lab Results</Text>
              <Text style={[styles.emptySubtitle, { color: theme.TEXT_SECONDARY }]}>Your lab results will appear here</Text>
            </View>
          ) : (
            healthData.labResults.slice(0, 3).map((labResult) => (
              <LabResultItem key={labResult.id} labResult={labResult} />
            ))
          )}
        </Card>

        {/* Current Prescriptions */}
        <Card style={[styles.section, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Current Prescriptions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Prescription')}>
              <Text style={[styles.viewAllText, { color: theme.PRIMARY }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {healthData.prescriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={48} color={theme.GRAY_MEDIUM} />
              <Text style={[styles.emptyTitle, { color: theme.TEXT_PRIMARY }]}>No Prescriptions</Text>
              <Text style={[styles.emptySubtitle, { color: theme.TEXT_SECONDARY }]}>Your prescriptions will appear here</Text>
            </View>
          ) : (
            healthData.prescriptions.slice(0, 3).map((prescription) => (
              <PrescriptionItem key={prescription.id} prescription={prescription} />
            ))
          )}
        </Card>

        {/* Emergency Information */}
        <Card style={[styles.emergencyCard, { backgroundColor: theme.EMERGENCY_LIGHT }]}>
          <View style={styles.emergencyHeader}>
            <Ionicons name="warning" size={24} color={theme.EMERGENCY} />
            <Text style={[styles.emergencyTitle, { color: theme.EMERGENCY }]}>Emergency Information</Text>
          </View>
          <Text style={[styles.emergencyText, { color: theme.TEXT_PRIMARY }]}>
            In case of emergency, medical professionals can access your blood type, allergies, and emergency contact information.
          </Text>
          <Button
            title="Update Emergency Info"
            onPress={() => navigation.navigate('ProfileMain')}
            variant="outline"
            style={[styles.emergencyButton, { borderColor: theme.EMERGENCY }]}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};



const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  header: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.LG,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
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
  content: {
    flex: 1,
    padding: SPACING.MD,
  },
  summaryCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    marginBottom: SPACING.MD,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  summaryValue: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: theme.CARD_BACKGROUND,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    alignItems: 'center',
    marginBottom: SPACING.MD,
    shadowColor: theme.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  actionTitle: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.XS,
  },
  actionCount: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
  },
  section: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
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
    paddingVertical: SPACING.XL,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.LG,
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
  },
  uploadButton: {
    paddingHorizontal: SPACING.XL,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.GRAY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '500',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  documentDate: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  prescriptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  prescriptionInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  prescriptionDetails: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  prescriptionDoctor: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
  },
  statusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS / 2,
    borderRadius: BORDER_RADIUS.SM,
  },
  statusText: {
    fontSize: FONT_SIZES.XS,
    color: theme.WHITE,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emergencyCard: {
    backgroundColor: theme.EMERGENCY_LIGHT,
    marginBottom: SPACING.XL,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  emergencyTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.EMERGENCY,
    marginLeft: SPACING.SM,
  },
  emergencyText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    lineHeight: 22,
    marginBottom: SPACING.MD,
  },
  emergencyButton: {
    borderColor: theme.EMERGENCY,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.BACKGROUND,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
  },
});

export default HealthRecordsScreen;