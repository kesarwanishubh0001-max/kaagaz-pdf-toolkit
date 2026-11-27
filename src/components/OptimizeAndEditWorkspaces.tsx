import React, { useState, useRef } from 'react';
import {
  Download,
  RefreshCw,
  Wrench,
  ScanText,
  RotateCw,
  RotateCcw,
  Hash,
  Stamp,
  Crop,
  PenLine,
  CheckCircle2,
  Copy,
  Type,
  Highlighter,
  Square,
  Circle,
  ImagePlus,
  Undo2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
} from 'lucide-react';
import {
  PageThumbnail,
  renderPdfThumbnails,
  formatBytes,
  triggerDownload,
} from '../utils/pdfEngine';
import {
  repairPdfLocally,
  RepairPdfResult,
  createSampleScannedPdf,
  runOcrOnFile,
  buildSearchableOcrPdf,
  OcrPageResult,
  rotatePdfPages,
  addPageNumbersToPdf,
  formatPageNumberLabel,
  PageNumberOptions,
  PageNumberPosition,
  PageNumberFormat,
  addWatermarkToPdf,
  WatermarkOptions,
  cropPdfPages,
  CropMarginsPct,
  applyPdfEdits,
  PdfEditOverlay,
} from '../utils/advancedEngine';
import {
  WorkspaceDropzone,
  FloatingActionBar,
  MultiOutputDownloadPanel,
  GeneratedFileItem,
} from './WorkspaceShared';

