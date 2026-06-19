import { useState } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { createProduct } from '@/services/products';
import { calculatePrice } from '@/utils/pricing';
import { ROUND_OPTIONS } from '@/constants';
import { theme } from '@/theme';
import type { ProductType, RoundTo } from '@/models';

const TYPE_OPTIONS: { label: string; value: ProductType }[] = [
  { label: 'Unidad', value: 'unidad' },
  { label: 'Pack', value: 'pack' },
  { label: 'Peso', value: 'peso' },
];

export default function NewProductScreen() {
  const router = useRouter();
  const { userProfile, business } = useAuth();
  const { categories } = useCategories();

  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('unidad');
  const [categoryId, setCategoryId] = useState(business?.defaultCategoryId ?? '');
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState(
    business?.defaultMargin !== undefined ? String(business.defaultMargin) : '',
  );
  const [roundTo, setRoundTo] = useState<RoundTo>(business?.defaultRoundTo ?? 1);
  const [unitsPerPack, setUnitsPerPack] = useState('');
  const [saving, setSaving] = useState(false);

  const costNum = parseFloat(cost) || 0;
  const marginNum = parseFloat(margin) || 0;
  const unitsNum = parseInt(unitsPerPack, 10) || 0;
  const price = calculatePrice(
    costNum,
    marginNum,
    roundTo,
    type,
    type === 'pack' ? unitsNum : undefined,
  );

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
    if (!userProfile?.businessId) return;

    setSaving(true);
    try {
      await createProduct(userProfile.businessId, {
        name: name.trim(),
        type,
        categoryId,
        cost: costNum,
        margin: marginNum,
        roundTo,
        price,
        ...(type === 'pack' && unitsNum > 0 ? { unitsPerPack: unitsNum } : {}),
      });
      router.back();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el producto. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Nombre *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ej: Aceite Natura 1 lt"
        placeholderTextColor={theme.colors.muted}
        maxLength={80}
        autoCapitalize="sentences"
      />

      <Text style={styles.label}>Tipo *</Text>
      <View style={styles.row}>
        {TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.toggleBtn, type === opt.value && styles.toggleBtnActive]}
            onPress={() => setType(opt.value)}
          >
            <Text style={[styles.toggleText, type === opt.value && styles.toggleTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Categoría *</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, categoryId === cat.id && styles.chipActive]}
            onPress={() => setCategoryId(cat.id)}
          >
            <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Costo (ARS) *</Text>
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
          <Text style={styles.label}>Unidades por pack *</Text>
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

      <Text style={styles.label}>Margen de ganancia (%)</Text>
      <TextInput
        style={styles.input}
        value={margin}
        onChangeText={setMargin}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={theme.colors.muted}
      />

      <Text style={styles.label}>Redondeo *</Text>
      <View style={styles.row}>
        {ROUND_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.toggleBtn, roundTo === opt.value && styles.toggleBtnActive]}
            onPress={() => setRoundTo(opt.value)}
          >
            <Text style={[styles.toggleText, roundTo === opt.value && styles.toggleTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {costNum > 0 && (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Precio de venta calculado</Text>
          <Text style={styles.previewPrice}>${price.toLocaleString('es-AR')}</Text>
          {type === 'pack' && unitsNum > 0 && (
            <Text style={styles.previewSub}>
              Costo unitario: ${(costNum / unitsNum).toFixed(2)}
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Guardar producto</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  toggleText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#fff',
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  preview: {
    marginTop: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  previewSub: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 4,
  },
  saveBtn: {
    marginTop: 28,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
