import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Doctor Screens
import DoctorDashboardScreen from '../screens/doctor/DoctorDashboardScreen';
import DoctorAppointmentsScreen from '../screens/doctor/DoctorAppointmentsScreen';
import DoctorPatientsScreen from '../screens/doctor/DoctorPatientsScreen';
import DoctorConsultationScreen from '../screens/doctor/DoctorConsultationScreen';
import DoctorPrescriptionsScreen from '../screens/doctor/DoctorPrescriptionsScreen';
import DoctorProfileScreen from '../screens/doctor/DoctorProfileScreen';

// Shared Screens
import ChatScreen from '../screens/ChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Emergency Related Screens
import VideoCallScreen from '../screens/VideoCallScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigators for each tab
const DashboardStack = createStackNavigator();
const AppointmentsStack = createStackNavigator();
const PatientsStack = createStackNavigator();
const ConsultationsStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const DashboardStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <DashboardStack.Navigator
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
      <DashboardStack.Screen 
        name="DashboardMain" 
        component={DoctorDashboardScreen} 
        options={{ title: 'Doctor Dashboard' }}
      />
      <DashboardStack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
    </DashboardStack.Navigator>
  );
};

const AppointmentsStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <AppointmentsStack.Navigator
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
      <AppointmentsStack.Screen 
        name="AppointmentsMain" 
        component={DoctorAppointmentsScreen}
        options={{ title: 'My Appointments' }}
      />
      <AppointmentsStack.Screen 
        name="VideoCall" 
        component={VideoCallScreen}
        options={{ title: 'Video Consultation' }}
      />
      <AppointmentsStack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ title: 'Patient Chat' }}
      />
    </AppointmentsStack.Navigator>
  );
};

const PatientsStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <PatientsStack.Navigator
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
      <PatientsStack.Screen 
        name="PatientsMain" 
        component={DoctorPatientsScreen}
        options={{ title: 'My Patients' }}
      />
      <PatientsStack.Screen 
        name="Prescriptions" 
        component={DoctorPrescriptionsScreen}
        options={{ title: 'Manage Prescriptions' }}
      />
    </PatientsStack.Navigator>
  );
};

const ConsultationsStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <ConsultationsStack.Navigator
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
      <ConsultationsStack.Screen 
        name="ConsultationsMain" 
        component={DoctorConsultationScreen}
        options={{ title: 'Consultations' }}
      />
      <ConsultationsStack.Screen 
        name="VideoCall" 
        component={VideoCallScreen}
        options={{ title: 'Video Consultation' }}
      />
      <ConsultationsStack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ title: 'Patient Chat' }}
      />
    </ConsultationsStack.Navigator>
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
        component={DoctorProfileScreen}
        options={{ title: 'Doctor Profile' }}
      />
      <ProfileStack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </ProfileStack.Navigator>
  );
};

// Main Tab Navigator for Doctors
const DoctorTabNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Patients') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Consultations') {
            iconName = focused ? 'videocam' : 'videocam-outline';
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
        name="Dashboard" 
        component={DashboardStackNavigator}
      />
      <Tab.Screen 
        name="Appointments" 
        component={AppointmentsStackNavigator}
      />
      <Tab.Screen 
        name="Patients" 
        component={PatientsStackNavigator}
      />
      <Tab.Screen 
        name="Consultations" 
        component={ConsultationsStackNavigator}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
      />
    </Tab.Navigator>
  );
};

export default DoctorTabNavigator;