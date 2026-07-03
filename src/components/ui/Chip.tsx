import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';
import type { IconName } from './types';

type Props = {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, active = false, onPress, icon, style }: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, active && styles.active, style]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={15}
          color={active ? '#FFFFFF' : theme.colors.textSecondary}
          style={styles.icon}
        />
      ) : null}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: theme.radius.chip,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
  },
  active: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  labelActive: {
    color: '#FFFFFF',
    fontFamily: theme.fontFamily.bold,
  },
});
