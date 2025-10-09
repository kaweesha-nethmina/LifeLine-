import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../constants';
import Card from './Card';
import Button from './Button';
import * as ImagePicker from 'expo-image-picker';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const PatientLabResultUploadModal = ({ 
  visible, 
  onClose, 
  onUpload,
  patientProfile
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  useEffect(() => {
    if (visible) {
      loadDoctors();
    }
  }, [visible]);

  const loadDoctors = async () => {
    try {
      // Fetch doctors from Firebase users collection where role is 'doctor'
      const doctorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'doctor')
      );
      
      const querySnapshot = await getDocs(doctorsQuery);
      const doctorsData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        doctorsData.push({
          id: doc.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Doctor'
        });
      });
      
      setDoctors(doctorsData);
      // Set default selection to the first doctor if available
      if (doctorsData.length > 0 && !selectedDoctor) {
        setSelectedDoctor(doctorsData[0].id);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      Alert.alert('Error', 'Failed to load doctors list');
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera permissions to make this work!');
        return;
      }

      // Use the same configuration as in UploadDocumentScreen with compression
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5, // Compress image as per user preference
      });
      
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.fileName || `lab_result_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          size: file.fileSize || 0
        });
      } else if (result.canceled) {
        Alert.alert('Info', 'Camera was cancelled');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to capture photo: ' + error.message);
    }
  };

  const handleChooseFile = async () => {
    try {
      // Request media library permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      // Use the same configuration as in UploadDocumentScreen with compression
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5, // Compress image as per user preference
      });
      
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.fileName || `lab_result_${Date.now()}`,
          mimeType: file.type === 'image' ? 'image/jpeg' : 'application/pdf',
          size: file.fileSize || 0
        });
      } else if (result.canceled) {
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

    if (!selectedDoctor) {
      Alert.alert('Error', 'Please select a doctor');
      return;
    }

    setIsUploading(true);
    
    try {
      // Find the selected doctor's name
      const doctor = doctors.find(d => d.id === selectedDoctor);
      const doctorName = doctor ? doctor.name : 'Unknown Doctor';

      const labResultData = {
        title: title.trim(),
        fileName: selectedFile.name,
        fileType: selectedFile.mimeType,
        fileSize: selectedFile.size,
        uri: selectedFile.uri,
        patientId: patientProfile?.uid,
        patientName: `${patientProfile?.firstName || ''} ${patientProfile?.lastName || ''}`.trim(),
        doctorId: selectedDoctor,
        doctorName: doctorName,
        uploadDate: new Date().toISOString(),
        status: 'pending_review',
        uploadedBy: 'patient'
      };

      await onUpload(labResultData);
      setTitle('');
      setSelectedFile(null);
      setSelectedDoctor('');
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

  // Get the name of the selected doctor for display
  const getSelectedDoctorName = () => {
    if (!selectedDoctor) return 'Select a doctor...';
    const doctor = doctors.find(d => d.id === selectedDoctor);
    return doctor ? doctor.name : 'Select a doctor...';
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
              Upload Lab Result
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
              <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Select Doctor</Text>
              <TouchableOpacity 
                style={[styles.dropdown, { 
                  backgroundColor: theme.INPUT_BACKGROUND, 
                  borderColor: theme.BORDER 
                }]}
                onPress={() => setShowDoctorDropdown(!showDoctorDropdown)}
              >
                <Text style={[styles.dropdownText, { color: selectedDoctor ? theme.TEXT_PRIMARY : theme.TEXT_SECONDARY }]}>
                  {getSelectedDoctorName()}
                </Text>
                <Ionicons 
                  name={showDoctorDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={theme.TEXT_SECONDARY} 
                />
              </TouchableOpacity>

              {showDoctorDropdown && (
                <View style={[styles.dropdownList, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
                  {doctors.map((doctor) => (
                    <TouchableOpacity
                      key={doctor.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedDoctor(doctor.id);
                        setShowDoctorDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: theme.TEXT_PRIMARY }]}>{doctor.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Patient Information</Text>
              <Card style={[styles.infoCard, { backgroundColor: theme.BACKGROUND, borderColor: theme.BORDER }]}>
                <Text style={[styles.infoText, { color: theme.TEXT_PRIMARY }]}>
                  <Text style={{ fontWeight: 'bold' }}>Patient: </Text>
                  {patientProfile ? `${patientProfile.firstName || ''} ${patientProfile.lastName || ''}`.trim() : 'Not available'}
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
              disabled={isUploading || !title.trim() || !selectedFile || !selectedDoctor}
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
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    backgroundColor: theme.INPUT_BACKGROUND,
  },
  dropdownText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    zIndex: 1000,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  dropdownItemText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
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

export default PatientLabResultUploadModal;