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
} from 'lucide-react';
import {
  LoadedPdfFile,
  PageThumbnail,
  CompressionPreset,
  ScanFilter,
  inspectPdfFile,
  renderPdfThumbnails,
  mergePdfFiles,
  extractPagesToSinglePdf,
  splitPagesToZip,
  buildOrganizedPdf,
  applyDocumentFilter,
  compileScansToPdf,
  compressPdfLocally,
  parsePageRanges,
  formatBytes,
  triggerDownload,
} from '../utils/pdfEngine';
import { WorkspaceDropzone, FloatingActionBar } from './WorkspaceShared';

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
   2. SPLIT PDF WORKSPACE
============================================================================ */
export const SplitPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [splitMode, setSplitMode] = useState<'range' | 'burst-zip'>('range');
  const [rangeInput, setRangeInput] = useState('1-3, 5');

  const handleFileLoad = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    try {
      setFile(selected);
      const thumbs = await renderPdfThumbnails(selected, 0.45);
      setThumbnails(thumbs);
      setRangeInput(`1-${Math.min(3, thumbs.length)}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedPages =
    splitMode === 'burst-zip'
      ? thumbnails.map((t) => t.originalPageNumber)
      : parsePageRanges(rangeInput, thumbnails.length);

  const handleSplitExport = async () => {
    if (!file || selectedPages.length === 0) return;
    setProcessing(true);
    try {
      const base = file.name.replace(/\.pdf$/i, '');
      if (splitMode === 'range') {
        const bytes = await extractPagesToSinglePdf(file, selectedPages);
        triggerDownload(bytes, `${base}-split.pdf`);
      } else {
        const zipBlob = await splitPagesToZip(file, selectedPages);
        triggerDownload(zipBlob, `${base}-all-pages.zip`, 'application/zip');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to split by ranges or burst to ZIP"
            subtitle="Preview every page live with highlighted range extraction or split every page into separate PDFs."
            onFilesSelected={handleFileLoad}
            loading={loading}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {thumbnails.length} pages · {selectedPages.length} included in output
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setThumbnails([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:text-rose-500 transition"
              >
                Change file
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {thumbnails.map((thumb) => {
                const isIncluded = selectedPages.includes(thumb.originalPageNumber);
                return (
                  <div
                    key={thumb.id}
                    className={`rounded-xl p-2 border transition ${
                      isIncluded
                        ? 'border-indigo-500 bg-indigo-500/8 ring-1 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-slate-800 opacity-45'
                    }`}
                  >
                    <img
                      src={thumb.dataUrl}
                      alt={`Page ${thumb.originalPageNumber}`}
                      className="w-full aspect-[1/1.3] object-contain rounded-lg bg-white border border-slate-100 dark:border-slate-800"
                    />
                    <div className="mt-2 flex items-center justify-between px-1 text-xs">
                      <span className="font-mono font-medium tabular-nums text-slate-700 dark:text-slate-300">
                        Page {thumb.originalPageNumber}
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          isIncluded
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {isIncluded ? 'Included' : 'Skipped'}
                      </span>
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
            <Scissors className="w-4 h-4 text-violet-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Split configuration
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSplitMode('range')}
              className={`p-3 rounded-xl border text-left transition ${
                splitMode === 'range'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="text-xs font-semibold">Page ranges</div>
              <div className="text-[11px] opacity-75 mt-0.5">Save as 1 PDF</div>
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('burst-zip')}
              className={`p-3 rounded-xl border text-left transition ${
                splitMode === 'burst-zip'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="text-xs font-semibold">Split all pages</div>
              <div className="text-[11px] opacity-75 mt-0.5">Individual PDFs in ZIP</div>
            </button>
          </div>

          {splitMode === 'range' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Page ranges (e.g. 1-3, 5, 6)
              </label>
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="1-3, 5"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Selected pages</span>
              <span className="font-mono font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                {selectedPages.length} / {thumbnails.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Export format</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {splitMode === 'range' ? '.PDF' : '.ZIP Archive'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSplitExport}
            disabled={!file || selectedPages.length === 0 || processing}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Splitting PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {splitMode === 'range' ? 'Download Split PDF' : 'Download All Pages (.ZIP)'}
              </>
            )}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={`${selectedPages.length} of ${thumbnails.length} pages`}
        detail={splitMode === 'range' ? `Ranges: ${rangeInput || 'none'}` : 'Separate PDFs in ZIP'}
        actionLabel={splitMode === 'range' ? 'Download PDF' : 'Download ZIP'}
        disabled={selectedPages.length === 0}
        busy={processing}
        onAction={handleSplitExport}
        onReset={() => {
          setFile(null);
          setThumbnails([]);
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
   4. EXTRACT PAGES WORKSPACE
============================================================================ */
export const ExtractPagesWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'single-pdf' | 'zip'>('single-pdf');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleFileLoad = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    try {
      setFile(selected);
      const thumbs = await renderPdfThumbnails(selected, 0.45);
      setThumbnails(thumbs);
      setSelectedPages(thumbs.length > 0 ? [1] : []);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectPage = (pageNum: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum)
        ? prev.filter((p) => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  const handleExtract = async () => {
    if (!file || selectedPages.length === 0) return;
    setExporting(true);
    try {
      const base = file.name.replace(/\.pdf$/i, '');
      if (exportFormat === 'single-pdf') {
        const bytes = await extractPagesToSinglePdf(file, selectedPages);
        triggerDownload(bytes, `${base}-extracted.pdf`);
      } else {
        const zipBlob = await splitPagesToZip(file, selectedPages);
        triggerDownload(zipBlob, `${base}-extracted-pages.zip`, 'application/zip');
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to extract specific pages"
            subtitle="Pick individual pages from interactive thumbnails and export as a new PDF or ZIP archive."
            onFilesSelected={handleFileLoad}
            loading={loading}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Select pages to extract
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {selectedPages.length} of {thumbnails.length} selected
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPages(thumbnails.map((t) => t.originalPageNumber))
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPages(
                      thumbnails
                        .map((t) => t.originalPageNumber)
                        .filter((n) => n % 2 === 1)
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                >
                  Odd
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPages(
                      thumbnails
                        .map((t) => t.originalPageNumber)
                        .filter((n) => n % 2 === 0)
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                >
                  Even
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPages([])}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-500"
                >
                  None
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {thumbnails.map((thumb) => {
                const isSelected = selectedPages.includes(thumb.originalPageNumber);
                return (
                  <button
                    type="button"
                    key={thumb.id}
                    onClick={() => toggleSelectPage(thumb.originalPageNumber)}
                    className={`relative rounded-xl p-2 border text-left transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/8 ring-1 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-slate-800 opacity-65 hover:opacity-100'
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
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
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
            <FileOutput className="w-4 h-4 text-sky-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Extraction output
            </h4>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setExportFormat('single-pdf')}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                exportFormat === 'single-pdf'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div>
                <div className="text-xs font-semibold">Single combined PDF</div>
                <div className="text-[11px] opacity-75">All picked pages in one file</div>
              </div>
              <FileText className="w-4 h-4 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('zip')}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                exportFormat === 'zip'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div>
                <div className="text-xs font-semibold">Separate PDFs in ZIP</div>
                <div className="text-[11px] opacity-75">One PDF file per selected page</div>
              </div>
              <Archive className="w-4 h-4 shrink-0" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleExtract}
            disabled={!file || selectedPages.length === 0 || exporting}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            {exporting
              ? 'Extracting...'
              : `Extract ${selectedPages.length} Page${selectedPages.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={`${selectedPages.length} pages selected`}
        detail={exportFormat === 'single-pdf' ? 'Export as 1 PDF' : 'Export as ZIP'}
        actionLabel={exporting ? 'Extracting...' : 'Extract & Download'}
        disabled={selectedPages.length === 0}
        busy={exporting}
        onAction={handleExtract}
        onReset={() => {
          setFile(null);
          setThumbnails([]);
          setSelectedPages([]);
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
        ['Offline Compliance Audit Log', '$0.00'],
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
   7. COMPRESS PDF WORKSPACE (Extreme, Recommended, Less Presets)
============================================================================ */
export const CompressPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<LoadedPdfFile | null>(null);
  const [preset, setPreset] = useState<CompressionPreset>('recommended');
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    compressedSize: number;
    method: string;
  } | null>(null);

  const handleFileLoad = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    setResult(null);
    try {
      const info = await inspectPdfFile(selected);
      setFile(info);
    } finally {
      setLoading(false);
    }
  };

  const handleRunCompression = async () => {
    if (!file) return;
    setCompressing(true);
    setProgress({ current: 0, total: file.pageCount });
    try {
      const { bytes, method } = await compressPdfLocally(
        file.file,
        preset,
        (current, total) => setProgress({ current, total })
      );
      setResult({
        bytes,
        compressedSize: bytes.byteLength,
        method,
      });
    } finally {
      setCompressing(false);
      setProgress(null);
    }
  };

  const handleDownloadCompressed = () => {
    if (!file || !result) return;
    const base = file.name.replace(/\.pdf$/i, '');
    triggerDownload(result.bytes, `${base}-compressed-${preset}.pdf`);
  };

  const savingsPercent =
    file && result
      ? Math.round(
          ((file.size - result.compressedSize) / Math.max(1, file.size)) * 100
        )
      : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to compress locally"
            subtitle="Choose between Extreme, Recommended, and Less compression presets with live size analytics."
            onFilesSelected={handleFileLoad}
            loading={loading}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4 min-w-0">
                {file.previewUrl ? (
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className="w-12 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-16 rounded-lg bg-indigo-500/12 flex items-center justify-center text-indigo-500 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                    {file.name}
                  </h3>
                  <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                    {file.pageCount} pages · Original size: {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 shrink-0"
              >
                Change file
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {(
                [
                  {
                    id: 'extreme',
                    title: 'Extreme',
                    level: 'Smallest size',
                    desc: 'Aggressive downsampling (0.42 JPEG quality). Best for email attachments and archiving.',
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
                      setResult(null);
                    }}
                    className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                      active
                        ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {item.title}
                        </span>
                        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
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
                  <span>Compressing pages locally...</span>
                  <span>
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-150"
                    style={{
                      width: `${Math.round(
                        (progress.current / Math.max(1, progress.total)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {result && (
              <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/25 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Compression complete
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-mono tabular-nums">
                      {formatBytes(file.size)} → {formatBytes(result.compressedSize)}{' '}
                      {savingsPercent > 0
                        ? `(${savingsPercent}% smaller)`
                        : '(already tightly compacted)'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {result.method}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCompressed}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap"
                >
                  <Download className="w-4 h-4" /> Download Compressed PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Minimize2 className="w-4 h-4 text-fuchsia-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Compression summary
            </h4>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Selected preset</span>
              <span className="font-mono font-semibold capitalize text-indigo-600 dark:text-indigo-400">
                {preset}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Original size</span>
              <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {file ? formatBytes(file.size) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Compressed size</span>
              <span className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {result ? formatBytes(result.compressedSize) : '—'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={result ? handleDownloadCompressed : handleRunCompression}
            disabled={!file || compressing}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            {compressing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Compressing...
              </>
            ) : result ? (
              <>
                <Download className="w-4 h-4" />
                Download Compressed PDF
              </>
            ) : (
              <>
                <Minimize2 className="w-4 h-4" />
                Compress PDF Now
              </>
            )}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={
          result
            ? `${formatBytes(file?.size ?? 0)} → ${formatBytes(result.compressedSize)}`
            : `Preset: ${preset}`
        }
        detail={file?.name}
        actionLabel={
          compressing
            ? 'Compressing...'
            : result
              ? 'Download Compressed'
              : 'Compress Now'
        }
        busy={compressing}
        onAction={result ? handleDownloadCompressed : handleRunCompression}
        onReset={() => {
          setFile(null);
          setResult(null);
        }}
      />
    </div>
  );
};
