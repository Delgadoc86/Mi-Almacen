import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';
import { Button, IconChip } from '@/components/ui';

// Se muestra cuando accountInconsistent es true (ver AuthContext): existe
// exactamente uno de los dos documentos users/businesses para este uid.
// A propósito NO intenta autorepararse creando datos nuevos — ver
// repairIncompleteRegistration en src/services/userProfile.ts.
export default function AccountIssueScreen() {
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.content}>
        <IconChip icon="alert-circle-outline" tone="danger" size="xl" />
        <Text style={styles.title}>No pudimos cargar tu negocio</Text>
        <Text style={styles.desc}>
          Tu cuenta tiene un problema que no podemos resolver automáticamente para
          proteger tus datos. Contactá a soporte para que lo revisemos.
        </Text>
        <Button
          label="Cerrar sesión"
          variant="outline"
          icon="log-out-outline"
          onPress={logout}
          style={styles.logoutBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
  },
  title: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h1,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  desc: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  logoutBtn: { marginTop: theme.spacing.xxl, minWidth: 200 },
});
