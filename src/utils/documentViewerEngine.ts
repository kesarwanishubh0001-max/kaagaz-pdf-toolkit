import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import {
  sanitizePreviewHtml,
  createSamplePdfFile,
} from './pdfEngine';
import {
  parseWordOrTextFile,
  parsePptxFile,
  parseExcelOrCsvFile,
  compileMarkdownToHtml,
  createSampleDocxFile,
  createSampleExcelFile,
  createSamplePptxFile,
  createSyntheticSampleImages,
  ExtractedPptxSlide,
  ParsedSpreadsheet,
} from './convertEngine';

export type ViewerDocumentKind =
  | 'pdf'
  | 'word'
  | 'spreadsheet'
  | 'presentation'
  | 'image'
  | 'markdown'
  | 'html'
  | 'json'
  | 'code'
  | 'text'
  | 'archive'
  | 'audio'
  | 'video'
  | 'binary';

export interface ArchiveEntryInfo {
  path: string;
  name: string;
  isDir: boolean;
  uncompressedSize: number;
  kind: ViewerDocumentKind;
}

export interface PdfRenderedPage {
  pageNumber: number;
  dataUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  text: string;
}

export interface LoadedViewerDocument {
  id: string;
  file: File;
  name: string;
  extension: string;
  size: number;
  lastModified: number;
  mimeType: string;
  kind: ViewerDocumentKind;
  kindLabel: string;
  // Format-specific payloads
  pdfPages?: PdfRenderedPage[];
  pdfPageCount?: number;
  wordHtml?: string;
  wordCount?: number;
  spreadsheet?: ParsedSpreadsheet;
  slides?: ExtractedPptxSlide[];
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  rawText?: string;
  renderedHtml?: string;
  formattedJson?: string;
  jsonValid?: boolean;
  archiveEntries?: ArchiveEntryInfo[];
  mediaUrl?: string;
  hexPreview?: string;
  sha256Short?: string;
}

const IMAGE_EXTS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'svg',
  'bmp',
  'ico',
  'avif',
]);

const SPREADSHEET_EXTS = new Set(['xlsx', 'xls', 'ods', 'csv', 'tsv']);
const MARKDOWN_EXTS = new Set(['md', 'markdown', 'mdx']);
const HTML_EXTS = new Set(['html', 'htm', 'xhtml']);
const CODE_EXTS = new Set([
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
  'py',
  'css',
  'scss',
  'less',
  'xml',
  'yaml',
  'yml',
  'sql',
  'sh',
  'bash',
  'zsh',
  'java',
  'kt',
  'swift',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'go',
  'rs',
  'rb',
  'php',
  'toml',
  'ini',
  'conf',
  'env',
  'dockerfile',
  'graphql',
]);
const TEXT_EXTS = new Set(['txt', 'log', 'rtf', 'readme', 'license']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'ogv']);

export function getFileExtension(filename: string): string {
  const clean = filename.split('/').pop() || filename;
  const idx = clean.lastIndexOf('.');
  if (idx <= 0) return '';
  return clean.slice(idx + 1).toLowerCase();
}

