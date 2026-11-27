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
  // [5] Edit PDF (5)
  | 'rotate-pdf'
  | 'add-page-numbers'
  | 'add-watermark'
  | 'crop-pdf'
  | 'edit-pdf'
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
  | 'Workflow';

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
    badgeClass:
      'bg-indigo-500/12 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
    featured: true,
  },
  {
    id: 'split-pdf',
    number: 2,
    title: 'Split PDF',
    subtitle: 'Extract ranges or burst to ZIP',
    description:
      'Separate one page or a whole set of pages into independent PDF files or a ZIP archive.',
    category: 'Organize',
    shortcut: '2',
    iconName: 'Scissors',
    badgeClass:
      'bg-violet-500/12 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
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
    badgeClass:
      'bg-rose-500/12 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  },
  {
    id: 'extract-pages',
    number: 4,
    title: 'Extract Pages',
    subtitle: 'Save specific pages standalone',
    description:
      'Cherry-pick specific pages from thumbnails and export them as a new PDF or separate files in a ZIP.',
    category: 'Organize',
    shortcut: '4',
    iconName: 'FileOutput',
    badgeClass:
      'bg-sky-500/12 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
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
    badgeClass:
      'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
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
    badgeClass:
      'bg-amber-500/12 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  },

  // [2] OPTIMIZE PDF (3 Tools)
  {
    id: 'compress-pdf',
    number: 7,
    title: 'Compress PDF',
    subtitle: 'Extreme, Recommended & Less presets',
    description:
      'Reduce PDF file size locally while maintaining optimal visual quality across three presets.',
    category: 'Optimize',
    shortcut: '7',
    iconName: 'Minimize2',
    badgeClass:
      'bg-fuchsia-500/12 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
    featured: true,
  },
  {
    id: 'repair-pdf',
    number: 8,
    title: 'Repair PDF',
    subtitle: 'Recover damaged PDF structures',
    description:
      'Fix damaged or corrupted PDF cross-references and recover readable pages into a clean file.',
    category: 'Optimize',
    shortcut: '8',
    iconName: 'Wrench',
    badgeClass:
      'bg-orange-500/12 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
  },
  {
    id: 'ocr-pdf',
    number: 9,
    title: 'OCR PDF',
    subtitle: 'Extract & embed searchable text',
    description:
      'Run in-browser Tesseract OCR to convert scanned PDFs and images into searchable, selectable text.',
    category: 'Optimize',
    shortcut: '9',
    iconName: 'ScanText',
    badgeClass:
      'bg-indigo-500/12 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
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
    badgeClass:
      'bg-indigo-500/12 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
  },
  {
    id: 'word-to-pdf',
    number: 11,
    title: 'Word to PDF',
    subtitle: 'Convert .docx & .txt locally',
    description:
      'Parse Word (.docx) or plain text files locally via Mammoth with formatted typography preview and PDF export.',
    category: 'Convert',
    conversionDirection: 'to-pdf',
    shortcut: 'D',
    iconName: 'FileText',
    badgeClass:
      'bg-blue-500/12 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
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
    badgeClass:
      'bg-orange-500/12 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
  },
  {
    id: 'excel-to-pdf',
    number: 13,
    title: 'Excel to PDF',
    subtitle: 'Spreadsheets & CSV tables',
    description:
      'Parse .xlsx workbooks and .csv datasets with SheetJS, switch sheets, and render formatted PDF tables.',
    category: 'Convert',
    conversionDirection: 'to-pdf',
    shortcut: 'E',
    iconName: 'Table',
    badgeClass:
      'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
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
    badgeClass:
      'bg-cyan-500/12 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
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
    badgeClass:
      'bg-violet-500/12 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
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
    badgeClass:
      'bg-amber-500/12 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
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
    badgeClass:
      'bg-teal-500/12 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
  },
  {
    id: 'pdf-to-word',
    number: 18,
    title: 'PDF to Word',
    subtitle: 'Generate editable .docx file',
    description:
      'Extract text lines and structured paragraphs via PDF.js and generate a real downloadable .docx Word file.',
    category: 'Convert',
    conversionDirection: 'from-pdf',
    shortcut: 'W',
    iconName: 'FileType',
    badgeClass:
      'bg-blue-500/12 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
  },
  {
    id: 'pdf-to-powerpoint',
    number: 19,
    title: 'PDF to PowerPoint',
    subtitle: 'Export .pptx slide deck',
    description:
      'Convert every PDF page into a widescreen slide inside a downloadable .pptx presentation via PptxGenJS.',
    category: 'Convert',
    conversionDirection: 'from-pdf',
    shortcut: 'V',
    iconName: 'MonitorPlay',
    badgeClass:
      'bg-orange-500/12 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
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
    badgeClass:
      'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
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
    badgeClass:
      'bg-purple-500/12 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300',
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
    badgeClass:
      'bg-sky-500/12 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  },
  {
    id: 'add-page-numbers',
    number: 23,
    title: 'Add Page Numbers',
    subtitle: 'Custom position, format & range',
    description:
      'Insert customizable page numbers with position grid, format templates, cover-page skip, and typography controls.',
    category: 'Edit PDF',
    shortcut: '#',
    iconName: 'Hash',
    badgeClass:
      'bg-indigo-500/12 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
  },
  {
    id: 'add-watermark',
    number: 24,
    title: 'Add Watermark',
    subtitle: 'Text or image stamps with angle',
    description:
      'Stamp custom text or image watermarks across pages with live opacity, angle, color, and tiling controls.',
    category: 'Edit PDF',
    shortcut: 'T',
    iconName: 'Stamp',
    badgeClass:
      'bg-violet-500/12 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
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
    badgeClass:
      'bg-teal-500/12 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
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
    badgeClass:
      'bg-fuchsia-500/12 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
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
    badgeClass:
      'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  {
    id: 'protect-pdf',
    number: 28,
    title: 'Protect PDF',
    subtitle: 'Encrypt with password & rights',
    description:
      'Encrypt PDF files locally with user and owner passwords plus granular print, copy, and edit permissions.',
    category: 'Security',
    shortcut: 'L',
    iconName: 'Lock',
    badgeClass:
      'bg-indigo-500/12 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
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
    badgeClass:
      'bg-violet-500/12 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
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
    badgeClass:
      'bg-rose-500/12 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
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
    badgeClass:
      'bg-cyan-500/12 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
  },
  {
    id: 'flatten-pdf',
    number: 32,
    title: 'Flatten PDF',
    subtitle: 'Lock forms, annotations & layers',
    description:
      'Merge interactive form fields, annotations, and visual layers into static, uneditable PDF pages.',
    category: 'Workflows',
    shortcut: 'F',
    iconName: 'Layers2',
    badgeClass:
      'bg-amber-500/12 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  },
  {
    id: 'custom-workflows',
    number: 33,
    title: 'Custom Workflows',
    subtitle: 'Chain tools into 1-click pipelines',
    description:
      'Chain Rotate, Watermark, Page Numbers, Compress, Flatten, and PDF/A steps into an automated pipeline.',
    category: 'Workflows',
    shortcut: 'Y',
    iconName: 'Workflow',
    badgeClass:
      'bg-indigo-500/12 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
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
