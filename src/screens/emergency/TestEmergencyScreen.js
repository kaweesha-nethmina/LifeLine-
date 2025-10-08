import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';
import { useTheme } from '../../context/ThemeContext';

const TestEmergencyScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Test Screen</Text>
      <Text style={styles.subtitle}>This is a test component to verify navigation</Text>
    </View>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.BACKGROUND,
  },
  title: {
    fontSize: FONT_SIZES.XXL,
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

export default TestEmergencyScreen;