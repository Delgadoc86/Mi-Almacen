import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useWriteGuard } from '@/hooks/useWriteGuard';
import { createProduct } from '@/services/products';
import { calculatePrice } from '@/utils/pricing';
import { ROUND_OPTIONS } from '@/constants';
import { theme } from '@/theme';
import { AmountDisplay, Button, Card, Chip, TextField } from '@/components/ui';
import { PlanRestrictionDialog } from '@/components/PlanRestrictionDialog';
import type { ProductType, RoundTo } from '@/models';

const TYPE_OPTIONS: { label: string; value: ProductType }[] = [
  { label: 'Por unidad', value: 'unidad' },
  { label: 'Por caja / pack', value: 'pack' },
  { label: 'Por peso', value: 'peso' },
];

export default function NewProductScreen() {
  const router = useRouter();
  const { userProfile, business } = useAuth();
  const { categories } = useCategories();
  const { requireWrite, restrictionMessage, dismissRestriction } = useWriteGuard();

  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('unidad');
  const [categoryId, setCategoryId] = useState(business?.defaultCategoryId ?? '');
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState(
    business?.defaultMargin !== undefined ? String(business.defaultMargin) : '',
  );
  const [roundTo, setRoundTo] = useState<RoundTo>(business?.defaultRoundTo ?? 1);
  const [unitsPerPack, setUnitsPerPack] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [salePriceEdited, setSalePriceEdited] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (!userProfile?.businessId) return;

    const salePriceNum = parseFloat(salePrice) || suggestedPrice;

    setSaving(true);
    try {
      await createProduct(userProfile.businessId, {
        name: name.trim(),
        type,
        categoryId,
        cost: costNum,
        margin: marginNum,
        roundTo,
        price: suggestedPrice,
        suggestedPrice,
        salePrice: salePriceNum,
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
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextField
          label="Nombre *"
          value={name}
          onChangeText={setName}
          placeholder="Ej: Aceite Natura 1 lt"
          autoCapitalize="sentences"
          returnKeyType="next"
          containerStyle={styles.field}
        />

        <Text style={styles.fieldLabel}>Tipo *</Text>
        <View style={styles.chipRow}>
          {TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={type === opt.value}
              onPress={() => setType(opt.value)}
            />
          ))}
        </View>

        <Text style={styles.fieldLabel}>Categoría *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRowScroll}
        >
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              active={categoryId === cat.id}
              onPress={() => setCategoryId(cat.id)}
              style={styles.chipSpacing}
            />
          ))}
        </ScrollView>

        <TextField
          label="Costo (ARS) *"
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
          placeholder="0.00"
          containerStyle={styles.field}
        />

        {type === 'pack' && (
          <TextField
            label="Unidades por caja / pack *"
            value={unitsPerPack}
            onChangeText={setUnitsPerPack}
            keyboardType="number-pad"
            placeholder="Ej: 12"
            containerStyle={styles.field}
          />
        )}

        <TextField
          label="Margen de ganancia (%)"
          value={margin}
          onChangeText={setMargin}
          keyboardType="decimal-pad"
          placeholder="0"
          containerStyle={styles.field}
        />

        <Text style={styles.fieldLabel}>Redondeo del precio final *</Text>
        <Text style={styles.fieldHint}>El precio calculado se redondeará al valor elegido.</Text>
        <View style={styles.chipRow}>
          {ROUND_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={roundTo === opt.value}
              onPress={() => setRoundTo(opt.value)}
            />
          ))}
        </View>

        {costNum > 0 && (
          <>
            <Card style={styles.preview}>
              <Text style={styles.previewLabel}>Precio sugerido</Text>
              <AmountDisplay value={suggestedPrice} size="lg" tone="primary" />
              {type === 'pack' && unitsNum > 0 && (
                <Text style={styles.previewSub}>
                  Costo unitario: ${(costNum / unitsNum).toFixed(2)}
                </Text>
              )}
            </Card>

            <TextField
              label="Precio de venta *"
              value={salePrice}
              onChangeText={handleSalePriceChange}
              keyboardType="decimal-pad"
              placeholder="0"
              containerStyle={styles.field}
            />
            {salePriceEdited && suggestedPrice > 0 && (
              <TouchableOpacity style={styles.resetBtn} onPress={resetSalePrice} activeOpacity={0.7}>
                <Text style={styles.resetBtnText}>
                  Usar precio sugerido (${suggestedPrice.toLocaleString('es-AR')})
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <Button label="Guardar producto" onPress={() => requireWrite(handleSave)} loading={saving} style={styles.saveBtn} />
      </ScrollView>
      <PlanRestrictionDialog message={restrictionMessage} onDismiss={dismissRestriction} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: 100,
  },
  field: {
    marginBottom: theme.spacing.lg,
  },
  fieldLabel: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  fieldHint: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    marginTop: -4,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  chipRowScroll: {
    flexDirection: 'row',
    paddingBottom: 4,
    marginBottom: theme.spacing.md,
  },
  chipSpacing: {
    marginRight: 8,
  },
  preview: {
    marginTop: 4,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderColor: theme.colors.primaryMid,
    borderWidth: 1.5,
  },
  previewLabel: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.micro,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  previewSub: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.muted,
    marginTop: 4,
  },
  resetBtn: {
    alignSelf: 'flex-start',
    marginTop: -8,
    marginBottom: theme.spacing.lg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryMid,
  },
  resetBtnText: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.micro,
    color: theme.colors.primary,
  },
  saveBtn: {
    marginTop: 8,
  },
});
