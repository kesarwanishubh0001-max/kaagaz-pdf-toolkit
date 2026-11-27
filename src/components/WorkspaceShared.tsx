import React, { useState, useRef } from 'react';
import {
  Upload,
  RefreshCw,
  ShieldCheck,
  FilePlus2,
  RotateCcw,
  Download,
  AlertCircle,
  Archive,
  Files,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  createSamplePdfFile,
  formatBytes,
  triggerDownload,
  bundleOutputsToZip,
  downloadFilesSequentially,
} from '../utils/pdfEngine';

interface WorkspaceDropzoneProps {
  multiple?: boolean;
  accept?: string;
  title: string;
  subtitle: string;
  selectLabel?: string;
  sampleLabel?: string;
  samplePageCount?: number;
  onFilesSelected: (files: File[]) => void;
  onLoadSample?: () => Promise<void> | void;
  loading?: boolean;
  loadingText?: string;
  error?: string | null;
}

export const WorkspaceDropzone: React.FC<WorkspaceDropzoneProps> = ({
  multiple = false,
  accept = 'application/pdf,.pdf',
  title,
  subtitle,
  selectLabel,
  sampleLabel = 'Load sample PDF',
  samplePageCount = 6,
  onFilesSelected,
  onLoadSample,
  loading = false,
  loadingText = 'Processing locally...',
  error = null,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleDefaultSample = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading || sampleLoading) return;
    setSampleLoading(true);
    try {
      if (onLoadSample) {
        await onLoadSample();
      } else {
        const sample1 = await createSamplePdfFile(
          'KAAGAZ-Sample-Document.pdf',
          samplePageCount
        );
        if (multiple) {
          const sample2 = await createSamplePdfFile('KAAGAZ-Financial-Annex.pdf', 4);
          onFilesSelected([sample1, sample2]);
        } else {
          onFilesSelected([sample1]);
        }
      }
    } finally {
      setSampleLoading(false);
    }
  };

  const isBusy = loading || sampleLoading;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !isBusy && inputRef.current?.click()}
      className={`group cursor-pointer rounded-2xl border border-dashed transition-all duration-200 p-8 sm:p-14 text-center flex flex-col items-center justify-center min-h-[360px] ${
        isDragging
          ? 'border-[#0A84FF] bg-[#0A84FF]/[0.06] scale-[0.996]'
          : 'border-black/[0.12] dark:border-white/[0.11] hover:border-[#0A84FF]/60 bg-white dark:bg-[#121215]'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {isBusy ? (
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF] ring-1 ring-inset ring-[#0A84FF]/20 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin" strokeWidth={1.6} />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {loadingText}
          </p>
        </div>
      ) : (
        <>
          <div className="w-13 h-13 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-200">
            <Upload className="w-5 h-5" strokeWidth={1.6} />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-[#F5F5F7] mb-1.5 text-balance">
            {title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-7 leading-relaxed">
            {subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="px-5 py-2.5 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] text-white text-sm font-medium hover:opacity-92 transition whitespace-nowrap">
              {selectLabel || (multiple ? 'Select PDF files' : 'Select PDF file')}
            </span>
            <button
              type="button"
              onClick={handleDefaultSample}
              className="px-4 py-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.11] text-slate-800 dark:text-slate-200 ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] text-sm font-medium flex items-center gap-2 transition whitespace-nowrap"
            >
              <FilePlus2 className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" strokeWidth={1.6} />
              {sampleLabel}
            </button>
          </div>

          {error && (
            <div className="mt-5 max-w-md flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.6} />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-7 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.6} />
            <span>Processed privately in browser memory · Zero uploads</span>
          </div>
        </>
      )}
    </div>
  );
};

interface FloatingActionBarProps {
  visible: boolean;
  summary: string;
  detail?: string;
  actionLabel: string;
  disabled?: boolean;
  busy?: boolean;
  onAction: () => void;
  onReset?: () => void;
}

export const FloatingActionBar: React.FC<FloatingActionBarProps> = ({
  visible,
  summary,
  detail,
  actionLabel,
  disabled = false,
  busy = false,
  onAction,
  onReset,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-5 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-2xl rounded-2xl bg-[#18181B]/90 dark:bg-[#1C1C21]/90 text-white px-4 py-3 shadow-2xl shadow-black/40 border border-white/[0.1] backdrop-blur-2xl flex items-center justify-between gap-3">
      <div className="min-w-0 flex items-center gap-2.5 text-xs sm:text-sm">
        <span className="font-mono font-medium text-[#66B2FF] tabular-nums shrink-0">
          {summary}
        </span>
        {detail && (
          <>
            <span className="text-zinc-600 hidden sm:inline">·</span>
            <span className="text-zinc-300 truncate hidden sm:inline">{detail}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.6} />
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={onAction}
          disabled={disabled || busy}
          className="px-4 py-2 rounded-xl bg-[#0A84FF] hover:bg-[#3399FF] disabled:opacity-45 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 transition whitespace-nowrap"
        >
          {busy ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.7} />
          ) : (
            <Download className="w-3.5 h-3.5" strokeWidth={1.7} />
          )}
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

export interface GeneratedFileItem {
  id: string;
  filename: string;
  subtitle?: string;
  sizeBytes: number;
  data: Uint8Array | Blob;
}

interface MultiOutputDownloadPanelProps {
  title?: string;
  zipFilename: string;
  items: GeneratedFileItem[];
  onClear?: () => void;
}

export const MultiOutputDownloadPanel: React.FC<MultiOutputDownloadPanelProps> = ({
  title = 'Generated PDFs ready',
  zipFilename,
  items,
  onClear,
}) => {
  const [zipping, setZipping] = useState(false);

  if (items.length === 0) return null;

  const handleDownloadZip = async () => {
    setZipping(true);
    try {
      const normalized = await Promise.all(
        items.map(async (item) => ({
          filename: item.filename,
          bytes:
            item.data instanceof Blob
              ? new Uint8Array(await item.data.arrayBuffer())
              : item.data,
        }))
      );
      const blob = await bundleOutputsToZip(normalized);
      triggerDownload(blob, zipFilename, 'application/zip');
    } finally {
      setZipping(false);
    }
  };

  const handleDownloadSeparately = async () => {
    await downloadFilesSequentially(
      items.map((item) => ({
        filename: item.filename,
        data: item.data,
      }))
    );
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#121215] border border-emerald-500/25 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-black/[0.06] dark:border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.8} />
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-[#F5F5F7]">
              {title} ({items.length})
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download any file individually, save all separately, or grab one ZIP archive.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={handleDownloadSeparately}
                className="px-3.5 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-slate-800 dark:text-slate-100 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <Files className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" strokeWidth={1.6} />
                Download all separately
              </button>
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={zipping}
                className="px-3.5 py-2 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-92 text-white text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
              >
                {zipping ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.6} />
                ) : (
                  <Archive className="w-3.5 h-3.5" strokeWidth={1.6} />
                )}
                Download all (.ZIP)
              </button>
            </>
          )}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="px-2.5 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] max-h-72 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="py-2.5 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] flex items-center justify-center text-[#0071E3] dark:text-[#0A84FF] shrink-0">
                <FileText className="w-4 h-4" strokeWidth={1.6} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-900 dark:text-[#F5F5F7] truncate">
                  {item.filename}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {item.subtitle ? `${item.subtitle} · ` : ''}
                  {formatBytes(item.sizeBytes)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => triggerDownload(item.data, item.filename)}
              className="px-3 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.07] hover:bg-[#0071E3] hover:text-white dark:hover:bg-[#0A84FF] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition shrink-0 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
