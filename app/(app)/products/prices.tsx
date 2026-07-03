import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { buildPdfHtml, generatePdfFilename } from '@/utils/pdfTemplate';
import { theme } from '@/theme';
import { Button, Card, Chip, IconChip } from '@/components/ui';

type SavedPdf = {
  uri: string;
  filename: string;
};

export default function PricesScreen() {
  const { business } = useAuth();
  const { products } = useProducts();
  const { categories } = useCategories();

  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<SavedPdf | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');

  const businessName = business?.name ?? 'Mi Almacén';

  const categoryOptions = useMemo(
    () => [{ id: 'all', name: 'Todas las categorías' }, ...categories],
    [categories],
  );
  const selectedCategory = selectedCategoryId === 'all'
    ? null
    : categories.find((c) => c.id === selectedCategoryId) ?? null;

  const filteredProducts = useMemo(
    () => (selectedCategoryId === 'all'
      ? products
      : products.filter((p) => p.categoryId === selectedCategoryId)),
    [products, selectedCategoryId],
  );
  const filteredCategories = selectedCategory ? [selectedCategory] : categories;

  const productCount = filteredProducts.length;
  const categoryCount = filteredCategories.length;

  function handleSelectCategory(id: string) {
    setSelectedCategoryId(id);
    setSaved(null);
  }

  async function handleGenerate() {
    if (productCount === 0) {
      Alert.alert(
        'Sin productos',
        selectedCategory
          ? `No hay productos cargados en "${selectedCategory.name}".`
          : 'Agregá productos antes de generar la lista.',
      );
      return;
    }
    if (!FileSystem.documentDirectory) {
      Alert.alert('Error', 'No se pudo acceder al almacenamiento del dispositivo.');
      return;
    }

    setGenerating(true);
    setSaved(null);
    try {
      const html = buildPdfHtml(businessName, filteredProducts, filteredCategories, selectedCategory?.name);
      const { uri: tmpUri } = await Print.printToFileAsync({ html, base64: false });

      const filename = `${generatePdfFilename(businessName, selectedCategory?.name)}.pdf`;
      const finalUri = `${FileSystem.documentDirectory}${filename}`;

      const info = await FileSystem.getInfoAsync(finalUri);
      if (info.exists) {
        await FileSystem.deleteAsync(finalUri, { idempotent: true });
      }
      await FileSystem.copyAsync({ from: tmpUri, to: finalUri });

      setSaved({ uri: finalUri, filename });
    } catch {
      Alert.alert('Error', 'No se pudo generar la lista. Intentá de nuevo.');
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
        dialogTitle: 'Compartir lista de precios',
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Error', 'No se pudo compartir el PDF.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {products.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="Sin productos todavía"
            subtitle="Cargá productos desde la pantalla Productos para poder generar la lista."
          />
        ) : (
          <>
            {categories.length > 0 && (
              <>
                <Text style={styles.filterLabel}>Categoría a imprimir</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {categoryOptions.map((cat) => (
                    <Chip
                      key={cat.id}
                      label={cat.name}
                      active={selectedCategoryId === cat.id}
                      onPress={() => handleSelectCategory(cat.id)}
                      style={styles.chipSpacing}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            <Card style={styles.summaryCard} variant="elevated">
              <View style={styles.summaryRow}>
                <IconChip icon="document-text" size="lg" tone="primary" />
                <View style={styles.summaryBody}>
                  <Text style={styles.summaryCount}>
                    {productCount} {productCount === 1 ? 'producto' : 'productos'}
                  </Text>
                  <Text style={styles.summaryDesc}>
                    {selectedCategory
                      ? selectedCategory.name
                      : categoryCount > 0
                        ? `en ${categoryCount} ${categoryCount === 1 ? 'categoría' : 'categorías'}`
                        : 'sin categoría asignada'}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <Text style={styles.summaryNote}>
                Columna{' '}
                <Text style={styles.summaryNoteEm}>Nuevo precio</Text> vacía para anotar a mano.
                Letra grande para encontrar productos rápido.
              </Text>
            </Card>

            {!saved && (
              <Button
                label={selectedCategory ? `Generar lista · ${selectedCategory.name}` : 'Generar lista completa'}
                icon="print-outline"
                onPress={handleGenerate}
                loading={generating}
                disabled={productCount === 0}
              />
            )}

            {saved && (
              <Card style={styles.resultCard} variant="elevated">
                <View style={styles.successRow}>
                  <IconChip icon="checkmark-circle" size="sm" tone="success" filled />
                  <Text style={styles.successLabel}>Lista generada correctamente</Text>
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

                <Button label="Abrir PDF" variant="outline" icon="eye-outline" onPress={handleOpen} disabled={loading} />
                <Button
                  label={loading ? 'Un momento...' : 'Imprimir'}
                  variant="outline"
                  icon="print-outline"
                  onPress={handlePrint}
                  loading={loading}
                />
                <Button label="Compartir PDF" icon="share-outline" onPress={handleShare} disabled={loading} />
                <Button label="Generar de nuevo" variant="ghost" onPress={() => setSaved(null)} />
              </Card>
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
  content: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xl, paddingBottom: 48 },

  filterLabel: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: theme.spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    paddingBottom: theme.spacing.lg,
  },
  chipSpacing: {
    marginRight: 8,
  },

  summaryCard: {
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryBody: { flex: 1 },
  summaryCount: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.h3,
    color: theme.colors.text,
  },
  summaryDesc: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 14 },
  summaryNote: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  summaryNoteEm: {
    fontFamily: theme.fontFamily.bold,
    color: theme.colors.text,
  },

  resultCard: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  successLabel: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.body,
    color: theme.colors.success,
  },

  fileBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  fileBoxTitle: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fileBoxName: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.caption,
    color: theme.colors.text,
    lineHeight: 18,
  },
  fileBoxDivider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 10 },
  fileBoxNote: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
});
