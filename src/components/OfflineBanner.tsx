import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

// Estado principal, no un toast: mientras no hay señal, el comerciante tiene
// que enterarse enseguida de que puede seguir consultando pero no registrar
// nada — sin sugerir que los cambios "quedan pendientes" (no existe ninguna
// cola offline hoy). Sin botón de cerrar a propósito: tiene que seguir
// visible mientras dure el corte, no es descartable por el usuario.
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={20} color={theme.colors.warning} />
      <View style={styles.textCol}>
        <Text style={styles.title}>Sin conexión · Solo lectura</Text>
        <Text style={styles.subtitle}>
          Podés consultar los datos que ya están cargados. Conectate a Internet para registrar o modificar información.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.warningLight,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.warningBorder,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.lg,
  },
  textCol: {
    flex: 1,
  },
  title: {
    color: theme.colors.warning,
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.caption,
    marginBottom: 2,
  },
  subtitle: {
    color: theme.colors.warning,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.micro,
    lineHeight: 15,
  },
});
