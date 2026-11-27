import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  Unlock,
  Lock,
  PenTool,
  EyeOff,
  GitCompare,
  Layers2,
  Workflow,
  CheckCircle2,
  AlertCircle,
  Upload,
  Search,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Play,
  ChevronLeft,
  ChevronRight,
  Eraser,
} from 'lucide-react';
import {
  PageThumbnail,
  renderPdfThumbnails,
  formatBytes,
  triggerDownload,
} from '../utils/pdfEngine';
import {
  unlockPdfFile,
  protectPdfFile,
  ProtectPdfOptions,
  renderTypedSignaturePng,
  applySignatureToPdf,
  findKeywordBoxesOnPdf,
  applyPermanentRedaction,
  RedactionBox,
  compareTwoPdfs,
  createComparisonSamplePair,
  PageComparisonResult,
  inspectPdfFlattenStats,
  flattenPdfFile,
  FlattenInspection,
  WorkflowStep,
  WorkflowStepKind,
  runCustomWorkflowPipeline,
} from '../utils/advancedEngine';
import { WorkspaceDropzone, FloatingActionBar } from './WorkspaceShared';

/* ============================================================================
   27. UNLOCK PDF WORKSPACE
============================================================================ */
export const UnlockPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    pageCount: number;
    method: string;
  } | null>(null);

  const handleFiles = (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);
    setError(null);
  };

  const handleUnlock = async () => {
    if (!file) return;
    setUnlocking(true);
    setError(null);
    try {
      const out = await unlockPdfFile(file, password);
      setResult(out);
    } catch {
      setError(
        'Incorrect password or unsupported encryption algorithm. Enter the document password and try again.'
      );
    } finally {
      setUnlocking(false);
    }
  };

  const handleDownload = () => {
    if (!file || !result) return;
    const base = file.name.replace(/\.pdf$/i, '');
    triggerDownload(result.bytes, `${base}-unlocked.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a password-protected or restricted PDF to unlock"
            subtitle="Enter the open password (or leave blank to strip print/copy owner restrictions) and export an unlocked PDF."
            onFilesSelected={handleFiles}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </h3>
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {formatBytes(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setError(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Change file
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                PDF password (leave empty if only print/copy restricted)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter document password..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/25 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      PDF unlocked ({result.pageCount} pages)
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {result.method}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download Unlocked PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Unlock className="w-4 h-4 text-emerald-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Unlock action
            </h4>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Decryption runs strictly inside local browser memory. Your password and file never touch any external server.
          </p>

          <button
            type="button"
            onClick={result ? handleDownload : handleUnlock}
            disabled={!file || unlocking}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            {unlocking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Decrypting...
              </>
            ) : result ? (
              <>
                <Download className="w-4 h-4" /> Download Unlocked PDF
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" /> Unlock PDF
              </>
            )}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={result ? 'Unlocked & ready' : 'Awaiting unlock'}
        detail={file?.name}
        actionLabel={unlocking ? 'Unlocking...' : result ? 'Download PDF' : 'Unlock PDF'}
        busy={unlocking}
        onAction={result ? handleDownload : handleUnlock}
        onReset={() => {
          setFile(null);
          setPassword('');
          setResult(null);
        }}
      />
    </div>
  );
};

/* ============================================================================
   28. PROTECT PDF WORKSPACE (Real Password Encryption)
============================================================================ */
export const ProtectPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<ProtectPdfOptions>({
    userPassword: '',
    ownerPassword: '',
    allowPrint: true,
    allowCopy: false,
    allowModify: false,
    allowForms: false,
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [encrypting, setEncrypting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [encryptedBlob, setEncryptedBlob] = useState<Blob | null>(null);

  const passwordsMatch =
    options.userPassword.length >= 3 && options.userPassword === confirmPassword;

  const handleProtect = async () => {
    if (!file || !passwordsMatch) return;
    setEncrypting(true);
    try {
      const blob = await protectPdfFile(file, options, (current, total) =>
        setProgress({ current, total })
      );
      setEncryptedBlob(blob);
    } finally {
      setEncrypting(false);
      setProgress(null);
    }
  };

  const handleDownload = () => {
    if (!file || !encryptedBlob) return;
    const base = file.name.replace(/\.pdf$/i, '');
    triggerDownload(encryptedBlob, `${base}-protected.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to encrypt with a password"
            subtitle="Sets an open password plus granular print, copy, and modification permissions locally."
            onFilesSelected={(files) => {
              if (files[0]) {
                setFile(files[0]);
                setEncryptedBlob(null);
              }
            }}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </h3>
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {formatBytes(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setEncryptedBlob(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Change file
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Open password (min 3 characters)
                </label>
                <input
                  type="password"
                  value={options.userPassword}
                  onChange={(e) => {
                    setOptions({ ...options, userPassword: e.target.value });
                    setEncryptedBlob(null);
                  }}
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setEncryptedBlob(null);
                  }}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {confirmPassword && options.userPassword !== confirmPassword && (
              <p className="text-xs text-rose-500">Passwords do not match.</p>
            )}

            {progress && (
              <p className="text-xs font-mono text-indigo-500 tabular-nums">
                Encrypting page {progress.current} of {progress.total}...
              </p>
            )}

            {encryptedBlob && (
              <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/25 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Password encryption complete
                    </p>
                    <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 mt-0.5">
                      Protected size: {formatBytes(encryptedBlob.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download Protected PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Lock className="w-4 h-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Document permissions
            </h4>
          </div>

          <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
            {(
              [
                { key: 'allowPrint', label: 'Allow printing' },
                { key: 'allowCopy', label: 'Allow copying text & graphics' },
                { key: 'allowModify', label: 'Allow document modifications' },
                { key: 'allowForms', label: 'Allow form annotations' },
              ] as const
            ).map((perm) => (
              <label key={perm.key} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options[perm.key]}
                  onChange={(e) =>
                    setOptions({ ...options, [perm.key]: e.target.checked })
                  }
                  className="rounded accent-indigo-600"
                />
                <span>{perm.label}</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={encryptedBlob ? handleDownload : handleProtect}
            disabled={!file || !passwordsMatch || encrypting}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            {encrypting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Encrypting...
              </>
            ) : encryptedBlob ? (
              <>
                <Download className="w-4 h-4" /> Download Protected PDF
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Encrypt & Protect PDF
              </>
            )}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={encryptedBlob ? 'Encrypted & ready' : passwordsMatch ? 'Password valid' : 'Set password'}
        detail={file?.name}
        actionLabel={encrypting ? 'Encrypting...' : encryptedBlob ? 'Download PDF' : 'Protect PDF'}
        disabled={!passwordsMatch}
        busy={encrypting}
        onAction={encryptedBlob ? handleDownload : handleProtect}
        onReset={() => setEncryptedBlob(null)}
      />
    </div>
  );
};

/* ============================================================================
   29. SIGN PDF WORKSPACE (Draw, Type, or Upload Signature)
============================================================================ */
export const SignPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<PageThumbnail[]>([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [sigMode, setSigMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [sigColor, setSigColor] = useState('#1E1B4B');
  const [typedText, setTypedText] = useState('Aarav Sharma');
  const [typedStyle, setTypedStyle] = useState<'cursive' | 'serif' | 'mono'>('cursive');
  const [sigDataUrl, setSigDataUrl] = useState<string>('');
  const [pos, setPos] = useState({ xPct: 0.56, yPct: 0.78, widthPct: 0.3 });
  const [includeDate, setIncludeDate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const padCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const pageStageRef = useRef<HTMLDivElement>(null);
  const uploadSigRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sigMode === 'type') {
      setSigDataUrl(renderTypedSignaturePng(typedText, sigColor, typedStyle));
    }
  }, [sigMode, typedText, sigColor, typedStyle]);

  const handleFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    try {
      setFile(selected);
      setThumbs(await renderPdfThumbnails(selected, 0.65));
      setPageIdx(0);
    } finally {
      setLoading(false);
    }
  };

  const getPadPt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = padCanvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * padCanvasRef.current!.width,
      y: ((e.clientY - rect.top) / rect.height) * padCanvasRef.current!.height,
    };
  };

  const handlePadDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = padCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = getPadPt(e);
    ctx.strokeStyle = sigColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const handlePadMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = padCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pt = getPadPt(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handlePadUp = () => {
    if (!drawingRef.current || !padCanvasRef.current) return;
    drawingRef.current = false;
    setSigDataUrl(padCanvasRef.current.toDataURL('image/png'));
  };

  const clearPad = () => {
    const c = padCanvasRef.current;
    if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setSigDataUrl('');
  };

  const handleUploadSignature = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setSigDataUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handlePlaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pageStageRef.current) return;
    const rect = pageStageRef.current.getBoundingClientRect();
    const xPct = Math.min(1 - pos.widthPct, Math.max(0, (e.clientX - rect.left) / rect.width - pos.widthPct / 2));
    const yPct = Math.min(0.92, Math.max(0, (e.clientY - rect.top) / rect.height - 0.05));
    setPos((prev) => ({ ...prev, xPct, yPct }));
  };

  const handleApplySignature = async () => {
    if (!file || !sigDataUrl) return;
    setSaving(true);
    try {
      const bytes = await applySignatureToPdf(file, sigDataUrl, {
        pageNumber: pageIdx + 1,
        xPct: pos.xPct,
        yPct: pos.yPct,
        widthPct: pos.widthPct,
        includeDate,
      });
      const base = file.name.replace(/\.pdf$/i, '');
      triggerDownload(bytes, `${base}-signed.pdf`);
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
            title="Drop a PDF to sign electronically"
            subtitle="Draw, type, or upload your signature and click anywhere on the document to place it."
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
                  Page {pageIdx + 1} / {thumbs.length} · Click anywhere on page to position signature
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
              <div className="flex justify-center">
                <div
                  ref={pageStageRef}
                  onClick={handlePlaceClick}
                  className="relative inline-block w-full max-w-lg rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white cursor-pointer select-none"
                >
                  <img
                    src={currentThumb.dataUrl}
                    alt={`Sign page ${pageIdx + 1}`}
                    className="w-full h-auto block pointer-events-none"
                  />
                  {sigDataUrl && (
                    <div
                      style={{
                        left: `${pos.xPct * 100}%`,
                        top: `${pos.yPct * 100}%`,
                        width: `${pos.widthPct * 100}%`,
                      }}
                      className="absolute border border-dashed border-indigo-500 bg-indigo-500/5 rounded p-1 pointer-events-none"
                    >
                      <img src={sigDataUrl} alt="Placed signature" className="w-full h-auto" />
                      {includeDate && (
                        <div className="text-[9px] font-mono text-slate-600 mt-0.5">
                          Signed {new Date().toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <PenTool className="w-4 h-4 text-violet-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Signature studio
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'draw', label: 'Draw' },
                { id: 'type', label: 'Type' },
                { id: 'upload', label: 'Upload' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSigMode(tab.id)}
                className={`py-2 rounded-xl border text-xs font-medium ${
                  sigMode === tab.id
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {sigMode === 'draw' && (
            <div className="space-y-2">
              <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white overflow-hidden">
                <canvas
                  ref={padCanvasRef}
                  width={560}
                  height={180}
                  onPointerDown={handlePadDown}
                  onPointerMove={handlePadMove}
                  onPointerUp={handlePadUp}
                  className="w-full h-28 touch-none cursor-crosshair block"
                />
                <button
                  type="button"
                  onClick={clearPad}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-rose-500"
                  title="Clear signature"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Draw your signature above with mouse or touch.
              </p>
            </div>
          )}

          {sigMode === 'type' && (
            <div className="space-y-3">
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Type your full name"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
              />
              <div className="grid grid-cols-3 gap-1.5">
                {(['cursive', 'serif', 'mono'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setTypedStyle(st)}
                    className={`py-1.5 rounded-lg border text-xs capitalize ${
                      typedStyle === st
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sigMode === 'upload' && (
            <div>
              <input
                ref={uploadSigRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => handleUploadSignature(e.target.files)}
              />
              <button
                type="button"
                onClick={() => uploadSigRef.current?.click()}
                className="w-full py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-xs font-medium flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4 text-indigo-500" />
                Upload signature image
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Ink color
              </label>
              <input
                type="color"
                value={sigColor}
                onChange={(e) => setSigColor(e.target.value)}
                className="w-full h-[36px] rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Size ({Math.round(pos.widthPct * 100)}%)
              </label>
              <input
                type="range"
                min={0.12}
                max={0.55}
                step={0.02}
                value={pos.widthPct}
                onChange={(e) => setPos({ ...pos, widthPct: Number(e.target.value) })}
                className="w-full accent-indigo-600 mt-2"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDate}
              onChange={(e) => setIncludeDate(e.target.checked)}
              className="rounded accent-indigo-600"
            />
            Stamp signing date underneath
          </label>

          <button
            type="button"
            onClick={handleApplySignature}
            disabled={!file || !sigDataUrl || saving}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            {saving ? 'Signing PDF...' : 'Apply Signature & Download'}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={sigDataUrl ? `Page ${pageIdx + 1}` : 'Create signature'}
        detail={file?.name}
        actionLabel={saving ? 'Signing...' : 'Download Signed PDF'}
        disabled={!sigDataUrl}
        busy={saving}
        onAction={handleApplySignature}
        onReset={() => setFile(null)}
      />
    </div>
  );
};

/* ============================================================================
   30. REDACT PDF WORKSPACE (Auto-Keyword + Manual Permanent Burnout)
============================================================================ */
export const RedactPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<PageThumbnail[]>([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [boxes, setBoxes] = useState<RedactionBox[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [draftBox, setDraftBox] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [redacting, setRedacting] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const handleFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setLoading(true);
    try {
      setFile(selected);
      setThumbs(await renderPdfThumbnails(selected, 0.7));
      setPageIdx(0);
      setBoxes([]);
    } finally {
      setLoading(false);
    }
  };

  const getNorm = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getNorm(e);
    startRef.current = pt;
    setDraftBox({ x: pt.x, y: pt.y, w: 0, h: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const pt = getNorm(e);
    setDraftBox({
      x: Math.min(startRef.current.x, pt.x),
      y: Math.min(startRef.current.y, pt.y),
      w: Math.abs(pt.x - startRef.current.x),
      h: Math.abs(pt.y - startRef.current.y),
    });
  };

  const handlePointerUp = () => {
    if (draftBox && draftBox.w > 0.01 && draftBox.h > 0.01) {
      setBoxes((prev) => [
        ...prev,
        {
          id: `red-${Date.now()}`,
          pageNumber: pageIdx + 1,
          ...draftBox,
        },
      ]);
    }
    startRef.current = null;
    setDraftBox(null);
  };

  const handleAutoFindKeywords = async () => {
    if (!file || !keywordInput.trim()) return;
    const terms = keywordInput.split(',').map((s) => s.trim()).filter(Boolean);
    const found = await findKeywordBoxesOnPdf(file, terms);
    setBoxes((prev) => [...prev, ...found]);
  };

  const handlePermanentRedact = async () => {
    if (!file || boxes.length === 0) return;
    setRedacting(true);
    try {
      const bytes = await applyPermanentRedaction(file, boxes, '#000000');
      const base = file.name.replace(/\.pdf$/i, '');
      triggerDownload(bytes, `${base}-redacted.pdf`);
    } finally {
      setRedacting(false);
    }
  };

  const pageBoxes = boxes.filter((b) => b.pageNumber === pageIdx + 1);
  const currentThumb = thumbs[pageIdx];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to permanently redact sensitive content"
            subtitle="Draw blackouts directly on pages or auto-locate keywords. Redacted text is irreversibly burned out."
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
                  Page {pageIdx + 1} / {thumbs.length} · Drag on page to draw redaction box
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
                onClick={() => setBoxes([])}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Clear all ({boxes.length})
              </button>
            </div>

            {currentThumb && (
              <div className="flex justify-center">
                <div
                  ref={stageRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative inline-block w-full max-w-lg rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white cursor-crosshair select-none touch-none"
                >
                  <img
                    src={currentThumb.dataUrl}
                    alt={`Redact page ${pageIdx + 1}`}
                    className="w-full h-auto block pointer-events-none"
                  />
                  {pageBoxes.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        left: `${b.x * 100}%`,
                        top: `${b.y * 100}%`,
                        width: `${b.w * 100}%`,
                        height: `${b.h * 100}%`,
                      }}
                      className="absolute bg-black/95 border border-rose-500 pointer-events-none"
                    />
                  ))}
                  {draftBox && (
                    <div
                      style={{
                        left: `${draftBox.x * 100}%`,
                        top: `${draftBox.y * 100}%`,
                        width: `${draftBox.w * 100}%`,
                        height: `${draftBox.h * 100}%`,
                      }}
                      className="absolute bg-black/75 border border-dashed border-rose-400 pointer-events-none"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <EyeOff className="w-4 h-4 text-rose-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Permanent redaction
            </h4>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Auto-redact keywords (comma separated)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="e.g. Enterprise, $420,000"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
              />
              <button
                type="button"
                disabled={!file || !keywordInput.trim()}
                onClick={handleAutoFindKeywords}
                className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-medium flex items-center gap-1 disabled:opacity-40 shrink-0"
              >
                <Search className="w-3.5 h-3.5" /> Find
              </button>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Marked redactions</span>
              <span className="font-mono font-semibold tabular-nums text-rose-500">
                {boxes.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Pages are rasterized with permanent blackouts so underlying hidden text cannot be copied or recovered.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePermanentRedact}
            disabled={!file || boxes.length === 0 || redacting}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            {redacting ? 'Burning Redactions...' : 'Apply Permanent Redaction'}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={`${boxes.length} redaction${boxes.length === 1 ? '' : 's'}`}
        detail="Permanent pixel burnout"
        actionLabel={redacting ? 'Redacting...' : 'Redact & Download'}
        disabled={boxes.length === 0}
        busy={redacting}
        onAction={handlePermanentRedact}
        onReset={() => setBoxes([])}
      />
    </div>
  );
};

/* ============================================================================
   31. COMPARE PDF WORKSPACE (Side-by-Side Visual & Text Diff)
============================================================================ */
export const ComparePdfWorkspace: React.FC = () => {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [results, setResults] = useState<PageComparisonResult[]>([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'visual-diff' | 'text-diff'>(
    'side-by-side'
  );
  const [comparing, setComparing] = useState(false);

  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);

  const runCompare = async (a: File, b: File) => {
    setComparing(true);
    try {
      const diff = await compareTwoPdfs(a, b);
      setResults(diff);
      setPageIdx(0);
    } finally {
      setComparing(false);
    }
  };

  const handleLoadSamplePair = async () => {
    const [a, b] = await createComparisonSamplePair();
    setFileA(a);
    setFileB(b);
    await runCompare(a, b);
  };

  const current = results[pageIdx];

  return (
    <div className="space-y-6 pb-24">
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Select two PDF versions to compare
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Computes visual pixel difference heatmaps and line-by-line text additions & removals locally.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLoadSamplePair}
            className="px-3.5 py-2 rounded-xl bg-indigo-500/12 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-medium whitespace-nowrap"
          >
            Load Sample Draft v1 vs v2
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => inputARef.current?.click()}
            className="cursor-pointer p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 flex items-center justify-between gap-3"
          >
            <input
              ref={inputARef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFileA(f);
                  if (fileB) runCompare(f, fileB);
                }
              }}
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Original (Version A)
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-white truncate mt-0.5">
                {fileA ? fileA.name : 'Click to select original PDF'}
              </div>
            </div>
            <Upload className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          <div
            onClick={() => inputBRef.current?.click()}
            className="cursor-pointer p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 flex items-center justify-between gap-3"
          >
            <input
              ref={inputBRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFileB(f);
                  if (fileA) runCompare(fileA, f);
                }
              }}
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                Revised (Version B)
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-white truncate mt-0.5">
                {fileB ? fileB.name : 'Click to select revised PDF'}
              </div>
            </div>
            <Upload className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
        </div>

        {comparing && (
          <div className="py-8 text-center text-sm text-indigo-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Running visual and text comparison...
          </div>
        )}

        {current && !comparing && (
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                  Page {pageIdx + 1} / {results.length} · {current.diffPercent}% visual delta
                </span>
                <button
                  type="button"
                  disabled={pageIdx >= results.length - 1}
                  onClick={() => setPageIdx((i) => Math.min(results.length - 1, i + 1))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {(
                  [
                    { id: 'side-by-side', label: 'Side by Side' },
                    { id: 'visual-diff', label: 'Visual Diff' },
                    { id: 'text-diff', label: 'Text Diff' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setViewMode(tab.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                      viewMode === tab.id
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {viewMode === 'side-by-side' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950/40">
                  <div className="text-xs font-medium text-slate-500 mb-2">Version A</div>
                  {current.leftDataUrl ? (
                    <img src={current.leftDataUrl} alt="Version A" className="w-full rounded bg-white" />
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400">Page not in Version A</div>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950/40">
                  <div className="text-xs font-medium text-slate-500 mb-2">Version B</div>
                  {current.rightDataUrl ? (
                    <img src={current.rightDataUrl} alt="Version B" className="w-full rounded bg-white" />
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400">Page not in Version B</div>
                  )}
                </div>
              </div>
            )}

            {viewMode === 'visual-diff' && (
              <div className="flex justify-center">
                {current.diffDataUrl ? (
                  <div className="max-w-lg w-full space-y-2">
                    <div className="text-xs text-slate-500 text-center">
                      Changed pixels highlighted in crimson ({current.diffPercent}% difference)
                    </div>
                    <img
                      src={current.diffDataUrl}
                      alt="Visual pixel diff"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-8">No visual diff available for mismatched page.</p>
                )}
              </div>
            )}

            {viewMode === 'text-diff' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-rose-500/8 border border-rose-500/20 space-y-2">
                  <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Removed from Version A ({current.removedLines.length})
                  </div>
                  {current.removedLines.length === 0 ? (
                    <p className="text-xs text-slate-500">No removed lines on this page.</p>
                  ) : (
                    current.removedLines.map((l, i) => (
                      <div key={i} className="text-xs font-mono text-rose-700 dark:text-rose-300">
                        - {l}
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 space-y-2">
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Added in Version B ({current.addedLines.length})
                  </div>
                  {current.addedLines.length === 0 ? (
                    <p className="text-xs text-slate-500">No added lines on this page.</p>
                  ) : (
                    current.addedLines.map((l, i) => (
                      <div key={i} className="text-xs font-mono text-emerald-700 dark:text-emerald-300">
                        + {l}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   32. FLATTEN PDF WORKSPACE
============================================================================ */
export const FlattenPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [stats, setStats] = useState<FlattenInspection | null>(null);
  const [mode, setMode] = useState<'full-static' | 'forms-only'>('full-static');
  const [dpi, setDpi] = useState<150 | 200 | 300>(200);
  const [flattening, setFlattening] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);

  const handleFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setFile(selected);
    setResultBytes(null);
    setStats(await inspectPdfFlattenStats(selected));
  };

  const handleFlatten = async () => {
    if (!file) return;
    setFlattening(true);
    try {
      const bytes = await flattenPdfFile(file, mode, dpi);
      setResultBytes(bytes);
    } finally {
      setFlattening(false);
    }
  };

  const handleDownload = () => {
    if (!file || !resultBytes) return;
    const base = file.name.replace(/\.pdf$/i, '');
    triggerDownload(resultBytes, `${base}-flattened.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to flatten forms, annotations & layers"
            subtitle="Convert interactive forms and layered annotations into static, uneditable pages."
            onFilesSelected={handleFiles}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </h3>
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {stats?.pageCount ?? 0} pages · {stats?.formFieldCount ?? 0} interactive form field(s) detected
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setStats(null);
                  setResultBytes(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
              >
                Change file
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {(
                [
                  {
                    id: 'full-static',
                    title: 'Full Static Flatten',
                    desc: 'Merges forms, annotations, comments, and transparency layers into static uneditable pages.',
                  },
                  {
                    id: 'forms-only',
                    title: 'Flatten Form Fields Only',
                    desc: 'Locks AcroForm inputs into page content while preserving crisp vector text.',
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setMode(opt.id);
                    setResultBytes(null);
                  }}
                  className={`p-4 rounded-xl border text-left transition ${
                    mode === opt.id
                      ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {opt.title}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>

            {resultBytes && (
              <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/25 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Flattened PDF ready
                    </p>
                    <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 mt-0.5">
                      Output size: {formatBytes(resultBytes.byteLength)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download Flattened PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Layers2 className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Flatten quality
            </h4>
          </div>

          {mode === 'full-static' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Rasterization DPI
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([150, 200, 300] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDpi(val)}
                    className={`py-2 rounded-xl border text-xs font-mono tabular-nums ${
                      dpi === val
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={resultBytes ? handleDownload : handleFlatten}
            disabled={!file || flattening}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            {flattening ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Flattening...
              </>
            ) : resultBytes ? (
              <>
                <Download className="w-4 h-4" /> Download Flattened PDF
              </>
            ) : (
              <>
                <Layers2 className="w-4 h-4" /> Flatten PDF Now
              </>
            )}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={resultBytes ? 'Flattened' : mode === 'full-static' ? `Static ${dpi} DPI` : 'Forms only'}
        detail={file?.name}
        actionLabel={flattening ? 'Flattening...' : resultBytes ? 'Download PDF' : 'Flatten Now'}
        busy={flattening}
        onAction={resultBytes ? handleDownload : handleFlatten}
        onReset={() => setResultBytes(null)}
      />
    </div>
  );
};

/* ============================================================================
   33. CUSTOM WORKFLOWS WORKSPACE (Automated Multi-Step Pipeline)
============================================================================ */
const STEP_LABELS: Record<WorkflowStepKind, string> = {
  rotate: 'Rotate All Pages',
  watermark: 'Stamp Watermark',
  'page-numbers': 'Add Page Numbers',
  compress: 'Compress PDF',
  flatten: 'Flatten Layers',
  pdfa: 'Convert to PDF/A',
};

const WORKFLOW_PRESETS: { name: string; steps: WorkflowStep[] }[] = [
  {
    name: 'Client Delivery Pack',
    steps: [
      {
        id: 'st-1',
        kind: 'watermark',
        enabled: true,
        config: { watermarkText: 'CLIENT REVIEW', watermarkOpacity: 0.2 },
      },
      {
        id: 'st-2',
        kind: 'page-numbers',
        enabled: true,
        config: { pageNumberPosition: 'bottom-center', pageNumberFormat: 'page-n-of-total' },
      },
      {
        id: 'st-3',
        kind: 'compress',
        enabled: true,
        config: { compressPreset: 'recommended' },
      },
    ],
  },
  {
    name: 'Archival Lock',
    steps: [
      { id: 'st-a1', kind: 'flatten', enabled: true, config: { flattenMode: 'full-static' } },
      { id: 'st-a2', kind: 'pdfa', enabled: true, config: { pdfaLevel: 'PDF/A-1b' } },
    ],
  },
];

export const CustomWorkflowsWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>(WORKFLOW_PRESETS[0].steps);
  const [running, setRunning] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);

  const addStep = (kind: WorkflowStepKind) => {
    setSteps((prev) => [
      ...prev,
      {
        id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        kind,
        enabled: true,
        config: {
          rotateAngle: 90,
          watermarkText: 'CONFIDENTIAL',
          watermarkOpacity: 0.22,
          pageNumberPosition: 'bottom-center',
          pageNumberFormat: 'page-n-of-total',
          compressPreset: 'recommended',
          flattenMode: 'full-static',
          pdfaLevel: 'PDF/A-1b',
        },
      },
    ]);
    setOutputBytes(null);
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    const copy = [...steps];
    const [item] = copy.splice(idx, 1);
    copy.splice(target, 0, item);
    setSteps(copy);
  };

  const handleRunPipeline = async () => {
    if (!file || steps.filter((s) => s.enabled).length === 0) return;
    setRunning(true);
    setOutputBytes(null);
    try {
      const bytes = await runCustomWorkflowPipeline(file, steps, (i, total, kind) =>
        setProgressMsg(`Running step ${i}/${total}: ${STEP_LABELS[kind as WorkflowStepKind] || kind}...`)
      );
      setOutputBytes(bytes);
    } finally {
      setRunning(false);
      setProgressMsg('');
    }
  };

  const handleDownload = () => {
    if (!file || !outputBytes) return;
    const base = file.name.replace(/\.pdf$/i, '');
    triggerDownload(outputBytes, `${base}-workflow.pdf`);
  };

  const activeCount = steps.filter((s) => s.enabled).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
      <div className="lg:col-span-8 space-y-5">
        {!file ? (
          <WorkspaceDropzone
            title="Drop a PDF to run your automated workflow"
            subtitle="Chain Watermark, Page Numbers, Rotate, Compress, Flatten, and PDF/A into a 1-click pipeline."
            onFilesSelected={(files) => {
              if (files[0]) {
                setFile(files[0]);
                setOutputBytes(null);
              }
            }}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {file.name}
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500">
                {formatBytes(file.size)} · {activeCount} active pipeline step(s)
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setOutputBytes(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-rose-500"
            >
              Change file
            </button>
          </div>
        )}

        {/* Pipeline Chain Builder */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Pipeline sequence ({steps.length} steps)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Steps execute top-to-bottom in browser memory.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WORKFLOW_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setSteps(preset.steps);
                    setOutputBytes(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-medium"
                >
                  Preset: {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step.enabled}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s) =>
                            s.id === step.id ? { ...s, enabled: e.target.checked } : s
                          )
                        )
                      }
                      className="rounded accent-indigo-600"
                    />
                    <span className="text-xs font-mono font-semibold text-indigo-500 tabular-nums">
                      0{idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {STEP_LABELS[step.kind]}
                    </span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, -1)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === steps.length - 1}
                      onClick={() => moveStep(idx, 1)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSteps((prev) => prev.filter((s) => s.id !== step.id))
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline step config */}
                {step.kind === 'watermark' && (
                  <input
                    type="text"
                    value={step.config.watermarkText || ''}
                    onChange={(e) =>
                      setSteps((prev) =>
                        prev.map((s) =>
                          s.id === step.id
                            ? { ...s, config: { ...s.config, watermarkText: e.target.value } }
                            : s
                        )
                      )
                    }
                    placeholder="Watermark text..."
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                )}
                {step.kind === 'rotate' && (
                  <div className="flex gap-1.5">
                    {([90, 180, 270] as const).map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() =>
                          setSteps((prev) =>
                            prev.map((s) =>
                              s.id === step.id
                                ? { ...s, config: { ...s.config, rotateAngle: deg } }
                                : s
                            )
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg border text-xs font-mono ${
                          step.config.rotateAngle === deg
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                )}
                {step.kind === 'compress' && (
                  <div className="flex gap-1.5">
                    {(['extreme', 'recommended', 'less'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setSteps((prev) =>
                            prev.map((s) =>
                              s.id === step.id
                                ? { ...s, config: { ...s.config, compressPreset: p } }
                                : s
                            )
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg border text-xs capitalize ${
                          step.config.compressPreset === p
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {running && (
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{progressMsg}</span>
            </div>
          )}

          {outputBytes && (
            <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/25 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Workflow completed ({activeCount} steps)
                  </p>
                  <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 mt-0.5">
                    Final output: {formatBytes(outputBytes.byteLength)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download Result PDF
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sticky top-20 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Workflow className="w-4 h-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Add pipeline steps
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(STEP_LABELS) as WorkflowStepKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => addStep(kind)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-left"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{STEP_LABELS[kind]}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={outputBytes ? handleDownload : handleRunPipeline}
            disabled={!file || activeCount === 0 || running}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Running Pipeline...
              </>
            ) : outputBytes ? (
              <>
                <Download className="w-4 h-4" /> Download Workflow Output
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Run {activeCount}-Step Workflow
              </>
            )}
          </button>
        </div>
      </div>

      <FloatingActionBar
        visible={Boolean(file)}
        summary={`${activeCount} active steps`}
        detail={file?.name}
        actionLabel={
          running
            ? 'Running...'
            : outputBytes
              ? 'Download Output'
              : 'Run Workflow'
        }
        disabled={activeCount === 0}
        busy={running}
        onAction={outputBytes ? handleDownload : handleRunPipeline}
        onReset={() => setOutputBytes(null)}
      />
    </div>
  );
};
