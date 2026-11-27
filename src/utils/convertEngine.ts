import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
} from 'docx';
import PptxGenJS from 'pptxgenjs';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';

/* ============================================================================
   TOOL 8: JPG / PNG / WebP TO PDF
============================================================================ */
export interface ImageToPdfItem {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
  width: number;
  height: number;
}

export interface JpgToPdfOptions {
  pageSize: 'a4' | 'letter' | 'fit';
  orientation: 'portrait' | 'landscape' | 'auto';
  marginPt: number;
}

export async function loadImageFileToItem(file: File): Promise<ImageToPdfItem> {
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

  return {
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    size: file.size,
    dataUrl,
    width: dims.w,
    height: dims.h,
  };
}

export async function createSyntheticSampleImages(): Promise<ImageToPdfItem[]> {
  const specs = [
    {
      title: '01. Product Architecture Overview',
      sub: 'Client-Side Execution Pipeline',
      bg1: '#0071E3',
      bg2: '#0A84FF',
      w: 1200,
      h: 900,
    },
    {
      title: '02. Quarterly Growth Summary',
      sub: 'Enterprise Self-Hosted & Private Deployment',
      bg1: '#059669',
      bg2: '#0284C7',
      w: 900,
      h: 1200,
    },
    {
      title: '03. ISO Compliance & Privacy Matrix',
      sub: 'Zero Server Uploads • In-Browser Serialization',
      bg1: '#D97706',
      bg2: '#E11D48',
      w: 1200,
      h: 900,
    },
  ];

  const items: ImageToPdfItem[] = [];

  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const canvas = document.createElement('canvas');
    canvas.width = s.w;
    canvas.height = s.h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, s.w, s.h);
      grad.addColorStop(0, s.bg1);
      grad.addColorStop(1, s.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s.w, s.h);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fillRect(72, 72, s.w - 144, s.h - 144);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText(s.title, 120, 220);

      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = '26px sans-serif';
      ctx.fillText(s.sub, 120, 278);

      ctx.font = '20px monospace';
      ctx.fillText(
        `Resolution: ${s.w}x${s.h}px  •  Sample Image #${i + 1}`,
        120,
        s.h - 125
      );
    }
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    items.push({
      id: `demo-img-${i}-${Date.now()}`,
      name: `Prism-Slide-0${i + 1}.jpg`,
      size: Math.round(dataUrl.length * 0.75),
      dataUrl,
      width: s.w,
      height: s.h,
    });
  }
  return items;
}

export async function convertImagesToPdf(
  images: ImageToPdfItem[],
  options: JpgToPdfOptions
): Promise<Blob> {
  if (images.length === 0) throw new Error('No images provided');

  const first = images[0];
  const resolveOrientation = (img: ImageToPdfItem): 'p' | 'l' => {
    if (options.orientation === 'portrait') return 'p';
    if (options.orientation === 'landscape') return 'l';
    return img.width >= img.height ? 'l' : 'p';
  };

  const firstOrient = resolveOrientation(first);
  const doc = new jsPDF({
    orientation: firstOrient,
    unit: 'pt',
    format:
      options.pageSize === 'fit'
        ? [first.width, first.height]
        : options.pageSize,
  });

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const orient = resolveOrientation(img);

    if (i > 0) {
      if (options.pageSize === 'fit') {
        doc.addPage([img.width, img.height], orient);
      } else {
        doc.addPage(options.pageSize, orient);
      }
    }

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = options.pageSize === 'fit' ? 0 : options.marginPt;

    const availW = Math.max(20, pageW - margin * 2);
    const availH = Math.max(20, pageH - margin * 2);
    const scale = Math.min(availW / img.width, availH / img.height);

    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    const imgFormat = img.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    doc.addImage(img.dataUrl, imgFormat, x, y, drawW, drawH, undefined, 'FAST');
  }

  return doc.output('blob');
}

/* ============================================================================
   TOOL 9: WORD (.DOCX / .TXT) TO PDF
============================================================================ */
export interface ParsedWordDoc {
  filename: string;
  html: string;
  rawText: string;
  wordCount: number;
}

