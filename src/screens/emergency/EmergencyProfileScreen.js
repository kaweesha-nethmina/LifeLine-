import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';

const EmergencyProfileScreen = ({ navigation }) => {
  const { userProfile, logout } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    operatorId: 'EOP001',
    firstName: userProfile?.firstName || 'Emergency',
    lastName: userProfile?.lastName || 'Operator',
    email: userProfile?.email || 'operator@lifeline.com',
    phone: '+1 (555) 911-0000',
    badge: 'Badge #1001',
    department: 'Emergency Operations',
    shift: 'Day Shift',
    station: 'Central Command',
    certifications: ['EMD', 'CPR', 'First Aid'],
    yearsOfService: 5
  });

  const handleSaveProfile = () => {
    // In a real app, save to Firebase/backend
    Alert.alert('Success', 'Profile updated successfully!');
    setShowEditModal(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  const ProfileItem = ({ icon, label, value, onPress, showArrow = false }) => (
    <TouchableOpacity 
      style={styles.profileItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.profileItemLeft}>
        <Ionicons name={icon} size={20} color={COLORS.PRIMARY} />
        <View style={styles.profileItemText}>
          <Text style={styles.profileItemLabel}>{label}</Text>
          <Text style={styles.profileItemValue}>{value}</Text>
        </View>
      </View>
      {showArrow && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.GRAY_MEDIUM} />
      )}
    </TouchableOpacity>
  );

  const StatCard = ({ title, value, icon, color }) => (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color={COLORS.WHITE} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Card>
  );

  const EditProfileModal = () => (
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

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={styles.textInput}
                value={editedProfile.firstName}
                onChangeText={(text) => setEditedProfile({...editedProfile, firstName: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.textInput}
                value={editedProfile.lastName}
                onChangeText={(text) => setEditedProfile({...editedProfile, lastName: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={editedProfile.email}
                onChangeText={(text) => setEditedProfile({...editedProfile, email: text})}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.textInput}
                value={editedProfile.phone}
                onChangeText={(text) => setEditedProfile({...editedProfile, phone: text})}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Station</Text>
              <TextInput
                style={styles.textInput}
                value={editedProfile.station}
                onChangeText={(text) => setEditedProfile({...editedProfile, station: text})}
              />
            </View>
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
              onPress={handleSaveProfile}
              style={styles.modalActionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const ShiftModal = () => (
    <Modal
      visible={showShiftModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowShiftModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Shift Information</Text>
            <TouchableOpacity onPress={() => setShowShiftModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.shiftInfo}>
              <Text style={styles.shiftTitle}>Current Shift</Text>
              <Text style={styles.shiftDetails}>Day Shift (8:00 AM - 8:00 PM)</Text>
              <Text style={styles.shiftDate}>March 15, 2024</Text>
            </View>

            <View style={styles.shiftStats}>
              <View style={styles.shiftStatItem}>
                <Text style={styles.shiftStatValue}>6h 30m</Text>
                <Text style={styles.shiftStatLabel}>Time Elapsed</Text>
              </View>
              <View style={styles.shiftStatItem}>
                <Text style={styles.shiftStatValue}>1h 30m</Text>
                <Text style={styles.shiftStatLabel}>Time Remaining</Text>
              </View>
            </View>

            <View style={styles.shiftActions}>
              <Button
                title="Break Request"
                onPress={() => Alert.alert('Feature Coming Soon', 'Break request functionality will be available soon.')}
                style={styles.shiftActionButton}
                variant="outline"
              />
              <Button
                title="End Shift"
                onPress={() => Alert.alert('Feature Coming Soon', 'Shift management will be available soon.')}
                style={styles.shiftActionButton}
                variant="danger"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Card style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>
              {editedProfile.firstName.charAt(0)}{editedProfile.lastName.charAt(0)}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {editedProfile.firstName} {editedProfile.lastName}
          </Text>
          <Text style={styles.profileTitle}>Emergency Operations Specialist</Text>
          <Text style={styles.profileBadge}>{editedProfile.badge}</Text>
          
          <Button
            title="Edit Profile"
            onPress={() => setShowEditModal(true)}
            style={styles.editButton}
            variant="outline"
          />
        </Card>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Years of Service"
            value={editedProfile.yearsOfService}
            icon="time"
            color={COLORS.PRIMARY}
          />
          <StatCard
            title="Emergencies Today"
            value="12"
            icon="warning"
            color={COLORS.EMERGENCY}
          />
          <StatCard
            title="Response Rate"
            value="98%"
            icon="speedometer"
            color={COLORS.SUCCESS}
          />
        </View>

        {/* Personal Information */}
        <Card style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <ProfileItem
            icon="person-outline"
            label="Full Name"
            value={`${editedProfile.firstName} ${editedProfile.lastName}`}
          />
          
          <ProfileItem
            icon="mail-outline"
            label="Email"
            value={editedProfile.email}
          />
          
          <ProfileItem
            icon="call-outline"
            label="Phone"
            value={editedProfile.phone}
          />
          
          <ProfileItem
            icon="id-card-outline"
            label="Operator ID"
            value={editedProfile.operatorId}
          />
        </Card>

        {/* Work Information */}
        <Card style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Work Information</Text>
          
          <ProfileItem
            icon="business-outline"
            label="Department"
            value={editedProfile.department}
          />
          
          <ProfileItem
            icon="location-outline"
            label="Station"
            value={editedProfile.station}
          />
          
          <ProfileItem
            icon="time-outline"
            label="Current Shift"
            value={editedProfile.shift}
            onPress={() => setShowShiftModal(true)}
            showArrow={true}
          />
          
          <ProfileItem
            icon="ribbon-outline"
            label="Certifications"
            value={editedProfile.certifications.join(', ')}
          />
        </Card>

        {/* Settings */}
        <Card style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <ProfileItem
            icon="notifications-outline"
            label="Notifications"
            value="Enabled"
            onPress={() => Alert.alert('Feature Coming Soon', 'Notification settings will be available soon.')}
            showArrow={true}
          />
          
          <ProfileItem
            icon="settings-outline"
            label="App Settings"
            value="Configure"
            onPress={() => navigation.navigate('Settings')}
            showArrow={true}
          />
          
          <ProfileItem
            icon="help-circle-outline"
            label="Help & Support"
            value="Get Help"
            onPress={() => Alert.alert('Feature Coming Soon', 'Help & support will be available soon.')}
            showArrow={true}
          />
          
          <ProfileItem
            icon="information-circle-outline"
            label="About"
            value="Version 1.0.0"
            onPress={() => Alert.alert('LifeLine+ Emergency', 'Version 1.0.0\n\nEmergency Operations Management System')}
            showArrow={true}
          />
        </Card>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Change Password"
            onPress={() => Alert.alert('Feature Coming Soon', 'Password change will be available soon.')}
            style={styles.actionButton}
            variant="outline"
          />
          
          <Button
            title="Sign Out"
            onPress={handleLogout}
            style={styles.actionButton}
            variant="danger"
          />
        </View>
      </ScrollView>

      <EditProfileModal />
      <ShiftModal />
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.XL,
    marginBottom: SPACING.MD,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.EMERGENCY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  profileInitials: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  profileName: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  profileTitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS,
  },
  profileBadge: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  editButton: {
    marginTop: SPACING.SM,
    paddingHorizontal: SPACING.XL,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    marginHorizontal: SPACING.XS,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  statValue: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  statTitle: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  profileSection: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileItemText: {
    marginLeft: SPACING.MD,
    flex: 1,
  },
  profileItemLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  profileItemValue: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  actionsContainer: {
    marginTop: SPACING.MD,
    marginBottom: SPACING.XL,
  },
  actionButton: {
    marginBottom: SPACING.MD,
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
    color: COLORS.TEXT_PRIMARY,
  },
  modalBody: {
    marginBottom: SPACING.MD,
  },
  inputGroup: {
    marginBottom: SPACING.MD,
  },
  inputLabel: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalActionButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
  shiftInfo: {
    alignItems: 'center',
    paddingVertical: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    marginBottom: SPACING.MD,
  },
  shiftTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  shiftDetails: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS,
  },
  shiftDate: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  shiftStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.LG,
  },
  shiftStatItem: {
    alignItems: 'center',
  },
  shiftStatValue: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS,
  },
  shiftStatLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  shiftActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shiftActionButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
});

export default EmergencyProfileScreen;