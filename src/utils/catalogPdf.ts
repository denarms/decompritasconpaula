import { jsPDF } from 'jspdf';
import { Product } from '../types';

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

const BOUTIQUE_LOGO_URL = '/assets/aistudio/WhatsApp_Image_2026-11-04_at_5.17.12_PM_161c4a55.jpeg';

/**
 * Strips emojis and unsupported non-WinAnsi characters so jsPDF Helvetica
 * renders Spanish accents (á, é, í, ó, ú, ñ, ü) cleanly without artifacts.
 */
function sanitizePdfText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Loads an image (data URL, local path, or external URL) into an offscreen HTMLCanvas
 * and exports a clean JPEG dataUrl with its natural pixel dimensions.
 */
async function loadImageForPdf(src?: string, maxSize = 600): Promise<LoadedImage | null> {
  if (!src || !src.trim()) return null;

  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;

    const finish = (result: LoadedImage | null) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const timer = window.setTimeout(() => finish(null), 5000);

    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;
        if (!naturalW || !naturalH) {
          finish(null);
          return;
        }

        const scale = Math.min(1, maxSize / Math.max(naturalW, naturalH));
        const targetW = Math.max(1, Math.round(naturalW * scale));
        const targetH = Math.max(1, Math.round(naturalH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }

        // Fill white background so transparent PNGs or WebPs render cleanly
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
        finish({ dataUrl, width: targetW, height: targetH });
      } catch {
        // Canvas tainted by CORS or unsupported image
        finish(null);
      }
    };

    img.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };

    img.src = src;
  });
}

function clampLines(doc: jsPDF, text: string, maxWidth: number, maxLines: number): string[] {
  const clean = sanitizePdfText(text);
  if (!clean) return [];
  const lines = doc.splitTextToSize(clean, maxWidth) as string[];
  if (lines.length <= maxLines) return lines;

  const trimmed = lines.slice(0, maxLines);
  const lastIdx = trimmed.length - 1;
  const last = trimmed[lastIdx];
  trimmed[lastIdx] = last.length > 3 ? `${last.slice(0, last.length - 3).trimEnd()}...` : `${last}...`;
  return trimmed;
}

export interface CatalogPdfOptions {
  products: Product[];
  categoryLabel?: string;
}

/**
 * Generates and downloads a customer-facing boutique PDF catalog containing
 * product photos and product details, intentionally omitting stock quantities
 * and internal cost data.
 */
