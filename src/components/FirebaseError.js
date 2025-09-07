import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import Card from './Card';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

const FirebaseError = ({ error, onRetry }) => {
  const handleOpenFirebaseConsole = () => {
    Linking.openURL('https://console.firebase.google.com/project/lifelineplus-b7c27');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Error Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={80} color={COLORS.ERROR} />
          </View>

          {/* Error Title */}
          <Text style={styles.title}>Firebase Setup Required</Text>
          <Text style={styles.subtitle}>
            Your LifeLine+ app needs Firebase services to be enabled
          </Text>

          {/* Error Details */}
          <Card variant="emergency" style={styles.errorCard}>
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle" size={24} color={COLORS.ERROR} />
              <View style={styles.errorText}>
                <Text style={styles.errorTitle}>Configuration Error</Text>
                <Text style={styles.errorDescription}>
                  {error || 'Firebase Authentication service is not enabled'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Setup Instructions */}
          <Card style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Quick Setup Steps:</Text>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Open Firebase Console for your project: lifelineplus-b7c27
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Go to <Text style={styles.bold}>Authentication</Text> → Click <Text style={styles.bold}>"Get Started"</Text>
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Click <Text style={styles.bold}>"Sign-in method"</Text> tab → Enable <Text style={styles.bold}>"Email/Password"</Text>
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>
                Go to <Text style={styles.bold}>Firestore Database</Text> → <Text style={styles.bold}>"Create database"</Text> → <Text style={styles.bold}>"Start in test mode"</Text>
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <Text style={styles.stepText}>
                Return to your app and click <Text style={styles.bold}>"Try Again"</Text>
              </Text>
            </View>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <Button
              title="Open Firebase Console"
              onPress={handleOpenFirebaseConsole}
              variant="primary"
              size="large"
              style={styles.primaryButton}
              icon={<Ionicons name="open" size={20} color={COLORS.WHITE} />}
            />
            
            <Button
              title="Try Again"
              onPress={onRetry}
              variant="outline"
              size="large"
              style={styles.retryButton}
              icon={<Ionicons name="refresh" size={20} color={COLORS.PRIMARY} />}
            />
          </View>

          {/* Help Section */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              Your Firebase project ID: <Text style={styles.projectId}>lifelineplus-b7c27</Text>
            </Text>
            <Text style={styles.helpText}>
              Make sure Authentication and Firestore services are enabled in your Firebase console.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.XL,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.LG,
  },
  title: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.XL,
    lineHeight: 22,
  },
  errorCard: {
    width: '100%',
    marginBottom: SPACING.LG,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  errorTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  errorDescription: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  instructionsCard: {
    width: '100%',
    marginBottom: SPACING.XL,
  },
  instructionsTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  stepNumberText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  stepText: {
    flex: 1,
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  actionContainer: {
    width: '100%',
    marginBottom: SPACING.XL,
  },
  primaryButton: {
    marginBottom: SPACING.MD,
  },
  retryButton: {
    backgroundColor: 'transparent',
  },
  helpContainer: {
    width: '100%',
    paddingTop: SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  helpTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  helpText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: SPACING.SM,
  },
  projectId: {
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  bold: {
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
});

export default FirebaseError;