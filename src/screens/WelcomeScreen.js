import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  StatusBar,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants';

const WelcomeScreen = ({ navigation }) => {
  return (
    <>
      {/* <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} /> */}
      
      <LinearGradient
        colors={[COLORS.PRIMARY, COLORS.PRIMARYB]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/lifeline_logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Features Section */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>
              Emergency Healthcare at Your Fingertips
            </Text>
            
            <View style={styles.featuresList}>
              <View style={styles.feature}>
                <Ionicons name="call" size={24} color={COLORS.WHITE} />
                <Text style={styles.featureText}>24/7 Emergency Support</Text>
              </View>
              
              <View style={styles.feature}>
                <Ionicons name="videocam" size={24} color={COLORS.WHITE} />
                <Text style={styles.featureText}>Video Consultations</Text>
              </View>
              
              <View style={styles.feature}>
                <Ionicons name="location" size={24} color={COLORS.WHITE} />
                <Text style={styles.featureText}>GPS Emergency Location</Text>
              </View>
              
              <View style={styles.feature}>
                <Ionicons name="folder" size={24} color={COLORS.WHITE} />
                <Text style={styles.featureText}>Digital Health Records</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <Button
              title="Get Started"
              onPress={() => navigation.navigate('RoleSelection')}
              variant="outline"
              size="large"
              style={styles.getStartedButton}
              textStyle={{ color: COLORS.WHITE }}
            />
            
            <Button
              title="Already have an account? Sign In"
              onPress={() => navigation.navigate('Login')}
              variant="outline"
              size="medium"
              style={[styles.signInButton, { borderColor: 'transparent' }]}
              textStyle={{ color: COLORS.WHITE, fontWeight: '400' }}
            />
          </View>
        </View>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.XL,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.XXL,
  },
  logoContainer: {
    width: 250,
    height: 250,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.13)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  logo: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: FONT_SIZES.XXXL + 8,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: SPACING.SM,
  },
  subtitle: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.WHITE,
    textAlign: 'center',
    opacity: 0.9,
  },
  featuresContainer: {
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: '600',
    color: COLORS.WHITE,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  featuresList: {
    width: '100%',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },
  featureText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.WHITE,
    marginLeft: SPACING.MD,
    opacity: 0.9,
  },
  actionContainer: {
    width: '100%',
  },
  getStartedButton: {
    borderColor: COLORS.WHITE,
    borderWidth: 2,
    marginBottom: SPACING.MD,
  },
  signInButton: {
    backgroundColor: 'transparent',
  },
});

export default WelcomeScreen;