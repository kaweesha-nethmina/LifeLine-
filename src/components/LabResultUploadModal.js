import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  COLORS
} from '../constants';
import Card from './Card';
import Button from './Button';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const LabResultUploadModal = ({ 
  visible, 
  onClose, 
  onUpload,
  onDeleteLabResult,
  patientId,
  patientName,
  doctorProfile
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [labResults, setLabResults] = useState([]);
  const [loadingLabResults, setLoadingLabResults] = useState(false);

  // Load existing lab results for this patient
  useEffect(() => {
    if (visible && patientId) {
      loadLabResults();
    }
  }, [visible, patientId]);

  const loadLabResults = async () => {
    if (!patientId) return;
    
    setLoadingLabResults(true);
    try {
      // Fetch lab results for this patient
      const labResultsQuery = query(
        collection(db, 'users', patientId, 'labResults'),
        orderBy('uploadDate', 'desc')
      );
      
      const labResultsSnapshot = await getDocs(labResultsQuery);
      const labResultsData = [];
      labResultsSnapshot.forEach((doc) => {
        labResultsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setLabResults(labResultsData);
    } catch (error) {
      console.error('Error loading lab results:', error);
      Alert.alert('Error', 'Failed to load existing lab results');
    } finally {
      setLoadingLabResults(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      console.log('Requesting camera permissions...');
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      console.log('Camera permission result:', cameraPermission);
      
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera permissions to make this work!');
        return;
      }

      console.log('Launching camera...');
      // Use the same configuration as in UploadDocumentScreen with compression
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5, // Compress image as per user preference
      });

      console.log('Camera result:', result);
      
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        console.log('Selected file:', file);
        setSelectedFile({
          uri: file.uri,
          name: file.fileName || `lab_result_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          size: file.fileSize || 0
        });
      } else if (result.canceled) {
        console.log('User cancelled camera');
        Alert.alert('Info', 'Camera was cancelled');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to capture photo: ' + error.message);
    }
  };

  const handleChooseFile = async () => {
    try {
      console.log('Requesting media library permissions...');
      // Request media library permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      console.log('Media library permission result:', permissionResult);
      
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      console.log('Launching image library...');
      // Use the same configuration as in UploadDocumentScreen with compression
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5, // Compress image as per user preference
      });

      console.log('Image library result:', result);
      
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        console.log('Selected file:', file);
        setSelectedFile({
          uri: file.uri,
          name: file.fileName || `lab_result_${Date.now()}`,
          mimeType: file.type === 'image' ? 'image/jpeg' : 'application/pdf',
          size: file.fileSize || 0
        });
      } else if (result.canceled) {
        console.log('User cancelled image picker');
        Alert.alert('Info', 'Image selection was cancelled');
      }
    } catch (error) {
      console.error('Error choosing file:', error);
      Alert.alert('Error', 'Failed to select file: ' + error.message);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the lab result');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file to upload');
      return;
    }

    if (!doctorProfile) {
      Alert.alert('Error', 'Doctor information is missing');
      return;
    }

    setIsUploading(true);
    
    try {
      const labResultData = {
        title: title.trim(),
        fileName: selectedFile.name,
        fileType: selectedFile.mimeType,
        fileSize: selectedFile.size,
        uri: selectedFile.uri,
        patientId: patientId,
        patientName: patientName,
        doctorName: `${doctorProfile.firstName || ''} ${doctorProfile.lastName || ''}`.trim(),
        doctorLicense: doctorProfile.licenseNumber || '',
        uploadDate: new Date().toISOString(),
        status: 'uploaded'
      };

      await onUpload(labResultData);
      setTitle('');
      setSelectedFile(null);
      // Reload lab results after upload
      await loadLabResults();
    } catch (error) {
      console.error('Error uploading lab result:', error);
      Alert.alert('Error', 'Failed to upload lab result');
    } finally {
      setIsUploading(false);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const handleDeleteLabResult = (labResult) => {
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
              // Call the onDeleteLabResult function passed from parent
              if (onDeleteLabResult) {
                await onDeleteLabResult(labResult.id, labResult.filePath || labResult.supabaseFilePath || '');
                // Reload lab results after successful deletion
                await loadLabResults();
                // Show success alert after refresh
                Alert.alert('Success', 'Lab result deleted successfully!');
              }
            } catch (error) {
              console.error('Error deleting lab result:', error);
              Alert.alert('Error', `Failed to delete lab result: ${error.message}`);
            }
          }
        }
      ]
    );
  };

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
              Lab Results for {patientName}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Existing Lab Results Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Existing Lab Results</Text>
              {loadingLabResults ? (
                <Text style={[styles.loadingText, { color: theme.TEXT_SECONDARY }]}>Loading lab results...</Text>
              ) : labResults.length === 0 ? (
                <Text style={[styles.noResultsText, { color: theme.TEXT_SECONDARY }]}>No lab results found for this patient</Text>
              ) : (
                labResults.map((labResult) => (
                  <Card 
                    key={labResult.id} 
                    style={[styles.labResultCard, { backgroundColor: theme.BACKGROUND, borderColor: theme.BORDER }]}
                  >
                    <View style={styles.labResultHeader}>
                      <View style={styles.labResultInfo}>
                        <Text style={[styles.labResultTitle, { color: theme.TEXT_PRIMARY }]}>{labResult.title}</Text>
                        <Text style={[styles.labResultDate, { color: theme.TEXT_SECONDARY }]}>
                          {new Date(labResult.uploadDate).toLocaleDateString()}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => handleDeleteLabResult(labResult)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={theme.ERROR} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.labResultDetails}>
                      <Text style={[styles.labResultDetail, { color: theme.TEXT_SECONDARY }]}>
                        <Text style={{ fontWeight: 'bold' }}>File: </Text>
                        {labResult.fileName}
                      </Text>
                      <Text style={[styles.labResultDetail, { color: theme.TEXT_SECONDARY }]}>
                        <Text style={{ fontWeight: 'bold' }}>Doctor: </Text>
                        {labResult.doctorName}
                      </Text>
                    </View>
                  </Card>
                ))
              )}
            </View>

            {/* Upload New Lab Result Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Upload New Lab Result</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Title</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.INPUT_BACKGROUND, 
                    color: theme.TEXT_PRIMARY,
                    borderColor: theme.BORDER
                  }]}
                  placeholder="Enter lab result title"
                  placeholderTextColor={theme.TEXT_SECONDARY}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Doctor Information</Text>
                <Card style={[styles.infoCard, { backgroundColor: theme.BACKGROUND, borderColor: theme.BORDER }]}>
                  <Text style={[styles.infoText, { color: theme.TEXT_PRIMARY }]}>
                    <Text style={{ fontWeight: 'bold' }}>Doctor: </Text>
                    {doctorProfile ? `${doctorProfile.firstName || ''} ${doctorProfile.lastName || ''}`.trim() : 'Not available'}
                  </Text>
                  <Text style={[styles.infoText, { color: theme.TEXT_PRIMARY }]}>
                    <Text style={{ fontWeight: 'bold' }}>License: </Text>
                    {doctorProfile?.licenseNumber || 'Not available'}
                  </Text>
                </Card>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Select File</Text>
                {selectedFile ? (
                  <Card style={[styles.fileCard, { backgroundColor: theme.BACKGROUND, borderColor: theme.BORDER }]}>
                    <View style={styles.fileInfo}>
                      <Ionicons 
                        name={selectedFile.mimeType?.includes('pdf') ? 'document-text' : 'image'} 
                        size={24} 
                        color={theme.PRIMARY} 
                      />
                      <View style={styles.fileText}>
                        <Text style={[styles.fileName, { color: theme.TEXT_PRIMARY }]} numberOfLines={1}>
                          {selectedFile.name}
                        </Text>
                        <Text style={[styles.fileSize, { color: theme.TEXT_SECONDARY }]}>
                          {Math.round(selectedFile.size / 1024)} KB
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={removeSelectedFile} style={styles.removeButton}>
                      <Ionicons name="close-circle" size={24} color={theme.ERROR} />
                    </TouchableOpacity>
                  </Card>
                ) : (
                  <View style={styles.fileActions}>
                    <Button
                      title="Choose Document"
                      onPress={handleChooseFile}
                      style={styles.fileButton}
                      variant="outline"
                    />
                    <Button
                      title="Take Photo"
                      onPress={handleTakePhoto}
                      style={styles.fileButton}
                      variant="outline"
                    />
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
              style={styles.actionButton}
            />
            <Button
              title={isUploading ? "Uploading..." : "Upload"}
              onPress={handleSubmit}
              disabled={isUploading || !title.trim() || !selectedFile}
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
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
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
  },
  deleteButton: {
    padding: SPACING.XS,
  },
  labResultDetails: {
    borderTopWidth: 1,
    borderTopColor: theme.BORDER,
    paddingTop: SPACING.SM,
  },
  labResultDetail: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  inputGroup: {
    marginBottom: SPACING.LG,
  },
  inputLabel: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    backgroundColor: theme.INPUT_BACKGROUND,
  },
  infoCard: {
    backgroundColor: theme.BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
  },
  infoText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  fileActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fileButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileText: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  fileName: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  fileSize: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  removeButton: {
    padding: SPACING.XS,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
});

export default LabResultUploadModal;
