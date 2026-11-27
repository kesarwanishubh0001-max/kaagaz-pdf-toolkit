import { PDFDocument, degrees, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

// Bundle the PDF.js worker directly with Vite for fast client-side execution
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PageThumbnail {
  id: string;
  originalPageNumber: number; // 1-based
  dataUrl: string;
  rotation: number; // 0, 90, 180, 270
  width: number;
  height: number;
}

export interface LoadedPdfFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  previewUrl?: string;
}

export type CompressionPreset = 'extreme' | 'recommended' | 'less';
export type ScanFilter = 'original' | 'grayscale' | 'bw-contrast' | 'magic-doc';

/**
 * Formats byte size into human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Safely strips script tags, inline event handlers, and javascript: URLs from HTML previews
 */
export function sanitizePreviewHtml(unsafeHtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(unsafeHtml, 'text/html');
  const blockedTags = ['script', 'iframe', 'object', 'embed', 'form', 'link', 'meta', 'base'];
  blockedTags.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  });
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || val.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}

/**
 * Parses page range string like "1-3, 5, 7-9" into sorted 1-based page numbers
 */
export function parsePageRanges(input: string, maxPages: number): number[] {
  const pages = new Set<number>();
  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(maxPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          pages.add(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPages) {
        pages.add(num);
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Generates an instant multi-page sample PDF file in memory for 1-click testing
 */
export async function createSamplePdfFile(
  filename = 'KAAGAZ-Sample-Report.pdf',
  pageCount = 6
): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const palette: [number, number, number][] = [
    [0.39, 0.4, 0.95], // Indigo
    [0.55, 0.36, 0.96], // Violet
    [0.06, 0.72, 0.5], // Emerald
    [0.92, 0.58, 0.05], // Amber
    [0.88, 0.25, 0.52], // Rose
    [0.06, 0.52, 0.88], // Sky
  ];

  const topics = [
    'Executive Summary & Q4 Financial Highlights',
    'Regional Revenue & Unit Economics Matrix',
    'Infrastructure Architecture & Latency Audit',
    'Client-Side Security & Zero-Knowledge Compliance',
    'Quarterly Product Roadmap & Delivery Milestones',
    'Appendix: Verification Checksums & Benchmarks',
  ];

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
    const [r, g, b] = palette[i % palette.length];
    const topic = topics[i % topics.length];

    // Header band
    page.drawRectangle({
      x: 40,
      y: height - 108,
      width: width - 80,
      height: 64,
      color: rgb(r, g, b),
    });

    page.drawText(`KAAGAZ  |  DOCUMENT PAGE ${i + 1}`, {
      x: 58,
      y: height - 82,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Overview block
    page.drawRectangle({
      x: 40,
      y: height - 310,
      width: width - 80,
      height: 175,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(r, g, b),
      borderWidth: 1.2,
    });

    page.drawText(`0${i + 1}`, {
      x: 68,
      y: height - 248,
      size: 74,
      font: fontBold,
      color: rgb(r, g, b),
    });

    page.drawText(topic, {
      x: 190,
      y: height - 190,
      size: 14,
      font: fontBold,
      color: rgb(0.08, 0.11, 0.17),
    });

    page.drawText(
      `Client-side sample document — Page ${i + 1} of ${pageCount}.`,
      {
        x: 190,
        y: height - 216,
        size: 10.5,
        font: fontRegular,
        color: rgb(0.35, 0.4, 0.5),
      }
    );

    page.drawText(
      'Supports Merging, Splitting, Removing, Extracting, Reordering,',
      {
        x: 190,
        y: height - 240,
        size: 10.5,
        font: fontRegular,
        color: rgb(0.35, 0.4, 0.5),
      }
    );

    page.drawText(
      'Compression, and Export to JPG, PNG, DOCX, PPTX, XLSX, and PDF/A.',
      {
        x: 190,
        y: height - 258,
        size: 10.5,
        font: fontRegular,
        color: rgb(0.35, 0.4, 0.5),
      }
    );

    // Structured data table for testing PDF-to-Excel and PDF-to-Word
    const tableHeaders = ['Region', 'Plan Tier', 'Q3 Volume', 'Growth'];
    const headerY = height - 365;
    page.drawRectangle({
      x: 40,
      y: headerY,
      width: width - 80,
      height: 28,
      color: rgb(0.12, 0.16, 0.23),
    });

    const colXs = [54, 195, 355, 475];
    tableHeaders.forEach((h, idx) => {
      page.drawText(h, {
        x: colXs[idx],
        y: headerY + 9,
        size: 10,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    });

    const rows = [
      ['North America', 'Enterprise', `$${420 + i * 35},000`, '+48.2%'],
      ['Europe (EMEA)', 'Business', `$${290 + i * 24},000`, '+39.6%'],
      ['Asia-Pacific', 'Self-Hosted', `$${215 + i * 19},000`, '+61.4%'],
      ['Latin America', 'Team Pro', `$${112 + i * 11},000`, '+44.0%'],
      ['Consolidated', 'All Tiers', `$${1037 + i * 89},000`, '+49.1%'],
    ];

    rows.forEach((row, rowIdx) => {
      const yPos = headerY - 30 - rowIdx * 32;
      page.drawRectangle({
        x: 40,
        y: yPos,
        width: width - 80,
        height: 30,
        color: rowIdx % 2 === 0 ? rgb(0.96, 0.97, 0.99) : rgb(1, 1, 1),
        borderColor: rgb(0.88, 0.9, 0.94),
        borderWidth: 0.5,
      });

      row.forEach((cell, cIdx) => {
        page.drawText(cell, {
          x: colXs[cIdx],
          y: yPos + 10,
          size: 10,
          font: rowIdx === rows.length - 1 || cIdx === 3 ? fontBold : fontRegular,
          color: cIdx === 3 ? rgb(r, g, b) : rgb(0.18, 0.22, 0.3),
        });
      });
    });

    page.drawText(
      `Generated locally in KAAGAZ  •  100% Client-Side  •  Page ${i + 1} of ${pageCount}`,
      {
        x: 40,
        y: 36,
        size: 9,
        font: fontRegular,
        color: rgb(0.5, 0.55, 0.65),
      }
    );
  }

  const pdfBytes = await pdfDoc.save();
  return new File([new Uint8Array(pdfBytes)], filename, {
    type: 'application/pdf',
  });
}

/**
 * Renders thumbnails for all pages of a PDF File using bundled pdfjs-dist worker
 */
export async function renderPdfThumbnails(
  file: File,
  scale = 0.5,
  onProgress?: (current: number, total: number) => void
): Promise<PageThumbnail[]> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const total = pdf.numPages;
    const thumbnails: PageThumbnail[] = [];

    for (let pageNum = 1; pageNum <= total; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      }

      thumbnails.push({
        id: `page-${pageNum}-${Math.random().toString(36).slice(2, 8)}`,
        originalPageNumber: pageNum,
        dataUrl: canvas.toDataURL('image/jpeg', 0.84),
        rotation: 0,
        width: viewport.width,
        height: viewport.height,
      });

      onProgress?.(pageNum, total);
    }

    return thumbnails;
  } catch {
    // Graceful pdf-lib fallback if rendering fails on malformed PDFs
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const total = doc.getPageCount();
    const thumbnails: PageThumbnail[] = [];

    for (let i = 1; i <= total; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 390;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, 0, 300, 390);
        ctx.fillStyle = '#6366F1';
        ctx.fillRect(24, 24, 252, 42);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`PDF PAGE ${i}`, 40, 50);
        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 54px sans-serif';
        ctx.fillText(`${i}`, 130, 215);
      }
      thumbnails.push({
        id: `page-${i}-${Math.random().toString(36).slice(2, 8)}`,
        originalPageNumber: i,
        dataUrl: canvas.toDataURL('image/jpeg', 0.82),
        rotation: 0,
        width: 300,
        height: 390,
      });
      onProgress?.(i, total);
    }
    return thumbnails;
  }
}