export async function parseWordOrTextFile(file: File): Promise<ParsedWordDoc> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const rawText = textResult.value.trim();
    const words = rawText ? rawText.split(/\s+/).length : 0;
    return {
      filename: file.name,
      html:
        htmlResult.value ||
        `<p>${rawText.replace(/\n/g, '</p><p>')}</p>`,
      rawText,
      wordCount: words,
    };
  } else {
    const text = await file.text();
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const html = escaped
      .split(/\n\n+/)
      .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return {
      filename: file.name,
      html,
      rawText: text,
      wordCount: words,
    };
  }
}

export async function createSampleDocxFile(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: 'KAAGAZ — Executive Technical Brief',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Prepared by Document Engineering Team  •  Confidential',
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            text: '1. Local-First Architecture Overview',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: 'All OOXML document parsing, layout typesetting, and PDF generation run strictly inside browser memory. Sensitive contracts, financial ledgers, and compliance reports never leave the user device.',
          }),
          new Paragraph({
            text: '2. Supported Client-Side Pipelines',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: '• Word (.docx) parsed via Mammoth into clean headings and paragraphs.',
          }),
          new Paragraph({
            text: '• PowerPoint (.pptx) unpacked via JSZip slide XML nodes and embedded media.',
          }),
          new Paragraph({
            text: '• Excel (.xlsx) parsed via SheetJS into multi-sheet tabular exports.',
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return new File([blob], 'Prism-Executive-Brief.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export function renderStructuredHtmlToPdf(
  title: string,
  htmlString: string,
  options: {
    fontSize: number;
    pageSize: 'a4' | 'letter';
    marginPt?: number;
    showHeaderBanner?: boolean;
  }
): Blob {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: options.pageSize,
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = options.marginPt ?? 48;
  const maxLineW = pageW - margin * 2;
  let cursorY = margin;

  if (options.showHeaderBanner !== false) {
    pdf.setFillColor(79, 70, 229);
    pdf.rect(margin, cursorY, maxLineW, 28, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.text(title.slice(0, 75), margin + 12, cursorY + 18);
    cursorY += 46;
  }

  const parser = new DOMParser();
  const dom = parser.parseFromString(htmlString, 'text/html');
  // Remove script/style nodes before traversing text
  dom.querySelectorAll('script, style').forEach((n) => n.remove());

  const blocks = dom.body.querySelectorAll('h1, h2, h3, h4, p, li, pre, blockquote, tr');

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > pageH - margin) {
      pdf.addPage();
      cursorY = margin;
    }
  };

  const writeBlock = (
    text: string,
    opts: {
      bold?: boolean;
      italic?: boolean;
      mono?: boolean;
      size: number;
      indent?: number;
      isCodeBox?: boolean;
      color?: [number, number, number];
    }
  ) => {
    const clean = opts.isCodeBox ? text.trim() : text.replace(/\s+/g, ' ').trim();
    if (!clean) return;

    const fontName = opts.mono ? 'courier' : 'helvetica';
    const fontStyle = opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal';
    pdf.setFont(fontName, fontStyle);
    pdf.setFontSize(opts.size);

    const indent = opts.indent ?? 0;
    const padX = opts.isCodeBox ? 10 : 0;
    const lines: string[] = pdf.splitTextToSize(clean, maxLineW - indent - padX * 2);
    const lineHeight = opts.size * 1.45;

    if (opts.isCodeBox) {
      const boxH = lines.length * lineHeight + 16;
      ensureSpace(boxH);
      pdf.setFillColor(15, 23, 42);
      pdf.roundedRect(margin + indent, cursorY - 6, maxLineW - indent, boxH, 4, 4, 'F');
      pdf.setTextColor(226, 232, 240);
      cursorY += 8;
      for (const line of lines) {
        pdf.text(line, margin + indent + padX, cursorY);
        cursorY += lineHeight;
      }
      cursorY += 14;
      return;
    }

    const [r, g, b] = opts.color ?? (opts.bold ? [15, 23, 42] : [45, 55, 72]);
    pdf.setTextColor(r, g, b);

    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(line, margin + indent, cursorY);
      cursorY += lineHeight;
    }
    cursorY += opts.bold ? 6 : 7;
  };

  if (blocks.length > 0) {
    blocks.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      // Skip paragraphs nested inside li or blockquote to avoid duplicates
      if (tag === 'p' && el.closest('li, blockquote')) return;

      if (tag === 'tr') {
        const cells = Array.from(el.querySelectorAll('th, td')).map((c) =>
          (c.textContent || '').trim()
        );
        if (cells.length === 0) return;
        const isHeaderRow = el.querySelectorAll('th').length > 0;
        const colW = maxLineW / cells.length;
        const rowH = 22;
        ensureSpace(rowH);
        pdf.setFillColor(isHeaderRow ? 30 : 248, isHeaderRow ? 41 : 250, isHeaderRow ? 59 : 252);
        pdf.rect(margin, cursorY - 12, maxLineW, rowH, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(margin, cursorY - 12, maxLineW, rowH, 'S');
        pdf.setFont('helvetica', isHeaderRow ? 'bold' : 'normal');
        pdf.setFontSize(Math.max(8.5, options.fontSize - 1.5));
        pdf.setTextColor(isHeaderRow ? 255 : 30, isHeaderRow ? 255 : 41, isHeaderRow ? 255 : 59);
        cells.forEach((cell, idx) => {
          const clipped = pdf.splitTextToSize(cell, colW - 10)[0] || '';
          pdf.text(clipped, margin + idx * colW + 5, cursorY + 2);
        });
        cursorY += rowH;
        return;
      }

      const txt = el.textContent || '';
      if (tag === 'h1') {
        cursorY += 4;
        writeBlock(txt, { bold: true, size: options.fontSize + 7, color: [15, 23, 42] });
      } else if (tag === 'h2') {
        cursorY += 6;
        writeBlock(txt, { bold: true, size: options.fontSize + 4, color: [49, 46, 129] });
      } else if (tag === 'h3' || tag === 'h4') {
        cursorY += 4;
        writeBlock(txt, { bold: true, size: options.fontSize + 1.5 });
      } else if (tag === 'li') {
        writeBlock(`•  ${txt}`, { size: options.fontSize, indent: 12 });
      } else if (tag === 'pre') {
        writeBlock(txt, { mono: true, size: Math.max(8.5, options.fontSize - 1.5), isCodeBox: true });
      } else if (tag === 'blockquote') {
        writeBlock(`"${txt.trim()}"`, {
          italic: true,
          size: options.fontSize,
          indent: 14,
          color: [71, 85, 105],
        });
      } else {
        writeBlock(txt, { size: options.fontSize });
      }
    });
  } else {
    const rawLines = (dom.body.textContent || htmlString).split('\n');
    rawLines.forEach((line) => writeBlock(line, { size: options.fontSize }));
  }

  return pdf.output('blob');
}

