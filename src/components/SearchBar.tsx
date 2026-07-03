import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChangeText, placeholder = 'Buscar...' }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={18} color={theme.colors.muted} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.input,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  icon: {
    marginRight: 9,
  },
  input: {
    flex: 1,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.text,
    padding: 0,
  },
});
