import type { Category, Product } from '@/models';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatARS(value: number): string {
  return '$' + value.toLocaleString('es-AR');
}

function formatToday(): string {
  return new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getMarginInfo(products: Product[]): string {
  if (products.length === 0) return '';
  const unique = [...new Set(products.map((p) => p.margin))];
  return unique.length === 1
    ? `Margen general: ${unique[0]}%`
    : 'Márgenes configurados por producto';
}

function buildCategorySection(categoryName: string, products: Product[]): string {
  const sorted = products.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const rows = sorted
    .map(
      (p) => `
      <tr>
        <td class="col-name">${escapeHtml(p.name)}</td>
        <td class="col-cost">${formatARS(p.cost)}</td>
        <td class="col-price">${formatARS(p.price)}</td>
      </tr>`,
    )
    .join('');

  return `
  <div class="category-block">
    <div class="category-name">${escapeHtml(categoryName)}</div>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th class="right">Costo</th>
          <th class="right">Precio venta</th>
        </tr>
      </thead>
      <tbody>${rows}
      </tbody>
    </table>
  </div>`;
}

export function buildPdfHtml(
  businessName: string,
  products: Product[],
  categories: Category[],
): string {
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  // Group products by categoryId
  const grouped = new Map<string, Product[]>();
  for (const p of products) {
    const list = grouped.get(p.categoryId) ?? [];
    list.push(p);
    grouped.set(p.categoryId, list);
  }

  // Sections: categories sorted by order (empty ones skipped), then "Sin categoría"
  const sections: string[] = [];
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  for (const cat of sortedCategories) {
    const prods = grouped.get(cat.id);
    if (!prods || prods.length === 0) continue;
    sections.push(buildCategorySection(cat.name, prods));
    grouped.delete(cat.id);
  }

  // Products with no matching category
  const uncategorized: Product[] = [];
  for (const prods of grouped.values()) uncategorized.push(...prods);
  if (uncategorized.length > 0) {
    sections.push(buildCategorySection('Sin categoría', uncategorized));
  }

  const date = formatToday();
  const marginInfo = getMarginInfo(products);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1F2937;
      padding: 18mm 15mm;
      background: #fff;
    }
    .header {
      border-bottom: 2pt solid #1E5AA8;
      padding-bottom: 10pt;
      margin-bottom: 14pt;
    }
    .business-name { font-size: 18pt; font-weight: bold; color: #1E5AA8; line-height: 1.2; }
    .subtitle { font-size: 12pt; color: #374151; margin-top: 3pt; }
    .meta { font-size: 9pt; color: #6B7280; margin-top: 6pt; }
    .category-block { margin-top: 14pt; }
    .category-name {
      font-size: 9pt; font-weight: bold; color: #1E5AA8;
      text-transform: uppercase; letter-spacing: 0.8pt;
      padding: 3pt 0 3pt; border-bottom: 1pt solid #93C5FD;
    }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      font-size: 8pt; font-weight: bold; color: #9CA3AF;
      text-transform: uppercase; letter-spacing: 0.3pt;
      padding: 5pt 6pt 4pt; text-align: left;
      border-bottom: 0.5pt solid #E5E7EB;
    }
    thead th.right { text-align: right; }
    tbody td { padding: 5pt 6pt; border-bottom: 0.5pt solid #F3F4F6; vertical-align: middle; }
    tbody tr:last-child td { border-bottom: none; }
    .col-name { font-size: 11pt; color: #1F2937; }
    .col-cost { font-size: 10pt; color: #6B7280; text-align: right; }
    .col-price { font-size: 12pt; font-weight: bold; color: #1F2937; text-align: right; }
    .footer {
      margin-top: 16pt; padding-top: 8pt;
      border-top: 0.5pt solid #D1D5DB;
      font-size: 8pt; color: #9CA3AF; text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="business-name">${escapeHtml(businessName)}</div>
    <div class="subtitle">Lista de precios</div>
    <div class="meta">Actualizado: ${date} · ${products.length} productos · ${escapeHtml(marginInfo)}</div>
  </div>
  ${sections.join('')}
  <div class="footer">Mi Almacén</div>
</body>
</html>`;
}
