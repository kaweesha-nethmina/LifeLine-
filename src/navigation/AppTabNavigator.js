import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import NotificationTabIcon from '../components/NotificationTabIcon';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ConsultationScreen from '../screens/ConsultationScreen';
import EmergencyScreen from '../screens/EmergencyScreen';
import HealthRecordsScreen from '../screens/HealthRecordsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DoctorListScreen from '../screens/DoctorListScreen';
import ChatScreen from '../screens/ChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import DoctorProfileScreen from '../screens/DoctorProfileScreen';
import BookingScreen from '../screens/BookingScreen';
import MedicalHistoryScreen from '../screens/MedicalHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import UploadDocumentScreen from '../screens/UploadDocumentScreen';
import PrescriptionScreen from '../screens/PrescriptionScreen';
import FirstAidScreen from '../screens/FirstAidScreen';
import AIHealthAssistantScreen from '../screens/AIHealthAssistantScreen';
import TelemedicineScreen from '../screens/TelemedicineScreen';
import PatientAppointmentsScreen from '../screens/PatientAppointmentsScreen';

// Emergency Related Screens
import SOSScreen from '../screens/SOSScreen';
import EmergencyMapScreen from '../screens/EmergencyMapScreen';

// Consultation Related Screens
import VideoCallScreen from '../screens/VideoCallScreen';

// Health Records Related Screens
// Other Screens

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigators for each tab
const HomeStack = createStackNavigator();
const ConsultationStack = createStackNavigator();
const NotificationStack = createStackNavigator();
const EmergencyStack = createStackNavigator();
const HealthRecordsStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const HomeStackNavigator = () => (
  <HomeStack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: COLORS.PRIMARY,
      },
      headerTintColor: COLORS.WHITE,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <HomeStack.Screen 
      name="HomeMain" 
      component={HomeScreen} 
      options={{ title: 'LifeLine+' }}
    />
    <HomeStack.Screen 
      name="Notifications" 
      component={NotificationsScreen}
      options={{ title: 'Notifications' }}
    />
    <HomeStack.Screen 
      name="FirstAid" 
      component={FirstAidScreen}
      options={{ title: 'First Aid Guide' }}
    />
    <HomeStack.Screen 
      name="AIHealthAssistant" 
      component={AIHealthAssistantScreen}
      options={{ title: 'AI Health Assistant' }}
    />
  </HomeStack.Navigator>
);

const ConsultationStackNavigator = () => (
  <ConsultationStack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: COLORS.PRIMARY,
      },
      headerTintColor: COLORS.WHITE,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <ConsultationStack.Screen 
      name="ConsultationMain" 
      component={ConsultationScreen}
      options={{ title: 'Consultations' }}
    />
    <ConsultationStack.Screen 
      name="DoctorList" 
      component={DoctorListScreen}
      options={{ title: 'Available Doctors' }}
    />
    <ConsultationStack.Screen 
      name="DoctorProfile" 
      component={DoctorProfileScreen}
      options={{ title: 'Doctor Profile' }}
    />
    <ConsultationStack.Screen 
      name="Booking" 
      component={BookingScreen}
      options={{ title: 'Book Appointment' }}
    />
    <ConsultationStack.Screen 
      name="Chat" 
      component={ChatScreen}
      options={{ title: 'Chat with Doctor' }}
    />
    <ConsultationStack.Screen 
      name="VideoCall" 
      component={VideoCallScreen}
      options={{ title: 'Video Consultation' }}
    />
    <ConsultationStack.Screen 
      name="Telemedicine" 
      component={TelemedicineScreen}
      options={{ title: 'Telemedicine Tools' }}
    />
    <ConsultationStack.Screen 
      name="PatientAppointments" 
      component={PatientAppointmentsScreen}
      options={{ title: 'My Appointments' }}
    />
  </ConsultationStack.Navigator>
);

const NotificationStackNavigator = () => (
  <NotificationStack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: COLORS.PRIMARY,
      },
      headerTintColor: COLORS.WHITE,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <NotificationStack.Screen 
      name="NotificationsMain" 
      component={NotificationsScreen}
      options={{ title: 'Notifications' }}
    />
  </NotificationStack.Navigator>
);

const EmergencyStackNavigator = () => (
  <EmergencyStack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: COLORS.EMERGENCY,
      },
      headerTintColor: COLORS.WHITE,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <EmergencyStack.Screen 
      name="EmergencyMain" 
      component={EmergencyScreen}
      options={{ title: 'Emergency' }}
    />
    <EmergencyStack.Screen 
      name="SOS" 
      component={SOSScreen}
      options={{ title: 'SOS Alert' }}
    />
    <EmergencyStack.Screen 
      name="EmergencyMap" 
      component={EmergencyMapScreen}
      options={{ title: 'Emergency Tracking' }}
    />
  </EmergencyStack.Navigator>
);

const HealthRecordsStackNavigator = () => (
  <HealthRecordsStack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: COLORS.PRIMARY,
      },
      headerTintColor: COLORS.WHITE,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <HealthRecordsStack.Screen 
      name="HealthRecordsMain" 
      component={HealthRecordsScreen}
      options={{ title: 'Health Records' }}
    />
    <HealthRecordsStack.Screen 
      name="MedicalHistory" 
      component={MedicalHistoryScreen}
      options={{ title: 'Medical History' }}
    />
    <HealthRecordsStack.Screen 
      name="UploadDocument" 
      component={UploadDocumentScreen}
      options={{ title: 'Upload Document' }}
    />
    <HealthRecordsStack.Screen 
      name="Prescription" 
      component={PrescriptionScreen}
      options={{ title: 'Prescriptions' }}
    />
  </HealthRecordsStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: COLORS.PRIMARY,
      },
      headerTintColor: COLORS.WHITE,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <ProfileStack.Screen 
      name="ProfileMain" 
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
    <ProfileStack.Screen 
      name="Settings" 
      component={SettingsScreen}
      options={{ title: 'Settings' }}
    />
  </ProfileStack.Navigator>
);

// Main Tab Navigator
const AppTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Consultation') {
            iconName = focused ? 'medical' : 'medical-outline';
          } else if (route.name === 'Notifications') {
            // Use custom notification icon with badge
            return <NotificationTabIcon focused={focused} color={color} size={size} />;
          } else if (route.name === 'Emergency') {
            iconName = focused ? 'alert-circle' : 'alert-circle-outline';
          } else if (route.name === 'Health Records') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.GRAY_MEDIUM,
        tabBarStyle: {
          backgroundColor: COLORS.WHITE,
          borderTopWidth: 1,
          borderTopColor: COLORS.BORDER,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigator}
      />
      <Tab.Screen 
        name="Consultation" 
        component={ConsultationStackNavigator}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationStackNavigator}
      />
      <Tab.Screen 
        name="Emergency" 
        component={EmergencyStackNavigator}
        options={{
          tabBarBadge: '!',
          tabBarBadgeStyle: {
            backgroundColor: COLORS.EMERGENCY,
            color: COLORS.WHITE,
          },
        }}
      />
      <Tab.Screen 
        name="Health Records" 
        component={HealthRecordsStackNavigator}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
      />
    </Tab.Navigator>
  );
};

export default AppTabNavigator;