export function detectDocumentKind(
  filename: string,
  mimeType = ''
): { kind: ViewerDocumentKind; label: string } {
  const ext = getFileExtension(filename);
  const mime = mimeType.toLowerCase();

  if (ext === 'pdf' || mime === 'application/pdf') {
    return { kind: 'pdf', label: 'PDF Document' };
  }
  if (
    ext === 'docx' ||
    mime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return { kind: 'word', label: 'Word Document' };
  }
  if (SPREADSHEET_EXTS.has(ext) || mime.includes('spreadsheet') || mime === 'text/csv') {
    return {
      kind: 'spreadsheet',
      label: ext === 'csv' || ext === 'tsv' ? 'Delimited Table' : 'Spreadsheet',
    };
  }
  if (
    ext === 'pptx' ||
    mime ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return { kind: 'presentation', label: 'Presentation' };
  }
  if (IMAGE_EXTS.has(ext) || mime.startsWith('image/')) {
    return { kind: 'image', label: 'Image' };
  }
  if (MARKDOWN_EXTS.has(ext)) {
    return { kind: 'markdown', label: 'Markdown' };
  }
  if (HTML_EXTS.has(ext) || mime === 'text/html') {
    return { kind: 'html', label: 'HTML Document' };
  }
  if (ext === 'json' || mime === 'application/json') {
    return { kind: 'json', label: 'JSON Data' };
  }
  if (ext === 'zip' || mime === 'application/zip') {
    return { kind: 'archive', label: 'ZIP Archive' };
  }
  if (AUDIO_EXTS.has(ext) || mime.startsWith('audio/')) {
    return { kind: 'audio', label: 'Audio' };
  }
  if (VIDEO_EXTS.has(ext) || mime.startsWith('video/')) {
    return { kind: 'video', label: 'Video' };
  }
  if (CODE_EXTS.has(ext)) {
    return { kind: 'code', label: `${ext.toUpperCase()} Source` };
  }
  if (TEXT_EXTS.has(ext) || mime.startsWith('text/')) {
    return { kind: 'text', label: 'Plain Text' };
  }
  return { kind: 'binary', label: ext ? `${ext.toUpperCase()} File` : 'Binary File' };
}

function buildHexDump(buffer: ArrayBuffer, maxBytes = 2048): string {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, maxBytes));
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const slice = bytes.subarray(offset, offset + 16);
    const addr = offset.toString(16).padStart(8, '0');
    const hexParts: string[] = [];
    let ascii = '';
    for (let i = 0; i < 16; i++) {
      if (i < slice.length) {
        const b = slice[i];
        hexParts.push(b.toString(16).padStart(2, '0'));
        ascii += b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
      } else {
        hexParts.push('  ');
        ascii += ' ';
      }
    }
    const leftHex = hexParts.slice(0, 8).join(' ');
    const rightHex = hexParts.slice(8).join(' ');
    lines.push(`${addr}  ${leftHex}  ${rightHex}  |${ascii}|`);
  }
  return lines.join('\n');
}

async function computeShortSha256(buffer: ArrayBuffer): Promise<string | undefined> {
  try {
    if (!crypto?.subtle) return undefined;
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.slice(0, 16);
  } catch {
    return undefined;
  }
}

async function loadPdfForViewer(
  file: File,
  onProgress?: (msg: string) => void
): Promise<{ pages: PdfRenderedPage[]; pageCount: number }> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pageCount = pdf.numPages;
  const pages: PdfRenderedPage[] = [];

  for (let p = 1; p <= pageCount; p++) {
    onProgress?.(`Rendering page ${p} of ${pageCount}...`);
    const page = await pdf.getPage(p);

    // High-resolution viewport for crisp reading
    const scale = pageCount > 25 ? 1.35 : 1.75;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    }
    const dataUrl = canvas.toDataURL('image/png');

    // Compact thumbnail
    const thumbVp = page.getViewport({ scale: 0.3 });
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = Math.max(1, Math.floor(thumbVp.width));
    thumbCanvas.height = Math.max(1, Math.floor(thumbVp.height));
    const tCtx = thumbCanvas.getContext('2d');
    if (tCtx) {
      await page.render({ canvasContext: tCtx, viewport: thumbVp, canvas: thumbCanvas })
        .promise;
    }
    const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.72);

    // Extract text for instant Find-in-Document & Copy
    let pageText = '';
    try {
      const textContent = await page.getTextContent();
      pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      pageText = '';
    }

    pages.push({
      pageNumber: p,
      dataUrl,
      thumbUrl,
      width: Math.round(viewport.width / scale),
      height: Math.round(viewport.height / scale),
      text: pageText,
    });
  }

  return { pages, pageCount };
}

function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