/**
 * Inspects a PDF file to get page count and first-page preview
 */
export async function inspectPdfFile(file: File): Promise<LoadedPdfFile> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  let previewUrl: string | undefined;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.35 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      previewUrl = canvas.toDataURL('image/jpeg', 0.8);
    }
  } catch {
    previewUrl = undefined;
  }

  return {
    id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    file,
    name: file.name,
    size: file.size,
    pageCount,
    previewUrl,
  };
}

/**
 * TOOL 1: Merge multiple PDF files into one
 */
export async function mergePdfFiles(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * TOOL 2A, 3 & 4A: Extract specific 1-based page numbers into a single PDF
 */
export async function extractPagesToSinglePdf(
  file: File,
  pageNumbers: number[]
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  const validIndices = pageNumbers
    .map((n) => n - 1)
    .filter((idx) => idx >= 0 && idx < sourcePdf.getPageCount());

  const copied = await newPdf.copyPages(sourcePdf, validIndices);
  copied.forEach((p) => newPdf.addPage(p));
  return await newPdf.save();
}

/**
 * TOOL 2B & 4B: Split selected 1-based page numbers into individual PDFs inside a ZIP archive
 */
export async function splitPagesToZip(
  file: File,
  pageNumbers: number[]
): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const zip = new JSZip();
  const baseName = file.name.replace(/\.pdf$/i, '');

  for (const pageNum of pageNumbers) {
    const idx = pageNum - 1;
    if (idx < 0 || idx >= sourcePdf.getPageCount()) continue;
    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(sourcePdf, [idx]);
    singleDoc.addPage(copiedPage);
    const singleBytes = await singleDoc.save();
    zip.file(
      `${baseName}-page-${String(pageNum).padStart(2, '0')}.pdf`,
      singleBytes
    );
  }

  return await zip.generateAsync({ type: 'blob' });
}

