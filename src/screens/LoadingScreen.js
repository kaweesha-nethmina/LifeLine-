import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../constants';
import { useTheme } from '../context/ThemeContext';

const LoadingScreen = ({ message = 'Loading...' }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.PRIMARY} />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    marginTop: SPACING.MD,
    fontWeight: '500',
  },
});

export default LoadingScreen;