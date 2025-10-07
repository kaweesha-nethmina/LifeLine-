import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Vibration,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import Button from '../components/Button';
import { COLORS, FONT_SIZES, SPACING, EMERGENCY_STATUS } from '../constants';
import { useAuth } from '../context/AuthContext';
import LocationService from '../services/locationService';
import { db, collection, addDoc, query, where, getDocs, doc, updateDoc } from '../services/firebase';
import { serverTimestamp } from 'firebase/firestore';

const EmergencyScreen = ({ navigation, route }) => {
  const { user, userProfile } = useAuth();
  const [isActivating, setIsActivating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyId, setEmergencyId] = useState(null);
  const [location, setLocation] = useState(null);
  const paramsProcessedRef = useRef(false); // Track if we've processed route params
  const locationSubscriptionRef = useRef(null);

  // Check if this is a direct SOS activation from heart patient
  useEffect(() => {
    // Only process route params once to prevent re-triggering
    if (!paramsProcessedRef.current) {
      const immediateSOS = route.params?.immediateSOS;
      const isHeartPatient = route.params?.isHeartPatient;
      const quickSOS = route.params?.quickSOS;
      
      if (immediateSOS && isHeartPatient && !isEmergencyActive) {
        // For heart patients, activate SOS immediately without confirmation
        paramsProcessedRef.current = true;
        activateHeartSOS();
      } else if (quickSOS && userProfile?.isHeartPatient && !isEmergencyActive) {
        // Show confirmation immediately for heart patients using quick SOS
        // Only show if emergency is not already active
        paramsProcessedRef.current = true;
        setShowConfirmation(true);
      } else if (immediateSOS !== undefined || quickSOS !== undefined) {
        // Mark as processed even if conditions don't match to prevent future triggering
        paramsProcessedRef.current = true;
      }
    }
  }, [route.params, isEmergencyActive, userProfile?.isHeartPatient]);
  
  // Reset params processed flag when component unmounts
  useEffect(() => {
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
      // Reset params processed flag when component unmounts
      paramsProcessedRef.current = false;
    };
  }, []);

  // Special SOS activation for heart patients (faster, no delay)
  const activateHeartSOS = async () => {
    setIsActivating(true);
    
    try {
      // Vibrate device with more urgent pattern for heart patients
      Vibration.vibrate([1000, 1000, 1000], true); // Continuous vibration
      
      // Get current location
      const currentLocation = await LocationService.getCurrentLocation();
      setLocation(currentLocation);
      
      // Save emergency to Firebase with high priority for heart patients
      const emergencyData = {
        userId: user.uid,
        patientName: userProfile?.firstName && userProfile?.lastName ? 
          `${userProfile.firstName} ${userProfile.lastName}` : 
          userProfile?.name || 'Unknown User',
        phone: userProfile?.phone || 'Unknown',
        age: userProfile?.age || 'N/A',
        medicalHistory: userProfile?.medicalConditions?.join(', ') || 'None',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        location: `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: EMERGENCY_STATUS.PENDING,
        priority: 'critical', // Higher priority for heart patients
        type: 'Heart Emergency SOS',
        description: 'Critical heart emergency activated by heart patient',
        notes: 'Heart patient - immediate response required',
        assignedUnit: null,
        responseTime: null,
        resolvedAt: null,
        isHeartPatient: true // Flag for heart patient emergency
      };

      const docRef = await addDoc(collection(db, 'emergencies'), emergencyData);
      setEmergencyId(docRef.id);
      setIsEmergencyActive(true);
      
      // Notify emergency operators with urgent priority
      await notifyEmergencyOperators(emergencyData, docRef.id, true); // urgent flag
      
      // Start location tracking
      startLocationTracking();
      
      // Show success alert
      Alert.alert(
        'Heart Emergency Activated',
        'Critical emergency services notified immediately. Help is on the way.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error activating heart emergency:', error);
      Vibration.cancel();
      Alert.alert('Error', 'Failed to activate emergency. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  const activateSOS = async () => {
    setShowConfirmation(false);
    setIsActivating(true);
    
    try {
      // Vibrate device
      Vibration.vibrate([500, 500, 500], true); // Continuous vibration
      
      // Get current location
      const currentLocation = await LocationService.getCurrentLocation();
      setLocation(currentLocation);
      
      // Save emergency to Firebase with proper structure for emergency operators
      const emergencyData = {
        userId: user.uid,
        patientName: userProfile?.firstName && userProfile?.lastName ? 
          `${userProfile.firstName} ${userProfile.lastName}` : 
          userProfile?.name || 'Unknown User',
        phone: userProfile?.phone || 'Unknown',
        age: userProfile?.age || 'N/A',
        medicalHistory: userProfile?.medicalConditions?.join(', ') || 'None',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        location: `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: EMERGENCY_STATUS.PENDING,
        priority: 'high',
        type: 'SOS Emergency',
        description: 'Emergency SOS activated by user',
        notes: '',
        assignedUnit: null,
        responseTime: null,
        resolvedAt: null
      };

      const docRef = await addDoc(collection(db, 'emergencies'), emergencyData);
      setEmergencyId(docRef.id);
      setIsEmergencyActive(true);
      
      // Notify emergency operators
      await notifyEmergencyOperators(emergencyData, docRef.id);
      
      // Start location tracking
      startLocationTracking();
      
      // Show success alert
      Alert.alert(
        'Emergency Activated',
        'Help is on the way. Emergency services have been notified.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error activating emergency:', error);
      Vibration.cancel();
      Alert.alert('Error', 'Failed to activate emergency. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      locationSubscriptionRef.current = await LocationService.startLocationTracking(
        async (newLocation) => {
          setLocation(newLocation);
          
          // Update emergency location in Firebase
          if (emergencyId) {
            try {
              const emergencyRef = doc(db, 'emergencies', emergencyId);
              await updateDoc(emergencyRef, {
                latitude: newLocation.latitude,
                longitude: newLocation.longitude,
                accuracy: newLocation.accuracy,
                updatedAt: serverTimestamp()
              });
            } catch (error) {
              console.error('Error updating emergency location:', error);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Location Error', 'Failed to start location tracking.');
    }
  };

  const endEmergency = async () => {
    try {
      // Stop vibration
      Vibration.cancel();
      
      // Stop location tracking
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      
      // Update emergency status in Firebase
      if (emergencyId) {
        try {
          const emergencyRef = doc(db, 'emergencies', emergencyId);
          await updateDoc(emergencyRef, {
            status: EMERGENCY_STATUS.COMPLETED,
            resolvedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Error updating emergency status:', error);
        }
      }
      
      setIsEmergencyActive(false);
      setEmergencyId(null);
      setLocation(null);
      
      Alert.alert(
        'Emergency Ended',
        'Emergency status has been deactivated.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error ending emergency:', error);
      Alert.alert('Error', 'Failed to end emergency. Please try again.');
    }
  };

  const notifyEmergencyOperators = async (emergencyData, emergencyId, isUrgent = false) => {
    try {
      // Query all users with role 'emergency_operator'
      const operatorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'emergency_operator')
      );
      
      const operatorsSnapshot = await getDocs(operatorsQuery);
      
      // Create notifications for each emergency operator
      const notificationPromises = [];
      
      operatorsSnapshot.forEach((doc) => {
        const operator = doc.data();
        if (operator.uid) {
          const notificationData = {
            userId: operator.uid,
            title: isUrgent ? 'CRITICAL HEART EMERGENCY' : 'Emergency Alert',
            message: `SOS from ${emergencyData.patientName || 'Unknown User'} at location (${emergencyData.latitude.toFixed(6)}, ${emergencyData.longitude.toFixed(6)})`,
            type: 'emergency',
            category: 'emergency',
            priority: isUrgent ? 'critical' : 'urgent',
            data: {
              emergencyId: emergencyId,
              userId: emergencyData.userId,
              userName: emergencyData.patientName,
              userPhone: emergencyData.phone,
              latitude: emergencyData.latitude,
              longitude: emergencyData.longitude,
              timestamp: emergencyData.timestamp,
              isHeartPatient: emergencyData.isHeartPatient || false
            },
            actionUrl: `/emergency/${emergencyId}`
          };
          
          // Create notification in Firebase
          const notificationPromise = addDoc(collection(db, 'notifications'), {
            ...notificationData,
            timestamp: serverTimestamp(),
            read: false
          });
          
          notificationPromises.push(notificationPromise);
        }
      });
      
      // Wait for all notifications to be created
      await Promise.all(notificationPromises);
      
      console.log(`Notified ${operatorsSnapshot.size} emergency operators`);
    } catch (error) {
      console.error('Error notifying emergency operators:', error);
      // Don't throw error as this shouldn't prevent the emergency from being activated
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Emergency Status */}
          {isEmergencyActive && (
            <Card style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Ionicons name="warning" size={24} color={COLORS.EMERGENCY} />
                <Text style={styles.statusTitle}>Emergency Active</Text>
              </View>
              <Text style={styles.statusText}>
                Emergency services have been notified. Help is on the way.
              </Text>
              {location && (
                <Text style={styles.locationText}>
                  Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              )}
            </Card>
          )}

          {/* SOS Button */}
          <Card style={styles.sosCard}>
            <View style={styles.sosContainer}>
              <TouchableOpacity
                style={[
                  styles.sosButton,
                  isEmergencyActive && styles.sosButtonActive
                ]}
                onPress={isEmergencyActive ? endEmergency : () => setShowConfirmation(true)}
                disabled={isActivating}
              >
                <Ionicons 
                  name={isEmergencyActive ? "stop-circle" : "warning"} 
                  size={60} 
                  color={isEmergencyActive ? COLORS.WHITE : COLORS.WHITE} 
                />
                <Text style={styles.sosText}>
                  {isEmergencyActive ? 'STOP SOS' : 'SOS'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.sosDescription}>
                {isActivating ? 'Activating emergency...' : 
                 isEmergencyActive ? 'Press to stop emergency' : 
                 'Press to activate emergency SOS'}
              </Text>
            </View>
          </Card>

          {/* Emergency Contacts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            {emergencyContacts.map((contact, index) => (
              <Card key={index} style={styles.contactCard}>
                <View style={styles.contactItem}>
                  <View style={styles.contactIcon}>
                    <Ionicons name={contact.icon} size={24} color={COLORS.EMERGENCY} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactNumber}>{contact.number}</Text>
                  </View>
                  <Button
                    title="Call"
                    onPress={() => {}}
                    variant="emergency"
                    size="small"
                  />
                </View>
              </Card>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Features</Text>
            <Button
              title="Share Live Location"
              onPress={() => navigation.navigate('EmergencyMap')}
              variant="outline"
              size="large"
              style={styles.actionButton}
              icon={<Ionicons name="location" size={20} color={COLORS.PRIMARY} />}
            />
            <Button
              title="First Aid Guide"
              onPress={() => navigation.navigate('FirstAid')}
              variant="outline"
              size="large"
              style={styles.actionButton}
              icon={<Ionicons name="book" size={20} color={COLORS.PRIMARY} />}
            />
          </View>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showConfirmation}
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.overlay}>
          <Card style={styles.confirmationCard}>
            <Ionicons name="warning" size={48} color={COLORS.EMERGENCY} />
            <Text style={styles.confirmationTitle}>Activate Emergency?</Text>
            <Text style={styles.confirmationText}>
              This will notify emergency services and your emergency contacts.
            </Text>
            <View style={styles.confirmationButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowConfirmation(false)}
                style={styles.cancelButton}
              />
              <Button
                title="Confirm"
                onPress={activateSOS}
                style={styles.confirmButton}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const emergencyContacts = [
  { name: 'Ambulance', number: '911', icon: 'medical' },
  { name: 'Fire Department', number: '911', icon: 'flame' },
  { name: 'Police', number: '911', icon: 'shield' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
  },
  statusCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  statusTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  statusText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  locationText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.GRAY_MEDIUM,
  },
  sosCard: {
    backgroundColor: COLORS.EMERGENCY_LIGHT,
    marginBottom: SPACING.XL,
  },
  sosContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.LG,
  },
  sosButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.EMERGENCY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosButtonActive: {
    backgroundColor: COLORS.ERROR,
  },
  sosText: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginTop: SPACING.SM,
  },
  sosDescription: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.SM,
  },
  section: {
    marginBottom: SPACING.XL,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  contactCard: {
    marginBottom: SPACING.SM,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.EMERGENCY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  contactNumber: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  actionButton: {
    marginBottom: SPACING.MD,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    padding: SPACING.MD,
    alignItems: 'center',
    width: '80%',
  },
  confirmationTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  confirmationText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.LG,
    textAlign: 'center',
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: COLORS.ERROR,
    borderRadius: 8,
    paddingVertical: SPACING.SM,
    flex: 1,
    marginRight: SPACING.SM,
  },
  confirmButton: {
    backgroundColor: COLORS.SUCCESS,
    borderRadius: 8,
    paddingVertical: SPACING.SM,
    flex: 1,
  },
});

export default EmergencyScreen;