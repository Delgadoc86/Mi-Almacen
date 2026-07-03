import { theme } from '@/theme';
import type { Category, Product } from '@/models';

// ── Scale system ──────────────────────────────────────────────────────────────

type PdfScale = 'large' | 'normal' | 'compact';

interface Sv {
  mainTitlePt: number;
  businessNamePt: number;
  metaPt: number;
  colHeaderPt: number;
  numFontPt: number;
  bodyFontPt: number;
  costFontPt: number;
  rowPaddingPt: number;
  catLabelPt: number;
  catMarginTopPt: number;
}

function getPdfScale(count: number): PdfScale {
  if (count < 20) return 'large';
  if (count <= 60) return 'normal';
  return 'compact';
}

// Tamaños pensados para lectura rápida por personas de 40-70 años —
// el nombre del producto (bodyFontPt) y el precio nunca deben achicarse
// por debajo de lo legible, aunque eso implique más páginas.
function getSv(scale: PdfScale): Sv {
  switch (scale) {
    case 'large':
      return {
        mainTitlePt: 28,
        businessNamePt: 16,
        metaPt: 10,
        colHeaderPt: 9.5,
        numFontPt: 13,
        bodyFontPt: 16,
        costFontPt: 13,
        rowPaddingPt: 11,
        catLabelPt: 11,
        catMarginTopPt: 22,
      };
    case 'normal':
      return {
        mainTitlePt: 25,
        businessNamePt: 14,
        metaPt: 9,
        colHeaderPt: 8.5,
        numFontPt: 12,
        bodyFontPt: 14.5,
        costFontPt: 12,
        rowPaddingPt: 9,
        catLabelPt: 10,
        catMarginTopPt: 18,
      };
    case 'compact':
      return {
        mainTitlePt: 21,
        businessNamePt: 12.5,
        metaPt: 8.5,
        colHeaderPt: 8,
        numFontPt: 11,
        bodyFontPt: 13,
        costFontPt: 11,
        rowPaddingPt: 7,
        catLabelPt: 9.5,
        catMarginTopPt: 15,
      };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Escaping for CSS string values (content: "...") — NOT HTML entities
function escapeCss(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function formatARS(value: number): string {
  return '$' + value.toLocaleString('es-AR');
}

function formatDate(): string {
  return new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getAverageMargin(products: Product[]): number | null {
  if (products.length === 0) return null;
  return Math.round(products.reduce((acc, p) => acc + p.margin, 0) / products.length);
}

// ── Filename generator ────────────────────────────────────────────────────────

function sanitizeForFilename(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '_');
}

export function generatePdfFilename(businessName: string, categoryName?: string): string {
  const date = new Date().toISOString().split('T')[0];
  const name = sanitizeForFilename(businessName) || 'MiAlmacen';
  const suffix = categoryName ? sanitizeForFilename(categoryName) : 'Control_Precios';
  return `${name}_${suffix}_${date}`;
}

// ── CSS builder ───────────────────────────────────────────────────────────────

function buildCss(sv: Sv, businessName: string, date: string): string {
  const catCountPt = Math.max(sv.catLabelPt - 0.5, 6.5);
  return `
    @page {
      size: A4 portrait;
      margin: 14mm 13mm 20mm 13mm;
    }
    @page {
      @bottom-left {
        content: "${escapeCss(businessName)} · Control de precios";
        font-family: Arial, Helvetica, sans-serif;
        font-size: 7pt;
        color: ${theme.colors.muted};
        border-top: 0.5pt solid ${theme.colors.border};
        padding-top: 4pt;
      }
      @bottom-right {
        content: "Página " counter(page) " de " counter(pages) " · ${escapeCss(date)}";
        font-family: Arial, Helvetica, sans-serif;
        font-size: 7pt;
        color: ${theme.colors.muted};
        border-top: 0.5pt solid ${theme.colors.border};
        padding-top: 4pt;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      color: ${theme.colors.text};
      background: #fff;
    }

    /* Fallback footer — Android WebView */
    .doc-footer {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: ${theme.colors.muted};
      border-top: 0.5pt solid ${theme.colors.border};
      padding-top: 4pt;
      background: #fff;
    }

    /* ── Document header ── */
    .doc-header {
      padding-bottom: 12pt;
      margin-bottom: 16pt;
      border-bottom: 2pt solid ${theme.colors.primary};
    }
    .doc-main-title {
      font-size: ${sv.mainTitlePt}pt;
      font-weight: bold;
      color: ${theme.colors.text};
      letter-spacing: 2pt;
      line-height: 1.1;
    }
    .doc-subtitle-row {
      display: flex;
      align-items: center;
      margin-top: 5pt;
      gap: 9pt;
    }
    .doc-business-name {
      font-size: ${sv.businessNamePt}pt;
      font-weight: bold;
      color: ${theme.colors.primary};
      letter-spacing: 0.4pt;
    }
    .doc-badge {
      font-size: 6pt;
      font-weight: bold;
      color: ${theme.colors.accent};
      border: 0.5pt solid ${theme.colors.accent};
      border-radius: 2pt;
      padding: 1.5pt 5pt;
      letter-spacing: 0.8pt;
      vertical-align: middle;
    }
    .doc-meta {
      margin-top: 8pt;
      font-size: ${sv.metaPt}pt;
      color: ${theme.colors.textSecondary};
    }
    .doc-meta strong { color: ${theme.colors.text}; }
    .doc-meta-sep { color: ${theme.colors.border}; margin: 0 5pt; }

    /* ── Category block ── */
    .category-block {
      margin-top: ${sv.catMarginTopPt}pt;
      page-break-inside: auto;
    }
    .category-label {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 4pt 0 3pt 0;
      border-top: 1pt solid ${theme.colors.primaryMid};
      border-bottom: 0.5pt solid ${theme.colors.primaryLight};
      page-break-after: avoid;
    }
    .cat-name {
      font-size: ${sv.catLabelPt}pt;
      font-weight: bold;
      color: ${theme.colors.primary};
      letter-spacing: 1pt;
    }
    .cat-count {
      font-size: ${catCountPt}pt;
      color: ${theme.colors.muted};
    }

    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    thead tr { page-break-inside: avoid; page-break-after: avoid; }
    thead th {
      font-size: ${sv.colHeaderPt}pt;
      font-weight: bold;
      color: ${theme.colors.muted};
      text-transform: uppercase;
      letter-spacing: 0.4pt;
      padding: 4pt 5pt 3pt;
      background-color: ${theme.colors.background};
      border-bottom: 1pt solid ${theme.colors.border};
    }
    .th-num   { text-align: right; width: 5%;  padding-right: 7pt; }
    .th-name  { text-align: left;  width: 33%; }
    .th-cost  { text-align: right; width: 13%; }
    .th-price { text-align: right; width: 19%; }
    .th-new   { text-align: left;  width: 30%; padding-left: 10pt; }

    tbody tr { page-break-inside: avoid; }
    tbody tr:nth-child(even) { background-color: ${theme.colors.background}; }
    tbody td {
      padding: ${sv.rowPaddingPt}pt 5pt;
      border-bottom: 0.5pt solid ${theme.colors.divider};
      vertical-align: middle;
    }
    tbody tr:last-child td { border-bottom: none; }

    .col-num   {
      font-size: ${sv.numFontPt}pt;
      color: ${theme.colors.muted};
      text-align: right;
      white-space: nowrap;
      width: 5%;
      padding-right: 7pt;
    }
    .col-name  { font-size: ${sv.bodyFontPt}pt; color: ${theme.colors.text}; width: 33%; }
    .col-cost  { font-size: ${sv.costFontPt}pt; color: ${theme.colors.textSecondary}; text-align: right; width: 13%; }
    .col-price {
      font-size: ${sv.bodyFontPt}pt;
      font-weight: bold;
      color: ${theme.colors.text};
      text-align: right;
      width: 19%;
    }
    .col-new { width: 30%; }
  `;
}

// ── Category section ──────────────────────────────────────────────────────────

function buildCategorySection(
  categoryName: string,
  products: Product[],
  itemStart: number,
  sv: Sv,
): { html: string; count: number } {
  const sorted = products.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const count = sorted.length;
  const countLabel = count === 1 ? '1 producto' : `${count} productos`;

  let n = itemStart;
  const rows = sorted
    .map(
      (p) => `
        <tr>
          <td class="col-num">${n++}</td>
          <td class="col-name">${escapeHtml(p.name)}</td>
          <td class="col-cost">${formatARS(p.cost)}</td>
          <td class="col-price">${formatARS(p.salePrice ?? p.price)}</td>
          <td class="col-new"></td>
        </tr>`,
    )
    .join('');

  const html = `
  <div class="category-block">
    <div class="category-label">
      <span class="cat-name">${escapeHtml(categoryName.toUpperCase())}</span>
      <span class="cat-count">${escapeHtml(countLabel)}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th class="th-num">#</th>
          <th class="th-name">Producto</th>
          <th class="th-cost">Costo</th>
          <th class="th-price">Precio venta</th>
          <th class="th-new">Nuevo precio</th>
        </tr>
      </thead>
      <tbody>${rows}
      </tbody>
    </table>
  </div>`;

  return { html, count };
}

// ── Main HTML builder ─────────────────────────────────────────────────────────

export function buildPdfHtml(
  businessName: string,
  products: Product[],
  categories: Category[],
  filterCategoryName?: string,
): string {
  const scale = getPdfScale(products.length);
  const sv = getSv(scale);
  const date = formatDate();
  const avgMargin = getAverageMargin(products);
  const businessNameEsc = escapeHtml(businessName.toUpperCase());

  // Group products by categoryId
  const grouped = new Map<string, Product[]>();
  for (const p of products) {
    const list = grouped.get(p.categoryId) ?? [];
    list.push(p);
    grouped.set(p.categoryId, list);
  }

  // Build sections in category order, tracking global item counter
  const sections: string[] = [];
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
  let itemCounter = 1;
  let activeCategoryCount = 0;

  for (const cat of sortedCategories) {
    const prods = grouped.get(cat.id);
    if (!prods?.length) continue;
    const { html, count } = buildCategorySection(cat.name, prods, itemCounter, sv);
    sections.push(html);
    itemCounter += count;
    grouped.delete(cat.id);
    activeCategoryCount++;
  }

  const uncategorized: Product[] = [];
  for (const prods of grouped.values()) uncategorized.push(...prods);
  if (uncategorized.length > 0) {
    const { html, count } = buildCategorySection('Sin categoría', uncategorized, itemCounter, sv);
    sections.push(html);
    itemCounter += count;
    activeCategoryCount++;
  }

  const metaParts: string[] = [
    ...(filterCategoryName ? [`Categoría: <strong>${escapeHtml(filterCategoryName)}</strong>`] : []),
    `Actualizado: <strong>${escapeHtml(date)}</strong>`,
    `${products.length} ${products.length === 1 ? 'producto' : 'productos'}`,
    ...(filterCategoryName ? [] : [`${activeCategoryCount} ${activeCategoryCount === 1 ? 'categoría' : 'categorías'}`]),
    ...(avgMargin !== null ? [`Margen promedio: <strong>${avgMargin}%</strong>`] : []),
  ];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
${buildCss(sv, businessName, date)}
  </style>
</head>
<body>

  <div class="doc-footer">
    <span>${escapeHtml(businessName)} · Control de precios</span>
    <span>${escapeHtml(date)}</span>
  </div>

  <div class="doc-header">
    <div class="doc-main-title">CONTROL DE PRECIOS</div>
    <div class="doc-subtitle-row">
      <span class="doc-business-name">${businessNameEsc}</span>
      <span class="doc-badge">USO INTERNO</span>
    </div>
    <div class="doc-meta">
      ${metaParts.join('<span class="doc-meta-sep">·</span>')}
    </div>
  </div>

  ${sections.join('\n')}

</body>
</html>`;
}
