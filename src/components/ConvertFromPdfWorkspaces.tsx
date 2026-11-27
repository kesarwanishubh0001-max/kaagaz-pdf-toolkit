import React, { useState } from 'react';
import {
  Download,
  RefreshCw,
  Archive,
  FileImage,
  Images,
  FileType,
  MonitorPlay,
  Sheet,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  formatBytes,
  triggerDownload,
  renderPdfThumbnails,
  PageThumbnail,
} from '../utils/pdfEngine';
import {
  RenderedPdfImage,
  renderPdfToImagesAtDpi,
  bundleRenderedImagesToZip,
  ExtractedPdfPageText,
  extractPdfStructuredText,
  generateDocxFromPdfText,
  convertPdfToPptxBlob,
  extractPdfTableRows,
  exportRowsToExcelOrCsv,
  PdfAConversionResult,
  convertPdfToPdfA,
} from '../utils/convertEngine';
import { WorkspaceDropzone, FloatingActionBar } from './WorkspaceShared';

/* ============================================================================
   14 & 15. SHARED PDF TO IMAGE WORKSPACE (PDF to JPG & PDF to PNG)
============================================================================ */
interface PdfToImageProps {
  format: 'jpeg' | 'png';
}

const PdfToImageWorkspace: React.FC<PdfToImageProps> = ({ format }) => {
  const isPng = format === 'png';
  const ext = isPng ? 'png' : 'jpg';
  const [file, setFile] = useState<File | null>(null);
  const [dpi, setDpi] = useState<72 | 150 | 300>(150);
  const [quality, setQuality] = useState(0.92);
  const [images, setImages] = useState<RenderedPdfImage[]>([]);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [zipping, setZipping] = useState(false);

  const runRender = async (
    targetFile: File,
    targetDpi: 72 | 150 | 300,
    targetQuality: number
  ) => {
    setRendering(true);
    setProgress({ current: 0, total: 1 });
    try {
      const rendered = await renderPdfToImagesAtDpi(
        targetFile,
        format,
        targetDpi,
        targetQuality,
        (current, total) => setProgress({ current, total })
      );
      setImages(rendered);
    } finally {
      setRendering(false);
      setProgress(null);
    }
  };

  const handleFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setFile(selected);
    await runRender(selected, dpi, quality);
  };

  const handleDpiChange = async (newDpi: 72 | 150 | 300) => {
    setDpi(newDpi);
    if (file) {
      await runRender(file, newDpi, quality);
    }
  };

  const downloadSingleImage = (img: RenderedPdfImage) => {
    if (!file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    const a = document.createElement('a');
    a.href = img.dataUrl;
    a.download = `${base}-page-${String(img.pageNumber).padStart(2, '0')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadZip = async () => {
    if (!file || images.length === 0) return;
    setZipping(true);
    try {
      const base = file.name.replace(/\.pdf$/i, '');
      const zipBlob = await bundleRenderedImagesToZip(images, base, ext);
      triggerDownload(zipBlob, `${base}-${dpi}dpi-${ext}.zip`, 'application/zip');
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title={
              isPng
                ? 'Drop a PDF to export lossless PNG images'
                : 'Drop a PDF to render JPG images at 72–300 DPI'
            }
            subtitle={
              isPng
                ? 'Render crisp high-resolution PNG pages locally and download individually or as a ZIP.'
                : 'Choose DPI resolution and JPEG quality, then download single pages or a ZIP bundle.'
            }
            onFilesSelected={handleFiles}
            loading={rendering}
            loadingText="Rendering PDF pages..."
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {images.length} rendered {ext.toUpperCase()} images · {dpi} DPI
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setImages([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Close file
              </button>
            </div>

            {rendering && progress ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
                <p className="text-sm text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                  Rendering page {progress.current} of {progress.total} at {dpi} DPI...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((img) => (
                  <div
                    key={img.pageNumber}
                    className="rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex flex-col justify-between"
                  >
                    <div className="aspect-[1/1.3] rounded-lg bg-white border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center">
                      <img
                        src={img.dataUrl}
                        alt={`Page ${img.pageNumber}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                          Page {img.pageNumber}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-500">
                          {img.width}×{img.height} · {formatBytes(img.sizeBytes, 1)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadSingleImage(img)}
                        className="p-2 rounded-lg bg-indigo-500/12 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 shrink-0"
                        title={`Download page ${img.pageNumber}.${ext}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            {isPng ? (
              <Images className="w-4 h-4 text-teal-500" />
            ) : (
              <FileImage className="w-4 h-4 text-amber-500" />
            )}
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {isPng ? 'PNG render settings' : 'JPG render settings'}
            </h4>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Output resolution (DPI)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([72, 150, 300] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleDpiChange(val)}
                  disabled={rendering}
                  className={`py-2 px-2 rounded-xl border text-xs font-mono font-medium tabular-nums transition ${
                    dpi === val
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {val} DPI
                </button>
              ))}
            </div>
          </div>

          {!isPng && (
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500 dark:text-slate-400">JPEG quality</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1}
                step={0.02}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                onMouseUp={() => file && runRender(file, dpi, quality)}
                onTouchEnd={() => file && runRender(file, dpi, quality)}
                className="w-full accent-indigo-600"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={!file || images.length === 0 || rendering || zipping}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Archive className="w-4 h-4" />
            {zipping
              ? 'Bundling ZIP...'
              : `Download All ${images.length} ${ext.toUpperCase()}s (.ZIP)`}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={images.length > 0 && !rendering}
        summary={`${images.length} ${ext.toUpperCase()} pages`}
        detail={`${dpi} DPI`}
        actionLabel={zipping ? 'Bundling...' : 'Download All (.ZIP)'}
        busy={zipping}
        onAction={handleDownloadZip}
        onReset={() => {
          setFile(null);
          setImages([]);
        }}
      />
    </div>
  );
};

export const PdfToJpgWorkspace: React.FC = () => (
  <PdfToImageWorkspace format="jpeg" />
);

export const PdfToPngWorkspace: React.FC = () => (
  <PdfToImageWorkspace format="png" />
);

/* ============================================================================
   16. PDF TO WORD (.DOCX) WORKSPACE
============================================================================ */
export const PdfToWordWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<ExtractedPdfPageText[]>([]);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);

  const handleFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    try {
      setFile(selected);
      const extracted = await extractPdfStructuredText(selected);
      setPages(extracted);
    } finally {
      setLoading(false);
    }
  };

  const totalParagraphs = pages.reduce((acc, p) => acc + p.paragraphs.length, 0);

  const handleExportDocx = async () => {
    if (!file || pages.length === 0) return;
    setBuilding(true);
    try {
      const blob = await generateDocxFromPdfText(file.name, pages);
      const base = file.name.replace(/\.pdf$/i, '');
      triggerDownload(
        blob,
        `${base}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to convert to editable Word (.docx)"
            subtitle="Extracts lines and paragraphs via PDF.js and generates a real downloadable .docx file."
            onFilesSelected={handleFiles}
            loading={loading}
            loadingText="Extracting PDF text structure..."
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {pages.length} pages · {totalParagraphs} extracted text blocks
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPages([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Close file
              </button>
            </div>

            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {pages.map((p) => (
                <div
                  key={p.pageNumber}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5"
                >
                  <div className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    Page {p.pageNumber}
                  </div>
                  {p.paragraphs.length === 0 ? (
                    <p className="text-xs italic text-slate-400">
                      No selectable text layer detected on this page.
                    </p>
                  ) : (
                    p.paragraphs.map((line, idx) => (
                      <p
                        key={idx}
                        className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                      >
                        {line}
                      </p>
                    ))
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
            <FileType className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              DOCX export summary
            </h4>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Pages detected</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {pages.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Extracted paragraphs</span>
              <span className="font-mono font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                {totalParagraphs}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Output format</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                Word (.docx)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportDocx}
            disabled={!file || pages.length === 0 || building}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            {building ? 'Generating .DOCX...' : 'Download Word (.DOCX)'}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={`${pages.length} pages · ${totalParagraphs} lines`}
        detail={file?.name}
        actionLabel={building ? 'Generating...' : 'Download .DOCX'}
        busy={building}
        onAction={handleExportDocx}
        onReset={() => {
          setFile(null);
          setPages([]);
        }}
      />
    </div>
  );
};

/* ============================================================================
   17. PDF TO POWERPOINT (.PPTX) WORKSPACE
============================================================================ */
export const PdfToPowerPointWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [slideBg, setSlideBg] = useState<'0F172A' | 'FFFFFF'>('0F172A');
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  const handleFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    try {
      setFile(selected);
      const thumbs = await renderPdfThumbnails(selected, 0.45);
      setThumbnails(thumbs);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPptx = async () => {
    if (!file) return;
    setBuilding(true);
    setProgress({ current: 0, total: thumbnails.length });
    try {
      const blob = await convertPdfToPptxBlob(file, slideBg, (current, total) =>
        setProgress({ current, total })
      );
      const base = file.name.replace(/\.pdf$/i, '');
      triggerDownload(
        blob,
        `${base}.pptx`,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      );
    } finally {
      setBuilding(false);
      setProgress(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to convert into PowerPoint (.pptx)"
            subtitle="Every PDF page becomes a widescreen 16:9 slide inside a downloadable .pptx presentation."
            onFilesSelected={handleFiles}
            loading={loading}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {thumbnails.length} widescreen slides ready for PptxGenJS
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setThumbnails([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Close file
              </button>
            </div>

            {progress && (
              <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                Rendering slide {progress.current} of {progress.total}...
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {thumbnails.map((thumb) => (
                <div
                  key={thumb.id}
                  className={`aspect-video rounded-xl p-3 border flex items-center justify-center relative overflow-hidden ${
                    slideBg === '0F172A'
                      ? 'bg-[#0F172A] border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <img
                    src={thumb.dataUrl}
                    alt={`Slide ${thumb.originalPageNumber}`}
                    className="max-h-full max-w-full object-contain rounded shadow-sm"
                  />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[10px] tabular-nums">
                    Slide {thumb.originalPageNumber}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <MonitorPlay className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Presentation settings
            </h4>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Slide canvas background
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSlideBg('0F172A')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium ${
                  slideBg === '0F172A'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                Deep Slate
              </button>
              <button
                type="button"
                onClick={() => setSlideBg('FFFFFF')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium ${
                  slideBg === 'FFFFFF'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                Crisp White
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportPptx}
            disabled={!file || thumbnails.length === 0 || building}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            {building ? 'Building .PPTX...' : 'Download PowerPoint (.PPTX)'}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={`${thumbnails.length} slides`}
        detail="16:9 PowerPoint (.pptx)"
        actionLabel={building ? 'Building...' : 'Download .PPTX'}
        busy={building}
        onAction={handleExportPptx}
        onReset={() => {
          setFile(null);
          setThumbnails([]);
        }}
      />
    </div>
  );
};

/* ============================================================================
   18. PDF TO EXCEL (.XLSX / .CSV) WORKSPACE
============================================================================ */
export const PdfToExcelWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnGap, setColumnGap] = useState(32);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [loading, setLoading] = useState(false);

  const runExtraction = async (targetFile: File, gap: number) => {
    setLoading(true);
    try {
      const detected = await extractPdfTableRows(targetFile, gap);
      setRows(detected);
    } finally {
      setLoading(false);
    }
  };

  const handleFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setFile(selected);
    await runExtraction(selected, columnGap);
  };

  const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);

  const handleExport = () => {
    if (!file || rows.length === 0) return;
    const blob = exportRowsToExcelOrCsv(rows, exportFormat);
    const base = file.name.replace(/\.pdf$/i, '');
    triggerDownload(
      blob,
      `${base}-tables.${exportFormat}`,
      exportFormat === 'csv'
        ? 'text/csv;charset=utf-8;'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to detect tables and export to Excel"
            subtitle="Groups PDF text coordinates into rows and columns, then exports cleanly as .xlsx or .csv."
            onFilesSelected={handleFiles}
            loading={loading}
            loadingText="Detecting tabular rows & columns..."
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {rows.length} rows detected · up to {maxCols} columns
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setRows([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Close file
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[440px]">
              <table className="w-full text-left text-xs border-collapse">
                <tbody>
                  {rows.slice(0, 80).map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={
                        rIdx % 2 === 0
                          ? 'bg-slate-50/70 dark:bg-slate-950/40'
                          : 'bg-white dark:bg-slate-900'
                      }
                    >
                      <td className="px-2.5 py-2 border-b border-r border-slate-200/70 dark:border-slate-800 font-mono text-[11px] text-slate-400 tabular-nums">
                        {rIdx + 1}
                      </td>
                      {Array.from({ length: Math.max(maxCols, 1) }).map((_, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3 py-2 border-b border-slate-200/70 dark:border-slate-800 font-mono tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap"
                        >
                          {row[cIdx] ?? ''}
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
            <Sheet className="w-4 h-4 text-emerald-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Table detection & format
            </h4>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500 dark:text-slate-400">
                Column split gap
              </span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {columnGap} pt
              </span>
            </div>
            <input
              type="range"
              min={12}
              max={72}
              step={4}
              value={columnGap}
              onChange={(e) => setColumnGap(Number(e.target.value))}
              onMouseUp={() => file && runExtraction(file, columnGap)}
              onTouchEnd={() => file && runExtraction(file, columnGap)}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setExportFormat('xlsx')}
              className={`py-2 px-3 rounded-xl border text-xs font-medium ${
                exportFormat === 'xlsx'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              Excel (.XLSX)
            </button>
            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={`py-2 px-3 rounded-xl border text-xs font-medium ${
                exportFormat === 'csv'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              CSV (.CSV)
            </button>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={!file || rows.length === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            Export {exportFormat.toUpperCase()}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={rows.length > 0}
        summary={`${rows.length} rows × ${maxCols} cols`}
        detail={`Format: .${exportFormat}`}
        actionLabel={`Download .${exportFormat.toUpperCase()}`}
        onAction={handleExport}
        onReset={() => {
          setFile(null);
          setRows([]);
        }}
      />
    </div>
  );
};

/* ============================================================================
   19. PDF TO PDF/A WORKSPACE (ISO 19005 Archival Serialization)
============================================================================ */
export const PdfToPdfAWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [conformance, setConformance] = useState<'PDF/A-1b' | 'PDF/A-2b'>('PDF/A-1b');
  const [customTitle, setCustomTitle] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<PdfAConversionResult | null>(null);

  const handleFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setFile(selected);
    setCustomTitle(selected.name.replace(/\.pdf$/i, ''));
    setResult(null);
  };

  const handleConvert = async () => {
    if (!file) return;
    setConverting(true);
    try {
      const out = await convertPdfToPdfA(
        file,
        conformance,
        customTitle,
        customAuthor
      );
      setResult(out);
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = () => {
    if (!file || !result) return;
    const base = file.name.replace(/\.pdf$/i, '');
    triggerDownload(result.bytes, `${base}-PDFA.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to serialize as archival PDF/A"
            subtitle="Embeds ISO 19005 XMP archival metadata, sets document language, and flattens AcroForm fields locally."
            onFilesSelected={handleFiles}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Input size: {formatBytes(file.size)} · Target: {conformance}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Change file
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Archival Title (dc:title)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => {
                    setCustomTitle(e.target.value);
                    setResult(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Archival Author (dc:creator)
                </label>
                <input
                  type="text"
                  value={customAuthor}
                  onChange={(e) => {
                    setCustomAuthor(e.target.value);
                    setResult(null);
                  }}
                  placeholder="Organization or Author"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {result && (
              <div className="space-y-4">
                <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/25 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {result.conformanceLevel} package ready
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums mt-0.5">
                        {result.pageCount} pages · {formatBytes(result.bytes.byteLength)} ·
                        XMP Metadata embedded
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4" /> Download PDF/A
                  </button>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    Embedded ISO 19005 XMP Metadata Packet
                  </div>
                  <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto border border-slate-800 max-h-56">
                    {result.xmpXml}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <ShieldCheck className="w-4 h-4 text-purple-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Archival standard
            </h4>
          </div>

          <div className="space-y-2">
            {(
              [
                {
                  id: 'PDF/A-1b',
                  desc: 'ISO 19005-1 Level B · Disables object streams for maximum legacy compatibility.',
                },
                {
                  id: 'PDF/A-2b',
                  desc: 'ISO 19005-2 Level B · Supports compressed object streams and modern transparency.',
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setConformance(opt.id);
                  setResult(null);
                }}
                className={`w-full p-3 rounded-xl border text-left transition ${
                  conformance === opt.id
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-semibold">{opt.id}</div>
                <div className="text-[11px] opacity-80 mt-0.5 leading-relaxed">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={result ? handleDownload : handleConvert}
            disabled={!file || converting}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            {converting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Serializing PDF/A...
              </>
            ) : result ? (
              <>
                <Download className="w-4 h-4" />
                Download {result.conformanceLevel}
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Convert to {conformance}
              </>
            )}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={result ? `${result.conformanceLevel} ready` : conformance}
        detail={file?.name}
        actionLabel={
          converting
            ? 'Serializing...'
            : result
              ? 'Download PDF/A'
              : `Convert to ${conformance}`
        }
        busy={converting}
        onAction={result ? handleDownload : handleConvert}
        onReset={() => {
          setFile(null);
          setResult(null);
        }}
      />
    </div>
  );
};
