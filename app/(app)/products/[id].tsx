import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { deleteField } from 'firebase/firestore';
import type { UpdateData } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { getProduct, updateProduct, deleteProduct } from '@/services/products';
import { calculatePrice } from '@/utils/pricing';
import { ROUND_OPTIONS } from '@/constants';
import { theme } from '@/theme';
import type { Product, ProductType, RoundTo } from '@/models';

const TYPE_OPTIONS: { label: string; value: ProductType }[] = [
  { label: 'Por unidad', value: 'unidad' },
  { label: 'Por caja / pack', value: 'pack' },
  { label: 'Por peso', value: 'peso' },
];

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userProfile } = useAuth();
  const { categories } = useCategories();

  const [product, setProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(true);

  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('unidad');
  const [categoryId, setCategoryId] = useState('');
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState('');
  const [roundTo, setRoundTo] = useState<RoundTo>(1);
  const [unitsPerPack, setUnitsPerPack] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [salePriceEdited, setSalePriceEdited] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!userProfile?.businessId || !id) return;
    getProduct(userProfile.businessId, id)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setProductLoading(false));
  }, [userProfile?.businessId, id]);

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setType(product.type);
    setCategoryId(product.categoryId);
    setCost(String(product.cost));
    setMargin(String(product.margin));
    setRoundTo(product.roundTo);
    setUnitsPerPack(product.unitsPerPack ? String(product.unitsPerPack) : '');
    setSalePrice(String(product.salePrice ?? product.price));
    setSalePriceEdited(true);
  }, [product]);

  const costNum = parseFloat(cost) || 0;
  const marginNum = parseFloat(margin) || 0;
  const unitsNum = parseInt(unitsPerPack, 10) || 0;
  const suggestedPrice = calculatePrice(
    costNum,
    marginNum,
    roundTo,
    type,
    type === 'pack' ? unitsNum : undefined,
  );

  useEffect(() => {
    if (!salePriceEdited && suggestedPrice > 0) {
      setSalePrice(String(suggestedPrice));
    }
  }, [suggestedPrice, salePriceEdited]);

  function handleSalePriceChange(text: string) {
    setSalePrice(text);
    setSalePriceEdited(true);
  }

  function resetSalePrice() {
    setSalePrice(String(suggestedPrice));
    setSalePriceEdited(false);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }
    if (costNum <= 0) {
      Alert.alert('Error', 'El costo debe ser mayor a 0.');
      return;
    }
    if (marginNum < 0) {
      Alert.alert('Error', 'El margen no puede ser negativo.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Error', 'Seleccioná una categoría.');
      return;
    }
    if (type === 'pack' && unitsNum <= 0) {
      Alert.alert('Error', 'Para packs, ingresá la cantidad de unidades.');
      return;
    }
    if (!userProfile?.businessId || !id) return;

    const salePriceNum = parseFloat(salePrice) || suggestedPrice;

    const updateData: UpdateData<Product> = {
      name: name.trim(),
      type,
      categoryId,
      cost: costNum,
      margin: marginNum,
      roundTo,
      price: suggestedPrice,
      suggestedPrice,
      salePrice: salePriceNum,
    };

    if (type === 'pack' && unitsNum > 0) {
      updateData.unitsPerPack = unitsNum;
    } else {
      updateData.unitsPerPack = deleteField();
    }

    if (type !== 'peso') {
      updateData.unit = deleteField();
      updateData.saleUnitLabel = deleteField();
      updateData.baseWeightGrams = deleteField();
    }

    setSaving(true);
    try {
      await updateProduct(userProfile.businessId, id, updateData);
      router.back();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el producto.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Eliminar producto',
      `¿Eliminás "${name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!userProfile?.businessId || !id) return;
            setDeleting(true);
            try {
              await deleteProduct(userProfile.businessId, id);
              router.back();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el producto.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  if (productLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Producto no encontrado.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.fieldLabel}>Nombre *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Aceite Natura 1 lt"
          placeholderTextColor={theme.colors.muted}
          maxLength={80}
          autoCapitalize="sentences"
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>Tipo *</Text>
        <View style={styles.chipRow}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, type === opt.value && styles.chipActive]}
              onPress={() => setType(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, type === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Categoría *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRowScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, categoryId === cat.id && styles.chipActive]}
              onPress={() => setCategoryId(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.fieldLabel}>Costo (ARS) *</Text>
        <TextInput
          style={styles.input}
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={theme.colors.muted}
        />

        {type === 'pack' && (
          <>
            <Text style={styles.fieldLabel}>Unidades por caja / pack *</Text>
            <TextInput
              style={styles.input}
              value={unitsPerPack}
              onChangeText={setUnitsPerPack}
              keyboardType="number-pad"
              placeholder="Ej: 12"
              placeholderTextColor={theme.colors.muted}
            />
          </>
        )}

        <Text style={styles.fieldLabel}>Margen de ganancia (%)</Text>
        <TextInput
          style={styles.input}
          value={margin}
          onChangeText={setMargin}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={styles.fieldLabel}>Redondeo del precio final *</Text>
        <Text style={styles.fieldHint}>El precio calculado se redondeará al valor elegido.</Text>
        <View style={styles.chipRow}>
          {ROUND_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, roundTo === opt.value && styles.chipActive]}
              onPress={() => setRoundTo(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, roundTo === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {costNum > 0 && (
          <>
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Precio sugerido</Text>
              <Text style={styles.previewPrice}>${suggestedPrice.toLocaleString('es-AR')}</Text>
              {type === 'pack' && unitsNum > 0 && (
                <Text style={styles.previewSub}>
                  Costo unitario: ${(costNum / unitsNum).toFixed(2)}
                </Text>
              )}
            </View>

            <Text style={styles.fieldLabel}>Precio de venta *</Text>
            <TextInput
              style={styles.input}
              value={salePrice}
              onChangeText={handleSalePriceChange}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.colors.muted}
            />
            {suggestedPrice > 0 && salePrice !== String(suggestedPrice) && (
              <TouchableOpacity style={styles.resetBtn} onPress={resetSalePrice} activeOpacity={0.7}>
                <Text style={styles.resetBtnText}>
                  Usar precio sugerido (${suggestedPrice.toLocaleString('es-AR')})
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, (saving || deleting) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving || deleting}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteBtn, (saving || deleting) && styles.btnDisabled]}
          onPress={confirmDelete}
          disabled={saving || deleting}
          activeOpacity={0.85}
        >
          {deleting ? (
            <ActivityIndicator color={theme.colors.error} size="small" />
          ) : (
            <Text style={styles.deleteBtnText}>Eliminar producto</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  notFound: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  fieldHint: {
    fontSize: 11,
    color: theme.colors.muted,
    fontWeight: '500',
    marginTop: -4,
    marginBottom: 10,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chipRowScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    marginBottom: 12,
  },
  chip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
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
  preview: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.primaryMid,
  },
  previewLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  previewPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -1,
  },
  previewSub: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 4,
    fontWeight: '500',
  },
  resetBtn: {
    alignSelf: 'flex-start',
    marginTop: -8,
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryMid,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    minHeight: 54,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  deleteBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.dangerMid,
    backgroundColor: theme.colors.dangerLight,
    minHeight: 54,
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '700',
  },
});
