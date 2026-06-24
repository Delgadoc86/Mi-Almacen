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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { updateBusiness, updateBusinessPreferences } from '@/services/userProfile';
import { ROUND_OPTIONS, DEFAULT_MARGIN_MAX } from '@/constants';
import { theme } from '@/theme';
import type { RoundTo } from '@/models';
import type { Timestamp } from 'firebase/firestore';

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

  async function handleSaveName() {
    const trimmed = businessName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'El nombre no puede estar vacío.');
      return;
    }
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
    const marginNum =
      defaultMargin.trim() !== '' ? parseFloat(defaultMargin.trim()) : undefined;

    if (
      marginNum !== undefined &&
      (isNaN(marginNum) || marginNum < 0 || marginNum > DEFAULT_MARGIN_MAX)
    ) {
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
                onPress={() =>
                  setDefaultRoundTo((prev) => (prev === opt.value ? null : opt.value))
                }
              >
                <Text
                  style={[styles.chipText, defaultRoundTo === opt.value && styles.chipTextActive]}
                >
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
                onPress={() =>
                  setDefaultCategoryId((prev) => (prev === cat.id ? '' : cat.id))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    defaultCategoryId === cat.id && styles.chipTextActive,
                  ]}
                >
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

        {/* ── CUENTA ── */}
        <Text style={styles.sectionLabel}>CUENTA</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    fontWeight: '500',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  fieldLabelTop: {
    marginTop: 14,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: theme.colors.text,
  },
  hint: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 14,
  },
  readOnly: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  saveBtn: {
    marginTop: 14,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnTop: {
    marginTop: 16,
  },
  saveBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chipScroll: {
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 2,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  linkIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBody: {
    flex: 1,
  },
  linkText: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '600',
  },
  linkSubText: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '500',
    marginTop: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1.5,
    borderColor: theme.colors.dangerMid,
    borderRadius: 16,
    paddingVertical: 14,
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: 15,
    fontWeight: '700',
  },
});
