import type { ProductType, RoundTo } from '@/models';

export function calculatePrice(
  cost: number,
  margin: number,
  roundTo: RoundTo,
  type: ProductType,
  unitsPerPack?: number,
): number {
  const effectiveCost =
    type === 'pack' && unitsPerPack && unitsPerPack > 0 ? cost / unitsPerPack : cost;
  const raw = effectiveCost * (1 + margin / 100);
  return Math.round(raw / roundTo) * roundTo;
}
