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
  const [healthData, setHealthData] = useState({
    appointments: [],
    prescriptions: [],
    recentDocuments: [],
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
    
    return () => {
      if (unsubscribeAppointments) unsubscribeAppointments();
      if (unsubscribePrescriptions) unsubscribePrescriptions();
      if (unsubscribeDocuments) unsubscribeDocuments();
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
      
      setHealthData({
        appointments: appointmentsData,
        prescriptions: prescriptionsData,
        recentDocuments: documentsData.slice(0, 5), // Show only first 5 documents
        vitals: {} // Will be populated from other sources
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading health records:', error);
      setLoading(false);
    }
  };

  const QuickActionCard = ({ title, icon, color, onPress, count }) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color={COLORS.WHITE} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      {count !== undefined && (
        <Text style={styles.actionCount}>{count} items</Text>
      )}
    </TouchableOpacity>
  );

  const HealthSummaryCard = () => (
    <Card style={styles.summaryCard}>
      <Text style={styles.sectionTitle}>Health Summary</Text>
      
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Blood Type</Text>
          <Text style={styles.summaryValue}>{userProfile?.bloodType || 'Not set'}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Allergies</Text>
          <Text style={styles.summaryValue}>
            {userProfile?.allergies?.length > 0 ? userProfile.allergies.join(', ') : 'None'}
          </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Emergency Contact</Text>
          <Text style={styles.summaryValue}>{userProfile?.emergencyContact || 'Not set'}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Last Checkup</Text>
          <Text style={styles.summaryValue}>March 15, 2024</Text>
        </View>
      </View>
    </Card>
  );

  const RecentDocumentItem = ({ document }) => (
    <TouchableOpacity style={styles.documentItem}>
      <View style={styles.documentIcon}>
        <Ionicons 
          name={document.type === 'pdf' ? 'document-text' : 'image'} 
          size={20} 
          color={COLORS.PRIMARY} 
        />
      </View>
      <View style={styles.documentInfo}>
        <Text style={styles.documentName}>{document.name}</Text>
        <Text style={styles.documentDate}>{document.date}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.GRAY_MEDIUM} />
    </TouchableOpacity>
  );

  const PrescriptionItem = ({ prescription }) => (
    <TouchableOpacity style={styles.prescriptionItem}>
      <View style={styles.prescriptionInfo}>
        <Text style={styles.medicationName}>{prescription.medication}</Text>
        <Text style={styles.prescriptionDetails}>
          {prescription.dosage} • {prescription.frequency}
        </Text>
        <Text style={styles.prescriptionDoctor}>Prescribed by {prescription.doctor}</Text>
      </View>
      <View style={[styles.statusBadge, 
        { backgroundColor: prescription.status === 'active' ? COLORS.SUCCESS : COLORS.WARNING }
      ]}>
        <Text style={styles.statusText}>{prescription.status}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading health records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Health Records</Text>
          <Text style={styles.subtitle}>Manage your medical information</Text>
        </View>

        {/* Health Summary */}
        <HealthSummaryCard />

        {/* Quick Actions */}
        <View style={styles.quickActionsGrid}>
          <QuickActionCard
            title="Medical History"
            icon="time-outline"
            color={COLORS.PRIMARY}
            count={healthData.appointments.length}
            onPress={() => navigation.navigate('MedicalHistory')}
          />
          <QuickActionCard
            title="Upload Document"
            icon="cloud-upload-outline"
            color={COLORS.SUCCESS}
            onPress={() => navigation.navigate('UploadDocument')}
          />
          <QuickActionCard
            title="Prescriptions"
            icon="medical-outline"
            color={COLORS.ACCENT || COLORS.WARNING}
            count={healthData.prescriptions.length}
            onPress={() => navigation.navigate('Prescription')}
          />
          <QuickActionCard
            title="Lab Results"
            icon="flask-outline"
            color={COLORS.INFO}
            count={3}
            onPress={() => Alert.alert('Lab Results', 'Lab results feature coming soon')}
          />
        </View>

        {/* Recent Documents */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Documents</Text>
            <TouchableOpacity onPress={() => navigation.navigate('UploadDocument')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {healthData.recentDocuments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={COLORS.GRAY_MEDIUM} />
              <Text style={styles.emptyTitle}>No Documents</Text>
              <Text style={styles.emptySubtitle}>Upload your medical documents to keep them safe</Text>
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

        {/* Current Prescriptions */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Prescriptions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Prescription')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {healthData.prescriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={48} color={COLORS.GRAY_MEDIUM} />
              <Text style={styles.emptyTitle}>No Prescriptions</Text>
              <Text style={styles.emptySubtitle}>Your prescriptions will appear here</Text>
            </View>
          ) : (
            healthData.prescriptions.slice(0, 3).map((prescription) => (
              <PrescriptionItem key={prescription.id} prescription={prescription} />
            ))
          )}
        </Card>

        {/* Emergency Information */}
        <Card style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <Ionicons name="warning" size={24} color={COLORS.EMERGENCY} />
            <Text style={styles.emergencyTitle}>Emergency Information</Text>
          </View>
          <Text style={styles.emergencyText}>
            In case of emergency, medical professionals can access your blood type, allergies, and emergency contact information.
          </Text>
          <Button
            title="Update Emergency Info"
            onPress={() => navigation.navigate('ProfileMain')}
            variant="outline"
            style={styles.emergencyButton}
          />
        </Card>
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
    padding: SPACING.MD,
  },
  header: {
    marginBottom: SPACING.LG,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  summaryCard: {
    marginBottom: SPACING.MD,
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
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  summaryValue: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    alignItems: 'center',
    marginBottom: SPACING.MD,
    shadowColor: COLORS.BLACK,
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
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.XS,
  },
  actionCount: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  section: {
    marginBottom: SPACING.MD,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.XL,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.LG,
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
  uploadButton: {
    paddingHorizontal: SPACING.XL,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.GRAY_LIGHT,
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
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  documentDate: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  prescriptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  prescriptionInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  prescriptionDetails: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  prescriptionDoctor: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
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
    textTransform: 'uppercase',
  },
  emergencyCard: {
    backgroundColor: COLORS.EMERGENCY_LIGHT,
    marginBottom: SPACING.XL,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  emergencyTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.EMERGENCY,
    marginLeft: SPACING.SM,
  },
  emergencyText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 22,
    marginBottom: SPACING.MD,
  },
  emergencyButton: {
    borderColor: COLORS.EMERGENCY,
  },
});

export default HealthRecordsScreen;