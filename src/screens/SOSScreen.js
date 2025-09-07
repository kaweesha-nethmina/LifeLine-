import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  AppState,
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  EMERGENCY_STATUS
} from '../constants';
import Card from '../components/Card';
import Button from '../components/Button';
import LocationService from '../services/locationService';
import { db, collection, addDoc, doc, updateDoc, query, where, getDocs } from '../services/firebase';
import { serverTimestamp } from 'firebase/firestore';
import EmergencyMapScreen from './EmergencyMapScreen';

const SOSScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationTracking, setLocationTracking] = useState(false);
  const [emergencyId, setEmergencyId] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const locationSubscriptionRef = useRef(null);
  const countdownRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' && isEmergencyActive) {
        // App is going to background while emergency is active
        console.log('App going to background during emergency');
      } else if (nextAppState === 'active' && isEmergencyActive) {
        // App is coming to foreground while emergency is active
        console.log('App coming to foreground during emergency');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
    };
  }, [isEmergencyActive]);

  const startEmergency = async () => {
    try {
      // Show confirmation dialog
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error initiating emergency:', error);
      Alert.alert('Error', 'Failed to initiate emergency. Please try again.');
    }
  };

  const confirmEmergency = async () => {
    setShowConfirmation(false);
    
    // Start countdown
    setCountdown(5);
    let count = 5;
    
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      
      if (count <= 0) {
        clearInterval(countdownRef.current);
        activateEmergency();
      }
    }, 1000);
  };

  const cancelEmergency = () => {
    setShowConfirmation(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
  };

  const activateEmergency = async () => {
    try {
      // Vibrate device
      Vibration.vibrate([500, 500, 500], true);
      
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
        status: EMERGENCY_STATUS.PENDING, // Use proper status constant
        priority: 'high', // Default priority
        type: 'SOS Emergency',
        description: 'Emergency SOS activated by user',
        notes: '',
        // Add additional fields that emergency operators expect
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
      
      // Show alert
      Alert.alert(
        'Emergency Activated',
        'Help is on the way. Emergency services have been notified.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error activating emergency:', error);
      Vibration.cancel();
      Alert.alert('Error', 'Failed to activate emergency. Please try again.');
    }
  };

  const notifyEmergencyOperators = async (emergencyData, emergencyId) => {
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
            title: 'Emergency Alert',
            message: `SOS from ${emergencyData.patientName || 'Unknown User'} at location (${emergencyData.latitude.toFixed(6)}, ${emergencyData.longitude.toFixed(6)})`,
            type: 'emergency',
            category: 'emergency',
            priority: 'urgent',
            data: {
              emergencyId: emergencyId,
              userId: emergencyData.userId,
              userName: emergencyData.patientName,
              userPhone: emergencyData.phone,
              latitude: emergencyData.latitude,
              longitude: emergencyData.longitude,
              timestamp: emergencyData.timestamp
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

  const startLocationTracking = async () => {
    try {
      setLocationTracking(true);
      
      locationSubscriptionRef.current = await LocationService.startLocationTracking(
        async (newLocation) => {
          setLocation(newLocation);
          
          // Update emergency location in Firebase
          if (emergencyId) {
            try {
              await LocationService.updateEmergencyLocation(emergencyId, newLocation);
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
            status: EMERGENCY_STATUS.COMPLETED, // Use proper status constant
            resolvedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Error updating emergency status:', error);
        }
      }
      
      setIsEmergencyActive(false);
      setLocationTracking(false);
      setEmergencyId(null);
      
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

  const viewMap = () => {
    navigation.navigate('EmergencyMap', { 
      location,
      emergencyId,
      isEmergencyActive
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Emergency SOS</Text>
          <Text style={styles.subtitle}>
            Immediate help when you need it most
          </Text>
        </View>

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

        {/* Main SOS Button */}
        <View style={styles.sosContainer}>
          <TouchableOpacity
            style={[
              styles.sosButton,
              isEmergencyActive && styles.sosButtonActive
            ]}
            onPress={isEmergencyActive ? endEmergency : startEmergency}
            disabled={showConfirmation}
          >
            <Ionicons 
              name={isEmergencyActive ? "stop-circle" : "radio-button-on"} 
              size={80} 
              color={isEmergencyActive ? COLORS.WHITE : COLORS.EMERGENCY} 
            />
          </TouchableOpacity>
          <Text style={styles.sosLabel}>
            {isEmergencyActive ? 'End Emergency' : 'Activate SOS'}
          </Text>
        </View>

        {/* Emergency Actions */}
        {isEmergencyActive && (
          <View style={styles.actionsContainer}>
            <Button
              title="View on Map"
              onPress={viewMap}
              style={styles.actionButton}
              textStyle={styles.actionButtonText}
            />
            <Button
              title="Call Emergency"
              onPress={() => {}}
              style={[styles.actionButton, styles.callButton]}
              textStyle={styles.actionButtonText}
            />
          </View>
        )}

        {/* Quick Information */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>Emergency Information</Text>
          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.infoText}>
              Name: {userProfile?.firstName} {userProfile?.lastName}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="call" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.infoText}>
              Phone: {userProfile?.phone || 'Not set'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="location" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.infoText}>
              Blood Type: {userProfile?.bloodType || 'Not set'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="alert-circle" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.infoText}>
              Medical Conditions: {userProfile?.medicalConditions?.join(', ') || 'None'}
            </Text>
          </View>
        </Card>

        {/* Emergency Contacts */}
        <Card style={styles.contactsCard}>
          <Text style={styles.contactsTitle}>Emergency Contacts</Text>
          {userProfile?.emergencyContacts?.length > 0 ? (
            userProfile.emergencyContacts.map((contact, index) => (
              <View key={index} style={styles.contactItem}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <TouchableOpacity style={styles.contactCallButton}>
                  <Ionicons name="call" size={20} color={COLORS.WHITE} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.noContactsText}>No emergency contacts added</Text>
          )}
        </Card>
      </View>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <View style={styles.overlay}>
          <Card style={styles.confirmationCard}>
            <Ionicons name="warning" size={48} color={COLORS.EMERGENCY} />
            <Text style={styles.confirmationTitle}>Activate Emergency?</Text>
            <Text style={styles.confirmationText}>
              This will notify emergency services and your emergency contacts.
            </Text>
            <Text style={styles.countdownText}>{countdown}</Text>
            <View style={styles.confirmationButtons}>
              <Button
                title="Cancel"
                onPress={cancelEmergency}
                style={styles.cancelButton}
              />
              <Button
                title="Confirm"
                onPress={confirmEmergency}
                style={styles.confirmButton}
              />
            </View>
          </Card>
        </View>
      )}
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
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  title: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.EMERGENCY,
    marginBottom: SPACING.XS,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MD,
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
  sosContainer: {
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  sosButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.EMERGENCY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButtonActive: {
    backgroundColor: COLORS.ERROR,
  },
  sosLabel: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.SM,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.LG,
  },
  actionButton: {
    width: '48%',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.SM,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  callButton: {
    backgroundColor: COLORS.WARNING,
  },
  infoCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  infoTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  infoText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
  },
  contactsCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
  },
  contactsTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
  },
  contactPhone: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.GRAY_MEDIUM,
  },
  contactCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noContactsText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.GRAY_MEDIUM,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    alignItems: 'center',
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
    marginBottom: SPACING.SM,
  },
  countdownText: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.EMERGENCY,
    marginBottom: SPACING.LG,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: COLORS.ERROR,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.SM,
    flex: 1,
    marginRight: SPACING.SM,
  },
  confirmButton: {
    backgroundColor: COLORS.SUCCESS,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.SM,
    flex: 1,
  },
});

export default SOSScreen;