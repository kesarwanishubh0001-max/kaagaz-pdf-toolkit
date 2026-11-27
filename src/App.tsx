import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  Pin,
  Clock,
  Wifi,
  WifiOff,
  Menu,
  X,
  Grid,
  FolderKanban,
  Gauge,
  ArrowRightLeft,
  Shield,
  Workflow,
  PenLine,
  Download,
  ChevronRight,
} from 'lucide-react';
import {
  PDF_TOOLS,
  CATEGORIES,
  ToolCategory,
  ToolId,
  PdfToolMeta,
} from './data/tools';
import { createSamplePdfFile, triggerDownload } from './utils/pdfEngine';
import { ToolIcon } from './components/ToolIcon';
import { CommandPalette } from './components/CommandPalette';
import {
  MergePdfWorkspace,
  SplitPdfWorkspace,
  RemovePagesWorkspace,
  ExtractPagesWorkspace,
  OrganizePdfWorkspace,
  ScanToPdfWorkspace,
  CompressPdfWorkspace,
} from './components/CoreWorkspaces';
import {
  JpgToPdfWorkspace,
  WordToPdfWorkspace,
  PowerPointToPdfWorkspace,
  ExcelToPdfWorkspace,
  HtmlToPdfWorkspace,
  MarkdownToPdfWorkspace,
} from './components/ConvertToPdfWorkspaces';
import {
  PdfToJpgWorkspace,
  PdfToPngWorkspace,
  PdfToWordWorkspace,
  PdfToPowerPointWorkspace,
  PdfToExcelWorkspace,
  PdfToPdfAWorkspace,
} from './components/ConvertFromPdfWorkspaces';
import {
  RepairPdfWorkspace,
  OcrPdfWorkspace,
  RotatePdfWorkspace,
  AddPageNumbersWorkspace,
  AddWatermarkWorkspace,
  CropPdfWorkspace,
  EditPdfWorkspace,
} from './components/OptimizeAndEditWorkspaces';
import {
  UnlockPdfWorkspace,
  ProtectPdfWorkspace,
  SignPdfWorkspace,
  RedactPdfWorkspace,
  ComparePdfWorkspace,
  FlattenPdfWorkspace,
  CustomWorkflowsWorkspace,
} from './components/SecurityAndWorkflowWorkspaces';

const DEFAULT_PINNED: ToolId[] = [
  'merge-pdf',
  'compress-pdf',
  'jpg-to-pdf',
  'pdf-to-word',
];

