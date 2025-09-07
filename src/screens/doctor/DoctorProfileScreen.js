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
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { supabaseStorage } from '../../services/supabase';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';

const DoctorProfileScreen = ({ navigation }) => {
  const { userProfile, updateUserProfile, logout } = useAuth();
  const [doctorData, setDoctorData] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    loadDoctorProfile();
  }, []);

  const loadDoctorProfile = async () => {
    try {
      // In a real app, fetch from Firebase
      // For now, using enhanced user profile with doctor-specific data
      setDoctorData(userProfile);
    } catch (error) {
      console.error('Error loading doctor profile:', error);
    }
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
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
    if (!userProfile?.uid) {
      Alert.alert('Error', 'Please log in to update profile picture');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      console.log('Starting doctor profile picture upload...');
      
      // Delete old profile picture if exists
      if (doctorData?.profilePicturePath) {
        console.log('Deleting old profile picture...');
        await supabaseStorage.deleteProfilePicture(doctorData.profilePicturePath);
      }
      
      // Upload new profile picture
      const { data: uploadData, error: uploadError } = await supabaseStorage.uploadProfilePicture(
        userProfile.uid,
        imageFile
      );
      
      if (uploadError) {
        throw new Error(`Profile picture upload failed: ${uploadError.message}`);
      }
      
      console.log('Doctor profile picture uploaded successfully:', uploadData.publicUrl);
      
      // Update doctor data
      const updatedDoctorData = {
        ...doctorData,
        profilePictureURL: uploadData.publicUrl,
        profilePicturePath: uploadData.filePath
      };
      
      setDoctorData(updatedDoctorData);
      
      // Update user profile
      const result = await updateUserProfile({
        profilePictureURL: uploadData.publicUrl,
        profilePicturePath: uploadData.filePath
      });
      
      if (result.success) {
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
      
    } catch (error) {
      console.error('Doctor profile picture upload error:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload profile picture');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const ProfileHeader = () => (
    <Card style={styles.headerCard}>
      <View style={styles.profileHeader}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={handleAvatarPress}
          disabled={isUploadingAvatar}
        >
          <View style={styles.avatar}>
            {doctorData?.profilePictureURL || userProfile?.profilePictureURL ? (
              <Image 
                source={{ uri: doctorData?.profilePictureURL || userProfile?.profilePictureURL }} 
                style={styles.avatarImage}
                onError={() => console.log('Doctor avatar image load error')}
              />
            ) : (
              <Text style={styles.avatarText}>
                {doctorData.firstName?.charAt(0)}{doctorData.lastName?.charAt(0)}
              </Text>
            )}
            {isUploadingAvatar && (
              <View style={styles.uploadingOverlay}>
                <Ionicons name="cloud-upload" size={20} color={COLORS.WHITE} />
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.editAvatarButton}
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
          >
            <Ionicons name="camera" size={16} color={COLORS.WHITE} />
          </TouchableOpacity>
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.doctorName}>
            Dr. {doctorData.firstName} {doctorData.lastName}
          </Text>
          <Text style={styles.specialization}>{doctorData.specialization}</Text>
          <Text style={styles.licenseNumber}>License: {doctorData.licenseNumber}</Text>
          
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color={COLORS.WARNING} />
            <Text style={styles.rating}>{doctorData.rating}</Text>
            <Text style={styles.ratingCount}>({doctorData.totalPatients} patients)</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditProfile}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const StatsSection = () => (
    <Card style={styles.statsCard}>
      <Text style={styles.sectionTitle}>Professional Stats</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{doctorData.yearsOfExperience}</Text>
          <Text style={styles.statLabel}>Years Experience</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{doctorData.totalPatients}</Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{doctorData.totalConsultations}</Text>
          <Text style={styles.statLabel}>Consultations</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>LKR {doctorData.consultationFee}</Text>
          <Text style={styles.statLabel}>Consultation Fee</Text>
        </View>
      </View>
    </Card>
  );

  const InfoSection = ({ title, data, icon }) => (
    <Card style={styles.infoCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons name={icon} size={20} color={COLORS.PRIMARY} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      </View>
      
      {Array.isArray(data) ? (
        data.map((item, index) => (
          <Text key={index} style={styles.infoText}>• {item}</Text>
        ))
      ) : typeof data === 'object' ? (
        Object.entries(data).map(([key, value]) => (
          <View key={key} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}:</Text>
            <Text style={styles.infoValue}>{value}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.infoText}>{data}</Text>
      )}
    </Card>
  );

  const ActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Settings')}
      >
        <Ionicons name="settings-outline" size={20} color={COLORS.INFO} />
        <Text style={[styles.actionText, { color: COLORS.INFO }]}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => Alert.alert('Feature Coming Soon', 'Professional credentials management will be available soon.')}
      >
        <Ionicons name="document-text-outline" size={20} color={COLORS.SUCCESS} />
        <Text style={[styles.actionText, { color: COLORS.SUCCESS }]}>Credentials</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => Alert.alert('Feature Coming Soon', 'Schedule management will be available soon.')}
      >
        <Ionicons name="calendar-outline" size={20} color={COLORS.WARNING} />
        <Text style={[styles.actionText, { color: COLORS.WARNING }]}>Schedule</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={COLORS.ERROR} />
        <Text style={[styles.actionText, { color: COLORS.ERROR }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  const EditProfileModal = () => {
    const [editData, setEditData] = useState({
      firstName: doctorData.firstName || '',
      lastName: doctorData.lastName || '',
      specialization: doctorData.specialization || '',
      licenseNumber: doctorData.licenseNumber || '',
      bio: doctorData.bio || '',
      yearsOfExperience: doctorData.yearsOfExperience?.toString() || '',
      consultationFee: doctorData.consultationFee?.toString() || '',
      education: doctorData.education || [],
      certifications: doctorData.certifications || [],
      languages: doctorData.languages || [],
      hospitalAffiliations: doctorData.hospitalAffiliations || [],
      achievements: doctorData.achievements || []
    });

    const handleSave = async () => {
      try {
        // Convert numeric values back to numbers
        const updatedData = {
          ...doctorData,
          ...editData,
          yearsOfExperience: parseInt(editData.yearsOfExperience) || 0,
          consultationFee: parseInt(editData.consultationFee) || 0
        };

        // Update the local state
        setDoctorData(updatedData);
        
        // Update the user profile
        const result = await updateUserProfile(updatedData);
        
        if (result.success) {
          setShowEditModal(false);
          Alert.alert('Success', 'Profile updated successfully');
        } else {
          throw new Error(result.error || 'Failed to update profile');
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', error.message || 'Failed to update profile');
      }
    };

    return (
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.firstName}
                  onChangeText={(text) => setEditData({...editData, firstName: text})}
                  placeholder="Enter first name"
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.lastName}
                  onChangeText={(text) => setEditData({...editData, lastName: text})}
                  placeholder="Enter last name"
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Specialization</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.specialization}
                  onChangeText={(text) => setEditData({...editData, specialization: text})}
                  placeholder="Enter specialization"
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>License Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.licenseNumber}
                  onChangeText={(text) => setEditData({...editData, licenseNumber: text})}
                  placeholder="Enter license number"
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Years of Experience</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.yearsOfExperience}
                  onChangeText={(text) => setEditData({...editData, yearsOfExperience: text})}
                  placeholder="Enter years of experience"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Consultation Fee (LKR)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.consultationFee}
                  onChangeText={(text) => setEditData({...editData, consultationFee: text})}
                  placeholder="Enter consultation fee"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Biography</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editData.bio}
                  onChangeText={(text) => setEditData({...editData, bio: text})}
                  placeholder="Enter your professional biography..."
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Education (comma separated)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editData.education.join(', ')}
                  onChangeText={(text) => setEditData({...editData, education: text.split(',').map(item => item.trim())})}
                  placeholder="Enter education details"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Certifications (comma separated)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editData.certifications.join(', ')}
                  onChangeText={(text) => setEditData({...editData, certifications: text.split(',').map(item => item.trim())})}
                  placeholder="Enter certifications"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Languages (comma separated)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.languages.join(', ')}
                  onChangeText={(text) => setEditData({...editData, languages: text.split(',').map(item => item.trim())})}
                  placeholder="Enter languages"
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hospital Affiliations (comma separated)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editData.hospitalAffiliations.join(', ')}
                  onChangeText={(text) => setEditData({...editData, hospitalAffiliations: text.split(',').map(item => item.trim())})}
                  placeholder="Enter hospital affiliations"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Achievements (comma separated)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editData.achievements.join(', ')}
                  onChangeText={(text) => setEditData({...editData, achievements: text.split(',').map(item => item.trim())})}
                  placeholder="Enter achievements"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowEditModal(false)}
                style={styles.modalButton}
                variant="outline"
              />
              <Button
                title="Save"
                onPress={handleSave}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileHeader />
        <StatsSection />
        
        <InfoSection
          title="Biography"
          data={doctorData.bio}
          icon="document-text-outline"
        />

        <InfoSection
          title="Education & Training"
          data={doctorData.education}
          icon="school-outline"
        />

        <InfoSection
          title="Certifications"
          data={doctorData.certifications}
          icon="ribbon-outline"
        />

        <InfoSection
          title="Languages"
          data={doctorData.languages}
          icon="language-outline"
        />

        <InfoSection
          title="Hospital Affiliations"
          data={doctorData.hospitalAffiliations}
          icon="business-outline"
        />

        <InfoSection
          title="Achievements"
          data={doctorData.achievements}
          icon="trophy-outline"
        />

        <ActionButtons />
      </ScrollView>

      <EditProfileModal />
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
    marginBottom: SPACING.MD,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.MD,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    borderRadius: 40,
  },
  avatarText: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.SUCCESS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  specialization: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginBottom: SPACING.XS / 2,
  },
  licenseNumber: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.XS / 2,
    marginRight: SPACING.XS,
  },
  ratingCount: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  editButton: {
    padding: SPACING.SM,
  },
  statsCard: {
    marginBottom: SPACING.MD,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
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
  infoCard: {
    marginBottom: SPACING.MD,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  infoText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
    marginBottom: SPACING.XS,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.XS,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  infoLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: SPACING.MD,
    marginBottom: SPACING.XL,
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.SM,
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.SM,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    marginTop: SPACING.XS,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    width: '90%',
    maxHeight: '90%',
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
    color: COLORS.TEXT_PRIMARY,
  },
  formContainer: {
    maxHeight: 400,
    marginBottom: SPACING.MD,
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
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
});

export default DoctorProfileScreen;