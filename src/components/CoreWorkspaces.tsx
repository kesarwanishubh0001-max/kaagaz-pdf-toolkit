import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Copy,
  Download,
  RefreshCw,
  Camera,
  FileText,
  Layers,
  Scissors,
  FileOutput,
  LayoutGrid,
  Minimize2,
  CheckSquare,
  Square,
  Archive,
  Sliders,
  Video,
  VideoOff,
  ImagePlus,
  FilePlus2,
  CheckCircle2,
  Plus,
  Files,
} from 'lucide-react';
import {
  LoadedPdfFile,
  PageThumbnail,
  CompressionPreset,
  ScanFilter,
  SplitRangeSpec,
  inspectPdfFile,
  renderPdfThumbnails,
  mergePdfFiles,
  extractPagesToSinglePdf,
  splitPagesToZip,
  splitPdfByRanges,
  buildFixedRanges,
  bundleOutputsToZip,
  buildOrganizedPdf,
  applyDocumentFilter,
  compileScansToPdf,
  compressPdfLocally,
  formatBytes,
  triggerDownload,
} from '../utils/pdfEngine';
import {
  WorkspaceDropzone,
  FloatingActionBar,
  MultiOutputDownloadPanel,
  GeneratedFileItem,
} from './WorkspaceShared';

