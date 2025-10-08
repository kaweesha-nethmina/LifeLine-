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
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { supabaseStorage } from '../../services/supabase';
import {
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';

const DoctorProfileScreen = ({ navigation }) => {
  const { userProfile, updateUserProfile, logout } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
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
    <Card style={[styles.headerCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <View style={styles.profileHeader}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={handleAvatarPress}
          disabled={isUploadingAvatar}
        >
          <View style={[styles.avatar, { backgroundColor: theme.PRIMARY }]}>
            {doctorData?.profilePictureURL || userProfile?.profilePictureURL ? (
              <Image 
                source={{ uri: doctorData?.profilePictureURL || userProfile?.profilePictureURL }} 
                style={styles.avatarImage}
                onError={() => console.log('Doctor avatar image load error')}
              />
            ) : (
              <Text style={[styles.avatarText, { color: theme.WHITE }]}>
                {doctorData.firstName?.charAt(0)}{doctorData.lastName?.charAt(0)}
              </Text>
            )}
            {isUploadingAvatar && (
              <View style={styles.uploadingOverlay}>
                <Ionicons name="cloud-upload" size={20} color={theme.WHITE} />
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.editAvatarButton, { backgroundColor: theme.SUCCESS }]}
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
          >
            <Ionicons name="camera" size={16} color={theme.WHITE} />
          </TouchableOpacity>
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={[styles.doctorName, { color: theme.TEXT_PRIMARY }]}>
            Dr. {doctorData.firstName} {doctorData.lastName}
          </Text>
          <Text style={[styles.specialization, { color: theme.PRIMARY }]}>{doctorData.specialization}</Text>
          <Text style={[styles.licenseNumber, { color: theme.TEXT_SECONDARY }]}>{doctorData.licenseNumber ? `License: ${doctorData.licenseNumber}` : 'License: Not provided'}</Text>
          
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color={theme.WARNING} />
            <Text style={[styles.rating, { color: theme.TEXT_PRIMARY }]}>{doctorData.rating || 0}</Text>
            <Text style={[styles.ratingCount, { color: theme.TEXT_SECONDARY }]}>({doctorData.totalPatients || 0} patients)</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditProfile}
        >
          <Ionicons name="create-outline" size={20} color={theme.PRIMARY} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const StatsSection = () => (
    <Card style={[styles.statsCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Professional Stats</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.PRIMARY }]}>{doctorData.yearsOfExperience || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Years Experience</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.PRIMARY }]}>{doctorData.totalPatients || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Total Patients</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.PRIMARY }]}>{doctorData.totalConsultations || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Consultations</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.PRIMARY }]}>LKR {doctorData.consultationFee || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Consultation Fee</Text>
        </View>
      </View>
    </Card>
  );

  const InfoSection = ({ title, data, icon }) => (
    <Card style={[styles.infoCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons name={icon} size={20} color={theme.PRIMARY} />
          <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>{title}</Text>
        </View>
      </View>
      
      {Array.isArray(data) ? (
        data.map((item, index) => (
          <Text key={index} style={[styles.infoText, { color: theme.TEXT_PRIMARY }]}>• {item}</Text>
        ))
      ) : typeof data === 'object' ? (
        Object.entries(data).map(([key, value]) => (
          <View key={key} style={[styles.infoRow, { borderBottomColor: theme.BORDER }]}>
            <Text style={[styles.infoLabel, { color: theme.TEXT_SECONDARY }]}>{key.charAt(0).toUpperCase() + key.slice(1)}:</Text>
            <Text style={[styles.infoValue, { color: theme.TEXT_PRIMARY }]}>{value}</Text>
          </View>
        ))
      ) : (
        <Text style={[styles.infoText, { color: theme.TEXT_PRIMARY }]}>{data || 'Not provided'}</Text>
      )}
    </Card>
  );

  const ActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.CARD_BACKGROUND }]}
        onPress={() => navigation.navigate('Settings')}
      >
        <Ionicons name="settings-outline" size={20} color={theme.INFO} />
        <Text style={[styles.actionText, { color: theme.INFO }]}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.CARD_BACKGROUND }]}
        onPress={() => Alert.alert('Feature Coming Soon', 'Professional credentials management will be available soon.')}
      >
        <Ionicons name="document-text-outline" size={20} color={theme.SUCCESS} />
        <Text style={[styles.actionText, { color: theme.SUCCESS }]}>Credentials</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.CARD_BACKGROUND }]}
        onPress={() => Alert.alert('Feature Coming Soon', 'Schedule management will be available soon.')}
      >
        <Ionicons name="calendar-outline" size={20} color={theme.WARNING} />
        <Text style={[styles.actionText, { color: theme.WARNING }]}>Schedule</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.CARD_BACKGROUND }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={theme.ERROR} />
        <Text style={[styles.actionText, { color: theme.ERROR }]}>Logout</Text>
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
        <View style={[styles.modalOverlay, { backgroundColor: theme.OVERLAY }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.CARD_BACKGROUND }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.TEXT_PRIMARY }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={theme.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>First Name</Text>
                <TextInput
                  style={[styles.textInput, { 
                    borderColor: theme.BORDER, 
                    color: theme.TEXT_PRIMARY,
                    backgroundColor: theme.BACKGROUND
                  }]}
                  value={editData.firstName}
                  onChangeText={(text) => setEditData({...editData, firstName: text})}
                  placeholder="Enter first name"
                  placeholderTextColor={theme.TEXT_SECONDARY}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Last Name</Text>
                <TextInput
                  style={[styles.textInput, { 
                    borderColor: theme.BORDER, 
                    color: theme.TEXT_PRIMARY,
                    backgroundColor: theme.BACKGROUND
                  }]}
                  value={editData.lastName}
                  onChangeText={(text) => setEditData({...editData, lastName: text})}
                  placeholder="Enter last name"
                  placeholderTextColor={theme.TEXT_SECONDARY}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Specialization</Text>
                <TextInput
                  style={[styles.textInput, { 
                    borderColor: theme.BORDER, 
                    color: theme.TEXT_PRIMARY,
                    backgroundColor: theme.BACKGROUND
                  }]}
                  value={editData.specialization}
                  onChangeText={(text) => setEditData({...editData, specialization: text})}
                  placeholder="Enter specialization"
                  placeholderTextColor={theme.TEXT_SECONDARY}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>License Number</Text>
                <TextInput
                  style={[styles.textInput, { 
                    borderColor: theme.BORDER, 
                    color: theme.TEXT_PRIMARY,
                    backgroundColor: theme.BACKGROUND
                  }]}
                  value={editData.licenseNumber}
                  onChangeText={(text) => setEditData({...editData, licenseNumber: text})}
                  placeholder="Enter license number"
                  placeholderTextColor={theme.TEXT_SECONDARY}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Years of Experience</Text>
                <TextInput
                  style={[styles.textInput, { 
                    borderColor: theme.BORDER, 
                    color: theme.TEXT_PRIMARY,
                    backgroundColor: theme.BACKGROUND
                  }]}
                  value={editData.yearsOfExperience}
                  onChangeText={(text) => setEditData({...editData, yearsOfExperience: text})}
                  placeholder="Enter years of experience"
                  keyboardType="numeric"
                  placeholderTextColor={theme.TEXT_SECONDARY}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Consultation Fee (LKR)</Text>
                <TextInput
                  style={[styles.textInput, { 
                    borderColor: theme.BORDER, 
                    color: theme.TEXT_PRIMARY,
                    backgroundColor: theme.BACKGROUND
                  }]}
                  value={editData.consultationFee}
                  onChangeText={(text) => setEditData({...editData, consultationFee: text})}
                  placeholder="Enter consultation fee"
                  keyboardType="numeric"
                  placeholderTextColor={theme.TEXT_SECONDARY}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Biography</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { 
                    borderColor: theme.BORDER, 
                    color: theme.TEXT_PRIMARY,
                    backgroundColor: theme.BACKGROUND
                  }]}
                  value={editData.bio}
                  onChangeText={(text) => setEditData({...editData, bio: text})}
                  placeholder="Enter your professional biography..."
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={theme.TEXT_SECONDARY}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Education (comma separated)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { 
                    borderColor: theme.BORDER, 
                    color: theme.TEXT_PRIMARY,
                    backgroundColor: theme.BACKGROUND
                  }]}
                  value={editData.education.join(', ')}
                  onChangeText={(text) => setEditData({...editData, education: text.split(',').map(item => item.trim())})}
                  placeholder="Enter education details"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={theme.TEXT_SECONDARY}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Certifications (comma separated)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { 
                    borderColor: theme.BORDER, 
                    color: theme.TEXT_PRIMARY,
                    backgroundColor: theme.BACKGROUND
                  }]}
                  value={editData.certifications.join(', ')}
                  onChangeText={(text) => setEditData({...editData, certifications: text.split(',').map(item => item.trim())})}
                  placeholder="Enter certifications"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={theme.TEXT_SECONDARY}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Languages (comma separated)</Text>
                <TextInput
                  style={[styles.textInput, { 
                    borderColor: theme.BORDER, 
                    color: theme.TEXT_PRIMARY,
                    backgroundColor: theme.BACKGROUND
                  }]}
                  value={editData.languages.join(', ')}
                  onChangeText={(text) => setEditData({...editData, languages: text.split(',').map(item => item.trim())})}
                  placeholder="Enter languages"
                  placeholderTextColor={theme.TEXT_SECONDARY}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Hospital Affiliations (comma separated)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { 
                    borderColor: theme.BORDER, 
                    color: theme.TEXT_PRIMARY,
                    backgroundColor: theme.BACKGROUND
                  }]}
                  value={editData.hospitalAffiliations.join(', ')}
                  onChangeText={(text) => setEditData({...editData, hospitalAffiliations: text.split(',').map(item => item.trim())})}
                  placeholder="Enter hospital affiliations"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={theme.TEXT_SECONDARY}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.TEXT_PRIMARY }]}>Achievements (comma separated)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { 
                    borderColor: theme.BORDER, 
                    color: theme.TEXT_PRIMARY,
                    backgroundColor: theme.BACKGROUND
                  }]}
                  value={editData.achievements.join(', ')}
                  onChangeText={(text) => setEditData({...editData, achievements: text.split(',').map(item => item.trim())})}
                  placeholder="Enter achievements"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={theme.TEXT_SECONDARY}
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
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

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  content: {
    flex: 1,
    padding: SPACING.MD,
  },
  headerCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
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
    backgroundColor: theme.PRIMARY,
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
    color: theme.WHITE,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.SUCCESS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  specialization: {
    fontSize: FONT_SIZES.MD,
    color: theme.PRIMARY,
    fontWeight: '600',
    marginBottom: SPACING.XS / 2,
  },
  licenseNumber: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.XS / 2,
    marginRight: SPACING.XS,
  },
  ratingCount: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  editButton: {
    padding: SPACING.SM,
  },
  statsCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
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
    color: theme.PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
  },
  infoCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
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
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  infoText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_PRIMARY,
    lineHeight: 20,
    marginBottom: SPACING.XS,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.XS,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  infoLabel: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_PRIMARY,
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
    backgroundColor: theme.CARD_BACKGROUND,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.SM,
    shadowColor: theme.BLACK,
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
    backgroundColor: theme.OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.CARD_BACKGROUND,
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
    color: theme.TEXT_PRIMARY,
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
    color: theme.TEXT_PRIMARY,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    backgroundColor: theme.BACKGROUND,
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