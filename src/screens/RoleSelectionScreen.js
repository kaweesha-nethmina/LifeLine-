import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/Button';
import Card from '../components/Card';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, USER_ROLES } from '../constants';

const RoleSelectionScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [selectedRole, setSelectedRole] = useState(null);

  const roles = [
    {
      id: USER_ROLES.PATIENT,
      title: 'Patient',
      description: 'Get medical consultations, emergency help, and manage your health records',
      icon: 'person',
      features: [
        'Book appointments with doctors',
        'Access to emergency SOS button',
        'Store and manage health records',
        'Video/audio consultations',
        'Medicine reminders'
      ]
    },
    {
      id: USER_ROLES.DOCTOR,
      title: 'Doctor',
      description: 'Provide consultations, view patient records, and offer medical assistance',
      icon: 'medical',
      features: [
        'Manage appointment schedules',
        'Conduct video consultations',
        'Access patient medical history',
        'Prescribe medicines digitally',
        'Emergency consultation requests'
      ]
    },
    {
      id: USER_ROLES.EMERGENCY_OPERATOR,
      title: 'Emergency Operator',
      description: 'Handle emergency requests and coordinate ambulance services',
      icon: 'call',
      features: [
        'Receive SOS emergency alerts',
        'Coordinate ambulance dispatch',
        'Track emergency response times',
        'Communicate with patients',
        'Manage emergency resources'
      ]
    }
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
  };

  const handleContinue = () => {
    if (selectedRole) {
      navigation.navigate('Register', { role: selectedRole });
    }
  };

  const renderRoleCard = (role) => (
    <TouchableOpacity
      key={role.id}
      onPress={() => handleRoleSelect(role.id)}
      style={styles.roleCardContainer}
    >
      <Card
        style={[
          styles.roleCard,
          selectedRole === role.id && styles.selectedRoleCard,
          { 
            backgroundColor: selectedRole === role.id ? theme.PRIMARY + '10' : theme.CARD_BACKGROUND,
            borderColor: selectedRole === role.id ? theme.PRIMARY : theme.BORDER
          }
        ]}
      >
        <View style={styles.roleHeader}>
          <View style={[
            styles.roleIconContainer,
            selectedRole === role.id && styles.selectedRoleIconContainer,
            { 
              backgroundColor: selectedRole === role.id ? theme.PRIMARY : theme.PRIMARY + '20'
            }
          ]}>
            <Ionicons 
              name={role.icon} 
              size={32} 
              color={selectedRole === role.id ? theme.WHITE : theme.PRIMARY} 
            />
          </View>
          <View style={styles.roleTitleContainer}>
            <Text style={[
              styles.roleTitle,
              selectedRole === role.id && styles.selectedRoleTitle,
              { 
                color: selectedRole === role.id ? theme.PRIMARY : theme.TEXT_PRIMARY
              }
            ]}>
              {role.title}
            </Text>
            <Text style={[styles.roleDescription, { color: theme.TEXT_SECONDARY }]}>
              {role.description}
            </Text>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={[styles.featuresHeader, { color: theme.TEXT_PRIMARY }]}>Key Features:</Text>
          {role.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons 
                name="checkmark-circle" 
                size={16} 
                color={theme.SUCCESS} 
              />
              <Text style={[styles.featureText, { color: theme.TEXT_SECONDARY }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {selectedRole === role.id && (
          <View style={[styles.selectedIndicator, { borderTopColor: theme.BORDER }]}>
            <Ionicons name="checkmark-circle" size={24} color={theme.PRIMARY} />
            <Text style={[styles.selectedText, { color: theme.PRIMARY }]}>Selected</Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.TEXT_PRIMARY }]}>Choose Your Role</Text>
            <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>
              Select how you'll be using LifeLine+ to get personalized features
            </Text>
          </View>

          <View style={styles.rolesContainer}>
            {roles.map(renderRoleCard)}
          </View>

          <View style={styles.actionContainer}>
            <Button
              title="Continue"
              onPress={handleContinue}
              disabled={!selectedRole}
              size="large"
              style={styles.continueButton}
            />
            
            <Button
              title="Already have an account? Sign In"
              onPress={() => navigation.navigate('Login')}
              variant="outline"
              size="medium"
              style={styles.signInButton}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.LG,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.XL,
  },
  title: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },
  rolesContainer: {
    marginBottom: SPACING.XL,
  },
  roleCardContainer: {
    marginBottom: SPACING.LG,
  },
  roleCard: {
    borderWidth: 2,
    borderColor: theme.BORDER,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  selectedRoleCard: {
    borderColor: theme.PRIMARY,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  roleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  selectedRoleIconContainer: {
    backgroundColor: theme.PRIMARY,
  },
  roleTitleContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  selectedRoleTitle: {
    color: theme.PRIMARY,
  },
  roleDescription: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    lineHeight: 20,
  },
  featuresContainer: {
    marginTop: SPACING.SM,
  },
  featuresHeader: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  featureText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: theme.BORDER,
  },
  selectedText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: theme.PRIMARY,
    marginLeft: SPACING.SM,
  },
  actionContainer: {
    marginTop: SPACING.LG,
  },
  continueButton: {
    marginBottom: SPACING.MD,
  },
  signInButton: {
    backgroundColor: 'transparent',
  },
});

export default RoleSelectionScreen;