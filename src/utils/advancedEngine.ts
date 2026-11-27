import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { createWorker } from 'tesseract.js';
import { compressPdfLocally, CompressionPreset } from './pdfEngine';
import { convertPdfToPdfA } from './convertEngine';

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0');
  const num = parseInt(full, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return [r, g, b];
}

/* ============================================================================
   TOOL 8: REPAIR PDF (Structural Rebuild + Deep Visual Recovery)
============================================================================ */
export interface RepairPdfResult {
  bytes: Uint8Array;
  strategy: 'structural' | 'visual-recovery';
  recoveredPages: number;
  originalSize: number;
  repairedSize: number;
  log: string[];
}

export async function repairPdfLocally(
  file: File,
  mode: 'auto' | 'deep-visual' = 'auto',
  onProgress?: (msg: string) => void
): Promise<RepairPdfResult> {
  const buffer = await file.arrayBuffer();
  const log: string[] = [];

  if (mode === 'auto') {
    onProgress?.('Scanning PDF object table and cross-references...');
    try {
      const broken = await PDFDocument.load(buffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
        updateMetadata: false,
      });
      const count = broken.getPageCount();
      log.push(`Parsed ${count} page object(s) with tolerant object loader.`);

      const cleanDoc = await PDFDocument.create();
      let recovered = 0;
      for (let i = 0; i < count; i++) {
        try {
          const [copied] = await cleanDoc.copyPages(broken, [i]);
          cleanDoc.addPage(copied);
          recovered++;
        } catch {
          log.push(`Skipped damaged page object #${i + 1}.`);
        }
      }

      if (recovered > 0) {
        cleanDoc.setProducer('KAAGAZ PDF Repair Engine');
        cleanDoc.setCreator('KAAGAZ');
        const bytes = await cleanDoc.save({ useObjectStreams: false });
        log.push('Rebuilt clean XRef table and document catalog.');
        return {
          bytes,
          strategy: 'structural',
          recoveredPages: recovered,
          originalSize: file.size,
          repairedSize: bytes.byteLength,
          log,
        };
      }
    } catch {
      log.push('Standard structural parser failed; switching to Deep Visual Recovery.');
    }
  }

  // Deep Visual Recovery via PDF.js tolerant renderer
  onProgress?.('Running tolerant PDF.js visual page recovery...');
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages;
  log.push(`PDF.js tolerant parser detected ${total} renderable page(s).`);

  const rebuilt = await PDFDocument.create();
  let recovered = 0;

  for (let i = 1; i <= total; i++) {
    onProgress?.(`Recovering page ${i} of ${total}...`);
    try {
      const page = await pdf.getPage(i);
      const origVp = page.getViewport({ scale: 1.0 });
      const renderVp = page.getViewport({ scale: 1.75 });
      const canvas = document.createElement('canvas');
      canvas.width = renderVp.width;
      canvas.height = renderVp.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: renderVp, canvas }).promise;
      }
      const jpgUrl = canvas.toDataURL('image/jpeg', 0.9);
      const jpg = await rebuilt.embedJpg(jpgUrl);
      const outPage = rebuilt.addPage([origVp.width, origVp.height]);
      outPage.drawImage(jpg, {
        x: 0,
        y: 0,
        width: origVp.width,
        height: origVp.height,
      });
      recovered++;
    } catch {
      log.push(`Page ${i} could not be rendered.`);
    }
  }

  rebuilt.setProducer('KAAGAZ Deep Recovery Engine');
  const bytes = await rebuilt.save({ useObjectStreams: true });
  log.push(`Reconstructed ${recovered} page(s) into a fresh standards-compliant PDF.`);

  return {
    bytes,
    strategy: 'visual-recovery',
    recoveredPages: recovered,
    originalSize: file.size,
    repairedSize: bytes.byteLength,
    log,
  };
}

/* ============================================================================
   TOOL 9: OCR PDF (Real In-Browser Tesseract.js + Searchable PDF Builder)
============================================================================ */
export interface OcrPageResult {
  pageNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
  text: string;
  confidence: number;
}

