import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Linking,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import {
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../constants';
import Card from './Card';
import Button from './Button';
import { collection, query, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { supabaseStorage } from '../services/supabase';

const PatientLabResultsModal = ({ 
  visible, 
  onClose, 
  patient,
  currentUser,
  onChatPress // Add this prop for chat navigation
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [doctorResults, setDoctorResults] = useState([]);
  const [patientResults, setPatientResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (visible && patient?.id) {
      loadLabResults();
    }
  }, [visible, patient?.id]);

  const loadLabResults = async () => {
    if (!patient?.id) return;
    
    setLoading(true);
    try {
      // Fetch all lab results for this patient
      const labResultsQuery = query(
        collection(db, 'users', patient.id, 'labResults')
      );
      
      const labResultsSnapshot = await getDocs(labResultsQuery);
      const doctorResultsData = [];
      const patientResultsData = [];
      
      labResultsSnapshot.forEach((doc) => {
        const labResult = doc.data();
        // Determine if it's doctor-uploaded or patient-uploaded
        if (labResult.uploadedBy === currentUser?.uid || labResult.uploadedBy === 'doctor' || !labResult.uploadedBy) {
          // This is a doctor-uploaded result (either by current doctor or legacy format)
          doctorResultsData.push({
            id: doc.id,
            ...labResult,
            isDoctorUploaded: true
          });
        } else if (labResult.uploadedBy === 'patient') {
          // This is a patient-uploaded result
          patientResultsData.push({
            id: doc.id,
            ...labResult,
            isPatientUploaded: true
          });
        }
      });
      
      // Sort by upload date (newest first)
      doctorResultsData.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      patientResultsData.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      
      setDoctorResults(doctorResultsData);
      setPatientResults(patientResultsData);
    } catch (error) {
      console.error('Error loading lab results:', error);
      Alert.alert('Error', 'Failed to load lab results');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isImageFile = (fileType, fileName) => {
    if (!fileType && !fileName) return false;
    
    // Check by file type
    if (fileType) {
      const lowerType = fileType.toLowerCase();
      return lowerType.includes('image') || 
             lowerType.includes('jpeg') || 
             lowerType.includes('jpg') || 
             lowerType.includes('png') ||
             lowerType.includes('gif') ||
             lowerType.includes('bmp');
    }
    
    // Fallback: check by file extension in URL
    if (fileName) {
      const lowerName = fileName.toLowerCase();
      return lowerName.includes('.jpeg') || 
             lowerName.includes('.jpg') || 
             lowerName.includes('.png') ||
             lowerName.includes('.gif') ||
             lowerName.includes('.bmp');
    }
    
    return false;
  };

  const getFileIcon = (fileType, fileName) => {
    if (isImageFile(fileType, fileName)) {
      return 'image';
    } else if (fileType && fileType.includes('pdf')) {
      return 'document-text';
    } else {
      return 'document';
    }
  };

  const handleViewFile = async (labResult) => {
    if (labResult?.fileUrl) {
      try {
        // Check if the URL can be opened
        const supported = await Linking.canOpenURL(labResult.fileUrl);
        
        if (supported) {
          // Open the document in the device's default viewer
          await Linking.openURL(labResult.fileUrl);
        } else {
          // Fallback: Show alert with URL
          Alert.alert(
            'View Document',
            `Document URL: ${labResult.fileUrl}`,
            [
              { text: 'OK' },
              {
                text: 'Copy URL',
                onPress: () => {
                  Alert.alert('Info', 'URL copied to clipboard (feature coming soon)');
                }
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error opening document:', error);
        Alert.alert('Error', 'Unable to open document. Please try again.');
      }
    }
  };

  const handleDownloadFile = async (labResult) => {
    if (!labResult?.fileUrl) {
      Alert.alert('Error', 'No file available for download');
      return;
    }
    
    try {
      setDownloading(true);
      
      // Check if sharing is available
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing not available', 'File sharing is not available on your device.');
        setDownloading(false);
        return;
      }
      
      // Create a safe filename
      const fileExtension = labResult.fileType ? labResult.fileType.split('/')[1] || 'file' : 'file';
      const timestamp = Date.now();
      const safeFileName = `${(labResult.title || 'lab_result').replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${fileExtension}`;
      
      // Try to download the file
      const { status, uri } = await FileSystem.downloadAsync(labResult.fileUrl, `${FileSystem.documentDirectory}${safeFileName}`);
      
      if (status === 200 && uri) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Download Failed', 'Unable to download the file.');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', `Failed to download the file: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteLabResult = async (labResult) => {
    Alert.alert(
      'Delete Lab Result',
      `Are you sure you want to delete "${labResult.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the file from Supabase Storage
              const { error: deleteFileError } = await supabaseStorage.deleteFile(labResult.supabaseFilePath || '');
              
              if (deleteFileError) {
                console.warn('Failed to delete file from Supabase Storage:', deleteFileError);
              }
              
              // Delete the metadata from Firestore
              const labResultRef = doc(db, 'users', patient.id, 'labResults', labResult.id);
              await deleteDoc(labResultRef);
              
              // Reload lab results
              await loadLabResults();
              
              Alert.alert('Success', 'Lab result deleted successfully!');
            } catch (error) {
              console.error('Error deleting lab result:', error);
              Alert.alert('Error', `Failed to delete lab result: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const handleChatWithPatient = (labResult) => {
    // Close the modal first
    onClose();
    
    // Call the onChatPress function if provided
    if (onChatPress) {
      onChatPress(labResult);
    } else {
      // Fallback navigation
      Alert.alert(
        'Chat with Patient',
        `Starting chat about "${labResult.title}"`,
        [
          { text: 'OK' }
        ]
      );
    }
  };

  const renderLabResultItem = (labResult, isDoctorUploaded = false) => (
    <Card 
      key={labResult.id} 
      style={[styles.labResultCard, { backgroundColor: theme.BACKGROUND, borderColor: theme.BORDER }]}
    >
      <View style={styles.labResultHeader}>
        <View style={styles.labResultInfo}>
          <Text style={[styles.labResultTitle, { color: theme.TEXT_PRIMARY }]}>{labResult.title}</Text>
          <Text style={[styles.labResultDate, { color: theme.TEXT_SECONDARY }]}>
            {formatDate(labResult.uploadDate)}
          </Text>
          <View style={styles.labResultMeta}>
            <Ionicons 
              name={getFileIcon(labResult.fileType, labResult.fileName)} 
              size={16} 
              color={theme.INFO} 
              style={styles.fileIcon}
            />
            <Text style={[styles.labResultDetail, { color: theme.TEXT_SECONDARY }]}>
              {labResult.fileName}
            </Text>
          </View>
          {isDoctorUploaded ? (
            <Text style={[styles.uploadedBy, { color: theme.PRIMARY }]}>
              Uploaded by: {labResult.doctorName || 'Doctor'}
            </Text>
          ) : (
            <Text style={[styles.uploadedBy, { color: theme.WARNING }]}>
              Uploaded by: Patient (Pending Review)
            </Text>
          )}
        </View>
        <TouchableOpacity 
          onPress={() => handleDeleteLabResult(labResult)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color={theme.ERROR} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.labResultActions}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.INFO }]}
          onPress={() => handleViewFile(labResult)}
        >
          <Ionicons name="eye-outline" size={20} color={theme.WHITE} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.SUCCESS }]}
          onPress={() => handleDownloadFile(labResult)}
        >
          <Ionicons name="download-outline" size={20} color={theme.WHITE} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.PRIMARY }]}
          onPress={() => handleChatWithPatient(labResult)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.WHITE} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.OVERLAY }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.TEXT_PRIMARY }]}>
              Lab Results for {patient?.name}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Doctor Uploaded Results */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>
                  Doctor Uploaded Results
                </Text>
                <Text style={[styles.resultCount, { color: theme.TEXT_SECONDARY }]}>
                  ({doctorResults.length})
                </Text>
              </View>
              
              {loading ? (
                <Text style={[styles.loadingText, { color: theme.TEXT_SECONDARY }]}>Loading...</Text>
              ) : doctorResults.length === 0 ? (
                <Text style={[styles.noResultsText, { color: theme.TEXT_SECONDARY }]}>
                  No doctor uploaded results found
                </Text>
              ) : (
                doctorResults.map((result) => renderLabResultItem(result, true))
              )}
            </View>

            {/* Patient Uploaded Results */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>
                  Patient Uploaded Results
                </Text>
                <Text style={[styles.resultCount, { color: theme.TEXT_SECONDARY }]}>
                  ({patientResults.length})
                </Text>
              </View>
              
              {loading ? (
                <Text style={[styles.loadingText, { color: theme.TEXT_SECONDARY }]}>Loading...</Text>
              ) : patientResults.length === 0 ? (
                <Text style={[styles.noResultsText, { color: theme.TEXT_SECONDARY }]}>
                  No patient uploaded results found
                </Text>
              ) : (
                patientResults.map((result) => renderLabResultItem(result, false))
              )}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title="Close"
              onPress={onClose}
              style={styles.actionButton}
              variant="outline"
            />
            <Button
              title="Refresh"
              onPress={loadLabResults}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  modalContent: {
    backgroundColor: theme.CARD_BACKGROUND,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    width: '100%',
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
    color: theme.TEXT_PRIMARY,
  },
  modalBody: {
    marginBottom: SPACING.MD,
  },
  section: {
    marginBottom: SPACING.LG,
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
  resultCount: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  loadingText: {
    fontSize: FONT_SIZES.MD,
    textAlign: 'center',
    marginVertical: SPACING.LG,
  },
  noResultsText: {
    fontSize: FONT_SIZES.MD,
    textAlign: 'center',
    marginVertical: SPACING.LG,
    fontStyle: 'italic',
  },
  labResultCard: {
    backgroundColor: theme.BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  labResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  labResultInfo: {
    flex: 1,
  },
  labResultTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  labResultDate: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  labResultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  fileIcon: {
    marginRight: SPACING.XS,
  },
  labResultDetail: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  uploadedBy: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '500',
  },
  deleteButton: {
    padding: SPACING.XS,
  },
  labResultActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.SM,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default PatientLabResultsModal;