export async function loadFileIntoViewer(
  file: File,
  onProgress?: (msg: string) => void
): Promise<LoadedViewerDocument> {
  const ext = getFileExtension(file.name);
  const { kind, label } = detectDocumentKind(file.name, file.type);

  const base: LoadedViewerDocument = {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    file,
    name: file.name,
    extension: ext || 'file',
    size: file.size,
    lastModified: file.lastModified || Date.now(),
    mimeType: file.type || 'application/octet-stream',
    kind,
    kindLabel: label,
  };

  if (kind === 'pdf') {
    const { pages, pageCount } = await loadPdfForViewer(file, onProgress);
    base.pdfPages = pages;
    base.pdfPageCount = pageCount;
    base.rawText = pages
      .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
      .join('\n\n');
    return base;
  }

  if (kind === 'word') {
    onProgress?.('Parsing Word document...');
    const parsed = await parseWordOrTextFile(file);
    base.wordHtml = sanitizePreviewHtml(parsed.html);
    base.rawText = parsed.rawText;
    base.wordCount = parsed.wordCount;
    return base;
  }

  if (kind === 'spreadsheet') {
    onProgress?.('Parsing spreadsheet workbook...');
    const parsed = await parseExcelOrCsvFile(file);
    base.spreadsheet = parsed;
    return base;
  }

  if (kind === 'presentation') {
    onProgress?.('Extracting presentation slides...');
    const slides = await parsePptxFile(file);
    base.slides = slides;
    base.rawText = slides
      .map(
        (s) =>
          `Slide ${s.slideNumber}: ${s.title}\n${s.bullets.map((b) => `- ${b}`).join('\n')}`
      )
      .join('\n\n');
    return base;
  }

  if (kind === 'image') {
    onProgress?.('Loading image...');
    const url = URL.createObjectURL(file);
    const dims = await readImageDimensions(url);
    base.imageUrl = url;
    base.imageWidth = dims.width;
    base.imageHeight = dims.height;
    return base;
  }

  if (kind === 'markdown') {
    onProgress?.('Rendering Markdown...');
    const text = await file.text();
    base.rawText = text;
    base.renderedHtml = sanitizePreviewHtml(compileMarkdownToHtml(text));
    base.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    return base;
  }

  if (kind === 'html') {
    onProgress?.('Preparing sandboxed HTML preview...');
    const text = await file.text();
    base.rawText = text;
    base.renderedHtml = sanitizePreviewHtml(text);
    return base;
  }

  if (kind === 'json') {
    onProgress?.('Formatting JSON...');
    const text = await file.text();
    base.rawText = text;
    try {
      const parsed = JSON.parse(text);
      base.formattedJson = JSON.stringify(parsed, null, 2);
      base.jsonValid = true;
    } catch {
      base.formattedJson = text;
      base.jsonValid = false;
    }
    return base;
  }

  if (kind === 'code' || kind === 'text') {
    onProgress?.('Reading text file...');
    const text = await file.text();
    base.rawText = text;
    base.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    return base;
  }

  if (kind === 'archive') {
    onProgress?.('Inspecting ZIP archive...');
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entries: ArchiveEntryInfo[] = [];
    for (const [entryPath, zipObj] of Object.entries(zip.files)) {
      const name = entryPath.replace(/\/$/, '').split('/').pop() || entryPath;
      const detected = detectDocumentKind(name);
      // JSZip stores internal _data.uncompressedSize when available
      const metaSize =
        (zipObj as unknown as { _data?: { uncompressedSize?: number } })._data
          ?.uncompressedSize ?? 0;
      entries.push({
        path: entryPath,
        name,
        isDir: zipObj.dir,
        uncompressedSize: metaSize,
        kind: detected.kind,
      });
    }
    entries.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.path.localeCompare(b.path);
    });
    base.archiveEntries = entries;
    return base;
  }

  if (kind === 'audio' || kind === 'video') {
    base.mediaUrl = URL.createObjectURL(file);
    return base;
  }

  // Fallback binary inspector
  const buffer = await file.arrayBuffer();
  base.hexPreview = buildHexDump(buffer, 2048);
  base.sha256Short = await computeShortSha256(buffer);
  return base;
}

