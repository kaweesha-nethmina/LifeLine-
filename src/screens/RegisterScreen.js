import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT_SIZES, SPACING, USER_ROLES } from '../constants';

const RegisterScreen = ({ route, navigation }) => {
  const { role } = route.params || { role: USER_ROLES.PATIENT };
  const { register, loading, error, clearError } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
    
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    const userData = {
      ...formData,
      role
    };

    const result = await register(formData.email, formData.password, userData);
    
    if (!result.success) {
      Alert.alert('Registration Failed', result.error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.TEXT_PRIMARY }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>
                Join LifeLine+ as a {role.replace('_', ' ')}
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="First Name"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                error={formErrors.firstName}
              />

              <Input
                label="Last Name"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                error={formErrors.lastName}
              />

              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                error={formErrors.email}
              />

              <Input
                label="Phone Number"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
                error={formErrors.phone}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry
                error={formErrors.password}
              />

              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry
                error={formErrors.confirmPassword}
              />

              {error && (
                <View style={[styles.errorContainer, { backgroundColor: theme.ERROR + '20' }]}>
                  <Ionicons name="alert-circle" size={20} color={theme.ERROR} />
                  <Text style={[styles.errorText, { color: theme.ERROR }]}>{error}</Text>
                </View>
              )}

              <Button
                title="Create Account"
                onPress={handleRegister}
                loading={loading}
                disabled={loading}
                size="large"
                style={styles.registerButton}
              />
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.TEXT_SECONDARY }]}>
                Already have an account?{' '}
              </Text>
              <Button
                title="Sign In"
                onPress={() => navigation.navigate('Login')}
                variant="outline"
                size="small"
                style={styles.signInButton}
                textStyle={{ color: theme.PRIMARY }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  keyboardView: {
    flex: 1,
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
  form: {
    marginBottom: SPACING.XL,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.ERROR + '20',
    padding: SPACING.MD,
    borderRadius: 8,
    marginBottom: SPACING.LG,
  },
  errorText: {
    fontSize: FONT_SIZES.SM,
    color: theme.ERROR,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  registerButton: {
    marginBottom: SPACING.MD,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  signInButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: 'auto',
  },
});

export default RegisterScreen;