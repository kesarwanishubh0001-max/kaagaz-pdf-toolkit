export type ToolCategory =
  | 'All'
  | 'Organize'
  | 'Optimize'
  | 'Convert'
  | 'Edit PDF'
  | 'Security'
  | 'Workflows';

export type ToolId =
  // [1] Organize PDF (6)
  | 'merge-pdf'
  | 'split-pdf'
  | 'remove-pages'
  | 'extract-pages'
  | 'organize-pdf'
  | 'scan-to-pdf'
  // [2] Optimize PDF (3)
  | 'compress-pdf'
  | 'repair-pdf'
  | 'ocr-pdf'
  // [3] Convert TO PDF (6)
  | 'jpg-to-pdf'
  | 'word-to-pdf'
  | 'powerpoint-to-pdf'
  | 'excel-to-pdf'
  | 'html-to-pdf'
  | 'markdown-to-pdf'
  // [4] Convert FROM PDF (6)
  | 'pdf-to-jpg'
  | 'pdf-to-png'
  | 'pdf-to-word'
  | 'pdf-to-powerpoint'
  | 'pdf-to-excel'
  | 'pdf-to-pdfa'
  // [5] Edit PDF (6)
  | 'rotate-pdf'
  | 'add-page-numbers'
  | 'add-watermark'
  | 'crop-pdf'
  | 'edit-pdf'
  | 'invert-pdf'
  // [6] PDF Security (4)
  | 'unlock-pdf'
  | 'protect-pdf'
  | 'sign-pdf'
  | 'redact-pdf'
  // [7] Workflows & Utilities (3)
  | 'compare-pdf'
  | 'flatten-pdf'
  | 'custom-workflows';

export type ToolIconName =
  | 'Layers'
  | 'Scissors'
  | 'Trash2'
  | 'FileOutput'
  | 'LayoutGrid'
  | 'Camera'
  | 'Minimize2'
  | 'Wrench'
  | 'ScanText'
  | 'Image'
  | 'FileText'
  | 'Presentation'
  | 'Table'
  | 'Code2'
  | 'FileCode'
  | 'FileImage'
  | 'Images'
  | 'FileType'
  | 'MonitorPlay'
  | 'Sheet'
  | 'ShieldCheck'
  | 'RotateCw'
  | 'Hash'
  | 'Stamp'
  | 'Crop'
  | 'PenLine'
  | 'Unlock'
  | 'Lock'
  | 'PenTool'
  | 'EyeOff'
  | 'GitCompare'
  | 'Layers2'
  | 'Workflow'
  | 'Contrast';

export interface PdfToolMeta {
  id: ToolId;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  category: Exclude<ToolCategory, 'All'>;
  conversionDirection?: 'to-pdf' | 'from-pdf';
  shortcut: string;
  iconName: ToolIconName;
  badgeClass: string;
  featured?: boolean;
}

const BADGE_BLUE =
  'bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] text-[#0071E3] dark:text-[#0A84FF]';
const BADGE_EMERALD =
  'bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] text-emerald-600 dark:text-[#30D158]';
const BADGE_AMBER =
  'bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] text-amber-600 dark:text-[#FF9F0A]';
const BADGE_ROSE =
  'bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] text-rose-600 dark:text-[#FF453A]';
const BADGE_CYAN =
  'bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] text-sky-600 dark:text-[#64D2FF]';
const BADGE_PURPLE =
  'bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] text-purple-600 dark:text-[#BF5AF2]';

