import React, { useState, useEffect, useRef } from 'react';
import {
  Contrast,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  Trash2,
  Moon,
  Sparkles,
  Sliders,
} from 'lucide-react';
import {
  createSamplePdfFile,
  formatBytes,
  triggerDownload,
} from '../utils/pdfEngine';
import {
  PdfInvertMode,
  invertPdfDocument,
  renderInvertedPreviewPair,
} from '../utils/advancedEngine';
import {
  WorkspaceDropzone,
  FloatingActionBar,
  MultiOutputDownloadPanel,
  GeneratedFileItem,
} from './WorkspaceShared';

const INVERT_MODES: {
  id: PdfInvertMode;
  title: string;
  desc: string;
}[] = [
  {
    id: 'smart-dark',
    title: 'Smart Dark Mode',
    desc: 'Soft charcoal background with crisp off-white text while keeping diagram & highlight colors natural.',
  },
  {
    id: 'classic-invert',
    title: 'Pure RGB Invert',
    desc: 'Exact mathematical negative (255 − RGB). Ideal for pure OLED black or converting dark slides to printable white.',
  },
  {
    id: 'grayscale-dark',
    title: 'High-Contrast Mono',
    desc: 'Clean grayscale inversion with boosted readability for textbooks, exams, and scanned notes.',
  },
];

const DPI_OPTIONS: { value: 110 | 150 | 220; label: string; hint: string }[] = [
  { value: 110, label: 'Compact (110 DPI)', hint: 'Fast & smaller file' },
  { value: 150, label: 'Balanced (150 DPI)', hint: 'Recommended' },
  { value: 220, label: 'Crisp (220 DPI)', hint: 'Fine text & diagrams' },
];