export async function createSampleScannedPdf(): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const texts = [
    [
      'KAAGAZ ARCHIVAL MEMO #2026-09',
      'Subject: Client-Side Optical Character Recognition Test',
      'This rasterized document image contains no selectable text layer.',
      'Run OCR PDF to extract all words and embed an invisible searchable',
      'text layer directly inside your browser using Tesseract.js.',
      'Invoice Total: $1,840.00  |  Status: APPROVED',
    ],
    [
      'PAGE 2 — DISTRIBUTION & RETENTION SCHEDULE',
      'Department: Engineering & Legal Compliance',
      'All scanned receipts and signed paper contracts processed in KAAGAZ',
      'remain 100% private inside local device memory with zero uploads.',
      'Reference Code: KGZ-8841-OFFLINE',
    ],
  ];

  for (const lines of texts) {
    const canvas = document.createElement('canvas');
    canvas.width = 1100;
    canvas.height = 1420;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F7F5F0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(lines[0], 75, 130);
      ctx.fillRect(75, 155, 950, 3);
      ctx.font = '26px sans-serif';
      lines.slice(1).forEach((line, idx) => {
        ctx.fillText(line, 75, 240 + idx * 66);
      });
    }
    const jpg = await pdfDoc.embedJpg(canvas.toDataURL('image/jpeg', 0.92));
    const page = pdfDoc.addPage([612, 792]);
    page.drawImage(jpg, { x: 0, y: 0, width: 612, height: 792 });
  }

  const bytes = await pdfDoc.save();
  return new File([new Uint8Array(bytes)], 'KAAGAZ-Scanned-Memo.pdf', {
    type: 'application/pdf',
  });
}

export async function runOcrOnFile(
  file: File,
  language = 'eng',
  onProgress?: (status: string, progressPct: number) => void
): Promise<OcrPageResult[]> {
  const pageImages: { pageNumber: number; dataUrl: string; width: number; height: number }[] = [];

  if (file.type.startsWith('image/')) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.src = dataUrl;
    });
    pageImages.push({ pageNumber: 1, dataUrl, width: dims.w, height: dims.h });
  } else {
    onProgress?.('Rendering PDF pages for OCR...', 5);
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
      }
      pageImages.push({
        pageNumber: i,
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: vp.width,
        height: vp.height,
      });
    }
  }

  onProgress?.('Initializing Tesseract OCR engine...', 15);
  const worker = await createWorker(language, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(`Recognizing text (${Math.round(m.progress * 100)}%)...`, 15 + Math.round(m.progress * 80));
      }
    },
  });

  const results: OcrPageResult[] = [];
  try {
    for (let i = 0; i < pageImages.length; i++) {
      const item = pageImages[i];
      onProgress?.(
        `Running OCR on page ${i + 1} of ${pageImages.length}...`,
        Math.round(((i + 0.5) / pageImages.length) * 90)
      );
      const { data } = await worker.recognize(item.dataUrl);
      results.push({
        pageNumber: item.pageNumber,
        imageDataUrl: item.dataUrl,
        width: item.width,
        height: item.height,
        text: data.text.trim(),
        confidence: Math.round(data.confidence || 0),
      });
    }
  } finally {
    await worker.terminate();
  }

  onProgress?.('OCR complete', 100);
  return results;
}

export async function buildSearchableOcrPdf(
  pages: OcrPageResult[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const p of pages) {
    const pageW = 612;
    const pageH = Math.round((p.height / Math.max(1, p.width)) * pageW);
    const page = pdfDoc.addPage([pageW, pageH]);

    // Embed invisible selectable text layer underneath the page image so Ctrl+F and selection work
    const cleanLines = p.text
      .split('\n')
      .map((l) => l.replace(/[^\x20-\x7E]/g, ' ').trim())
      .filter(Boolean);

    let y = pageH - 42;
    for (const line of cleanLines) {
      if (y < 24) break;
      page.drawText(line.slice(0, 110), {
        x: 36,
        y,
        size: 10,
        font,
        color: rgb(1, 1, 1),
        opacity: 0.01,
      });
      y -= 15;
    }

    const imgBytes = await fetch(p.imageDataUrl).then((r) => r.arrayBuffer());
    const embedded = p.imageDataUrl.startsWith('data:image/png')
      ? await pdfDoc.embedPng(imgBytes)
      : await pdfDoc.embedJpg(imgBytes);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
    });
  }

  pdfDoc.setProducer('KAAGAZ OCR PDF Engine');
  return await pdfDoc.save();
}

/* ============================================================================
   TOOL 22: ROTATE PDF
============================================================================ */
export async function rotatePdfPages(
  file: File,
  rotationsByPageNumber: Record<number, number>
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  pages.forEach((page, idx) => {
    const delta = rotationsByPageNumber[idx + 1] || 0;
    if (delta !== 0) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + delta + 360) % 360));
    }
  });

  return await pdfDoc.save();
}

/* ============================================================================
   TOOL 23: ADD PAGE NUMBERS
============================================================================ */
export type PageNumberPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type PageNumberFormat = 'number' | 'page-n' | 'page-n-of-total' | 'n-slash-total';

