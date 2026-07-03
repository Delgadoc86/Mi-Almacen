import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
      <Text style={styles.text}>Sin conexión — los cambios se guardarán al reconectar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: theme.colors.offline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.lg,
  },
  text: {
    color: '#fff',
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.micro,
    flexShrink: 1,
  },
});
