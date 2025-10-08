import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
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
import EmergencyMapScreen from '../screens/EmergencyMapScreen';

// Consultation Related Screens
import VideoCallScreen from '../screens/VideoCallScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigators for each tab
const HomeStack = createStackNavigator();
const ConsultationStack = createStackNavigator();
const NotificationStack = createStackNavigator();
const EmergencyStack = createStackNavigator();
const HealthRecordsStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const HomeStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.PRIMARY,
        },
        headerTintColor: theme.WHITE,
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
};

const ConsultationStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <ConsultationStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.PRIMARY,
        },
        headerTintColor: theme.WHITE,
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
};

const NotificationStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <NotificationStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.PRIMARY,
        },
        headerTintColor: theme.WHITE,
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
};

const EmergencyStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <EmergencyStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.EMERGENCY,
        },
        headerTintColor: theme.WHITE,
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
        name="EmergencyMap" 
        component={EmergencyMapScreen}
        options={{ title: 'Emergency Tracking' }}
      />
    </EmergencyStack.Navigator>
  );
};

const HealthRecordsStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <HealthRecordsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.PRIMARY,
        },
        headerTintColor: theme.WHITE,
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
};

const ProfileStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.PRIMARY,
        },
        headerTintColor: theme.WHITE,
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
};

// Main Tab Navigator
const AppTabNavigator = () => {
  const { theme } = useTheme();
  
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
        tabBarActiveTintColor: theme.PRIMARY,
        tabBarInactiveTintColor: theme.GRAY_MEDIUM,
        tabBarStyle: {
          backgroundColor: theme.CARD_BACKGROUND,
          borderTopWidth: 1,
          borderTopColor: theme.BORDER,
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
            backgroundColor: theme.EMERGENCY,
            color: theme.WHITE,
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