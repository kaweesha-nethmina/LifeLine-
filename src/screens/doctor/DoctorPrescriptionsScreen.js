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
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext'; // Add this import
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { NotificationService } from '../../services/notificationService';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';

const DoctorPrescriptionsScreen = ({ navigation, route }) => {
  const { userProfile } = useAuth();
  const { theme } = useTheme(); // Add this hook
  const { patientId, patientName, action } = route.params || {};
  
  const [prescriptions, setPrescriptions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('active'); // active, expired, all
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [prescriptionItems, setPrescriptionItems] = useState([{ 
    medicationName: '', 
    dosage: '', 
    frequency: '', 
    instructions: '', 
    duration: '30',
    refills: '2'
  }]); // For multiple drugs
  const [detailPrescription, setDetailPrescription] = useState(null);

  useEffect(() => {
    loadPrescriptions();
  }, [patientId, userProfile?.uid]);

  useEffect(() => {
    console.log('DoctorPrescriptionsScreen route params:', { patientId, patientName, action });
    if (action === 'create') {
      console.log('Showing create modal due to action=create');
      setShowCreateModal(true);
    }
  }, [action, patientId, patientName]);

  const loadPrescriptions = async () => {
    try {
      console.log('Loading prescriptions with params:', { patientId, doctorId: userProfile?.uid });
      // Fetch prescriptions from Firebase
      let prescriptionsQuery = collection(db, 'prescriptions');
      
      // Filter by doctor if available
      if (userProfile?.uid) {
        prescriptionsQuery = query(
          prescriptionsQuery,
          where('doctorId', '==', userProfile.uid)
        );
      }
      
      // Filter by patient if specified
      if (patientId) {
        prescriptionsQuery = query(
          prescriptionsQuery,
          where('patientId', '==', patientId)
        );
      }
      
      // Order by creation date
      prescriptionsQuery = query(
        prescriptionsQuery,
      );
      
      const prescriptionsSnapshot = await getDocs(prescriptionsQuery);
      const prescriptionsData = [];
      
      prescriptionsSnapshot.forEach((doc) => {
        prescriptionsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort in memory instead of using Firestore orderBy
      prescriptionsData.sort((a, b) => {
        const dateA = a.createdAt ? (typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate() : a.createdAt) : new Date(0);
        const dateB = b.createdAt ? (typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate() : b.createdAt) : new Date(0);
        return new Date(dateB) - new Date(dateA);
      });
      
      console.log('Loaded prescriptions:', prescriptionsData.length);
      setPrescriptions(prescriptionsData);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  };

  const getPrescriptionStatus = (prescription) => {
    const now = new Date();
    const endDate = new Date(prescription.endDate);
    
    if (endDate < now) return 'expired';
    if (prescription.refillsRemaining <= 0) return 'no-refills';
    return 'active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return COLORS.SUCCESS;
      case 'expired':
        return COLORS.ERROR;
      case 'no-refills':
        return COLORS.WARNING;
      default:
        return COLORS.GRAY_MEDIUM;
    }
  };

  const createPrescription = async (prescriptionData) => {
    try {
      const newPrescription = {
        patientId: patientId || 'patient_1',
        patientName: patientName || 'Selected Patient',
        doctorId: userProfile?.uid || 'doctor_1',
        doctorName: `Dr. ${userProfile?.firstName} ${userProfile?.lastName}`,
        doctorLicense: userProfile?.licenseNumber || 'N/A',
        ...prescriptionData,
        createdAt: serverTimestamp(),
        refillsRemaining: prescriptionData.refills || 0
      };

      // Save to Firebase
      const docRef = await addDoc(collection(db, 'prescriptions'), newPrescription);
      
      // Add to local state
      const prescriptionWithId = {
        id: docRef.id,
        ...newPrescription
      };
      
      setPrescriptions(prev => [prescriptionWithId, ...prev]);
      
      // Send notification to patient
      try {
        // Determine what to show in the notification based on number of medications
        let notificationData;
        if (prescriptionData.medications && prescriptionData.medications.length > 0) {
          // Multiple medications
          notificationData = {
            id: docRef.id,
            doctorName: `Dr. ${userProfile?.firstName} ${userProfile?.lastName}`,
            medicationName: `${prescriptionData.medications.length} medications prescribed`,
            dosage: 'See prescription for details',
            frequency: 'See prescription for details',
            createdAt: new Date().toISOString()
          };
        } else {
          // Single medication (legacy format)
          notificationData = {
            id: docRef.id,
            doctorName: `Dr. ${userProfile?.firstName} ${userProfile?.lastName}`,
            medicationName: prescriptionData.medicationName,
            dosage: prescriptionData.dosage,
            frequency: prescriptionData.frequency,
            createdAt: new Date().toISOString()
          };
        }
        
        await NotificationService.createPrescriptionNotification(
          patientId, 
          notificationData
        );
        console.log('Prescription notification sent to patient');
      } catch (notificationError) {
        console.error('Error sending prescription notification:', notificationError);
      }
      
      setShowCreateModal(false);
      Alert.alert('Success', 'Prescription created successfully');
    } catch (error) {
      console.error('Error creating prescription:', error);
      Alert.alert('Error', 'Failed to create prescription');
    }
  };

  const updatePrescription = async (updatedData) => {
    try {
      // Update in Firebase
      const prescriptionRef = doc(db, 'prescriptions', selectedPrescription.id);
      await updateDoc(prescriptionRef, updatedData);
      
      // Update local state
      const updated = prescriptions.map(p =>
        p.id === selectedPrescription.id ? { ...p, ...updatedData } : p
      );
      setPrescriptions(updated);
      setShowEditModal(false);
      Alert.alert('Success', 'Prescription updated successfully');
    } catch (error) {
      console.error('Error updating prescription:', error);
      Alert.alert('Error', 'Failed to update prescription');
    }
  };

  const deletePrescription = async (prescriptionId) => {
    try {
      // Delete from Firebase
      const prescriptionRef = doc(db, 'prescriptions', prescriptionId);
      await deleteDoc(prescriptionRef);
      
      // Update local state
      const updated = prescriptions.filter(p => p.id !== prescriptionId);
      setPrescriptions(updated);
      
      Alert.alert('Success', 'Prescription deleted successfully');
    } catch (error) {
      console.error('Error deleting prescription:', error);
      Alert.alert('Error', 'Failed to delete prescription');
    }
  };

  const viewPrescriptionDetails = async (prescription) => {
    try {
      // Get the latest prescription data from Firebase
      const prescriptionRef = doc(db, 'prescriptions', prescription.id);
      const prescriptionDoc = await getDoc(prescriptionRef);
      
      if (prescriptionDoc.exists()) {
        const prescriptionData = {
          id: prescriptionDoc.id,
          ...prescriptionDoc.data()
        };
        setDetailPrescription(prescriptionData);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching prescription details:', error);
      Alert.alert('Error', 'Failed to fetch prescription details');
    }
  };

  const openEditModal = (prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const handlePrescriptionAction = (prescription, action) => {
    switch (action) {
      case 'view':
        viewPrescriptionDetails(prescription);
        break;
      case 'edit':
        setSelectedPrescription(prescription);
        setShowEditModal(true);
        break;
      case 'refill':
        // Determine medication name for the alert
        let medicationName = 'prescription';
        if (prescription.medications && prescription.medications.length > 0) {
          medicationName = `${prescription.medications.length} medications`;
        } else if (prescription.medicationName) {
          medicationName = prescription.medicationName;
        }
        
        Alert.alert(
          'Authorize Refill',
          `Authorize refill for ${medicationName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Authorize',
              onPress: () => {
                if (prescription.refillsRemaining > 0) {
                  const updated = prescriptions.map(p =>
                    p.id === prescription.id 
                      ? { ...p, refillsRemaining: p.refillsRemaining - 1 }
                      : p
                  );
                  setPrescriptions(updated);
                  Alert.alert('Success', 'Refill authorized');
                } else {
                  Alert.alert('Error', 'No refills remaining. Create new prescription.');
                }
              }
            }
          ]
        );
        break;
      case 'renew':
        setSelectedPrescription(prescription);
        setShowCreateModal(true);
        break;
      case 'discontinue':
        // Determine medication name for the alert
        let discontinueMedName = 'prescription';
        if (prescription.medications && prescription.medications.length > 0) {
          discontinueMedName = `${prescription.medications.length} medications`;
        } else if (prescription.medicationName) {
          discontinueMedName = prescription.medicationName;
        }
        
        Alert.alert(
          'Discontinue Prescription',
          `Discontinue ${discontinueMedName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Discontinue',
              style: 'destructive',
              onPress: () => {
                const updated = prescriptions.map(p =>
                  p.id === prescription.id 
                    ? { ...p, endDate: new Date().toISOString() }
                    : p
                );
                setPrescriptions(updated);
                Alert.alert('Success', 'Prescription discontinued');
              }
            }
          ]
        );
        break;
      case 'delete':
        // Determine medication name for the alert
        let deleteMedName = 'prescription';
        if (prescription.medications && prescription.medications.length > 0) {
          deleteMedName = `${prescription.medications.length} medications`;
        } else if (prescription.medicationName) {
          deleteMedName = prescription.medicationName;
        }
        
        Alert.alert(
          'Delete Prescription',
          `Are you sure you want to delete ${deleteMedName}? This action cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => deletePrescription(prescription.id)
            }
          ]
        );
        break;
      default:
        break;
    }
  };

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const status = getPrescriptionStatus(prescription);
    if (filterStatus === 'all') return true;
    return status === filterStatus;
  });

  const FilterButton = ({ status, title, active, onPress }) => (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.activeFilterButton, { backgroundColor: active ? theme.PRIMARY : theme.GRAY_LIGHT }]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, active && styles.activeFilterButtonText, { color: active ? theme.WHITE : theme.TEXT_SECONDARY }]}>  
        {title}
      </Text>
    </TouchableOpacity>
  );

  const PrescriptionCard = ({ prescription }) => {
    const status = getPrescriptionStatus(prescription);
    const statusColor = getStatusColor(status);

    // Check if this prescription has multiple medications
    const hasMultipleMedications = prescription.medications && prescription.medications.length > 1;
    const displayMedication = hasMultipleMedications 
      ? `${prescription.medications.length} medications` 
      : (prescription.medications 
          ? prescription.medications[0].medicationName 
          : prescription.medicationName);

    const displayDosage = hasMultipleMedications
      ? 'Multiple dosages'
      : (prescription.medications 
          ? prescription.medications[0].dosage 
          : prescription.dosage);

    const displayFrequency = hasMultipleMedications
      ? 'Multiple frequencies'
      : (prescription.medications 
          ? prescription.medications[0].frequency 
          : prescription.frequency);

    return (
      <Card style={styles.prescriptionCard}>
        <TouchableOpacity onPress={() => viewPrescriptionDetails(prescription)}>
          <View style={styles.prescriptionHeader}>
            <View style={styles.medicationInfo}>
              <View style={[styles.medicationIcon, { backgroundColor: statusColor }]}>
                <Ionicons name="medical" size={20} color={COLORS.WHITE} />
              </View>
              <View style={styles.prescriptionDetails}>
                <Text style={styles.medicationName}>{displayMedication}</Text>
                <Text style={styles.patientName}>{prescription.patientName}</Text>
                <Text style={styles.prescriptionMeta}>
                  {displayDosage} • {displayFrequency}
                </Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>
                  {status.charAt(0).toUpperCase() + status.replace('-', ' ').slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.prescriptionInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Instructions:</Text>
              <Text style={styles.infoValue}>
                {hasMultipleMedications 
                  ? 'Multiple instructions' 
                  : (prescription.medications 
                      ? prescription.medications[0].instructions 
                      : prescription.instructions)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>
                {new Date(prescription.startDate).toLocaleDateString()} - {new Date(prescription.endDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Refills Remaining:</Text>
              <Text style={styles.infoValue}>{prescription.refillsRemaining}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.prescriptionActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => viewPrescriptionDetails(prescription)}
          >
            <Ionicons name="eye-outline" size={18} color={COLORS.INFO} />
            <Text style={[styles.actionText, { color: COLORS.INFO }]}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePrescriptionAction(prescription, 'edit')}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.PRIMARY} />
            <Text style={[styles.actionText, { color: COLORS.PRIMARY }]}>Edit</Text>
          </TouchableOpacity>

          {status === 'active' && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePrescriptionAction(prescription, 'refill')}
              >
                <Ionicons name="refresh-outline" size={18} color={COLORS.SUCCESS} />
                <Text style={[styles.actionText, { color: COLORS.SUCCESS }]}>Refill</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePrescriptionAction(prescription, 'discontinue')}
              >
                <Ionicons name="stop-outline" size={18} color={COLORS.ERROR} />
                <Text style={[styles.actionText, { color: COLORS.ERROR }]}>Stop</Text>
              </TouchableOpacity>
            </>
          )}

          {(status === 'expired' || status === 'no-refills') && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePrescriptionAction(prescription, 'renew')}
              >
                <Ionicons name="add-outline" size={18} color={COLORS.INFO} />
                <Text style={[styles.actionText, { color: COLORS.INFO }]}>Renew</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePrescriptionAction(prescription, 'delete')}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.ERROR} />
                <Text style={[styles.actionText, { color: COLORS.ERROR }]}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Card>
    );
  };

  const CreatePrescriptionModal = () => {
    const [prescriptionItems, setPrescriptionItems] = useState([{ 
      medicationName: selectedPrescription?.medicationName || '', 
      dosage: selectedPrescription?.dosage || '', 
      frequency: selectedPrescription?.frequency || '', 
      instructions: selectedPrescription?.instructions || '', 
      duration: selectedPrescription?.duration || '30',
      refills: selectedPrescription?.refills || '2'
    }]);

    // Update the useEffect to handle multiple medications when renewing
    useEffect(() => {
      if (selectedPrescription) {
        // Check if this is a multi-medication prescription
        if (selectedPrescription.medications && selectedPrescription.medications.length > 0) {
          setPrescriptionItems(selectedPrescription.medications.map(med => ({
            medicationName: med.medicationName || '',
            dosage: med.dosage || '',
            frequency: med.frequency || '',
            instructions: med.instructions || '',
            duration: selectedPrescription.duration || '30',
            refills: selectedPrescription.refills?.toString() || '2'
          })));
        } else {
          // Single medication prescription
          setPrescriptionItems([{
            medicationName: selectedPrescription.medicationName || '',
            dosage: selectedPrescription.dosage || '',
            frequency: selectedPrescription.frequency || '',
            instructions: selectedPrescription.instructions || '',
            duration: selectedPrescription.duration || '30',
            refills: selectedPrescription.refills?.toString() || '2'
          }]);
        }
      }
    }, [selectedPrescription]);

    const addPrescriptionItem = () => {
      setPrescriptionItems([...prescriptionItems, { 
        medicationName: '', 
        dosage: '', 
        frequency: '', 
        instructions: '', 
        duration: '30',
        refills: '2'
      }]);
    };

    const removePrescriptionItem = (index) => {
      if (prescriptionItems.length > 1) {
        const newItems = [...prescriptionItems];
        newItems.splice(index, 1);
        setPrescriptionItems(newItems);
      }
    };

    const updatePrescriptionItem = (index, field, value) => {
      const newItems = [...prescriptionItems];
      newItems[index][field] = value;
      setPrescriptionItems(newItems);
    };

    const handleSubmit = async () => {
      // Validate all items
      for (const item of prescriptionItems) {
        if (!item.medicationName || !item.dosage || !item.frequency) {
          Alert.alert('Error', 'Please fill in all required fields for all medications');
          return;
        }
      }

      try {
        // Calculate end date based on the first item's duration
        const endDate = new Date();
        const duration = parseInt(prescriptionItems[0]?.duration || '30');
        endDate.setDate(endDate.getDate() + duration);

        // Create a single prescription with multiple medications
        const prescriptionData = {
          medications: prescriptionItems.map(item => ({
            medicationName: item.medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            instructions: item.instructions
          })),
          startDate: new Date().toISOString(),
          endDate: endDate.toISOString(),
          duration: duration,
          refills: parseInt(prescriptionItems[0]?.refills || '2'),
          refillsRemaining: parseInt(prescriptionItems[0]?.refills || '2')
        };

        await createPrescription(prescriptionData);

        // Close modal and reset
        setShowCreateModal(false);
        setPrescriptionItems([{ 
          medicationName: '', 
          dosage: '', 
          frequency: '', 
          instructions: '', 
          duration: '30',
          refills: '2'
        }]);
        
        // Success alert is shown in createPrescription function, no need to show it here
      } catch (error) {
        console.error('Error creating prescription:', error);
        Alert.alert('Error', 'Failed to create prescription');
      }
    };

    return (
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCreateModal(false);
          setPrescriptionItems([{ 
            medicationName: '', 
            dosage: '', 
            frequency: '', 
            instructions: '', 
            duration: '30',
            refills: '2'
          }]);
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>  
          <View style={[styles.modalContent, { backgroundColor: theme.CARD_BACKGROUND }]}>  
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.TEXT_PRIMARY }]}>  
                {selectedPrescription ? 'Renew Prescription' : 'Create Prescription'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowCreateModal(false);
                setPrescriptionItems([{ 
                  medicationName: '', 
                  dosage: '', 
                  frequency: '', 
                  instructions: '', 
                  duration: '30',
                  refills: '2'
                }]);
              }}>
                <Ionicons name="close" size={24} color={theme.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {patientName && (
              <Text style={styles.modalSubtitle}>Patient: {patientName}</Text>
            )}

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              {prescriptionItems.map((item, index) => (
                <View key={index} style={styles.prescriptionItemContainer}>
                  {prescriptionItems.length > 1 && (
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removePrescriptionItem(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={COLORS.ERROR} />
                    </TouchableOpacity>
                  )}
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Medication Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={item.medicationName}
                      onChangeText={(text) => updatePrescriptionItem(index, 'medicationName', text)}
                      placeholder="Enter medication name"
                      placeholderTextColor={COLORS.GRAY_MEDIUM}
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.SM }]}>
                      <Text style={styles.inputLabel}>Dosage *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={item.dosage}
                        onChangeText={(text) => updatePrescriptionItem(index, 'dosage', text)}
                        placeholder="e.g., 10mg"
                        placeholderTextColor={COLORS.GRAY_MEDIUM}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: SPACING.SM }]}>
                      <Text style={styles.inputLabel}>Frequency *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={item.frequency}
                        onChangeText={(text) => updatePrescriptionItem(index, 'frequency', text)}
                        placeholder="e.g., Twice daily"
                        placeholderTextColor={COLORS.GRAY_MEDIUM}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Instructions</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={item.instructions}
                      onChangeText={(text) => updatePrescriptionItem(index, 'instructions', text)}
                      placeholder="Special instructions for the patient"
                      multiline
                      numberOfLines={3}
                      placeholderTextColor={COLORS.GRAY_MEDIUM}
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.SM }]}>
                      <Text style={styles.inputLabel}>Duration (days)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={item.duration.toString()}
                        onChangeText={(text) => updatePrescriptionItem(index, 'duration', text)}
                        placeholder="30"
                        keyboardType="numeric"
                        placeholderTextColor={COLORS.GRAY_MEDIUM}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: SPACING.SM }]}>
                      <Text style={styles.inputLabel}>Refills</Text>
                      <TextInput
                        style={styles.textInput}
                        value={item.refills.toString()}
                        onChangeText={(text) => updatePrescriptionItem(index, 'refills', text)}
                        placeholder="2"
                        keyboardType="numeric"
                        placeholderTextColor={COLORS.GRAY_MEDIUM}
                      />
                    </View>
                  </View>
                  
                  {index === prescriptionItems.length - 1 && (
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={addPrescriptionItem}
                    >
                      <Ionicons name="add-circle" size={24} color={theme.PRIMARY} />
                      <Text style={[styles.addButtonText, { color: theme.PRIMARY }]}>Add Another Medication</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowCreateModal(false);
                  setPrescriptionItems([{ 
                    medicationName: '', 
                    dosage: '', 
                    frequency: '', 
                    instructions: '', 
                    duration: '30',
                    refills: '2'
                  }]);
                }}
                style={styles.modalActionButton}
                variant="outline"
              />
              <Button
                title={selectedPrescription ? 'Renew' : 'Create'}
                onPress={handleSubmit}
                style={styles.modalActionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const EditPrescriptionModal = () => {
    const [editPrescriptionItems, setEditPrescriptionItems] = useState([
      { 
        medicationName: '', 
        dosage: '', 
        frequency: '', 
        instructions: ''
      }
    ]);

    useEffect(() => {
      if (selectedPrescription) {
        // Check if this is a multi-medication prescription
        if (selectedPrescription.medications && selectedPrescription.medications.length > 0) {
          setEditPrescriptionItems(selectedPrescription.medications.map(med => ({
            medicationName: med.medicationName || '',
            dosage: med.dosage || '',
            frequency: med.frequency || '',
            instructions: med.instructions || ''
          })));
        } else {
          // Single medication prescription
          setEditPrescriptionItems([{
            medicationName: selectedPrescription.medicationName || '',
            dosage: selectedPrescription.dosage || '',
            frequency: selectedPrescription.frequency || '',
            instructions: selectedPrescription.instructions || ''
          }]);
        }
      }
    }, [selectedPrescription]);

    const addEditPrescriptionItem = () => {
      setEditPrescriptionItems([...editPrescriptionItems, { 
        medicationName: '', 
        dosage: '', 
        frequency: '', 
        instructions: '' 
      }]);
    };

    const removeEditPrescriptionItem = (index) => {
      if (editPrescriptionItems.length > 1) {
        const newItems = [...editPrescriptionItems];
        newItems.splice(index, 1);
        setEditPrescriptionItems(newItems);
      }
    };

    const updateEditPrescriptionItem = (index, field, value) => {
      const newItems = [...editPrescriptionItems];
      newItems[index][field] = value;
      setEditPrescriptionItems(newItems);
    };

    const handleSubmit = async () => {
      // Validate all items
      for (const item of editPrescriptionItems) {
        if (!item.medicationName || !item.dosage || !item.frequency) {
          Alert.alert('Error', 'Please fill in all required fields for all medications');
          return;
        }
      }

      try {
        await updatePrescription({
          medications: editPrescriptionItems,
          startDate: selectedPrescription.startDate,
          endDate: selectedPrescription.endDate,
          refills: selectedPrescription.refills,
          refillsRemaining: selectedPrescription.refillsRemaining
        });
      } catch (error) {
        console.error('Error updating prescription:', error);
        Alert.alert('Error', 'Failed to update prescription');
      }
    };

    return (
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>  
          <View style={[styles.modalContent, { backgroundColor: theme.CARD_BACKGROUND }]}>  
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.TEXT_PRIMARY }]}>Edit Prescription</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={theme.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {selectedPrescription && patientName && (
              <Text style={styles.modalSubtitle}>Patient: {patientName}</Text>
            )}

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              {editPrescriptionItems.map((item, index) => (
                <View key={index} style={styles.prescriptionItemContainer}>
                  {editPrescriptionItems.length > 1 && (
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeEditPrescriptionItem(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={COLORS.ERROR} />
                    </TouchableOpacity>
                  )}
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Medication Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={item.medicationName}
                      onChangeText={(text) => updateEditPrescriptionItem(index, 'medicationName', text)}
                      placeholder="Enter medication name"
                      placeholderTextColor={COLORS.GRAY_MEDIUM}
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.SM }]}>
                      <Text style={styles.inputLabel}>Dosage *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={item.dosage}
                        onChangeText={(text) => updateEditPrescriptionItem(index, 'dosage', text)}
                        placeholder="e.g., 10mg"
                        placeholderTextColor={COLORS.GRAY_MEDIUM}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: SPACING.SM }]}>
                      <Text style={styles.inputLabel}>Frequency *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={item.frequency}
                        onChangeText={(text) => updateEditPrescriptionItem(index, 'frequency', text)}
                        placeholder="e.g., Twice daily"
                        placeholderTextColor={COLORS.GRAY_MEDIUM}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Instructions</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={item.instructions}
                      onChangeText={(text) => updateEditPrescriptionItem(index, 'instructions', text)}
                      placeholder="Special instructions for the patient"
                      multiline
                      numberOfLines={3}
                      placeholderTextColor={COLORS.GRAY_MEDIUM}
                    />
                  </View>
                  
                  {index === editPrescriptionItems.length - 1 && (
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={addEditPrescriptionItem}
                    >
                      <Ionicons name="add-circle" size={24} color={theme.PRIMARY} />
                      <Text style={[styles.addButtonText, { color: theme.PRIMARY }]}>Add Another Medication</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowEditModal(false)}
                style={styles.modalActionButton}
                variant="outline"
              />
              <Button
                title="Save Changes"
                onPress={handleSubmit}
                style={styles.modalActionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const PrescriptionDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDetailModal(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>  
        <View style={[styles.modalContent, { backgroundColor: theme.CARD_BACKGROUND }]}>  
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.TEXT_PRIMARY }]}>Prescription Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Ionicons name="close" size={24} color={theme.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>
          
          {detailPrescription && (
            <ScrollView style={styles.modalBody}>
              <Card style={styles.detailCard}>
                {/* Check if this is a multi-medication prescription */}
                {detailPrescription.medications && detailPrescription.medications.length > 0 ? (
                  <>
                    <Text style={styles.detailMedicationName}>
                      Prescription with {detailPrescription.medications.length} Medications
                    </Text>
                    {detailPrescription.medications.map((med, index) => (
                      <View key={index} style={styles.detailSection}>
                        <Text style={[styles.detailSectionTitle, { marginBottom: SPACING.XS }]}>
                          Medication #{index + 1}: {med.medicationName}
                        </Text>
                        <Text style={styles.detailText}>Dosage: {med.dosage}</Text>
                        <Text style={styles.detailText}>Frequency: {med.frequency}</Text>
                        {med.instructions && (
                          <Text style={styles.detailText}>Instructions: {med.instructions}</Text>
                        )}
                      </View>
                    ))}
                  </>
                ) : (
                  <>
                    <Text style={styles.detailMedicationName}>
                      {detailPrescription.medicationName}
                    </Text>
                    <Text style={styles.detailDosage}>{detailPrescription.dosage}</Text>
                    
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Instructions</Text>
                      <Text style={styles.detailText}>{detailPrescription.instructions}</Text>
                    </View>
                    
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Frequency</Text>
                      <Text style={styles.detailText}>{detailPrescription.frequency}</Text>
                    </View>
                  </>
                )}
                
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: theme.TEXT_PRIMARY }]}>Duration</Text>
                  <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>  
                    {new Date(detailPrescription.startDate).toLocaleDateString()} to {new Date(detailPrescription.endDate).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: theme.TEXT_PRIMARY }]}>Prescribed For</Text>
                  <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>  
                    {detailPrescription.patientName}
                  </Text>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: theme.TEXT_PRIMARY }]}>Prescribed By</Text>
                  <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>  
                    {detailPrescription.doctorName}
                  </Text>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: theme.TEXT_PRIMARY }]}>Doctor License</Text>
                  <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>  
                    {detailPrescription.doctorLicense || 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: theme.TEXT_PRIMARY }]}>Refills</Text>
                  <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>  
                    {detailPrescription.refillsRemaining} of {detailPrescription.refills} refills remaining
                  </Text>
                </View>
                
                {/* Action buttons */}
                <View style={styles.buttonContainer}>
                  {/* Show edit button only if prescription is not expired */}
                  {new Date(detailPrescription.endDate) > new Date() && (
                    <Button
                      title="Edit Prescription"
                      onPress={() => {
                        setShowDetailModal(false);
                        setSelectedPrescription(detailPrescription);
                        setShowEditModal(true);
                      }}
                      style={styles.editButton}
                    />
                  )}
                  
                  {/* Show delete button for expired prescriptions */}
                  {new Date(detailPrescription.endDate) < new Date() && (
                    <Button
                      title="Delete Prescription"
                      onPress={() => {
                        setShowDetailModal(false);
                        handlePrescriptionAction(detailPrescription, 'delete');
                      }}
                      style={styles.editButton}
                      variant="danger"
                    />
                  )}
                </View>
              </Card>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const getStatusCounts = () => {
    return {
      active: prescriptions.filter(p => getPrescriptionStatus(p) === 'active').length,
      expired: prescriptions.filter(p => getPrescriptionStatus(p) === 'expired').length,
      all: prescriptions.length
    };
  };

  const counts = getStatusCounts();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>  
      {/* Header */}
      {patientName && (
        <View style={[styles.patientHeader, { backgroundColor: theme.PRIMARY }]}>  
          <Text style={[styles.patientHeaderText, { color: theme.WHITE }]}>Prescriptions for {patientName}</Text>
        </View>
      )}

      {/* Stats Header */}
      <View style={[styles.statsContainer, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>  
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: theme.PRIMARY }]}>{counts.all}</Text>
          <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: theme.SUCCESS }]}>{counts.active}</Text>
          <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: theme.ERROR }]}>{counts.expired}</Text>
          <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Expired</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>  
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton
            status="active"
            title="Active"
            active={filterStatus === 'active'}
            onPress={() => setFilterStatus('active')}
          />
          <FilterButton
            status="expired"
            title="Expired"
            active={filterStatus === 'expired'}
            onPress={() => setFilterStatus('expired')}
          />
          <FilterButton
            status="all"
            title="All"
            active={filterStatus === 'all'}
            onPress={() => setFilterStatus('all')}
          />
        </ScrollView>
      </View>

      {/* Prescriptions List */}
      <ScrollView
        style={styles.prescriptionsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.PRIMARY]} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredPrescriptions.length === 0 ? (
          <Card style={[styles.emptyState, { backgroundColor: theme.CARD_BACKGROUND }]}>  
            <Ionicons name="medical-outline" size={64} color={theme.GRAY_MEDIUM} />
            <Text style={[styles.emptyTitle, { color: theme.TEXT_PRIMARY }]}>No Prescriptions</Text>
            <Text style={[styles.emptySubtitle, { color: theme.TEXT_SECONDARY }]}>  
              {filterStatus === 'all' 
                ? 'No prescriptions found.'
                : `No ${filterStatus} prescriptions.`
              }
            </Text>
            <Button
              title="Create Prescription"
              onPress={() => setShowCreateModal(true)}
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          filteredPrescriptions.map((prescription) => (
            <PrescriptionCard key={prescription.id} prescription={prescription} />
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.PRIMARY }]}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={24} color={theme.WHITE} />
      </TouchableOpacity>

      <CreatePrescriptionModal />
      <EditPrescriptionModal />
      <PrescriptionDetailModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  patientHeader: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  patientHeaderText: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.WHITE,
    textAlign: 'center',
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
  prescriptionsList: {
    flex: 1,
    padding: SPACING.MD,
  },
  prescriptionCard: {
    marginBottom: SPACING.MD,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  medicationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  medicationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  prescriptionDetails: {
    flex: 1,
  },
  medicationName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  patientName: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS / 2,
    fontWeight: '600',
  },
  prescriptionMeta: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  statusContainer: {
    alignItems: 'flex-end',
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
  prescriptionInfo: {
    marginBottom: SPACING.MD,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.XS,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  infoLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
    width: '30%',
  },
  infoValue: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    textAlign: 'right',
  },
  prescriptionActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.MD,
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
    marginBottom: SPACING.LG,
  },
  emptyButton: {
    paddingHorizontal: SPACING.XL,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredModalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    width: '90%',
    maxHeight: '90%',
    margin: SPACING.MD,
  },
  modalBody: {
    maxHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  modalTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.MD,
    textAlign: 'center',
    fontWeight: '600',
  },
  formContainer: {
    maxHeight: 400,
  },
  prescriptionItemContainer: {
    position: 'relative',
    marginBottom: SPACING.MD,
    padding: SPACING.SM,
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: BORDER_RADIUS.MD,
  },
  removeButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    zIndex: 1,
    padding: 12,
  },
  inputGroup: {
    marginBottom: SPACING.MD,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: SPACING.MD,
  },
  inputLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.WHITE,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  addButtonText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginLeft: SPACING.SM,
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
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  closeButton: {
    padding: SPACING.SM,
  },
  detailCard: {
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  detailMedicationName: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  detailDosage: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.LG,
  },
  detailSection: {
    marginBottom: SPACING.MD,
  },
  detailSectionTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  detailText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  detailSubtext: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.GRAY_MEDIUM,
    marginTop: SPACING.XS,
  },
  editButtonContainer: {
    marginTop: SPACING.LG,
    alignItems: 'center',
  },
  editButton: {
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.LG,
    gap: SPACING.MD,
  },
});

export default DoctorPrescriptionsScreen;
