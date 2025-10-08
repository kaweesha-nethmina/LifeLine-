import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../constants';
import Card from '../components/Card';
import Button from '../components/Button';

const SettingsScreen = ({ navigation }) => {
  const { user, userProfile, logout } = useAuth();
  const { isDarkMode, theme, toggleTheme } = useTheme();
  const styles = getStyles(theme);
  
  // Settings state
  const [notificationSettings, setNotificationSettings] = useState({
    appointments: true,
    medicationReminders: true,
    healthTips: false,
    emergency: true,
    labResults: true
  });
  
  const [privacySettings, setPrivacySettings] = useState({
    shareWithDoctors: true,
    shareWithFamily: false,
    anonymousData: true
  });
  
  const [appSettings, setAppSettings] = useState({
    darkMode: isDarkMode,
    biometricAuth: false,
    autoSync: true
  });

  // Update dark mode setting when theme changes
  React.useEffect(() => {
    setAppSettings(prev => ({...prev, darkMode: isDarkMode}));
  }, [isDarkMode]);

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your medical data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Feature Coming Soon', 'Account deletion will be available in a future update.');
          }
        }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Your medical data will be exported in a secure format. This may take a few moments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            Alert.alert('Export Started', 'You will receive an email with your exported data within 24 hours.');
          }
        }
      ]
    );
  };

  const SettingItem = ({ title, description, icon, onPress, rightContent, showArrow = true }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={20} color={theme.PRIMARY} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.TEXT_PRIMARY }]}>{title}</Text>
          {description && <Text style={[styles.settingDescription, { color: theme.TEXT_SECONDARY }]}>{description}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightContent}
        {showArrow && <Ionicons name="chevron-forward" size={20} color={theme.GRAY_MEDIUM} />}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={[styles.sectionHeader, { color: theme.TEXT_SECONDARY }]}>{title}</Text>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Section */}
        <Card style={[styles.profileSection, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.profileAvatar, { backgroundColor: theme.PRIMARY }]}>
              <Ionicons name="person" size={32} color={theme.WHITE} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.TEXT_PRIMARY }]}>
                {userProfile?.firstName} {userProfile?.lastName}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.TEXT_SECONDARY }]}>{user?.email}</Text>
              <Text style={[styles.profileRole, { color: theme.PRIMARY }]}>
                {userProfile?.role?.charAt(0).toUpperCase() + userProfile?.role?.slice(1)}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => navigation.navigate('ProfileMain')}
            >
              <Ionicons name="create" size={20} color={theme.PRIMARY} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <Card style={[styles.section, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <SettingItem
            title="Appointment Reminders"
            description="Get notified about upcoming appointments"
            icon="calendar"
            showArrow={false}
            rightContent={
              <Switch
                value={notificationSettings.appointments}
                onValueChange={(value) => 
                  setNotificationSettings(prev => ({...prev, appointments: value}))
                }
                trackColor={{ false: theme.GRAY_LIGHT, true: theme.PRIMARY }}
                thumbColor={theme.WHITE}
              />
            }
          />
          
          <SettingItem
            title="Medication Reminders"
            description="Reminders to take your medications"
            icon="medical"
            showArrow={false}
            rightContent={
              <Switch
                value={notificationSettings.medicationReminders}
                onValueChange={(value) => 
                  setNotificationSettings(prev => ({...prev, medicationReminders: value}))
                }
                trackColor={{ false: theme.GRAY_LIGHT, true: theme.PRIMARY }}
                thumbColor={theme.WHITE}
              />
            }
          />
          
          <SettingItem
            title="Health Tips"
            description="Daily health tips and wellness advice"
            icon="heart"
            showArrow={false}
            rightContent={
              <Switch
                value={notificationSettings.healthTips}
                onValueChange={(value) => 
                  setNotificationSettings(prev => ({...prev, healthTips: value}))
                }
                trackColor={{ false: theme.GRAY_LIGHT, true: theme.PRIMARY }}
                thumbColor={theme.WHITE}
              />
            }
          />
          
          <SettingItem
            title="Emergency Alerts"
            description="Critical health and safety notifications"
            icon="warning"
            showArrow={false}
            rightContent={
              <Switch
                value={notificationSettings.emergency}
                onValueChange={(value) => 
                  setNotificationSettings(prev => ({...prev, emergency: value}))
                }
                trackColor={{ false: theme.GRAY_LIGHT, true: theme.PRIMARY }}
                thumbColor={theme.WHITE}
              />
            }
          />
        </Card>

        {/* Privacy & Security */}
        <SectionHeader title="Privacy & Security" />
        <Card style={[styles.section, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <SettingItem
            title="Share with Doctors"
            description="Allow doctors to access your health data"
            icon="people"
            showArrow={false}
            rightContent={
              <Switch
                value={privacySettings.shareWithDoctors}
                onValueChange={(value) => 
                  setPrivacySettings(prev => ({...prev, shareWithDoctors: value}))
                }
                trackColor={{ false: theme.GRAY_LIGHT, true: theme.PRIMARY }}
                thumbColor={theme.WHITE}
              />
            }
          />
          
          <SettingItem
            title="Biometric Authentication"
            description="Use fingerprint or face ID to unlock app"
            icon="finger-print"
            showArrow={false}
            rightContent={
              <Switch
                value={appSettings.biometricAuth}
                onValueChange={(value) => 
                  setAppSettings(prev => ({...prev, biometricAuth: value}))
                }
                trackColor={{ false: theme.GRAY_LIGHT, true: theme.PRIMARY }}
                thumbColor={theme.WHITE}
              />
            }
          />
          
          <SettingItem
            title="Privacy Policy"
            description="Read our privacy policy"
            icon="shield-checkmark"
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy will open in your browser.')}
          />
          
          <SettingItem
            title="Terms of Service"
            description="Read our terms of service"
            icon="document-text"
            onPress={() => Alert.alert('Terms of Service', 'Terms of service will open in your browser.')}
          />
        </Card>

        {/* App Settings */}
        <SectionHeader title="App Settings" />
        <Card style={[styles.section, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <SettingItem
            title="Dark Mode"
            description="Switch to dark theme"
            icon="moon"
            showArrow={false}
            rightContent={
              <Switch
                value={appSettings.darkMode}
                onValueChange={(value) => {
                  setAppSettings(prev => ({...prev, darkMode: value}));
                  toggleTheme();
                }}
                trackColor={{ false: theme.GRAY_LIGHT, true: theme.PRIMARY }}
                thumbColor={theme.WHITE}
              />
            }
          />
          
          <SettingItem
            title="Auto Sync"
            description="Automatically sync data with cloud"
            icon="cloud"
            showArrow={false}
            rightContent={
              <Switch
                value={appSettings.autoSync}
                onValueChange={(value) => 
                  setAppSettings(prev => ({...prev, autoSync: value}))
                }
                trackColor={{ false: theme.GRAY_LIGHT, true: theme.PRIMARY }}
                thumbColor={theme.WHITE}
              />
            }
          />
          
          <SettingItem
            title="Language"
            description="English (US)"
            icon="language"
            onPress={() => Alert.alert('Language', 'Multiple languages will be supported soon.')}
          />
          
          <SettingItem
            title="Storage & Cache"
            description="Manage app storage"
            icon="archive"
            onPress={() => Alert.alert('Storage', 'Storage management tools coming soon.')}
          />
        </Card>

        {/* Support */}
        <SectionHeader title="Support & Help" />
        <Card style={[styles.section, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <SettingItem
            title="Help Center"
            description="Get help and find answers"
            icon="help-circle"
            onPress={() => Alert.alert('Help Center', 'Help center will be available soon.')}
          />
          
          <SettingItem
            title="Contact Support"
            description="Get in touch with our support team"
            icon="chatbubble"
            onPress={() => Alert.alert('Contact Support', 'Support chat will be available soon.')}
          />
          
          <SettingItem
            title="Send Feedback"
            description="Share your thoughts and suggestions"
            icon="star"
            onPress={() => Alert.alert('Feedback', 'Feedback form will be available soon.')}
          />
          
          <SettingItem
            title="About App"
            description="Version 1.0.0"
            icon="information-circle"
            onPress={() => Alert.alert('LifeLine+', 'Version 1.0.0\n\nA comprehensive healthcare management app.')}
          />
        </Card>

        {/* Data Management */}
        <SectionHeader title="Data Management" />
        <Card style={[styles.section, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <SettingItem
            title="Export My Data"
            description="Download a copy of your health data"
            icon="download"
            onPress={handleExportData}
          />
          
          <SettingItem
            title="Sync Now"
            description="Manually sync your data"
            icon="refresh"
            onPress={() => Alert.alert('Sync Complete', 'Your data has been synchronized.')}
          />
        </Card>

        {/* Danger Zone */}
        <SectionHeader title="Account" />
        <Card style={[styles.dangerSection, { borderColor: theme.ERROR, backgroundColor: theme.CARD_BACKGROUND }]}>
          <TouchableOpacity style={styles.dangerItem} onPress={handleLogout}>
            <View style={styles.dangerLeft}>
              <Ionicons name="log-out" size={20} color={theme.ERROR} />
              <Text style={[styles.dangerText, { color: theme.ERROR }]}>Logout</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.ERROR} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
            <View style={styles.dangerLeft}>
              <Ionicons name="trash" size={20} color={theme.ERROR} />
              <Text style={[styles.dangerText, { color: theme.ERROR }]}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.ERROR} />
          </TouchableOpacity>
        </Card>
      </ScrollView>
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
  profileSection: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  profileEmail: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  profileRole: {
    fontSize: FONT_SIZES.SM,
    color: theme.PRIMARY,
    fontWeight: '600',
  },
  editButton: {
    padding: SPACING.SM,
  },
  sectionHeader: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    color: theme.TEXT_SECONDARY,
    marginTop: SPACING.LG,
    marginBottom: SPACING.SM,
    marginLeft: SPACING.XS,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: SPACING.SM,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.GRAY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  settingDescription: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dangerSection: {
    borderColor: theme.ERROR,
    borderWidth: 1,
    marginBottom: SPACING.XL,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: theme.ERROR + '20',
  },
  dangerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dangerText: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.ERROR,
    marginLeft: SPACING.MD,
  },
});

export default SettingsScreen;