import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

const ForgotPasswordScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.TEXT_PRIMARY }]}>Forgot Password</Text>
        <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>This screen will be implemented</Text>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  title: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
  },
});

export default ForgotPasswordScreen;