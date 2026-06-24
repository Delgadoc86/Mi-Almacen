import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { buildPdfHtml, generatePdfFilename } from '@/utils/pdfTemplate';
import { theme } from '@/theme';

type SavedPdf = {
  uri: string;
  filename: string;
};

export default function PdfScreen() {
  const { business } = useAuth();
  const { products } = useProducts();
  const { categories } = useCategories();

  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<SavedPdf | null>(null);

  const productCount = products.length;
  const categoryCount = categories.length;
  const businessName = business?.name ?? 'Mi Almacén';

  async function handleGenerate() {
    if (productCount === 0) {
      Alert.alert('Sin productos', 'Agregá productos antes de generar el PDF.');
      return;
    }
    if (!FileSystem.documentDirectory) {
      Alert.alert('Error', 'No se pudo acceder al almacenamiento del dispositivo.');
      return;
    }

    setGenerating(true);
    setSaved(null);
    try {
      const html = buildPdfHtml(businessName, products, categories);
      const { uri: tmpUri } = await Print.printToFileAsync({ html, base64: false });

      const filename = `${generatePdfFilename(businessName)}.pdf`;
      const finalUri = `${FileSystem.documentDirectory}${filename}`;

      const info = await FileSystem.getInfoAsync(finalUri);
      if (info.exists) {
        await FileSystem.deleteAsync(finalUri, { idempotent: true });
      }
      await FileSystem.copyAsync({ from: tmpUri, to: finalUri });

      setSaved({ uri: finalUri, filename });
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF. Intentá de nuevo.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleOpen() {
    if (!saved) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('No disponible', 'No hay visor de PDF disponible en este dispositivo.');
      return;
    }
    setLoading(true);
    try {
      await Sharing.shareAsync(saved.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Error', 'No se pudo abrir el PDF.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint() {
    if (!saved) return;
    setLoading(true);
    try {
      await Print.printAsync({ uri: saved.uri });
    } catch {
      Alert.alert('Error', 'No se pudo enviar a imprimir.');
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!saved) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('No disponible', 'Compartir no está disponible en este dispositivo.');
      return;
    }
    setLoading(true);
    try {
      await Sharing.shareAsync(saved.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartir control de precios',
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Error', 'No se pudo compartir el PDF.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Control de precios</Text>
        <Text style={styles.subtitle}>Documento interno con costos y precios de venta.</Text>

        {productCount === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="Sin productos todavía"
            subtitle="Cargá productos desde la pestaña Productos para poder generar la lista de precios."
          />
        ) : (
          <>
            {/* Summary card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIconWrap}>
                  <Ionicons name="document-text" size={26} color={theme.colors.primary} />
                </View>
                <View style={styles.summaryBody}>
                  <Text style={styles.summaryCount}>
                    {productCount} {productCount === 1 ? 'producto' : 'productos'}
                  </Text>
                  <Text style={styles.summaryDesc}>
                    {categoryCount > 0
                      ? `en ${categoryCount} ${categoryCount === 1 ? 'categoría' : 'categorías'}`
                      : 'sin categoría asignada'}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <Text style={styles.summaryNote}>
                Columna{' '}
                <Text style={styles.summaryNoteEm}>Nuevo precio</Text> vacía para anotar a mano.
                Escala tipográfica adaptada a la cantidad de productos.
              </Text>
            </View>

            {/* Step 1 — generate */}
            {!saved && (
              <TouchableOpacity
                style={[styles.primaryBtn, generating && styles.btnOff]}
                onPress={handleGenerate}
                disabled={generating}
                activeOpacity={0.8}
              >
                {generating ? (
                  <View style={styles.btnRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.primaryBtnLabel}>Generando PDF...</Text>
                  </View>
                ) : (
                  <View style={styles.btnRow}>
                    <Ionicons name="print-outline" size={22} color="#fff" />
                    <Text style={styles.primaryBtnLabel}>Generar PDF</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Step 2 — actions */}
            {saved && (
              <View style={styles.resultCard}>
                {/* Success + filename */}
                <View style={styles.successRow}>
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                  <Text style={styles.successLabel}>PDF generado correctamente</Text>
                </View>

                <View style={styles.fileBox}>
                  <Text style={styles.fileBoxTitle}>Archivo</Text>
                  <Text style={styles.fileBoxName} numberOfLines={2}>
                    {saved.filename}
                  </Text>
                  <View style={styles.fileBoxDivider} />
                  <Text style={styles.fileBoxNote}>
                    PDF guardado dentro de la app. Podés abrirlo, imprimirlo o compartirlo.
                  </Text>
                </View>

                {/* Action buttons */}
                <TouchableOpacity
                  style={[styles.outlineBtn, loading && styles.btnOff]}
                  onPress={handleOpen}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <View style={styles.btnRow}>
                    <Ionicons name="eye-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.outlineBtnLabel}>Abrir PDF</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.outlineBtn, loading && styles.btnOff]}
                  onPress={handlePrint}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <View style={styles.btnRow}>
                      <ActivityIndicator color={theme.colors.primary} size="small" />
                      <Text style={styles.outlineBtnLabel}>Un momento...</Text>
                    </View>
                  ) : (
                    <View style={styles.btnRow}>
                      <Ionicons name="print-outline" size={20} color={theme.colors.primary} />
                      <Text style={styles.outlineBtnLabel}>Imprimir</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.btnOff]}
                  onPress={handleShare}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <View style={styles.btnRow}>
                    <Ionicons name="share-outline" size={20} color="#fff" />
                    <Text style={styles.primaryBtnLabel}>Compartir PDF</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => setSaved(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ghostBtnLabel}>Generar de nuevo</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 24,
    fontWeight: '500',
  },

  // Summary card
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBody: { flex: 1 },
  summaryCount: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  summaryDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  divider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 14 },
  summaryNote: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },
  summaryNoteEm: { fontWeight: '700', color: theme.colors.text },

  // Buttons shared
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnOff: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },

  // Primary (filled)
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 0,
  },
  primaryBtnLabel: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Result card
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  successLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.success },

  // File info box
  fileBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  fileBoxTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fileBoxName: { fontSize: 13, fontWeight: '600', color: theme.colors.text, lineHeight: 18 },
  fileBoxDivider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 10 },
  fileBoxNote: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    fontWeight: '500',
  },

  // Outline button
  outlineBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  outlineBtnLabel: { color: theme.colors.primary, fontSize: 15, fontWeight: '700' },

  // Ghost (text link)
  ghostBtn: { alignItems: 'center', paddingVertical: 6 },
  ghostBtnLabel: { fontSize: 14, color: theme.colors.muted, fontWeight: '600' },
});
