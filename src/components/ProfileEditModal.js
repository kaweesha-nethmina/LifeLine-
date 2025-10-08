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
import { useTheme } from '../context/ThemeContext';
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
  const { theme } = useTheme();
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
        <View style={[styles.modalOverlay, { backgroundColor: theme.OVERLAY }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.WHITE, maxHeight: '95%', maxWidth: 700 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.BORDER }]}>
              <Text style={[styles.modalTitle, { color: theme.TEXT_PRIMARY }]}>Edit Profile</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.GRAY_DARK} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              {/* Personal Information Section */}
              <View style={[styles.sectionHeader, { borderBottomColor: theme.BORDER }]}>
                <Text style={[styles.sectionHeaderText, { color: theme.TEXT_SECONDARY }]}>Personal Information</Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>First Name</Text>
                <TextInput
                  style={[styles.input, { 
                    borderWidth: 1, 
                    borderColor: theme.BORDER, 
                    backgroundColor: theme.WHITE, 
                    color: theme.TEXT_PRIMARY 
                  }]}
                  value={editForm.firstName}
                  onChangeText={(text) => setEditForm({...editForm, firstName: text})}
                  placeholder="Enter first name"
                  placeholderTextColor={theme.GRAY_MEDIUM}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Last Name</Text>
                <TextInput
                  style={[styles.input, { 
                    borderWidth: 1, 
                    borderColor: theme.BORDER, 
                    backgroundColor: theme.WHITE, 
                    color: theme.TEXT_PRIMARY 
                  }]}
                  value={editForm.lastName}
                  onChangeText={(text) => setEditForm({...editForm, lastName: text})}
                  placeholder="Enter last name"
                  placeholderTextColor={theme.GRAY_MEDIUM}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Phone Number</Text>
                <TextInput
                  style={[styles.input, { 
                    borderWidth: 1, 
                    borderColor: theme.BORDER, 
                    backgroundColor: theme.WHITE, 
                    color: theme.TEXT_PRIMARY 
                  }]}
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm({...editForm, phone: text})}
                  placeholder="Enter phone number"
                  placeholderTextColor={theme.GRAY_MEDIUM}
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Date of Birth</Text>
                <TextInput
                  style={[styles.input, { 
                    borderWidth: 1, 
                    borderColor: theme.BORDER, 
                    backgroundColor: theme.WHITE, 
                    color: theme.TEXT_PRIMARY 
                  }]}
                  value={editForm.dateOfBirth}
                  onChangeText={(text) => setEditForm({...editForm, dateOfBirth: text})}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.GRAY_MEDIUM}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Gender</Text>
                <View style={[styles.pickerContainer, { 
                  borderWidth: 1, 
                  borderColor: theme.BORDER, 
                  backgroundColor: theme.WHITE 
                }]}>
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
                    <Text style={[styles.pickerText, { color: theme.TEXT_PRIMARY }]}>
                      {editForm.gender || 'Select Gender'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={theme.GRAY_MEDIUM} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { 
                    borderWidth: 1, 
                    borderColor: theme.BORDER, 
                    backgroundColor: theme.WHITE, 
                    color: theme.TEXT_PRIMARY 
                  }]}
                  value={editForm.address}
                  onChangeText={(text) => setEditForm({...editForm, address: text})}
                  placeholder="Enter address"
                  placeholderTextColor={theme.GRAY_MEDIUM}
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              {/* Medical Information Section (Patient/Doctor) */}
              {(isPatient || isDoctor) && (
                <>
                  <View style={[styles.sectionHeader, { borderBottomColor: theme.BORDER }]}>
                    <Text style={[styles.sectionHeaderText, { color: theme.TEXT_SECONDARY }]}>Medical Information</Text>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Blood Type</Text>
                    <TextInput
                      style={[styles.input, { 
                        borderWidth: 1, 
                        borderColor: theme.BORDER, 
                        backgroundColor: theme.WHITE, 
                        color: theme.TEXT_PRIMARY 
                      }]}
                      value={editForm.bloodType}
                      onChangeText={(text) => setEditForm({...editForm, bloodType: text})}
                      placeholder="Enter blood type (e.g., A+, B-, O+)"
                      placeholderTextColor={theme.GRAY_MEDIUM}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Allergies</Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { 
                        borderWidth: 1, 
                        borderColor: theme.BORDER, 
                        backgroundColor: theme.WHITE, 
                        color: theme.TEXT_PRIMARY 
                      }]}
                      value={editForm.allergies}
                      onChangeText={(text) => setEditForm({...editForm, allergies: text})}
                      placeholder="Enter allergies (separated by commas)"
                      placeholderTextColor={theme.GRAY_MEDIUM}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Emergency Contact</Text>
                    <TextInput
                      style={[styles.input, { 
                        borderWidth: 1, 
                        borderColor: theme.BORDER, 
                        backgroundColor: theme.WHITE, 
                        color: theme.TEXT_PRIMARY 
                      }]}
                      value={editForm.emergencyContact}
                      onChangeText={(text) => setEditForm({...editForm, emergencyContact: text})}
                      placeholder="Enter emergency contact"
                      placeholderTextColor={theme.GRAY_MEDIUM}
                      keyboardType="phone-pad"
                    />
                  </View>
                </>
              )}
              
              {/* Doctor Information Section */}
              {isDoctor && (
                <>
                  <View style={[styles.sectionHeader, { borderBottomColor: theme.BORDER }]}>
                    <Text style={[styles.sectionHeaderText, { color: theme.TEXT_SECONDARY }]}>Professional Information</Text>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Specialization</Text>
                    <TextInput
                      style={[styles.input, { 
                        borderWidth: 1, 
                        borderColor: theme.BORDER, 
                        backgroundColor: theme.WHITE, 
                        color: theme.TEXT_PRIMARY 
                      }]}
                      value={editForm.specialization}
                      onChangeText={(text) => setEditForm({...editForm, specialization: text})}
                      placeholder="Enter specialization"
                      placeholderTextColor={theme.GRAY_MEDIUM}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>License Number</Text>
                    <TextInput
                      style={[styles.input, { 
                        borderWidth: 1, 
                        borderColor: theme.BORDER, 
                        backgroundColor: theme.WHITE, 
                        color: theme.TEXT_PRIMARY 
                      }]}
                      value={editForm.licenseNumber}
                      onChangeText={(text) => setEditForm({...editForm, licenseNumber: text})}
                      placeholder="Enter license number"
                      placeholderTextColor={theme.GRAY_MEDIUM}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Years of Experience</Text>
                    <TextInput
                      style={[styles.input, { 
                        borderWidth: 1, 
                        borderColor: theme.BORDER, 
                        backgroundColor: theme.WHITE, 
                        color: theme.TEXT_PRIMARY 
                      }]}
                      value={editForm.experience}
                      onChangeText={(text) => setEditForm({...editForm, experience: text})}
                      placeholder="Enter years of experience"
                      placeholderTextColor={theme.GRAY_MEDIUM}
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}
              
              {/* Emergency Operator Information Section */}
              {isEmergencyOperator && (
                <>
                  <View style={[styles.sectionHeader, { borderBottomColor: theme.BORDER }]}>
                    <Text style={[styles.sectionHeaderText, { color: theme.TEXT_SECONDARY }]}>Professional Information</Text>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Department</Text>
                    <TextInput
                      style={[styles.input, { 
                        borderWidth: 1, 
                        borderColor: theme.BORDER, 
                        backgroundColor: theme.WHITE, 
                        color: theme.TEXT_PRIMARY 
                      }]}
                      value={editForm.department}
                      onChangeText={(text) => setEditForm({...editForm, department: text})}
                      placeholder="Enter department"
                      placeholderTextColor={theme.GRAY_MEDIUM}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Position</Text>
                    <TextInput
                      style={[styles.input, { 
                        borderWidth: 1, 
                        borderColor: theme.BORDER, 
                        backgroundColor: theme.WHITE, 
                        color: theme.TEXT_PRIMARY 
                      }]}
                      value={editForm.position}
                      onChangeText={(text) => setEditForm({...editForm, position: text})}
                      placeholder="Enter position"
                      placeholderTextColor={theme.GRAY_MEDIUM}
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