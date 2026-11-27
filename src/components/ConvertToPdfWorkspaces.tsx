import React, { useState, useRef } from 'react';
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  FileText,
  Presentation,
  Table,
  Code2,
  FileCode,
  Sliders,
  Upload,
} from 'lucide-react';
import { sanitizePreviewHtml, triggerDownload } from '../utils/pdfEngine';
import {
  ImageToPdfItem,
  JpgToPdfOptions,
  loadImageFileToItem,
  createSyntheticSampleImages,
  convertImagesToPdf,
  ParsedWordDoc,
  parseWordOrTextFile,
  createSampleDocxFile,
  renderStructuredHtmlToPdf,
  ExtractedPptxSlide,
  parsePptxFile,
  createSamplePptxFile,
  renderSlidesToPdf,
  ParsedSpreadsheet,
  parseExcelOrCsvFile,
  createSampleExcelFile,
  renderSpreadsheetToPdf,
  compileMarkdownToHtml,
} from '../utils/convertEngine';
import { WorkspaceDropzone, FloatingActionBar } from './WorkspaceShared';

/* ============================================================================
   8. JPG TO PDF WORKSPACE
============================================================================ */
export const JpgToPdfWorkspace: React.FC = () => {
  const [images, setImages] = useState<ImageToPdfItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [options, setOptions] = useState<JpgToPdfOptions>({
    pageSize: 'a4',
    orientation: 'auto',
    marginPt: 20,
  });
  const addMoreRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: File[]) => {
    setLoading(true);
    try {
      const loaded: ImageToPdfItem[] = [];
      for (const f of files) {
        if (f.type.startsWith('image/')) {
          loaded.push(await loadImageFileToItem(f));
        }
      }
      setImages((prev) => [...prev, ...loaded]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleImages = async () => {
    setLoading(true);
    try {
      const samples = await createSyntheticSampleImages();
      setImages(samples);
    } finally {
      setLoading(false);
    }
  };

  const handleDropReorder = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const copy = [...images];
    const [moved] = copy.splice(dragIdx, 1);
    copy.splice(targetIdx, 0, moved);
    setImages(copy);
    setDragIdx(null);
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    const [removed] = copy.splice(idx, 1);
    copy.splice(target, 0, removed);
    setImages(copy);
  };

  const handleExportPdf = async () => {
    if (images.length === 0) return;
    setConverting(true);
    try {
      const blob = await convertImagesToPdf(images, options);
      triggerDownload(blob, 'Prism-Images-Compiled.pdf');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        <input
          ref={addMoreRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
        {images.length === 0 ? (
          <WorkspaceDropzone
            multiple
            accept="image/jpeg,image/png,image/webp"
            title="Drop JPG, PNG, or WebP images"
            subtitle="Reorder thumbnails visually and control page size (A4, Letter, Fit), orientation, and margins."
            selectLabel="Select images"
            sampleLabel="Load 3 sample images"
            onFilesSelected={handleFiles}
            onLoadSample={handleLoadSampleImages}
            loading={loading}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Image order ({images.length} pages)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Drag cards to reorder · Margin preview updates live
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addMoreRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/12 text-indigo-600 dark:text-indigo-300 text-xs font-medium"
                >
                  + Add images
                </button>
                <button
                  type="button"
                  onClick={() => setImages([])}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropReorder(idx)}
                  className={`rounded-xl p-2.5 border transition cursor-grab active:cursor-grabbing ${
                    dragIdx === idx
                      ? 'border-indigo-500 bg-indigo-500/10 opacity-65'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40'
                  }`}
                >
                  <div
                    style={{
                      padding:
                        options.pageSize === 'fit'
                          ? '0px'
                          : `${Math.round(options.marginPt / 3)}px`,
                    }}
                    className="relative aspect-[1/1.28] rounded-lg bg-white border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden transition-all"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="max-w-full max-h-full object-contain rounded"
                    />
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[10px] font-semibold tabular-nums">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {img.name}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveImage(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-30"
                        title="Move earlier"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, 1)}
                        disabled={idx === images.length - 1}
                        className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-30"
                        title="Move later"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setImages((prev) => prev.filter((item) => item.id !== img.id))
                        }
                        className="p-1 text-slate-400 hover:text-rose-500"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Sliders className="w-4 h-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Page layout & margins
            </h4>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Page size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'a4', label: 'A4' },
                  { id: 'letter', label: 'Letter' },
                  { id: 'fit', label: 'Fit Image' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setOptions({ ...options, pageSize: s.id })}
                  className={`py-2 px-2 rounded-xl border text-xs font-medium transition whitespace-nowrap ${
                    options.pageSize === s.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Orientation
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'auto', label: 'Auto' },
                  { id: 'portrait', label: 'Portrait' },
                  { id: 'landscape', label: 'Landscape' },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOptions({ ...options, orientation: o.id })}
                  className={`py-2 px-2 rounded-xl border text-xs font-medium transition whitespace-nowrap ${
                    options.orientation === o.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Page margin
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { pt: 0, label: 'None' },
                  { pt: 20, label: 'Small' },
                  { pt: 44, label: 'Large' },
                ] as const
              ).map((m) => (
                <button
                  key={m.pt}
                  type="button"
                  onClick={() => setOptions({ ...options, marginPt: m.pt })}
                  className={`py-2 px-2 rounded-xl border text-xs font-medium transition whitespace-nowrap ${
                    options.marginPt === m.pt
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={images.length === 0 || converting}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            {converting
              ? 'Compiling PDF...'
              : `Convert ${images.length} Image${images.length === 1 ? '' : 's'} to PDF`}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={images.length > 0}
        summary={`${images.length} images`}
        detail={`${options.pageSize.toUpperCase()} · ${options.orientation}`}
        actionLabel={converting ? 'Compiling...' : 'Export PDF'}
        busy={converting}
        onAction={handleExportPdf}
        onReset={() => setImages([])}
      />
    </div>
  );
};

/* ============================================================================
   9. WORD (.DOCX / .TXT) TO PDF WORKSPACE
============================================================================ */
export const WordToPdfWorkspace: React.FC = () => {
  const [docData, setDocData] = useState<ParsedWordDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(11);
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const parsed = await parseWordOrTextFile(file);
      setDocData(parsed);
    } catch {
      setError('Could not parse this file. Please select a valid .docx or .txt document.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const sample = await createSampleDocxFile();
      const parsed = await parseWordOrTextFile(sample);
      setDocData(parsed);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!docData) return;
    const blob = renderStructuredHtmlToPdf(docData.filename, docData.html, {
      fontSize,
      pageSize,
    });
    const base = docData.filename.replace(/\.(docx|txt)$/i, '');
    triggerDownload(blob, `${base}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!docData ? (
          <WorkspaceDropzone
            accept=".docx,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            title="Drop a Word (.docx) or text (.txt) file"
            subtitle="Parsed locally in your browser using Mammoth with formatted document preview before PDF export."
            selectLabel="Select .DOCX or .TXT"
            sampleLabel="Load sample .DOCX"
            onFilesSelected={handleFiles}
            onLoadSample={handleLoadSample}
            loading={loading}
            error={error}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                  {docData.filename}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {docData.wordCount} words parsed locally
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocData(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500 shrink-0"
              >
                Close file
              </button>
            </div>
            <div
              className="doc-preview p-6 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm max-h-[480px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: sanitizePreviewHtml(docData.html) }}
            />
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <FileText className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Document typography
            </h4>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500 dark:text-slate-400">Base font size</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {fontSize} pt
              </span>
            </div>
            <input
              type="range"
              min={9}
              max={16}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Page size
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['a4', 'letter'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPageSize(size)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium uppercase ${
                    pageSize === size
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={!docData}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            Export Word to PDF
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(docData)}
        summary={`${docData?.wordCount ?? 0} words`}
        detail={docData?.filename}
        actionLabel="Export PDF"
        onAction={handleExport}
        onReset={() => setDocData(null)}
      />
    </div>
  );
};

/* ============================================================================
   10. POWERPOINT (.PPTX) TO PDF WORKSPACE
============================================================================ */
export const PowerPointToPdfWorkspace: React.FC = () => {
  const [slides, setSlides] = useState<ExtractedPptxSlide[]>([]);
  const [deckName, setDeckName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark-slate' | 'crisp-light'>('dark-slate');

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      setDeckName(file.name);
      const extracted = await parsePptxFile(file);
      if (extracted.length === 0) {
        setError('No slides were found inside this .pptx archive.');
      } else {
        setSlides(extracted);
      }
    } catch {
      setError('Could not read this PowerPoint file. Make sure it is a valid .pptx presentation.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const sample = await createSamplePptxFile();
      setDeckName(sample.name);
      const extracted = await parsePptxFile(sample);
      setSlides(extracted);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = () => {
    if (slides.length === 0) return;
    const blob = renderSlidesToPdf(slides, theme);
    const base = deckName.replace(/\.pptx$/i, '') || 'Presentation';
    triggerDownload(blob, `${base}-slides.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {slides.length === 0 ? (
          <WorkspaceDropzone
            accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            title="Drop a PowerPoint (.pptx) deck"
            subtitle="Extracts slide XML text and embedded media via JSZip and compiles 16:9 widescreen PDF pages."
            selectLabel="Select .PPTX deck"
            sampleLabel="Load sample .PPTX"
            onFilesSelected={handleFiles}
            onLoadSample={handleLoadSample}
            loading={loading}
            error={error}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {deckName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {slides.length} slides extracted · 16:9 widescreen preview
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSlides([])}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Close deck
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slides.map((s) => (
                <div
                  key={s.slideNumber}
                  className={`aspect-video rounded-xl p-5 border flex flex-col justify-between relative overflow-hidden ${
                    theme === 'dark-slate'
                      ? 'bg-[#0F172A] text-white border-slate-800'
                      : 'bg-[#F8FAFC] text-slate-900 border-slate-200'
                  }`}
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono font-semibold text-indigo-400 mb-1.5 tabular-nums">
                      Slide {String(s.slideNumber).padStart(2, '0')}
                    </div>
                    <h4 className="text-sm font-semibold leading-snug mb-2 line-clamp-2">
                      {s.title}
                    </h4>
                    <ul className="space-y-1 text-xs opacity-85">
                      {s.bullets.slice(0, 4).map((b, i) => (
                        <li key={i} className="truncate">
                          · {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {s.images.length > 0 && (
                    <div className="text-[11px] font-mono opacity-65">
                      +{s.images.length} embedded media asset
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Presentation className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Slide render theme
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme('dark-slate')}
              className={`p-3 rounded-xl border text-left text-xs font-medium transition ${
                theme === 'dark-slate'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              Deep Slate Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('crisp-light')}
              className={`p-3 rounded-xl border text-left text-xs font-medium transition ${
                theme === 'crisp-light'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              Crisp White Light
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={slides.length === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            Export {slides.length} Slide{slides.length === 1 ? '' : 's'} to PDF
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={slides.length > 0}
        summary={`${slides.length} slides`}
        detail={deckName}
        actionLabel="Export Slides PDF"
        onAction={handleExportPdf}
        onReset={() => setSlides([])}
      />
    </div>
  );
};

/* ============================================================================
   11. EXCEL (.XLSX / .CSV) TO PDF WORKSPACE
============================================================================ */
export const ExcelToPdfWorkspace: React.FC = () => {
  const [workbook, setWorkbook] = useState<ParsedSpreadsheet | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const parsed = await parseExcelOrCsvFile(file);
      setWorkbook(parsed);
      setActiveSheet(parsed.sheetNames[0] || '');
    } catch {
      setError('Could not parse spreadsheet. Upload a valid .xlsx, .xls, or .csv file.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const sample = createSampleExcelFile();
      const parsed = await parseExcelOrCsvFile(sample);
      setWorkbook(parsed);
      setActiveSheet(parsed.sheetNames[0] || '');
    } finally {
      setLoading(false);
    }
  };

  const rows = workbook && activeSheet ? workbook.sheets[activeSheet] || [] : [];

  const handleExportPdf = () => {
    if (!workbook || rows.length === 0) return;
    const blob = renderSpreadsheetToPdf(
      `${workbook.filename} — ${activeSheet}`,
      rows,
      orientation
    );
    const base = workbook.filename.replace(/\.(xlsx|xls|csv)$/i, '');
    triggerDownload(blob, `${base}-${activeSheet}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!workbook ? (
          <WorkspaceDropzone
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            title="Drop an Excel (.xlsx) or CSV spreadsheet"
            subtitle="Parsed locally with SheetJS so you can inspect sheets and render formatted tables directly into PDF."
            selectLabel="Select .XLSX or .CSV"
            sampleLabel="Load sample workbook"
            onFilesSelected={handleFiles}
            onLoadSample={handleLoadSample}
            loading={loading}
            error={error}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {workbook.filename}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {rows.length} rows · {workbook.sheetNames.length} sheet
                  {workbook.sheetNames.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWorkbook(null);
                  setActiveSheet('');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Close file
              </button>
            </div>

            {workbook.sheetNames.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {workbook.sheetNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setActiveSheet(name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                      activeSheet === name
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[440px]">
              <table className="w-full text-left text-xs border-collapse">
                <tbody>
                  {rows.slice(0, 60).map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={
                        rIdx === 0
                          ? 'bg-slate-900 text-white font-semibold'
                          : rIdx % 2 === 0
                            ? 'bg-slate-50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      }
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3 py-2.5 border-b border-slate-200/70 dark:border-slate-800 font-mono tabular-nums whitespace-nowrap"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Table className="w-4 h-4 text-emerald-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Table export settings
            </h4>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Page orientation
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['landscape', 'portrait'] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOrientation(o)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium capitalize ${
                    orientation === o
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!workbook || rows.length === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            Export Sheet to PDF
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(workbook)}
        summary={`${rows.length} rows · ${activeSheet}`}
        detail={`${orientation} A4`}
        actionLabel="Export Table PDF"
        onAction={handleExportPdf}
        onReset={() => setWorkbook(null)}
      />
    </div>
  );
};

/* ============================================================================
   12. HTML TO PDF WORKSPACE (Split-Screen Live Preview)
============================================================================ */
const DEFAULT_HTML_SNIPPET = `<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #0F172A; padding: 28px; line-height: 1.6; }
  h1 { color: #312E81; margin-bottom: 6px; font-size: 24px; }
  h2 { color: #4338CA; margin-top: 22px; font-size: 16px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { border: 1px solid #CBD5E1; padding: 8px 10px; text-align: left; }
  th { background: #1E293B; color: #FFFFFF; }
</style>
<h1>Service Level Agreement — Q4 Addendum</h1>
<p>Effective Date: November 27, 2026 · Prepared by Infrastructure Operations</p>
<h2>1. Performance Guarantees</h2>
<p>All client-side PDF workflows execute locally in browser memory with zero remote network dependency once the application assets are cached.</p>
<ul>
  <li>Target uptime for static asset distribution: 99.98%</li>
  <li>Document retention on remote servers: None (Zero-Knowledge)</li>
  <li>Supported export standards: PDF 1.7, ISO 19005 PDF/A-1b, OOXML</li>
</ul>
<h2>2. Tier Allocation</h2>
<table>
  <tr><th>Environment</th><th>Max Local File Size</th><th>Local Processing</th></tr>
  <tr><td>Desktop Browser</td><td>250 MB</td><td>Full</td></tr>
  <tr><td>Mobile Web</td><td>100 MB</td><td>Full</td></tr>
</table>`;

export const HtmlToPdfWorkspace: React.FC = () => {
  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML_SNIPPET);
  const [docTitle, setDocTitle] = useState('HTML-Document-Export');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [fontSize, setFontSize] = useState(11);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleUploadHtml = async (file: File) => {
    const text = await file.text();
    setHtmlCode(text);
    setDocTitle(file.name.replace(/\.html?$/i, ''));
  };

  const handleExportPdf = () => {
    const blob = renderStructuredHtmlToPdf(docTitle || 'HTML Export', htmlCode, {
      fontSize,
      pageSize,
    });
    const clean = (docTitle.trim() || 'html-export').replace(/\.pdf$/i, '');
    triggerDownload(blob, `${clean}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8 space-y-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                HTML & CSS split studio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Edit raw HTML/CSS on the left and inspect the sandboxed preview on the right.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={uploadRef}
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleUploadHtml(e.target.files[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-500" /> Import .HTML
              </button>
              <button
                type="button"
                onClick={() => setHtmlCode(DEFAULT_HTML_SNIPPET)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300"
              >
                Reset sample
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                HTML / CSS source
              </label>
              <textarea
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                spellCheck={false}
                className="w-full h-[420px] p-3.5 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Live sandboxed preview
              </label>
              <iframe
                title="HTML Live Preview"
                sandbox=""
                srcDoc={htmlCode}
                className="w-full h-[420px] rounded-xl bg-white border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Code2 className="w-4 h-4 text-cyan-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              HTML export settings
            </h4>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Document title
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500 dark:text-slate-400">PDF body size</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {fontSize} pt
              </span>
            </div>
            <input
              type="range"
              min={9}
              max={15}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['a4', 'letter'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPageSize(s)}
                className={`py-2 px-3 rounded-xl border text-xs font-medium uppercase ${
                  pageSize === s
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!htmlCode.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            Export HTML to PDF
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(htmlCode.trim())}
        summary={`${htmlCode.length} chars`}
        detail={`${pageSize.toUpperCase()} · ${fontSize}pt`}
        actionLabel="Export HTML PDF"
        onAction={handleExportPdf}
      />
    </div>
  );
};

/* ============================================================================
   13. MARKDOWN TO PDF WORKSPACE (Side-by-Side Preview)
============================================================================ */
const DEFAULT_MARKDOWN = `# KAAGAZ Architecture Notes

> Local-first document processing guarantees complete privacy and zero upload latency.

## Core Design Principles

- **100% Client-Side Execution**: Powered by pdf-lib, PDF.js, jsPDF, Mammoth, SheetJS, docx, and PptxGenJS.
- **Local Execution**: Every engine asset bundles directly into the browser runtime.
- **Deterministic Outputs**: Clean typography, margins, and archival XMP metadata.

## Supported Format Matrix

| Source Format | Target Format | Processing Library |
| --- | --- | --- |
| DOCX / TXT | PDF | Mammoth + jsPDF |
| XLSX / CSV | PDF | SheetJS + jsPDF |
| PDF | DOCX / PPTX / XLSX | PDF.js + docx + PptxGenJS |

## Example Pipeline Snippet

\`\`\`ts
const pdfBytes = await mergePdfFiles([contractFile, annexFile]);
triggerDownload(pdfBytes, 'Executed-Agreement.pdf');
\`\`\`
`;

export const MarkdownToPdfWorkspace: React.FC = () => {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [filename, setFilename] = useState('Prism-Markdown-Guide');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [fontSize, setFontSize] = useState(11);
  const uploadRef = useRef<HTMLInputElement>(null);

  const compiledHtml = compileMarkdownToHtml(markdown);

  const handleUploadMd = async (file: File) => {
    const text = await file.text();
    setMarkdown(text);
    setFilename(file.name.replace(/\.(md|markdown|txt)$/i, ''));
  };

  const handleExportPdf = () => {
    const blob = renderStructuredHtmlToPdf(filename || 'Markdown Export', compiledHtml, {
      fontSize,
      pageSize,
    });
    const clean = (filename.trim() || 'markdown-export').replace(/\.pdf$/i, '');
    triggerDownload(blob, `${clean}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Markdown editor & live preview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports headings, lists, blockquotes, pipe tables, and fenced code blocks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={uploadRef}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleUploadMd(e.target.files[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-500" /> Import .MD
              </button>
              <button
                type="button"
                onClick={() => setMarkdown(DEFAULT_MARKDOWN)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300"
              >
                Reset sample
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Markdown source
              </label>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                spellCheck={false}
                className="w-full h-[430px] p-3.5 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Formatted document preview
              </label>
              <div
                className="doc-preview w-full h-[430px] p-5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: sanitizePreviewHtml(compiledHtml) }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <FileCode className="w-4 h-4 text-violet-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Markdown PDF settings
            </h4>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Output filename
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500 dark:text-slate-400">Body font size</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {fontSize} pt
              </span>
            </div>
            <input
              type="range"
              min={9}
              max={15}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['a4', 'letter'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPageSize(s)}
                className={`py-2 px-3 rounded-xl border text-xs font-medium uppercase ${
                  pageSize === s
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!markdown.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            Export Markdown to PDF
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(markdown.trim())}
        summary={`${markdown.trim().split(/\s+/).length} words`}
        detail={`${pageSize.toUpperCase()} · ${fontSize}pt`}
        actionLabel="Export Markdown PDF"
        onAction={handleExportPdf}
      />
    </div>
  );
};
