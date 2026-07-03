import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';

type Props = {
  visible: boolean;
  message: string;
  onHide: () => void;
  duration?: number;
  variant?: 'success' | 'error';
};

export function Toast({ visible, message, onHide, duration = 2200, variant = 'success' }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        onHide();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, onHide, opacity, translateY]);

  if (!visible) return null;

  const isError = variant === 'error';

  return (
    <Animated.View
      style={[
        styles.base,
        { backgroundColor: isError ? theme.colors.error : theme.colors.text, opacity, transform: [{ translateY }] },
      ]}
    >
      <Ionicons
        name={isError ? 'alert-circle' : 'checkmark-circle'}
        size={18}
        color="#FFFFFF"
      />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    ...theme.shadow.md,
  },
  text: {
    flex: 1,
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.body,
    color: '#FFFFFF',
  },
});
