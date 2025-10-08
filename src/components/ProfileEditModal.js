import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, USER_ROLES } from '../constants';
import Button from './Button';

const ProfileEditModal = ({ 
  isVisible, 
  onClose, 
  userProfile, 
  onUpdateProfile,
  isPatient,
  isDoctor,
  isEmergencyOperator
}) => {
  const [editForm, setEditForm] = useState({
    firstName: userProfile?.firstName || '',
    lastName: userProfile?.lastName || '',
    phone: userProfile?.phone || '',
    dateOfBirth: userProfile?.dateOfBirth || '',
    gender: userProfile?.gender || '',
    address: userProfile?.address || '',
    emergencyContact: userProfile?.emergencyContact || '',
    bloodType: userProfile?.bloodType || '',
    allergies: userProfile?.allergies?.join(', ') || '',
    // Doctor specific fields
    specialization: userProfile?.specialization || '',
    licenseNumber: userProfile?.licenseNumber || '',
    experience: userProfile?.experience || '',
    // Emergency operator specific fields
    department: userProfile?.department || '',
    position: userProfile?.position || ''
  });

  // Update form when userProfile changes
  useEffect(() => {
    setEditForm({
      firstName: userProfile?.firstName || '',
      lastName: userProfile?.lastName || '',
      phone: userProfile?.phone || '',
      dateOfBirth: userProfile?.dateOfBirth || '',
      gender: userProfile?.gender || '',
      address: userProfile?.address || '',
      emergencyContact: userProfile?.emergencyContact || '',
      bloodType: userProfile?.bloodType || '',
      allergies: userProfile?.allergies?.join(', ') || '',
      // Doctor specific fields
      specialization: userProfile?.specialization || '',
      licenseNumber: userProfile?.licenseNumber || '',
      experience: userProfile?.experience || '',
      // Emergency operator specific fields
      department: userProfile?.department || '',
      position: userProfile?.position || ''
    });
  }, [userProfile]);

  const handleUpdateProfile = async () => {
    const updatedData = {
      ...editForm,
      allergies: editForm.allergies.split(',').map(item => item.trim()).filter(item => item)
    };

    const result = await onUpdateProfile(updatedData);
    if (result.success) {
      onClose();
      Alert.alert('Success', 'Profile updated successfully!');
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  // Gender options
  const genderOptions = [
    { label: 'Select Gender', value: '' },
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
    { label: 'Prefer not to say', value: 'Prefer not to say' }
  ];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      style={styles.modal}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.GRAY_DARK} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              {/* Personal Information Section */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Personal Information</Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.firstName}
                  onChangeText={(text) => setEditForm({...editForm, firstName: text})}
                  placeholder="Enter first name"
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.lastName}
                  onChangeText={(text) => setEditForm({...editForm, lastName: text})}
                  placeholder="Enter last name"
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm({...editForm, phone: text})}
                  placeholder="Enter phone number"
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.dateOfBirth}
                  onChangeText={(text) => setEditForm({...editForm, dateOfBirth: text})}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity 
                    style={styles.pickerButton}
                    onPress={() => {
                      // Show options in an alert for now
                      Alert.alert(
                        'Select Gender',
                        '',
                        [
                          ...genderOptions.map(option => ({
                            text: option.label,
                            onPress: () => setEditForm({...editForm, gender: option.value})
                          })),
                          { text: 'Cancel', style: 'cancel' }
                        ],
                        { cancelable: true }
                      );
                    }}
                  >
                    <Text style={styles.pickerText}>
                      {editForm.gender || 'Select Gender'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.GRAY_MEDIUM} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editForm.address}
                  onChangeText={(text) => setEditForm({...editForm, address: text})}
                  placeholder="Enter address"
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              {/* Medical Information Section (Patient/Doctor) */}
              {(isPatient || isDoctor) && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>Medical Information</Text>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Blood Type</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.bloodType}
                      onChangeText={(text) => setEditForm({...editForm, bloodType: text})}
                      placeholder="Enter blood type (e.g., A+, B-, O+)"
                      placeholderTextColor={COLORS.GRAY_MEDIUM}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Allergies</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={editForm.allergies}
                      onChangeText={(text) => setEditForm({...editForm, allergies: text})}
                      placeholder="Enter allergies (separated by commas)"
                      placeholderTextColor={COLORS.GRAY_MEDIUM}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Emergency Contact</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.emergencyContact}
                      onChangeText={(text) => setEditForm({...editForm, emergencyContact: text})}
                      placeholder="Enter emergency contact"
                      placeholderTextColor={COLORS.GRAY_MEDIUM}
                      keyboardType="phone-pad"
                    />
                  </View>
                </>
              )}
              
              {/* Doctor Information Section */}
              {isDoctor && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>Professional Information</Text>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Specialization</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.specialization}
                      onChangeText={(text) => setEditForm({...editForm, specialization: text})}
                      placeholder="Enter specialization"
                      placeholderTextColor={COLORS.GRAY_MEDIUM}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>License Number</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.licenseNumber}
                      onChangeText={(text) => setEditForm({...editForm, licenseNumber: text})}
                      placeholder="Enter license number"
                      placeholderTextColor={COLORS.GRAY_MEDIUM}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Years of Experience</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.experience}
                      onChangeText={(text) => setEditForm({...editForm, experience: text})}
                      placeholder="Enter years of experience"
                      placeholderTextColor={COLORS.GRAY_MEDIUM}
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}
              
              {/* Emergency Operator Information Section */}
              {isEmergencyOperator && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>Professional Information</Text>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Department</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.department}
                      onChangeText={(text) => setEditForm({...editForm, department: text})}
                      placeholder="Enter department"
                      placeholderTextColor={COLORS.GRAY_MEDIUM}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Position</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.position}
                      onChangeText={(text) => setEditForm({...editForm, position: text})}
                      placeholder="Enter position"
                      placeholderTextColor={COLORS.GRAY_MEDIUM}
                    />
                  </View>
                </>
              )}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={onClose}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Update"
                onPress={handleUpdateProfile}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    height: '100%',
    margin: 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.XL,
    width: '100%',
    maxHeight: '95%',
    maxWidth: 700,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalForm: {
    flex: 1,
    padding: SPACING.LG,
  },
  sectionHeader: {
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  sectionHeaderText: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    paddingVertical: SPACING.XS,
  },
  inputGroup: {
    marginBottom: SPACING.LG,
  },
  inputLabel: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.WHITE,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.WHITE,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  pickerText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
  },
  modalActions: {
    flexDirection: 'row',
    padding: SPACING.LG,
    gap: SPACING.MD,
  },
  modalButton: {
    flex: 1,
  },
});

export default ProfileEditModal;