/* ============================================================================
   TOOL 10: POWERPOINT (.PPTX) TO PDF
============================================================================ */
export interface ExtractedPptxSlide {
  slideNumber: number;
  title: string;
  bullets: string[];
  images: string[];
}

export async function parsePptxFile(file: File): Promise<ExtractedPptxSlide[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const mediaMap: Record<string, string> = {};
  const mediaFiles = Object.keys(zip.files).filter((p) =>
    /^ppt\/media\/.+\.(png|jpg|jpeg)$/i.test(p)
  );
  for (const mediaPath of mediaFiles) {
    const base64 = await zip.files[mediaPath].async('base64');
    const ext = mediaPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
    mediaMap[mediaPath] = `data:image/${ext};base64,${base64}`;
  }

  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
      return numA - numB;
    });

  const slides: ExtractedPptxSlide[] = [];
  const parser = new DOMParser();

  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];
    const xmlStr = await zip.files[slidePath].async('string');
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

    // Look up slide relationships for embedded images
    const slideFile = slidePath.split('/').pop()!;
    const relsPath = `ppt/slides/_rels/${slideFile}.rels`;
    const slideImages: string[] = [];
    if (zip.files[relsPath]) {
      const relsXml = await zip.files[relsPath].async('string');
      const relsDoc = parser.parseFromString(relsXml, 'application/xml');
      const rels = Array.from(relsDoc.getElementsByTagName('Relationship'));
      for (const rel of rels) {
        const target = rel.getAttribute('Target') || '';
        if (target.includes('../media/')) {
          const resolved = `ppt/media/${target.split('../media/')[1]}`;
          if (mediaMap[resolved]) {
            slideImages.push(mediaMap[resolved]);
          }
        }
      }
    }

    const pNodes = Array.from(xmlDoc.getElementsByTagName('a:p'));
    const lines: string[] = [];

    for (const p of pNodes) {
      const tNodes = Array.from(p.getElementsByTagName('a:t'));
      const text = tNodes
        .map((n) => n.textContent || '')
        .join('')
        .trim();
      if (text) lines.push(text);
    }

    const title = lines[0] || `Slide ${i + 1}`;
    const bullets = lines.slice(1);

    slides.push({
      slideNumber: i + 1,
      title,
      bullets,
      images: slideImages,
    });
  }

  return slides;
}

