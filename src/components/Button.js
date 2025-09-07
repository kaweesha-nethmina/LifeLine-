import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  View 
} from 'react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants';

const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  loading = false,
  icon,
  style,
  textStyle,
  ...props 
}) => {
  const getButtonStyles = () => {
    const baseStyle = [styles.button, styles[size]];
    
    if (variant === 'primary') {
      baseStyle.push(styles.primary);
    } else if (variant === 'secondary') {
      baseStyle.push(styles.secondary);
    } else if (variant === 'outline') {
      baseStyle.push(styles.outline);
    } else if (variant === 'emergency') {
      baseStyle.push(styles.emergency);
    } else if (variant === 'success') {
      baseStyle.push(styles.success);
    } else if (variant === 'danger') {
      baseStyle.push(styles.danger);
    }
    
    if (disabled) {
      baseStyle.push(styles.disabled);
    }
    
    return baseStyle;
  };

  const getTextStyles = () => {
    const baseStyle = [styles.text, styles[`${size}Text`]];
    
    if (variant === 'primary' || variant === 'emergency' || variant === 'success' || variant === 'danger') {
      baseStyle.push(styles.whiteText);
    } else if (variant === 'secondary') {
      baseStyle.push(styles.whiteText);
    } else if (variant === 'outline') {
      baseStyle.push(styles.primaryText);
    }
    
    if (disabled) {
      baseStyle.push(styles.disabledText);
    }
    
    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? COLORS.PRIMARY : COLORS.WHITE} 
          size="small" 
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[getTextStyles(), textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: SPACING.SM,
  },
  
  // Sizes
  small: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    minHeight: 48,
  },
  large: {
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.LG,
    minHeight: 56,
  },
  
  // Variants
  primary: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondary: {
    backgroundColor: COLORS.SECONDARY,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  emergency: {
    backgroundColor: COLORS.EMERGENCY,
  },
  success: {
    backgroundColor: COLORS.SUCCESS,
  },
  danger: {
    backgroundColor: COLORS.ERROR,
  },
  disabled: {
    backgroundColor: COLORS.GRAY_MEDIUM,
    borderColor: COLORS.GRAY_MEDIUM,
  },
  
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: FONT_SIZES.SM,
  },
  mediumText: {
    fontSize: FONT_SIZES.MD,
  },
  largeText: {
    fontSize: FONT_SIZES.LG,
  },
  whiteText: {
    color: COLORS.WHITE,
  },
  primaryText: {
    color: COLORS.PRIMARY,
  },
  disabledText: {
    color: COLORS.WHITE,
    opacity: 0.7,
  },
});

export default Button;