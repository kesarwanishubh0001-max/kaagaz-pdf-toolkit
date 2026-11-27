import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  FileCode,
  FileArchive,
  FileAudio,
  FileVideo,
  File,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Printer,
  Download,
  Maximize2,
  Minimize2,
  Search,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Info,
  PanelLeft,
  WrapText,
  FlipHorizontal2,
  Grid2x2,
  Eye,
  Code2,
  RefreshCw,
  FolderOpen,
  FileType,
  AlignLeft,
  Clock,
  HardDrive,
  Smartphone,
  Trash2,
  ShieldCheck,
  Folder,
  ArrowLeft,
} from 'lucide-react';
import {
  LoadedViewerDocument,
  ViewerDocumentKind,
  SampleDocType,
  loadFileIntoViewer,
  extractFileFromArchive,
  revokeViewerDocumentUrls,
  createViewerSampleFile,
} from '../utils/documentViewerEngine';
import { formatBytes, triggerDownload } from '../utils/pdfEngine';
import {
  DeviceFileEntry,
  isAndroidNativeApp,
  hasAndroidStoragePermission,
  requestAndroidStoragePermission,
  scanAndroidDeviceFiles,
  readAndroidFileByPath,
  triggerNativePrint,
  mapBrowserFilesToDeviceEntries,
} from '../utils/mobileStorageBridge';
import {
  RecentViewedFile,
  listRecentFiles,
  saveRecentFile,
  loadRecentFileObject,
  removeRecentFile,
  clearRecentFiles,
  formatRelativeTime,
} from '../utils/recentFilesStore';

type DeviceCategoryFilter = 'all' | 'pdf' | 'office' | 'image' | 'text' | 'archive';

interface IncomingAndroidFilePayload {
  name: string;
  mimeType: string;
  base64: string;
}

const ACCEPTED_ALL_TYPES =
  '.pdf,.docx,.xlsx,.xls,.ods,.csv,.tsv,.pptx,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.ico,.avif,.md,.markdown,.html,.htm,.json,.txt,.log,.rtf,.xml,.yaml,.yml,.js,.jsx,.ts,.tsx,.py,.css,.scss,.sql,.sh,.java,.c,.cpp,.go,.rs,.zip,.mp3,.wav,.ogg,.m4a,.mp4,.webm,.mov';

function getKindIcon(kind: ViewerDocumentKind, className = 'w-4 h-4') {
  const props = { className, strokeWidth: 1.6 };
  switch (kind) {
    case 'pdf':
      return <FileText {...props} />;
    case 'word':
      return <FileType {...props} />;
    case 'spreadsheet':
      return <FileSpreadsheet {...props} />;
    case 'presentation':
      return <Presentation {...props} />;
    case 'image':
      return <ImageIcon {...props} />;
    case 'markdown':
    case 'html':
    case 'json':
    case 'code':
      return <FileCode {...props} />;
    case 'archive':
      return <FileArchive {...props} />;
    case 'audio':
      return <FileAudio {...props} />;
    case 'video':
      return <FileVideo {...props} />;
    case 'text':
      return <AlignLeft {...props} />;
    default:
      return <File {...props} />;
  }
}

function getKindTint(kind: ViewerDocumentKind): string {
  switch (kind) {
    case 'pdf':
      return 'text-rose-600 dark:text-[#FF453A]';
    case 'word':
      return 'text-[#0071E3] dark:text-[#0A84FF]';
    case 'spreadsheet':
      return 'text-emerald-600 dark:text-[#30D158]';
    case 'presentation':
      return 'text-amber-600 dark:text-[#FF9F0A]';
    case 'image':
      return 'text-sky-600 dark:text-[#64D2FF]';
    case 'markdown':
    case 'json':
    case 'code':
    case 'html':
      return 'text-purple-600 dark:text-[#BF5AF2]';
    case 'archive':
      return 'text-amber-600 dark:text-[#FF9F0A]';
    default:
      return 'text-slate-600 dark:text-slate-300';
  }
}

