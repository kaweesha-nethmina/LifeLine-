import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

// Consultation Screens
export const ConsultationScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Consultations</Text>
      <Text style={styles.subtitle}>Remote consultation features coming soon</Text>
    </View>
  </SafeAreaView>
);

export const HealthRecordsScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Health Records</Text>
      <Text style={styles.subtitle}>Health records management coming soon</Text>
    </View>
  </SafeAreaView>
);

export const ProfileScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Profile management coming soon</Text>
    </View>
  </SafeAreaView>
);

// Additional Screens
export const EmergencyMapScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Emergency Map</Text>
      <Text style={styles.subtitle}>Location tracking coming soon</Text>
    </View>
  </SafeAreaView>
);

export const DoctorListScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Available Doctors</Text>
      <Text style={styles.subtitle}>Doctor listing coming soon</Text>
    </View>
  </SafeAreaView>
);

export const BookingScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Book Appointment</Text>
      <Text style={styles.subtitle}>Appointment booking coming soon</Text>
    </View>
  </SafeAreaView>
);

export const ChatScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Chat</Text>
      <Text style={styles.subtitle}>Chat feature coming soon</Text>
    </View>
  </SafeAreaView>
);

export const VideoCallScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Video Call</Text>
      <Text style={styles.subtitle}>Video consultation coming soon</Text>
    </View>
  </SafeAreaView>
);

export const MedicalHistoryScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Medical History</Text>
      <Text style={styles.subtitle}>Medical history coming soon</Text>
    </View>
  </SafeAreaView>
);

export const UploadDocumentScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Upload Document</Text>
      <Text style={styles.subtitle}>Document upload coming soon</Text>
    </View>
  </SafeAreaView>
);

export const PrescriptionScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Prescriptions</Text>
      <Text style={styles.subtitle}>Prescription management coming soon</Text>
    </View>
  </SafeAreaView>
);

export const NotificationsScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>Notifications coming soon</Text>
    </View>
  </SafeAreaView>
);

export const SettingsScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Settings coming soon</Text>
    </View>
  </SafeAreaView>
);

export const FirstAidScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>First Aid Guide</Text>
      <Text style={styles.subtitle}>First aid guide coming soon</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  title: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});