export const PDF_TOOLS: PdfToolMeta[] = [
  // [1] ORGANIZE PDF (6 Tools)
  {
    id: 'merge-pdf',
    number: 1,
    title: 'Merge PDF',
    subtitle: 'Combine & sequence documents',
    description:
      'Combine multiple PDF files into one unified document in your preferred drag-and-drop order.',
    category: 'Organize',
    shortcut: '1',
    iconName: 'Layers',
    badgeClass: BADGE_BLUE,
    featured: true,
  },
  {
    id: 'split-pdf',
    number: 2,
    title: 'Split PDF',
    subtitle: 'Multiple ranges, fixed intervals & burst',
    description:
      'Define multiple custom ranges (e.g. 1–10, 11–20), fixed intervals, or burst pages into separate PDFs or a ZIP.',
    category: 'Organize',
    shortcut: '2',
    iconName: 'Scissors',
    badgeClass: BADGE_PURPLE,
    featured: true,
  },
  {
    id: 'remove-pages',
    number: 3,
    title: 'Remove Pages',
    subtitle: 'Visual page deletion',
    description:
      'Inspect interactive page thumbnails, click unwanted pages to delete them, and save the cleaned PDF.',
    category: 'Organize',
    shortcut: '3',
    iconName: 'Trash2',
    badgeClass: BADGE_ROSE,
  },
  {
    id: 'extract-pages',
    number: 4,
    title: 'Extract Pages',
    subtitle: 'Multiple page sets or single PDF',
    description:
      'Cherry-pick pages into one or multiple extraction sets and download individually, separately, or as a ZIP.',
    category: 'Organize',
    shortcut: '4',
    iconName: 'FileOutput',
    badgeClass: BADGE_CYAN,
  },
  {
    id: 'organize-pdf',
    number: 5,
    title: 'Organize PDF',
    subtitle: 'Reorder, rotate, duplicate & prune',
    description:
      'Drag-and-drop page thumbnails to sort, reorder, duplicate, rotate, or delete pages visually.',
    category: 'Organize',
    shortcut: '5',
    iconName: 'LayoutGrid',
    badgeClass: BADGE_EMERALD,
    featured: true,
  },
  {
    id: 'scan-to-pdf',
    number: 6,
    title: 'Scan to PDF',
    subtitle: 'Camera capture & document filters',
    description:
      'Capture documents via device webcam or photos, apply contrast/grayscale filters, and compile to PDF.',
    category: 'Organize',
    shortcut: '6',
    iconName: 'Camera',
    badgeClass: BADGE_AMBER,
  },

  // [2] OPTIMIZE PDF (3 Tools)
  {
    id: 'compress-pdf',
    number: 7,
    title: 'Compress PDF',
    subtitle: 'Batch compression across 3 presets',
    description:
      'Reduce single or multiple PDF file sizes locally while maintaining optimal visual quality across three presets.',
    category: 'Optimize',
    shortcut: '7',
    iconName: 'Minimize2',
    badgeClass: BADGE_PURPLE,
    featured: true,
  },
  {
    id: 'repair-pdf',
    number: 8,
    title: 'Repair PDF',
    subtitle: 'Recover damaged PDF structures',
    description:
      'Fix damaged or corrupted PDF cross-references and recover readable pages across one or multiple files.',
    category: 'Optimize',
    shortcut: '8',
    iconName: 'Wrench',
    badgeClass: BADGE_AMBER,
  },
  {
    id: 'ocr-pdf',
    number: 9,
    title: 'OCR PDF',
    subtitle: 'English & हिन्दी (Hindi) local OCR',
    description:
      'Run bundled Tesseract OCR in English, Hindi (हिन्दी), or bilingual mode to extract selectable text and build searchable PDFs with zero internet.',
    category: 'Optimize',
    shortcut: '9',
    iconName: 'ScanText',
    badgeClass: BADGE_BLUE,
    featured: true,
  },

  // [3] CONVERT TO PDF (6 Tools)
  {
    id: 'jpg-to-pdf',
    number: 10,
    title: 'JPG to PDF',
    subtitle: 'Images with margins & page fit',
    description:
      'Convert JPG, PNG, and WebP images to PDF with thumbnail reordering, orientation, page size, and margins.',
    category: 'Convert',
    conversionDirection: 'to-pdf',
    shortcut: 'I',
    iconName: 'Image',
    badgeClass: BADGE_BLUE,
  },
  {
    id: 'word-to-pdf',
    number: 11,
    title: 'Word to PDF',
    subtitle: 'Convert .docx & .txt locally',
    description:
      'Parse Word (.docx) or plain text files locally with formatted typography preview and PDF export.',
    category: 'Convert',
    conversionDirection: 'to-pdf',
    shortcut: 'D',
    iconName: 'FileText',
    badgeClass: BADGE_CYAN,
  },
  {
    id: 'powerpoint-to-pdf',
    number: 12,
    title: 'PowerPoint to PDF',
    subtitle: 'Render .pptx slide decks',
    description:
      'Extract slide XML text, titles, and embedded images from .pptx decks and export widescreen PDF slides.',
    category: 'Convert',
    conversionDirection: 'to-pdf',
    shortcut: 'P',
    iconName: 'Presentation',
    badgeClass: BADGE_AMBER,
  },
  {
    id: 'excel-to-pdf',
    number: 13,
    title: 'Excel to PDF',
    subtitle: 'Spreadsheets & CSV tables',
    description:
      'Parse .xlsx workbooks and .csv datasets with sheet switching and formatted PDF table export.',
    category: 'Convert',
    conversionDirection: 'to-pdf',
    shortcut: 'E',
    iconName: 'Table',
    badgeClass: BADGE_EMERALD,
  },
  {
    id: 'html-to-pdf',
    number: 14,
    title: 'HTML to PDF',
    subtitle: 'Live split-screen HTML/CSS preview',
    description:
      'Paste raw HTML/CSS or upload a webpage snippet with an instant live preview and export to PDF.',
    category: 'Convert',
    conversionDirection: 'to-pdf',
    shortcut: 'H',
    iconName: 'Code2',
    badgeClass: BADGE_CYAN,
  },
  {
    id: 'markdown-to-pdf',
    number: 15,
    title: 'Markdown to PDF',
    subtitle: 'Side-by-side Markdown studio',
    description:
      'Write or upload Markdown (.md) with live side-by-side preview of headings, code blocks, and tables into PDF.',
    category: 'Convert',
    conversionDirection: 'to-pdf',
    shortcut: 'M',
    iconName: 'FileCode',
    badgeClass: BADGE_PURPLE,
  },

  // [4] CONVERT FROM PDF (6 Tools)
  {
    id: 'pdf-to-jpg',
    number: 16,
    title: 'PDF to JPG',
    subtitle: 'Selectable 72 / 150 / 300 DPI',
    description:
      'Render PDF pages to JPG images at selectable DPI resolution and download individually or as a ZIP.',
    category: 'Convert',
    conversionDirection: 'from-pdf',
    shortcut: 'J',
    iconName: 'FileImage',
    badgeClass: BADGE_AMBER,
  },
  {
    id: 'pdf-to-png',
    number: 17,
    title: 'PDF to PNG',
    subtitle: 'Lossless high-resolution PNG',
    description:
      'Export crisp, lossless PNG images from every PDF page with individual or batched ZIP download.',
    category: 'Convert',
    conversionDirection: 'from-pdf',
    shortcut: 'N',
    iconName: 'Images',
    badgeClass: BADGE_EMERALD,
  },
  {
    id: 'pdf-to-word',
    number: 18,
    title: 'PDF to Word',
    subtitle: 'Generate editable .docx file',
    description:
      'Extract text lines and structured paragraphs and generate a clean downloadable .docx Word document.',
    category: 'Convert',
    conversionDirection: 'from-pdf',
    shortcut: 'W',
    iconName: 'FileType',
    badgeClass: BADGE_BLUE,
  },
  {
    id: 'pdf-to-powerpoint',
    number: 19,
    title: 'PDF to PowerPoint',
    subtitle: 'Export .pptx slide deck',
    description:
      'Convert every PDF page into a widescreen slide inside a downloadable .pptx presentation.',
    category: 'Convert',
    conversionDirection: 'from-pdf',
    shortcut: 'V',
    iconName: 'MonitorPlay',
    badgeClass: BADGE_AMBER,
  },
  {
    id: 'pdf-to-excel',
    number: 20,
    title: 'PDF to Excel',
    subtitle: 'Coordinate tables to .xlsx / .csv',
    description:
      'Detect tabular rows and columns from PDF text coordinates and export cleanly as .xlsx or .csv.',
    category: 'Convert',
    conversionDirection: 'from-pdf',
    shortcut: 'X',
    iconName: 'Sheet',
    badgeClass: BADGE_EMERALD,
  },
  {
    id: 'pdf-to-pdfa',
    number: 21,
    title: 'PDF to PDF/A',
    subtitle: 'Archival metadata & flattening',
    description:
      'Re-serialize PDFs with embedded ISO 19005 XMP archival metadata and flattened forms/annotations.',
    category: 'Convert',
    conversionDirection: 'from-pdf',
    shortcut: 'A',
    iconName: 'ShieldCheck',
    badgeClass: BADGE_PURPLE,
  },

  // [5] EDIT PDF (5 Tools)
  {
    id: 'rotate-pdf',
    number: 22,
    title: 'Rotate PDF',
    subtitle: '90°, 180°, 270° page rotation',
    description:
      'Rotate individual pages or entire PDF documents in 90-degree increments with live thumbnail preview.',
    category: 'Edit PDF',
    shortcut: 'R',
    iconName: 'RotateCw',
    badgeClass: BADGE_CYAN,
  },
  {
    id: 'add-page-numbers',
    number: 23,
    title: 'Add Page Numbers',
    subtitle: 'Custom position, format & batch',
    description:
      'Insert customizable page numbers across one or multiple PDFs with position grid, templates, and cover-page skip.',
    category: 'Edit PDF',
    shortcut: '#',
    iconName: 'Hash',
    badgeClass: BADGE_BLUE,
  },
  {
    id: 'add-watermark',
    number: 24,
    title: 'Add Watermark',
    subtitle: 'Text or image stamps with batch',
    description:
      'Stamp custom text or image watermarks across one or multiple PDFs with opacity, angle, and tiling controls.',
    category: 'Edit PDF',
    shortcut: 'T',
    iconName: 'Stamp',
    badgeClass: BADGE_PURPLE,
  },
  {
    id: 'crop-pdf',
    number: 25,
    title: 'Crop PDF',
    subtitle: 'Trim margins or crop visually',
    description:
      'Trim page margins or crop specific areas visually across all pages or individual pages.',
    category: 'Edit PDF',
    shortcut: 'C',
    iconName: 'Crop',
    badgeClass: BADGE_EMERALD,
  },
  {
    id: 'edit-pdf',
    number: 26,
    title: 'Edit PDF',
    subtitle: 'Text, shapes, highlights & ink',
    description:
      'Add text overlays, rectangles, circles, highlights, images, and freehand annotations directly onto PDF pages.',
    category: 'Edit PDF',
    shortcut: 'Z',
    iconName: 'PenLine',
    badgeClass: BADGE_ROSE,
    featured: true,
  },
  {
    id: 'invert-pdf',
    number: 34,
    title: 'Invert PDF',
    subtitle: 'Dark mode & color inversion',
    description:
      'Convert white PDFs to eye-friendly Smart Dark Mode, pure RGB negative, or high-contrast monochrome for night reading or reverse-printing dark slides.',
    category: 'Edit PDF',
    shortcut: 'Q',
    iconName: 'Contrast',
    badgeClass: BADGE_PURPLE,
    featured: true,
  },

  // [6] PDF SECURITY (4 Tools)
  {
    id: 'unlock-pdf',
    number: 27,
    title: 'Unlock PDF',
    subtitle: 'Remove password & restrictions',
    description:
      'Decrypt password-protected PDFs with your key and remove printing or copying restrictions locally.',
    category: 'Security',
    shortcut: 'U',
    iconName: 'Unlock',
    badgeClass: BADGE_EMERALD,
  },
  {
    id: 'protect-pdf',
    number: 28,
    title: 'Protect PDF',
    subtitle: 'Batch encrypt with password & rights',
    description:
      'Encrypt one or multiple PDF files locally with user/owner passwords plus print, copy, and edit permissions.',
    category: 'Security',
    shortcut: 'L',
    iconName: 'Lock',
    badgeClass: BADGE_BLUE,
    featured: true,
  },
  {
    id: 'sign-pdf',
    number: 29,
    title: 'Sign PDF',
    subtitle: 'Draw, type or upload signature',
    description:
      'Create an electronic signature by drawing, typing, or uploading an image and place it accurately on any page.',
    category: 'Security',
    shortcut: 'S',
    iconName: 'PenTool',
    badgeClass: BADGE_PURPLE,
    featured: true,
  },
  {
    id: 'redact-pdf',
    number: 30,
    title: 'Redact PDF',
    subtitle: 'Permanently black out & purge',
    description:
      'Draw redaction boxes or auto-detect sensitive keywords to permanently burn out and remove confidential data.',
    category: 'Security',
    shortcut: 'B',
    iconName: 'EyeOff',
    badgeClass: BADGE_ROSE,
  },

  // [7] WORKFLOWS & ADVANCED UTILITIES (3 Tools)
  {
    id: 'compare-pdf',
    number: 31,
    title: 'Compare PDF',
    subtitle: 'Side-by-side visual & text diff',
    description:
      'Compare two PDF versions side by side with pixel-level visual difference heatmaps and line-by-line text diffs.',
    category: 'Workflows',
    shortcut: 'G',
    iconName: 'GitCompare',
    badgeClass: BADGE_CYAN,
  },
  {
    id: 'flatten-pdf',
    number: 32,
    title: 'Flatten PDF',
    subtitle: 'Batch lock forms, annotations & layers',
    description:
      'Merge interactive form fields, annotations, and visual layers into static, uneditable PDFs in batch.',
    category: 'Workflows',
    shortcut: 'F',
    iconName: 'Layers2',
    badgeClass: BADGE_AMBER,
  },
  {
    id: 'custom-workflows',
    number: 33,
    title: 'Custom Workflows',
    subtitle: 'Chain tools across multiple PDFs',
    description:
      'Chain Rotate, Watermark, Page Numbers, Compress, Flatten, and PDF/A steps across one or multiple PDFs.',
    category: 'Workflows',
    shortcut: 'Y',
    iconName: 'Workflow',
    badgeClass: BADGE_BLUE,
    featured: true,
  },
];

export const CATEGORIES: ToolCategory[] = [
  'All',
  'Organize',
  'Optimize',
  'Convert',
  'Edit PDF',
  'Security',
  'Workflows',
];
