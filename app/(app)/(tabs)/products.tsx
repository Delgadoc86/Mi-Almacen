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
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import { importInitialProducts, declineInitialProducts } from '@/services/importInitialProducts';
import { normalizeText } from '@/utils/text';
import { theme } from '@/theme';

export default function ProductsScreen() {
  const router = useRouter();
  const { products, loading } = useProducts();
  const { categories } = useCategories();
  const { business, refreshBusiness } = useAuth();

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
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Productos</Text>
          <View style={styles.headerActions}>
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
              onPress={() => router.push('/products/new')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar producto..." />

        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {categoryOptions.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : showInitialOffer ? (
          <View style={styles.offerWrap}>
            <View style={styles.offerIconWrap}>
              <Ionicons name="storefront-outline" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.offerTitle}>¿Querés empezar con una lista inicial?</Text>
            <Text style={styles.offerSubtitle}>
              Cargamos productos comunes de almacén con costo y precio sugerido. Después podés
              editar, borrar o agregar lo que quieras.
            </Text>
            <TouchableOpacity
              style={[styles.offerPrimaryBtn, importing && styles.btnDisabled]}
              onPress={handleImport}
              disabled={importing}
              activeOpacity={0.85}
            >
              {importing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.offerPrimaryBtnText}>Cargar lista inicial</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.offerSecondaryBtn}
              onPress={handleDecline}
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
            onAction={() => router.push('/products/new')}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  fab: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 7,
    paddingBottom: 12,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
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
  loader: { marginTop: 40 },
  list: { paddingBottom: 20 },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  pdfBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },

  // ── Lista inicial offer ───────────────────────────────────
  offerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
    gap: 12,
  },
  offerIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  offerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  offerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  offerPrimaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  offerPrimaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  offerSecondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  offerSecondaryBtnText: {
    fontSize: 14,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
});
