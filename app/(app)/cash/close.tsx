import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCashSession } from '@/hooks/useCashSession';
import { useWriteGuard } from '@/hooks/useWriteGuard';
import { closeCashSession } from '@/services/cash';
import { theme } from '@/theme';
import { AmountDisplay, Button, Card, InlineMessage } from '@/components/ui';
import { PlanRestrictionDialog } from '@/components/PlanRestrictionDialog';

function formatARS(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('es-AR');
}

function SummaryRow({ label, value, bold, danger, success }: {
  label: string;
  value: string;
  bold?: boolean;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text style={[
        styles.rowValue,
        bold && styles.rowValueBold,
        danger && styles.textDanger,
        success && styles.textSuccess,
      ]}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function CloseCashScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { session } = useCashSession();
  const { requireWrite, restrictionMessage, dismissRestriction } = useWriteGuard();
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    if (!userProfile?.businessId || !session?.id) return;
    setClosing(true);
    setError('');
    try {
      await closeCashSession(userProfile.businessId, session.id);
      router.back();
    } catch {
      setError('No se pudo cerrar la caja. Intentá de nuevo.');
    } finally {
      setClosing(false);
    }
  }

  if (!session || session.status !== 'open') {
    return (
      <View style={styles.centerFallback}>
        <Text style={styles.fallbackText}>No hay una caja abierta.</Text>
      </View>
    );
  }

  const { summary, openingBalance } = session;
  const efectivoEnCajon = openingBalance + summary.efectivo - summary.totalEgresos;
  const saldoTotal = openingBalance + summary.totalIngresos - summary.totalEgresos;
  const hasOtros = summary.otro > 0;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.card} variant="elevated">
        <SummaryRow label="Saldo inicial" value={formatARS(openingBalance)} />

        <Divider />
        <Text style={styles.sectionTitle}>INGRESOS</Text>
        <SummaryRow label="Efectivo" value={formatARS(summary.efectivo)} />
        <SummaryRow label="Mercado Pago" value={formatARS(summary.mercadoPago)} />
        <SummaryRow label="Transferencia" value={formatARS(summary.transferencia)} />
        {hasOtros && <SummaryRow label="Otros medios" value={formatARS(summary.otro)} />}
        <SummaryRow label="Total ingresos" value={formatARS(summary.totalIngresos)} bold />

        <Divider />
        <Text style={styles.sectionTitle}>EGRESOS</Text>
        <SummaryRow
          label="Total gastos"
          value={formatARS(summary.totalEgresos)}
          bold
          danger={summary.totalEgresos > 0}
        />

        <Divider />
        <View style={styles.cajonBlock}>
          <Text style={styles.cajonLabel}>Efectivo en cajón</Text>
          <AmountDisplay value={efectivoEnCajon} size="lg" tone={efectivoEnCajon < 0 ? 'danger' : 'success'} />
          <Text style={styles.cajonNote}>
            (saldo inicial + efectivo cobrado − gastos)
          </Text>
        </View>

        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Saldo final</Text>
          <Text style={[styles.totalValue, saldoTotal < 0 && styles.textDanger]}>
            {formatARS(saldoTotal)}
          </Text>
        </View>
      </Card>

      <Text style={styles.movCount}>
        {summary.movementsCount} {summary.movementsCount === 1 ? 'movimiento' : 'movimientos'} registrados
      </Text>

      {error ? <InlineMessage variant="error" text={error} style={styles.errorBox} /> : null}

      <Button
        label="CONFIRMAR CIERRE"
        icon="lock-closed"
        onPress={() => requireWrite(handleConfirm)}
        loading={closing}
        style={styles.confirmBtn}
      />

      <Text style={styles.closeNote}>
        Los datos quedan guardados. Si cerrás por error, podés reabrir la caja.
      </Text>
      <PlanRestrictionDialog message={restrictionMessage} onDismiss={dismissRestriction} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: 48,
  },
  centerFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  fallbackText: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.bodyLg,
    color: theme.colors.textSecondary,
  },
  card: {
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLabel: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  rowLabelBold: { fontFamily: theme.fontFamily.bold, color: theme.colors.text },
  rowValue: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.body,
    color: theme.colors.text,
  },
  rowValueBold: { fontFamily: theme.fontFamily.extrabold, fontSize: theme.font.bodyLg },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 10,
  },
  cajonBlock: {
    backgroundColor: theme.colors.successLight,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  cajonLabel: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.caption,
    color: theme.colors.success,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  cajonNote: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  totalBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  totalLabel: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  totalValue: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h3,
    color: theme.colors.text,
  },
  movCount: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  errorBox: {
    marginBottom: theme.spacing.lg,
  },
  confirmBtn: {
    marginBottom: theme.spacing.lg,
  },
  closeNote: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  textDanger: { color: theme.colors.error },
  textSuccess: { color: theme.colors.success },
});
