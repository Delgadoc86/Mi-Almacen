import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, TextField, Toast } from '@/components/ui';
import { theme } from '@/theme';
import { getUpdateInfo, saveUpdateInfo } from '@/services/appUpdate.service';

type Errors = Partial<Record<'latestVersion' | 'title' | 'message' | 'downloadUrl', string>>;

export default function AdminUpdateConfigScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNewDoc, setIsNewDoc] = useState(true);

  const [active, setActive] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');

  useEffect(() => {
    getUpdateInfo()
      .then((data) => {
        if (data) {
          setIsNewDoc(false);
          setActive(!!data.active);
          setLatestVersion(data.latestVersion ?? '');
          setTitle(data.title ?? '');
          setMessage(data.message ?? '');
          setDownloadUrl(data.downloadUrl ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, variant: 'success' | 'error') {
    setToastMessage(msg);
    setToastVariant(variant);
    setToastVisible(true);
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!/^\d+\.\d+\.\d+$/.test(latestVersion.trim())) {
      next.latestVersion = 'Formato esperado: X.X.X (ej: 1.0.7)';
    }
    if (!title.trim()) next.title = 'El título es obligatorio';
    if (!message.trim()) next.message = 'El mensaje es obligatorio';
    if (!/^https?:\/\/.+/.test(downloadUrl.trim())) {
      next.downloadUrl = 'Debe ser una URL válida (http:// o https://)';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await saveUpdateInfo(
        {
          active,
          latestVersion: latestVersion.trim(),
          title: title.trim(),
          message: message.trim(),
          downloadUrl: downloadUrl.trim(),
        },
        isNewDoc,
      );
      setIsNewDoc(false);
      showToast('Configuración de actualización guardada', 'success');
    } catch {
      showToast('No se pudo guardar. Intentá de nuevo.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.switchCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchLabel}>Aviso activo</Text>
              <Text style={styles.switchDesc}>
                Si está apagado, ningún usuario verá el aviso aunque haya una versión nueva.
              </Text>
            </View>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <TextField
            label="Última versión disponible (ej: 1.0.7)"
            value={latestVersion}
            onChangeText={setLatestVersion}
            error={errors.latestVersion}
            autoCapitalize="none"
            containerStyle={styles.field}
          />
          <TextField
            label="Título del aviso"
            value={title}
            onChangeText={setTitle}
            error={errors.title}
            containerStyle={styles.field}
          />
          <TextField
            label="Mensaje breve"
            value={message}
            onChangeText={setMessage}
            error={errors.message}
            multiline
            containerStyle={styles.field}
          />
          <TextField
            label="URL de descarga (tu web)"
            value={downloadUrl}
            onChangeText={setDownloadUrl}
            error={errors.downloadUrl}
            autoCapitalize="none"
            keyboardType="url"
            containerStyle={styles.field}
          />

          <Button label="Guardar configuración" onPress={handleSave} loading={saving} style={styles.saveBtn} />
        </Card>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        variant={toastVariant}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  loader: { marginTop: 40 },
  content: { padding: theme.spacing.xl, paddingBottom: 60 },
  switchCard: { padding: theme.spacing.lg, marginBottom: theme.spacing.xl },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchTextWrap: { flex: 1 },
  switchLabel: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.body,
    color: theme.colors.text,
  },
  switchDesc: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  card: { padding: theme.spacing.lg },
  field: { marginBottom: theme.spacing.md + 2 },
  saveBtn: { marginTop: theme.spacing.md },
});
