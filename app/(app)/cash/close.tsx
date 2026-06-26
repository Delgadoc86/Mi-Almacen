import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { useCashSession } from '@/hooks/useCashSession';
import { closeCashSession } from '@/services/cash';
import { theme } from '@/theme';
import type { CashSession } from '@/models';

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
      {/* Resumen */}
      <View style={styles.card}>
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
          <Text style={[styles.cajonValue, efectivoEnCajon < 0 && styles.textDanger]}>
            {formatARS(efectivoEnCajon)}
          </Text>
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
      </View>

      <Text style={styles.movCount}>
        {summary.movementsCount} {summary.movementsCount === 1 ? 'movimiento' : 'movimientos'} registrados
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={15} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.confirmBtn, closing && styles.btnDisabled]}
        onPress={handleConfirm}
        disabled={closing}
        activeOpacity={0.85}
      >
        {closing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="lock-closed" size={20} color="#fff" />
            <Text style={styles.confirmBtnText}>CONFIRMAR CIERRE</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.closeNote}>
        Los datos quedan guardados. Si cerrás por error, podés reabrir la caja.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
  centerFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  fallbackText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  rowLabelBold: { fontWeight: '700', color: theme.colors.text },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  rowValueBold: { fontSize: 15, fontWeight: '800' },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 10,
  },
  cajonBlock: {
    backgroundColor: theme.colors.successLight,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  cajonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.success,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  cajonValue: {
    fontSize: 40,
    fontWeight: '800',
    color: theme.colors.success,
    letterSpacing: -1,
  },
  cajonNote: {
    fontSize: 11,
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
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  movCount: {
    fontSize: 13,
    color: theme.colors.muted,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1,
    borderColor: theme.colors.dangerMid,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: '500',
    lineHeight: 18,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    minHeight: 56,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnDisabled: { opacity: 0.4, shadowOpacity: 0, elevation: 0 },
  closeNote: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  textDanger: { color: theme.colors.error },
  textSuccess: { color: theme.colors.success },
});