export async function extractFileFromArchive(
  archiveFile: File,
  entryPath: string
): Promise<File> {
  const zip = await JSZip.loadAsync(await archiveFile.arrayBuffer());
  const target = zip.files[entryPath];
  if (!target || target.dir) {
    throw new Error('Archive entry not found');
  }
  const blob = await target.async('blob');
  const name = entryPath.split('/').pop() || entryPath;
  return new File([blob], name, { type: blob.type || 'application/octet-stream' });
}

export function revokeViewerDocumentUrls(doc: LoadedViewerDocument) {
  if (doc.imageUrl) URL.revokeObjectURL(doc.imageUrl);
  if (doc.mediaUrl) URL.revokeObjectURL(doc.mediaUrl);
}

/* ============================================================================
   INSTANT SAMPLE FILES FOR UNIVERSAL VIEWER
============================================================================ */
export type SampleDocType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'md' | 'json' | 'image';

export async function createViewerSampleFile(type: SampleDocType): Promise<File> {
  switch (type) {
    case 'pdf':
      return createSamplePdfFile('KAAGAZ-Architecture-Brief.pdf', 6);
    case 'docx':
      return createSampleDocxFile();
    case 'xlsx':
      return createSampleExcelFile();
    case 'pptx':
      return createSamplePptxFile();
    case 'md': {
      const md = `# KAAGAZ Universal Document Viewer

A unified, privacy-first reader for every document format in your workflow.

## Supported Formats

- **Documents**: PDF, Word (\`.docx\`), Markdown (\`.md\`), HTML, Plain Text (\`.txt\`)
- **Data & Tables**: Excel (\`.xlsx\`, \`.xls\`), CSV, TSV, JSON, YAML, XML
- **Presentations**: PowerPoint (\`.pptx\`) with slide filmstrip & fullscreen mode
- **Media & Archives**: PNG, JPG, WebP, SVG, Audio, Video, and interactive ZIP inspection

## Keyboard & Productivity Tips

| Action | Shortcut / Control |
| --- | --- |
| Search inside PDF or text | Toolbar Find bar |
| Switch open documents | Multi-document tab strip |
| Inspect ZIP contents | Click any entry to preview in a new tab |

\`\`\`typescript
// Zero uploads — every byte stays inside local browser memory
export function inspectDocument(file: File) {
  return { name: file.name, bytes: file.size, local: true };
}
\`\`\`
`;
      return new File([md], 'KAAGAZ-Reader-Guide.md', { type: 'text/markdown' });
    }
    case 'json': {
      const payload = {
        suite: 'KAAGAZ Studio',
        feature: 'Universal Document Viewer',
        privacy: '100% client-side in-browser rendering',
        supportedCategories: [
          { group: 'Documents', formats: ['pdf', 'docx', 'md', 'html', 'txt'] },
          { group: 'Spreadsheets', formats: ['xlsx', 'xls', 'ods', 'csv', 'tsv'] },
          { group: 'Presentations', formats: ['pptx'] },
          { group: 'Visual & Media', formats: ['png', 'jpg', 'webp', 'svg', 'mp4', 'mp3'] },
          { group: 'Developer & Archives', formats: ['json', 'ts', 'py', 'sql', 'zip'] },
        ],
        metrics: {
          maxTabs: 'Unlimited',
          serverUploads: 0,
        },
      };
      return new File([JSON.stringify(payload, null, 2)], 'kaagaz-manifest.json', {
        type: 'application/json',
      });
    }
    case 'image': {
      const imgs = await createSyntheticSampleImages();
      const first = imgs[0];
      const res = await fetch(first.dataUrl);
      const blob = await res.blob();
      return new File([blob], 'KAAGAZ-Visual-Slide.jpg', { type: 'image/jpeg' });
    }
  }
}