/* ============================================================================
   8. REPAIR PDF WORKSPACE
============================================================================ */
export const RepairPdfWorkspace: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<'auto' | 'deep-visual'>('auto');
  const [statusMsg, setStatusMsg] = useState('');
  const [repairing, setRepairing] = useState(false);
  const [results, setResults] = useState<{ file: File; report: RepairPdfResult }[]>([]);
  const [outputs, setOutputs] = useState<GeneratedFileItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    setFiles((prev) => [...prev, ...incoming]);
    setResults([]);
    setOutputs([]);
    setError(null);
  };

  const handleRepair = async () => {
    if (files.length === 0) return;
    setRepairing(true);
    setError(null);
    setResults([]);
    setOutputs([]);
    const collectedReports: { file: File; report: RepairPdfResult }[] = [];
    const collectedOutputs: GeneratedFileItem[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setStatusMsg(
          files.length > 1
            ? `Repairing ${i + 1}/${files.length}: ${f.name}...`
            : `Repairing ${f.name}...`
        );
        const out = await repairPdfLocally(f, mode, (msg) =>
          setStatusMsg(files.length > 1 ? `[${i + 1}/${files.length}] ${msg}` : msg)
        );
        collectedReports.push({ file: f, report: out });
        const base = f.name.replace(/\.pdf$/i, '');
        collectedOutputs.push({
          id: `rep-${i}-${Date.now()}`,
          filename: `${base}-repaired.pdf`,
          subtitle: `${out.recoveredPages} page${out.recoveredPages === 1 ? '' : 's'} · ${
            out.strategy === 'structural' ? 'Structural Rebuild' : 'Deep Visual Recovery'
          }`,
          sizeBytes: out.bytes.byteLength,
          data: out.bytes,
        });
      }
      setResults(collectedReports);
      setOutputs(collectedOutputs);
    } catch {
      setError(
        'One or more files are too severely corrupted to parse in browser memory. Try Deep Visual Recovery mode.'
      );
    } finally {
      setRepairing(false);
      setStatusMsg('');
    }
  };

  const totalRecoveredPages = results.reduce((acc, r) => acc + r.report.recoveredPages, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <input
        ref={addInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          handleFiles(Array.from(e.target.files || []));
          e.target.value = '';
        }}
      />

      <div className="lg:col-span-8">
        {files.length === 0 ? (
          <WorkspaceDropzone
            multiple
            title="Drop one or more damaged PDFs to repair"
            subtitle="Reconstructs broken cross-reference tables or performs deep visual page recovery across single or multiple files."
            selectLabel="Select PDF Files"
            onFilesSelected={handleFiles}
            error={error}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {files.length === 1 ? files[0].name : `${files.length} PDF files queued`}
                </h3>
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  Total size: {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FilePlus2 className="w-3.5 h-3.5" /> Add PDFs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setResults([]);
                    setOutputs([]);
                    setError(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500 whitespace-nowrap"
                >
                  Clear all
                </button>
              </div>
            </div>

            {files.length > 1 && (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {f.name}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-500">
                        {formatBytes(f.size)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFiles((prev) => prev.filter((_, i) => i !== idx));
                        setResults([]);
                        setOutputs([]);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {(
                [
                  {
                    id: 'auto',
                    title: 'Auto Structural Rebuild',
                    desc: 'Rebuilds XRef table and copies valid page objects; falls back to visual recovery automatically.',
                  },
                  {
                    id: 'deep-visual',
                    title: 'Deep Visual Recovery',
                    desc: 'Uses PDF.js tolerant renderer to rescue pages with broken content streams into a clean PDF.',
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setMode(opt.id);
                    setResults([]);
                    setOutputs([]);
                  }}
                  className={`p-4 rounded-xl border text-left transition ${
                    mode === opt.id
                      ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {opt.title}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>

            {repairing && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/8 border border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>{statusMsg || 'Repairing PDF structure...'}</span>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            {outputs.length > 0 && (
              <div className="space-y-4">
                <MultiOutputDownloadPanel
                  title={
                    outputs.length === 1
                      ? `Repaired PDF ready (${totalRecoveredPages} pages recovered)`
                      : `${outputs.length} Repaired PDFs ready (${totalRecoveredPages} pages total)`
                  }
                  zipFilename="repaired-pdfs.zip"
                  items={outputs}
                  onClear={() => {
                    setOutputs([]);
                    setResults([]);
                  }}
                />

                {results.length === 1 && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Recovery diagnostics
                    </div>
                    {results[0].report.log.map((entry, idx) => (
                      <div
                        key={idx}
                        className="text-xs font-mono text-slate-700 dark:text-slate-300"
                      >
                        {idx + 1}. {entry}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Wrench className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Repair summary
            </h4>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Files queued</span>
              <span className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                {files.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Recovery mode</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                {mode === 'auto' ? 'Auto Rebuild' : 'Deep Visual'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Recovered pages</span>
              <span className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {results.length > 0 ? totalRecoveredPages : '—'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRepair}
            disabled={files.length === 0 || repairing}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition whitespace-nowrap"
          >
            {repairing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Repairing...
              </>
            ) : (
              <>
                <Wrench className="w-4 h-4" />{' '}
                {files.length > 1 ? `Repair All (${files.length})` : 'Repair PDF Now'}
              </>
            )}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={files.length > 0}
        summary={
          outputs.length > 0
            ? `${outputs.length} repaired · ${totalRecoveredPages} pages`
            : `${files.length} file${files.length === 1 ? '' : 's'} ready`
        }
        detail={files.length === 1 ? files[0].name : 'Batch recovery mode'}
        actionLabel={repairing ? 'Repairing...' : files.length > 1 ? 'Repair All' : 'Repair Now'}
        busy={repairing}
        onAction={handleRepair}
        onReset={() => {
          setFiles([]);
          setResults([]);
          setOutputs([]);
        }}
      />
    </div>
  );
};

/* ============================================================================
   9. OCR PDF WORKSPACE (Real In-Browser Tesseract.js)
============================================================================ */
export const OcrPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<OcrPageResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ status: '', pct: 0 });
  const [buildingPdf, setBuildingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setFile(selected);
    setResults([]);
  };

  const handleLoadSampleScan = async () => {
    const sample = await createSampleScannedPdf();
    setFile(sample);
    setResults([]);
  };

  const handleRunOcr = async () => {
    if (!file) return;
    setRunning(true);
    setProgress({ status: 'Starting OCR...', pct: 5 });
    try {
      const pages = await runOcrOnFile(file, 'eng', (status, pct) =>
        setProgress({ status, pct })
      );
      setResults(pages);
    } finally {
      setRunning(false);
    }
  };

  const fullText = results
    .map((r) => `--- Page ${r.pageNumber} ---\n${r.text}`)
    .join('\n\n');

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadTxt = () => {
    if (!file) return;
    const base = file.name.replace(/\.(pdf|png|jpe?g|webp)$/i, '');
    triggerDownload(
      new Blob([fullText], { type: 'text/plain;charset=utf-8' }),
      `${base}-ocr.txt`,
      'text/plain'
    );
  };

  const handleDownloadSearchablePdf = async () => {
    if (!file || results.length === 0) return;
    setBuildingPdf(true);
    try {
      const bytes = await buildSearchableOcrPdf(results);
      const base = file.name.replace(/\.(pdf|png|jpe?g|webp)$/i, '');
      triggerDownload(bytes, `${base}-searchable-ocr.pdf`);
    } finally {
      setBuildingPdf(false);
    }
  };

  const avgConfidence =
    results.length > 0
      ? Math.round(
          results.reduce((acc, r) => acc + r.confidence, 0) / results.length
        )
      : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            accept="application/pdf,.pdf,image/png,image/jpeg,image/webp"
            title="Drop a scanned PDF or document image for OCR"
            subtitle="Extracts selectable text using Tesseract.js in your browser and builds a searchable PDF."
            selectLabel="Select PDF or Image"
            sampleLabel="Load sample scanned PDF"
            onFilesSelected={handleFiles}
            onLoadSample={handleLoadSampleScan}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </h3>
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {formatBytes(file.size)}
                  {results.length > 0 && ` · ${results.length} page(s) · ${avgConfidence}% avg confidence`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setResults([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Change file
              </button>
            </div>

            {running && (
              <div className="space-y-2 py-4">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                  <span>{progress.status}</span>
                  <span>{progress.pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-200"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
              </div>
            )}

            {!running && results.length === 0 && (
              <div className="py-10 text-center space-y-3">
                <ScanText className="w-8 h-8 text-indigo-500 mx-auto" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Ready to recognize text locally with Tesseract.js
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  First run caches the English OCR model locally (~4 MB) for fast subsequent text recognition.
                </p>
                <button
                  type="button"
                  onClick={handleRunOcr}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium shadow-sm"
                >
                  Start OCR Recognition
                </button>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-4">
                {results.map((page) => (
                  <div
                    key={page.pageNumber}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="md:col-span-4">
                      <img
                        src={page.imageDataUrl}
                        alt={`OCR Page ${page.pageNumber}`}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
                      />
                      <div className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-500">
                        Page {page.pageNumber} · {page.confidence}% confidence
                      </div>
                    </div>
                    <div className="md:col-span-8 flex flex-col">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Recognized text (editable)
                      </label>
                      <textarea
                        value={page.text}
                        onChange={(e) =>
                          setResults((prev) =>
                            prev.map((r) =>
                              r.pageNumber === page.pageNumber
                                ? { ...r, text: e.target.value }
                                : r
                            )
                          )
                        }
                        className="w-full flex-1 min-h-[180px] p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <ScanText className="w-4 h-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              OCR exports
            </h4>
          </div>

          <button
            type="button"
            onClick={results.length > 0 ? handleDownloadSearchablePdf : handleRunOcr}
            disabled={!file || running || buildingPdf}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            {running || buildingPdf ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : results.length > 0 ? (
              <Download className="w-4 h-4" />
            ) : (
              <ScanText className="w-4 h-4" />
            )}
            {running
              ? 'Running OCR...'
              : buildingPdf
                ? 'Building PDF...'
                : results.length > 0
                  ? 'Download Searchable PDF'
                  : 'Run OCR Recognition'}
          </button>

          {results.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 hover:border-indigo-500/50"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied' : 'Copy text'}
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 hover:border-indigo-500/50"
              >
                <Download className="w-3.5 h-3.5" /> Save .TXT
              </button>
            </div>
          )}
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={
          results.length > 0
            ? `${results.length} page(s) · ${avgConfidence}% conf.`
            : 'OCR ready'
        }
        detail={file?.name}
        actionLabel={
          running
            ? 'Recognizing...'
            : results.length > 0
              ? 'Download Searchable PDF'
              : 'Start OCR'
        }
        busy={running || buildingPdf}
        onAction={results.length > 0 ? handleDownloadSearchablePdf : handleRunOcr}
        onReset={() => {
          setFile(null);
          setResults([]);
        }}
      />
    </div>
  );
};

/* ============================================================================
   22. ROTATE PDF WORKSPACE
============================================================================ */
export const RotatePdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<PageThumbnail[]>([]);
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    try {
      setFile(selected);
      const rendered = await renderPdfThumbnails(selected, 0.45);
      setThumbs(rendered);
      setRotations({});
    } finally {
      setLoading(false);
    }
  };

  const rotateSingle = (pageNum: number, delta: number) => {
    setRotations((prev) => ({
      ...prev,
      [pageNum]: ((prev[pageNum] || 0) + delta + 360) % 360,
    }));
  };

  const rotateAll = (delta: number, filter?: 'all' | 'odd' | 'even') => {
    setRotations((prev) => {
      const next = { ...prev };
      thumbs.forEach((t) => {
        const n = t.originalPageNumber;
        if (filter === 'odd' && n % 2 === 0) return;
        if (filter === 'even' && n % 2 === 1) return;
        next[n] = ((next[n] || 0) + delta + 360) % 360;
      });
      return next;
    });
  };

  const rotatedCount = Object.values(rotations).filter((deg) => deg % 360 !== 0).length;

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const bytes = await rotatePdfPages(file, rotations);
      const base = file.name.replace(/\.pdf$/i, '');
      triggerDownload(bytes, `${base}-rotated.pdf`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to rotate individual or all pages"
            subtitle="Rotate pages 90°, 180°, or 270° with instant thumbnail previews."
            onFilesSelected={handleFiles}
            loading={loading}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </h3>
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {thumbs.length} pages · {rotatedCount} modified
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRotations({})}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300"
                >
                  Reset angles
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setThumbs([]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {thumbs.map((thumb) => {
                const deg = rotations[thumb.originalPageNumber] || 0;
                return (
                  <div
                    key={thumb.id}
                    className={`rounded-xl p-2.5 border transition ${
                      deg !== 0
                        ? 'border-indigo-500 bg-indigo-500/8'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40'
                    }`}
                  >
                    <div className="relative aspect-[1/1.3] rounded-lg bg-white border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                      <img
                        src={thumb.dataUrl}
                        alt={`Page ${thumb.originalPageNumber}`}
                        style={{ transform: `rotate(${deg}deg)` }}
                        className="max-w-full max-h-full object-contain transition-transform duration-200"
                      />
                      {deg !== 0 && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] tabular-nums">
                          {deg}°
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        Page {thumb.originalPageNumber}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => rotateSingle(thumb.originalPageNumber, -90)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-500"
                          title="Rotate 90° left"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => rotateSingle(thumb.originalPageNumber, 90)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-500"
                          title="Rotate 90° right"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <RotateCw className="w-4 h-4 text-sky-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Bulk rotation controls
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!file}
              onClick={() => rotateAll(90, 'all')}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              All +90° Right
            </button>
            <button
              type="button"
              disabled={!file}
              onClick={() => rotateAll(-90, 'all')}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              All -90° Left
            </button>
            <button
              type="button"
              disabled={!file}
              onClick={() => rotateAll(180, 'all')}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              Flip All 180°
            </button>
            <button
              type="button"
              disabled={!file}
              onClick={() => rotateAll(90, 'even')}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              Even Pages +90°
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!file || saving}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            {saving ? 'Saving PDF...' : 'Apply Rotation & Download'}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={`${rotatedCount} rotated pages`}
        detail={file?.name}
        actionLabel={saving ? 'Saving...' : 'Download Rotated PDF'}
        busy={saving}
        onAction={handleSave}
        onReset={() => setRotations({})}
      />
    </div>
  );
};

/* ============================================================================
   23. ADD PAGE NUMBERS WORKSPACE
============================================================================ */
export const AddPageNumbersWorkspace: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [thumbs, setThumbs] = useState<PageThumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [outputs, setOutputs] = useState<GeneratedFileItem[]>([]);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [options, setOptions] = useState<PageNumberOptions>({
    position: 'bottom-center',
    format: 'page-n-of-total',
    startNumber: 1,
    skipFirstPage: false,
    fontSize: 11,
    marginPt: 26,
    colorHex: '#1E293B',
  });

  const loadPreview = async (target: File) => {
    setLoading(true);
    try {
      const rendered = await renderPdfThumbnails(target, 0.55);
      setThumbs(rendered);
    } finally {
      setLoading(false);
    }
  };

  const handleFiles = async (incoming: File[]) => {
    if (incoming.length === 0) return;
    const next = [...files, ...incoming];
    setFiles(next);
    setOutputs([]);
    if (files.length === 0) {
      setActiveIdx(0);
      await loadPreview(incoming[0]);
    }
  };

  const handleSelectPreview = async (idx: number) => {
    if (!files[idx]) return;
    setActiveIdx(idx);
    await loadPreview(files[idx]);
  };

  const handleExport = async () => {
    if (files.length === 0) return;
    setSaving(true);
    try {
      const generated: GeneratedFileItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const bytes = await addPageNumbersToPdf(f, options);
        const base = f.name.replace(/\.pdf$/i, '');
        generated.push({
          id: `num-${i}-${Date.now()}`,
          filename: `${base}-numbered.pdf`,
          subtitle: `${options.position} · start #${options.startNumber}`,
          sizeBytes: bytes.byteLength,
          data: bytes,
        });
      }
      setOutputs(generated);
      if (generated.length === 1) {
        triggerDownload(generated[0].data, generated[0].filename);
      }
    } finally {
      setSaving(false);
    }
  };

  const activeFile = files[activeIdx] || files[0] || null;
  const previewPage = thumbs[options.skipFirstPage && thumbs.length > 1 ? 1 : 0];
  const previewLabel = formatPageNumberLabel(
    options.startNumber,
    Math.max(options.startNumber, thumbs.length - (options.skipFirstPage ? 1 : 0)),
    options.format
  );

  const posClasses: Record<PageNumberPosition, string> = {
    'top-left': 'top-4 left-5',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-5',
    'bottom-left': 'bottom-4 left-5',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-5',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <input
        ref={addInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          handleFiles(Array.from(e.target.files || []));
          e.target.value = '';
        }}
      />

      <div className="lg:col-span-8 space-y-4">
        {files.length === 0 ? (
          <WorkspaceDropzone
            multiple
            title="Drop one or more PDFs to stamp customizable page numbers"
            subtitle="Pick placement on the page grid, choose numbering format, skip cover page, and stamp single or batch PDFs."
            selectLabel="Select PDF Files"
            onFilesSelected={handleFiles}
            loading={loading}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Live placement preview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {activeFile?.name} · {thumbs.length} pages
                  {files.length > 1 ? ` · Batch of ${files.length} PDFs` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FilePlus2 className="w-3.5 h-3.5" /> Add PDFs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setThumbs([]);
                    setOutputs([]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500 whitespace-nowrap"
                >
                  Clear all
                </button>
              </div>
            </div>

            {files.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {files.map((f, idx) => (
                  <button
                    key={`${f.name}-${idx}`}
                    type="button"
                    onClick={() => handleSelectPreview(idx)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition ${
                      idx === activeIdx
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-medium'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="max-w-[140px] truncate">{f.name}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = files.filter((_, i) => i !== idx);
                        setFiles(next);
                        setOutputs([]);
                        if (next.length === 0) {
                          setThumbs([]);
                        } else if (idx === activeIdx) {
                          setActiveIdx(0);
                          loadPreview(next[0]);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-500 ml-0.5"
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            )}

            {previewPage && (
              <div className="flex justify-center py-2">
                <div className="relative inline-block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shadow-sm max-w-md w-full">
                  <img
                    src={previewPage.dataUrl}
                    alt="Numbering Preview"
                    className="w-full h-auto block"
                  />
                  <span
                    style={{
                      color: options.colorHex,
                      fontSize: `${Math.max(10, options.fontSize)}px`,
                    }}
                    className={`absolute font-bold pointer-events-none px-2 py-0.5 rounded bg-white/80 ${posClasses[options.position]}`}
                  >
                    {previewLabel}
                  </span>
                </div>
              </div>
            )}

            {outputs.length > 0 && (
              <MultiOutputDownloadPanel
                title={
                  outputs.length === 1
                    ? 'Numbered PDF ready'
                    : `${outputs.length} Numbered PDFs ready`
                }
                zipFilename="numbered-pdfs.zip"
                items={outputs}
                onClear={() => setOutputs([])}
              />
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Hash className="w-4 h-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Page number settings
            </h4>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Position on page
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'top-left', label: 'Top Left' },
                  { id: 'top-center', label: 'Top Mid' },
                  { id: 'top-right', label: 'Top Right' },
                  { id: 'bottom-left', label: 'Bot Left' },
                  { id: 'bottom-center', label: 'Bot Mid' },
                  { id: 'bottom-right', label: 'Bot Right' },
                ] as { id: PageNumberPosition; label: string }[]
              ).map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => setOptions({ ...options, position: pos.id })}
                  className={`py-2 px-1.5 rounded-lg border text-[11px] font-medium transition whitespace-nowrap ${
                    options.position === pos.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Format template
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'number', label: '1' },
                  { id: 'page-n', label: 'Page 1' },
                  { id: 'page-n-of-total', label: 'Page 1 of N' },
                  { id: 'n-slash-total', label: '1 / N' },
                ] as { id: PageNumberFormat; label: string }[]
              ).map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setOptions({ ...options, format: fmt.id })}
                  className={`py-2 px-2 rounded-lg border text-xs font-mono transition ${
                    options.format === fmt.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Start number
              </label>
              <input
                type="number"
                min={1}
                value={options.startNumber}
                onChange={(e) =>
                  setOptions({ ...options, startNumber: Math.max(1, Number(e.target.value) || 1) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Text color
              </label>
              <input
                type="color"
                value={options.colorHex}
                onChange={(e) => setOptions({ ...options, colorHex: e.target.value })}
                className="w-full h-[38px] rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer bg-transparent"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={options.skipFirstPage}
              onChange={(e) =>
                setOptions({ ...options, skipFirstPage: e.target.checked })
              }
              className="rounded accent-indigo-600"
            />
            Skip cover page (Page 1)
          </label>

          <button
            type="button"
            onClick={handleExport}
            disabled={files.length === 0 || saving}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            {saving
              ? 'Stamping Numbers...'
              : files.length > 1
                ? `Stamp All (${files.length} PDFs)`
                : 'Add Page Numbers & Download'}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={files.length > 0}
        summary={files.length > 1 ? `${files.length} PDFs · ${previewLabel}` : previewLabel}
        detail={options.position}
        actionLabel={saving ? 'Stamping...' : files.length > 1 ? 'Stamp All' : 'Download PDF'}
        busy={saving}
        onAction={handleExport}
        onReset={() => {
          setFiles([]);
          setThumbs([]);
          setOutputs([]);
        }}
      />
    </div>
  );
};

/* ============================================================================
   24. ADD WATERMARK WORKSPACE (Text or Image)
============================================================================ */
export const AddWatermarkWorkspace: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [thumbs, setThumbs] = useState<PageThumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [outputs, setOutputs] = useState<GeneratedFileItem[]>([]);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const [options, setOptions] = useState<WatermarkOptions>({
    type: 'text',
    text: 'CONFIDENTIAL',
    fontSize: 48,
    colorHex: '#0A84FF',
    opacity: 0.25,
    angle: -35,
    placement: 'center',
    imageScale: 0.4,
  });

  const loadPreview = async (target: File) => {
    setLoading(true);
    try {
      setThumbs(await renderPdfThumbnails(target, 0.55));
    } finally {
      setLoading(false);
    }
  };

  const handleFiles = async (incoming: File[]) => {
    if (incoming.length === 0) return;
    const next = [...files, ...incoming];
    setFiles(next);
    setOutputs([]);
    if (files.length === 0) {
      setActiveIdx(0);
      await loadPreview(incoming[0]);
    }
  };

  const handleWatermarkImage = (fileList: FileList | null) => {
    const imgFile = fileList?.[0];
    if (!imgFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      setOptions((prev) => ({
        ...prev,
        type: 'image',
        imageDataUrl: reader.result as string,
      }));
    };
    reader.readAsDataURL(imgFile);
  };

  const handleApply = async () => {
    if (files.length === 0) return;
    setSaving(true);
    try {
      const generated: GeneratedFileItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const bytes = await addWatermarkToPdf(f, options);
        const base = f.name.replace(/\.pdf$/i, '');
        generated.push({
          id: `wm-${i}-${Date.now()}`,
          filename: `${base}-watermarked.pdf`,
          subtitle:
            options.type === 'text'
              ? `"${options.text || 'CONFIDENTIAL'}" · ${Math.round(options.opacity * 100)}%`
              : `Image watermark · ${Math.round(options.opacity * 100)}%`,
          sizeBytes: bytes.byteLength,
          data: bytes,
        });
      }
      setOutputs(generated);
      if (generated.length === 1) {
        triggerDownload(generated[0].data, generated[0].filename);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <input
        ref={addInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          handleFiles(Array.from(e.target.files || []));
          e.target.value = '';
        }}
      />

      <div className="lg:col-span-8 space-y-4">
        {files.length === 0 ? (
          <WorkspaceDropzone
            multiple
            title="Drop one or more PDFs to stamp a text or image watermark"
            subtitle="Customize text, logo image, opacity, rotation angle, and stamp single or multiple PDFs at once."
            selectLabel="Select PDF Files"
            onFilesSelected={handleFiles}
            loading={loading}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Live watermark preview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  Applied across all {thumbs.length} page(s)
                  {files.length > 1 ? ` · Batch of ${files.length} PDFs` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FilePlus2 className="w-3.5 h-3.5" /> Add PDFs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setThumbs([]);
                    setOutputs([]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500 whitespace-nowrap"
                >
                  Clear all
                </button>
              </div>
            </div>

            {files.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {files.map((f, idx) => (
                  <button
                    key={`${f.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      setActiveIdx(idx);
                      loadPreview(f);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition ${
                      idx === activeIdx
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-medium'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="max-w-[140px] truncate">{f.name}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = files.filter((_, i) => i !== idx);
                        setFiles(next);
                        setOutputs([]);
                        if (next.length === 0) {
                          setThumbs([]);
                        } else if (idx === activeIdx) {
                          setActiveIdx(0);
                          loadPreview(next[0]);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-500 ml-0.5"
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            )}

            {thumbs[0] && (
              <div className="flex justify-center py-2">
                <div className="relative inline-block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white max-w-md w-full select-none">
                  <img
                    src={thumbs[0].dataUrl}
                    alt="Watermark preview"
                    className="w-full h-auto block"
                  />
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                    {options.type === 'text' ? (
                      options.placement === 'tiled' ? (
                        <div className="grid grid-cols-2 gap-12">
                          {[0, 1, 2, 3].map((i) => (
                            <span
                              key={i}
                              style={{
                                color: options.colorHex,
                                opacity: options.opacity,
                                fontSize: `${Math.round(options.fontSize * 0.48)}px`,
                                transform: `rotate(${-options.angle}deg)`,
                              }}
                              className="font-display font-bold whitespace-nowrap"
                            >
                              {options.text || 'CONFIDENTIAL'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span
                          style={{
                            color: options.colorHex,
                            opacity: options.opacity,
                            fontSize: `${Math.round(options.fontSize * 0.65)}px`,
                            transform: `rotate(${-options.angle}deg)`,
                          }}
                          className="font-display font-bold whitespace-nowrap"
                        >
                          {options.text || 'CONFIDENTIAL'}
                        </span>
                      )
                    ) : options.imageDataUrl ? (
                      <img
                        src={options.imageDataUrl}
                        alt="Watermark graphic"
                        style={{
                          width: `${Math.round(options.imageScale * 100)}%`,
                          opacity: options.opacity,
                          transform: `rotate(${-options.angle}deg)`,
                        }}
                      />
                    ) : (
                      <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-900/75 text-white">
                        Upload a logo image in the right panel
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {outputs.length > 0 && (
              <MultiOutputDownloadPanel
                title={
                  outputs.length === 1
                    ? 'Watermarked PDF ready'
                    : `${outputs.length} Watermarked PDFs ready`
                }
                zipFilename="watermarked-pdfs.zip"
                items={outputs}
                onClear={() => setOutputs([])}
              />
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Stamp className="w-4 h-4 text-violet-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Watermark settings
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOptions({ ...options, type: 'text' })}
              className={`py-2 px-3 rounded-xl border text-xs font-medium ${
                options.type === 'text'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              Text stamp
            </button>
            <button
              type="button"
              onClick={() => setOptions({ ...options, type: 'image' })}
              className={`py-2 px-3 rounded-xl border text-xs font-medium ${
                options.type === 'image'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              Image logo
            </button>
          </div>

          {options.type === 'text' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Watermark text
                </label>
                <input
                  type="text"
                  value={options.text}
                  onChange={(e) => setOptions({ ...options, text: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={options.colorHex}
                    onChange={(e) => setOptions({ ...options, colorHex: e.target.value })}
                    className="w-full h-[38px] rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Layout
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {(['center', 'tiled'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setOptions({ ...options, placement: p })}
                        className={`py-2 rounded-lg border text-[11px] font-medium capitalize ${
                          options.placement === p
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div>
              <input
                ref={imgInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => handleWatermarkImage(e.target.files)}
              />
              <button
                type="button"
                onClick={() => imgInputRef.current?.click()}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2"
              >
                <ImagePlus className="w-4 h-4 text-indigo-500" />
                {options.imageDataUrl ? 'Replace logo image' : 'Upload PNG / JPG logo'}
              </button>
            </div>
          )}

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 dark:text-slate-400">Opacity</span>
              <span className="font-mono tabular-nums">{Math.round(options.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={options.opacity}
              onChange={(e) => setOptions({ ...options, opacity: Number(e.target.value) })}
              className="w-full accent-indigo-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 dark:text-slate-400">Rotation angle</span>
              <span className="font-mono tabular-nums">{options.angle}°</span>
            </div>
            <input
              type="range"
              min={-90}
              max={90}
              step={5}
              value={options.angle}
              onChange={(e) => setOptions({ ...options, angle: Number(e.target.value) })}
              className="w-full accent-indigo-600"
            />
          </div>

          <button
            type="button"
            onClick={handleApply}
            disabled={files.length === 0 || saving || (options.type === 'image' && !options.imageDataUrl)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            {saving
              ? 'Applying Watermark...'
              : files.length > 1
                ? `Watermark All (${files.length} PDFs)`
                : 'Stamp Watermark & Download'}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={files.length > 0}
        summary={
          files.length > 1
            ? `${files.length} PDFs · ${options.type === 'text' ? options.text || 'Text' : 'Logo'}`
            : options.type === 'text'
              ? options.text || 'Text'
              : 'Image stamp'
        }
        detail={`${Math.round(options.opacity * 100)}% opacity · ${options.angle}°`}
        actionLabel={saving ? 'Stamping...' : files.length > 1 ? 'Stamp All' : 'Download PDF'}
        disabled={options.type === 'image' && !options.imageDataUrl}
        busy={saving}
        onAction={handleApply}
        onReset={() => {
          setFiles([]);
          setThumbs([]);
          setOutputs([]);
        }}
      />
    </div>
  );
};

/* ============================================================================
   25. CROP PDF WORKSPACE
============================================================================ */
export const CropPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<PageThumbnail[]>([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [margins, setMargins] = useState<CropMarginsPct>({
    top: 8,
    right: 6,
    bottom: 8,
    left: 6,
  });
  const [scope, setScope] = useState<'all' | 'single'>('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    try {
      setFile(selected);
      setThumbs(await renderPdfThumbnails(selected, 0.6));
      setPageIdx(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCrop = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const bytes = await cropPdfPages(file, margins, scope, pageIdx + 1);
      const base = file.name.replace(/\.pdf$/i, '');
      triggerDownload(bytes, `${base}-cropped.pdf`);
    } finally {
      setSaving(false);
    }
  };

  const currentThumb = thumbs[pageIdx];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to trim margins or crop visually"
            subtitle="Adjust top, bottom, left, and right crop bounds with a live crop-box preview."
            onFilesSelected={handleFiles}
            loading={loading}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pageIdx === 0}
                  onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  Page {pageIdx + 1} / {thumbs.length}
                </span>
                <button
                  type="button"
                  disabled={pageIdx >= thumbs.length - 1}
                  onClick={() => setPageIdx((i) => Math.min(thumbs.length - 1, i + 1))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setThumbs([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Change file
              </button>
            </div>

            {currentThumb && (
              <div className="flex justify-center py-2">
                <div className="relative inline-block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white max-w-md w-full">
                  <img
                    src={currentThumb.dataUrl}
                    alt={`Crop preview page ${pageIdx + 1}`}
                    className="w-full h-auto block"
                  />
                  {/* Shaded trimmed margins */}
                  <div
                    style={{ height: `${margins.top}%` }}
                    className="absolute top-0 inset-x-0 bg-slate-950/55 pointer-events-none"
                  />
                  <div
                    style={{ height: `${margins.bottom}%` }}
                    className="absolute bottom-0 inset-x-0 bg-slate-950/55 pointer-events-none"
                  />
                  <div
                    style={{
                      top: `${margins.top}%`,
                      bottom: `${margins.bottom}%`,
                      width: `${margins.left}%`,
                    }}
                    className="absolute left-0 bg-slate-950/55 pointer-events-none"
                  />
                  <div
                    style={{
                      top: `${margins.top}%`,
                      bottom: `${margins.bottom}%`,
                      width: `${margins.right}%`,
                    }}
                    className="absolute right-0 bg-slate-950/55 pointer-events-none"
                  />
                  {/* Active crop frame */}
                  <div
                    style={{
                      top: `${margins.top}%`,
                      right: `${margins.right}%`,
                      bottom: `${margins.bottom}%`,
                      left: `${margins.left}%`,
                    }}
                    className="absolute border-2 border-indigo-500 pointer-events-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Crop className="w-4 h-4 text-teal-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Crop margins
            </h4>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Trim Margins', val: { top: 8, right: 6, bottom: 8, left: 6 } },
              { label: 'No Header/Footer', val: { top: 14, right: 0, bottom: 12, left: 0 } },
              { label: 'Reset 0%', val: { top: 0, right: 0, bottom: 0, left: 0 } },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setMargins(p.val)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-500"
              >
                {p.label}
              </button>
            ))}
          </div>

          {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
            <div key={side}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize text-slate-500 dark:text-slate-400">
                  {side} trim
                </span>
                <span className="font-mono tabular-nums">{margins[side]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={35}
                value={margins[side]}
                onChange={(e) =>
                  setMargins({ ...margins, [side]: Number(e.target.value) })
                }
                className="w-full accent-indigo-600"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`py-2 px-3 rounded-xl border text-xs font-medium ${
                scope === 'all'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              All pages
            </button>
            <button
              type="button"
              onClick={() => setScope('single')}
              className={`py-2 px-3 rounded-xl border text-xs font-medium ${
                scope === 'single'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              Page {pageIdx + 1} only
            </button>
          </div>

          <button
            type="button"
            onClick={handleCrop}
            disabled={!file || saving}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            {saving ? 'Cropping...' : 'Crop & Download PDF'}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={`T:${margins.top}% R:${margins.right}% B:${margins.bottom}% L:${margins.left}%`}
        detail={scope === 'all' ? 'All pages' : `Page ${pageIdx + 1}`}
        actionLabel={saving ? 'Cropping...' : 'Crop PDF'}
        busy={saving}
        onAction={handleCrop}
        onReset={() => setMargins({ top: 0, right: 0, bottom: 0, left: 0 })}
      />
    </div>
  );
};

/* ============================================================================
   26. EDIT PDF WORKSPACE (Text, Shapes, Highlights, Freehand & Images)
============================================================================ */
type EditToolMode = 'text' | 'highlight' | 'rect' | 'circle' | 'freehand' | 'image';

export const EditPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<PageThumbnail[]>([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [mode, setMode] = useState<EditToolMode>('text');
  const [color, setColor] = useState('#4F46E5');
  const [textDraft, setTextDraft] = useState('Approved — Reviewed');
  const [fontSize, setFontSize] = useState(16);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [overlays, setOverlays] = useState<PdfEditOverlay[]>([]);
  const [draftBox, setDraftBox] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null
  );
  const [draftPath, setDraftPath] = useState<{ x: number; y: number }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const startPtRef = useRef<{ x: number; y: number } | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    try {
      setFile(selected);
      setThumbs(await renderPdfThumbnails(selected, 0.7));
      setPageIdx(0);
      setOverlays([]);
    } finally {
      setLoading(false);
    }
  };

  const getNormCoords = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stageRef.current || mode === 'image') return;
    const pt = getNormCoords(e);
    if (mode === 'text') {
      setOverlays((prev) => [
        ...prev,
        {
          id: `ov-${Date.now()}`,
          pageNumber: pageIdx + 1,
          type: 'text',
          x: pt.x,
          y: pt.y,
          text: textDraft || 'Text Note',
          fontSize,
          color,
        },
      ]);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    startPtRef.current = pt;
    if (mode === 'freehand') {
      setDraftPath([pt]);
    } else {
      setDraftBox({ x: pt.x, y: pt.y, w: 0, h: 0 });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startPtRef.current) return;
    const pt = getNormCoords(e);
    if (mode === 'freehand') {
      setDraftPath((prev) => (prev ? [...prev, pt] : [pt]));
    } else {
      const sx = startPtRef.current.x;
      const sy = startPtRef.current.y;
      setDraftBox({
        x: Math.min(sx, pt.x),
        y: Math.min(sy, pt.y),
        w: Math.abs(pt.x - sx),
        h: Math.abs(pt.y - sy),
      });
    }
  };

  const handlePointerUp = () => {
    if (!startPtRef.current) return;
    if (mode === 'freehand' && draftPath && draftPath.length > 1) {
      setOverlays((prev) => [
        ...prev,
        {
          id: `ov-${Date.now()}`,
          pageNumber: pageIdx + 1,
          type: 'freehand',
          x: draftPath[0].x,
          y: draftPath[0].y,
          color,
          strokeWidth,
          points: draftPath,
        },
      ]);
    } else if (draftBox && draftBox.w > 0.01 && draftBox.h > 0.01) {
      setOverlays((prev) => [
        ...prev,
        {
          id: `ov-${Date.now()}`,
          pageNumber: pageIdx + 1,
          type: mode === 'highlight' ? 'highlight' : mode === 'circle' ? 'circle' : 'rect',
          x: draftBox.x,
          y: draftBox.y,
          w: draftBox.w,
          h: draftBox.h,
          color: mode === 'highlight' ? '#FACC15' : color,
          strokeWidth,
        },
      ]);
    }
    startPtRef.current = null;
    setDraftBox(null);
    setDraftPath(null);
  };

  const handleInsertImage = (files: FileList | null) => {
    const imgFile = files?.[0];
    if (!imgFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      setOverlays((prev) => [
        ...prev,
        {
          id: `ov-${Date.now()}`,
          pageNumber: pageIdx + 1,
          type: 'image',
          x: 0.25,
          y: 0.25,
          w: 0.35,
          h: 0.22,
          color: '#000000',
          imageDataUrl: reader.result as string,
        },
      ]);
    };
    reader.readAsDataURL(imgFile);
  };

  const handleSaveEdits = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const bytes = await applyPdfEdits(file, overlays);
      const base = file.name.replace(/\.pdf$/i, '');
      triggerDownload(bytes, `${base}-edited.pdf`);
    } finally {
      setSaving(false);
    }
  };

  const pageOverlays = overlays.filter((o) => o.pageNumber === pageIdx + 1);
  const currentThumb = thumbs[pageIdx];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to annotate with text, shapes, highlights & ink"
            subtitle="Click or drag directly on any PDF page to place annotations, then save into a clean PDF."
            onFilesSelected={handleFiles}
            loading={loading}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pageIdx === 0}
                  onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono tabular-nums">
                  Page {pageIdx + 1} / {thumbs.length}
                </span>
                <button
                  type="button"
                  disabled={pageIdx >= thumbs.length - 1}
                  onClick={() => setPageIdx((i) => Math.min(thumbs.length - 1, i + 1))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={overlays.length === 0}
                  onClick={() => setOverlays((prev) => prev.slice(0, -1))}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs flex items-center gap-1 disabled:opacity-40"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Undo
                </button>
                <button
                  type="button"
                  disabled={pageOverlays.length === 0}
                  onClick={() =>
                    setOverlays((prev) => prev.filter((o) => o.pageNumber !== pageIdx + 1))
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500 flex items-center gap-1 disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear page
                </button>
              </div>
            </div>

            {currentThumb && (
              <div className="flex justify-center">
                <div
                  ref={stageRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative inline-block w-full max-w-lg rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white select-none touch-none cursor-crosshair"
                >
                  <img
                    src={currentThumb.dataUrl}
                    alt={`Editable page ${pageIdx + 1}`}
                    className="w-full h-auto block pointer-events-none"
                  />

                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    {pageOverlays.map((ov) => {
                      if (ov.type === 'highlight' && ov.w && ov.h) {
                        return (
                          <rect
                            key={ov.id}
                            x={ov.x * 100}
                            y={ov.y * 100}
                            width={ov.w * 100}
                            height={ov.h * 100}
                            fill={ov.color}
                            fillOpacity={0.35}
                          />
                        );
                      }
                      if (ov.type === 'rect' && ov.w && ov.h) {
                        return (
                          <rect
                            key={ov.id}
                            x={ov.x * 100}
                            y={ov.y * 100}
                            width={ov.w * 100}
                            height={ov.h * 100}
                            fill="none"
                            stroke={ov.color}
                            strokeWidth={0.5}
                          />
                        );
                      }
                      if (ov.type === 'circle' && ov.w && ov.h) {
                        return (
                          <ellipse
                            key={ov.id}
                            cx={(ov.x + ov.w / 2) * 100}
                            cy={(ov.y + ov.h / 2) * 100}
                            rx={(ov.w / 2) * 100}
                            ry={(ov.h / 2) * 100}
                            fill="none"
                            stroke={ov.color}
                            strokeWidth={0.5}
                          />
                        );
                      }
                      if (ov.type === 'freehand' && ov.points) {
                        return (
                          <polyline
                            key={ov.id}
                            fill="none"
                            stroke={ov.color}
                            strokeWidth={0.55}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={ov.points.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
                          />
                        );
                      }
                      return null;
                    })}

                    {draftBox && (
                      <rect
                        x={draftBox.x * 100}
                        y={draftBox.y * 100}
                        width={draftBox.w * 100}
                        height={draftBox.h * 100}
                        fill={mode === 'highlight' ? '#FACC15' : 'none'}
                        fillOpacity={mode === 'highlight' ? 0.35 : 0}
                        stroke={color}
                        strokeWidth={0.45}
                        strokeDasharray="1.5 1"
                      />
                    )}
                    {draftPath && (
                      <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth={0.55}
                        points={draftPath.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
                      />
                    )}
                  </svg>

                  {pageOverlays
                    .filter((o) => o.type === 'text')
                    .map((ov) => (
                      <span
                        key={ov.id}
                        style={{
                          left: `${ov.x * 100}%`,
                          top: `${ov.y * 100}%`,
                          color: ov.color,
                          fontSize: `${Math.max(10, (ov.fontSize || 16) * 0.8)}px`,
                        }}
                        className="absolute font-bold pointer-events-none whitespace-nowrap"
                      >
                        {ov.text}
                      </span>
                    ))}

                  {pageOverlays
                    .filter((o) => o.type === 'image' && o.imageDataUrl)
                    .map((ov) => (
                      <img
                        key={ov.id}
                        src={ov.imageDataUrl}
                        alt="Placed graphic"
                        style={{
                          left: `${ov.x * 100}%`,
                          top: `${ov.y * 100}%`,
                          width: `${(ov.w || 0.3) * 100}%`,
                          height: `${(ov.h || 0.2) * 100}%`,
                        }}
                        className="absolute object-contain pointer-events-none"
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <PenLine className="w-4 h-4 text-fuchsia-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Annotation toolbar
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'text', label: 'Text', icon: Type },
                { id: 'freehand', label: 'Draw', icon: PenLine },
                { id: 'highlight', label: 'Highlight', icon: Highlighter },
                { id: 'rect', label: 'Box', icon: Square },
                { id: 'circle', label: 'Circle', icon: Circle },
                { id: 'image', label: 'Image', icon: ImagePlus },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMode(item.id);
                    if (item.id === 'image') imgInputRef.current?.click();
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition ${
                    mode === item.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <input
            ref={imgInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              handleInsertImage(e.target.files);
              e.target.value = '';
            }}
          />

          {mode === 'text' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Text to place on click
                </label>
                <input
                  type="text"
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Font size</span>
                  <span className="font-mono tabular-nums">{fontSize} pt</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={36}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Ink color
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-[38px] rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Stroke ({strokeWidth}px)
              </label>
              <input
                type="range"
                min={1}
                max={8}
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-full accent-indigo-600 mt-2.5"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveEdits}
            disabled={!file || saving}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            {saving ? 'Baking Annotations...' : `Save Edited PDF (${overlays.length})`}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={`${overlays.length} annotation${overlays.length === 1 ? '' : 's'}`}
        detail={`Tool: ${mode}`}
        actionLabel={saving ? 'Saving...' : 'Save Edited PDF'}
        busy={saving}
        onAction={handleSaveEdits}
        onReset={() => setOverlays([])}
      />
    </div>
  );
};