export interface SplitRangeSpec {
  id: string;
  label: string;
  from: number;
  to: number;
}

export interface GeneratedSplitOutput {
  id: string;
  filename: string;
  pageRangeLabel: string;
  pageCount: number;
  bytes: Uint8Array;
}

/**
 * TOOL 2C: Split a single PDF into multiple independent PDFs by custom page ranges
 */
export async function splitPdfByRanges(
  file: File,
  ranges: SplitRangeSpec[]
): Promise<GeneratedSplitOutput[]> {
  const bytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();
  const baseName = file.name.replace(/\.pdf$/i, '');
  const outputs: GeneratedSplitOutput[] = [];

  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const start = Math.max(1, Math.min(totalPages, Math.min(r.from, r.to)));
    const end = Math.max(1, Math.min(totalPages, Math.max(r.from, r.to)));
    const indices: number[] = [];
    for (let p = start; p <= end; p++) {
      indices.push(p - 1);
    }
    if (indices.length === 0) continue;

    const outDoc = await PDFDocument.create();
    const copied = await outDoc.copyPages(sourcePdf, indices);
    copied.forEach((p) => outDoc.addPage(p));
    const outBytes = await outDoc.save();
    const rangeStr = start === end ? `p${start}` : `p${start}-${end}`;
    outputs.push({
      id: r.id,
      filename: `${baseName}-split-${i + 1}-${rangeStr}.pdf`,
      pageRangeLabel: start === end ? `Page ${start}` : `Pages ${start}–${end}`,
      pageCount: indices.length,
      bytes: outBytes,
    });
  }

  return outputs;
}

/**
 * Compute fixed-size split ranges (e.g. every N pages: 1-10, 11-20, 21-24)
 */
export function buildFixedRanges(
  totalPages: number,
  pagesPerSplit: number
): SplitRangeSpec[] {
  const step = Math.max(1, Math.floor(pagesPerSplit));
  const ranges: SplitRangeSpec[] = [];
  let idx = 1;
  for (let start = 1; start <= totalPages; start += step) {
    const end = Math.min(totalPages, start + step - 1);
    ranges.push({
      id: `fixed-${idx}-${start}-${end}`,
      label: `Split ${idx}`,
      from: start,
      to: end,
    });
    idx += 1;
  }
  return ranges;
}

/**
 * Package any list of generated files into a downloadable ZIP archive
 */
export async function bundleOutputsToZip(
  outputs: { filename: string; bytes: Uint8Array }[]
): Promise<Blob> {
  const zip = new JSZip();
  const seen = new Map<string, number>();
  for (const out of outputs) {
    const count = seen.get(out.filename) || 0;
    seen.set(out.filename, count + 1);
    const finalName =
      count === 0
        ? out.filename
        : out.filename.replace(/(\.[^.]+)$/, `-${count + 1}$1`);
    zip.file(finalName, out.bytes);
  }
  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Staggered sequential download of multiple files directly to disk without needing to unzip
 */
export async function downloadFilesSequentially(
  files: { filename: string; data: Uint8Array | Blob; mimeType?: string }[]
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    const item = files[i];
    triggerDownload(item.data, item.filename, item.mimeType || 'application/pdf');
    if (i < files.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 260));
    }
  }
}

/**
 * TOOL 5: Organize PDF (Reorder, Duplicate, Rotate, Delete pages)
 */
export async function buildOrganizedPdf(
  file: File,
  orderedPages: PageThumbnail[]
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const outPdf = await PDFDocument.create();

  for (const item of orderedPages) {
    const idx = item.originalPageNumber - 1;
    const [copiedPage] = await outPdf.copyPages(sourcePdf, [idx]);
    if (item.rotation !== 0) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + item.rotation) % 360));
    }
    outPdf.addPage(copiedPage);
  }

  return await outPdf.save();
}

/**
 * TOOL 6A: Apply document filter to a webcam/uploaded image dataURL
 */
