import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { deleteField } from 'firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useWriteGuard } from '@/hooks/useWriteGuard';
import { updateBusiness, updateBusinessPreferences } from '@/services/userProfile';
import { exportBusinessData } from '@/services/exportData';
import { requestAccountDeletion } from '@/services/deleteAccount';
import { ROUND_OPTIONS, DEFAULT_MARGIN_MAX } from '@/constants';
import { theme } from '@/theme';
import { Button, Card, Chip, ConfirmDialog, InlineMessage, ListRow, TextField, Toast } from '@/components/ui';
import { PlanBanner, HEALTHY_PLAN_KINDS, openSupportSite } from '@/components/PlanBanner';
import { PlanRestrictionDialog } from '@/components/PlanRestrictionDialog';
import { usePlanStatus } from '@/hooks/usePlanStatus';
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
  const { business, userProfile, isAdmin, logout, refreshBusiness } = useAuth();
  const { categories } = useCategories();
  const { requireWrite, restrictionMessage, dismissRestriction } = useWriteGuard();
  const planStatus = usePlanStatus();

  const [businessName, setBusinessName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [defaultMargin, setDefaultMargin] = useState('');
  const [defaultRoundTo, setDefaultRoundTo] = useState<RoundTo | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [confirmDeletionVisible, setConfirmDeletionVisible] = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

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

  function showToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
  }

  async function handleSaveName() {
    const trimmed = businessName.trim();
    if (!trimmed) { Alert.alert('Error', 'El nombre no puede estar vacío.'); return; }
    if (!userProfile) return;
    setSavingName(true);
    try {
      await updateBusiness(userProfile.businessId, trimmed);
      await refreshBusiness();
      showToast('Nombre actualizado');
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
      showToast('Preferencias actualizadas');
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

  async function handleRequestDeletion() {
    setConfirmDeletionVisible(false);
    if (!userProfile) return;
    setRequestingDeletion(true);
    try {
      await requestAccountDeletion(userProfile.businessId);
      await refreshBusiness();
      showToast('Solicitud enviada. Te vamos a contactar.');
    } catch {
      Alert.alert('Error', 'No se pudo enviar la solicitud. Intentá de nuevo.');
    } finally {
      setRequestingDeletion(false);
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

        <PlanBanner style={styles.planBanner} />

        {HEALTHY_PLAN_KINDS.has(planStatus.kind) && (
          <Card style={styles.linkCard}>
            <ListRow
              icon={planStatus.kind === 'pro' ? 'star' : 'star-outline'}
              iconTone={planStatus.kind === 'pro' ? 'success' : 'primary'}
              title="Plan"
              subtitle={planStatus.kind === 'pro' ? 'Pro activo' : planStatus.message}
              onPress={planStatus.kind === 'trial-active' ? openSupportSite : undefined}
              showChevron={planStatus.kind === 'trial-active'}
            />
          </Card>
        )}

        <Text style={styles.sectionLabel}>MI COMERCIO</Text>
        <Card style={styles.card}>
          <TextField
            label="Nombre del negocio"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Nombre del comercio"
            autoCapitalize="words"
            returnKeyType="done"
          />
          <Button
            label="Guardar nombre"
            onPress={() => requireWrite(handleSaveName)}
            loading={savingName}
            style={styles.saveBtn}
          />

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
        </Card>

        <Text style={styles.sectionLabel}>PRODUCTOS</Text>
        <Card style={styles.card}>
          <TextField
            label="Margen por defecto (%)"
            value={defaultMargin}
            onChangeText={setDefaultMargin}
            keyboardType="decimal-pad"
            placeholder="Sin margen por defecto"
            helperText={`0% — ${DEFAULT_MARGIN_MAX}% máximo`}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelTop]}>Redondeo por defecto</Text>
          <View style={styles.toggleRow}>
            {ROUND_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                active={defaultRoundTo === opt.value}
                onPress={() => setDefaultRoundTo((prev) => (prev === opt.value ? null : opt.value))}
              />
            ))}
          </View>

          <Text style={[styles.fieldLabel, styles.fieldLabelTop]}>Categoría por defecto</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                active={defaultCategoryId === cat.id}
                onPress={() => setDefaultCategoryId((prev) => (prev === cat.id ? '' : cat.id))}
                style={styles.chipSpacing}
              />
            ))}
          </ScrollView>
          {defaultCategoryId ? (
            <Text style={styles.hint}>
              Categoría seleccionada: {categories.find((c) => c.id === defaultCategoryId)?.name}
            </Text>
          ) : null}

          <Button
            label="Guardar preferencias"
            onPress={() => requireWrite(handleSavePrefs)}
            loading={savingPrefs}
            style={styles.saveBtnTop}
          />
        </Card>

        <Text style={styles.sectionLabel}>CATEGORÍAS</Text>
        <Card style={styles.linkCard}>
          <ListRow
            icon="layers-outline"
            iconTone="primary"
            title="Administrar categorías"
            subtitle={
              categories.length === 0
                ? 'Sin categorías creadas'
                : `${categories.length} ${categories.length === 1 ? 'categoría' : 'categorías'}`
            }
            onPress={() => router.push('/categories')}
          />
        </Card>

        <Text style={styles.sectionLabel}>AYUDA</Text>
        <Card style={styles.linkCard}>
          <ListRow
            icon="map-outline"
            iconTone="primary"
            title="Ver guía inicial"
            subtitle="Los primeros pasos para usar Mi Almacén"
            onPress={() => router.push('/onboarding?from=settings')}
          />
          <View style={styles.divider} />
          <ListRow
            icon="chatbubble-ellipses-outline"
            iconTone="primary"
            title="Contactar soporte"
            subtitle="Consultas, activar Pro o reportar un problema"
            onPress={openSupportSite}
          />
        </Card>

        <Text style={styles.sectionLabel}>MIS DATOS</Text>

        {showExportReminder && (
          <InlineMessage
            variant="warning"
            icon="cloud-download-outline"
            text={
              exportDaysAgo === null
                ? 'Nunca exportaste tus datos. Guardá un backup por si acaso.'
                : `Hace ${exportDaysAgo} días que no exportás. ¿Todo bien?`
            }
            style={styles.reminderBanner}
          />
        )}

        <Card style={styles.card}>
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

          <Button
            label="Exportar mis datos (JSON)"
            variant="outline"
            icon="cloud-download-outline"
            onPress={handleExport}
            loading={exporting}
            style={styles.saveBtn}
          />
        </Card>

        <Text style={styles.sectionLabel}>CUENTA</Text>
        <Button
          label="Cerrar sesión"
          variant="danger"
          icon="log-out-outline"
          onPress={() => setConfirmLogoutVisible(true)}
          style={styles.logoutBtn}
        />

        <Text style={[styles.sectionLabel, styles.dangerLabel]}>ZONA PELIGROSA</Text>
        <View style={styles.dangerCard}>
          {business?.deletionRequest ? (
            <>
              <Text style={styles.dangerTitle}>Solicitud de eliminación enviada</Text>
              <Text style={styles.dangerDesc}>
                {formatLastLogin(business.deletionRequest.requestedAt)
                  ? `Enviada el ${formatLastLogin(business.deletionRequest.requestedAt)}. `
                  : ''}
                Nuestro equipo te va a contactar para confirmar el borrado de tus datos.
                Mientras tanto tu cuenta sigue activa y podés seguir usándola con normalidad.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.dangerTitle}>Eliminar cuenta y todos los datos</Text>
              <Text style={styles.dangerDesc}>
                Enviá una solicitud y nuestro equipo de soporte la procesa manualmente.
                Tu cuenta sigue activa hasta que se confirme el borrado — no se borra nada
                al instante.
              </Text>
              <TouchableOpacity
                style={[styles.deleteBtn, requestingDeletion && styles.saveBtnDisabled]}
                onPress={() => setConfirmDeletionVisible(true)}
                disabled={requestingDeletion}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                <Text style={styles.deleteBtnText}>
                  {requestingDeletion ? 'Enviando...' : 'Solicitar eliminación de cuenta'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {isAdmin ? (
          <>
            <Text style={styles.sectionLabel}>ADMINISTRACIÓN</Text>
            <Card style={styles.linkCard}>
              <ListRow
                icon="shield-checkmark-outline"
                iconTone="primary"
                title="Panel de administración"
                subtitle="Solo visible para tu cuenta"
                onPress={() => router.push('/admin')}
              />
            </Card>
          </>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmLogoutVisible}
        title="Cerrar sesión"
        message="¿Querés salir de tu cuenta?"
        confirmLabel="Cerrar sesión"
        variant="destructive"
        onConfirm={() => { setConfirmLogoutVisible(false); logout(); }}
        onCancel={() => setConfirmLogoutVisible(false)}
      />

      <ConfirmDialog
        visible={confirmDeletionVisible}
        title="Solicitar eliminación de cuenta"
        message={`Le vamos a avisar a soporte que "${business?.name ?? 'tu negocio'}" quiere eliminar su cuenta. No se borra nada todavía — te vamos a contactar para confirmarlo.`}
        confirmLabel="Enviar solicitud"
        variant="destructive"
        loading={requestingDeletion}
        onConfirm={handleRequestDeletion}
        onCancel={() => setConfirmDeletionVisible(false)}
      />

      <Toast
        visible={toastVisible}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />
      <PlanRestrictionDialog message={restrictionMessage} onDismiss={dismissRestriction} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xl, paddingBottom: 60 },

  pageTitle: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h1,
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.muted,
    marginBottom: theme.spacing.xxl,
  },

  sectionLabel: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  dangerLabel: { color: theme.colors.error },
  planBanner: { marginBottom: theme.spacing.xl },

  card: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  linkCard: {
    padding: 0,
    marginBottom: theme.spacing.xl,
    overflow: 'hidden',
  },
  fieldLabel: { fontFamily: theme.fontFamily.semibold, fontSize: theme.font.caption, color: theme.colors.textSecondary, marginBottom: 6 },
  fieldLabelTop: { marginTop: theme.spacing.md + 2 },
  hint: { fontFamily: theme.fontFamily.medium, fontSize: theme.font.micro, color: theme.colors.muted, marginTop: 4 },
  divider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing.md + 2 },
  readOnly: { fontFamily: theme.fontFamily.medium, fontSize: theme.font.body, color: theme.colors.textSecondary },

  saveBtn: { marginTop: theme.spacing.md + 2 },
  saveBtnTop: { marginTop: theme.spacing.lg },
  saveBtnDisabled: { opacity: 0.5 },

  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chipScroll: { flexDirection: 'row', paddingVertical: 2 },
  chipSpacing: { marginRight: 7 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { marginTop: 2 },
  infoContent: { flex: 1 },

  reminderBanner: { marginBottom: 8 },
  exportInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  exportInfoText: {
    flex: 1, fontFamily: theme.fontFamily.medium, fontSize: theme.font.caption, color: theme.colors.muted, lineHeight: 18,
  },

  logoutBtn: { marginBottom: theme.spacing.xl },

  dangerCard: {
    backgroundColor: theme.colors.dangerLight, borderRadius: theme.radius.cardLg, padding: theme.spacing.lg,
    borderWidth: 1.5, borderColor: theme.colors.dangerMid, marginBottom: theme.spacing.xl,
  },
  dangerTitle: { fontFamily: theme.fontFamily.bold, fontSize: theme.font.body, color: theme.colors.error, marginBottom: 6 },
  dangerDesc: {
    fontFamily: theme.fontFamily.medium, fontSize: theme.font.caption, color: theme.colors.error, lineHeight: 19,
    opacity: 0.8, marginBottom: 8,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: theme.colors.dangerMid,
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, paddingVertical: theme.spacing.md + 2,
  },
  deleteBtnText: { fontFamily: theme.fontFamily.bold, fontSize: theme.font.body, color: theme.colors.error },
});
