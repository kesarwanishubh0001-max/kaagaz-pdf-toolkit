import React, { useState, useRef } from 'react';
import {
  Upload,
  RefreshCw,
  ShieldCheck,
  FilePlus2,
  RotateCcw,
  Download,
  AlertCircle,
} from 'lucide-react';
import { createSamplePdfFile } from '../utils/pdfEngine';

interface WorkspaceDropzoneProps {
  multiple?: boolean;
  accept?: string;
  title: string;
  subtitle: string;
  selectLabel?: string;
  sampleLabel?: string;
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
        const sample1 = await createSamplePdfFile('Prism-Architecture-Report.pdf', 6);
        if (multiple) {
          const sample2 = await createSamplePdfFile('Prism-Financial-Annex.pdf', 4);
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
      className={`group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[360px] ${
        isDragging
          ? 'border-indigo-500 bg-indigo-500/8 scale-[0.995]'
          : 'border-slate-300 dark:border-slate-700/80 hover:border-indigo-500/70 bg-white dark:bg-slate-900/60'
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {loadingText}
          </p>
        </div>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1.5 text-balance">
            {title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
            {subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium shadow-sm shadow-indigo-600/20 hover:opacity-95 transition whitespace-nowrap">
              {selectLabel || (multiple ? 'Select PDF files' : 'Select PDF file')}
            </span>
            <button
              type="button"
              onClick={handleDefaultSample}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm font-medium flex items-center gap-2 transition whitespace-nowrap"
            >
              <FilePlus2 className="w-4 h-4 text-indigo-500" />
              {sampleLabel}
            </button>
          </div>

          {error && (
            <div className="mt-5 max-w-md flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Processed locally in browser memory · Zero server uploads</span>
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
    <div className="fixed bottom-16 lg:bottom-5 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-2xl rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white px-4 py-3 shadow-2xl border border-white/10 backdrop-blur-md flex items-center justify-between gap-3">
      <div className="min-w-0 flex items-center gap-2.5 text-xs sm:text-sm">
        <span className="font-mono font-semibold text-indigo-300 tabular-nums shrink-0">
          {summary}
        </span>
        {detail && (
          <>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-slate-300 truncate hidden sm:inline">{detail}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={onAction}
          disabled={disabled || busy}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 disabled:opacity-45 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 shadow transition whitespace-nowrap"
        >
          {busy ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