export interface PageNumberOptions {
  position: PageNumberPosition;
  format: PageNumberFormat;
  startNumber: number;
  skipFirstPage: boolean;
  fontSize: number;
  marginPt: number;
  colorHex: string;
}

export function formatPageNumberLabel(
  pageNumber: number,
  totalPages: number,
  format: PageNumberFormat
): string {
  switch (format) {
    case 'number':
      return `${pageNumber}`;
    case 'page-n':
      return `Page ${pageNumber}`;
    case 'page-n-of-total':
      return `Page ${pageNumber} of ${totalPages}`;
    case 'n-slash-total':
      return `${pageNumber} / ${totalPages}`;
  }
}

export async function addPageNumbersToPdf(
  file: File,
  options: PageNumberOptions
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const total = pages.length;
  const [r, g, b] = hexToRgbTuple(options.colorHex);

  pages.forEach((page, idx) => {
    if (options.skipFirstPage && idx === 0) return;

    const displayNum = options.startNumber + (options.skipFirstPage ? idx - 1 : idx);
    const displayTotal = options.startNumber + (options.skipFirstPage ? total - 2 : total - 1);
    const label = formatPageNumberLabel(displayNum, Math.max(displayNum, displayTotal), options.format);
    const textWidth = font.widthOfTextAtSize(label, options.fontSize);
    const { width, height } = page.getSize();

    let x = options.marginPt;
    if (options.position.endsWith('center')) {
      x = (width - textWidth) / 2;
    } else if (options.position.endsWith('right')) {
      x = width - textWidth - options.marginPt;
    }

    const y = options.position.startsWith('top')
      ? height - options.marginPt - options.fontSize
      : options.marginPt;

    page.drawText(label, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(r, g, b),
    });
  });

  return await pdfDoc.save();
}

/* ============================================================================
   TOOL 24: ADD WATERMARK (Text or Image)
============================================================================ */
export interface WatermarkOptions {
  type: 'text' | 'image';
  text: string;
  fontSize: number;
  colorHex: string;
  opacity: number; // 0.05 to 1
  angle: number; // degrees
  placement: 'center' | 'tiled';
  imageDataUrl?: string;
  imageScale: number; // 0.15 to 0.8
}

export async function addWatermarkToPdf(
  file: File,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  if (options.type === 'text') {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const [r, g, b] = hexToRgbTuple(options.colorHex);
    const text = options.text.trim() || 'CONFIDENTIAL';
    const textWidth = font.widthOfTextAtSize(text, options.fontSize);

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      if (options.placement === 'tiled') {
        const stepX = Math.max(180, textWidth + 90);
        const stepY = Math.max(140, options.fontSize * 3.2);
        for (let x = -40; x < width + 100; x += stepX) {
          for (let y = 40; y < height + 80; y += stepY) {
            page.drawText(text, {
              x,
              y,
              size: options.fontSize,
              font,
              color: rgb(r, g, b),
              opacity: options.opacity,
              rotate: degrees(options.angle),
            });
          }
        }
      } else {
        page.drawText(text, {
          x: Math.max(24, (width - textWidth * 0.75) / 2),
          y: height / 2 - options.fontSize / 2,
          size: options.fontSize,
          font,
          color: rgb(r, g, b),
          opacity: options.opacity,
          rotate: degrees(options.angle),
        });
      }
    });
  } else if (options.imageDataUrl) {
    const imgBytes = await fetch(options.imageDataUrl).then((r) => r.arrayBuffer());
    const img = options.imageDataUrl.startsWith('data:image/png')
      ? await pdfDoc.embedPng(imgBytes)
      : await pdfDoc.embedJpg(imgBytes);

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      const targetW = width * options.imageScale;
      const targetH = (img.height / Math.max(1, img.width)) * targetW;
      page.drawImage(img, {
        x: (width - targetW) / 2,
        y: (height - targetH) / 2,
        width: targetW,
        height: targetH,
        opacity: options.opacity,
        rotate: degrees(options.angle),
      });
    });
  }

  return await pdfDoc.save();
}

/* ============================================================================
   TOOL 25: CROP PDF
============================================================================ */
export interface CropMarginsPct {
  top: number; // 0-40%
  right: number;
  bottom: number;
  left: number;
}

export async function cropPdfPages(
  file: File,
  margins: CropMarginsPct,
  applyScope: 'all' | 'single',
  targetPageNumber = 1
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  pages.forEach((page, idx) => {
    if (applyScope === 'single' && idx + 1 !== targetPageNumber) return;
    const { width, height } = page.getSize();
    const x = (margins.left / 100) * width;
    const y = (margins.bottom / 100) * height;
    const w = Math.max(36, width * (1 - (margins.left + margins.right) / 100));
    const h = Math.max(36, height * (1 - (margins.top + margins.bottom) / 100));
    page.setCropBox(x, y, w, h);
    page.setMediaBox(x, y, w, h);
  });

  return await pdfDoc.save();
}

