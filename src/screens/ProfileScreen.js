import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { supabaseStorage } from '../services/supabase';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants';
import Button from '../components/Button';
import Card from '../components/Card';
import { testNotificationSystem } from '../utils/notificationTestUtils';

const ProfileScreen = ({ navigation }) => {
  const { user, userProfile, logout, updateUserProfile } = useAuth();
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isHeartPatient, setIsHeartPatient] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: userProfile?.firstName || '',
    lastName: userProfile?.lastName || '',
    phone: userProfile?.phone || '',
    emergencyContact: userProfile?.emergencyContact || '',
    bloodType: userProfile?.bloodType || '',
    allergies: userProfile?.allergies?.join(', ') || ''
  });

  // Initialize heart patient status from user profile
  useEffect(() => {
    if (userProfile?.isHeartPatient !== undefined) {
      setIsHeartPatient(userProfile.isHeartPatient);
    }
  }, [userProfile]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const result = await logout();
            if (result.success) {
              // Navigation will be handled by AuthNavigator
            }
          }
        }
      ]
    );
  };

  const handleHeartPatientToggle = async (value) => {
    setIsHeartPatient(value);
    
    try {
      const result = await updateUserProfile({ isHeartPatient: value });
      if (!result.success) {
        // Revert the toggle if update fails
        setIsHeartPatient(!value);
        Alert.alert('Error', result.error || 'Failed to update heart patient status');
      }
    } catch (error) {
      // Revert the toggle if update fails
      setIsHeartPatient(!value);
      Alert.alert('Error', 'Failed to update heart patient status');
    }
  };

  const handleUpdateProfile = async () => {
    const updatedData = {
      ...editForm,
      allergies: editForm.allergies.split(',').map(item => item.trim()).filter(item => item)
    };

    const result = await updateUserProfile(updatedData);
    if (result.success) {
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  const handleAvatarPress = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage }
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error('Camera error:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
      console.error('Image picker error:', error);
    }
  };

  const uploadProfilePicture = async (imageFile) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to update profile picture');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      console.log('Starting profile picture upload...');
      
      // Delete old profile picture if exists
      if (userProfile?.profilePicturePath) {
        console.log('Deleting old profile picture...');
        await supabaseStorage.deleteProfilePicture(userProfile.profilePicturePath);
      }
      
      // Upload new profile picture
      const { data: uploadData, error: uploadError } = await supabaseStorage.uploadProfilePicture(
        user.uid,
        imageFile
      );
      
      if (uploadError) {
        throw new Error(`Profile picture upload failed: ${uploadError.message}`);
      }
      
      console.log('Profile picture uploaded successfully:', uploadData.publicUrl);
      
      // Update user profile with new profile picture URL
      const profileUpdate = {
        profilePictureURL: uploadData.publicUrl,
        profilePicturePath: uploadData.filePath
      };
      
      const result = await updateUserProfile(profileUpdate);
      if (result.success) {
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
      
    } catch (error) {
      console.error('Profile picture upload error:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload profile picture');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleTestNotifications = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to test notifications');
      return;
    }

    Alert.alert(
      'Test Notifications',
      'This will create sample notifications for testing. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Notifications',
          onPress: async () => {
            try {
              await testNotificationSystem(user.uid);
              Alert.alert('Success', 'Sample notifications created! Check the Notifications tab.');
            } catch (error) {
              console.error('Error testing notifications:', error);
              Alert.alert('Error', 'Failed to create test notifications');
            }
          }
        }
      ]
    );
  };

  const ProfileItem = ({ icon, label, value, onPress, toggle }) => (
    <TouchableOpacity style={styles.profileItem} onPress={onPress}>
      <View style={styles.itemLeft}>
        <Ionicons name={icon} size={24} color={COLORS.PRIMARY} />
        <View style={styles.itemText}>
          <Text style={styles.itemLabel}>{label}</Text>
          {toggle ? (
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Heart Patient</Text>
              <Switch
                trackColor={{ false: COLORS.GRAY_MEDIUM, true: COLORS.PRIMARY }}
                thumbColor={isHeartPatient ? COLORS.WHITE : COLORS.WHITE}
                onValueChange={handleHeartPatientToggle}
                value={isHeartPatient}
              />
            </View>
          ) : (
            <Text style={styles.itemValue}>{value || 'Not set'}</Text>
          )}
        </View>
      </View>
      {onPress && !toggle && <Ionicons name="chevron-forward" size={20} color={COLORS.GRAY_MEDIUM} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Card style={styles.headerCard}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
          >
            <View style={styles.avatar}>
              {userProfile?.profilePictureURL ? (
                <Image 
                  source={{ uri: userProfile.profilePictureURL }} 
                  style={styles.avatarImage}
                  onError={() => console.log('Avatar image load error')}
                />
              ) : (
                <Ionicons name="person" size={48} color={COLORS.WHITE} />
              )}
              {isUploadingAvatar && (
                <View style={styles.uploadingOverlay}>
                  <Ionicons name="cloud-upload" size={24} color={COLORS.WHITE} />
                </View>
              )}
            </View>
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color={COLORS.WHITE} />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>
            {userProfile?.firstName || ''} {userProfile?.lastName || ''}
          </Text>
          <Text style={styles.userEmail}>{user?.email || 'Email not available'}</Text>
          <Text style={styles.userRole}>
            {userProfile?.role ? userProfile?.role?.charAt(0).toUpperCase() + userProfile?.role?.slice(1) : 'Role not set'}
          </Text>
        </Card>

        {/* Personal Information */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <ProfileItem
            icon="person-outline"
            label="Full Name"
            value={`${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`}
          />
          
          <ProfileItem
            icon="call-outline"
            label="Phone Number"
            value={userProfile?.phone}
          />
          
          <ProfileItem
            icon="calendar-outline"
            label="Date of Birth"
            value={userProfile?.dateOfBirth}
          />
          
          <ProfileItem
            icon="person-circle-outline"
            label="Gender"
            value={userProfile?.gender}
          />
          
          <ProfileItem
            icon="location-outline"
            label="Address"
            value={userProfile?.address}
          />
        </Card>

        {/* Medical Information */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          
          <ProfileItem
            icon="heart"
            label="Heart Patient Status"
            toggle={true}
          />
          
          <ProfileItem
            icon="water-outline"
            label="Blood Type"
            value={userProfile?.bloodType}
          />
          
          <ProfileItem
            icon="warning-outline"
            label="Allergies"
            value={userProfile?.allergies?.join(', ')}
          />
          
          <ProfileItem
            icon="call-outline"
            label="Emergency Contact"
            value={userProfile?.emergencyContact}
          />
        </Card>

        {/* Account Actions */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <ProfileItem
            icon="create-outline"
            label="Edit Profile"
            value="Update your information"
            onPress={() => setEditModalVisible(true)}
          />
          
          <ProfileItem
            icon="settings-outline"
            label="Settings"
            value="App preferences"
            onPress={() => navigation.navigate('Settings')}
          />
          
          <ProfileItem
            icon="notifications-outline"
            label="Test Notifications"
            value="Create sample notifications"
            onPress={handleTestNotifications}
          />
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.ERROR} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.GRAY_DARK} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.firstName}
                  onChangeText={(text) => setEditForm({...editForm, firstName: text})}
                  placeholder="Enter first name"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.lastName}
                  onChangeText={(text) => setEditForm({...editForm, lastName: text})}
                  placeholder="Enter last name"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm({...editForm, phone: text})}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Emergency Contact</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.emergencyContact}
                  onChangeText={(text) => setEditForm({...editForm, emergencyContact: text})}
                  placeholder="Enter emergency contact"
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Blood Type</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.bloodType}
                  onChangeText={(text) => setEditForm({...editForm, bloodType: text})}
                  placeholder="Enter blood type (e.g., A+, B-, O+)"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Allergies</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editForm.allergies}
                  onChangeText={(text) => setEditForm({...editForm, allergies: text})}
                  placeholder="Enter allergies (separated by commas)"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setEditModalVisible(false)}
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
      </Modal>
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
  headerCard: {
    alignItems: 'center',
    paddingVertical: SPACING.XL,
    marginBottom: SPACING.MD,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.MD,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.SUCCESS,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.WHITE,
  },
  userName: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  userEmail: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  userRole: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    backgroundColor: COLORS.GRAY_LIGHT,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.MD,
  },
  section: {
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemText: {
    marginLeft: SPACING.MD,
    flex: 1,
  },
  itemLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  itemValue: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    marginTop: SPACING.MD,
  },
  logoutText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.ERROR,
    fontWeight: '600',
    marginLeft: SPACING.MD,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.OVERLAY,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderTopLeftRadius: BORDER_RADIUS.XL,
    borderTopRightRadius: BORDER_RADIUS.XL,
    maxHeight: '90%',
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
  modalActions: {
    flexDirection: 'row',
    padding: SPACING.LG,
    gap: SPACING.MD,
  },
  modalButton: {
    flex: 1,
  },
});

export default ProfileScreen;