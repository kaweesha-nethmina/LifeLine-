import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants';

const Card = ({ 
  children, 
  style, 
  onPress, 
  variant = 'default',
  shadow = true,
  ...props 
}) => {
  const getCardStyles = () => {
    const baseStyle = [styles.card];
    
    if (variant === 'primary') {
      baseStyle.push(styles.primary);
    } else if (variant === 'emergency') {
      baseStyle.push(styles.emergency);
    } else if (variant === 'success') {
      baseStyle.push(styles.success);
    }
    
    if (shadow) {
      baseStyle.push(styles.shadow);
    }
    
    return baseStyle;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[getCardStyles(), style]}
        onPress={onPress}
        activeOpacity={0.8}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[getCardStyles(), style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    marginVertical: SPACING.SM,
  },
  primary: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
  },
  emergency: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.EMERGENCY,
  },
  success: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.SUCCESS,
  },
  shadow: {
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default Card;