/* ============================================================================
   1. MERGE PDF WORKSPACE
============================================================================ */
export const MergePdfWorkspace: React.FC = () => {
  const [files, setFiles] = useState<LoadedPdfFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [outputName, setOutputName] = useState('Prism-Merged-Document.pdf');
  const addMoreRef = useRef<HTMLInputElement>(null);

  const handleAddFiles = async (incoming: File[]) => {
    setError(null);
    setLoading(true);
    try {
      const pdfs = incoming.filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (pdfs.length === 0) {
        setError('Please select valid PDF files.');
        return;
      }
      const inspected: LoadedPdfFile[] = [];
      for (const f of pdfs) {
        inspected.push(await inspectPdfFile(f));
      }
      setFiles((prev) => [...prev, ...inspected]);
    } catch {
      setError('Could not read one of the selected PDF files.');
    } finally {
      setLoading(false);
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    const copy = [...files];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    setFiles(copy);
  };

  const handleDropSort = (targetIndex: number) => {
    if (draggedIdx === null || draggedIdx === targetIndex) return;
    const copy = [...files];
    const [dragged] = copy.splice(draggedIdx, 1);
    copy.splice(targetIndex, 0, dragged);
    setFiles(copy);
    setDraggedIdx(null);
  };

  const handleMerge = async () => {
    if (files.length === 0) return;
    setMerging(true);
    try {
      const mergedBytes = await mergePdfFiles(files.map((f) => f.file));
      const cleanName = outputName.trim() || 'Prism-Merged-Document.pdf';
      triggerDownload(
        mergedBytes,
        cleanName.toLowerCase().endsWith('.pdf') ? cleanName : `${cleanName}.pdf`
      );
    } finally {
      setMerging(false);
    }
  };

  const totalPages = files.reduce((acc, f) => acc + f.pageCount, 0);
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8 space-y-4">
        {files.length === 0 ? (
          <WorkspaceDropzone
            multiple
            title="Drop multiple PDFs to merge"
            subtitle="Combine two or more PDF documents in any order, or load two sample documents."
            sampleLabel="Load 2 sample PDFs"
            onFilesSelected={handleAddFiles}
            loading={loading}
            error={error}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Merge sequence
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {files.length} files · {totalPages} pages · Drag rows to reorder
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={addMoreRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleAddFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => addMoreRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/12 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-medium transition whitespace-nowrap"
                >
                  + Add PDFs
                </button>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs hover:text-rose-500 transition whitespace-nowrap"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {files.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggedIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropSort(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition cursor-grab active:cursor-grabbing ${
                    draggedIdx === idx
                      ? 'border-indigo-500 bg-indigo-500/10 opacity-75'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-indigo-500/12 text-indigo-600 dark:text-indigo-300 font-mono text-xs font-semibold tabular-nums flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="w-10 h-13 object-cover rounded border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-13 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </p>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {item.pageCount} pages · {formatBytes(item.size)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === files.length - 1}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((prev) => prev.filter((f) => f.id !== item.id))
                      }
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
              Merge settings
            </h4>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Output filename
            </label>
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2.5 pt-1 text-xs border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between pt-2">
              <span className="text-slate-500 dark:text-slate-400">Queued documents</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {files.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Total pages</span>
              <span className="font-mono font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                {totalPages}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Combined input size</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {formatBytes(totalSize)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMerge}
            disabled={files.length === 0 || merging}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            {merging ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Merging PDFs...
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" />
                Merge & Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={files.length > 0}
        summary={`${files.length} PDFs · ${totalPages} pages`}
        detail={outputName}
        actionLabel={merging ? 'Merging...' : 'Merge & Download'}
        busy={merging}
        onAction={handleMerge}
        onReset={() => setFiles([])}
      />
    </div>
  );
};

/* ============================================================================
   2. SPLIT PDF WORKSPACE (Multiple Custom Ranges, Fixed Ranges & Burst)
============================================================================ */
const RANGE_ACCENTS = [
  {
    ring: 'border-[#0A84FF] bg-[#0A84FF]/[0.07]',
    dot: 'bg-[#0A84FF]',
    text: 'text-[#0071E3] dark:text-[#409CFF]',
  },
  {
    ring: 'border-[#BF5AF2] bg-[#BF5AF2]/[0.07]',
    dot: 'bg-[#BF5AF2]',
    text: 'text-purple-600 dark:text-[#BF5AF2]',
  },
  {
    ring: 'border-[#30D158] bg-[#30D158]/[0.07]',
    dot: 'bg-[#30D158]',
    text: 'text-emerald-600 dark:text-[#30D158]',
  },
  {
    ring: 'border-[#FF9F0A] bg-[#FF9F0A]/[0.07]',
    dot: 'bg-[#FF9F0A]',
    text: 'text-amber-600 dark:text-[#FF9F0A]',
  },
  {
    ring: 'border-[#FF453A] bg-[#FF453A]/[0.07]',
    dot: 'bg-[#FF453A]',
    text: 'text-rose-600 dark:text-[#FF453A]',
  },
  {
    ring: 'border-[#64D2FF] bg-[#64D2FF]/[0.07]',
    dot: 'bg-[#64D2FF]',
    text: 'text-sky-600 dark:text-[#64D2FF]',
  },
];

export const SplitPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [splitMode, setSplitMode] = useState<'custom' | 'fixed' | 'burst'>('custom');
  const [previewMode, setPreviewMode] = useState<'groups' | 'pages'>('groups');
  const [ranges, setRanges] = useState<SplitRangeSpec[]>([]);
  const [fixedStep, setFixedStep] = useState<number>(3);
  const [mergeAllRanges, setMergeAllRanges] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFileItem[]>([]);

  const totalPages = thumbnails.length;

  const handleFileLoad = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    setGeneratedFiles([]);
    try {
      setFile(selected);
      const thumbs = await renderPdfThumbnails(selected, 0.45);
      setThumbnails(thumbs);
      const total = thumbs.length;
      if (total <= 1) {
        setRanges([{ id: 'r-1', label: 'Range 1', from: 1, to: 1 }]);
      } else {
        const mid = Math.ceil(total / 2);
        setRanges([
          { id: 'r-1', label: 'Range 1', from: 1, to: mid },
          { id: 'r-2', label: 'Range 2', from: Math.min(total, mid + 1), to: total },
        ]);
      }
      setFixedStep(Math.max(1, Math.min(4, Math.ceil(total / 3))));
    } finally {
      setLoading(false);
    }
  };

  const activeRanges: SplitRangeSpec[] =
    splitMode === 'custom'
      ? ranges
      : splitMode === 'fixed'
        ? buildFixedRanges(totalPages, fixedStep)
        : thumbnails.map((t) => ({
            id: `burst-${t.originalPageNumber}`,
            label: `Page ${t.originalPageNumber}`,
            from: t.originalPageNumber,
            to: t.originalPageNumber,
          }));

  const addRange = () => {
    if (totalPages === 0) return;
    const last = ranges[ranges.length - 1];
    const nextStart = last ? Math.min(totalPages, Math.max(last.from, last.to) + 1) : 1;
    const span = last ? Math.max(1, Math.abs(last.to - last.from) + 1) : 3;
    const nextEnd = Math.min(totalPages, nextStart + span - 1);
    setRanges((prev) => [
      ...prev,
      {
        id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        label: `Range ${prev.length + 1}`,
        from: nextStart,
        to: nextEnd,
      },
    ]);
    setGeneratedFiles([]);
  };

  const updateRange = (id: string, field: 'from' | 'to', raw: number) => {
    const clamped = Math.max(1, Math.min(Math.max(1, totalPages), isNaN(raw) ? 1 : raw));
    setRanges((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: clamped } : r))
    );
    setGeneratedFiles([]);
  };

  const removeRange = (id: string) => {
    setRanges((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.map((r, i) => ({ ...r, label: `Range ${i + 1}` }));
    });
    setGeneratedFiles([]);
  };

  const handleDownloadSingleRange = async (range: SplitRangeSpec, idx: number) => {
    if (!file) return;
    setProcessing(true);
    try {
      const outputs = await splitPdfByRanges(file, [range]);
      if (outputs[0]) {
        const base = file.name.replace(/\.pdf$/i, '');
        const start = Math.min(range.from, range.to);
        const end = Math.max(range.from, range.to);
        const suffix = start === end ? `p${start}` : `p${start}-${end}`;
        triggerDownload(outputs[0].bytes, `${base}-split-${idx + 1}-${suffix}.pdf`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleSplitExport = async () => {
    if (!file || activeRanges.length === 0) return;
    setProcessing(true);
    try {
      const base = file.name.replace(/\.pdf$/i, '');

      if (splitMode === 'custom' && mergeAllRanges) {
        const allPages: number[] = [];
        for (const r of activeRanges) {
          const start = Math.max(1, Math.min(totalPages, Math.min(r.from, r.to)));
          const end = Math.max(1, Math.min(totalPages, Math.max(r.from, r.to)));
          for (let p = start; p <= end; p++) allPages.push(p);
        }
        const mergedBytes = await extractPagesToSinglePdf(file, allPages);
        const item: GeneratedFileItem = {
          id: 'merged-ranges',
          filename: `${base}-merged-ranges.pdf`,
          subtitle: `${allPages.length} pages combined`,
          sizeBytes: mergedBytes.byteLength,
          data: mergedBytes,
        };
        setGeneratedFiles([item]);
        triggerDownload(mergedBytes, item.filename);
        return;
      }

      const outputs = await splitPdfByRanges(file, activeRanges);
      const items: GeneratedFileItem[] = outputs.map((o) => ({
        id: o.id,
        filename: o.filename,
        subtitle: `${o.pageRangeLabel} · ${o.pageCount} page${o.pageCount === 1 ? '' : 's'}`,
        sizeBytes: o.bytes.byteLength,
        data: o.bytes,
      }));
      setGeneratedFiles(items);

      if (items.length === 1) {
        triggerDownload(items[0].data, items[0].filename);
      } else if (items.length > 1) {
        const zipBlob = await bundleOutputsToZip(
          outputs.map((o) => ({ filename: o.filename, bytes: o.bytes }))
        );
        triggerDownload(zipBlob, `${base}-splits.zip`, 'application/zip');
      }
    } finally {
      setProcessing(false);
    }
  };

  const getThumbByPage = (pageNum: number) =>
    thumbnails.find((t) => t.originalPageNumber === pageNum);

  const getRangeIndexForPage = (pageNum: number) =>
    activeRanges.findIndex((r) => {
      const s = Math.min(r.from, r.to);
      const e = Math.max(r.from, r.to);
      return pageNum >= s && pageNum <= e;
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8 space-y-5">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to split into multiple files"
            subtitle="Create multiple page ranges (e.g. 1–4, 5–8, 9–12), split at fixed intervals, or burst every page into separate PDFs."
            sampleLabel="Load 12-page sample PDF"
            samplePageCount={12}
            onFilesSelected={handleFileLoad}
            loading={loading}
          />
        ) : (
          <>
            <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-black/[0.06] dark:border-white/[0.07]">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-[#F5F5F7] truncate">
                    {file.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                    {totalPages} pages ·{' '}
                    {splitMode === 'custom' && mergeAllRanges
                      ? '1 merged output PDF'
                      : `${activeRanges.length} separate split PDF${activeRanges.length === 1 ? '' : 's'}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.05]">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('groups')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                        previewMode === 'groups'
                          ? 'bg-white dark:bg-[#222227] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Split Groups
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('pages')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                        previewMode === 'pages'
                          ? 'bg-white dark:bg-[#222227] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      All Pages
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setThumbnails([]);
                      setRanges([]);
                      setGeneratedFiles([]);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-xs text-slate-600 dark:text-slate-300 hover:text-rose-500 transition whitespace-nowrap"
                  >
                    Change file
                  </button>
                </div>
              </div>

              {previewMode === 'groups' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeRanges.map((range, idx) => {
                    const accent = RANGE_ACCENTS[idx % RANGE_ACCENTS.length];
                    const start = Math.max(1, Math.min(totalPages, Math.min(range.from, range.to)));
                    const end = Math.max(1, Math.min(totalPages, Math.max(range.from, range.to)));
                    const pageCount = end - start + 1;
                    const firstThumb = getThumbByPage(start);
                    const lastThumb = getThumbByPage(end);

                    return (
                      <div
                        key={range.id}
                        className={`rounded-2xl p-4 border transition ${accent.ring}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${accent.dot}`} />
                            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {range.label}
                            </span>
                            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              · {start === end ? `p. ${start}` : `p. ${start}–${end}`} ({pageCount})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownloadSingleRange(range, idx)}
                            disabled={processing}
                            className="p-1.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] hover:bg-[#0A84FF] hover:text-white text-slate-600 dark:text-slate-200 transition shrink-0"
                            title={`Download ${range.label} as standalone PDF`}
                          >
                            <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                          </button>
                        </div>

                        <div className="flex items-center justify-center gap-3 py-2">
                          {firstThumb && (
                            <div className="w-24 text-center">
                              <img
                                src={firstThumb.dataUrl}
                                alt={`Page ${start}`}
                                className="w-full aspect-[1/1.3] object-contain rounded-lg bg-white border border-black/[0.08] dark:border-white/[0.1]"
                              />
                              <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500">
                                Page {start}
                              </div>
                            </div>
                          )}

                          {start !== end && (
                            <>
                              <span className="text-xs font-mono text-slate-400">
                                {pageCount > 2 ? '···' : '→'}
                              </span>
                              {lastThumb && (
                                <div className="w-24 text-center">
                                  <img
                                    src={lastThumb.dataUrl}
                                    alt={`Page ${end}`}
                                    className="w-full aspect-[1/1.3] object-contain rounded-lg bg-white border border-black/[0.08] dark:border-white/[0.1]"
                                  />
                                  <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500">
                                    Page {end}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {thumbnails.map((thumb) => {
                    const rangeIdx = getRangeIndexForPage(thumb.originalPageNumber);
                    const isIncluded = rangeIdx !== -1;
                    const accent = isIncluded
                      ? RANGE_ACCENTS[rangeIdx % RANGE_ACCENTS.length]
                      : null;

                    return (
                      <div
                        key={thumb.id}
                        className={`rounded-xl p-2 border transition ${
                          accent
                            ? accent.ring
                            : 'border-black/[0.06] dark:border-white/[0.07] opacity-40'
                        }`}
                      >
                        <img
                          src={thumb.dataUrl}
                          alt={`Page ${thumb.originalPageNumber}`}
                          className="w-full aspect-[1/1.3] object-contain rounded-lg bg-white border border-black/[0.05]"
                        />
                        <div className="mt-2 flex items-center justify-between px-1 text-xs">
                          <span className="font-mono font-medium tabular-nums text-slate-700 dark:text-slate-300">
                            Page {thumb.originalPageNumber}
                          </span>
                          <span
                            className={`text-[11px] font-mono font-medium ${
                              accent ? accent.text : 'text-slate-400'
                            }`}
                          >
                            {isIncluded ? `Split ${rangeIdx + 1}` : 'Excluded'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <MultiOutputDownloadPanel
              title="Split PDFs ready"
              zipFilename={`${file.name.replace(/\.pdf$/i, '')}-splits.zip`}
              items={generatedFiles}
              onClear={() => setGeneratedFiles([])}
            />
          </>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-black/[0.06] dark:border-white/[0.07]">
            <Scissors className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" strokeWidth={1.6} />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-[#F5F5F7]">
              Split options
            </h4>
          </div>

          {/* 3-Mode Apple Segmented Selector */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.05]">
            {(
              [
                { id: 'custom', label: 'Custom' },
                { id: 'fixed', label: 'Fixed' },
                { id: 'burst', label: 'All Pages' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSplitMode(m.id);
                  setGeneratedFiles([]);
                }}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  splitMode === m.id
                    ? 'bg-white dark:bg-[#222227] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {splitMode === 'custom' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Page ranges ({ranges.length})
                </span>
                <button
                  type="button"
                  onClick={addRange}
                  disabled={!file}
                  className="px-2.5 py-1 rounded-lg bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#409CFF] hover:opacity-85 disabled:opacity-40 text-xs font-medium flex items-center gap-1 transition whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Add Range
                </button>
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-0.5">
                {ranges.map((range, idx) => {
                  const accent = RANGE_ACCENTS[idx % RANGE_ACCENTS.length];
                  return (
                    <div
                      key={range.id}
                      className="rounded-xl p-3 bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.07] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${accent.dot}`} />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {range.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDownloadSingleRange(range, idx)}
                            disabled={!file || processing}
                            className="p-1 rounded-md text-slate-400 hover:text-[#0A84FF] transition"
                            title="Download this range only"
                          >
                            <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                          </button>
                          {ranges.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRange(range.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-500 transition"
                              title="Remove range"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">From</label>
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, totalPages)}
                            value={range.from}
                            onChange={(e) =>
                              updateRange(range.id, 'from', parseInt(e.target.value, 10))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#09090B] border border-black/[0.08] dark:border-white/[0.09] text-xs font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-[#0A84FF]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">To</label>
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, totalPages)}
                            value={range.to}
                            onChange={(e) =>
                              updateRange(range.id, 'to', parseInt(e.target.value, 10))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#09090B] border border-black/[0.08] dark:border-white/[0.09] text-xs font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-[#0A84FF]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {ranges.length > 1 && (
                <label className="flex items-center gap-2.5 pt-1 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeAllRanges}
                    onChange={(e) => {
                      setMergeAllRanges(e.target.checked);
                      setGeneratedFiles([]);
                    }}
                    className="rounded accent-[#0A84FF]"
                  />
                  <span>Merge all ranges into one PDF</span>
                </label>
              )}
            </div>
          )}

          {splitMode === 'fixed' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Split into page ranges of
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, totalPages)}
                    value={fixedStep}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setFixedStep(Math.max(1, isNaN(val) ? 1 : val));
                      setGeneratedFiles([]);
                    }}
                    className="w-24 px-3 py-2 rounded-xl bg-white dark:bg-[#09090B] border border-black/[0.08] dark:border-white/[0.09] text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-[#0A84FF]"
                  />
                  <span className="text-xs text-slate-500">pages per split PDF</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This will create{' '}
                <strong className="text-slate-900 dark:text-white tabular-nums">
                  {activeRanges.length}
                </strong>{' '}
                separate PDF file{activeRanges.length === 1 ? '' : 's'} automatically.
              </p>
            </div>
          )}

          {splitMode === 'burst' && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Splits every page into its own standalone PDF file (
              <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                {totalPages}
              </span>{' '}
              PDFs total) ready to download as a ZIP or individually.
            </p>
          )}

          <div className="space-y-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.07] text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Output files</span>
              <span className="font-mono font-semibold tabular-nums text-[#0071E3] dark:text-[#409CFF]">
                {splitMode === 'custom' && mergeAllRanges ? 1 : activeRanges.length} PDF
                {(splitMode === 'custom' && mergeAllRanges ? 1 : activeRanges.length) === 1
                  ? ''
                  : 's'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Download format</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {(splitMode === 'custom' && mergeAllRanges) || activeRanges.length <= 1
                  ? '.PDF'
                  : '.ZIP + Individual PDFs'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSplitExport}
            disabled={!file || activeRanges.length === 0 || processing}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-92 disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2 transition"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.6} />
                Splitting PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" strokeWidth={1.6} />
                {splitMode === 'custom' && mergeAllRanges
                  ? 'Split & Download Merged PDF'
                  : activeRanges.length > 1
                    ? `Split into ${activeRanges.length} PDFs`
                    : 'Download Split PDF'}
              </>
            )}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={
          splitMode === 'custom' && mergeAllRanges
            ? `${activeRanges.length} ranges → 1 PDF`
            : `${activeRanges.length} split PDF${activeRanges.length === 1 ? '' : 's'}`
        }
        detail={file?.name}
        actionLabel={
          processing
            ? 'Splitting...'
            : activeRanges.length > 1 && !(splitMode === 'custom' && mergeAllRanges)
              ? `Split (${activeRanges.length} PDFs)`
              : 'Download PDF'
        }
        disabled={activeRanges.length === 0}
        busy={processing}
        onAction={handleSplitExport}
        onReset={() => {
          setFile(null);
          setThumbnails([]);
          setRanges([]);
          setGeneratedFiles([]);
        }}
      />
    </div>
  );
};