/* ============================================================================
   TOOL 26: EDIT PDF (Text, Shapes, Highlights, Freehand & Images)
============================================================================ */
export interface PdfEditOverlay {
  id: string;
  pageNumber: number; // 1-based
  type: 'text' | 'highlight' | 'rect' | 'circle' | 'freehand' | 'image';
  // Normalized 0..1 coordinates relative to page top-left
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  fontSize?: number;
  color: string;
  strokeWidth?: number;
  points?: { x: number; y: number }[];
  imageDataUrl?: string;
}

export async function applyPdfEdits(
  file: File,
  overlays: PdfEditOverlay[]
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  for (const ov of overlays) {
    const page = pages[ov.pageNumber - 1];
    if (!page) continue;
    const { width, height } = page.getSize();
    const [r, g, b] = hexToRgbTuple(ov.color);

    if (ov.type === 'text' && ov.text) {
      const size = ov.fontSize || 16;
      page.drawText(ov.text, {
        x: ov.x * width,
        y: height - ov.y * height - size,
        size,
        font,
        color: rgb(r, g, b),
      });
    } else if (ov.type === 'highlight' && ov.w && ov.h) {
      page.drawRectangle({
        x: ov.x * width,
        y: height - (ov.y + ov.h) * height,
        width: ov.w * width,
        height: ov.h * height,
        color: rgb(r, g, b),
        opacity: 0.35,
      });
    } else if (ov.type === 'rect' && ov.w && ov.h) {
      page.drawRectangle({
        x: ov.x * width,
        y: height - (ov.y + ov.h) * height,
        width: ov.w * width,
        height: ov.h * height,
        borderColor: rgb(r, g, b),
        borderWidth: ov.strokeWidth || 2,
      });
    } else if (ov.type === 'circle' && ov.w && ov.h) {
      const rx = (ov.w * width) / 2;
      const ry = (ov.h * height) / 2;
      page.drawEllipse({
        x: ov.x * width + rx,
        y: height - ov.y * height - ry,
        xScale: rx,
        yScale: ry,
        borderColor: rgb(r, g, b),
        borderWidth: ov.strokeWidth || 2,
      });
    } else if (ov.type === 'freehand' && ov.points && ov.points.length > 1) {
      for (let i = 1; i < ov.points.length; i++) {
        const p1 = ov.points[i - 1];
        const p2 = ov.points[i];
        page.drawLine({
          start: { x: p1.x * width, y: height - p1.y * height },
          end: { x: p2.x * width, y: height - p2.y * height },
          thickness: ov.strokeWidth || 2.5,
          color: rgb(r, g, b),
        });
      }
    } else if (ov.type === 'image' && ov.imageDataUrl && ov.w && ov.h) {
      const imgBytes = await fetch(ov.imageDataUrl).then((res) => res.arrayBuffer());
      const embedded = ov.imageDataUrl.startsWith('data:image/png')
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes);
      page.drawImage(embedded, {
        x: ov.x * width,
        y: height - (ov.y + ov.h) * height,
        width: ov.w * width,
        height: ov.h * height,
      });
    }
  }

  return await pdfDoc.save();
}

/* ============================================================================
   TOOL 27: UNLOCK PDF (Decrypt with Password or Strip Owner Restrictions)
============================================================================ */
export async function unlockPdfFile(
  file: File,
  password: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ bytes: Uint8Array; pageCount: number; method: string }> {
  const buffer = await file.arrayBuffer();

  // Attempt 1: If no user password is required (owner-restricted PDF), strip restrictions directly via pdf-lib
  if (!password.trim()) {
    try {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const clean = await PDFDocument.create();
      const copied = await clean.copyPages(doc, doc.getPageIndices());
      copied.forEach((p) => clean.addPage(p));
      const bytes = await clean.save();
      return {
        bytes,
        pageCount: clean.getPageCount(),
        method: 'Owner restrictions stripped natively',
      };
    } catch {
      // Fall through to password-based decryption
    }
  }

  // Attempt 2: Full PDF.js decryption using the supplied password
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    password: password || undefined,
  });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages;

  const unlockedDoc = await PDFDocument.create();
  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const origVp = page.getViewport({ scale: 1.0 });
    const renderVp = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = renderVp.width;
    canvas.height = renderVp.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderVp, canvas }).promise;
    }
    const jpg = await unlockedDoc.embedJpg(canvas.toDataURL('image/jpeg', 0.92));
    const outPage = unlockedDoc.addPage([origVp.width, origVp.height]);
    outPage.drawImage(jpg, {
      x: 0,
      y: 0,
      width: origVp.width,
      height: origVp.height,
    });
    onProgress?.(i, total);
  }

  const bytes = await unlockedDoc.save();
  return {
    bytes,
    pageCount: total,
    method: 'Password decrypted and re-serialized without encryption',
  };
}

