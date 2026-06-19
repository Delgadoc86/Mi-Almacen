import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { buildPdfHtml } from '@/utils/pdfTemplate';
import { theme } from '@/theme';

export default function PdfScreen() {
  const { business } = useAuth();
  const { products } = useProducts();
  const { categories } = useCategories();
  const [generating, setGenerating] = useState(false);

  const productCount = products.length;
  const canGenerate = productCount > 0 && !generating;

  async function handleGenerate() {
    if (productCount === 0) {
      Alert.alert('Sin productos', 'Agregá productos antes de generar la lista de precios.');
      return;
    }

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      Alert.alert('No disponible', 'El compartir archivos no está disponible en este dispositivo.');
      return;
    }

    setGenerating(true);
    try {
      const html = buildPdfHtml(business?.name ?? 'Mi Almacén', products, categories);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartir lista de precios',
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF. Intentá de nuevo.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ScreenContainer scrollable>
      <Text style={styles.title}>Lista de precios</Text>
      <Text style={styles.subtitle}>Generá y compartí tu catálogo en PDF.</Text>

      {productCount === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Sin productos todavía"
          subtitle="Cargá productos desde la pestaña Productos para poder generar la lista de precios."
        />
      ) : (
        <>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="document-text" size={26} color={theme.colors.primary} />
              </View>
              <View style={styles.infoBody}>
                <Text style={styles.infoCount}>
                  {productCount} {productCount === 1 ? 'producto' : 'productos'}
                </Text>
                <Text style={styles.infoDesc}>ordenados por categoría</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <Text style={styles.infoNote}>
              Incluye nombre, costo y precio de venta. Podés compartirlo por WhatsApp, email o
              imprimirlo.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.generateBtn, !canGenerate && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={!canGenerate}
            activeOpacity={0.8}
          >
            {generating ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.generateBtnText}>Generando PDF...</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="share-outline" size={20} color="#fff" />
                <Text style={styles.generateBtnText}>Generar y compartir</Text>
              </View>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBody: { flex: 1 },
  infoCount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  infoDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 12,
  },
  infoNote: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  generateBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
  },
  generateBtnDisabled: {
    opacity: 0.4,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
