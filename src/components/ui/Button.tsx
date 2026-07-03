import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';
import type { IconName } from './types';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  large?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

const CONTAINER_BY_VARIANT: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: theme.colors.primary,
    minHeight: 52,
    paddingVertical: 14,
    ...theme.shadow.lg,
  },
  outline: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    minHeight: 52,
    paddingVertical: 14,
  },
  danger: {
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1.5,
    borderColor: theme.colors.dangerMid,
    minHeight: 52,
    paddingVertical: 14,
  },
  ghost: {
    backgroundColor: 'transparent',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
};

const TEXT_COLOR_BY_VARIANT: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  outline: theme.colors.primary,
  danger: theme.colors.error,
  ghost: theme.colors.primary,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  large = false,
  loading = false,
  disabled = false,
  icon,
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;
  const textColor = TEXT_COLOR_BY_VARIANT[variant];

  const animateTo = (toValue: number) => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        disabled={isDisabled}
        style={[
          styles.base,
          CONTAINER_BY_VARIANT[variant],
          large && styles.large,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <View style={styles.content}>
            {icon ? <Ionicons name={icon} size={20} color={textColor} /> : null}
            <Text style={[styles.label, { color: textColor }]}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
  },
  large: {
    minHeight: 56,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.bodyLg,
  },
  disabled: {
    opacity: 0.5,
  },
});
