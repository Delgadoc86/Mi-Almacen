import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';
import type { IconName } from './types';

type Props = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoFocus?: boolean;
  editable?: boolean;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export const TextField = forwardRef<TextInput, Props>(function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  secureTextEntry,
  keyboardType,
  multiline,
  autoCapitalize = 'sentences',
  autoFocus,
  editable = true,
  rightIcon,
  onRightIconPress,
  returnKeyType,
  onSubmitEditing,
  containerStyle,
}, ref) {
  const [obscured, setObscured] = useState(secureTextEntry);
  const isPasswordField = secureTextEntry === true;

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          error ? styles.inputWrapError : null,
          !editable && styles.inputWrapDisabled,
        ]}
      >
        <TextInput
          ref={ref}
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.muted}
          secureTextEntry={obscured}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          autoFocus={autoFocus}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCorrect={false}
        />
        {isPasswordField ? (
          <TouchableOpacity
            onPress={() => setObscured((prev) => !prev)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={obscured ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={theme.colors.muted}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name={rightIcon} size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 13,
    gap: 8,
  },
  inputWrapError: {
    borderColor: theme.colors.error,
  },
  inputWrapDisabled: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.divider,
  },
  input: {
    flex: 1,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.bodyLg,
    color: theme.colors.text,
    padding: 0,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: 6,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.error,
  },
  helperText: {
    marginTop: 6,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
});
