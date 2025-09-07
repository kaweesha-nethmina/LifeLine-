import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRestart = () => {
    // Attempt to reset the error state
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Check if it's a native module error
      const isNativeModuleError = this.state.error?.message?.includes('native module') || 
                                 this.state.error?.message?.includes('Invariant Violation');

      if (isNativeModuleError) {
        return (
          <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.title}>Native Module Error</Text>
              <Text style={styles.message}>
                This error occurs because you're using Expo Go with native modules that aren't supported.
              </Text>
              
              <View style={styles.solutionBox}>
                <Text style={styles.solutionTitle}>Solution:</Text>
                <Text style={styles.solutionText}>
                  1. Create a development build:{'\n'}
                  {'   '}npx expo run:ios{'\n'}
                  {'   '}or{'\n'}
                  {'   '}npx expo run:android{'\n\n'}
                  2. Install the build on your device{'\n\n'}
                  3. Run the installed app instead of using Expo Go
                </Text>
              </View>
              
              <Text style={styles.detailsTitle}>Error Details:</Text>
              <View style={styles.errorDetails}>
                <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
              </View>
              
              <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        );
      }

      // For other errors, show a generic error message
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              An unexpected error occurred in the application.
            </Text>
            
            <Text style={styles.detailsTitle}>Error Details:</Text>
            <View style={styles.errorDetails}>
              <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
            </View>
            
            <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  content: {
    padding: SPACING.LG,
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.ERROR,
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  solutionBox: {
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    padding: SPACING.MD,
    borderRadius: 8,
    marginBottom: SPACING.LG,
    width: '100%',
  },
  solutionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: SPACING.SM,
  },
  solutionText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  detailsTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
    alignSelf: 'flex-start',
  },
  errorDetails: {
    backgroundColor: COLORS.GRAY_LIGHT,
    padding: SPACING.MD,
    borderRadius: 8,
    marginBottom: SPACING.LG,
    width: '100%',
  },
  errorText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.WHITE,
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;