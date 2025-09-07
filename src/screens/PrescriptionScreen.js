import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
  Platform,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc
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

// Remove the direct import of react-native-html-to-pdf that was causing issues
// We'll handle PDF generation through a more robust approach

const PrescriptionScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [filterType, setFilterType] = useState('all'); // all, active, completed, expired
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    instructions: '',
    startDate: '',
    endDate: '',
    refills: ''
  });
  const [reminderSettings, setReminderSettings] = useState({});

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      // Fetch prescriptions from Firebase
      if (user && user.uid) {
        const prescriptionsQuery = query(
          collection(db, 'prescriptions'),
          where('patientId', '==', user.uid)
          // Removed orderBy('createdAt', 'desc') to avoid composite index
        );
        
        const prescriptionsSnapshot = await getDocs(prescriptionsQuery);
        const prescriptionsData = [];
        const reminders = {};
        
        prescriptionsSnapshot.forEach((doc) => {
          const prescription = {
            id: doc.id,
            ...doc.data()
          };
          prescriptionsData.push(prescription);
          
          // Initialize reminder settings
          reminders[prescription.id] = prescription.reminderEnabled || false;
        });
        
        // Sort in memory instead of using Firestore orderBy
        prescriptionsData.sort((a, b) => {
          const dateA = a.createdAt ? (typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate() : a.createdAt) : new Date(0);
          const dateB = b.createdAt ? (typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate() : b.createdAt) : new Date(0);
          return new Date(dateB) - new Date(dateA);
        });
        
        setPrescriptions(prescriptionsData);
        setReminderSettings(reminders);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    }
  };

  const toggleReminder = async (prescriptionId) => {
    const newSettings = {
      ...reminderSettings,
      [prescriptionId]: !reminderSettings[prescriptionId]
    };
    setReminderSettings(newSettings);
    
    // Update prescription in database
    try {
      await updateDoc(doc(db, 'prescriptions', prescriptionId), {
        reminderEnabled: newSettings[prescriptionId]
      });
      
      setPrescriptions(prev =>
        prev.map(p =>
          p.id === prescriptionId
            ? { ...p, reminderEnabled: newSettings[prescriptionId] }
            : p
        )
      );
      
      Alert.alert(
        'Reminder Updated',
        `Medication reminder ${newSettings[prescriptionId] ? 'enabled' : 'disabled'}`
      );
    } catch (error) {
      console.error('Error updating reminder:', error);
      Alert.alert('Error', 'Failed to update reminder settings');
    }
  };

  const markAsTaken = (prescriptionId, doseTime) => {
    Alert.alert(
      'Mark as Taken',
      'Did you take your medication?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Update in database
              const prescriptionRef = doc(db, 'prescriptions', prescriptionId);
              const prescriptionDoc = await getDoc(prescriptionRef);
              
              if (prescriptionDoc.exists()) {
                const prescriptionData = prescriptionDoc.data();
                const updatedDoses = [...(prescriptionData.doseTimes || [])];
                const doseIndex = updatedDoses.findIndex(d => d.time === doseTime);
                
                if (doseIndex !== -1) {
                  updatedDoses[doseIndex] = { ...updatedDoses[doseIndex], taken: true };
                  
                  await updateDoc(prescriptionRef, {
                    doseTimes: updatedDoses
                  });
                  
                  // Update local state
                  setPrescriptions(prev =>
                    prev.map(p => {
                      if (p.id === prescriptionId) {
                        return { ...p, doseTimes: updatedDoses };
                      }
                      return p;
                    })
                  );
                  
                  Alert.alert('Success', 'Medication marked as taken');
                }
              }
            } catch (error) {
              console.error('Error marking as taken:', error);
              Alert.alert('Error', 'Failed to mark medication as taken');
            }
          }
        }
      ]
    );
  };

  const openEditModal = (prescription) => {
    setSelectedPrescription(prescription);
    setEditFormData({
      medicationName: prescription.medicationName || '',
      dosage: prescription.dosage || '',
      frequency: prescription.frequency || '',
      instructions: prescription.instructions || '',
      startDate: prescription.startDate || '',
      endDate: prescription.endDate || '',
      refills: prescription.refills?.toString() || '0'
    });
    setIsEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      // Check if prescription is expired
      const endDate = new Date(editFormData.endDate);
      const now = new Date();
      
      if (endDate < now) {
        Alert.alert('Error', 'Cannot edit expired prescriptions');
        return;
      }
      
      // Update prescription in database
      await updateDoc(doc(db, 'prescriptions', selectedPrescription.id), {
        medicationName: editFormData.medicationName,
        dosage: editFormData.dosage,
        frequency: editFormData.frequency,
        instructions: editFormData.instructions,
        startDate: editFormData.startDate,
        endDate: editFormData.endDate,
        refills: parseInt(editFormData.refills),
        refillsRemaining: parseInt(editFormData.refills)
      });
      
      // Update local state
      setPrescriptions(prev =>
        prev.map(p => {
          if (p.id === selectedPrescription.id) {
            return {
              ...p,
              medicationName: editFormData.medicationName,
              dosage: editFormData.dosage,
              frequency: editFormData.frequency,
              instructions: editFormData.instructions,
              startDate: editFormData.startDate,
              endDate: editFormData.endDate,
              refills: parseInt(editFormData.refills),
              refillsRemaining: parseInt(editFormData.refills)
            };
          }
          return p;
        })
      );
      
      setIsEditModalVisible(false);
      setDetailModalVisible(false);
      Alert.alert('Success', 'Prescription updated successfully');
    } catch (error) {
      console.error('Error updating prescription:', error);
      Alert.alert('Error', 'Failed to update prescription');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return COLORS.SUCCESS;
      case 'completed': return COLORS.PRIMARY;
      case 'expired': return COLORS.ERROR;
      case 'paused': return COLORS.WARNING;
      default: return COLORS.GRAY_MEDIUM;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'completed': return 'checkmark-done-circle';
      case 'expired': return 'close-circle';
      case 'paused': return 'pause-circle';
      default: return 'help-circle';
    }
  };

  const filteredPrescriptions = prescriptions.filter(prescription => {
    if (filterType === 'all') return true;
    return prescription.status === filterType;
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

  const PrescriptionCard = ({ prescription }) => {
    // Check if this prescription has multiple medications
    const hasMultipleMedications = prescription.medications && prescription.medications.length > 1;
    const displayMedication = hasMultipleMedications 
      ? `${prescription.medications.length} medications` 
      : (prescription.medicationName || 'N/A');

    const displayDosage = hasMultipleMedications
      ? 'Multiple dosages'
      : (prescription.dosage || 'N/A');

    const displayFrequency = hasMultipleMedications
      ? 'Multiple frequencies'
      : (prescription.frequency || 'N/A');

    return (
      <Card style={styles.prescriptionCard}>
        <TouchableOpacity
          onPress={() => {
            setSelectedPrescription(prescription);
            setDetailModalVisible(true);
          }}
        >
          <View style={styles.prescriptionHeader}>
            <View style={styles.medicationInfo}>
              <View style={styles.medicationIcon}>
                <Ionicons name="medical" size={24} color={COLORS.WHITE} />
              </View>
              <View style={styles.medicationDetails}>
                <Text style={styles.medicationName}>{displayMedication}</Text>
                <Text style={styles.medicationDosage}>
                  {displayDosage} • {displayFrequency}
                </Text>
                <Text style={styles.prescribedBy}>Prescribed by {prescription.doctorName || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.prescriptionStatus}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(prescription.status || 'unknown') }]}>
                <Ionicons 
                  name={getStatusIcon(prescription.status || 'unknown')} 
                  size={16} 
                  color={COLORS.WHITE} 
                />
                <Text style={styles.statusText}>{prescription.status || 'unknown'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.prescriptionMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.metaText}>
                {prescription.startDate} - {prescription.endDate}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.metaText}>
                Next: {prescription.nextDose || 'N/A'}
              </Text>
            </View>
          </View>

          {prescription.status === 'active' && (
            <View style={styles.todayDoses}>
              <Text style={styles.dosesTitle}>Today's Doses</Text>
              <View style={styles.dosesContainer}>
                {prescription.doseTimes?.map((dose, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.doseButton, dose.taken && styles.doseTaken]}
                    onPress={() => !dose.taken && markAsTaken(prescription.id, dose.time)}
                  >
                    <Text style={[styles.doseTime, dose.taken && styles.doseTimeTaken]}>
                      {dose.time}
                    </Text>
                    {dose.taken && (
                      <Ionicons name="checkmark" size={16} color={COLORS.WHITE} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.prescriptionActions}>
            <View style={styles.reminderToggle}>
              <Text style={styles.reminderText}>Reminders</Text>
              <Switch
                value={reminderSettings[prescription.id] || false}
                onValueChange={() => toggleReminder(prescription.id)}
                trackColor={{ false: COLORS.GRAY_LIGHT, true: COLORS.PRIMARY }}
                thumbColor={COLORS.WHITE}
              />
            </View>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.actionButtonText}>Details</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  // Function to generate HTML for prescription PDF
  const generatePrescriptionHTML = (prescription) => {
    // Check if prescription is valid
    if (!prescription) {
      return '<h1>Error: No prescription data</h1>';
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString();
    };

    let medicationsHTML = '';
    
    if (prescription.medications && prescription.medications.length > 0) {
      medicationsHTML = `
        <h3>Medications (${prescription.medications.length})</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #2E86AB; color: white;">
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Medication</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Dosage</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Frequency</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${prescription.medications.map((med, index) => `
              <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : '#ffffff'};">
                <td style="padding: 12px; border: 1px solid #ddd;">${med.medicationName || 'N/A'}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${med.dosage || 'N/A'}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${med.frequency || 'N/A'}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${med.instructions || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      medicationsHTML = `
        <div style="margin-bottom: 20px;">
          <h3>Medication Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 30%;">Medication Name:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${prescription.medicationName || 'N/A'}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Dosage:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${prescription.dosage || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Frequency:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${prescription.frequency || 'N/A'}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Instructions:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${prescription.instructions || 'N/A'}</td>
            </tr>
          </table>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Prescription Details</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 30px; 
              color: #333;
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              padding-bottom: 20px;
              border-bottom: 2px solid #2E86AB;
            }
            .logo {
              color: #2E86AB;
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .subtitle { 
              font-size: 20px; 
              color: #666; 
              margin-top: 5px; 
            }
            .section { 
              margin-bottom: 25px; 
              padding: 15px;
              border-radius: 8px;
              background-color: #f8f9fa;
            }
            .section-title { 
              font-size: 20px; 
              font-weight: bold; 
              color: #2E86AB; 
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 1px solid #eee;
            }
            .info-row { 
              margin-bottom: 12px; 
              display: flex;
            }
            .info-label { 
              font-weight: bold; 
              width: 200px;
              min-width: 200px;
            }
            .info-value { 
              flex: 1;
            }
            table { 
              width: 100%; 
              border-collapse: collapse;
              margin: 15px 0;
            }
            th, td { 
              padding: 12px; 
              text-align: left; 
              border: 1px solid #ddd; 
            }
            th { 
              background-color: #2E86AB; 
              color: white; 
            }
            tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
            .footer {
              margin-top: 40px; 
              text-align: center; 
              font-size: 12px; 
              color: #888;
              padding-top: 20px;
              border-top: 1px solid #eee;
            }
            .signature-area {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              width: 45%;
              border-top: 1px solid #333;
              padding-top: 10px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">LifeLine+ Healthcare</div>
            <div class="subtitle">Prescription Details</div>
          </div>
          
          <div class="section">
            <div class="section-title">Patient Information</div>
            <div class="info-row">
              <span class="info-label">Patient Name:</span>
              <span class="info-value">${userProfile?.firstName || ''} ${userProfile?.lastName || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Patient ID:</span>
              <span class="info-value">${userProfile?.id || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Prescription ID:</span>
              <span class="info-value">${prescription.id || 'N/A'}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Doctor Information</div>
            <div class="info-row">
              <span class="info-label">Doctor Name:</span>
              <span class="info-value">${prescription.doctorName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">License Number:</span>
              <span class="info-value">${prescription.doctorLicense || 'N/A'}</span>
            </div>
          </div>
          
          <div class="section">
            ${medicationsHTML}
          </div>
          
          <div class="section">
            <div class="section-title">Prescription Details</div>
            <div class="info-row">
              <span class="info-label">Start Date:</span>
              <span class="info-value">${formatDate(prescription.startDate)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">End Date:</span>
              <span class="info-value">${formatDate(prescription.endDate)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Duration:</span>
              <span class="info-value">${prescription.duration || 'N/A'} days</span>
            </div>
            <div class="info-row">
              <span class="info-label">Refills:</span>
              <span class="info-value">${prescription.refillsRemaining || 0} of ${prescription.refills || 0} refills remaining</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="info-value">${prescription.status || 'N/A'}</span>
            </div>
          </div>
          
          ${prescription.sideEffects ? `
          <div class="section">
            <div class="section-title">Possible Side Effects</div>
            <p>${prescription.sideEffects}</p>
          </div>
          ` : ''}
          
          ${prescription.notes ? `
          <div class="section">
            <div class="section-title">Additional Notes</div>
            <p>${prescription.notes}</p>
          </div>
          ` : ''}
          
          <div class="signature-area">
            <div class="signature-box">
              Doctor's Signature
            </div>
            <div class="signature-box">
              Date
            </div>
          </div>
          
          <div class="footer">
            <p>This is an electronically generated prescription. Please consult your doctor if you have any questions.</p>
            <p>© ${new Date().getFullYear()} LifeLine+ Healthcare. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  };

  // Function to download prescription as PDF
  const downloadPrescription = async (prescription) => {
    try {
      // Check if prescription is valid
      if (!prescription) {
        Alert.alert('Error', 'No prescription selected');
        return;
      }

      // Always fall back to sharing since PDF generation is not working
      Alert.alert(
        'Share Prescription',
        'Prescription details will be shared as text since PDF generation is not available on this device.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Share',
            onPress: () => sharePrescription(prescription)
          }
        ]
      );
    } catch (error) {
      console.error('Error preparing prescription share:', error);
      Alert.alert(
        'Share Error',
        'Failed to prepare prescription for sharing. Please try again later.'
      );
    }
  };

  // Function to generate text format for prescription sharing
  const generatePrescriptionText = (prescription) => {
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString();
    };

    let medicationsText = '';
    
    if (prescription.medications && prescription.medications.length > 0) {
      medicationsText = `\nMedications (${prescription.medications.length}):\n`;
      medicationsText += '='.repeat(50) + '\n';
      prescription.medications.forEach((med, index) => {
        medicationsText += `\n${index + 1}. ${med.medicationName || 'N/A'}\n`;
        medicationsText += `   Dosage: ${med.dosage || 'N/A'}\n`;
        medicationsText += `   Frequency: ${med.frequency || 'N/A'}\n`;
        if (med.instructions) {
          medicationsText += `   Instructions: ${med.instructions}\n`;
        }
        medicationsText += '-'.repeat(30) + '\n';
      });
    } else {
      medicationsText = '\nMedication Details:\n';
      medicationsText += '='.repeat(50) + '\n';
      medicationsText += `Medication Name: ${prescription.medicationName || 'N/A'}\n`;
      medicationsText += `Dosage: ${prescription.dosage || 'N/A'}\n`;
      medicationsText += `Frequency: ${prescription.frequency || 'N/A'}\n`;
      if (prescription.instructions) {
        medicationsText += `Instructions: ${prescription.instructions || 'N/A'}\n`;
      }
    }

    return `
LifeLine+ Healthcare
====================
Prescription Details
====================

Patient Information:
--------------------
Patient Name: ${userProfile?.firstName || ''} ${userProfile?.lastName || ''}
Patient ID: ${userProfile?.id || 'N/A'}
Prescription ID: ${prescription.id || 'N/A'}

Doctor Information:
-------------------
Doctor Name: ${prescription.doctorName || 'N/A'}
License Number: ${prescription.doctorLicense || 'N/A'}

${medicationsText}

Prescription Details:
---------------------
Start Date: ${formatDate(prescription.startDate)}
End Date: ${formatDate(prescription.endDate)}
Duration: ${prescription.duration || 'N/A'} days
Refills: ${prescription.refillsRemaining || 0} of ${prescription.refills || 0} refills remaining
Status: ${prescription.status || 'N/A'}

${prescription.sideEffects ? `Possible Side Effects:\n${prescription.sideEffects}\n\n` : ''}
${prescription.notes ? `Additional Notes:\n${prescription.notes}\n\n` : ''}

Doctor's Signature: _________________     Date: _________________

This is an electronically generated prescription. Please consult your doctor if you have any questions.

© ${new Date().getFullYear()} LifeLine+ Healthcare. All rights reserved.
`;
  };

  // Function to share prescription
  const sharePrescription = async (prescription) => {
    try {
      // Check if prescription is valid
      if (!prescription) {
        Alert.alert('Error', 'No prescription selected');
        return;
      }

      const prescriptionText = generatePrescriptionText(prescription);
      
      await Share.share({
        message: prescriptionText,
        title: `Prescription - ${prescription.id || 'Unknown'}`
      });
    } catch (error) {
      console.error('Error sharing prescription:', error);
      Alert.alert(
        'Share Error',
        'Failed to share prescription. Please try again later.'
      );
    }
  };

  const PrescriptionDetailModal = () => (
    <Modal
      visible={isDetailModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setDetailModalVisible(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Prescription Details</Text>
          <View style={styles.modalHeaderActions}>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => downloadPrescription(selectedPrescription)}
            >
              <Ionicons name="download-outline" size={24} color={COLORS.PRIMARY} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => sharePrescription(selectedPrescription)}
            >
              <Ionicons name="share-outline" size={24} color={COLORS.PRIMARY} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>
        
        {selectedPrescription && (
          <ScrollView style={styles.modalContent}>
            <Card style={styles.detailCard}>
              {/* Check if this is a multi-medication prescription */}
              {selectedPrescription.medications && selectedPrescription.medications.length > 0 ? (
                <>
                  <Text style={styles.detailMedicationName}>
                    Prescription with {selectedPrescription.medications.length} Medications
                  </Text>
                  {selectedPrescription.medications.map((med, index) => (
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
                    {selectedPrescription.medicationName}
                  </Text>
                  <Text style={styles.detailDosage}>{selectedPrescription.dosage}</Text>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Instructions</Text>
                    <Text style={styles.detailText}>{selectedPrescription.instructions}</Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Frequency</Text>
                    <Text style={styles.detailText}>{selectedPrescription.frequency}</Text>
                  </View>
                </>
              )}
              
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Duration</Text>
                <Text style={styles.detailText}>
                  {selectedPrescription.startDate} to {selectedPrescription.endDate}
                </Text>
                <Text style={styles.detailSubtext}>
                  Duration: {selectedPrescription.duration || 'N/A'} days
                </Text>
              </View>
              
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Prescribed By</Text>
                <Text style={styles.detailText}>
                  {selectedPrescription.doctorName}
                </Text>
                <Text style={styles.detailSubtext}>
                  License: {selectedPrescription.doctorLicense || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Refills</Text>
                <Text style={styles.detailText}>
                  {selectedPrescription.refillsRemaining} of {selectedPrescription.refills} refills remaining
                </Text>
              </View>
              
              {selectedPrescription.sideEffects && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Possible Side Effects</Text>
                  <Text style={styles.detailText}>{selectedPrescription.sideEffects}</Text>
                </View>
              )}
              
              {selectedPrescription.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Additional Notes</Text>
                  <Text style={styles.detailText}>{selectedPrescription.notes}</Text>
                </View>
              )}
              
              {/* Show edit button only for doctors and if prescription is not expired */}
              {userProfile?.role === 'doctor' && new Date(selectedPrescription.endDate) > new Date() && (
                <View style={styles.editButtonContainer}>
                  <Button
                    title="Edit Prescription"
                    onPress={() => {
                      setDetailModalVisible(false);
                      openEditModal(selectedPrescription);
                    }}
                    style={styles.editButton}
                  />
                </View>
              )}
            </Card>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  const EditPrescriptionModal = () => (
    <Modal
      visible={isEditModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setIsEditModalVisible(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Prescription</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsEditModalVisible(false)}
          >
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Card style={styles.detailCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Medication Name</Text>
              <TextInput
                style={styles.textInput}
                value={editFormData.medicationName}
                onChangeText={(text) => setEditFormData({...editFormData, medicationName: text})}
                placeholder="Enter medication name"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Dosage</Text>
              <TextInput
                style={styles.textInput}
                value={editFormData.dosage}
                onChangeText={(text) => setEditFormData({...editFormData, dosage: text})}
                placeholder="e.g., 10mg"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Frequency</Text>
              <TextInput
                style={styles.textInput}
                value={editFormData.frequency}
                onChangeText={(text) => setEditFormData({...editFormData, frequency: text})}
                placeholder="e.g., Twice daily"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Instructions</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={editFormData.instructions}
                onChangeText={(text) => setEditFormData({...editFormData, instructions: text})}
                placeholder="Special instructions"
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.SM }]}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFormData.startDate}
                  onChangeText={(text) => setEditFormData({...editFormData, startDate: text})}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: SPACING.SM }]}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFormData.endDate}
                  onChangeText={(text) => setEditFormData({...editFormData, endDate: text})}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Refills</Text>
              <TextInput
                style={styles.textInput}
                value={editFormData.refills}
                onChangeText={(text) => setEditFormData({...editFormData, refills: text})}
                placeholder="Number of refills"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.buttonContainer}>
              <Button
                title="Cancel"
                onPress={() => setIsEditModalVisible(false)}
                variant="outline"
                style={styles.cancelButton}
              />
              <Button
                title="Save Changes"
                onPress={handleEditSubmit}
                style={styles.saveButton}
              />
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const getFilterCounts = () => ({
    all: prescriptions.length,
    active: prescriptions.filter(p => p.status === 'active').length,
    completed: prescriptions.filter(p => p.status === 'completed').length,
    expired: prescriptions.filter(p => p.status === 'expired').length,
  });

  const filterCounts = getFilterCounts();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Prescriptions</Text>
        <Text style={styles.subtitle}>Manage your medications</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton
            type="all"
            title="All"
            count={filterCounts.all}
            active={filterType === 'all'}
            onPress={() => setFilterType('all')}
          />
          <FilterButton
            type="active"
            title="Active"
            count={filterCounts.active}
            active={filterType === 'active'}
            onPress={() => setFilterType('active')}
          />
          <FilterButton
            type="completed"
            title="Completed"
            count={filterCounts.completed}
            active={filterType === 'completed'}
            onPress={() => setFilterType('completed')}
          />
          <FilterButton
            type="expired"
            title="Expired"
            count={filterCounts.expired}
            active={filterType === 'expired'}
            onPress={() => setFilterType('expired')}
          />
        </ScrollView>
      </View>

      {/* Prescriptions List */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filteredPrescriptions.length === 0 ? (
          <Card style={styles.emptyState}>
            <Ionicons name="medical-outline" size={64} color={COLORS.GRAY_MEDIUM} />
            <Text style={styles.emptyTitle}>No Prescriptions</Text>
            <Text style={styles.emptySubtitle}>
              {filterType === 'all' 
                ? 'You have no prescriptions yet'
                : `No ${filterType} prescriptions found`
              }
            </Text>
          </Card>
        ) : (
          filteredPrescriptions.map((prescription) => (
            <PrescriptionCard key={prescription.id} prescription={prescription} />
          ))
        )}
      </ScrollView>

      <PrescriptionDetailModal />
      <EditPrescriptionModal />
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
    paddingVertical: SPACING.LG,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  title: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
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
  content: {
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
    paddingHorizontal: SPACING.MD,
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
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  medicationDetails: {
    flex: 1,
  },
  medicationName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  medicationDosage: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  prescribedBy: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  prescriptionStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS / 2,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.SUCCESS,
  },
  statusText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.WHITE,
    fontWeight: '600',
    marginLeft: SPACING.XS / 2,
  },
  prescriptionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  metaText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },
  todayDoses: {
    marginBottom: SPACING.MD,
  },
  dosesTitle: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  dosesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  doseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.GRAY_LIGHT,
    marginRight: SPACING.XS,
    marginBottom: SPACING.XS,
  },
  doseTaken: {
    backgroundColor: COLORS.SUCCESS,
  },
  doseTime: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginRight: SPACING.XS / 2,
  },
  doseTimeTaken: {
    color: COLORS.WHITE,
  },
  prescriptionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: SPACING.MD,
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginRight: SPACING.SM,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginLeft: SPACING.XS,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.LG,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadButton: {
    padding: SPACING.SM,
    marginRight: SPACING.XS,
  },
  closeButton: {
    padding: SPACING.SM,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.MD,
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
  inputGroup: {
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
  inputRow: {
    flexDirection: 'row',
    marginBottom: SPACING.MD,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.LG,
  },
  cancelButton: {
    flex: 1,
    marginRight: SPACING.SM,
  },
  saveButton: {
    flex: 1,
    marginLeft: SPACING.SM,
  },
});

export default PrescriptionScreen;