export async function createSamplePptxFile(): Promise<File> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  const slideSpecs = [
    {
      title: 'KAAGAZ Enterprise Deck — Q4 Strategy',
      bullets: [
        '100% Client-Side PDF and Office Productivity Suite',
        'Zero Cloud Upload Latency with Full Client-Side Privacy',
        'Built on pdf-lib, PDF.js, SheetJS, Mammoth, and PptxGenJS',
      ],
    },
    {
      title: 'Performance and Data Privacy Benchmarks',
      bullets: [
        'Sub-200ms Local Document Parsing and Thumbnail Rendering',
        'Strict Local Memory Residency for Legal and Financial Teams',
        'Unified Conversion Across PDF, DOCX, PPTX, XLSX, HTML, and Markdown',
      ],
    },
    {
      title: 'Upcoming Product Milestones',
      bullets: [
        'Multi-Step Batch Pipelines and Saved Preset Templates',
        'Client-Side Archival PDF/A-1b and PDF/A-2b Serialization',
        'Keyboard-First Command Palette Navigation Across All Tools',
      ],
    },
  ];

  slideSpecs.forEach((s) => {
    const slide = pptx.addSlide();
    slide.addText(s.title, {
      x: 0.6,
      y: 0.6,
      w: 8.8,
      h: 0.9,
      fontSize: 24,
      bold: true,
      color: '4F46E5',
    });
    slide.addText(s.bullets.map((b) => `•  ${b}`).join('\n\n'), {
      x: 0.8,
      y: 1.8,
      w: 8.4,
      h: 3.2,
      fontSize: 16,
      color: '1E293B',
    });
  });

  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  return new File([blob], 'Prism-Quarterly-Keynote.pptx', {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
}

export function renderSlidesToPdf(
  slides: ExtractedPptxSlide[],
  theme: 'dark-slate' | 'crisp-light' = 'dark-slate'
): Blob {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [792, 446],
  });

  slides.forEach((slide, idx) => {
    if (idx > 0) pdf.addPage([792, 446], 'landscape');

    if (theme === 'dark-slate') {
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, 792, 446, 'F');
    } else {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, 792, 446, 'F');
    }

    // Top accent bar
    pdf.setFillColor(99, 102, 241);
    pdf.rect(0, 0, 792, 8, 'F');

    // Slide index badge
    pdf.setFillColor(79, 70, 229);
    pdf.roundedRect(48, 36, 74, 22, 5, 5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`SLIDE ${String(slide.slideNumber).padStart(2, '0')}`, 60, 50);

    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(23);
    pdf.setTextColor(
      theme === 'dark-slate' ? 255 : 15,
      theme === 'dark-slate' ? 255 : 23,
      theme === 'dark-slate' ? 255 : 42
    );
    const titleLines = pdf.splitTextToSize(slide.title, 690);
    pdf.text(titleLines, 48, 96);

    pdf.setDrawColor(99, 102, 241);
    pdf.setLineWidth(0.9);
    pdf.line(48, 122, 744, 122);

    const hasImage = slide.images.length > 0;
    const textMaxW = hasImage ? 420 : 680;

    let y = 160;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(13.5);
    pdf.setTextColor(
      theme === 'dark-slate' ? 203 : 51,
      theme === 'dark-slate' ? 213 : 65,
      theme === 'dark-slate' ? 225 : 85
    );

    slide.bullets.forEach((b) => {
      const wrapped = pdf.splitTextToSize(`•  ${b}`, textMaxW);
      wrapped.forEach((line: string) => {
        if (y < 395) {
          pdf.text(line, 54, y);
          y += 22;
        }
      });
      y += 6;
    });

    if (hasImage) {
      try {
        const imgData = slide.images[0];
        const fmt = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        pdf.addImage(imgData, fmt, 496, 145, 248, 220, undefined, 'FAST');
      } catch {
        // Ignore unsupported media encodings
      }
    }

    pdf.setFontSize(9);
    pdf.setTextColor(120, 130, 150);
    pdf.text(
      `KAAGAZ  •  Slide ${slide.slideNumber} of ${slides.length}`,
      48,
      422
    );
  });

  return pdf.output('blob');
}