/* ============================================================================
   3. REMOVE PAGES WORKSPACE
============================================================================ */
export const RemovePagesWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [markedForDelete, setMarkedForDelete] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileLoad = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    try {
      setFile(selected);
      const thumbs = await renderPdfThumbnails(selected, 0.45);
      setThumbnails(thumbs);
      setMarkedForDelete([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDeletePage = (pageNum: number) => {
    setMarkedForDelete((prev) =>
      prev.includes(pageNum)
        ? prev.filter((p) => p !== pageNum)
        : [...prev, pageNum]
    );
  };

  const remainingPages = thumbnails
    .map((t) => t.originalPageNumber)
    .filter((n) => !markedForDelete.includes(n));

  const handleSaveCleanedPdf = async () => {
    if (!file || remainingPages.length === 0) return;
    setSaving(true);
    try {
      const bytes = await extractPagesToSinglePdf(file, remainingPages);
      const base = file.name.replace(/\.pdf$/i, '');
      triggerDownload(bytes, `${base}-cleaned.pdf`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to visually remove pages"
            subtitle="Click any page thumbnail to mark it for removal, then save the updated PDF."
            onFilesSelected={handleFileLoad}
            loading={loading}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Click pages to delete
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {markedForDelete.length} marked for deletion · {remainingPages.length} remaining
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMarkedForDelete([])}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300"
                >
                  Clear marks
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setThumbnails([]);
                    setMarkedForDelete([]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
                >
                  Close file
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {thumbnails.map((thumb) => {
                const isDeleted = markedForDelete.includes(thumb.originalPageNumber);
                return (
                  <button
                    type="button"
                    key={thumb.id}
                    onClick={() => toggleDeletePage(thumb.originalPageNumber)}
                    className={`group relative rounded-xl p-2 border text-left transition ${
                      isDeleted
                        ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-rose-400/70'
                    }`}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={thumb.dataUrl}
                        alt={`Page ${thumb.originalPageNumber}`}
                        className={`w-full aspect-[1/1.3] object-contain bg-white transition ${
                          isDeleted ? 'opacity-30 grayscale' : ''
                        }`}
                      />
                      {isDeleted && (
                        <div className="absolute inset-0 flex items-center justify-center bg-rose-950/35">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold flex items-center gap-1 shadow">
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between px-1 text-xs">
                      <span className="font-mono font-medium tabular-nums text-slate-700 dark:text-slate-300">
                        Page {thumb.originalPageNumber}
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          isDeleted
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isDeleted ? 'Delete' : 'Keep'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Trash2 className="w-4 h-4 text-rose-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Removal summary
            </h4>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Original pages</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {thumbnails.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Marked for removal</span>
              <span className="font-mono font-semibold tabular-nums text-rose-500">
                -{markedForDelete.length}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Remaining pages
              </span>
              <span className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {remainingPages.length}
              </span>
            </div>
          </div>

          {remainingPages.length === 0 && file && (
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              Keep at least one page to save a valid PDF document.
            </p>
          )}

          <button
            type="button"
            onClick={handleSaveCleanedPdf}
            disabled={!file || remainingPages.length === 0 || saving}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            {saving ? 'Saving PDF...' : 'Save Updated PDF'}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={`${remainingPages.length} pages kept`}
        detail={`${markedForDelete.length} marked for deletion`}
        actionLabel={saving ? 'Saving...' : 'Save Updated PDF'}
        disabled={remainingPages.length === 0}
        busy={saving}
        onAction={handleSaveCleanedPdf}
        onReset={() => setMarkedForDelete([])}
      />
    </div>
  );
};

/* ============================================================================
   4. EXTRACT PAGES WORKSPACE (Multiple Extraction Sets + Separate/ZIP Export)
============================================================================ */
interface ExtractionSet {
  id: string;
  label: string;
  pages: number[];
}

export const ExtractPagesWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [sets, setSets] = useState<ExtractionSet[]>([
    { id: 'set-1', label: 'Extract 1', pages: [] },
  ]);
  const [activeSetId, setActiveSetId] = useState<string>('set-1');
  const [exportFormat, setExportFormat] = useState<'per-set' | 'single-pdf' | 'per-page'>(
    'per-set'
  );
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFileItem[]>([]);

  const handleFileLoad = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    setGeneratedFiles([]);
    try {
      setFile(selected);
      const thumbs = await renderPdfThumbnails(selected, 0.45);
      setThumbnails(thumbs);
      const initialPages = thumbs.length >= 2 ? [1, 2] : thumbs.length === 1 ? [1] : [];
      setSets([{ id: 'set-1', label: 'Extract 1', pages: initialPages }]);
      setActiveSetId('set-1');
    } finally {
      setLoading(false);
    }
  };

  const activeSet = sets.find((s) => s.id === activeSetId) || sets[0];

  const toggleSelectPage = (pageNum: number) => {
    if (!activeSet) return;
    setSets((prev) =>
      prev.map((s) => {
        if (s.id !== activeSet.id) return s;
        const exists = s.pages.includes(pageNum);
        return {
          ...s,
          pages: exists
            ? s.pages.filter((p) => p !== pageNum)
            : [...s.pages, pageNum].sort((a, b) => a - b),
        };
      })
    );
    setGeneratedFiles([]);
  };

  const addExtractionSet = () => {
    const id = `set-${Date.now()}`;
    setSets((prev) => [...prev, { id, label: `Extract ${prev.length + 1}`, pages: [] }]);
    setActiveSetId(id);
    setExportFormat('per-set');
    setGeneratedFiles([]);
  };

  const removeExtractionSet = (id: string) => {
    setSets((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((s) => s.id !== id).map((s, idx) => ({
        ...s,
        label: `Extract ${idx + 1}`,
      }));
      if (activeSetId === id && next[0]) setActiveSetId(next[0].id);
      return next;
    });
    setGeneratedFiles([]);
  };

  const nonEmptySets = sets.filter((s) => s.pages.length > 0);
  const allPickedUnique = Array.from(
    new Set(nonEmptySets.flatMap((s) => s.pages))
  ).sort((a, b) => a - b);

  const handleExtract = async () => {
    if (!file || nonEmptySets.length === 0) return;
    setExporting(true);
    try {
      const base = file.name.replace(/\.pdf$/i, '');

      if (exportFormat === 'single-pdf') {
        const pages = nonEmptySets.flatMap((s) => s.pages);
        const bytes = await extractPagesToSinglePdf(file, pages);
        const item: GeneratedFileItem = {
          id: 'extract-combined',
          filename: `${base}-extracted.pdf`,
          subtitle: `${pages.length} pages`,
          sizeBytes: bytes.byteLength,
          data: bytes,
        };
        setGeneratedFiles([item]);
        triggerDownload(bytes, item.filename);
      } else if (exportFormat === 'per-page') {
        const items: GeneratedFileItem[] = [];
        for (const pageNum of allPickedUnique) {
          const bytes = await extractPagesToSinglePdf(file, [pageNum]);
          items.push({
            id: `page-${pageNum}`,
            filename: `${base}-page-${String(pageNum).padStart(2, '0')}.pdf`,
            subtitle: `Page ${pageNum}`,
            sizeBytes: bytes.byteLength,
            data: bytes,
          });
        }
        setGeneratedFiles(items);
        if (items.length === 1) {
          triggerDownload(items[0].data, items[0].filename);
        } else {
          const zipBlob = await splitPagesToZip(file, allPickedUnique);
          triggerDownload(zipBlob, `${base}-extracted-pages.zip`, 'application/zip');
        }
      } else {
        const items: GeneratedFileItem[] = [];
        for (let i = 0; i < nonEmptySets.length; i++) {
          const set = nonEmptySets[i];
          const bytes = await extractPagesToSinglePdf(file, set.pages);
          items.push({
            id: set.id,
            filename: `${base}-extract-${i + 1}.pdf`,
            subtitle: `${set.label} · Pages ${set.pages.join(', ')}`,
            sizeBytes: bytes.byteLength,
            data: bytes,
          });
        }
        setGeneratedFiles(items);
        if (items.length === 1) {
          triggerDownload(items[0].data, items[0].filename);
        } else {
          const zipBlob = await bundleOutputsToZip(
            items.map((item) => ({
              filename: item.filename,
              bytes: item.data as Uint8Array,
            }))
          );
          triggerDownload(zipBlob, `${base}-extractions.zip`, 'application/zip');
        }
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8 space-y-5">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to extract one or multiple page sets"
            subtitle="Pick pages into separate extraction sets to download multiple standalone PDFs at once."
            samplePageCount={10}
            onFilesSelected={handleFileLoad}
            loading={loading}
          />
        ) : (
          <>
            <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-black/[0.06] dark:border-white/[0.07]">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-[#F5F5F7]">
                    Click pages for {activeSet?.label}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {activeSet?.pages.length || 0} pages in {activeSet?.label} ·{' '}
                    {nonEmptySets.length} output set{nonEmptySets.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSets((prev) =>
                        prev.map((s) =>
                          s.id === activeSet?.id
                            ? { ...s, pages: thumbnails.map((t) => t.originalPageNumber) }
                            : s
                        )
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-xs text-slate-700 dark:text-slate-300"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSets((prev) =>
                        prev.map((s) =>
                          s.id === activeSet?.id
                            ? {
                                ...s,
                                pages: thumbnails
                                  .map((t) => t.originalPageNumber)
                                  .filter((n) => n % 2 === 1),
                              }
                            : s
                        )
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-xs text-slate-700 dark:text-slate-300"
                  >
                    Odd
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSets((prev) =>
                        prev.map((s) =>
                          s.id === activeSet?.id
                            ? {
                                ...s,
                                pages: thumbnails
                                  .map((t) => t.originalPageNumber)
                                  .filter((n) => n % 2 === 0),
                              }
                            : s
                        )
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-xs text-slate-700 dark:text-slate-300"
                  >
                    Even
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSets((prev) =>
                        prev.map((s) => (s.id === activeSet?.id ? { ...s, pages: [] } : s))
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-xs text-slate-500"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {thumbnails.map((thumb) => {
                  const isInActive = activeSet?.pages.includes(thumb.originalPageNumber);
                  const assignedSets = sets
                    .map((s, idx) => (s.pages.includes(thumb.originalPageNumber) ? idx + 1 : null))
                    .filter((v): v is number => v !== null);

                  return (
                    <button
                      type="button"
                      key={thumb.id}
                      onClick={() => toggleSelectPage(thumb.originalPageNumber)}
                      className={`relative rounded-xl p-2 border text-left transition ${
                        isInActive
                          ? 'border-[#0A84FF] bg-[#0A84FF]/[0.08]'
                          : assignedSets.length > 0
                            ? 'border-purple-500/40 bg-purple-500/[0.05]'
                            : 'border-black/[0.06] dark:border-white/[0.07] opacity-65 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={thumb.dataUrl}
                        alt={`Page ${thumb.originalPageNumber}`}
                        className="w-full aspect-[1/1.3] object-contain rounded-lg bg-white"
                      />
                      <div className="mt-2 flex items-center justify-between px-1">
                        <span className="text-xs font-mono font-medium tabular-nums text-slate-700 dark:text-slate-300">
                          Page {thumb.originalPageNumber}
                        </span>
                        {isInActive ? (
                          <CheckSquare className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" strokeWidth={1.6} />
                        ) : assignedSets.length > 0 ? (
                          <span className="text-[10px] font-mono text-purple-400">
                            S{assignedSets.join(',')}
                          </span>
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" strokeWidth={1.6} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <MultiOutputDownloadPanel
              title="Extracted PDFs ready"
              zipFilename={`${file.name.replace(/\.pdf$/i, '')}-extractions.zip`}
              items={generatedFiles}
              onClear={() => setGeneratedFiles([])}
            />
          </>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-5 sticky top-20 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.07]">
            <div className="flex items-center gap-2.5">
              <FileOutput className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" strokeWidth={1.6} />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-[#F5F5F7]">
                Extraction sets
              </h4>
            </div>
            <button
              type="button"
              onClick={addExtractionSet}
              disabled={!file}
              className="px-2.5 py-1 rounded-lg bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#409CFF] disabled:opacity-40 text-xs font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />
              Add Set
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {sets.map((s, idx) => {
              const isActive = s.id === activeSet?.id;
              const accent = RANGE_ACCENTS[idx % RANGE_ACCENTS.length];
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveSetId(s.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setActiveSetId(s.id);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-2 ${
                    isActive
                      ? 'border-[#0A84FF] bg-[#0A84FF]/[0.08]'
                      : 'border-black/[0.06] dark:border-white/[0.07] hover:border-black/[0.15] dark:hover:border-white/[0.15]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${accent.dot}`} />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {s.label}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                      {s.pages.length > 0 ? `Pages: ${s.pages.join(', ')}` : 'Click pages to select'}
                    </div>
                  </div>
                  {sets.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExtractionSet(s.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500"
                      title="Remove extraction set"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.07]">
            {(
              [
                {
                  id: 'per-set',
                  title: 'Separate PDF per set',
                  desc: 'Download each extraction set as its own PDF',
                  icon: Files,
                },
                {
                  id: 'single-pdf',
                  title: 'Single combined PDF',
                  desc: 'Combine all selected pages into 1 PDF',
                  icon: FileText,
                },
                {
                  id: 'per-page',
                  title: '1 PDF per page (ZIP)',
                  desc: 'Every picked page saved individually',
                  icon: Archive,
                },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExportFormat(opt.id)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                    exportFormat === opt.id
                      ? 'border-[#0A84FF] bg-[#0A84FF]/[0.08] text-[#0071E3] dark:text-[#409CFF]'
                      : 'border-black/[0.06] dark:border-white/[0.07] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{opt.title}</div>
                    <div className="text-[11px] opacity-75">{opt.desc}</div>
                  </div>
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleExtract}
            disabled={!file || nonEmptySets.length === 0 || exporting}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-92 disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" strokeWidth={1.6} />
            {exporting
              ? 'Extracting...'
              : exportFormat === 'per-set' && nonEmptySets.length > 1
                ? `Extract ${nonEmptySets.length} Separate PDFs`
                : `Extract (${allPickedUnique.length} Page${allPickedUnique.length === 1 ? '' : 's'})`}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={`${nonEmptySets.length} set${nonEmptySets.length === 1 ? '' : 's'} · ${allPickedUnique.length} pages`}
        detail={
          exportFormat === 'per-set'
            ? '1 PDF per set'
            : exportFormat === 'single-pdf'
              ? '1 combined PDF'
              : '1 PDF per page'
        }
        actionLabel={exporting ? 'Extracting...' : 'Extract & Download'}
        disabled={nonEmptySets.length === 0}
        busy={exporting}
        onAction={handleExtract}
        onReset={() => {
          setFile(null);
          setThumbnails([]);
          setSets([{ id: 'set-1', label: 'Extract 1', pages: [] }]);
          setActiveSetId('set-1');
          setGeneratedFiles([]);
        }}
      />
    </div>
  );
};

/* ============================================================================
   5. ORGANIZE PDF WORKSPACE (Reorder, Rotate, Duplicate, Delete)
============================================================================ */
export const OrganizePdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageThumbnail[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileLoad = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    try {
      setFile(selected);
      const thumbs = await renderPdfThumbnails(selected, 0.45);
      setPages(thumbs);
    } finally {
      setLoading(false);
    }
  };

  const rotatePage = (id: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );
  };

  const duplicatePage = (index: number) => {
    const target = pages[index];
    const clone: PageThumbnail = {
      ...target,
      id: `clone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const copy = [...pages];
    copy.splice(index + 1, 0, clone);
    setPages(copy);
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDropPage = (targetIdx: number) => {
    if (dragIndex === null || dragIndex === targetIdx) return;
    const copy = [...pages];
    const [moved] = copy.splice(dragIndex, 1);
    copy.splice(targetIdx, 0, moved);
    setPages(copy);
    setDragIndex(null);
  };

  const handleExportOrganized = async () => {
    if (!file || pages.length === 0) return;
    setSaving(true);
    try {
      const bytes = await buildOrganizedPdf(file, pages);
      const base = file.name.replace(/\.pdf$/i, '');
      triggerDownload(bytes, `${base}-organized.pdf`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to visually organize pages"
            subtitle="Drag thumbnails to reorder, rotate 90°, duplicate pages, or delete unwanted pages."
            onFilesSelected={handleFileLoad}
            loading={loading}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Page organizer
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {pages.length} pages · Drag cards to reorder
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPages((prev) =>
                      prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Rotate all 90°
                </button>
                <button
                  type="button"
                  onClick={() => setPages((prev) => [...prev].reverse())}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap"
                >
                  Reverse order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPages([]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500 whitespace-nowrap"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropPage(index)}
                  className={`rounded-xl p-2.5 border transition cursor-grab active:cursor-grabbing ${
                    dragIndex === index
                      ? 'border-indigo-500 bg-indigo-500/10 opacity-60'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="relative overflow-hidden rounded-lg bg-white border border-slate-100 dark:border-slate-800 aspect-[1/1.3] flex items-center justify-center">
                    <img
                      src={page.dataUrl}
                      alt={`Page ${index + 1}`}
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                      className="max-w-full max-h-full object-contain transition-transform duration-200"
                    />
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[10px] font-semibold tabular-nums">
                      #{index + 1}
                    </span>
                    {page.rotation !== 0 && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] tabular-nums">
                        {page.rotation}°
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-mono tabular-nums text-slate-400">
                      P.{page.originalPageNumber}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => rotatePage(page.id)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-500"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicatePage(index)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-500"
                        title="Duplicate page"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePage(page.id)}
                        disabled={pages.length <= 1}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-500 disabled:opacity-30"
                        title="Delete page"
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
            <LayoutGrid className="w-4 h-4 text-emerald-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Organizer summary
            </h4>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Output pages</span>
              <span className="font-mono font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                {pages.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Rotated pages</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {pages.filter((p) => p.rotation !== 0).length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportOrganized}
            disabled={!file || pages.length === 0 || saving}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            {saving ? 'Building PDF...' : 'Export Organized PDF'}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={`${pages.length} pages ready`}
        detail={`${pages.filter((p) => p.rotation !== 0).length} rotated`}
        actionLabel={saving ? 'Building...' : 'Export PDF'}
        busy={saving}
        onAction={handleExportOrganized}
        onReset={() => {
          setFile(null);
          setPages([]);
        }}
      />
    </div>
  );
};

/* ============================================================================
   6. SCAN TO PDF WORKSPACE
============================================================================ */
interface ScannedPageItem {
  id: string;
  rawUrl: string;
  processedDataUrl: string;
  filter: ScanFilter;
  rotation: number;
}

export const ScanToPdfWorkspace: React.FC = () => {
  const [scans, setScans] = useState<ScannedPageItem[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ScanFilter>('bw-contrast');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [compiling, setCompiling] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch {
      setCameraError(
        'Camera permission was denied or no webcam was found. Upload camera photos or generate a demo invoice scan instead.'
      );
    }
  };

  const addRawImageAsScan = async (rawDataUrl: string) => {
    const processed = await applyDocumentFilter(rawDataUrl, activeFilter, 0);
    setScans((prev) => [
      ...prev,
      {
        id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        rawUrl: rawDataUrl,
        processedDataUrl: processed,
        filter: activeFilter,
        rotation: 0,
      },
    ]);
  };

  const captureWebcamFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      await addRawImageAsScan(canvas.toDataURL('image/jpeg', 0.92));
    }
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      await addRawImageAsScan(dataUrl);
    }
  };

  const generateDemoInvoiceScan = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 680;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#EFECE6';
      ctx.fillRect(0, 0, 680, 900);
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 26px monospace';
      ctx.fillText('PRISM CLOUD INFRASTRUCTURE', 95, 100);
      ctx.font = '15px monospace';
      ctx.fillText('INVOICE #INV-2026-8841  ·  PAID', 155, 140);
      ctx.fillRect(70, 175, 540, 3);
      const items = [
        ['Enterprise Edge Compute Node', '$240.00'],
        ['Zero-Knowledge Local Storage', '$125.00'],
        ['Dedicated Vector Worker Seat', '$85.00'],
        ['Local Compliance Audit Log', '$0.00'],
      ];
      items.forEach(([label, price], idx) => {
        const y = 240 + idx * 65;
        ctx.fillText(label, 80, y);
        ctx.fillText(price, 510, y);
      });
      ctx.fillRect(70, 540, 540, 2);
      ctx.font = 'bold 21px monospace';
      ctx.fillText('TOTAL AMOUNT PAID', 80, 595);
      ctx.fillText('$450.00', 495, 595);
      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = 4;
      ctx.strokeRect(210, 680, 260, 82);
      ctx.fillStyle = '#4F46E5';
      ctx.font = 'bold 23px sans-serif';
      ctx.fillText('VERIFIED ORIGINAL', 228, 730);
    }
    await addRawImageAsScan(canvas.toDataURL('image/jpeg', 0.9));
  };

  const updateScan = async (
    id: string,
    newFilter: ScanFilter,
    newRotation?: number
  ) => {
    const target = scans.find((s) => s.id === id);
    if (!target) return;
    const rot = newRotation !== undefined ? newRotation : target.rotation;
    const processed = await applyDocumentFilter(target.rawUrl, newFilter, rot);
    setScans((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, filter: newFilter, rotation: rot, processedDataUrl: processed }
          : s
      )
    );
  };

  const applyFilterToAll = async (filter: ScanFilter) => {
    setActiveFilter(filter);
    const updated: ScannedPageItem[] = [];
    for (const s of scans) {
      const processed = await applyDocumentFilter(s.rawUrl, filter, s.rotation);
      updated.push({ ...s, filter, processedDataUrl: processed });
    }
    setScans(updated);
  };

  const handleCompilePdf = async () => {
    if (scans.length === 0) return;
    setCompiling(true);
    try {
      const blob = await compileScansToPdf(scans, pageSize);
      triggerDownload(blob, 'Prism-Scanned-Document.pdf');
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8 space-y-5">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Camera capture & scan queue
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Use your webcam, upload camera photos, or generate a sample invoice scan.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
                >
                  <Video className="w-4 h-4" /> Start webcam
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
                >
                  <VideoOff className="w-4 h-4" /> Stop camera
                </button>
              )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handlePhotoUpload(e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <ImagePlus className="w-4 h-4 text-indigo-500" /> Upload photos
              </button>

              <button
                type="button"
                onClick={generateDemoInvoiceScan}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <FilePlus2 className="w-4 h-4 text-violet-500" /> Add sample scan
              </button>
            </div>
          </div>

          {cameraError && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
              {cameraError}
            </div>
          )}

          {cameraActive && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 mb-5">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[360px] object-contain mx-auto"
              />
              <div className="p-3 bg-slate-900/90 flex items-center justify-center">
                <button
                  type="button"
                  onClick={captureWebcamFrame}
                  className="px-6 py-2.5 rounded-full bg-white text-slate-900 font-semibold text-xs flex items-center gap-2 shadow hover:scale-105 transition"
                >
                  <Camera className="w-4 h-4 text-indigo-600" />
                  Capture page
                </button>
              </div>
            </div>
          )}

          {scans.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No scanned pages captured yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Start your webcam, upload photos, or click &ldquo;Add sample scan&rdquo; above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {scans.map((scan, index) => (
                <div
                  key={scan.id}
                  className="rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50"
                >
                  <div className="relative aspect-[1/1.3] rounded-lg overflow-hidden bg-white border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <img
                      src={scan.processedDataUrl}
                      alt={`Scan ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[10px] font-semibold tabular-nums">
                      Page {index + 1}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 capitalize">
                      {scan.filter}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateScan(scan.id, scan.filter, (scan.rotation + 90) % 360)
                        }
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-500"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setScans((prev) => prev.filter((s) => s.id !== scan.id))
                        }
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500"
                        title="Delete scan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Camera className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Document filter & page size
            </h4>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Enhancement filter
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'bw-contrast', label: 'B&W Contrast' },
                  { id: 'magic-doc', label: 'Magic Color' },
                  { id: 'grayscale', label: 'Grayscale' },
                  { id: 'original', label: 'Original' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyFilterToAll(preset.id)}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition ${
                    activeFilter === preset.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Output page size
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPageSize('a4')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium ${
                  pageSize === 'a4'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                ISO A4
              </button>
              <button
                type="button"
                onClick={() => setPageSize('letter')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium ${
                  pageSize === 'letter'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                US Letter
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCompilePdf}
            disabled={scans.length === 0 || compiling}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            {compiling
              ? 'Compiling PDF...'
              : `Compile ${scans.length} Scan${scans.length === 1 ? '' : 's'} to PDF`}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={scans.length > 0}
        summary={`${scans.length} scanned page${scans.length === 1 ? '' : 's'}`}
        detail={`${activeFilter} · ${pageSize.toUpperCase()}`}
        actionLabel={compiling ? 'Compiling...' : 'Compile PDF'}
        busy={compiling}
        onAction={handleCompilePdf}
        onReset={() => setScans([])}
      />
    </div>
  );
};

/* ============================================================================
   7. COMPRESS PDF WORKSPACE (Batch Multi-PDF Compression + 3 Presets)
============================================================================ */
export const CompressPdfWorkspace: React.FC = () => {
  const [files, setFiles] = useState<LoadedPdfFile[]>([]);
  const [preset, setPreset] = useState<CompressionPreset>('recommended');
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState<{
    fileIndex: number;
    fileCount: number;
    current: number;
    total: number;
  } | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFileItem[]>([]);
  const addMoreRef = useRef<HTMLInputElement>(null);

  const handleFileLoad = async (incoming: File[]) => {
    const pdfs = incoming.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (pdfs.length === 0) return;
    setLoading(true);
    setGeneratedFiles([]);
    try {
      const inspected = await Promise.all(pdfs.map((f) => inspectPdfFile(f)));
      setFiles((prev) => [...prev, ...inspected]);
    } finally {
      setLoading(false);
    }
  };

  const handleRunCompression = async () => {
    if (files.length === 0) return;
    setCompressing(true);
    setGeneratedFiles([]);
    try {
      const outputs: GeneratedFileItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        setProgress({
          fileIndex: i + 1,
          fileCount: files.length,
          current: 0,
          total: item.pageCount,
        });
        const { bytes } = await compressPdfLocally(
          item.file,
          preset,
          (current, total) =>
            setProgress({ fileIndex: i + 1, fileCount: files.length, current, total })
        );
        const savings = Math.round(
          ((item.size - bytes.byteLength) / Math.max(1, item.size)) * 100
        );
        const base = item.name.replace(/\.pdf$/i, '');
        outputs.push({
          id: item.id,
          filename: `${base}-compressed-${preset}.pdf`,
          subtitle:
            savings > 0
              ? `${formatBytes(item.size)} → ${formatBytes(bytes.byteLength)} (${savings}% smaller)`
              : `${formatBytes(item.size)} → ${formatBytes(bytes.byteLength)}`,
          sizeBytes: bytes.byteLength,
          data: bytes,
        });
      }
      setGeneratedFiles(outputs);
      if (outputs.length === 1) {
        triggerDownload(outputs[0].data, outputs[0].filename);
      }
    } finally {
      setCompressing(false);
      setProgress(null);
    }
  };

  const totalOriginalSize = files.reduce((acc, f) => acc + f.size, 0);
  const totalCompressedSize = generatedFiles.reduce((acc, g) => acc + g.sizeBytes, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8 space-y-5">
        {files.length === 0 ? (
          <WorkspaceDropzone
            multiple
            title="Drop one or multiple PDFs to compress"
            subtitle="Compress a single PDF or an entire batch with Extreme, Recommended, and Less presets."
            sampleLabel="Load 2 sample PDFs"
            onFilesSelected={handleFileLoad}
            loading={loading}
          />
        ) : (
          <>
            <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-black/[0.06] dark:border-white/[0.07]">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-[#F5F5F7]">
                    Queued PDFs ({files.length})
                  </h3>
                  <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                    Combined original size: {formatBytes(totalOriginalSize)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={addMoreRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFileLoad(Array.from(e.target.files));
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addMoreRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#409CFF] text-xs font-medium flex items-center gap-1.5"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                    Add PDFs
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFiles([]);
                      setGeneratedFiles([]);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-xs text-slate-600 dark:text-slate-300 hover:text-rose-500"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {files.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" strokeWidth={1.6} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-500">
                          {item.pageCount} pages · {formatBytes(item.size)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFiles((prev) => prev.filter((f) => f.id !== item.id));
                        setGeneratedFiles([]);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {(
                  [
                    {
                      id: 'extreme',
                      title: 'Extreme',
                      level: 'Smallest size',
                      desc: 'Aggressive downsampling (0.42 JPEG quality). Best for email and archiving.',
                    },
                    {
                      id: 'recommended',
                      title: 'Recommended',
                      level: 'Balanced',
                      desc: 'Optimal mix of sharp readability and reduced file size via object streams.',
                    },
                    {
                      id: 'less',
                      title: 'Less compression',
                      level: 'High quality',
                      desc: 'Preserves high-resolution imagery while compacting metadata and streams.',
                    },
                  ] as const
                ).map((item) => {
                  const active = preset === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPreset(item.id);
                        setGeneratedFiles([]);
                      }}
                      className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                        active
                          ? 'border-[#0A84FF] bg-[#0A84FF]/[0.08]'
                          : 'border-black/[0.06] dark:border-white/[0.07] hover:border-[#0A84FF]/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {item.title}
                          </span>
                          <span className="text-[11px] font-medium text-[#0071E3] dark:text-[#409CFF]">
                            {item.level}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    <span>
                      Compressing file {progress.fileIndex}/{progress.fileCount} (page{' '}
                      {progress.current}/{progress.total})...
                    </span>
                    <span>
                      {Math.round((progress.current / Math.max(1, progress.total)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full bg-[#0A84FF] transition-all duration-150"
                      style={{
                        width: `${Math.round(
                          (progress.current / Math.max(1, progress.total)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <MultiOutputDownloadPanel
              title="Compressed PDFs ready"
              zipFilename={`kaagaz-compressed-${preset}.zip`}
              items={generatedFiles}
              onClear={() => setGeneratedFiles([])}
            />
          </>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-black/[0.06] dark:border-white/[0.07]">
            <Minimize2 className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" strokeWidth={1.6} />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-[#F5F5F7]">
              Compression summary
            </h4>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Queued files</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                {files.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Selected preset</span>
              <span className="font-mono font-semibold capitalize text-[#0071E3] dark:text-[#409CFF]">
                {preset}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Original total</span>
              <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {files.length > 0 ? formatBytes(totalOriginalSize) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Compressed total</span>
              <span className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {generatedFiles.length > 0 ? formatBytes(totalCompressedSize) : '—'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunCompression}
            disabled={files.length === 0 || compressing}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-92 disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2 transition"
          >
            {compressing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.6} />
                Compressing...
              </>
            ) : (
              <>
                <Minimize2 className="w-4 h-4" strokeWidth={1.6} />
                {files.length > 1
                  ? `Compress ${files.length} PDFs`
                  : 'Compress PDF Now'}
              </>
            )}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={files.length > 0}
        summary={
          generatedFiles.length > 0
            ? `${formatBytes(totalOriginalSize)} → ${formatBytes(totalCompressedSize)}`
            : `${files.length} PDF${files.length === 1 ? '' : 's'} · ${preset}`
        }
        detail={files.length === 1 ? files[0].name : `${files.length} files queued`}
        actionLabel={
          compressing
            ? 'Compressing...'
            : files.length > 1
              ? `Compress ${files.length} PDFs`
              : 'Compress Now'
        }
        busy={compressing}
        onAction={handleRunCompression}
        onReset={() => {
          setFiles([]);
          setGeneratedFiles([]);
        }}
      />
    </div>
  );
};