/* ============================================================================
   TOOL 28: PROTECT PDF (Real Password Encryption via jsPDF)
============================================================================ */
export interface ProtectPdfOptions {
  userPassword: string;
  ownerPassword: string;
  allowPrint: boolean;
  allowCopy: boolean;
  allowModify: boolean;
  allowForms: boolean;
}

export async function protectPdfFile(
  file: File,
  options: ProtectPdfOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const total = pdf.numPages;

  const permissions: ('print' | 'modify' | 'copy' | 'annot-forms')[] = [];
  if (options.allowPrint) permissions.push('print');
  if (options.allowCopy) permissions.push('copy');
  if (options.allowModify) permissions.push('modify');
  if (options.allowForms) permissions.push('annot-forms');

  const firstPage = await pdf.getPage(1);
  const firstVp = firstPage.getViewport({ scale: 1.0 });

  const out = new jsPDF({
    orientation: firstVp.width >= firstVp.height ? 'l' : 'p',
    unit: 'pt',
    format: [firstVp.width, firstVp.height],
    encryption: {
      userPassword: options.userPassword,
      ownerPassword: options.ownerPassword || options.userPassword,
      userPermissions: permissions,
    },
  });

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const origVp = page.getViewport({ scale: 1.0 });
    const renderVp = page.getViewport({ scale: 2.0 });

    if (i > 1) {
      out.addPage(
        [origVp.width, origVp.height],
        origVp.width >= origVp.height ? 'l' : 'p'
      );
    }

    const canvas = document.createElement('canvas');
    canvas.width = renderVp.width;
    canvas.height = renderVp.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderVp, canvas }).promise;
    }

    out.addImage(
      canvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      0,
      0,
      origVp.width,
      origVp.height,
      undefined,
      'FAST'
    );
    onProgress?.(i, total);
  }

  return out.output('blob');
}

