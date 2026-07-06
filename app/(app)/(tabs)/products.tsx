import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/SearchBar';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { ConnectionErrorScreen } from '@/components/ConnectionErrorScreen';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import { useWriteGuard } from '@/hooks/useWriteGuard';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';
import { importInitialProducts, declineInitialProducts } from '@/services/importInitialProducts';
import { normalizeText } from '@/utils/text';
import { theme } from '@/theme';
import { Button, Chip, IconChip, ScreenHeader } from '@/components/ui';
import { PlanRestrictionDialog } from '@/components/PlanRestrictionDialog';

export default function ProductsScreen() {
  const router = useRouter();
  const { products, loading, retry } = useProducts();
  const loadingTimedOut = useLoadingTimeout(loading);
  const { categories } = useCategories();
  const { business, refreshBusiness } = useAuth();
  const { requireWrite, restrictionMessage, dismissRestriction } = useWriteGuard();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [importing, setImporting] = useState(false);

  const showInitialOffer =
    !loading && products.length === 0 && !business?.importedInitialProducts;

  async function handleImport() {
    if (!business?.id) return;
    setImporting(true);
    try {
      const count = await importInitialProducts(business.id);
      await refreshBusiness();
      Alert.alert(
        'Lista cargada',
        `Se importaron ${count} producto${count !== 1 ? 's' : ''} a tu catálogo. Podés editarlos o borrarlos cuando quieras.`,
      );
    } catch {
      Alert.alert('Error', 'No se pudo cargar la lista. Intentá de nuevo.');
    } finally {
      setImporting(false);
    }
  }

  async function handleDecline() {
    if (!business?.id) return;
    try {
      await declineInitialProducts(business.id);
      await refreshBusiness();
    } catch {
      // Non-blocking: worst case the offer shows again next time
    }
  }

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const categoryOptions = useMemo(
    () => [{ id: 'all', name: 'Todas' }, ...categories.map((c) => ({ id: c.id, name: c.name }))],
    [categories],
  );

  const filtered = useMemo(() => {
    const q = normalizeText(search);
    return products.filter((p) => {
      const matchName = !q || normalizeText(p.name).includes(q);
      const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      return matchName && matchCategory;
    });
  }, [products, search, selectedCategory]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <ScreenHeader
          title="Productos"
          right={
            <>
              {!search.trim() && (
                <TouchableOpacity
                  style={styles.pdfBtn}
                  onPress={() => router.push('/products/prices')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.pdfBtnText}>PDF precios</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.fab}
                onPress={() => requireWrite(() => router.push('/products/new'))}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </>
          }
        />
        <View style={styles.headerSpacer} />

        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar producto..." />

        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {categoryOptions.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                active={selectedCategory === cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={styles.chipSpacing}
              />
            ))}
          </ScrollView>
        )}

        {loading && loadingTimedOut ? (
          <ConnectionErrorScreen onRetry={retry} />
        ) : loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : showInitialOffer ? (
          <View style={styles.offerWrap}>
            <IconChip icon="storefront-outline" size="lg" tone="primary" style={styles.offerIconWrap} />
            <Text style={styles.offerTitle}>¿Querés empezar con una lista inicial?</Text>
            <Text style={styles.offerSubtitle}>
              Cargamos productos comunes de almacén con costo y precio sugerido. Después podés
              editar, borrar o agregar lo que quieras.
            </Text>
            <Button
              label="Cargar lista inicial"
              onPress={() => requireWrite(handleImport)}
              loading={importing}
              style={styles.offerPrimaryBtn}
            />
            <TouchableOpacity
              style={styles.offerSecondaryBtn}
              onPress={() => requireWrite(handleDecline)}
              disabled={importing}
              activeOpacity={0.7}
            >
              <Text style={styles.offerSecondaryBtnText}>Empezar desde cero</Text>
            </TouchableOpacity>
          </View>
        ) : products.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title="Sin productos todavía"
            subtitle="Agregá tu primer producto para empezar a gestionar tu catálogo."
            actionLabel="Agregar producto"
            onAction={() => requireWrite(() => router.push('/products/new'))}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="Sin resultados"
            subtitle="Probá con otro nombre o categoría."
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                category={categoryMap[item.categoryId]}
                onPress={() => router.push(`/products/${item.id}`)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
      <PlanRestrictionDialog message={restrictionMessage} onDismiss={dismissRestriction} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  headerSpacer: { height: theme.spacing.md },
  fab: {
    backgroundColor: theme.colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  chipRow: {
    flexDirection: 'row',
    paddingBottom: theme.spacing.md,
  },
  chipSpacing: {
    marginRight: 7,
  },
  loader: { marginTop: 40 },
  list: { paddingBottom: theme.spacing.xl },

  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm + 2,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  pdfBtnText: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },

  offerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  offerIconWrap: {
    marginBottom: 4,
  },
  offerTitle: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h2,
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  offerSubtitle: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  offerPrimaryBtn: {
    alignSelf: 'stretch',
  },
  offerSecondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.lg,
  },
  offerSecondaryBtnText: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.body,
    color: theme.colors.muted,
  },
});