export async function generateProductCatalogPdf({
  products,
  categoryLabel,
}: CatalogPdfOptions): Promise<void> {
  const activeProducts = products.filter((p) => p.status !== 'archived');
  if (activeProducts.length === 0) {
    throw new Error('No hay productos para incluir en el catálogo.');
  }

  // Preload boutique logo + all product images concurrently
  const [logoImg, ...productImages] = await Promise.all([
    loadImageForPdf(BOUTIQUE_LOGO_URL, 300),
    ...activeProducts.map((p) => loadImageForPdf(p.imageUrl, 640)),
  ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const colGap = 8;
  const rowGap = 6;
  const cols = 2;
  const rowsPerPage = 3;
  const cardsPerPage = cols * rowsPerPage;
  const cardWidth = (pageWidth - marginX * 2 - colGap) / cols; // 87mm

  const firstPageHeaderH = 30;
  const nextPageHeaderH = 16;
  const footerH = 12;

  const totalPages = Math.ceil(activeProducts.length / cardsPerPage);
  const todayStr = new Date().toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const drawPageHeader = (pageNum: number) => {
    const isFirst = pageNum === 1;

    if (isFirst) {
      // Soft pink top accent bar
      doc.setFillColor(219, 39, 119); // pink-600
      doc.rect(0, 0, pageWidth, 2.5, 'F');

      // Logo (if loaded)
      let textStartX = marginX;
      if (logoImg) {
        const logoH = 15;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        doc.addImage(logoImg.dataUrl, 'JPEG', marginX, 7.5, Math.min(logoW, 24), logoH);
        textStartX = marginX + Math.min(logoW, 24) + 4;
      }

      doc.setTextColor(17, 24, 39); // gray-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('Catálogo de Productos', textStartX, 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text('De Compritas con Paula  •  Personal Shopper Bolivia', textStartX, 18.5);

      // Right-aligned metadata badge
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(sanitizePdfText(todayStr), pageWidth - marginX, 12, { align: 'right' });

      const subtitle =
        categoryLabel && categoryLabel !== 'Todos'
          ? `Categoría: ${sanitizePdfText(categoryLabel)} (${activeProducts.length})`
          : `${activeProducts.length} ${activeProducts.length === 1 ? 'artículo' : 'artículos'} en catálogo`;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(190, 24, 93); // pink-700
      doc.text(subtitle, pageWidth - marginX, 18, { align: 'right' });

      // Divider
      doc.setDrawColor(243, 244, 246);
      doc.setLineWidth(0.4);
      doc.line(marginX, 25.5, pageWidth - marginX, 25.5);
    } else {
      doc.setFillColor(219, 39, 119);
      doc.rect(0, 0, pageWidth, 1.8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(17, 24, 39);
      doc.text('De Compritas con Paula  —  Catálogo de Productos', marginX, 10.5);

      if (categoryLabel && categoryLabel !== 'Todos') {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(190, 24, 93);
        doc.text(sanitizePdfText(categoryLabel), pageWidth - marginX, 10.5, { align: 'right' });
      }

      doc.setDrawColor(243, 244, 246);
      doc.setLineWidth(0.3);
      doc.line(marginX, 13.5, pageWidth - marginX, 13.5);
    }
  };

  const drawPageFooter = (pageNum: number) => {
    doc.setDrawColor(243, 244, 246);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text('Precios expresados en Bolivianos (Bs.)', marginX, pageHeight - 5.5);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - marginX, pageHeight - 5.5, {
      align: 'right',
    });
  };

  activeProducts.forEach((product, index) => {
    const pageIndex = Math.floor(index / cardsPerPage);
    const indexOnPage = index % cardsPerPage;
    const pageNum = pageIndex + 1;

    if (indexOnPage === 0) {
      if (pageNum > 1) {
        doc.addPage();
      }
      drawPageHeader(pageNum);
      drawPageFooter(pageNum);
    }

    const headerH = pageNum === 1 ? firstPageHeaderH : nextPageHeaderH;
    const usableBodyH = pageHeight - headerH - footerH - 4;
    const cardHeight = (usableBodyH - rowGap * (rowsPerPage - 1)) / rowsPerPage;

    const col = indexOnPage % cols;
    const row = Math.floor(indexOnPage / cols);

    const cardX = marginX + col * (cardWidth + colGap);
    const cardY = headerH + row * (cardHeight + rowGap);

    // Card container
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.setLineWidth(0.35);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'FD');

    // Photo frame inside card
    const pad = 3.2;
    const imgBoxX = cardX + pad;
    const imgBoxY = cardY + pad;
    const imgBoxW = cardWidth - pad * 2;
    const imgBoxH = Math.min(39, cardHeight * 0.48);

    doc.setFillColor(250, 247, 249); // very soft rose-tinted gray
    doc.setDrawColor(243, 244, 246);
    doc.setLineWidth(0.25);
    doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 2, 2, 'FD');

    const loadedImg = productImages[index];
    if (loadedImg) {
      // Fit image proportionally inside box (contain)
      const innerPad = 1;
      const maxW = imgBoxW - innerPad * 2;
      const maxH = imgBoxH - innerPad * 2;
      const ratio = Math.min(maxW / loadedImg.width, maxH / loadedImg.height);
      const drawW = loadedImg.width * ratio;
      const drawH = loadedImg.height * ratio;
      const drawX = imgBoxX + (imgBoxW - drawW) / 2;
      const drawY = imgBoxY + (imgBoxH - drawH) / 2;
      doc.addImage(loadedImg.dataUrl, 'JPEG', drawX, drawY, drawW, drawH);
    } else {
      // Clean monogram placeholder when product has no photo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(219, 39, 119);
      const initial = sanitizePdfText(product.name || product.category || 'P')[0]?.toUpperCase() || 'P';
      doc.text(initial, imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2 + 1.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text('Sin foto', imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2 + 6.5, { align: 'center' });
    }

    // Text details area (strictly NO stock quantity or cost price)
    const textX = cardX + pad + 0.5;
    const textMaxW = cardWidth - (pad + 0.5) * 2;
    let cursorY = imgBoxY + imgBoxH + 4.5;

    // 1. Category & SKU line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(190, 24, 93); // pink-700
    const categoryText = sanitizePdfText(product.category || 'Artículo').toUpperCase();
    doc.text(categoryText, textX, cursorY);

    if (product.sku) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text(`Cod: ${sanitizePdfText(product.sku)}`, cardX + cardWidth - pad - 0.5, cursorY, {
        align: 'right',
      });
    }
    cursorY += 4.3;

    // 2. Product Name (up to 2 lines)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(17, 24, 39);
    const nameLines = clampLines(doc, product.name, textMaxW, 2);
    nameLines.forEach((line) => {
      doc.text(line, textX, cursorY);
      cursorY += 4.1;
    });
    cursorY += 0.6;

    // 3. Attributes (Brand, Size, Color/Shade) - NEVER stock
    const attrs: string[] = [];
    if (product.brand?.trim()) attrs.push(`Marca: ${sanitizePdfText(product.brand)}`);
    if (product.size?.trim()) attrs.push(`Talla: ${sanitizePdfText(product.size)}`);
    if (product.colorOrShade?.trim()) attrs.push(`Tono/Color: ${sanitizePdfText(product.colorOrShade)}`);

    if (attrs.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(75, 85, 99); // gray-600
      const attrLines = clampLines(doc, attrs.join('  •  '), textMaxW, 2);
      attrLines.forEach((line) => {
        doc.text(line, textX, cursorY);
        cursorY += 3.5;
      });
    }

    // 4. Optional Description (only if space remains above price footer)
    const priceBarY = cardY + cardHeight - 8.5;
    if (product.description?.trim() && cursorY + 4 < priceBarY - 1.5) {
      cursorY += 0.5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      const availableLines = cursorY + 7.5 < priceBarY ? 2 : 1;
      const descLines = clampLines(doc, product.description, textMaxW, availableLines);
      descLines.forEach((line) => {
        if (cursorY < priceBarY - 1.5) {
          doc.text(line, textX, cursorY);
          cursorY += 3.2;
        }
      });
    }

    // 5. Price Footer inside card
    doc.setDrawColor(243, 244, 246);
    doc.setLineWidth(0.25);
    doc.line(cardX + pad, priceBarY, cardX + cardWidth - pad, priceBarY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text('Precio', textX, cardY + cardHeight - 3.3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(219, 39, 119); // pink-600
    doc.text(`Bs. ${product.salePrice.toFixed(2)}`, cardX + cardWidth - pad - 0.5, cardY + cardHeight - 3.1, {
      align: 'right',
    });
  });

  const dateSlug = new Date().toISOString().slice(0, 10);
  const catSlug =
    categoryLabel && categoryLabel !== 'Todos'
      ? `-${categoryLabel.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`
      : '';
  doc.save(`catalogo-productos${catSlug}-${dateSlug}.pdf`);
}