/* ============================================================================
   TOOL 11: EXCEL (.XLSX / .CSV) TO PDF
============================================================================ */
export interface ParsedSpreadsheet {
  filename: string;
  sheetNames: string[];
  sheets: Record<string, string[][]>;
}

export async function parseExcelOrCsvFile(
  file: File
): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets: Record<string, string[][]> = {};

  workbook.SheetNames.forEach((name) => {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: '',
    });
    sheets[name] = rows.map((r) => r.map((cell) => String(cell ?? '')));
  });

  return {
    filename: file.name,
    sheetNames: workbook.SheetNames,
    sheets,
  };
}

export function createSampleExcelFile(): File {
  const q3Data = [
    ['Region', 'Product Tier', 'Q1 Revenue', 'Q2 Revenue', 'Q3 Revenue', 'YoY Growth'],
    ['North America', 'Prism Enterprise', '$420,000', '$510,000', '$640,000', '+52.4%'],
    ['Europe (EMEA)', 'Prism Team SaaS', '$280,000', '$330,000', '$415,000', '+48.2%'],
    ['Asia-Pacific', 'Prism Self-Hosted', '$195,000', '$245,000', '$360,000', '+84.6%'],
    ['Latin America', 'Prism Pro Cloud', '$92,000', '$118,000', '$154,000', '+67.3%'],
    ['TOTAL CONSOLIDATED', 'All Tiers', '$987,000', '$1,203,000', '$1,569,000', '+58.9%'],
  ];
  const opsData = [
    ['Department', 'Headcount', 'Annual Budget', 'Utilization', 'Status'],
    ['Engineering', '42', '$6,400,000', '94%', 'On Track'],
    ['Product Design', '11', '$1,650,000', '91%', 'On Track'],
    ['Security & Compliance', '8', '$1,320,000', '97%', 'Verified'],
    ['Customer Success', '19', '$2,100,000', '88%', 'Expanding'],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(q3Data), 'Q3_Revenue');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(opsData), 'Operations_Budget');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new File([out], 'Prism-Q3-Financial-Ledger.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function renderSpreadsheetToPdf(
  sheetTitle: string,
  rows: string[][],
  orientation: 'landscape' | 'portrait' = 'landscape'
): Blob {
  const pdf = new jsPDF({
    orientation,
    unit: 'pt',
    format: 'a4',
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const availW = pageW - margin * 2;
  let y = margin;

  pdf.setFillColor(16, 185, 129);
  pdf.rect(margin, y, availW, 28, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`SPREADSHEET REPORT  •  ${sheetTitle}`, margin + 12, y + 18);
  y += 40;

  const nonEmptyRows = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmptyRows.length === 0) return pdf.output('blob');

  const colCount = Math.max(...nonEmptyRows.map((r) => r.length), 1);
  const colW = availW / colCount;
  const rowH = 24;

  nonEmptyRows.forEach((row, rIdx) => {
    if (y + rowH > pageH - margin) {
      pdf.addPage();
      y = margin;
    }

    const isHeader = rIdx === 0;
    if (isHeader) {
      pdf.setFillColor(30, 41, 59);
      pdf.rect(margin, y, availW, rowH, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
    } else {
      pdf.setFillColor(
        rIdx % 2 === 0 ? 248 : 255,
        rIdx % 2 === 0 ? 250 : 255,
        rIdx % 2 === 0 ? 252 : 255
      );
      pdf.rect(margin, y, availW, rowH, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(30, 41, 59);
    }

    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, availW, rowH, 'S');

    pdf.setFontSize(9.5);
    for (let c = 0; c < colCount; c++) {
      const cellText = String(row[c] ?? '');
      const x = margin + c * colW + 6;
      const clipped = pdf.splitTextToSize(cellText, colW - 12)[0] || '';
      pdf.text(clipped, x, y + 16);
    }

    y += rowH;
  });

  return pdf.output('blob');
}

/* ============================================================================
   TOOL 12 & 13: HTML TO PDF & MARKDOWN TO PDF
============================================================================ */
export function compileMarkdownToHtml(md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = escaped.split('\n');
  const out: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let inList = false;
  let inTable = false;
  let tableHeaderDone = false;

  const formatInline = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      out.push('</tbody></table>');
      inTable = false;
      tableHeaderDone = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed.startsWith('```')) {
      closeList();
      closeTable();
      if (!inCode) {
        inCode = true;
        codeBuf = [];
      } else {
        out.push(`<pre>${codeBuf.join('\n')}</pre>`);
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      codeBuf.push(raw);
      continue;
    }

    // Markdown pipe table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      closeList();
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      // Separator line |---|---|
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) {
        tableHeaderDone = true;
        continue;
      }
      if (!inTable) {
        inTable = true;
        out.push('<table><thead><tr>');
        cells.forEach((c) => out.push(`<th>${formatInline(c)}</th>`));
        out.push('</tr></thead><tbody>');
      } else if (tableHeaderDone) {
        out.push('<tr>');
        cells.forEach((c) => out.push(`<td>${formatInline(c)}</td>`));
        out.push('</tr>');
      } else {
        out.push('<tr>');
        cells.forEach((c) => out.push(`<td>${formatInline(c)}</td>`));
        out.push('</tr>');
      }
      continue;
    } else {
      closeTable();
    }

    if (!trimmed) {
      closeList();
      continue;
    }

    if (trimmed.startsWith('### ')) {
      closeList();
      out.push(`<h3>${formatInline(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith('## ')) {
      closeList();
      out.push(`<h2>${formatInline(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith('# ')) {
      closeList();
      out.push(`<h1>${formatInline(trimmed.slice(2))}</h1>`);
    } else if (trimmed.startsWith('&gt; ')) {
      closeList();
      out.push(`<blockquote>${formatInline(trimmed.slice(5))}</blockquote>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${formatInline(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
    } else {
      closeList();
      out.push(`<p>${formatInline(trimmed)}</p>`);
    }
  }

  closeList();
  closeTable();
  if (inCode) {
    out.push(`<pre>${codeBuf.join('\n')}</pre>`);
  }

  return out.join('\n');
}

/* ============================================================================
   TOOL 14 & 15: PDF TO JPG & PDF TO PNG (Selectable DPI + ZIP Export)
============================================================================ */
export interface RenderedPdfImage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function renderPdfToImagesAtDpi(
  file: File,
  format: 'jpeg' | 'png',
  dpi: 72 | 150 | 300,
  jpegQuality = 0.92,
  onProgress?: (current: number, total: number) => void
): Promise<RenderedPdfImage[]> {
  const scale = dpi / 72;
  const arrayBuffer = await file.arrayBuffer();
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages;
  const output: RenderedPdfImage[] = [];

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    }

    const dataUrl =
      format === 'png'
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL(mime, jpegQuality);

    output.push({
      pageNumber: pageNum,
      dataUrl,
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
      sizeBytes: Math.round((dataUrl.length * 3) / 4),
    });

    onProgress?.(pageNum, total);
  }

  return output;
}

export async function bundleRenderedImagesToZip(
  images: RenderedPdfImage[],
  baseFilename: string,
  ext: 'jpg' | 'png'
): Promise<Blob> {
  const zip = new JSZip();
  for (const img of images) {
    const base64Data = img.dataUrl.split(',')[1];
    zip.file(
      `${baseFilename}-page-${String(img.pageNumber).padStart(2, '0')}.${ext}`,
      base64Data,
      { base64: true }
    );
  }
  return await zip.generateAsync({ type: 'blob' });
}

/* ============================================================================
   TOOL 16: PDF TO WORD (.DOCX)
============================================================================ */
export interface ExtractedPdfPageText {
  pageNumber: number;
  paragraphs: string[];
}

export async function extractPdfStructuredText(
  file: File
): Promise<ExtractedPdfPageText[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const pages: ExtractedPdfPageText[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();

    const lineBuckets: { y: number; items: { x: number; str: string }[] }[] = [];

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      let bucket = lineBuckets.find((b) => Math.abs(b.y - y) < 5);
      if (!bucket) {
        bucket = { y, items: [] };
        lineBuckets.push(bucket);
      }
      bucket.items.push({ x, str: item.str });
    }

    lineBuckets.sort((a, b) => b.y - a.y);

    const paragraphs = lineBuckets
      .map((b) =>
        b.items
          .sort((a, c) => a.x - c.x)
          .map((i) => i.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(Boolean);

    pages.push({
      pageNumber: p,
      paragraphs,
    });
  }

  return pages;
}

export async function generateDocxFromPdfText(
  filename: string,
  pages: ExtractedPdfPageText[]
): Promise<Blob> {
  const children: Paragraph[] = [
    new Paragraph({
      text: filename.replace(/\.pdf$/i, ''),
      heading: HeadingLevel.HEADING_1,
    }),
  ];

  pages.forEach((page, pageIdx) => {
    children.push(
      new Paragraph({
        text: `Page ${page.pageNumber}`,
        heading: HeadingLevel.HEADING_2,
      })
    );

    page.paragraphs.forEach((para, idx) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: para,
              bold: idx === 0 && para.length < 75,
              size: idx === 0 && para.length < 75 ? 26 : 22,
            }),
          ],
          spacing: { after: 150 },
        })
      );
    });

    if (pageIdx < pages.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  });

  const doc = new Document({
    sections: [{ children }],
  });

  return await Packer.toBlob(doc);
}

/* ============================================================================
   TOOL 17: PDF TO POWERPOINT (.PPTX)
============================================================================ */
export async function convertPdfToPptxBlob(
  file: File,
  slideBgHex: '0F172A' | 'FFFFFF' = '0F172A',
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const rendered = await renderPdfToImagesAtDpi(
    file,
    'jpeg',
    150,
    0.9,
    onProgress
  );
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  rendered.forEach((img) => {
    const slide = pptx.addSlide();
    slide.background = { color: slideBgHex };

    const slideW = 10;
    const slideH = 5.625;
    const imgRatio = img.width / img.height;
    let drawH = slideH - 0.3;
    let drawW = drawH * imgRatio;
    if (drawW > slideW - 0.4) {
      drawW = slideW - 0.4;
      drawH = drawW / imgRatio;
    }

    slide.addImage({
      data: img.dataUrl,
      x: (slideW - drawW) / 2,
      y: (slideH - drawH) / 2,
      w: drawW,
      h: drawH,
    });
  });

  return (await pptx.write({ outputType: 'blob' })) as Blob;
}

/* ============================================================================
   TOOL 18: PDF TO EXCEL (.XLSX / .CSV)
============================================================================ */
export async function extractPdfTableRows(
  file: File,
  columnGapPt = 32
): Promise<string[][]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const allRows: string[][] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();

    const rowBuckets: { y: number; cells: { x: number; text: string; width: number }[] }[] = [];

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const x = Math.round(item.transform[4]);
      const y = Math.round(item.transform[5]);
      const width = item.width || item.str.length * 4.5;

      let row = rowBuckets.find((r) => Math.abs(r.y - y) <= 6);
      if (!row) {
        row = { y, cells: [] };
        rowBuckets.push(row);
      }
      row.cells.push({ x, text: item.str.trim(), width });
    }

    rowBuckets.sort((a, b) => b.y - a.y);

    for (const r of rowBuckets) {
      const sorted = r.cells.sort((a, b) => a.x - b.x);
      const cols: string[] = [];
      let lastEndX = -999;

      for (const cell of sorted) {
        if (cols.length === 0 || cell.x - lastEndX > columnGapPt) {
          cols.push(cell.text);
        } else {
          cols[cols.length - 1] += ' ' + cell.text;
        }
        lastEndX = cell.x + Math.max(cell.width, cell.text.length * 4.2);
      }
      if (cols.length > 0) allRows.push(cols);
    }
  }

  return allRows;
}

export function exportRowsToExcelOrCsv(
  rows: string[][],
  format: 'xlsx' | 'csv'
): Blob {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Extracted_PDF_Table');

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  } else {
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }
}

/* ============================================================================
   TOOL 19: PDF TO PDF/A (Archival Compliance Serialization)
============================================================================ */
export interface PdfAConversionResult {
  bytes: Uint8Array;
  conformanceLevel: 'PDF/A-1b' | 'PDF/A-2b';
  xmpXml: string;
  pageCount: number;
  flattenedForms: boolean;
}

export async function convertPdfToPdfA(
  file: File,
  conformanceLevel: 'PDF/A-1b' | 'PDF/A-2b' = 'PDF/A-1b',
  customTitle?: string,
  customAuthor?: string
): Promise<PdfAConversionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });

  const nowIso = new Date().toISOString();
  const title = (customTitle || file.name.replace(/\.pdf$/i, '')).trim();
  const author = (customAuthor || 'KAAGAZ Archival Serializer').trim();
  const part = conformanceLevel === 'PDF/A-1b' ? '1' : '2';

  pdfDoc.setTitle(title);
  pdfDoc.setAuthor(author);
  pdfDoc.setSubject(`ISO 19005-${part} (${conformanceLevel}) Archival Document`);
  pdfDoc.setKeywords(['PDF/A', conformanceLevel, 'ISO-19005', 'Archival']);
  pdfDoc.setProducer('KAAGAZ Archival Serializer');
  pdfDoc.setCreator('KAAGAZ');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  let flattenedForms = false;
  try {
    const form = pdfDoc.getForm();
    if (form.getFields().length > 0) {
      form.flatten();
      flattenedForms = true;
    }
  } catch {
    flattenedForms = false;
  }

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const xmpXml = `<?xpacket begin="" id="W5M0MpGFRgHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdfaid:part>${part}</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
      <dc:title>
        <rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li></rdf:Alt>
      </dc:title>
      <dc:creator>
        <rdf:Seq><rdf:li>${escapeXml(author)}</rdf:li></rdf:Seq>
      </dc:creator>
      <xmp:CreateDate>${nowIso}</xmp:CreateDate>
      <xmp:ModifyDate>${nowIso}</xmp:ModifyDate>
      <xmp:CreatorTool>KAAGAZ</xmp:CreatorTool>
      <pdf:Producer>KAAGAZ Archival Serializer</pdf:Producer>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const metadataStream = pdfDoc.context.stream(xmpXml, {
    Type: 'Metadata',
    Subtype: 'XML',
    Length: xmpXml.length,
  });
  const metadataRef = pdfDoc.context.register(metadataStream);
  pdfDoc.catalog.set(PDFName.of('Metadata'), metadataRef);
  pdfDoc.catalog.set(PDFName.of('Lang'), PDFString.of('en-US'));

  const bytes = await pdfDoc.save({
    useObjectStreams: conformanceLevel !== 'PDF/A-1b',
    addDefaultPage: false,
  });

  return {
    bytes,
    conformanceLevel,
    xmpXml,
    pageCount: pdfDoc.getPageCount(),
    flattenedForms,
  };
}