export const UniversalDocumentViewer: React.FC = () => {
  const [docs, setDocs] = useState<LoadedViewerDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Viewer controls state
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [checkerboard, setCheckerboard] = useState(false);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfScrollMode, setPdfScrollMode] = useState<'continuous' | 'single'>('continuous');
  const [pdfViewText, setPdfViewText] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInspector, setShowInspector] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSheet, setActiveSheet] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);
  const [sourceMode, setSourceMode] = useState<'preview' | 'source'>('preview');
  const [wordWrap, setWordWrap] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Device storage & Recently Viewed state
  const isAndroid = useMemo(() => isAndroidNativeApp(), []);
  const [showHub, setShowHub] = useState(false);
  const [recentFiles, setRecentFiles] = useState<RecentViewedFile[]>([]);
  const [hasStoragePerm, setHasStoragePerm] = useState<boolean>(() =>
    hasAndroidStoragePermission()
  );
  const [deviceFiles, setDeviceFiles] = useState<DeviceFileEntry[]>([]);
  const [scanningDevice, setScanningDevice] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceCategory, setDeviceCategory] = useState<DeviceCategoryFilter>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const viewerShellRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const activeDoc = useMemo(
    () => docs.find((d) => d.id === activeDocId) || null,
    [docs, activeDocId]
  );

  // Load recently viewed files from IndexedDB on mount
  useEffect(() => {
    listRecentFiles().then(setRecentFiles);
  }, []);

  // Refresh Android native storage permission & scan device documents
  const refreshAndroidStorage = async () => {
    if (!isAndroid) return;
    const granted = hasAndroidStoragePermission();
    setHasStoragePerm(granted);
    if (!granted) {
      setDeviceFiles([]);
      return;
    }
    setScanningDevice(true);
    try {
      const entries = await scanAndroidDeviceFiles();
      setDeviceFiles(entries);
    } finally {
      setScanningDevice(false);
    }
  };

  useEffect(() => {
    if (!isAndroid) return;
    refreshAndroidStorage();

    const onPermissionOrFocus = () => {
      refreshAndroidStorage();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshAndroidStorage();
      }
    };

    window.addEventListener('kaagaz-permission-result', onPermissionOrFocus);
    window.addEventListener('focus', onPermissionOrFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('kaagaz-permission-result', onPermissionOrFocus);
      window.removeEventListener('focus', onPermissionOrFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAndroid]);

  // Clean up object URLs on unmount
  const docsRef = useRef<LoadedViewerDocument[]>([]);
  docsRef.current = docs;
  useEffect(() => {
    return () => {
      docsRef.current.forEach(revokeViewerDocumentUrls);
    };
  }, []);

  // Reset per-document view controls when switching tabs
  useEffect(() => {
    setZoom(100);
    setRotation(0);
    setFlipX(false);
    setPdfPage(1);
    setPdfViewText(false);
    setSlideIndex(0);
    setSourceMode('preview');
    setSearchQuery('');
    setShowSearch(false);
    if (activeDoc?.spreadsheet && activeDoc.spreadsheet.sheetNames.length > 0) {
      setActiveSheet(activeDoc.spreadsheet.sheetNames[0]);
    } else {
      setActiveSheet('');
    }
  }, [activeDocId]);

  // Listen for fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Keyboard navigation for presentations & single-page PDFs
  useEffect(() => {
    if (!activeDoc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (activeDoc.kind === 'presentation' && activeDoc.slides) {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          setSlideIndex((i) => Math.min(activeDoc.slides!.length - 1, i + 1));
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          setSlideIndex((i) => Math.max(0, i - 1));
        }
      } else if (
        activeDoc.kind === 'pdf' &&
        pdfScrollMode === 'single' &&
        activeDoc.pdfPageCount
      ) {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          setPdfPage((p) => Math.min(activeDoc.pdfPageCount!, p + 1));
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          setPdfPage((p) => Math.max(1, p - 1));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeDoc, pdfScrollMode]);

  const openFiles = async (
    incoming: File[],
    meta?: { nativePath?: string; folder?: string }
  ) => {
    if (incoming.length === 0) return;
    setErrorMsg(null);
    let lastLoadedId: string | null = null;
    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i];
      setLoadingMsg(
        incoming.length > 1
          ? `Opening ${i + 1}/${incoming.length}: ${file.name}...`
          : `Opening ${file.name}...`
      );
      try {
        const loaded = await loadFileIntoViewer(file, (msg) =>
          setLoadingMsg(`${file.name} — ${msg}`)
        );
        setDocs((prev) => [...prev, loaded]);
        lastLoadedId = loaded.id;
        // Persist in Recently Viewed history
        saveRecentFile(file, loaded.kind, loaded.kindLabel, meta).then(setRecentFiles);
      } catch (err) {
        setErrorMsg(
          `Could not open "${file.name}". ${
            err instanceof Error ? err.message : 'Unsupported or corrupted structure.'
          }`
        );
      }
    }
    if (lastLoadedId) {
      setActiveDocId(lastLoadedId);
      setShowHub(false);
    }
    setLoadingMsg(null);
  };

  // Listen for Android Open-With (ACTION_VIEW) file intents
  useEffect(() => {
    const consumePayload = async (payload?: IncomingAndroidFilePayload) => {
      if (!payload || !payload.base64 || !payload.name) return;
      try {
        const binary = atob(payload.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const file = new globalThis.File([bytes], payload.name, {
          type: payload.mimeType || 'application/octet-stream',
          lastModified: Date.now(),
        });
        await openFiles([file], { folder: 'Opened Externally' });
      } catch {
        setErrorMsg(`Could not open incoming file "${payload.name}".`);
      }
    };

    const win = window as Window & {
      __KAAGAZ_INCOMING_FILE__?: IncomingAndroidFilePayload;
    };
    if (win.__KAAGAZ_INCOMING_FILE__) {
      const pending = win.__KAAGAZ_INCOMING_FILE__;
      delete win.__KAAGAZ_INCOMING_FILE__;
      consumePayload(pending);
    }

    const onIncoming = (e: Event) => {
      const detail = (e as CustomEvent<IncomingAndroidFilePayload>).detail;
      if (detail) {
        delete win.__KAAGAZ_INCOMING_FILE__;
        consumePayload(detail);
      }
    };
    window.addEventListener('kaagaz-incoming-file', onIncoming);
    return () => window.removeEventListener('kaagaz-incoming-file', onIncoming);
  }, []);

  const handleOpenDeviceEntry = async (entry: DeviceFileEntry) => {
    setErrorMsg(null);
    setLoadingMsg(`Reading ${entry.name}...`);
    try {
      const file = entry.browserFile
        ? entry.browserFile
        : await readAndroidFileByPath(entry.path, entry.name, entry.lastModified);
      await openFiles([file], {
        nativePath: entry.browserFile ? undefined : entry.path,
        folder: entry.folder,
      });
    } catch (err) {
      setErrorMsg(
        `Could not open "${entry.name}". ${
          err instanceof Error ? err.message : 'Unable to read from device storage.'
        }`
      );
      setLoadingMsg(null);
    }
  };

  const handleOpenRecentEntry = async (entry: RecentViewedFile) => {
    setErrorMsg(null);
    setLoadingMsg(`Reopening ${entry.name}...`);
    try {
      const file = await loadRecentFileObject(entry);
      await openFiles([file], {
        nativePath: entry.nativePath,
        folder: entry.folder,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : `Could not reopen "${entry.name}". Please open it again from storage.`
      );
      setLoadingMsg(null);
    }
  };

  const handleRemoveRecent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await removeRecentFile(id);
    setRecentFiles(updated);
  };

  const handleClearRecents = async () => {
    await clearRecentFiles();
    setRecentFiles([]);
  };

  const filteredDeviceFiles = useMemo(() => {
    const q = deviceSearch.trim().toLowerCase();
    return deviceFiles.filter((entry) => {
      if (deviceCategory === 'pdf' && entry.kind !== 'pdf') return false;
      if (
        deviceCategory === 'office' &&
        !['word', 'spreadsheet', 'presentation'].includes(entry.kind)
      ) {
        return false;
      }
      if (deviceCategory === 'image' && entry.kind !== 'image') return false;
      if (
        deviceCategory === 'text' &&
        !['text', 'markdown', 'html', 'json', 'code'].includes(entry.kind)
      ) {
        return false;
      }
      if (deviceCategory === 'archive' && entry.kind !== 'archive') return false;
      if (!q) return true;
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.folder.toLowerCase().includes(q) ||
        entry.kindLabel.toLowerCase().includes(q)
      );
    });
  }, [deviceFiles, deviceCategory, deviceSearch]);

  const handleOpenSample = async (type: SampleDocType) => {
    setLoadingMsg('Generating sample document...');
    setErrorMsg(null);
    try {
      const sample = await createViewerSampleFile(type);
      await openFiles([sample], { folder: 'Built-in Samples' });
    } catch {
      setErrorMsg('Failed to generate sample document.');
      setLoadingMsg(null);
    }
  };

  const closeTab = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = docs.find((d) => d.id === id);
    if (target) revokeViewerDocumentUrls(target);
    setDocs((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (activeDocId === id) {
        setActiveDocId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
  };

  const handleOpenArchiveEntry = async (entryPath: string) => {
    if (!activeDoc) return;
    setLoadingMsg(`Extracting ${entryPath}...`);
    try {
      const extracted = await extractFileFromArchive(activeDoc.file, entryPath);
      await openFiles([extracted]);
    } catch {
      setErrorMsg(`Unable to extract "${entryPath}" from archive.`);
      setLoadingMsg(null);
    }
  };

  const handleDownloadArchiveEntry = async (entryPath: string) => {
    if (!activeDoc) return;
    try {
      const extracted = await extractFileFromArchive(activeDoc.file, entryPath);
      triggerDownload(extracted, extracted.name, extracted.type);
    } catch {
      setErrorMsg(`Unable to download "${entryPath}".`);
    }
  };

  const handleToggleFullscreen = async () => {
    if (!viewerShellRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await viewerShellRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen browser restriction inside iframes
    }
  };

  const handleCopyText = async () => {
    if (!activeDoc) return;
    const text =
      activeDoc.formattedJson ||
      activeDoc.rawText ||
      '';
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleExportActiveSheetCsv = () => {
    if (!activeDoc?.spreadsheet || !activeSheet) return;
    const rows = activeDoc.spreadsheet.sheets[activeSheet] || [];
    const csv = rows
      .map((r) =>
        r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, `${activeSheet}.csv`, 'text/csv');
  };

  const jumpToPdfPage = (pageNum: number) => {
    setPdfPage(pageNum);
    if (pdfScrollMode === 'continuous') {
      pageRefs.current[pageNum]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Search matches across PDF pages
  const pdfSearchMatches = useMemo(() => {
    if (!activeDoc?.pdfPages || !searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return activeDoc.pdfPages
      .filter((p) => p.text.toLowerCase().includes(q))
      .map((p) => p.pageNumber);
  }, [activeDoc, searchQuery]);

  // Filtered spreadsheet rows
  const filteredSheetRows = useMemo(() => {
    if (!activeDoc?.spreadsheet || !activeSheet) return { header: [] as string[], body: [] as string[][] };
    const rows = activeDoc.spreadsheet.sheets[activeSheet] || [];
    if (rows.length === 0) return { header: [], body: [] };
    const header = rows[0];
    const body = rows.slice(1);
    if (!searchQuery.trim()) return { header, body };
    const q = searchQuery.trim().toLowerCase();
    return {
      header,
      body: body.filter((row) =>
        row.some((cell) => String(cell).toLowerCase().includes(q))
      ),
    };
  }, [activeDoc, activeSheet, searchQuery]);

  // Text / code search match count
  const textLines = useMemo(() => {
    if (!activeDoc) return [];
    const src = activeDoc.kind === 'json' ? activeDoc.formattedJson || '' : activeDoc.rawText || '';
    return src.split('\n');
  }, [activeDoc]);

  const textSearchMatchCount = useMemo(() => {
    if (!searchQuery.trim() || textLines.length === 0) return 0;
    const q = searchQuery.trim().toLowerCase();
    return textLines.filter((l) => l.toLowerCase().includes(q)).length;
  }, [textLines, searchQuery]);

  const supportsZoom =
    activeDoc &&
    ['pdf', 'word', 'image', 'markdown', 'presentation'].includes(activeDoc.kind);
  const supportsRotate =
    activeDoc && ['pdf', 'image'].includes(activeDoc.kind);
  const supportsSearch =
    activeDoc &&
    ['pdf', 'spreadsheet', 'code', 'text', 'json', 'markdown', 'html'].includes(
      activeDoc.kind
    );
  const supportsCopy =
    activeDoc && Boolean(activeDoc.rawText || activeDoc.formattedJson);

  const colLetter = (idx: number) => {
    let s = '';
    let n = idx;
    while (n >= 0) {
      s = String.fromCharCode((n % 26) + 65) + s;
      n = Math.floor(n / 26) - 1;
    }
    return s;
  };

  return (
    <div
      ref={viewerShellRef}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = Array.from(e.dataTransfer.files || []);
        if (dropped.length > 0) openFiles(dropped);
      }}
      className={`relative flex flex-col ${
        isFullscreen
          ? 'h-screen bg-[#F5F5F7] dark:bg-[#08080A] p-4'
          : 'min-h-[calc(100vh-8rem)]'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_ALL_TYPES}
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files || []);
          if (picked.length > 0) openFiles(picked);
          e.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={(e) => {
          const picked = Array.from(e.target.files || []);
          if (picked.length > 0) {
            setDeviceFiles(mapBrowserFilesToDeviceEntries(picked));
          }
          e.target.value = '';
        }}
      />

      {/* Global Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-[#0A84FF]/12 backdrop-blur-sm border-2 border-dashed border-[#0A84FF] flex items-center justify-center pointer-events-none">
          <div className="rounded-2xl bg-white/95 dark:bg-[#141418]/95 border border-black/[0.08] dark:border-white/[0.1] px-8 py-6 text-center shadow-2xl">
            <Upload className="w-8 h-8 text-[#0A84FF] mx-auto mb-2" strokeWidth={1.6} />
            <p className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Drop files to open in Universal Viewer
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              PDF, Word, Excel, PowerPoint, Images, Markdown, HTML, JSON, Code, ZIP & Media
            </p>
          </div>
        </div>
      )}

      {/* Header Row when not fullscreen */}
      {!isFullscreen && (
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-black/[0.06] dark:border-white/[0.07]">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#1D1D1F] dark:text-[#F5F5F7] text-balance">
              Universal Document Viewer
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Open and inspect PDF, Word, Excel, PowerPoint, Images, Markdown, HTML, JSON, Code, ZIP archives, and media directly from your device.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {docs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHub((prev) => !prev)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition whitespace-nowrap ${
                  showHub
                    ? 'border-[#0071E3] dark:border-[#0A84FF] bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF]'
                    : 'border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#141418] text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-black/[0.18] dark:hover:border-white/[0.2]'
                }`}
              >
                {showHub ? (
                  <>
                    <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.7} />
                    Back to Reader ({docs.length})
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" strokeWidth={1.7} />
                    Files & Recents
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-92 text-white text-xs font-medium flex items-center gap-2 transition whitespace-nowrap shrink-0"
            >
              <FolderOpen className="w-4 h-4" strokeWidth={1.7} />
              Open Files
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-3 text-xs text-rose-600 dark:text-rose-400">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="p-1 rounded hover:bg-rose-500/15"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loadingMsg && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-[#0A84FF]/10 border border-[#0A84FF]/25 flex items-center gap-2.5 text-xs text-[#0071E3] dark:text-[#0A84FF]">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>{loadingMsg}</span>
        </div>
      )}

      {/* FILES & RECENTS HUB: Shown when no tabs are open or when user toggles Files & Recents */}
      {docs.length === 0 || showHub ? (
        <div className="mt-6 space-y-6">
          {/* RECENTLY VIEWED FILES */}
          <section className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" strokeWidth={1.6} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Recently Viewed
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Reopen previously inspected documents instantaneously from local storage.
                  </p>
                </div>
              </div>
              {recentFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRecents}
                  className="text-xs text-slate-500 hover:text-rose-500 transition flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                  Clear all
                </button>
              )}
            </div>

            {recentFiles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.09] px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No recently viewed files yet. Any document you open will appear here for instant one-tap reopening.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {recentFiles.map((entry) => (
                  <div
                    key={entry.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenRecentEntry(entry)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenRecentEntry(entry);
                      }
                    }}
                    className="group flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-xl border border-black/[0.06] dark:border-white/[0.07] bg-black/[0.015] dark:bg-white/[0.02] hover:border-[#0071E3] dark:hover:border-[#0A84FF] cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] flex items-center justify-center shrink-0 ${getKindTint(
                          entry.kind
                        )}`}
                      >
                        {getKindIcon(entry.kind, 'w-4 h-4')}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                          {entry.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                          <span className="font-mono tabular-nums">{formatBytes(entry.size)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelativeTime(entry.viewedAt)}</span>
                          {entry.folder && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{entry.folder}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveRecent(entry.id, e)}
                      aria-label={`Remove ${entry.name} from recent files`}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] opacity-70 group-hover:opacity-100 transition shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* DEVICE STORAGE BROWSER (Native Android Storage Access + Desktop Local Folder Browser) */}
          <section className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
                  {isAndroid ? (
                    <Smartphone className="w-4 h-4" strokeWidth={1.6} />
                  ) : (
                    <HardDrive className="w-4 h-4" strokeWidth={1.6} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Device Storage
                    </h2>
                    {deviceFiles.length > 0 && (
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {filteredDeviceFiles.length} / {deviceFiles.length} files
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isAndroid
                      ? 'Browse all documents, PDFs, Office files, and images directly from phone storage.'
                      : 'Index any local folder on your device to search and open files in one click.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isAndroid ? (
                  hasStoragePerm ? (
                    <button
                      type="button"
                      onClick={refreshAndroidStorage}
                      disabled={scanningDevice}
                      className="px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] hover:border-[#0071E3] dark:hover:border-[#0A84FF] text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5 transition"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${scanningDevice ? 'animate-spin' : ''}`}
                        strokeWidth={1.6}
                      />
                      {scanningDevice ? 'Scanning...' : 'Refresh'}
                    </button>
                  ) : null
                ) : (
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] hover:border-[#0071E3] dark:hover:border-[#0A84FF] text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5 transition"
                  >
                    <Folder className="w-3.5 h-3.5" strokeWidth={1.6} />
                    {deviceFiles.length > 0 ? 'Change Folder' : 'Browse Folder'}
                  </button>
                )}
              </div>
            </div>

            {isAndroid && !hasStoragePerm ? (
              <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.09] bg-black/[0.015] dark:bg-white/[0.02] p-6 text-center">
                <div className="w-11 h-11 rounded-xl bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-5 h-5" strokeWidth={1.6} />
                </div>
                <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Allow Device Storage Access
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                  Grant All Files Access so KAAGAZ can list your PDFs, Word docs, spreadsheets, presentations, and images directly on your phone with zero internet connection.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => requestAndroidStoragePermission()}
                    className="px-4 py-2 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-92 text-white text-xs font-medium transition"
                  >
                    Grant Storage Access
                  </button>
                  <button
                    type="button"
                    onClick={refreshAndroidStorage}
                    className="px-3.5 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-[#1D1D1F] dark:hover:text-white transition"
                  >
                    I Already Allowed It
                  </button>
                </div>
              </div>
            ) : deviceFiles.length > 0 ? (
              <div className="space-y-3">
                {/* Search & Category Filter Row */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={deviceSearch}
                      onChange={(e) => setDeviceSearch(e.target.value)}
                      placeholder="Filter device files by name or folder..."
                      className="w-full pl-8 pr-8 py-2 rounded-xl text-xs bg-black/[0.025] dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:border-[#0071E3] dark:focus:border-[#0A84FF]"
                    />
                    {deviceSearch && (
                      <button
                        type="button"
                        onClick={() => setDeviceSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'pdf', label: 'PDF' },
                        { id: 'office', label: 'Office' },
                        { id: 'image', label: 'Images' },
                        { id: 'text', label: 'Text & Code' },
                        { id: 'archive', label: 'Archives' },
                      ] as { id: DeviceCategoryFilter; label: string }[]
                    ).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setDeviceCategory(cat.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${
                          deviceCategory === cat.id
                            ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white'
                            : 'bg-black/[0.03] dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-[#1D1D1F] dark:hover:text-white'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Device Files List */}
                {filteredDeviceFiles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.09] px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    No matching documents found for your current filter.
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto divide-y divide-black/[0.05] dark:divide-white/[0.06] rounded-xl border border-black/[0.06] dark:border-white/[0.07]">
                    {filteredDeviceFiles.map((entry) => (
                      <button
                        key={entry.path}
                        type="button"
                        onClick={() => handleOpenDeviceEntry(entry)}
                        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-black/[0.025] dark:hover:bg-white/[0.035] transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] flex items-center justify-center shrink-0 ${getKindTint(
                              entry.kind
                            )}`}
                          >
                            {getKindIcon(entry.kind, 'w-4 h-4')}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                              {entry.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                              <span className="truncate">{entry.folder}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums shrink-0">
                                {formatBytes(entry.size)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-[#0071E3] dark:text-[#0A84FF] shrink-0">
                          Open
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : isAndroid ? (
              <div className="rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.09] px-4 py-8 text-center">
                {scanningDevice ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-[#0071E3] dark:text-[#0A84FF]">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Scanning phone storage for documents...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No supported documents were found in internal storage yet.
                    </p>
                    <button
                      type="button"
                      onClick={refreshAndroidStorage}
                      className="px-3.5 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7]"
                    >
                      Scan Storage Again
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className="group rounded-xl border border-dashed border-black/[0.14] dark:border-white/[0.14] hover:border-[#0071E3] dark:hover:border-[#0A84FF] bg-black/[0.015] dark:bg-white/[0.02] p-8 sm:p-10 text-center cursor-pointer transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5" strokeWidth={1.6} />
                </div>
                <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Drop any document, spreadsheet, deck, image, or archive here
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xl mx-auto">
                  Select multiple files at once or browse a local folder to index and open documents with zero uploads.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  <span className="px-4 py-2 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-medium">
                    Browse Files
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      folderInputRef.current?.click();
                    }}
                    className="px-4 py-2 rounded-xl border border-black/[0.09] dark:border-white/[0.11] bg-white dark:bg-[#16161A] text-[#1D1D1F] dark:text-[#F5F5F7] text-xs font-medium hover:border-[#0071E3] dark:hover:border-[#0A84FF] transition"
                  >
                    Browse Local Folder
                  </button>
                </div>
                <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">
                  PDF · DOCX · XLSX / CSV · PPTX · PNG / JPG / SVG / WebP · Markdown · HTML · JSON · Code · TXT · ZIP · Audio / Video
                </p>
              </div>
            )}
          </section>

          {/* Supported Format Highlights & Instant Sample Launchers */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-6">
              <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Supported document families
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-5">
                Native in-browser rendering tailored to each file format.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {[
                  {
                    kind: 'pdf' as ViewerDocumentKind,
                    title: 'PDF Documents',
                    detail: 'High-DPI pages, thumbnails, zoom, rotate & full-text find',
                  },
                  {
                    kind: 'word' as ViewerDocumentKind,
                    title: 'Word & Rich Text',
                    detail: 'Formatted .docx paper view with typography & word count',
                  },
                  {
                    kind: 'spreadsheet' as ViewerDocumentKind,
                    title: 'Excel & CSV Sheets',
                    detail: 'Multi-sheet tabs, sticky headers, row filter & CSV export',
                  },
                  {
                    kind: 'presentation' as ViewerDocumentKind,
                    title: 'PowerPoint Decks',
                    detail: '16:9 slide canvas, filmstrip rail & presentation mode',
                  },
                  {
                    kind: 'image' as ViewerDocumentKind,
                    title: 'Images & Vectors',
                    detail: 'Zoom to 400%, rotate, flip & transparency checkerboard',
                  },
                  {
                    kind: 'code' as ViewerDocumentKind,
                    title: 'Markdown, HTML, JSON & Code',
                    detail: 'Live preview or line-numbered source with syntax-safe sandbox',
                  },
                  {
                    kind: 'archive' as ViewerDocumentKind,
                    title: 'ZIP Archives',
                    detail: 'Browse archive tree & open nested files directly in tabs',
                  },
                  {
                    kind: 'video' as ViewerDocumentKind,
                    title: 'Audio, Video & Binary',
                    detail: 'Native media playback plus SHA-256 & Hex inspector fallback',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5 ${getKindTint(
                        item.kind
                      )}`}
                    >
                      {getKindIcon(item.kind, 'w-4 h-4')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Try with instant sample files
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
                  Launch built-in sample documents to test multi-tab reading right away.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { type: 'pdf', label: 'Sample PDF', ext: '.pdf', kind: 'pdf' },
                      { type: 'docx', label: 'Word Doc', ext: '.docx', kind: 'word' },
                      { type: 'xlsx', label: 'Excel Ledger', ext: '.xlsx', kind: 'spreadsheet' },
                      { type: 'pptx', label: 'Slide Deck', ext: '.pptx', kind: 'presentation' },
                      { type: 'md', label: 'Markdown', ext: '.md', kind: 'markdown' },
                      { type: 'json', label: 'JSON Manifest', ext: '.json', kind: 'json' },
                      { type: 'image', label: 'Visual Slide', ext: '.jpg', kind: 'image' },
                    ] as { type: SampleDocType; label: string; ext: string; kind: ViewerDocumentKind }[]
                  ).map((s) => (
                    <button
                      key={s.type}
                      type="button"
                      onClick={() => handleOpenSample(s.type)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.07] bg-black/[0.015] dark:bg-white/[0.02] hover:border-[#0071E3] dark:hover:border-[#0A84FF] text-left transition"
                    >
                      <span className={getKindTint(s.kind)}>
                        {getKindIcon(s.kind, 'w-4 h-4')}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                          {s.label}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {s.ext}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-black/[0.05] dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400">
                Tip: Drag and drop multiple files of different formats at once to inspect them side by side in tabs.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE MULTI-TAB DOCUMENT VIEWER */
        <div className="mt-5 flex-1 flex flex-col rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.07] dark:border-white/[0.08] overflow-hidden min-h-[680px]">
          {/* Multi-Document Tab Strip */}
          <div className="flex items-center gap-1 px-2 pt-2 border-b border-black/[0.06] dark:border-white/[0.07] bg-black/[0.02] dark:bg-[#0D0D10] overflow-x-auto">
            {docs.map((doc) => {
              const active = doc.id === activeDocId;
              return (
                <div
                  key={doc.id}
                  role="tab"
                  aria-selected={active}
                  tabIndex={0}
                  onClick={() => setActiveDocId(doc.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveDocId(doc.id);
                    }
                  }}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-t-xl text-xs font-medium cursor-pointer border border-b-0 transition shrink-0 max-w-[230px] ${
                    active
                      ? 'bg-white dark:bg-[#121215] border-black/[0.07] dark:border-white/[0.09] text-[#1D1D1F] dark:text-[#F5F5F7]'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`shrink-0 ${getKindTint(doc.kind)}`}>
                    {getKindIcon(doc.kind, 'w-3.5 h-3.5')}
                  </span>
                  <span className="truncate">{doc.name}</span>
                  <button
                    type="button"
                    onClick={(e) => closeTab(doc.id, e)}
                    aria-label={`Close ${doc.name}`}
                    className="p-0.5 rounded hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-slate-400 hover:text-rose-500 transition shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-2 mb-1 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#0071E3] dark:hover:text-[#0A84FF] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition whitespace-nowrap shrink-0"
              title="Open more documents"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add file</span>
            </button>
          </div>

          {/* Contextual Viewer Toolbar */}
          {activeDoc && (
            <div className="px-3 sm:px-4 py-2.5 border-b border-black/[0.06] dark:border-white/[0.07] bg-white/95 dark:bg-[#121215] flex flex-wrap items-center justify-between gap-2">
              {/* Left Group: Sidebar toggle + Format specific navigation */}
              <div className="flex items-center gap-2 min-w-0">
                {(activeDoc.kind === 'pdf' || activeDoc.kind === 'presentation') && (
                  <button
                    type="button"
                    onClick={() => setShowSidebar((s) => !s)}
                    className={`p-1.5 rounded-lg border text-xs transition ${
                      showSidebar
                        ? 'border-[#0A84FF]/40 bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF]'
                        : 'border-black/[0.07] dark:border-white/[0.08] text-slate-500 hover:text-[#1D1D1F] dark:hover:text-white'
                    }`}
                    title="Toggle page/slide sidebar"
                  >
                    <PanelLeft className="w-4 h-4" strokeWidth={1.6} />
                  </button>
                )}

                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                  <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {activeDoc.kindLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{formatBytes(activeDoc.size)}</span>
                  {activeDoc.kind === 'pdf' && activeDoc.pdfPageCount && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {activeDoc.pdfPageCount} pages
                      </span>
                    </>
                  )}
                  {activeDoc.kind === 'image' && activeDoc.imageWidth ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {activeDoc.imageWidth}×{activeDoc.imageHeight}
                      </span>
                    </>
                  ) : null}
                  {activeDoc.wordCount !== undefined && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {activeDoc.wordCount.toLocaleString()} words
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Center Group: Format-Specific Controls */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* PDF Page Nav & Mode */}
                {activeDoc.kind === 'pdf' && activeDoc.pdfPageCount && (
                  <>
                    <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.07]">
                      <button
                        type="button"
                        disabled={pdfPage <= 1}
                        onClick={() => jumpToPdfPage(Math.max(1, pdfPage - 1))}
                        className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] disabled:opacity-35"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-mono tabular-nums px-1.5">
                        {pdfPage} / {activeDoc.pdfPageCount}
                      </span>
                      <button
                        type="button"
                        disabled={pdfPage >= activeDoc.pdfPageCount}
                        onClick={() =>
                          jumpToPdfPage(Math.min(activeDoc.pdfPageCount!, pdfPage + 1))
                        }
                        className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] disabled:opacity-35"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => {
                          setPdfViewText(false);
                          setPdfScrollMode('continuous');
                        }}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap ${
                          !pdfViewText && pdfScrollMode === 'continuous'
                            ? 'bg-white dark:bg-[#222227] text-[#1D1D1F] dark:text-white shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Scroll
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPdfViewText(false);
                          setPdfScrollMode('single');
                        }}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap ${
                          !pdfViewText && pdfScrollMode === 'single'
                            ? 'bg-white dark:bg-[#222227] text-[#1D1D1F] dark:text-white shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Page
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfViewText(true)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap ${
                          pdfViewText
                            ? 'bg-white dark:bg-[#222227] text-[#1D1D1F] dark:text-white shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Text
                      </button>
                    </div>
                  </>
                )}

                {/* Presentation Slide Nav */}
                {activeDoc.kind === 'presentation' && activeDoc.slides && (
                  <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.07]">
                    <button
                      type="button"
                      disabled={slideIndex <= 0}
                      onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                      className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] disabled:opacity-35"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono tabular-nums px-1.5">
                      Slide {slideIndex + 1} / {activeDoc.slides.length}
                    </span>
                    <button
                      type="button"
                      disabled={slideIndex >= activeDoc.slides.length - 1}
                      onClick={() =>
                        setSlideIndex((i) => Math.min(activeDoc.slides!.length - 1, i + 1))
                      }
                      className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] disabled:opacity-35"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Markdown / HTML Preview vs Source Switch */}
                {(activeDoc.kind === 'markdown' || activeDoc.kind === 'html') && (
                  <div className="flex items-center p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setSourceMode('preview')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 whitespace-nowrap ${
                        sourceMode === 'preview'
                          ? 'bg-white dark:bg-[#222227] text-[#1D1D1F] dark:text-white shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <Eye className="w-3 h-3" /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceMode('source')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 whitespace-nowrap ${
                        sourceMode === 'source'
                          ? 'bg-white dark:bg-[#222227] text-[#1D1D1F] dark:text-white shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <Code2 className="w-3 h-3" /> Source
                    </button>
                  </div>
                )}

                {/* Image Extras */}
                {activeDoc.kind === 'image' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setFlipX((f) => !f)}
                      className={`p-1.5 rounded-lg border text-xs transition ${
                        flipX
                          ? 'border-[#0A84FF]/40 bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF]'
                          : 'border-black/[0.07] dark:border-white/[0.08] text-slate-500 hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                      title="Flip horizontal"
                    >
                      <FlipHorizontal2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckerboard((c) => !c)}
                      className={`p-1.5 rounded-lg border text-xs transition ${
                        checkerboard
                          ? 'border-[#0A84FF]/40 bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF]'
                          : 'border-black/[0.07] dark:border-white/[0.08] text-slate-500 hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                      title="Toggle transparency grid"
                    >
                      <Grid2x2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {/* Code / Text Word Wrap */}
                {(activeDoc.kind === 'code' ||
                  activeDoc.kind === 'text' ||
                  activeDoc.kind === 'json' ||
                  sourceMode === 'source') && (
                  <button
                    type="button"
                    onClick={() => setWordWrap((w) => !w)}
                    className={`p-1.5 rounded-lg border text-xs transition ${
                      wordWrap
                        ? 'border-[#0A84FF]/40 bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF]'
                        : 'border-black/[0.07] dark:border-white/[0.08] text-slate-500'
                    }`}
                    title="Toggle word wrap"
                  >
                    <WrapText className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Zoom Controls */}
                {supportsZoom && (
                  <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.07]">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(25, z - 25))}
                      className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                      title="Zoom out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom(100)}
                      className="px-1.5 text-[11px] font-mono tabular-nums text-slate-700 dark:text-slate-200"
                      title="Reset zoom to 100%"
                    >
                      {zoom}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(300, z + 25))}
                      className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                      title="Zoom in"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {supportsRotate && (
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-lg border border-black/[0.07] dark:border-white/[0.08] text-slate-500 hover:text-[#1D1D1F] dark:hover:text-white transition"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                )}

                {supportsSearch && (
                  <button
                    type="button"
                    onClick={() => setShowSearch((s) => !s)}
                    className={`p-1.5 rounded-lg border transition ${
                      showSearch
                        ? 'border-[#0A84FF]/40 bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF]'
                        : 'border-black/[0.07] dark:border-white/[0.08] text-slate-500 hover:text-[#1D1D1F] dark:hover:text-white'
                    }`}
                    title="Find in document"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                )}

                {supportsCopy && (
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="p-1.5 rounded-lg border border-black/[0.07] dark:border-white/[0.08] text-slate-500 hover:text-[#1D1D1F] dark:hover:text-white transition"
                    title="Copy document text"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => triggerNativePrint(activeDoc.name)}
                  className="p-1.5 rounded-lg border border-black/[0.07] dark:border-white/[0.08] text-slate-500 hover:text-[#1D1D1F] dark:hover:text-white transition"
                  title="Print document"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    triggerDownload(activeDoc.file, activeDoc.name, activeDoc.mimeType)
                  }
                  className="p-1.5 rounded-lg border border-black/[0.07] dark:border-white/[0.08] text-slate-500 hover:text-[#1D1D1F] dark:hover:text-white transition"
                  title="Download original file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowInspector((i) => !i)}
                  className={`p-1.5 rounded-lg border transition ${
                    showInspector
                      ? 'border-[#0A84FF]/40 bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF]'
                      : 'border-black/[0.07] dark:border-white/[0.08] text-slate-500 hover:text-[#1D1D1F] dark:hover:text-white'
                  }`}
                  title="Document properties"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="p-1.5 rounded-lg border border-black/[0.07] dark:border-white/[0.08] text-slate-500 hover:text-[#1D1D1F] dark:hover:text-white transition"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen reader'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Contextual Find Bar */}
          {showSearch && activeDoc && (
            <div className="px-4 py-2 border-b border-black/[0.06] dark:border-white/[0.07] bg-black/[0.015] dark:bg-white/[0.02] flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeDoc.kind === 'spreadsheet'
                      ? 'Filter rows by cell value...'
                      : 'Search text inside document...'
                  }
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-[#0C0C0F] border border-black/[0.08] dark:border-white/[0.1] text-xs focus:outline-none focus:border-[#0A84FF]"
                />
              </div>

              {activeDoc.kind === 'pdf' && searchQuery.trim() && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-500 tabular-nums">
                    {pdfSearchMatches.length} matching page{pdfSearchMatches.length === 1 ? '' : 's'}:
                  </span>
                  {pdfSearchMatches.slice(0, 10).map((pNum) => (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => jumpToPdfPage(pNum)}
                      className="px-2 py-0.5 rounded bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] font-mono text-[11px] tabular-nums hover:bg-[#0A84FF]/25"
                    >
                      P.{pNum}
                    </button>
                  ))}
                </div>
              )}

              {activeDoc.kind === 'spreadsheet' && searchQuery.trim() && (
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {filteredSheetRows.body.length} matching row{filteredSheetRows.body.length === 1 ? '' : 's'}
                </span>
              )}

              {(activeDoc.kind === 'code' ||
                activeDoc.kind === 'text' ||
                activeDoc.kind === 'json') &&
                searchQuery.trim() && (
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {textSearchMatchCount} matching line{textSearchMatchCount === 1 ? '' : 's'}
                  </span>
                )}

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearch(false);
                }}
                className="ml-auto p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Main Reader Body + Optional Left Rail + Optional Right Inspector */}
          {activeDoc && (
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* LEFT THUMBNAIL / SLIDE RAIL */}
              {showSidebar && activeDoc.kind === 'pdf' && activeDoc.pdfPages && !pdfViewText && (
                <aside className="hidden md:flex flex-col w-40 shrink-0 border-r border-black/[0.06] dark:border-white/[0.07] bg-black/[0.015] dark:bg-[#0D0D10] overflow-y-auto p-3 space-y-2.5">
                  {activeDoc.pdfPages.map((p) => {
                    const isCurrent = p.pageNumber === pdfPage;
                    const isMatch = pdfSearchMatches.includes(p.pageNumber);
                    return (
                      <button
                        key={p.pageNumber}
                        type="button"
                        onClick={() => jumpToPdfPage(p.pageNumber)}
                        className={`w-full rounded-xl p-1.5 border text-center transition ${
                          isCurrent
                            ? 'border-[#0A84FF] bg-[#0A84FF]/10'
                            : isMatch
                              ? 'border-amber-500/60 bg-amber-500/10'
                              : 'border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.16] dark:hover:border-white/[0.18]'
                        }`}
                      >
                        <img
                          src={p.thumbUrl}
                          alt={`Page ${p.pageNumber}`}
                          className="w-full rounded-md bg-white border border-black/[0.05]"
                        />
                        <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {p.pageNumber}
                        </div>
                      </button>
                    );
                  })}
                </aside>
              )}

              {showSidebar &&
                activeDoc.kind === 'presentation' &&
                activeDoc.slides &&
                activeDoc.slides.length > 0 && (
                  <aside className="hidden md:flex flex-col w-48 shrink-0 border-r border-black/[0.06] dark:border-white/[0.07] bg-black/[0.015] dark:bg-[#0D0D10] overflow-y-auto p-3 space-y-2.5">
                    {activeDoc.slides.map((s, idx) => (
                      <button
                        key={s.slideNumber}
                        type="button"
                        onClick={() => setSlideIndex(idx)}
                        className={`w-full rounded-xl p-2.5 border text-left transition ${
                          idx === slideIndex
                            ? 'border-[#0A84FF] bg-[#0A84FF]/10'
                            : 'border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.16] dark:hover:border-white/[0.18] bg-white dark:bg-[#141418]'
                        }`}
                      >
                        <div className="text-[10px] font-mono tabular-nums text-slate-400">
                          Slide {String(s.slideNumber).padStart(2, '0')}
                        </div>
                        <div className="text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-2 mt-0.5">
                          {s.title}
                        </div>
                      </button>
                    ))}
                  </aside>
                )}

              {/* CENTRAL DOCUMENT CANVAS */}
              <div className="flex-1 min-w-0 overflow-auto bg-[#ECECEF]/60 dark:bg-[#08080A] p-4 sm:p-6">
                {/* 1. PDF VIEWER */}
                {activeDoc.kind === 'pdf' && activeDoc.pdfPages && (
                  pdfViewText ? (
                    <div className="max-w-3xl mx-auto rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.07] dark:border-white/[0.08] p-6 sm:p-8 space-y-6">
                      {activeDoc.pdfPages.map((p) => (
                        <div key={p.pageNumber} className="space-y-2">
                          <div className="text-xs font-mono text-slate-400 border-b border-black/[0.06] dark:border-white/[0.07] pb-1">
                            Page {p.pageNumber}
                          </div>
                          <p className="text-sm leading-relaxed text-[#1D1D1F] dark:text-slate-200 whitespace-pre-wrap select-text">
                            {p.text || '(No selectable text on this page — use OCR PDF to recognize scanned content.)'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                      {(pdfScrollMode === 'single'
                        ? activeDoc.pdfPages.filter((p) => p.pageNumber === pdfPage)
                        : activeDoc.pdfPages
                      ).map((page) => (
                        <div
                          key={page.pageNumber}
                          ref={(el) => {
                            pageRefs.current[page.pageNumber] = el;
                          }}
                          className="flex flex-col items-center"
                        >
                          <div
                            className="bg-white rounded-lg shadow-lg shadow-black/10 dark:shadow-black/50 overflow-hidden transition-transform duration-150"
                            style={{
                              width: `${Math.round(Math.min(840, page.width * 1.2) * (zoom / 100))}px`,
                              maxWidth: '100%',
                              transform: rotation ? `rotate(${rotation}deg)` : undefined,
                            }}
                          >
                            <img
                              src={page.dataUrl}
                              alt={`${activeDoc.name} page ${page.pageNumber}`}
                              className="w-full h-auto block"
                            />
                          </div>
                          <span className="mt-2 text-[11px] font-mono tabular-nums text-slate-500">
                            Page {page.pageNumber} of {activeDoc.pdfPageCount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* 2. WORD (.DOCX) VIEWER */}
                {activeDoc.kind === 'word' && (
                  <div
                    className="mx-auto rounded-2xl bg-white text-[#1D1D1F] shadow-lg shadow-black/10 border border-black/[0.08] p-8 sm:p-12 transition-all"
                    style={{
                      maxWidth: `${Math.round(780 * (zoom / 100))}px`,
                      fontSize: `${Math.round(15 * (zoom / 100))}px`,
                    }}
                  >
                    <article
                      className="space-y-4 leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left"
                      dangerouslySetInnerHTML={{ __html: activeDoc.wordHtml || '' }}
                    />
                  </div>
                )}

                {/* 3. SPREADSHEET (.XLSX / .CSV / .ODS) VIEWER */}
                {activeDoc.kind === 'spreadsheet' && activeDoc.spreadsheet && (
                  <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.07] dark:border-white/[0.08] overflow-hidden flex flex-col max-h-[620px]">
                    {/* Sheet Tabs + Export CSV */}
                    <div className="px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.07] bg-black/[0.02] dark:bg-[#0D0D10] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {activeDoc.spreadsheet.sheetNames.map((sheet) => (
                          <button
                            key={sheet}
                            type="button"
                            onClick={() => setActiveSheet(sheet)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                              activeSheet === sheet
                                ? 'bg-white dark:bg-[#1F1F24] text-[#0071E3] dark:text-[#0A84FF] shadow-xs'
                                : 'text-slate-500 hover:text-[#1D1D1F] dark:hover:text-white'
                            }`}
                          >
                            {sheet}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleExportActiveSheetCsv}
                        className="px-2.5 py-1 rounded-lg border border-black/[0.07] dark:border-white/[0.08] text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-[#0071E3] dark:hover:text-[#0A84FF] whitespace-nowrap"
                      >
                        Export Sheet CSV
                      </button>
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-auto">
                      {filteredSheetRows.header.length === 0 ? (
                        <div className="py-16 text-center text-sm text-slate-500">
                          This sheet is empty.
                        </div>
                      ) : (
                        <table className="w-full border-collapse text-xs">
                          <thead className="sticky top-0 z-10 bg-[#F5F5F7] dark:bg-[#18181C]">
                            <tr>
                              <th className="w-10 px-2 py-2 border-b border-r border-black/[0.07] dark:border-white/[0.08] text-center font-mono text-[10px] text-slate-400">
                                #
                              </th>
                              {filteredSheetRows.header.map((_, cIdx) => (
                                <th
                                  key={`col-${cIdx}`}
                                  className="px-3 py-1.5 border-b border-r border-black/[0.07] dark:border-white/[0.08] text-center font-mono text-[10px] text-slate-400"
                                >
                                  {colLetter(cIdx)}
                                </th>
                              ))}
                            </tr>
                            <tr className="bg-white dark:bg-[#141418]">
                              <th className="px-2 py-2 border-b border-r border-black/[0.07] dark:border-white/[0.08] text-center font-mono text-[11px] text-slate-400 tabular-nums">
                                1
                              </th>
                              {filteredSheetRows.header.map((cell, cIdx) => (
                                <th
                                  key={`hdr-${cIdx}`}
                                  className="px-3 py-2 border-b border-r border-black/[0.07] dark:border-white/[0.08] text-left font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap"
                                >
                                  {cell}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSheetRows.body.map((row, rIdx) => (
                              <tr
                                key={`row-${rIdx}`}
                                className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                              >
                                <td className="px-2 py-2 border-b border-r border-black/[0.05] dark:border-white/[0.06] text-center font-mono text-[11px] text-slate-400 tabular-nums">
                                  {rIdx + 2}
                                </td>
                                {filteredSheetRows.header.map((_, cIdx) => {
                                  const val = row[cIdx] ?? '';
                                  const isNumeric = /^[-+$€£¥]?\s?[\d,.]+%?$/.test(val.trim());
                                  return (
                                    <td
                                      key={`cell-${rIdx}-${cIdx}`}
                                      className={`px-3 py-2 border-b border-r border-black/[0.05] dark:border-white/[0.06] text-slate-700 dark:text-slate-200 whitespace-nowrap ${
                                        isNumeric ? 'text-right font-mono tabular-nums' : 'text-left'
                                      }`}
                                    >
                                      {val}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. PRESENTATION (.PPTX) VIEWER */}
                {activeDoc.kind === 'presentation' && activeDoc.slides && (
                  activeDoc.slides.length === 0 ? (
                    <div className="py-16 text-center text-sm text-slate-500">
                      No readable slides found in this presentation.
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[520px]">
                      {(() => {
                        const slide = activeDoc.slides[slideIndex] || activeDoc.slides[0];
                        return (
                          <div
                            className="w-full aspect-video rounded-2xl bg-[#111115] text-white border border-white/[0.1] shadow-2xl p-8 sm:p-12 flex flex-col justify-between transition-all"
                            style={{
                              maxWidth: `${Math.round(880 * (zoom / 100))}px`,
                            }}
                          >
                            <div>
                              <div className="text-xs font-mono text-[#0A84FF] tabular-nums mb-3">
                                Slide {String(slide.slideNumber).padStart(2, '0')} of{' '}
                                {String(activeDoc.slides.length).padStart(2, '0')}
                              </div>
                              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                                {slide.title}
                              </h2>
                              <div className="h-px bg-white/10 my-5" />
                              <div
                                className={`grid gap-6 ${
                                  slide.images.length > 0 ? 'grid-cols-1 md:grid-cols-12' : ''
                                }`}
                              >
                                <ul
                                  className={`space-y-3 text-sm sm:text-base text-slate-300 leading-relaxed ${
                                    slide.images.length > 0 ? 'md:col-span-7' : ''
                                  }`}
                                >
                                  {slide.bullets.length > 0 ? (
                                    slide.bullets.map((b, i) => (
                                      <li key={i} className="flex items-start gap-2.5">
                                        <span className="text-[#0A84FF] mt-0.5">•</span>
                                        <span>{b}</span>
                                      </li>
                                    ))
                                  ) : (
                                    <li className="text-slate-500 italic">
                                      Title slide
                                    </li>
                                  )}
                                </ul>
                                {slide.images.length > 0 && (
                                  <div className="md:col-span-5 flex items-center justify-center">
                                    <img
                                      src={slide.images[0]}
                                      alt={`Slide ${slide.slideNumber} visual`}
                                      className="max-h-56 rounded-xl border border-white/10 object-contain"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-4">
                              <span>{activeDoc.name}</span>
                              <span className="font-mono">Use ← / → keys to navigate</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )
                )}

                {/* 5. IMAGE VIEWER */}
                {activeDoc.kind === 'image' && activeDoc.imageUrl && (
                  <div
                    className={`min-h-[540px] rounded-2xl flex items-center justify-center p-6 overflow-auto ${
                      checkerboard
                        ? 'bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] bg-white dark:bg-[#141418]'
                        : 'bg-black/[0.03] dark:bg-[#0C0C0F]'
                    }`}
                  >
                    <img
                      src={activeDoc.imageUrl}
                      alt={activeDoc.name}
                      style={{
                        transform: `scale(${zoom / 100}) rotate(${rotation}deg) scaleX(${
                          flipX ? -1 : 1
                        })`,
                      }}
                      className="max-w-full max-h-[560px] object-contain rounded-lg shadow-lg transition-transform duration-150"
                    />
                  </div>
                )}

                {/* 6. MARKDOWN VIEWER */}
                {activeDoc.kind === 'markdown' && (
                  sourceMode === 'preview' ? (
                    <div
                      className="mx-auto rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.07] dark:border-white/[0.08] p-8 sm:p-10 transition-all"
                      style={{ maxWidth: `${Math.round(800 * (zoom / 100))}px` }}
                    >
                      <article
                        className="space-y-4 text-[15px] leading-relaxed text-[#1D1D1F] dark:text-slate-200 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_code]:font-mono [&_code]:text-xs [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-black/[0.05] dark:[&_code]:bg-white/[0.08] [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:bg-[#0D0D10] [&_pre]:text-slate-200 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-black/[0.1] dark:[&_th]:border-white/[0.1] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:bg-black/[0.03] dark:[&_th]:bg-white/[0.04] [&_td]:border [&_td]:border-black/[0.08] dark:[&_td]:border-white/[0.08] [&_td]:px-3 [&_td]:py-2"
                        dangerouslySetInnerHTML={{ __html: activeDoc.renderedHtml || '' }}
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.07] dark:border-white/[0.08] overflow-auto">
                      <pre
                        className={`p-5 text-xs font-mono leading-relaxed text-[#1D1D1F] dark:text-slate-200 ${
                          wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                        }`}
                      >
                        {activeDoc.rawText}
                      </pre>
                    </div>
                  )
                )}

                {/* 7. HTML SANDBOXED VIEWER */}
                {activeDoc.kind === 'html' && (
                  sourceMode === 'preview' ? (
                    <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden shadow-sm">
                      <iframe
                        title={`Preview of ${activeDoc.name}`}
                        sandbox=""
                        srcDoc={activeDoc.renderedHtml || ''}
                        className="w-full h-[600px] bg-white"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.07] dark:border-white/[0.08] overflow-auto">
                      <pre
                        className={`p-5 text-xs font-mono leading-relaxed text-[#1D1D1F] dark:text-slate-200 ${
                          wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                        }`}
                      >
                        {activeDoc.rawText}
                      </pre>
                    </div>
                  )
                )}

                {/* 8. JSON / CODE / PLAIN TEXT VIEWER */}
                {(activeDoc.kind === 'json' ||
                  activeDoc.kind === 'code' ||
                  activeDoc.kind === 'text') && (
                  <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.07] dark:border-white/[0.08] overflow-hidden">
                    {activeDoc.kind === 'json' && (
                      <div className="px-4 py-2 border-b border-black/[0.06] dark:border-white/[0.07] text-xs flex items-center justify-between text-slate-500">
                        <span>
                          {activeDoc.jsonValid
                            ? 'Valid JSON · Pretty-printed'
                            : 'Invalid JSON syntax — showing raw content'}
                        </span>
                        <span className="font-mono tabular-nums">
                          {textLines.length} lines
                        </span>
                      </div>
                    )}
                    <div className="overflow-auto max-h-[600px] p-4 font-mono text-xs leading-6">
                      {textLines.map((line, idx) => {
                        const q = searchQuery.trim().toLowerCase();
                        const isMatch = q && line.toLowerCase().includes(q);
                        return (
                          <div
                            key={idx}
                            className={`flex gap-4 px-2 rounded ${
                              isMatch ? 'bg-amber-500/20' : ''
                            }`}
                          >
                            <span className="w-10 text-right select-none text-slate-400 dark:text-slate-600 tabular-nums shrink-0">
                              {idx + 1}
                            </span>
                            <span
                              className={`text-[#1D1D1F] dark:text-slate-200 min-w-0 ${
                                wordWrap
                                  ? 'whitespace-pre-wrap break-all'
                                  : 'whitespace-pre'
                              }`}
                            >
                              {line || ' '}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 9. ZIP ARCHIVE INSPECTOR */}
                {activeDoc.kind === 'archive' && activeDoc.archiveEntries && (
                  <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.07] dark:border-white/[0.08] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.07] flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Archive contents · Click Preview to open any file inside a new tab
                      </span>
                      <span className="font-mono tabular-nums">
                        {activeDoc.archiveEntries.filter((e) => !e.isDir).length} files
                      </span>
                    </div>
                    <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] max-h-[580px] overflow-y-auto">
                      {activeDoc.archiveEntries.map((entry) => (
                        <div
                          key={entry.path}
                          className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={entry.isDir ? 'text-amber-500' : getKindTint(entry.kind)}>
                              {entry.isDir ? (
                                <FolderOpen className="w-4 h-4" strokeWidth={1.6} />
                              ) : (
                                getKindIcon(entry.kind, 'w-4 h-4')
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                                {entry.path}
                              </div>
                              {!entry.isDir && entry.uncompressedSize > 0 && (
                                <div className="text-[11px] font-mono tabular-nums text-slate-400">
                                  {formatBytes(entry.uncompressedSize)}
                                </div>
                              )}
                            </div>
                          </div>
                          {!entry.isDir && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenArchiveEntry(entry.path)}
                                className="px-2.5 py-1 rounded-lg bg-[#0A84FF]/12 text-[#0071E3] dark:text-[#0A84FF] text-xs font-medium hover:bg-[#0A84FF]/20 transition whitespace-nowrap"
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadArchiveEntry(entry.path)}
                                className="p-1.5 rounded-lg border border-black/[0.07] dark:border-white/[0.08] text-slate-500 hover:text-[#1D1D1F] dark:hover:text-white"
                                title="Download entry"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 10. AUDIO / VIDEO PLAYER */}
                {activeDoc.kind === 'audio' && activeDoc.mediaUrl && (
                  <div className="max-w-xl mx-auto my-12 rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.07] dark:border-white/[0.08] p-8 text-center space-y-5">
                    <div className="w-14 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] text-[#0A84FF] flex items-center justify-center mx-auto">
                      <FileAudio className="w-7 h-7" strokeWidth={1.6} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {activeDoc.name}
                      </div>
                      <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                        {formatBytes(activeDoc.size)} · {activeDoc.mimeType}
                      </div>
                    </div>
                    <audio controls src={activeDoc.mediaUrl} className="w-full" />
                  </div>
                )}

                {activeDoc.kind === 'video' && activeDoc.mediaUrl && (
                  <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden bg-black border border-white/[0.1] shadow-xl">
                    <video
                      controls
                      src={activeDoc.mediaUrl}
                      className="w-full max-h-[600px]"
                    />
                  </div>
                )}

                {/* 11. BINARY / HEX INSPECTOR FALLBACK */}
                {activeDoc.kind === 'binary' && (
                  <div className="max-w-4xl mx-auto rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.07] dark:border-white/[0.08] overflow-hidden">
                    <div className="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.07] flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          Binary File Inspector
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Showing hexadecimal & ASCII preview of the first 2 KB
                          {activeDoc.sha256Short ? ` · SHA-256: ${activeDoc.sha256Short}…` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          triggerDownload(activeDoc.file, activeDoc.name, activeDoc.mimeType)
                        }
                        className="px-3.5 py-1.5 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-medium"
                      >
                        Download File
                      </button>
                    </div>
                    <pre className="p-5 text-[11px] font-mono leading-5 text-slate-700 dark:text-slate-300 overflow-x-auto">
                      {activeDoc.hexPreview}
                    </pre>
                  </div>
                )}
              </div>

              {/* RIGHT DOCUMENT INSPECTOR DRAWER */}
              {showInspector && (
                <aside className="w-64 shrink-0 border-l border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#121215] p-5 space-y-4 overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.07]">
                    <h4 className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Document Info
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowInspector(false)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <dl className="space-y-3 text-xs">
                    <div>
                      <dt className="text-slate-400">File name</dt>
                      <dd className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] break-all mt-0.5">
                        {activeDoc.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Format</dt>
                      <dd className="text-[#1D1D1F] dark:text-slate-200 mt-0.5">
                        {activeDoc.kindLabel} (.{activeDoc.extension})
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">File size</dt>
                      <dd className="font-mono tabular-nums text-[#1D1D1F] dark:text-slate-200 mt-0.5">
                        {formatBytes(activeDoc.size)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">MIME type</dt>
                      <dd className="font-mono text-[11px] text-slate-500 break-all mt-0.5">
                        {activeDoc.mimeType}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Last modified</dt>
                      <dd className="font-mono tabular-nums text-[#1D1D1F] dark:text-slate-200 mt-0.5">
                        {new Date(activeDoc.lastModified).toLocaleString()}
                      </dd>
                    </div>
                    {activeDoc.pdfPageCount && (
                      <div>
                        <dt className="text-slate-400">Pages</dt>
                        <dd className="font-mono tabular-nums text-[#1D1D1F] dark:text-slate-200 mt-0.5">
                          {activeDoc.pdfPageCount}
                        </dd>
                      </div>
                    )}
                    {activeDoc.spreadsheet && (
                      <div>
                        <dt className="text-slate-400">Worksheets</dt>
                        <dd className="font-mono tabular-nums text-[#1D1D1F] dark:text-slate-200 mt-0.5">
                          {activeDoc.spreadsheet.sheetNames.length}
                        </dd>
                      </div>
                    )}
                    {activeDoc.slides && (
                      <div>
                        <dt className="text-slate-400">Slides</dt>
                        <dd className="font-mono tabular-nums text-[#1D1D1F] dark:text-slate-200 mt-0.5">
                          {activeDoc.slides.length}
                        </dd>
                      </div>
                    )}
                    {activeDoc.imageWidth ? (
                      <div>
                        <dt className="text-slate-400">Resolution</dt>
                        <dd className="font-mono tabular-nums text-[#1D1D1F] dark:text-slate-200 mt-0.5">
                          {activeDoc.imageWidth} × {activeDoc.imageHeight} px
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </aside>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