export async function applyDocumentFilter(
  sourceDataUrl: string,
  filter: ScanFilter,
  rotation = 0
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const isRotated90 = rotation % 180 !== 0;
      canvas.width = isRotated90 ? img.height : img.width;
      canvas.height = isRotated90 ? img.width : img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      if (filter !== 'original') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (filter === 'grayscale') {
            data[i] = data[i + 1] = data[i + 2] = lum;
          } else if (filter === 'bw-contrast') {
            const contrast = 1.85;
            const adjusted = Math.min(255, Math.max(0, (lum - 128) * contrast + 135));
            const bw = adjusted > 142 ? 255 : Math.max(15, adjusted * 0.4);
            data[i] = data[i + 1] = data[i + 2] = bw;
          } else if (filter === 'magic-doc') {
            const boost = 1.25;
            data[i] = Math.min(255, Math.max(0, (r - 110) * boost + 128));
            data[i + 1] = Math.min(255, Math.max(0, (g - 110) * boost + 128));
            data[i + 2] = Math.min(255, Math.max(0, (b - 110) * boost + 128));
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = sourceDataUrl;
  });
}

/**
 * TOOL 6B: Compile scanned images into a clean multi-page PDF using jsPDF
 */
export async function compileScansToPdf(
  images: { processedDataUrl: string }[],
  pageSize: 'a4' | 'letter' = 'a4'
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: pageSize,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 24;

  for (let i = 0; i < images.length; i++) {
    if (i > 0) doc.addPage();
    const dataUrl = images[i].processedDataUrl;

    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.src = dataUrl;
    });

    const availW = pageWidth - margin * 2;
    const availH = pageHeight - margin * 2;
    const ratio = Math.min(availW / dims.w, availH / dims.h);
    const drawW = dims.w * ratio;
    const drawH = dims.h * ratio;
    const x = (pageWidth - drawW) / 2;
    const y = (pageHeight - drawH) / 2;

    doc.addImage(dataUrl, 'JPEG', x, y, drawW, drawH, undefined, 'FAST');
  }

  return doc.output('blob');
}

/**
 * TOOL 7: Compress PDF locally using structural stream compression + adaptive page raster re-encoding
 */
export async function compressPdfLocally(
  file: File,
  preset: CompressionPreset,
  onProgress?: (current: number, total: number) => void
): Promise<{ bytes: Uint8Array; method: string }> {
  const arrayBuffer = await file.arrayBuffer();

  const config = {
    extreme: { scale: 0.95, quality: 0.42, label: 'Extreme Downsample & JPEG Re-encode' },
    recommended: {
      scale: 1.3,
      quality: 0.66,
      label: 'Balanced Raster + Object Stream Compaction',
    },
    less: {
      scale: 1.75,
      quality: 0.84,
      label: 'High-Fidelity Object Stream Optimization',
    },
  }[preset];

  const sourceDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });
  sourceDoc.setTitle('');
  sourceDoc.setAuthor('');
  sourceDoc.setSubject('');
  sourceDoc.setKeywords([]);
  sourceDoc.setProducer('KAAGAZ');
  sourceDoc.setCreator('KAAGAZ');

  const structuralBytes = await sourceDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const total = pdf.numPages;
    const rebuiltPdf = await PDFDocument.create();

    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i);
      const origViewport = page.getViewport({ scale: 1.0 });
      const renderViewport = page.getViewport({ scale: config.scale });

      const canvas = document.createElement('canvas');
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: renderViewport, canvas })
          .promise;
      }

      const jpegDataUrl = canvas.toDataURL('image/jpeg', config.quality);
      const jpgImage = await rebuiltPdf.embedJpg(jpegDataUrl);
      const newPage = rebuiltPdf.addPage([
        origViewport.width,
        origViewport.height,
      ]);
      newPage.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: origViewport.width,
        height: origViewport.height,
      });

      onProgress?.(i, total);
    }

    const rasterBytes = await rebuiltPdf.save({ useObjectStreams: true });

    if (rasterBytes.byteLength < structuralBytes.byteLength || preset === 'extreme') {
      return { bytes: rasterBytes, method: config.label };
    }
  } catch {
    // Fallback to structural compaction
  }

  return {
    bytes: structuralBytes,
    method: 'Object Stream & Metadata Compaction',
  };
}

/**
 * Triggers a file download (native Android Downloads/Kaagaz inside APK, or browser download)
 */
export function triggerDownload(
  data: Uint8Array | Blob,
  filename: string,
  mimeType = 'application/pdf'
) {
  const blob =
    data instanceof Blob
      ? data
      : new Blob([new Uint8Array(data)], { type: mimeType });

  // Inside the Android APK WebView, save natively to Downloads/Kaagaz
  const nativeBridge = (
    window as Window & {
      KaagazNative?: {
        saveFileToDownloads?: (name: string, b64: string, mime: string) => string;
      };
    }
  ).KaagazNative;

  if (nativeBridge?.saveFileToDownloads) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result;
      try {
        nativeBridge.saveFileToDownloads!(filename, base64, mimeType);
      } catch {
        // Ignore bridge failure and fallback below
      }
    };
    reader.readAsDataURL(blob);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
