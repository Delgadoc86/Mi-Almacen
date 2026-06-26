import { useRef, useState } from 'react';
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
import { openCashSession, reopenCashSession } from '@/services/cash';
import { theme } from '@/theme';
import type { CashSession, CashMovement } from '@/models';

// ── Helpers ──────────────────────────────────────────────

function formatARS(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('es-AR');
}

function formatDateTime(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${d}/${m} a las ${h}:${min}`;
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${min}`;
}

function formatDuration(from: Date, to: Date = new Date()): string {
  const diffMs = Math.max(0, to.getTime() - from.getTime());
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
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

// ── MovementRow ──────────────────────────────────────────

function MovementRow({ movement }: { movement: CashMovement }) {
  const isIngreso = movement.type === 'ingreso';
  const color = isIngreso ? theme.colors.success : theme.colors.error;
  const createdAt = movement.createdAt?.toDate?.();
  const hour = createdAt ? formatTime(createdAt) : '--:--';
  const amountStr = (isIngreso ? '+' : '-') + formatARS(movement.amount);
  const label = isIngreso
    ? (movement.medioPago ? (PAYMENT_LABEL[movement.medioPago] ?? 'Ingreso') : 'Efectivo')
    : (movement.description ?? 'Gasto');

  return (
    <View style={styles.movRow}>
      <Text style={styles.movHour}>{hour}</Text>
      <Text style={styles.movLabel} numberOfLines={1}>{label}</Text>
      <Text style={[styles.movAmount, { color }]}>{amountStr}</Text>
    </View>
  );
}

// ── AmountInput — sin autoFocus ──────────────────────────

function AmountInput({
  value,
  onChange,
  onSubmit,
  inputRef,
  placeholder = 'Efectivo inicial',
}: {
  value: string;
  onChange: (t: string) => void;
  onSubmit: () => void;
  inputRef: React.RefObject<TextInput | null>;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const display = value ? '$ ' + parseInt(value, 10).toLocaleString('es-AR') : '';

  return (
    <TouchableOpacity
      style={[styles.amountBox, focused && styles.amountBoxFocused]}
      onPress={() => inputRef.current?.focus()}
      activeOpacity={0.85}
    >
      <Text style={styles.amountBoxLabel}>{placeholder}</Text>
      <View style={styles.amountBoxRow}>
        {display ? (
          <Text style={styles.amountBoxValue}>{display}</Text>
        ) : (
          <Text style={styles.amountBoxPlaceholder}>$0</Text>
        )}
        <View style={[styles.amountBoxTag, focused && styles.amountBoxTagFocused]}>
          <Ionicons
            name={focused ? 'keypad-outline' : 'pencil-outline'}
            size={13}
            color={focused ? theme.colors.primary : theme.colors.muted}
          />
          <Text style={[styles.amountBoxTagText, focused && { color: theme.colors.primary }]}>
            {focused ? 'escribiendo' : 'tocar para editar'}
          </Text>
        </View>
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
      />
    </TouchableOpacity>
  );
}

// ── OpenCashView — primera vez, sin sesiones ─────────────

function OpenCashView() {
  const { userProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  async function handleOpen() {
    const parsed = parseInt(amount.replace(/\D/g, '') || '0', 10);
    if (!userProfile?.businessId) return;
    setSaving(true);
    setError('');
    try {
      await openCashSession(userProfile.businessId, parsed);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? '';
      setError(msg.includes('Ya hay') ? 'Ya hay una caja abierta.' : 'No se pudo abrir la caja. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.openContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.openIconWrap}>
          <Ionicons name="storefront-outline" size={48} color={theme.colors.primary} />
        </View>

        <Text style={styles.openTitle}>Abrir caja</Text>
        <Text style={styles.openSubtitle}>
          Ingresá cuánto efectivo hay en el cajón. Podés dejarlo en $0.
        </Text>

        <AmountInput
          value={amount}
          onChange={(t) => { setAmount(t); setError(''); }}
          onSubmit={handleOpen}
          inputRef={inputRef}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={14} color={theme.colors.error} />
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

// ── ClosedCashView — caja cerrada, acción primero ────────

function ClosedCashView({ session }: { session: CashSession }) {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [showDetail, setShowDetail] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const newInputRef = useRef<TextInput>(null);

  const saldo = getSaldoActual(session);
  const cajon = getEfectivoEnCajon(session);
  const openedAt = session.createdAt?.toDate?.();
  const closedAt = session.closedAt?.toDate?.();

  function handleShowNewForm() {
    setShowNewForm(true);
    setNewAmount('');
    setError('');
    setTimeout(() => newInputRef.current?.focus(), 80);
  }

  function handleCancelNew() {
    setShowNewForm(false);
    setNewAmount('');
    setError('');
  }

  async function handleReopen() {
    Alert.alert(
      'Reabrir caja',
      'La caja anterior volverá a quedar activa con todos sus movimientos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reabrir',
          onPress: async () => {
            if (!userProfile?.businessId) return;
            setReopening(true);
            try {
              await reopenCashSession(userProfile.businessId, session.id);
            } catch {
              Alert.alert('Error', 'No se pudo reabrir la caja. Intentá de nuevo.');
            } finally {
              setReopening(false);
            }
          },
        },
      ],
    );
  }

  async function handleOpenNew() {
    const parsed = parseInt(newAmount.replace(/\D/g, '') || '0', 10);
    if (!userProfile?.businessId) return;
    setSaving(true);
    setError('');
    try {
      await openCashSession(userProfile.businessId, parsed);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? '';
      setError(msg.includes('Ya hay') ? 'Ya hay una caja abierta.' : 'No se pudo abrir la caja. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.closedContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Resumen compacto ── */}
      <View style={styles.closedCompact}>
        <View style={styles.closedCompactLeft}>
          <View style={styles.closedStateBadge}>
            <View style={styles.closedStateDot} />
            <Text style={styles.closedStateTxt}>Cerrada</Text>
          </View>
          {closedAt && (
            <Text style={styles.closedWhen}>{formatDateTime(closedAt)}</Text>
          )}
          {openedAt && closedAt && (
            <Text style={styles.closedDuration}>
              {session.summary.movementsCount} mov · {formatDuration(openedAt, closedAt)}
            </Text>
          )}
        </View>
        <View style={styles.closedCompactRight}>
          <Text style={styles.closedSaldoLabel}>Saldo final</Text>
          <Text style={[styles.closedSaldoValue, saldo < 0 && styles.textDanger]}>
            {formatARS(saldo)}
          </Text>
        </View>
      </View>

      {/* ── Detalle expandible ── */}
      <TouchableOpacity
        style={styles.detailToggle}
        onPress={() => setShowDetail((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.detailToggleTxt}>
          {showDetail ? 'Ocultar detalle' : 'Ver detalle del cierre'}
        </Text>
        <Ionicons
          name={showDetail ? 'chevron-up' : 'chevron-down'}
          size={15}
          color={theme.colors.primary}
        />
      </TouchableOpacity>

      {showDetail && (
        <View style={styles.detailCard}>
          <DetailRow label="Saldo inicial" value={formatARS(session.openingBalance)} />
          <View style={styles.detailDivider} />
          <DetailRow label="Efectivo" value={formatARS(session.summary.efectivo)} />
          <DetailRow label="Mercado Pago" value={formatARS(session.summary.mercadoPago)} />
          <DetailRow label="Transferencia" value={formatARS(session.summary.transferencia)} />
          {session.summary.otro > 0 && (
            <DetailRow label="Otros" value={formatARS(session.summary.otro)} />
          )}
          <DetailRow label="Total ingresos" value={formatARS(session.summary.totalIngresos)} bold />
          <View style={styles.detailDivider} />
          <DetailRow label="Gastos" value={formatARS(session.summary.totalEgresos)} danger={session.summary.totalEgresos > 0} />
          <View style={styles.detailDivider} />
          <DetailRow label="Efectivo en cajón" value={formatARS(cajon)} highlight />
          <DetailRow label="Saldo final" value={formatARS(saldo)} bold />
        </View>
      )}

      {/* ── Acción primaria ── */}
      {showNewForm ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.newCajaCard}>
            <Text style={styles.newCajaTitle}>Efectivo en cajón al abrir</Text>

            <AmountInput
              value={newAmount}
              onChange={(t) => { setNewAmount(t); setError(''); }}
              onSubmit={handleOpenNew}
              inputRef={newInputRef}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color={theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.newCajaRow}>
              <TouchableOpacity
                style={styles.newCajaCancelBtn}
                onPress={handleCancelNew}
                disabled={saving}
              >
                <Text style={styles.newCajaCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.newCajaConfirmBtn, saving && styles.btnDisabled]}
                onPress={handleOpenNew}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="lock-open-outline" size={18} color="#fff" />
                    <Text style={styles.newCajaConfirmTxt}>ABRIR</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.newCajaHint}>Podés dejar $0 si no contaste aún</Text>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleShowNewForm}
          activeOpacity={0.85}
        >
          <Ionicons name="lock-open-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>ABRIR NUEVA CAJA</Text>
        </TouchableOpacity>
      )}

      {/* ── Secundarios ── */}
      <TouchableOpacity
        style={[styles.secondaryBtn, reopening && styles.btnDisabled]}
        onPress={handleReopen}
        disabled={reopening}
        activeOpacity={0.8}
      >
        {reopening ? (
          <ActivityIndicator color={theme.colors.textSecondary} size="small" />
        ) : (
          <>
            <Ionicons name="refresh-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.secondaryBtnTxt}>Reabrir esta caja</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => router.push('/cash/history')}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
        <Text style={styles.linkBtnTxt}>Ver historial de cajas</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── DetailRow ────────────────────────────────────────────

function DetailRow({
  label, value, bold, danger, highlight,
}: { label: string; value: string; bold?: boolean; danger?: boolean; highlight?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, bold && styles.detailLabelBold]}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          bold && styles.detailValueBold,
          danger && styles.textDanger,
          highlight && styles.textHighlight,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ── ActiveCashView ───────────────────────────────────────

function ActiveCashView({ session }: { session: CashSession }) {
  const router = useRouter();
  const { movements, loading: movLoading } = useCashMovements(session.id, 5);
  const saldo = getSaldoActual(session);

  const openedAt = session.createdAt?.toDate?.();
  const hoursOpen = openedAt ? (Date.now() - openedAt.getTime()) / (1000 * 60 * 60) : 0;
  const showLongAlert = hoursOpen > 36;

  function handleClose() {
    Alert.alert('Cerrar caja', '¿Querés ver el resumen y confirmar el cierre?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Ver resumen', onPress: () => router.push('/cash/close') },
    ]);
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.activeContainer}
      showsVerticalScrollIndicator={false}
    >
      {showLongAlert && (
        <TouchableOpacity style={styles.longAlert} onPress={() => router.push('/cash/close')} activeOpacity={0.8}>
          <Ionicons name="time-outline" size={16} color="#92400E" />
          <Text style={styles.longAlertTxt}>Caja abierta hace más de 36 h — cerrar</Text>
          <Ionicons name="chevron-forward" size={14} color="#92400E" />
        </TouchableOpacity>
      )}

      {openedAt && (
        <View style={styles.activeInfo}>
          <Text style={styles.activeWhen}>Abierta a las {formatTime(openedAt)}</Text>
          <Text style={styles.activeElapsed}>Hace {formatDuration(openedAt)}</Text>
        </View>
      )}

      {/* ── Saldo ── */}
      <View style={styles.saldoCard}>
        <Text style={styles.saldoLabel}>SALDO ACTUAL</Text>
        <Text style={[styles.saldoAmount, saldo < 0 && styles.textDanger]}>
          {formatARS(saldo)}
        </Text>
        <View style={styles.saldoStats}>
          <View style={styles.saldoStat}>
            <Text style={styles.saldoStatNum}>
              {formatARS(session.summary.totalIngresos)}
            </Text>
            <Text style={[styles.saldoStatLbl, { color: theme.colors.success }]}>entradas</Text>
          </View>
          <View style={styles.saldoStatDiv} />
          <View style={styles.saldoStat}>
            <Text style={styles.saldoStatNum}>
              {formatARS(session.summary.totalEgresos)}
            </Text>
            <Text style={[styles.saldoStatLbl, { color: theme.colors.error }]}>salidas</Text>
          </View>
          <View style={styles.saldoStatDiv} />
          <View style={styles.saldoStat}>
            <Text style={styles.saldoStatNum}>{session.summary.movementsCount}</Text>
            <Text style={styles.saldoStatLbl}>movimientos</Text>
          </View>
        </View>
      </View>

      {/* ── Acciones ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.ingresoBtn]}
          onPress={() => router.push('/cash/new-income')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={26} color={theme.colors.primary} />
          <Text style={[styles.actionBtnTxt, { color: theme.colors.primary }]}>Ingreso</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.egresoBtn]}
          onPress={() => router.push('/cash/new-expense')}
          activeOpacity={0.85}
        >
          <Ionicons name="remove-circle-outline" size={26} color={theme.colors.error} />
          <Text style={[styles.actionBtnTxt, { color: theme.colors.error }]}>Gasto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.cerrarBtn]}
          onPress={handleClose}
          activeOpacity={0.85}
        >
          <Ionicons name="lock-closed-outline" size={26} color={theme.colors.textSecondary} />
          <Text style={[styles.actionBtnTxt, { color: theme.colors.textSecondary }]}>Cerrar</Text>
        </TouchableOpacity>
      </View>

      {/* ── Movimientos ── */}
      <View style={styles.movSection}>
        <View style={styles.movHeader}>
          <Text style={styles.movTitle}>Últimos movimientos</Text>
          {movements.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/cash/movements')} activeOpacity={0.7}>
              <Text style={styles.movVerTodos}>Ver todos</Text>
            </TouchableOpacity>
          )}
        </View>
        {movLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
        ) : movements.length === 0 ? (
          <Text style={styles.movEmpty}>Sin movimientos todavía</Text>
        ) : (
          movements.map((m, i) => (
            <View key={m.id}>
              {i > 0 && <View style={styles.movDivider} />}
              <MovementRow movement={m} />
            </View>
          ))
        )}
      </View>

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => router.push('/cash/history')}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
        <Text style={styles.linkBtnTxt}>Ver historial de cajas</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Pantalla principal ───────────────────────────────────

export default function CashScreen() {
  const { session, loading } = useCashSession();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.root}>
        <Text style={styles.screenTitle}>Caja</Text>

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} size="large" />
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
  root: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 20,
  },

  // ── OpenCashView
  openContainer: { paddingTop: 20, paddingBottom: 40, alignItems: 'center' },
  openIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  openTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  openSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 280,
  },

  // ── AmountInput
  amountBox: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: 18,
    marginBottom: 16,
  },
  amountBoxFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  amountBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  amountBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountBoxValue: {
    fontSize: 40,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -1,
  },
  amountBoxPlaceholder: {
    fontSize: 40,
    fontWeight: '800',
    color: theme.colors.muted,
    letterSpacing: -1,
  },
  amountBoxTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.divider,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  amountBoxTagFocused: {
    backgroundColor: theme.colors.primaryMid,
  },
  amountBoxTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },

  // ── primaryBtn
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    minHeight: 58,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1,
    borderColor: theme.colors.dangerMid,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
    width: '100%',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: '500',
  },

  // ── ClosedCashView
  closedContainer: { paddingTop: 4, paddingBottom: 40 },

  closedCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 8,
  },
  closedCompactLeft: { gap: 4, flex: 1 },
  closedStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  closedStateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.muted,
  },
  closedStateTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  closedWhen: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  closedDuration: { fontSize: 12, color: theme.colors.muted, fontWeight: '500' },
  closedCompactRight: { alignItems: 'flex-end', gap: 2 },
  closedSaldoLabel: { fontSize: 11, color: theme.colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  closedSaldoValue: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },

  // Detalle expandible
  detailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    marginBottom: 4,
  },
  detailToggleTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  detailLabelBold: { fontWeight: '700', color: theme.colors.text },
  detailValue: { fontSize: 14, color: theme.colors.text, fontWeight: '600' },
  detailValueBold: { fontSize: 15, fontWeight: '800' },
  detailDivider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 4 },

  // Formulario nueva caja
  newCajaCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryMid,
    padding: 18,
    marginBottom: 12,
  },
  newCajaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  newCajaRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  newCajaCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  newCajaCancelTxt: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  newCajaConfirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  newCajaConfirmTxt: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
  newCajaHint: { fontSize: 12, color: theme.colors.muted, textAlign: 'center', marginTop: 10 },

  // Botones secundarios
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
  },
  secondaryBtnTxt: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  linkBtnTxt: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },

  // ── ActiveCashView
  activeContainer: { paddingTop: 0, paddingBottom: 40 },
  longAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
  },
  longAlertTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: '#92400E' },
  activeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  activeWhen: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  activeElapsed: { fontSize: 13, color: theme.colors.muted, fontWeight: '500' },
  saldoCard: {
    backgroundColor: theme.colors.successLight,
    borderWidth: 1.5,
    borderColor: theme.colors.successMid,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  saldoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.success,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  saldoAmount: {
    fontSize: 52,
    fontWeight: '800',
    color: theme.colors.success,
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  saldoStats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  saldoStat: { alignItems: 'center', gap: 2 },
  saldoStatNum: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  saldoStatLbl: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  saldoStatDiv: { width: 1, height: 28, backgroundColor: theme.colors.successMid },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  ingresoBtn: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryMid,
  },
  egresoBtn: {
    backgroundColor: theme.colors.dangerLight,
    borderColor: theme.colors.dangerMid,
  },
  cerrarBtn: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  actionBtnTxt: { fontSize: 13, fontWeight: '700' },

  movSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  movHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  movTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  movVerTodos: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  movEmpty: { fontSize: 14, color: theme.colors.muted, textAlign: 'center', paddingVertical: 10 },
  movRow: { paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  movHour: { fontSize: 12, color: theme.colors.muted, fontWeight: '600', width: 36 },
  movLabel: { flex: 1, fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  movAmount: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  movDivider: { height: 1, backgroundColor: theme.colors.divider },

  // ── Shared
  textDanger: { color: theme.colors.error },
  textHighlight: { color: theme.colors.success, fontWeight: '700' },
});
