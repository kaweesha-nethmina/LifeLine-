import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

const LoginScreen = ({ navigation }) => {
  const { login, loading, error, clearError } = useAuth();
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
    
    // Clear global error
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    const errors = {};

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    const result = await login(formData.email, formData.password);
    
    if (!result.success) {
      Alert.alert('Login Failed', result.error);
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
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../assets/lifeline_logo2.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.title, { color: theme.TEXT_PRIMARY }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>
                Sign in to access your LifeLine+ account
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                error={formErrors.email}
                leftIcon={
                  <Ionicons name="mail-outline" size={20} color={theme.GRAY_MEDIUM} />
                }
                inputStyle={{ 
                  backgroundColor: theme.CARD_BACKGROUND, 
                  color: theme.TEXT_PRIMARY,
                  borderColor: theme.BORDER
                }}
                labelStyle={{ color: theme.TEXT_PRIMARY }}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry
                error={formErrors.password}
                leftIcon={
                  <Ionicons name="lock-closed-outline" size={20} color={theme.GRAY_MEDIUM} />
                }
                inputStyle={{ 
                  backgroundColor: theme.CARD_BACKGROUND, 
                  color: theme.TEXT_PRIMARY,
                  borderColor: theme.BORDER
                }}
                labelStyle={{ color: theme.TEXT_PRIMARY }}
              />

              <Button
                title="Forgot Password?"
                onPress={() => navigation.navigate('ForgotPassword')}
                variant="outline"
                size="small"
                style={styles.forgotPasswordButton}
                textStyle={{ color: theme.PRIMARY, fontSize: FONT_SIZES.SM }}
              />

              {error && (
                <View style={[styles.errorContainer, { backgroundColor: theme.ERROR + '20' }]}>
                  <Ionicons name="alert-circle" size={20} color={theme.ERROR} />
                  <Text style={[styles.errorText, { color: theme.ERROR }]}>{error}</Text>
                </View>
              )}

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                size="large"
                style={styles.loginButton}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.TEXT_SECONDARY }]}>
                Don't have an account?{' '}
              </Text>
              <Button
                title="Sign Up"
                onPress={() => navigation.navigate('RoleSelection')}
                variant="outline"
                size="small"
                style={styles.signUpButton}
                textStyle={{ color: theme.PRIMARY }}
              />
            </View>

            {/* Emergency Access */}
            <View style={[styles.emergencyContainer, { borderTopColor: theme.BORDER }]}>
              <Text style={[styles.emergencyTitle, { color: theme.TEXT_PRIMARY }]}>Emergency Access</Text>
              <Text style={[styles.emergencyText, { color: theme.TEXT_SECONDARY }]}>
                In case of emergency, you can access basic features without logging in
              </Text>
              <Button
                title="Emergency Mode"
                onPress={() => {
                  // Handle emergency mode navigation
                  Alert.alert(
                    'Emergency Mode',
                    'This would provide basic emergency features without login',
                    [{ text: 'OK' }]
                  );
                }}
                variant="emergency"
                size="medium"
                style={styles.emergencyButton}
                icon={<Ionicons name="warning" size={20} color={theme.WHITE} />}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
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
  logoContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: SPACING.XL,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    marginBottom: SPACING.LG,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ERROR + '20',
    padding: SPACING.MD,
    borderRadius: 8,
    marginBottom: SPACING.LG,
  },
  errorText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.ERROR,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  loginButton: {
    marginBottom: SPACING.MD,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.XL,
  },
  footerText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  signUpButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: 'auto',
  },
  emergencyContainer: {
    alignItems: 'center',
    paddingTop: SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  emergencyTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  emergencyText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.MD,
    lineHeight: 20,
  },
  emergencyButton: {
    width: '100%',
  },
});

export default LoginScreen;