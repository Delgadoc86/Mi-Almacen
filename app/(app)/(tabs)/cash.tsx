import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCashSession } from '@/hooks/useCashSession';
import { useCashMovements } from '@/hooks/useCashMovements';
import { useAuth } from '@/hooks/useAuth';
import { openCashSession } from '@/services/cash';
import { theme } from '@/theme';
import type { CashSession, CashMovement } from '@/models';

// ── Helpers ──────────────────────────────────────────────

function formatARS(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('es-AR');
}

function formatSessionDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getSaldoActual(s: CashSession): number {
  return s.openingBalance + s.summary.totalIngresos - s.summary.totalEgresos;
}

function getEfectivoEnCajon(s: CashSession): number {
  return s.openingBalance + s.summary.efectivo - s.summary.totalEgresos;
}

const PAYMENT_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  mercado_pago: 'Mercado Pago',
  transferencia: 'Transferencia',
  otro: 'Otro',
};

function getMovHour(mov: CashMovement): string {
  if (!mov.createdAt?.toDate) return '--:--';
  return mov.createdAt.toDate().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMovSubtitle(mov: CashMovement): string {
  if (mov.type === 'ingreso') {
    const method = mov.medioPago ? (PAYMENT_LABEL[mov.medioPago] ?? 'Otro') : 'Efectivo';
    return `Ingreso · ${method}`;
  }
  return mov.description ? `Gasto · ${mov.description}` : 'Gasto';
}

// ── MovementRow ──────────────────────────────────────────

function MovementRow({ movement }: { movement: CashMovement }) {
  const isIngreso = movement.type === 'ingreso';
  const color = isIngreso ? theme.colors.success : theme.colors.error;
  const amountStr = (isIngreso ? '+' : '-') + formatARS(movement.amount);

  return (
    <View style={styles.movRow}>
      <Text style={styles.movHour}>{getMovHour(movement)}</Text>
      <Text style={[styles.movSubtitle, { color }]} numberOfLines={1}>
        {getMovSubtitle(movement)}
      </Text>
      <Text style={[styles.movAmount, { color }]}>{amountStr}</Text>
    </View>
  );
}

// ── Estado: sin caja abierta ─────────────────────────────

function OpenCashView() {
  const { userProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleOpen() {
    const parsed = parseInt(amount.replace(/\D/g, '') || '0', 10);
    if (!userProfile?.businessId) return;
    setSaving(true);
    setError('');
    try {
      await openCashSession(userProfile.businessId, parsed);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? '';
      setError(
        msg.includes('Ya existe')
          ? 'Ya hay una caja abierta hoy.'
          : 'No se pudo abrir la caja. Intentá de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.openContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Ionicons name="cash-outline" size={64} color={theme.colors.muted} style={styles.openIcon} />
        <Text style={styles.openTitle}>Todavía no abriste la caja</Text>
        <Text style={styles.openSubtitle}>
          Ingresá el dinero que hay en el cajón para empezar el día
        </Text>

        <View style={styles.openCard}>
          <Text style={styles.openLabel}>¿Cuánto hay en el cajón?</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySign}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(t) => { setAmount(t.replace(/\D/g, '')); setError(''); }}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={theme.colors.muted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleOpen}
            />
          </View>
          <Text style={styles.openHint}>Podés dejar 0 si empezás sin efectivo</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          onPress={handleOpen}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="lock-open-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>ABRIR CAJA</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Estado: caja cerrada hoy ─────────────────────────────

function ClosedCashView({ session }: { session: CashSession }) {
  const saldo = getSaldoActual(session);
  const cajon = getEfectivoEnCajon(session);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.closedContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.closedBadge}>
        <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
        <Text style={styles.closedBadgeText}>Caja cerrada</Text>
      </View>
      <Text style={styles.closedDate}>{formatSessionDate(session.date)}</Text>

      <View style={styles.closedCard}>
        <SummaryRow label="Saldo inicial" value={formatARS(session.openingBalance)} />
        <Divider />
        <SummaryRow label="Ingresos efectivo" value={formatARS(session.summary.efectivo)} />
        <SummaryRow label="Mercado Pago" value={formatARS(session.summary.mercadoPago)} />
        <SummaryRow label="Transferencia" value={formatARS(session.summary.transferencia)} />
        {session.summary.otro > 0 && (
          <SummaryRow label="Otros medios" value={formatARS(session.summary.otro)} />
        )}
        <SummaryRow label="Total ingresos" value={formatARS(session.summary.totalIngresos)} bold />
        <Divider />
        <SummaryRow label="Total gastos" value={formatARS(session.summary.totalEgresos)} danger />
        <Divider />
        <View style={styles.cajonRow}>
          <Text style={styles.cajonLabel}>Efectivo en cajón</Text>
          <Text style={[styles.cajonValue, cajon < 0 && styles.textDanger]}>{formatARS(cajon)}</Text>
        </View>
        <View style={styles.cajonRow}>
          <Text style={styles.totalLabel}>Saldo total del día</Text>
          <Text style={[styles.totalValue, saldo < 0 && styles.textDanger]}>{formatARS(saldo)}</Text>
        </View>
      </View>

      <Text style={styles.closedFooter}>
        {session.summary.movementsCount} movimientos registrados
      </Text>
      <Text style={styles.closedNote}>Mañana podés abrir una nueva caja</Text>
    </ScrollView>
  );
}

// ── Estado: caja abierta ─────────────────────────────────

function ActiveCashView({ session }: { session: CashSession }) {
  const router = useRouter();
  const { movements, loading: movLoading } = useCashMovements(session.id, 5);
  const saldo = getSaldoActual(session);

  function handleClose() {
    Alert.alert(
      'Cerrar caja',
      '¿Querés ver el resumen y confirmar el cierre del día?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ver resumen', onPress: () => router.push('/cash/close') },
      ],
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.activeContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.activeDate}>{formatSessionDate(session.date)}</Text>

      {/* Saldo actual */}
      <View style={styles.saldoCard}>
        <Text style={styles.saldoLabel}>SALDO ACTUAL</Text>
        <Text style={[styles.saldoAmount, saldo < 0 && styles.textDanger]}>
          {formatARS(saldo)}
        </Text>
        <View style={styles.saldoRow}>
          <View style={styles.saldoStat}>
            <Ionicons name="arrow-up-circle" size={16} color={theme.colors.success} />
            <Text style={styles.saldoStatLabel}>Entradas</Text>
            <Text style={[styles.saldoStatValue, { color: theme.colors.success }]}>
              {formatARS(session.summary.totalIngresos)}
            </Text>
          </View>
          <View style={styles.saldoStatDivider} />
          <View style={styles.saldoStat}>
            <Ionicons name="arrow-down-circle" size={16} color={theme.colors.error} />
            <Text style={styles.saldoStatLabel}>Salidas</Text>
            <Text style={[styles.saldoStatValue, { color: theme.colors.error }]}>
              {formatARS(session.summary.totalEgresos)}
            </Text>
          </View>
          <View style={styles.saldoStatDivider} />
          <View style={styles.saldoStat}>
            <Ionicons name="receipt-outline" size={16} color={theme.colors.muted} />
            <Text style={styles.saldoStatLabel}>Movimientos</Text>
            <Text style={styles.saldoStatValue}>{session.summary.movementsCount}</Text>
          </View>
        </View>
      </View>

      {/* Botones principales */}
      <TouchableOpacity
        style={styles.incomeBtn}
        onPress={() => router.push('/cash/new-income')}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
        <Text style={styles.incomeBtnText}>REGISTRAR INGRESO</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.expenseBtn}
        onPress={() => router.push('/cash/new-expense')}
        activeOpacity={0.85}
      >
        <Ionicons name="remove-circle-outline" size={24} color={theme.colors.error} />
        <Text style={styles.expenseBtnText}>REGISTRAR GASTO</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.closeBtn}
        onPress={handleClose}
        activeOpacity={0.8}
      >
        <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />
        <Text style={styles.closeBtnText}>Cerrar caja del día</Text>
      </TouchableOpacity>

      {/* Movimientos del día */}
      <View style={styles.movSection}>
        <View style={styles.movHeader}>
          <Text style={styles.movSectionTitle}>Movimientos de hoy</Text>
          {movements.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/cash/movements')}
              activeOpacity={0.7}
            >
              <Text style={styles.movVerTodos}>Ver todos</Text>
            </TouchableOpacity>
          )}
        </View>

        {movLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.movLoader} />
        ) : movements.length === 0 ? (
          <Text style={styles.movEmpty}>No hay movimientos todavía</Text>
        ) : (
          movements.map((m, i) => (
            <View key={m.id}>
              {i > 0 && <View style={styles.movDivider} />}
              <MovementRow movement={m} />
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ── Helpers de UI ────────────────────────────────────────

function SummaryRow({ label, value, bold, danger }: {
  label: string; value: string; bold?: boolean; danger?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold, danger && styles.textDanger]}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ── Pantalla principal ───────────────────────────────────

export default function CashScreen() {
  const { session, loading } = useCashSession();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Caja Diaria</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} size="large" />
        ) : !session ? (
          <OpenCashView />
        ) : session.status === 'closed' ? (
          <ClosedCashView session={session} />
        ) : (
          <ActiveCashView session={session} />
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Estilos ──────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  loader: { flex: 1, justifyContent: 'center' },

  header: { marginBottom: 16 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },

  // ── OpenCashView
  openContainer: { paddingTop: 32, paddingBottom: 48, alignItems: 'center' },
  openIcon: { marginBottom: 16 },
  openTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  openSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  openCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: 20,
    marginBottom: 16,
  },
  openLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencySign: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.text,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: '800',
    color: theme.colors.text,
    padding: 0,
  },
  openHint: { fontSize: 12, color: theme.colors.muted, marginTop: 8 },
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
    width: '100%',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: '500',
    lineHeight: 18,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    minHeight: 56,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },

  // ── ClosedCashView
  closedContainer: { paddingTop: 12, paddingBottom: 40 },
  closedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  closedBadgeText: { fontSize: 18, fontWeight: '700', color: theme.colors.success },
  closedDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  closedCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    marginBottom: 16,
  },
  closedFooter: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 6,
  },
  closedNote: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },

  // ── ActiveCashView
  activeContainer: { paddingTop: 0, paddingBottom: 40 },
  activeDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  saldoCard: {
    backgroundColor: theme.colors.successLight,
    borderWidth: 1.5,
    borderColor: theme.colors.successMid,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  saldoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.success,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  saldoAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.colors.success,
    letterSpacing: -1,
    marginBottom: 16,
  },
  saldoRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  saldoStat: { alignItems: 'center', gap: 3 },
  saldoStatLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
  saldoStatValue: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  saldoStatDivider: { width: 1, height: 32, backgroundColor: theme.colors.successMid },

  incomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryMid,
    borderRadius: 16,
    paddingVertical: 18,
    minHeight: 56,
    marginBottom: 12,
  },
  incomeBtnText: { fontSize: 17, fontWeight: '800', color: theme.colors.primary, letterSpacing: 0.5 },
  expenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1.5,
    borderColor: theme.colors.dangerMid,
    borderRadius: 16,
    paddingVertical: 18,
    minHeight: 56,
    marginBottom: 20,
  },
  expenseBtnText: { fontSize: 17, fontWeight: '800', color: theme.colors.error, letterSpacing: 0.5 },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 28,
  },
  closeBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },

  // ── Movimientos section
  movSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  movHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  movSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  movVerTodos: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  movLoader: { marginVertical: 12 },
  movEmpty: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  movRow: { paddingVertical: 10 },
  movHour: { fontSize: 12, color: theme.colors.muted, fontWeight: '500', marginBottom: 3 },
  movSubtitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  movAmount: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  movDivider: { height: 1, backgroundColor: theme.colors.divider },

  // ── Summary rows (ClosedCashView)
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  rowLabel: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  rowLabelBold: { fontWeight: '700', color: theme.colors.text },
  rowValue: { fontSize: 14, color: theme.colors.text, fontWeight: '600' },
  rowValueBold: { fontSize: 15, fontWeight: '800' },
  divider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 8 },
  cajonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  cajonLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  cajonValue: { fontSize: 22, fontWeight: '800', color: theme.colors.success },
  totalLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  totalValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  textDanger: { color: theme.colors.error },
});
