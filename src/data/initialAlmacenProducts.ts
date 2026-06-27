// Lista inicial de almacén — 90 productos reales (Lista Junio 2026).
// Estos productos son editables y eliminables como cualquier otro producto del negocio.
// Notas sobre productos especiales:
//   - Barra Dambo y Queso cremoso: costo y precio expresados por 100g.
//   - Salames: costo y precio expresados por kg.
//   - Hamburguesas Swift x20: precio de venta calculado como costo × 1.4 (PDF mostraba "$3.100 x pack" — se corrigió a $31.000).
//   - Queso rallado La Quesera: valores tomados del PDF tal como figuran; verificar antes de usar.

export type InitialProduct = {
  name: string;
  cost: number;
  salePrice: number;
  margin: number;
  roundTo: 50 | 100;
  type: 'unidad';
  categoryId: string;
  isTemplate: true;
};

export const INITIAL_ALMACEN_PRODUCTS: InitialProduct[] = [

  // ── Almacén ───────────────────────────────────────────────
  { name: 'Aceite Cañuelas 5 L',           cost: 18199, salePrice: 25500, margin: 40, roundTo: 100, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Aceite Natura 1,5 L',           cost:  5688, salePrice:  8000, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Aceite Natura 900 ml',          cost:  3598, salePrice:  5050, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Arroz Tío Carlos 1 kg',         cost:  1073, salePrice:  1550, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Azúcar Ledesma 1 kg',           cost:  1269, salePrice:  1800, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Cacao Nesquik 180 g',           cost:  1757, salePrice:  2500, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Cacao Nesquik 360 g',           cost:  3390, salePrice:  4750, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Caldo Knorr x12',               cost:  1749, salePrice:  2450, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Comino Alicante 25 g',          cost:   784, salePrice:  1100, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Edulcorante Chuker clásico',    cost:  2654, salePrice:  3750, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Extracto Vainilla Galvan 30 ml',cost:  1027, salePrice:  1450, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Fideos Favorita dedalitos',     cost:   599, salePrice:   850, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Fideos Favorita spaghetti',     cost:   599, salePrice:   850, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Fideos Matarazzo moños',        cost:  2029, salePrice:  2850, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Galletas Bagley cereales',      cost:  3316, salePrice:  4650, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Galletas Bagley surtidas',      cost:  2789, salePrice:  3950, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Galletas Diversión Arcor',      cost:  2261, salePrice:  3200, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Galletas Maná vainilla',        cost:  2532, salePrice:  3550, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Galletas Oreo',                 cost:  3990, salePrice:  5600, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Galletas Vocación',             cost:  1719, salePrice:  2450, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Ideal Colores surtidos x12',    cost:  1858, salePrice:  2650, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Lentejas Cadea 400 g',          cost:  1481, salePrice:  2100, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Maíz pisado Cadea 400 g',       cost:  1285, salePrice:  1800, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Mayonesa Hellmann\'s 237 g',    cost:  1029, salePrice:  1450, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Mayonesa Hellmann\'s 475 g',    cost:  1978, salePrice:  2800, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Mayonesa Hellmann\'s 950 g',    cost:  4160, salePrice:  5850, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Papas Lay\'s 40 g',             cost:  1629, salePrice:  2300, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Picadillo Swift 90 g',          cost:   797, salePrice:  1150, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Pimentón Alicante 50 g',        cost:  1191, salePrice:  1700, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Porotos alubia Cadea 500 g',    cost:  1973, salePrice:  2800, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Ravioles La Italiana 1 kg',     cost:  4272, salePrice:  6000, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Sal gruesa Dos Estrellas 1 kg', cost:   949, salePrice:  1350, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },
  { name: 'Sardinas Bahía 125 g',          cost:  1880, salePrice:  2650, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'almacen', isTemplate: true },

  // ── Bebidas ───────────────────────────────────────────────
  { name: 'Café La Virginia sobres',       cost:  3349, salePrice:  4700, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Café La Virginia torrado 125 g',cost:  2503, salePrice:  3550, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Cerveza Andes 473 ml',          cost:  1231, salePrice:  1750, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Fernet Branca 750 ml',          cost: 14024, salePrice: 19650, margin: 40, roundTo: 100, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Gaseosa 7Up 500 ml',            cost:   847, salePrice:  1200, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Gaseosa 7Up Free 500 ml',       cost:   847, salePrice:  1200, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Gaseosa Mirinda 500 ml',        cost:   849, salePrice:  1200, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Gaseosa Pepsi Titan 500 ml',    cost:   849, salePrice:  1200, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Jugo Ades manzana 1 L',         cost:  2299, salePrice:  3250, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Jugo Baggio 125 ml',            cost:   320, salePrice:   450, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Jugo Citric 500 cc',            cost:  2597, salePrice:  3650, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Mate cocido Taragüi x25',       cost:   988, salePrice:  1400, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Vino Ternura blanco 1 L',       cost:  1367, salePrice:  1950, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Vino Toro tetra tinto 1 L',     cost:  1785, salePrice:  2500, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Vino Toro Viejo 750 cc',        cost:  1567, salePrice:  2200, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },
  { name: 'Yerba Playadito 1 kg',          cost:  3800, salePrice:  5350, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'bebidas', isTemplate: true },

  // ── Lácteos ───────────────────────────────────────────────
  { name: 'Crema Tonadita 200 cc',         cost:  1560, salePrice:  2200, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'lacteos', isTemplate: true },
  { name: 'La Lechera Nutrifuerza',        cost:  7000, salePrice:  9800, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'lacteos', isTemplate: true },
  { name: 'Leche Ilolay 1 L',             cost:  1842, salePrice:  2600, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'lacteos', isTemplate: true },
  { name: 'Manteca SYS 200 g',            cost:  1949, salePrice:  2750, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'lacteos', isTemplate: true },
  { name: 'Yogur Ilolay 190 g frutilla',   cost:   902, salePrice:  1300, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'lacteos', isTemplate: true },
  { name: 'Yogur Ilolay 190 g vainilla',   cost:   902, salePrice:  1300, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'lacteos', isTemplate: true },
  { name: 'Yogur sachet Ilolay 900 g',     cost:  1605, salePrice:  2250, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'lacteos', isTemplate: true },

  // ── Carnes ────────────────────────────────────────────────
  // Precio de venta calculado: $21.840 × 1.40 ≈ $31.000 (el PDF mostraba "$3.100 x pack")
  { name: 'Hamburguesas Swift x20',        cost: 21840, salePrice: 31000, margin: 40, roundTo: 100, type: 'unidad', categoryId: 'carnes', isTemplate: true },

  // ── Fiambrería ────────────────────────────────────────────
  // Barra Dambo: costo y precio por 100g (bloque 2.6 kg: $25.436 → $978/100g)
  { name: 'Barra Dambo Punta del Agua (x 100g)', cost: 978,  salePrice:  1500, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'fiambreria', isTemplate: true },
  // Queso cremoso: costo y precio por 100g (kg: $8.169 → $817/100g)
  { name: 'Queso cremoso Punta del Agua (x 100g)', cost: 817, salePrice: 1300, margin: 40, roundTo: 50, type: 'unidad', categoryId: 'fiambreria', isTemplate: true },
  // Queso rallado: valores del PDF — verificar antes de usar
  { name: 'Queso rallado La Quesera',      cost: 10879, salePrice:  1000, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'fiambreria', isTemplate: true },
  { name: 'Salame Fox chacarero kg',       cost: 15375, salePrice: 21550, margin: 40, roundTo: 100, type: 'unidad', categoryId: 'fiambreria', isTemplate: true },
  { name: 'Salame Fox criollo kg',         cost: 15375, salePrice: 21550, margin: 40, roundTo: 100, type: 'unidad', categoryId: 'fiambreria', isTemplate: true },
  { name: 'Salame Tandilero Nahuel kg',    cost: 15056, salePrice: 21100, margin: 40, roundTo: 100, type: 'unidad', categoryId: 'fiambreria', isTemplate: true },
  { name: 'Salchicha Viena x6',           cost:   911, salePrice:  1300, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'fiambreria', isTemplate: true },

  // ── Panadería ─────────────────────────────────────────────
  { name: 'Bizcochos Don Satur dulce',     cost:  1146, salePrice:  1650, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'panaderia', isTemplate: true },
  { name: 'Bizcochos Don Satur salado',    cost:  1146, salePrice:  1650, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'panaderia', isTemplate: true },
  { name: 'Harina Florencia 1 kg',         cost:   987, salePrice:  1400, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'panaderia', isTemplate: true },
  { name: 'Pan de pancho x6',             cost:  1086, salePrice:  1550, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'panaderia', isTemplate: true },
  { name: 'Polvo hornear Galvan 50 g',     cost:   598, salePrice:   850, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'panaderia', isTemplate: true },
  { name: 'Vainillas Pozo 444 g',          cost:  2900, salePrice:  4100, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'panaderia', isTemplate: true },

  // ── Limpieza ──────────────────────────────────────────────
  { name: 'Aromatizante Urban cítrico',    cost:  3280, salePrice:  4600, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'limpieza', isTemplate: true },
  { name: 'Aromatizante Urban manzana',    cost:  3280, salePrice:  4600, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'limpieza', isTemplate: true },
  { name: 'Desinfectante Lysoform 285 ml', cost:  3435, salePrice:  4850, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'limpieza', isTemplate: true },
  { name: 'Detergente Magistral 300 ml',   cost:  1750, salePrice:  2450, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'limpieza', isTemplate: true },
  { name: 'Jabón Ala Matic 3 L',          cost:  7770, salePrice: 10900, margin: 40, roundTo: 100, type: 'unidad', categoryId: 'limpieza', isTemplate: true },
  { name: 'Limpiador Cif 900 ml',          cost:  3030, salePrice:  4250, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'limpieza', isTemplate: true },
  { name: 'Limpiador Mr Músculo',          cost:  3539, salePrice:  5000, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'limpieza', isTemplate: true },
  { name: 'Mopa algodón',                  cost:  2455, salePrice:  3450, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'limpieza', isTemplate: true },
  { name: 'Rollo cocina Sussex x3',        cost:  1519, salePrice:  2150, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'limpieza', isTemplate: true },
  { name: 'Secador reforzado N°26',        cost:  1676, salePrice:  2350, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'limpieza', isTemplate: true },

  // ── Higiene ───────────────────────────────────────────────
  { name: 'AC Dove 750 ml regeneración',   cost: 13035, salePrice: 18250, margin: 40, roundTo: 100, type: 'unidad', categoryId: 'higiene', isTemplate: true },
  { name: 'AC Plusbelle 1 L nutrición',    cost:  2802, salePrice:  3950, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'higiene', isTemplate: true },
  { name: 'Jabón Dove 90 g',              cost:  1705, salePrice:  2400, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'higiene', isTemplate: true },
  { name: 'Papel Higienol 4x80 m',         cost:  2875, salePrice:  4050, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'higiene', isTemplate: true },
  { name: 'SH Plusbelle nutrición',        cost:  2802, salePrice:  3950, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'higiene', isTemplate: true },
  { name: 'SH Plusbelle protección',       cost:  2802, salePrice:  3950, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'higiene', isTemplate: true },
  { name: 'SH Plusbelle suavidad',         cost:  2802, salePrice:  3950, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'higiene', isTemplate: true },
  { name: 'SH Sedal 650 ml',              cost:  6781, salePrice:  9500, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'higiene', isTemplate: true },
  { name: 'Toallas Always x16',            cost:  4842, salePrice:  6800, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'higiene', isTemplate: true },
  { name: 'Toallas Calipso x8',           cost:   667, salePrice:   950, margin: 40, roundTo:  50, type: 'unidad', categoryId: 'higiene', isTemplate: true },
];