export const InvertPdfWorkspace: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<PdfInvertMode>('smart-dark');
  const [dpi, setDpi] = useState<110 | 150 | 220>(150);
  const [pageRangeText, setPageRangeText] = useState('all');

  // Live preview of first file
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageCount, setPreviewPageCount] = useState(1);
  const [previewPair, setPreviewPair] = useState<{
    originalUrl: string;
    invertedUrl: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [outputs, setOutputs] = useState<GeneratedFileItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (incoming: File[]) => {
    const pdfs = incoming.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (pdfs.length === 0) return;
    setFiles((prev) => [...prev, ...pdfs]);
    setOutputs([]);
    setErrorMsg(null);
    setPreviewPage(1);
  };

  const handleLoadSample = async () => {
    const sample = await createSamplePdfFile('KAAGAZ-Study-Notes.pdf', 3);
    setFiles([sample]);
    setOutputs([]);
    setErrorMsg(null);
    setPreviewPage(1);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setOutputs([]);
    setPreviewPage(1);
  };

  // Update live Before / After preview whenever primary file, mode, or page changes
  useEffect(() => {
    if (files.length === 0) {
      setPreviewPair(null);
      setPreviewPageCount(1);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    renderInvertedPreviewPair(files[0], mode, previewPage)
      .then((res) => {
        if (cancelled) return;
        setPreviewPair({
          originalUrl: res.originalUrl,
          invertedUrl: res.invertedUrl,
        });
        setPreviewPageCount(res.pageCount);
      })
      .catch(() => {
        if (!cancelled) setPreviewPair(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [files, mode, previewPage]);

  const handleInvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setOutputs([]);
    setErrorMsg(null);

    try {
      const results: GeneratedFileItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const current = files[i];
        const bytes = await invertPdfDocument(
          current,
          { mode, dpi, pageRangeText },
          (page, total) => {
            setProgressText(
              files.length > 1
                ? `File ${i + 1}/${files.length} · Inverting page ${page} of ${total}`
                : `Inverting page ${page} of ${total}`
            );
          }
        );

        const base = current.name.replace(/\.pdf$/i, '');
        const suffix =
          mode === 'smart-dark'
            ? 'dark'
            : mode === 'classic-invert'
              ? 'inverted'
              : 'mono-dark';
        const outName = `${base}-${suffix}.pdf`;
        results.push({
          id: `${current.name}-${i}-${Date.now()}`,
          filename: outName,
          data: bytes,
          sizeBytes: bytes.byteLength,
          subtitle: `${dpi} DPI · ${INVERT_MODES.find((m) => m.id === mode)?.title}`,
        });
      }

      setOutputs(results);
      if (results.length === 1) {
        triggerDownload(results[0].data, results[0].filename, 'application/pdf');
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to invert PDF document.'
      );
    } finally {
      setProcessing(false);
      setProgressText('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <input
        ref={addMoreInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files || []);
          if (picked.length > 0) handleFilesSelected(picked);
          e.target.value = '';
        }}
      />

      {/* LEFT / MAIN PANEL */}
      <div className="lg:col-span-8 space-y-5">
        {files.length === 0 ? (
          <WorkspaceDropzone
            accept="application/pdf,.pdf"
            multiple
            title="Drop PDF files to invert colors or apply Dark Mode"
            subtitle="Preview before & after instantly, choose Smart Dark Mode or Pure RGB Invert, and export crisp inverted PDFs locally."
            selectLabel="Select PDF Files"
            sampleLabel="Load sample PDF"
            onFilesSelected={handleFilesSelected}
            onLoadSample={handleLoadSample}
          />
        ) : (
          <>
            {/* Selected File Queue */}
            <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/[0.06] dark:border-white/[0.07]">
                <div>
                  <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {files.length === 1
                      ? files[0].name
                      : `${files.length} PDF files queued`}
                  </h3>
                  <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatBytes(files.reduce((acc, f) => acc + f.size, 0))} total
                    {previewPageCount > 0 && files.length === 1
                      ? ` · ${previewPageCount} page${previewPageCount === 1 ? '' : 's'}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addMoreInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.1] text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#0071E3] dark:hover:border-[#0A84FF] flex items-center gap-1.5 transition"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                    Add PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFiles([]);
                      setOutputs([]);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {files.length > 1 && (
                <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] rounded-xl border border-black/[0.06] dark:border-white/[0.07] max-h-44 overflow-y-auto">
                  {files.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                    >
                      <span className="truncate text-[#1D1D1F] dark:text-[#F5F5F7] font-medium">
                        {f.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono tabular-nums text-slate-500">
                          {formatBytes(f.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500"
                          aria-label={`Remove ${f.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Side-by-Side Before / After Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Live Before & After Preview ({files[0].name})
                  </div>
                  {previewPageCount > 1 && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.07]">
                      <button
                        type="button"
                        disabled={previewPage <= 1}
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        className="p-1 rounded disabled:opacity-35 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                        aria-label="Previous preview page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-mono tabular-nums px-1.5">
                        {previewPage} / {previewPageCount}
                      </span>
                      <button
                        type="button"
                        disabled={previewPage >= previewPageCount}
                        onClick={() =>
                          setPreviewPage((p) => Math.min(previewPageCount, p + 1))
                        }
                        className="p-1 rounded disabled:opacity-35 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                        aria-label="Next preview page"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {previewLoading && !previewPair ? (
                  <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#0071E3] dark:text-[#0A84FF]" />
                    <span>Rendering preview...</span>
                  </div>
                ) : previewPair ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Original
                      </div>
                      <div className="rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-white">
                        <img
                          src={previewPair.originalUrl}
                          alt="Original PDF page"
                          className="w-full h-auto block"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-between">
                        <span>
                          Inverted ({INVERT_MODES.find((m) => m.id === mode)?.title})
                        </span>
                        {previewLoading && (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        )}
                      </div>
                      <div className="rounded-xl overflow-hidden border border-black/[0.1] dark:border-white/[0.12] bg-[#0C0C0F]">
                        <img
                          src={previewPair.invertedUrl}
                          alt="Inverted PDF page preview"
                          className="w-full h-auto block"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {errorMsg && (
                <div className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </div>
              )}
            </div>

            {outputs.length > 0 && (
              <MultiOutputDownloadPanel
                title="Inverted PDFs Ready"
                items={outputs}
                zipFilename="kaagaz-inverted-pdfs.zip"
                onClear={() => setOutputs([])}
              />
            )}
          </>
        )}
      </div>

      {/* RIGHT SETTINGS SIDEBAR */}
      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-black/[0.06] dark:border-white/[0.07]">
            <Contrast className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" strokeWidth={1.6} />
            <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Inversion settings
            </h4>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5" strokeWidth={1.6} />
              Color mode
            </label>
            <div className="space-y-2">
              {INVERT_MODES.map((item) => {
                const active = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition ${
                      active
                        ? 'border-[#0071E3] dark:border-[#0A84FF] bg-[#0A84FF]/8'
                        : 'border-black/[0.07] dark:border-white/[0.08] hover:border-black/[0.16] dark:hover:border-white/[0.16]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Page Range */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" strokeWidth={1.6} />
              Pages to invert
            </label>
            <input
              type="text"
              value={pageRangeText}
              onChange={(e) => setPageRangeText(e.target.value)}
              placeholder="all (or e.g. 1-5, 8)"
              className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-black/[0.025] dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#0A84FF]"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Leave as <span className="font-mono">all</span> to invert every page, or specify ranges like <span className="font-mono">1-3, 7</span>.
            </p>
          </div>

          {/* Output DPI */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.6} />
              Output resolution
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {DPI_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDpi(opt.value)}
                  className={`px-2 py-2 rounded-xl border text-center transition ${
                    dpi === opt.value
                      ? 'border-[#0071E3] dark:border-[#0A84FF] bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF]'
                      : 'border-black/[0.07] dark:border-white/[0.08] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-semibold tabular-nums">
                    {opt.value} DPI
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={files.length === 0 || processing}
            onClick={handleInvert}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-92 disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2 transition"
          >
            {processing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {processing
              ? progressText || 'Inverting PDF...'
              : files.length > 1
                ? `Invert ${files.length} PDFs`
                : 'Invert & Download PDF'}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={files.length > 0}
        summary={
          processing
            ? progressText || 'Inverting...'
            : `${files.length} file${files.length === 1 ? '' : 's'} · ${INVERT_MODES.find((m) => m.id === mode)?.title}`
        }
        detail={files[0]?.name}
        actionLabel={processing ? 'Inverting...' : 'Invert PDF'}
        onAction={handleInvert}
        busy={processing}
      />
    </div>
  );
};