function getCategoryIcon(cat: ToolCategory) {
  const cls = 'w-4 h-4 shrink-0';
  switch (cat) {
    case 'All':
      return <Grid className={cls} />;
    case 'Organize':
      return <FolderKanban className={cls} />;
    case 'Optimize':
      return <Gauge className={cls} />;
    case 'Convert':
      return <ArrowRightLeft className={cls} />;
    case 'Edit PDF':
      return <PenLine className={cls} />;
    case 'Security':
      return <Shield className={cls} />;
    case 'Workflows':
      return <Workflow className={cls} />;
  }
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kaagaz-theme');
      if (saved === 'light') return false;
      if (saved === 'dark') return true;
    } catch {
      // ignore storage errors
    }
    return true;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('All');
  const [convertDirectionFilter, setConvertDirectionFilter] = useState<
    'all' | 'to-pdf' | 'from-pdf'
  >('all');
  const [inlineSearch, setInlineSearch] = useState('');
  const [activeToolId, setActiveToolId] = useState<ToolId | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [pinnedIds, setPinnedIds] = useState<ToolId[]>(() => {
    try {
      const raw = localStorage.getItem('kaagaz-pinned');
      if (raw) {
        const parsed = JSON.parse(raw) as ToolId[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_PINNED;
  });

  const [recentIds, setRecentIds] = useState<ToolId[]>(() => {
    try {
      const raw = localStorage.getItem('kaagaz-recent');
      if (raw) {
        const parsed = JSON.parse(raw) as ToolId[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('kaagaz-theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  // Real online/offline listener
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Global keyboard shortcuts (Cmd/Ctrl+K and dashboard number shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        return;
      }
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (!isTyping && !paletteOpen && !activeToolId && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const matched = PDF_TOOLS.find(
          (t) => t.shortcut.toLowerCase() === e.key.toLowerCase()
        );
        if (matched) {
          e.preventDefault();
          openTool(matched.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, paletteOpen, activeToolId]);

  const openTool = (id: ToolId) => {
    setActiveToolId(id);
    setMobileMenuOpen(false);
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((item) => item !== id)].slice(0, 6);
      try {
        localStorage.setItem('kaagaz-recent', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const togglePin = (id: ToolId, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPinnedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [id, ...prev];
      try {
        localStorage.setItem('kaagaz-pinned', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleDownloadSamplePdf = async () => {
    const sample = await createSamplePdfFile('KAAGAZ-Sample-Report.pdf', 6);
    triggerDownload(sample, sample.name);
  };

  const activeTool = useMemo(
    () => PDF_TOOLS.find((t) => t.id === activeToolId) || null,
    [activeToolId]
  );

  const categoryCounts = useMemo(() => {
    const map: Record<ToolCategory, number> = {
      All: PDF_TOOLS.length,
      Organize: 0,
      Optimize: 0,
      Convert: 0,
      'Edit PDF': 0,
      Security: 0,
      Workflows: 0,
    };
    PDF_TOOLS.forEach((t) => {
      map[t.category] += 1;
    });
    return map;
  }, []);

  const visibleTools = useMemo(() => {
    return PDF_TOOLS.filter((tool) => {
      if (activeCategory !== 'All' && tool.category !== activeCategory) {
        return false;
      }
      if (
        activeCategory === 'Convert' &&
        convertDirectionFilter !== 'all' &&
        tool.conversionDirection !== convertDirectionFilter
      ) {
        return false;
      }
      if (inlineSearch.trim()) {
        const q = inlineSearch.trim().toLowerCase();
        return (
          tool.title.toLowerCase().includes(q) ||
          tool.subtitle.toLowerCase().includes(q) ||
          tool.description.toLowerCase().includes(q) ||
          tool.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeCategory, convertDirectionFilter, inlineSearch]);

  const quickBarTools = useMemo(() => {
    const combinedIds = Array.from(new Set([...recentIds.slice(0, 3), ...pinnedIds])).slice(
      0,
      6
    );
    return combinedIds
      .map((id) => PDF_TOOLS.find((t) => t.id === id))
      .filter((t): t is PdfToolMeta => Boolean(t));
  }, [recentIds, pinnedIds]);

  const renderWorkspace = (id: ToolId) => {
    switch (id) {
      case 'merge-pdf':
        return <MergePdfWorkspace />;
      case 'split-pdf':
        return <SplitPdfWorkspace />;
      case 'remove-pages':
        return <RemovePagesWorkspace />;
      case 'extract-pages':
        return <ExtractPagesWorkspace />;
      case 'organize-pdf':
        return <OrganizePdfWorkspace />;
      case 'scan-to-pdf':
        return <ScanToPdfWorkspace />;
      case 'compress-pdf':
        return <CompressPdfWorkspace />;
      case 'repair-pdf':
        return <RepairPdfWorkspace />;
      case 'ocr-pdf':
        return <OcrPdfWorkspace />;
      case 'jpg-to-pdf':
        return <JpgToPdfWorkspace />;
      case 'word-to-pdf':
        return <WordToPdfWorkspace />;
      case 'powerpoint-to-pdf':
        return <PowerPointToPdfWorkspace />;
      case 'excel-to-pdf':
        return <ExcelToPdfWorkspace />;
      case 'html-to-pdf':
        return <HtmlToPdfWorkspace />;
      case 'markdown-to-pdf':
        return <MarkdownToPdfWorkspace />;
      case 'pdf-to-jpg':
        return <PdfToJpgWorkspace />;
      case 'pdf-to-png':
        return <PdfToPngWorkspace />;
      case 'pdf-to-word':
        return <PdfToWordWorkspace />;
      case 'pdf-to-powerpoint':
        return <PdfToPowerPointWorkspace />;
      case 'pdf-to-excel':
        return <PdfToExcelWorkspace />;
      case 'pdf-to-pdfa':
        return <PdfToPdfAWorkspace />;
      case 'rotate-pdf':
        return <RotatePdfWorkspace />;
      case 'add-page-numbers':
        return <AddPageNumbersWorkspace />;
      case 'add-watermark':
        return <AddWatermarkWorkspace />;
      case 'crop-pdf':
        return <CropPdfWorkspace />;
      case 'edit-pdf':
        return <EditPdfWorkspace />;
      case 'unlock-pdf':
        return <UnlockPdfWorkspace />;
      case 'protect-pdf':
        return <ProtectPdfWorkspace />;
      case 'sign-pdf':
        return <SignPdfWorkspace />;
      case 'redact-pdf':
        return <RedactPdfWorkspace />;
      case 'compare-pdf':
        return <ComparePdfWorkspace />;
      case 'flatten-pdf':
        return <FlattenPdfWorkspace />;
      case 'custom-workflows':
        return <CustomWorkflowsWorkspace />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Left Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200/80 dark:border-slate-800/90 bg-white/85 dark:bg-slate-950/55 backdrop-blur-xl sticky top-0 h-screen transition-all duration-200 ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[260px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setActiveToolId(null);
              setActiveCategory('All');
            }}
            className="flex items-center gap-2.5 min-w-0 text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-4 h-4"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <span className="font-display font-bold text-base tracking-[0.06em] text-slate-900 dark:text-white whitespace-nowrap truncate">
                KAAGAZ
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Quick Search Trigger */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={`w-full flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 hover:border-indigo-500/50 text-slate-500 dark:text-slate-400 transition ${
              sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
            }`}
            title="Search tools (Cmd/Ctrl + K)"
          >
            <span className="flex items-center gap-2 text-xs font-medium">
              <Search className="w-4 h-4 text-indigo-500 shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">Quick search</span>}
            </span>
            {!sidebarCollapsed && (
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        {/* Category Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          {!sidebarCollapsed && (
            <div className="px-2.5 pb-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Categories
            </div>
          )}
          {CATEGORIES.map((category) => {
            const isSelected = !activeToolId && activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setActiveToolId(null);
                  setActiveCategory(category);
                  setConvertDirectionFilter('all');
                }}
                title={category}
                className={`w-full flex items-center rounded-xl text-sm font-medium transition ${
                  sidebarCollapsed
                    ? 'justify-center p-2.5'
                    : 'justify-between px-3 py-2'
                } ${
                  isSelected
                    ? 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  {getCategoryIcon(category)}
                  {!sidebarCollapsed && (
                    <span className="truncate whitespace-nowrap">{category}</span>
                  )}
                </span>
                {!sidebarCollapsed && (
                  <span className="text-xs font-mono tabular-nums opacity-70">
                    {categoryCounts[category]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Online/Offline Status Pill + Theme Toggle */}
        <div className="p-3 border-t border-slate-200/70 dark:border-slate-800/80 space-y-2">
          <div
            className={`flex items-center rounded-xl border text-xs font-medium ${
              sidebarCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
            } ${
              isOnline
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
            }`}
            title={
              isOnline
                ? 'Online — all tools also run 100% offline'
                : 'Offline Mode — local PDF engine active'
            }
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
              )}
              {!sidebarCollapsed && (
                <span>{isOnline ? 'Offline Ready' : 'Offline Mode'}</span>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            className={`w-full flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition ${
              sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
            }`}
            title="Toggle Light / Dark Mode"
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              {darkMode ? (
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              )}
              {!sidebarCollapsed && <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>}
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 h-full bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="font-display font-bold text-base tracking-[0.06em] text-slate-900 dark:text-white">
                  KAAGAZ
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close navigation menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {CATEGORIES.map((category) => {
                  const isSelected = !activeToolId && activeCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setActiveToolId(null);
                        setActiveCategory(category);
                        setConvertDirectionFilter('all');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                        isSelected
                          ? 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        {getCategoryIcon(category)}
                        {category}
                      </span>
                      <span className="text-xs font-mono tabular-nums opacity-70">
                        {categoryCounts[category]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
                  isOnline
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                }`}
              >
                {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>{isOnline ? 'Offline Ready' : 'Offline Mode'}</span>
              </div>
              <button
                type="button"
                onClick={() => setDarkMode((d) => !d)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
                Switch to {darkMode ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Contextual Header */}
        <header className="sticky top-0 z-20 h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-slate-800/80 bg-[#F8FAFC]/90 dark:bg-[#0F172A]/90 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {activeTool ? (
              <div className="flex items-center gap-2 text-sm min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveToolId(null)}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition whitespace-nowrap"
                >
                  Tools
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory(activeTool.category);
                    setActiveToolId(null);
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition hidden sm:inline whitespace-nowrap"
                >
                  {activeTool.category}
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:inline" />
                <span className="font-semibold text-slate-900 dark:text-white truncate">
                  {activeTool.title}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                  {activeCategory === 'All' ? 'All Tools' : activeCategory}
                </span>
                <span className="text-slate-400 hidden sm:inline">·</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline truncate">
                  KAAGAZ · 33 Offline Client-Side PDF Tools
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/50 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2 transition whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Jump to tool</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={handleDownloadSamplePdf}
              className="hidden md:flex px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-medium items-center gap-1.5 shadow-sm transition whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Sample PDF
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>
          </div>
        </header>

        {/* Viewport Body */}
        <main className="flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
          {activeTool ? (
            /* Split Workspace Header + Active Tool */
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveToolId(null)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/50 text-slate-600 dark:text-slate-300 transition shrink-0"
                    title="Back to all tools"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${activeTool.badgeClass}`}
                  >
                    <ToolIcon name={activeTool.iconName} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                      {activeTool.title}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                      {activeTool.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => togglePin(activeTool.id)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
                    pinnedIds.includes(activeTool.id)
                      ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                  {pinnedIds.includes(activeTool.id) ? 'Pinned' : 'Pin tool'}
                </button>
              </div>

              {renderWorkspace(activeTool.id)}
            </div>
          ) : (
            /* Bento Dashboard View */
            <div className="space-y-8">
              {/* Hero Summary + Search Row */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="max-w-2xl">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
                    KAAGAZ — Private, offline PDF workspace
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                    33 client-side tools to organize, optimize, OCR, convert, edit, sign, protect, redact, compare, and automate PDFs directly in browser memory.
                  </p>
                </div>

                <div className="relative w-full md:w-72 shrink-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={inlineSearch}
                    onChange={(e) => setInlineSearch(e.target.value)}
                    placeholder="Filter tools by name or format..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Recent / Pinned Quick Bar */}
              {quickBarTools.length > 0 && !inlineSearch.trim() && (
                <section aria-label="Recent and pinned tools" className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      {recentIds.length > 0 ? (
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      ) : (
                        <Pin className="w-3.5 h-3.5 text-indigo-500" />
                      )}
                      {recentIds.length > 0 ? 'Recent & Pinned Tools' : 'Pinned Tools'}
                    </span>
                    <span className="hidden sm:inline">Press ⌘K to jump anywhere</span>
                  </div>

                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                    {quickBarTools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => openTool(tool.id)}
                        className="group flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition shrink-0"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${tool.badgeClass}`}
                        >
                          <ToolIcon name={tool.iconName} className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {tool.title}
                        </span>
                        <kbd className="text-[10px] font-mono text-slate-400">
                          {tool.shortcut}
                        </kbd>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Category Filter Strip (visible on mobile & tablet, plus Convert sub-tabs on desktop) */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {CATEGORIES.map((cat) => {
                    const active = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setActiveCategory(cat);
                          setConvertDirectionFilter('all');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                          active
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {activeCategory === 'Convert' && (
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    {(
                      [
                        { id: 'all', label: 'All Convert (12)' },
                        { id: 'to-pdf', label: 'To PDF (6)' },
                        { id: 'from-pdf', label: 'From PDF (6)' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setConvertDirectionFilter(tab.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                          convertDirectionFilter === tab.id
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bento Tool Grid or Graceful Category Empty State */}
              {visibleTools.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-10 text-center max-w-xl mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/12 text-indigo-500 flex items-center justify-center mx-auto">
                    {getCategoryIcon(activeCategory)}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      {inlineSearch.trim()
                        ? `No tools matching "${inlineSearch}"`
                        : `${activeCategory} tools are queued next`}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {inlineSearch.trim()
                        ? 'Try searching for Merge, OCR, Repair, Word, Excel, Watermark, Sign, Protect, Redact, Compare, or Workflows.'
                        : 'All 33 Organize, Optimize, Convert, Edit, Security, and Workflow tools are available locally right now.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setInlineSearch('');
                        setActiveCategory('All');
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-medium"
                    >
                      View all 33 tools
                    </button>
                    <button
                      type="button"
                      onClick={() => openTool('merge-pdf')}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium"
                    >
                      Open Merge PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visibleTools.map((tool) => {
                    const isPinned = pinnedIds.includes(tool.id);
                    return (
                      <div
                        key={tool.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openTool(tool.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openTool(tool.id);
                          }
                        }}
                        className="group relative rounded-2xl p-5 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/60 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-150 group-hover:scale-105 ${tool.badgeClass}`}
                            >
                              <ToolIcon name={tool.iconName} className="w-5 h-5" />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {tool.shortcut}
                              </kbd>
                              <button
                                type="button"
                                onClick={(e) => togglePin(tool.id, e)}
                                title={isPinned ? 'Unpin tool' : 'Pin tool'}
                                aria-label={isPinned ? `Unpin ${tool.title}` : `Pin ${tool.title}`}
                                className={`p-1.5 rounded-lg transition ${
                                  isPinned
                                    ? 'text-indigo-500 bg-indigo-500/10'
                                    : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h2 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                            {tool.title}
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                            {tool.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                          <span className="truncate">
                            {tool.category}
                            {tool.conversionDirection === 'to-pdf'
                              ? ' · To PDF'
                              : tool.conversionDirection === 'from-pdf'
                                ? ' · From PDF'
                                : ''}
                          </span>
                          <span className="font-mono tabular-nums text-[11px] opacity-75">
                            {String(tool.number).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav
          aria-label="Mobile quick navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-20 h-14 px-2 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md grid grid-cols-4 items-center"
        >
          <button
            type="button"
            onClick={() => {
              setActiveToolId(null);
              setActiveCategory('All');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              !activeToolId && activeCategory === 'All'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>All</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveToolId(null);
              setActiveCategory('Organize');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              !activeToolId && activeCategory === 'Organize'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Organize</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveToolId(null);
              setActiveCategory('Convert');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              !activeToolId && activeCategory === 'Convert'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Convert</span>
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </nav>
      </div>

      {/* Cmd/Ctrl + K Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectTool={openTool}
        onGoHome={() => {
          setActiveToolId(null);
          setActiveCategory('All');
        }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onDownloadSamplePdf={handleDownloadSamplePdf}
      />
    </div>
  );
}
