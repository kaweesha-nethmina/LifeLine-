import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

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

const DashboardStackNavigator = () => (
  <DashboardStack.Navigator
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

const AppointmentsStackNavigator = () => (
  <AppointmentsStack.Navigator
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

const PatientsStackNavigator = () => (
  <PatientsStack.Navigator
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

const ConsultationsStackNavigator = () => (
  <ConsultationsStack.Navigator
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

// Main Tab Navigator for Doctors
const DoctorTabNavigator = () => {
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