/* ============================================================================
   TOOL 29: SIGN PDF (Draw, Type, or Upload Signature + Placement)
============================================================================ */
export function renderTypedSignaturePng(
  text: string,
  colorHex: string,
  style: 'cursive' | 'serif' | 'mono'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colorHex;
    const fontFamily =
      style === 'cursive'
        ? '"Caveat", cursive'
        : style === 'serif'
          ? 'Georgia, serif'
          : '"JetBrains Mono", monospace';
    ctx.font = `700 ${style === 'cursive' ? 78 : 52}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(text || 'Your Signature', 24, 92);
  }
  return canvas.toDataURL('image/png');
}

export interface SignaturePlacement {
  pageNumber: number; // 1-based
  xPct: number; // 0..1 from left
  yPct: number; // 0..1 from top
  widthPct: number; // 0.1..0.6
  includeDate: boolean;
}

export async function applySignatureToPdf(
  file: File,
  signaturePngDataUrl: string,
  placement: SignaturePlacement
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const page = pages[placement.pageNumber - 1];
  if (!page) throw new Error('Invalid target page');

  const imgBytes = await fetch(signaturePngDataUrl).then((r) => r.arrayBuffer());
  const sigImg = signaturePngDataUrl.startsWith('data:image/png')
    ? await pdfDoc.embedPng(imgBytes)
    : await pdfDoc.embedJpg(imgBytes);

  const { width, height } = page.getSize();
  const drawW = width * placement.widthPct;
  const drawH = (sigImg.height / Math.max(1, sigImg.width)) * drawW;
  const x = placement.xPct * width;
  const y = height - placement.yPct * height - drawH;

  page.drawImage(sigImg, {
    x,
    y,
    width: drawW,
    height: drawH,
  });

  if (placement.includeDate) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const dateStr = `Signed ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })}`;
    page.drawText(dateStr, {
      x,
      y: Math.max(12, y - 14),
      size: 9.5,
      font,
      color: rgb(0.3, 0.35, 0.45),
    });
  }

  return await pdfDoc.save();
}

/* ============================================================================
   TOOL 30: REDACT PDF (Auto-Keyword Search + Permanent Burnout Rasterization)
============================================================================ */
export interface RedactionBox {
  id: string;
  pageNumber: number; // 1-based
  x: number; // normalized 0..1
  y: number;
  w: number;
  h: number;
  label?: string;
}

export async function findKeywordBoxesOnPdf(
  file: File,
  keywords: string[]
): Promise<RedactionBox[]> {
  const cleaned = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (cleaned.length === 0) return [];

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const found: RedactionBox[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const lower = item.str.toLowerCase();
      const matched = cleaned.find((kw) => lower.includes(kw));
      if (!matched) continue;

      const xPt = item.transform[4];
      const yPt = item.transform[5];
      const hPt = Math.max(11, Math.abs(item.transform[3]) || item.height || 12);
      const wPt = Math.max(24, item.width || item.str.length * 6);

      found.push({
        id: `kw-${p}-${Math.random().toString(36).slice(2, 7)}`,
        pageNumber: p,
        x: Math.max(0, (xPt - 3) / vp.width),
        y: Math.max(0, (vp.height - yPt - hPt - 2) / vp.height),
        w: Math.min(1, (wPt + 6) / vp.width),
        h: Math.min(1, (hPt + 6) / vp.height),
        label: matched,
      });
    }
  }

  return found;
}

export async function applyPermanentRedaction(
  file: File,
  boxes: RedactionBox[],
  fillColorHex = '#000000',
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const outPdf = await PDFDocument.create();

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const origVp = page.getViewport({ scale: 1.0 });
    const renderVp = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    canvas.width = renderVp.width;
    canvas.height = renderVp.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderVp, canvas }).promise;

      // Burn redaction rectangles directly into pixels so text is permanently destroyed
      const pageBoxes = boxes.filter((b) => b.pageNumber === p);
      ctx.fillStyle = fillColorHex;
      for (const box of pageBoxes) {
        ctx.fillRect(
          box.x * canvas.width,
          box.y * canvas.height,
          box.w * canvas.width,
          box.h * canvas.height
        );
      }
    }

    const jpg = await outPdf.embedJpg(canvas.toDataURL('image/jpeg', 0.92));
    const newPage = outPdf.addPage([origVp.width, origVp.height]);
    newPage.drawImage(jpg, {
      x: 0,
      y: 0,
      width: origVp.width,
      height: origVp.height,
    });

    onProgress?.(p, pdf.numPages);
  }

  outPdf.setProducer('KAAGAZ Permanent Redaction Engine');
  return await outPdf.save();
}

/* ============================================================================
   TOOL 31: COMPARE PDF (Side-by-Side Visual Pixel Diff + Text Diff)
============================================================================ */
export interface PageComparisonResult {
  pageNumber: number;
  leftDataUrl: string | null;
  rightDataUrl: string | null;
  diffDataUrl: string | null;
  diffPercent: number;
  addedLines: string[];
  removedLines: string[];
}

export async function createComparisonSamplePair(): Promise<[File, File]> {
  const makeDoc = async (version: 'v1' | 'v2') => {
    const doc = await PDFDocument.create();
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const reg = await doc.embedFont(StandardFonts.Helvetica);

    const p1 = doc.addPage([612, 792]);
    p1.drawRectangle({
      x: 40,
      y: 690,
      width: 532,
      height: 58,
      color: version === 'v1' ? rgb(0.31, 0.27, 0.9) : rgb(0.42, 0.24, 0.92),
    });
    p1.drawText(
      version === 'v1'
        ? 'MASTER SERVICE AGREEMENT — DRAFT v1.0'
        : 'MASTER SERVICE AGREEMENT — REVISED v2.0',
      { x: 58, y: 713, size: 15, font: bold, color: rgb(1, 1, 1) }
    );

    const clauses =
      version === 'v1'
        ? [
            '1. Effective Date: January 15, 2026',
            '2. Payment Terms: Net 45 days from invoice receipt.',
            '3. Liability Cap: Limited to 6 months of prior subscription fees.',
            '4. Data Residency: Regional EU/US cloud clusters.',
            '5. Renewal Notice: 60 days written notice prior to term end.',
          ]
        : [
            '1. Effective Date: February 01, 2026',
            '2. Payment Terms: Net 30 days from invoice receipt.',
            '3. Liability Cap: Limited to 12 months of prior subscription fees.',
            '4. Data Residency: Strict 100% client-side local processing.',
            '5. Renewal Notice: 30 days written notice prior to term end.',
            '6. Security Addendum: ISO 19005 archival compliance enabled.',
          ];

    clauses.forEach((line, idx) => {
      p1.drawText(line, {
        x: 52,
        y: 620 - idx * 42,
        size: 12,
        font: reg,
        color: rgb(0.15, 0.19, 0.27),
      });
    });

    const bytes = await doc.save();
    return new File(
      [new Uint8Array(bytes)],
      version === 'v1' ? 'Contract-Draft-v1.pdf' : 'Contract-Revised-v2.pdf',
      { type: 'application/pdf' }
    );
  };

  return [await makeDoc('v1'), await makeDoc('v2')];
}

export async function compareTwoPdfs(
  fileA: File,
  fileB: File
): Promise<PageComparisonResult[]> {
  const [bufA, bufB] = await Promise.all([fileA.arrayBuffer(), fileB.arrayBuffer()]);
  const [pdfA, pdfB] = await Promise.all([
    pdfjsLib.getDocument({ data: new Uint8Array(bufA) }).promise,
    pdfjsLib.getDocument({ data: new Uint8Array(bufB) }).promise,
  ]);

  const maxPages = Math.max(pdfA.numPages, pdfB.numPages);
  const results: PageComparisonResult[] = [];

  const renderPage = async (pdf: pdfjsLib.PDFDocumentProxy, pNum: number) => {
    if (pNum > pdf.numPages) return null;
    const page = await pdf.getPage(pNum);
    const vp = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    }

    const tc = await page.getTextContent();
    const linesMap = new Map<number, string[]>();
    for (const item of tc.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const yBucket = Math.round(item.transform[5] / 6) * 6;
      const arr = linesMap.get(yBucket) || [];
      arr.push(item.str.trim());
      linesMap.set(yBucket, arr);
    }
    const lines = Array.from(linesMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.join(' ').trim())
      .filter(Boolean);

    return { canvas, dataUrl: canvas.toDataURL('image/png'), lines };
  };

  for (let p = 1; p <= maxPages; p++) {
    const [a, b] = await Promise.all([renderPage(pdfA, p), renderPage(pdfB, p)]);
    const linesA = a?.lines || [];
    const linesB = b?.lines || [];

    const setA = new Set(linesA);
    const setB = new Set(linesB);
    const removedLines = linesA.filter((l) => !setB.has(l));
    const addedLines = linesB.filter((l) => !setA.has(l));

    let diffDataUrl: string | null = null;
    let diffPercent = 0;

    if (a && b) {
      const w = Math.max(a.canvas.width, b.canvas.width);
      const h = Math.max(a.canvas.height, b.canvas.height);

      const normCanvas = (src: HTMLCanvasElement) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(src, 0, 0);
        return ctx.getImageData(0, 0, w, h);
      };

      const imgA = normCanvas(a.canvas);
      const imgB = normCanvas(b.canvas);
      const outCanvas = document.createElement('canvas');
      outCanvas.width = w;
      outCanvas.height = h;
      const outCtx = outCanvas.getContext('2d')!;
      const outImg = outCtx.createImageData(w, h);

      let diffPixels = 0;
      const totalPixels = w * h;

      for (let i = 0; i < outImg.data.length; i += 4) {
        const dr = Math.abs(imgA.data[i] - imgB.data[i]);
        const dg = Math.abs(imgA.data[i + 1] - imgB.data[i + 1]);
        const db = Math.abs(imgA.data[i + 2] - imgB.data[i + 2]);
        if (dr + dg + db > 42) {
          diffPixels++;
          outImg.data[i] = 225; // Rose/Crimson highlight
          outImg.data[i + 1] = 29;
          outImg.data[i + 2] = 72;
          outImg.data[i + 3] = 255;
        } else {
          // Soft faded grayscale backdrop
          const lum = 0.3 * imgB.data[i] + 0.59 * imgB.data[i + 1] + 0.11 * imgB.data[i + 2];
          const muted = Math.round(lum * 0.35 + 165);
          outImg.data[i] = muted;
          outImg.data[i + 1] = muted;
          outImg.data[i + 2] = muted;
          outImg.data[i + 3] = 255;
        }
      }

      outCtx.putImageData(outImg, 0, 0);
      diffDataUrl = outCanvas.toDataURL('image/png');
      diffPercent = Number(((diffPixels / Math.max(1, totalPixels)) * 100).toFixed(2));
    } else {
      diffPercent = 100;
    }

    results.push({
      pageNumber: p,
      leftDataUrl: a?.dataUrl || null,
      rightDataUrl: b?.dataUrl || null,
      diffDataUrl,
      diffPercent,
      addedLines,
      removedLines,
    });
  }

  return results;
}

/* ============================================================================
   TOOL 32: FLATTEN PDF (Form Field Flattening or Full Static Raster Flattening)
============================================================================ */
export interface FlattenInspection {
  pageCount: number;
  formFieldCount: number;
}

export async function inspectPdfFlattenStats(file: File): Promise<FlattenInspection> {
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  let formFieldCount = 0;
  try {
    formFieldCount = doc.getForm().getFields().length;
  } catch {
    formFieldCount = 0;
  }
  return {
    pageCount: doc.getPageCount(),
    formFieldCount,
  };
}

export async function flattenPdfFile(
  file: File,
  mode: 'forms-only' | 'full-static',
  dpi: 150 | 200 | 300 = 200,
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();

  if (mode === 'forms-only') {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    try {
      doc.getForm().flatten();
    } catch {
      // No AcroForm fields
    }
    return await doc.save();
  }

  // Full Static Raster Flattening: merges all forms, annotations, and layers into static flat pages
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const out = await PDFDocument.create();
  const scale = dpi / 72;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const origVp = page.getViewport({ scale: 1.0 });
    const renderVp = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = renderVp.width;
    canvas.height = renderVp.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderVp, canvas }).promise;
    }

    const jpg = await out.embedJpg(canvas.toDataURL('image/jpeg', 0.92));
    const outPage = out.addPage([origVp.width, origVp.height]);
    outPage.drawImage(jpg, {
      x: 0,
      y: 0,
      width: origVp.width,
      height: origVp.height,
    });
    onProgress?.(i, pdf.numPages);
  }

  out.setProducer('KAAGAZ Static Flatten Engine');
  return await out.save();
}

/* ============================================================================
   TOOL 33: CUSTOM WORKFLOWS (Multi-Step Automated Pipeline Runner)
============================================================================ */
export type WorkflowStepKind =
  | 'rotate'
  | 'watermark'
  | 'page-numbers'
  | 'compress'
  | 'flatten'
  | 'pdfa';

export interface WorkflowStep {
  id: string;
  kind: WorkflowStepKind;
  enabled: boolean;
  config: {
    rotateAngle?: 90 | 180 | 270;
    watermarkText?: string;
    watermarkOpacity?: number;
    pageNumberPosition?: PageNumberPosition;
    pageNumberFormat?: PageNumberFormat;
    compressPreset?: CompressionPreset;
    flattenMode?: 'forms-only' | 'full-static';
    pdfaLevel?: 'PDF/A-1b' | 'PDF/A-2b';
  };
}

export async function runCustomWorkflowPipeline(
  inputFile: File,
  steps: WorkflowStep[],
  onStepProgress?: (stepIndex: number, totalSteps: number, label: string) => void
): Promise<Uint8Array> {
  const activeSteps = steps.filter((s) => s.enabled);
  let currentFile = inputFile;
  let currentBytes: Uint8Array = new Uint8Array(await inputFile.arrayBuffer());

  for (let i = 0; i < activeSteps.length; i++) {
    const step = activeSteps[i];
    onStepProgress?.(i + 1, activeSteps.length, step.kind);

    if (step.kind === 'rotate') {
      const angle = step.config.rotateAngle || 90;
      const doc = await PDFDocument.load(await currentFile.arrayBuffer(), {
        ignoreEncryption: true,
      });
      const map: Record<number, number> = {};
      for (let p = 1; p <= doc.getPageCount(); p++) map[p] = angle;
      currentBytes = await rotatePdfPages(currentFile, map);
    } else if (step.kind === 'watermark') {
      currentBytes = await addWatermarkToPdf(currentFile, {
        type: 'text',
        text: step.config.watermarkText || 'CONFIDENTIAL',
        fontSize: 44,
        colorHex: '#6366F1',
        opacity: step.config.watermarkOpacity ?? 0.22,
        angle: -35,
        placement: 'center',
        imageScale: 0.4,
      });
    } else if (step.kind === 'page-numbers') {
      currentBytes = await addPageNumbersToPdf(currentFile, {
        position: step.config.pageNumberPosition || 'bottom-center',
        format: step.config.pageNumberFormat || 'page-n-of-total',
        startNumber: 1,
        skipFirstPage: false,
        fontSize: 10,
        marginPt: 24,
        colorHex: '#334155',
      });
    } else if (step.kind === 'compress') {
      const res = await compressPdfLocally(
        currentFile,
        step.config.compressPreset || 'recommended'
      );
      currentBytes = res.bytes;
    } else if (step.kind === 'flatten') {
      currentBytes = await flattenPdfFile(
        currentFile,
        step.config.flattenMode || 'full-static',
        150
      );
    } else if (step.kind === 'pdfa') {
      const res = await convertPdfToPdfA(
        currentFile,
        step.config.pdfaLevel || 'PDF/A-1b'
      );
      currentBytes = res.bytes;
    }

    currentFile = new File([new Uint8Array(currentBytes)], inputFile.name, {
      type: 'application/pdf',
    });
  }

  return currentBytes;
}
