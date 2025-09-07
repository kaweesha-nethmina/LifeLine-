import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

// Emergency Operator Screens
import SimpleEmergencyDashboardScreen from '../screens/emergency/SimpleEmergencyDashboardScreen';
import SOSManagementScreen from '../screens/emergency/SOSManagementScreen';
import AmbulanceDispatchScreen from '../screens/emergency/AmbulanceDispatchScreen';
import EmergencyResourcesScreen from '../screens/emergency/EmergencyResourcesScreen';
import EmergencyProfileScreen from '../screens/emergency/EmergencyProfileScreen';
import FirstAidManagementScreen from '../screens/emergency/FirstAidManagementScreen';

// Shared Screens
import ChatScreen from '../screens/ChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import VideoCallScreen from '../screens/VideoCallScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigators for each tab
const DashboardStack = createStackNavigator();
const SOSStack = createStackNavigator();
const DispatchStack = createStackNavigator();
const ResourcesStack = createStackNavigator();
const FirstAidStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const DashboardStackNavigator = () => (
  <DashboardStack.Navigator
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
    <DashboardStack.Screen 
      name="DashboardMain" 
      component={SimpleEmergencyDashboardScreen} 
      options={{ title: 'Emergency Control Center' }}
    />
    <DashboardStack.Screen 
      name="Notifications" 
      component={NotificationsScreen}
      options={{ title: 'Emergency Alerts' }}
    />
  </DashboardStack.Navigator>
);

const SOSStackNavigator = () => (
  <SOSStack.Navigator
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
    <SOSStack.Screen 
      name="SOSMain" 
      component={SOSManagementScreen}
      options={{ title: 'SOS Management' }}
    />
    <SOSStack.Screen 
      name="VideoCall" 
      component={VideoCallScreen}
      options={{ title: 'Emergency Video Call' }}
    />
    <SOSStack.Screen 
      name="Chat" 
      component={ChatScreen}
      options={{ title: 'Emergency Chat' }}
    />
  </SOSStack.Navigator>
);

const DispatchStackNavigator = () => (
  <DispatchStack.Navigator
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
    <DispatchStack.Screen 
      name="DispatchMain" 
      component={AmbulanceDispatchScreen}
      options={{ title: 'Ambulance Dispatch' }}
    />
  </DispatchStack.Navigator>
);

const ResourcesStackNavigator = () => (
  <ResourcesStack.Navigator
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
    <ResourcesStack.Screen 
      name="ResourcesMain" 
      component={EmergencyResourcesScreen}
      options={{ title: 'Emergency Resources' }}
    />
  </ResourcesStack.Navigator>
);

const FirstAidStackNavigator = () => (
  <FirstAidStack.Navigator
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
    <FirstAidStack.Screen 
      name="FirstAidMain" 
      component={FirstAidManagementScreen}
      options={{ title: 'First Aid Management' }}
    />
  </FirstAidStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator
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
    <ProfileStack.Screen 
      name="ProfileMain" 
      component={EmergencyProfileScreen}
      options={{ title: 'Operator Profile' }}
    />
    <ProfileStack.Screen 
      name="Settings" 
      component={SettingsScreen}
      options={{ title: 'Settings' }}
    />
  </ProfileStack.Navigator>
);

// Main Tab Navigator for Emergency Operators
const EmergencyTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'SOS') {
            iconName = focused ? 'warning' : 'warning-outline';
          } else if (route.name === 'Dispatch') {
            iconName = focused ? 'car-sport' : 'car-sport-outline';
          } else if (route.name === 'Resources') {
            iconName = focused ? 'layers' : 'layers-outline';
          } else if (route.name === 'FirstAid') {
            iconName = focused ? 'medical' : 'medical-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.EMERGENCY,
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
        options={{
          tabBarBadge: '!',
          tabBarBadgeStyle: {
            backgroundColor: COLORS.ERROR,
            color: COLORS.WHITE,
          },
        }}
      />
      <Tab.Screen 
        name="SOS" 
        component={SOSStackNavigator}
      />
      <Tab.Screen 
        name="Dispatch" 
        component={DispatchStackNavigator}
      />
      {/* <Tab.Screen 
        name="Resources" 
        component={ResourcesStackNavigator}
      /> */}
      <Tab.Screen 
        name="FirstAid" 
        component={FirstAidStackNavigator}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
      />
    </Tab.Navigator>
  );
};

export default EmergencyTabNavigator;