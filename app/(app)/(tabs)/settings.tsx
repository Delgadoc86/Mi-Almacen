import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { deleteField } from 'firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { updateBusiness, updateBusinessPreferences } from '@/services/userProfile';
import { exportBusinessData } from '@/services/exportData';
import { deleteBusinessData, deleteUserProfile, deleteAuthUser } from '@/services/deleteAccount';
import { ROUND_OPTIONS, DEFAULT_MARGIN_MAX } from '@/constants';
import { theme } from '@/theme';
import type { RoundTo } from '@/models';
import type { Timestamp } from 'firebase/firestore';

const LAST_EXPORT_KEY = 'lastExportAt';
const EXPORT_REMINDER_DAYS = 7;

function formatLastLogin(ts?: Timestamp): string | null {
  if (!ts || typeof ts.toDate !== 'function') return null;
  const d = ts.toDate();
  const now = new Date();
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `hoy ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `ayer ${time}`;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' + time;
}

function daysSince(isoDate: string): number {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function SettingsScreen() {
  const router = useRouter();
  const { business, userProfile, logout, refreshBusiness } = useAuth();
  const { categories } = useCategories();

  const [businessName, setBusinessName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [defaultMargin, setDefaultMargin] = useState('');
  const [defaultRoundTo, setDefaultRoundTo] = useState<RoundTo | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const initialized = useRef(false);

  useEffect(() => {
    if (business && !initialized.current) {
      initialized.current = true;
      setBusinessName(business.name ?? '');
      setDefaultMargin(
        business.defaultMargin !== undefined ? String(business.defaultMargin) : '',
      );
      setDefaultRoundTo(business.defaultRoundTo ?? null);
      setDefaultCategoryId(business.defaultCategoryId ?? '');
    }
  }, [business]);

  useEffect(() => {
    AsyncStorage.getItem(LAST_EXPORT_KEY).then((val) => setLastExportAt(val));
  }, []);

  async function handleSaveName() {
    const trimmed = businessName.trim();
    if (!trimmed) { Alert.alert('Error', 'El nombre no puede estar vacío.'); return; }
    if (!userProfile) return;
    setSavingName(true);
    try {
      await updateBusiness(userProfile.businessId, trimmed);
      await refreshBusiness();
      Alert.alert('Guardado', 'Nombre actualizado.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intentá de nuevo.');
    } finally {
      setSavingName(false);
    }
  }

  async function handleSavePrefs() {
    const marginNum = defaultMargin.trim() !== '' ? parseFloat(defaultMargin.trim()) : undefined;
    if (marginNum !== undefined && (isNaN(marginNum) || marginNum < 0 || marginNum > DEFAULT_MARGIN_MAX)) {
      Alert.alert('Error', `El margen debe estar entre 0 y ${DEFAULT_MARGIN_MAX}.`);
      return;
    }
    if (!userProfile) return;
    setSavingPrefs(true);
    try {
      await updateBusinessPreferences(userProfile.businessId, {
        defaultMargin: marginNum !== undefined ? marginNum : deleteField(),
        defaultRoundTo: defaultRoundTo !== null ? defaultRoundTo : deleteField(),
        defaultCategoryId: defaultCategoryId || deleteField(),
      });
      await refreshBusiness();
      Alert.alert('Guardado', 'Preferencias actualizadas.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intentá de nuevo.');
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleExport() {
    if (!userProfile?.businessId) return;
    setExporting(true);
    try {
      await exportBusinessData(userProfile.businessId);
      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_EXPORT_KEY, now);
      setLastExportAt(now);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo exportar.';
      Alert.alert('Error', msg);
    } finally {
      setExporting(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Eliminar cuenta',
      'Se borrarán todos tus datos: productos, clientes, fiados e historial de caja.\n\nEsta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '¿Estás seguro?',
              `Vas a eliminar la cuenta de "${business?.name ?? 'tu negocio'}" permanentemente.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'ELIMINAR TODO',
                  style: 'destructive',
                  onPress: confirmDelete,
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function confirmDelete() {
    if (!userProfile) return;
    setDeleting(true);
    try {
      await deleteBusinessData(userProfile.businessId);
      await deleteUserProfile(userProfile.uid);
      await deleteAuthUser();
      // El listener de auth detecta la eliminación y redirige al login automáticamente
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        Alert.alert(
          'Sesión expirada',
          'Por seguridad, cerrá sesión e ingresá de nuevo antes de eliminar tu cuenta.',
          [{ text: 'Entendido' }],
        );
      } else {
        const msg = err instanceof Error ? err.message : 'No se pudo eliminar la cuenta.';
        Alert.alert('Error', msg);
      }
      setDeleting(false);
    }
  }

  const exportDaysAgo = lastExportAt ? daysSince(lastExportAt) : null;
  const showExportReminder =
    exportDaysAgo === null || exportDaysAgo >= EXPORT_REMINDER_DAYS;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Configuración</Text>
        <Text style={styles.pageSubtitle}>Datos y preferencias de tu comercio</Text>

        {/* ── MI COMERCIO ── */}
        <Text style={styles.sectionLabel}>MI COMERCIO</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Nombre del negocio</Text>
          <TextInput
            style={styles.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Nombre del comercio"
            placeholderTextColor={theme.colors.muted}
            maxLength={80}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.saveBtn, savingName && styles.saveBtnDisabled]}
            onPress={handleSaveName}
            disabled={savingName}
            activeOpacity={0.8}
          >
            {savingName ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar nombre</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={15} color={theme.colors.muted} style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.readOnly}>{userProfile?.email ?? '—'}</Text>
            </View>
          </View>

          {formatLastLogin(userProfile?.lastLoginAt) ? (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={15} color={theme.colors.muted} style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={styles.fieldLabel}>Último ingreso</Text>
                  <Text style={styles.readOnly}>{formatLastLogin(userProfile?.lastLoginAt)}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* ── PRODUCTOS ── */}
        <Text style={styles.sectionLabel}>PRODUCTOS</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Margen por defecto (%)</Text>
          <TextInput
            style={styles.input}
            value={defaultMargin}
            onChangeText={setDefaultMargin}
            keyboardType="decimal-pad"
            placeholder="Sin margen por defecto"
            placeholderTextColor={theme.colors.muted}
          />
          <Text style={styles.hint}>0% — {DEFAULT_MARGIN_MAX}% máximo</Text>

          <Text style={[styles.fieldLabel, styles.fieldLabelTop]}>Redondeo por defecto</Text>
          <View style={styles.toggleRow}>
            {ROUND_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, defaultRoundTo === opt.value && styles.chipActive]}
                onPress={() => setDefaultRoundTo((prev) => (prev === opt.value ? null : opt.value))}
              >
                <Text style={[styles.chipText, defaultRoundTo === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, styles.fieldLabelTop]}>Categoría por defecto</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, defaultCategoryId === cat.id && styles.chipActive]}
                onPress={() => setDefaultCategoryId((prev) => (prev === cat.id ? '' : cat.id))}
              >
                <Text style={[styles.chipText, defaultCategoryId === cat.id && styles.chipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {defaultCategoryId ? (
            <Text style={styles.hint}>
              Categoría seleccionada: {categories.find((c) => c.id === defaultCategoryId)?.name}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.saveBtn, styles.saveBtnTop, savingPrefs && styles.saveBtnDisabled]}
            onPress={handleSavePrefs}
            disabled={savingPrefs}
            activeOpacity={0.8}
          >
            {savingPrefs ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar preferencias</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── CATEGORÍAS ── */}
        <Text style={styles.sectionLabel}>CATEGORÍAS</Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/categories')}
          activeOpacity={0.7}
        >
          <View style={styles.linkIconWrap}>
            <Ionicons name="layers-outline" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.linkBody}>
            <Text style={styles.linkText}>Administrar categorías</Text>
            <Text style={styles.linkSubText}>
              {categories.length === 0
                ? 'Sin categorías creadas'
                : `${categories.length} ${categories.length === 1 ? 'categoría' : 'categorías'}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={theme.colors.muted} />
        </TouchableOpacity>

        {/* ── AYUDA ── */}
        <Text style={styles.sectionLabel}>AYUDA</Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/onboarding?from=settings')}
          activeOpacity={0.7}
        >
          <View style={styles.linkIconWrap}>
            <Ionicons name="map-outline" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.linkBody}>
            <Text style={styles.linkText}>Ver guía inicial</Text>
            <Text style={styles.linkSubText}>Los primeros pasos para usar Mi Almacén</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={theme.colors.muted} />
        </TouchableOpacity>

        {/* ── MIS DATOS ── */}
        <Text style={styles.sectionLabel}>MIS DATOS</Text>

        {showExportReminder && (
          <View style={styles.reminderBanner}>
            <Ionicons name="cloud-download-outline" size={16} color="#92400E" />
            <Text style={styles.reminderText}>
              {exportDaysAgo === null
                ? 'Nunca exportaste tus datos. Guardá un backup por si acaso.'
                : `Hace ${exportDaysAgo} días que no exportás. ¿Todo bien?`}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.exportInfo}>
            <Ionicons name="information-circle-outline" size={15} color={theme.colors.muted} />
            <Text style={styles.exportInfoText}>
              Genera un archivo JSON con todos tus productos, clientes, fiados e historial de caja.
              Podés guardarlo en Google Drive, WhatsApp o email.
            </Text>
          </View>

          {lastExportAt && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle-outline" size={15} color={theme.colors.success} style={styles.infoIcon} />
                <Text style={[styles.readOnly, { color: theme.colors.success }]}>
                  Último backup: hace {exportDaysAgo === 0 ? 'menos de 1 día' : `${exportDaysAgo} días`}
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.exportBtn, exporting && styles.saveBtnDisabled]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.8}
          >
            {exporting ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.exportBtnText}>Exportar mis datos (JSON)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── CUENTA ── */}
        <Text style={styles.sectionLabel}>CUENTA</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        {/* ── ZONA PELIGROSA ── */}
        <Text style={[styles.sectionLabel, styles.dangerLabel]}>ZONA PELIGROSA</Text>
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Eliminar cuenta y todos los datos</Text>
          <Text style={styles.dangerDesc}>
            Borrará permanentemente todos tus productos, clientes, fiados, cajas y tu cuenta.
            Esta acción no se puede deshacer.
          </Text>
          <Text style={styles.dangerTip}>
            Recomendamos exportar tus datos antes de continuar.
          </Text>
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.saveBtnDisabled]}
            onPress={handleDeleteAccount}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting ? (
              <ActivityIndicator color={theme.colors.error} size="small" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                <Text style={styles.deleteBtnText}>
                  {deleting ? 'Eliminando...' : 'Eliminar mi cuenta'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },

  pageTitle: {
    fontSize: 28, fontWeight: '800', color: theme.colors.text,
    letterSpacing: -0.5, marginBottom: 4,
  },
  pageSubtitle: { fontSize: 14, color: theme.colors.muted, fontWeight: '500', marginBottom: 24 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: theme.colors.muted,
    letterSpacing: 1.5, marginBottom: 8, marginTop: 16,
  },
  dangerLabel: { color: theme.colors.error },

  card: {
    backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: 20,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
  fieldLabelTop: { marginTop: 14 },
  input: {
    backgroundColor: theme.colors.background, borderWidth: 1.5,
    borderColor: theme.colors.border, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: theme.colors.text,
  },
  hint: { fontSize: 11, color: theme.colors.muted, marginTop: 4 },
  divider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 14 },
  readOnly: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },

  saveBtn: {
    marginTop: 14, alignSelf: 'stretch', backgroundColor: theme.colors.primary,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  saveBtnTop: { marginTop: 16 },
  saveBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chipScroll: { flexDirection: 'row', gap: 7, paddingVertical: 2 },
  chip: {
    height: 36, paddingHorizontal: 14, borderRadius: 18,
    borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center',
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.surface, borderRadius: 20,
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: 20,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  linkIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  linkBody: { flex: 1 },
  linkText: { fontSize: 15, color: theme.colors.text, fontWeight: '600' },
  linkSubText: { fontSize: 12, color: theme.colors.muted, fontWeight: '500', marginTop: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { marginTop: 2 },
  infoContent: { flex: 1 },

  // ── MIS DATOS
  reminderBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  reminderText: {
    flex: 1, fontSize: 13, fontWeight: '500', color: '#92400E', lineHeight: 18,
  },
  exportInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  exportInfoText: {
    flex: 1, fontSize: 13, color: theme.colors.muted, lineHeight: 18,
  },
  exportBtn: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderColor: theme.colors.primaryMid,
    backgroundColor: theme.colors.primaryLight, borderRadius: 14, paddingVertical: 14,
  },
  exportBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },

  // ── CUENTA
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.dangerLight, borderWidth: 1.5,
    borderColor: theme.colors.dangerMid, borderRadius: 16, paddingVertical: 14,
  },
  logoutText: { color: theme.colors.error, fontSize: 15, fontWeight: '700' },

  // ── ZONA PELIGROSA
  dangerCard: {
    backgroundColor: theme.colors.dangerLight, borderRadius: 20, padding: 16,
    borderWidth: 1.5, borderColor: theme.colors.dangerMid, marginBottom: 20,
  },
  dangerTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.error, marginBottom: 6 },
  dangerDesc: {
    fontSize: 13, color: theme.colors.error, lineHeight: 19,
    opacity: 0.8, marginBottom: 8,
  },
  dangerTip: {
    fontSize: 12, color: theme.colors.textSecondary,
    fontStyle: 'italic', marginBottom: 14,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: theme.colors.dangerMid,
    backgroundColor: theme.colors.surface, borderRadius: 12, paddingVertical: 14,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.error },
});
