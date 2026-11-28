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
  BookOpen,
} from 'lucide-react';
import {
  PDF_TOOLS,
  CATEGORIES,
  ToolCategory,
  ToolId,
  PdfToolMeta,
} from './data/tools';
import { createSamplePdfFile, triggerDownload } from './utils/pdfEngine';
import { isAndroidNativeApp } from './utils/mobileStorageBridge';
import { ToolIcon } from './components/ToolIcon';
import { CommandPalette } from './components/CommandPalette';
import { UniversalDocumentViewer } from './components/UniversalDocumentViewer';
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
import { InvertPdfWorkspace } from './components/InvertPdfWorkspace';

const DEFAULT_PINNED: ToolId[] = [
  'split-pdf',
  'merge-pdf',
  'compress-pdf',
  'pdf-to-word',
];

function getCategoryIcon(cat: ToolCategory) {
  const props = { className: 'w-4 h-4 shrink-0', strokeWidth: 1.6 };
  switch (cat) {
    case 'All':
      return <Grid {...props} />;
    case 'Organize':
      return <FolderKanban {...props} />;
    case 'Optimize':
      return <Gauge {...props} />;
    case 'Convert':
      return <ArrowRightLeft {...props} />;
    case 'Edit PDF':
      return <PenLine {...props} />;
    case 'Security':
      return <Shield {...props} />;
    case 'Workflows':
      return <Workflow {...props} />;
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
  const [activeView, setActiveView] = useState<'tools' | 'viewer'>(() =>
    isAndroidNativeApp() ? 'viewer' : 'tools'
  );
  const [activeToolId, setActiveToolId] = useState<ToolId | null>(null);

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

  // Switch to Universal Document Viewer automatically when Android opens a file via Open-With intent
  useEffect(() => {
    const onIncomingFile = () => {
      setActiveView('viewer');
      setActiveToolId(null);
      setMobileMenuOpen(false);
    };
    window.addEventListener('kaagaz-incoming-file', onIncomingFile);
    return () => window.removeEventListener('kaagaz-incoming-file', onIncomingFile);
  }, []);

  // Global keyboard shortcuts (Cmd/Ctrl+K and dashboard shortcuts)
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

      if (
        !isTyping &&
        !paletteOpen &&
        activeView === 'tools' &&
        !activeToolId &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
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
  }, [mobileMenuOpen, paletteOpen, activeView, activeToolId]);

  const openTool = (id: ToolId) => {
    setActiveView('tools');
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

  const openDocumentViewer = () => {
    setActiveView('viewer');
    setActiveToolId(null);
    setMobileMenuOpen(false);
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
    const sample = await createSamplePdfFile('KAAGAZ-Sample-Report.pdf', 12);
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
      case 'invert-pdf':
        return <InvertPdfWorkspace />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#08080A] text-[#1D1D1F] dark:text-[#F5F5F7] flex">
      {/* Desktop Left Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-black/[0.06] dark:border-white/[0.07] bg-white/85 dark:bg-[#0C0C0F]/90 backdrop-blur-2xl sticky top-0 h-screen transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-[74px]' : 'w-[252px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setActiveView('tools');
              setActiveToolId(null);
              setActiveCategory('All');
            }}
            className="flex items-center gap-2.5 min-w-0 text-left"
          >
            <div className="w-8 h-8 rounded-[10px] bg-[#1D1D1F] dark:bg-[#F5F5F7] text-white dark:text-[#08080A] flex items-center justify-center shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-4 h-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                <polyline points="14 2 14 7 19 7" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <span className="font-display font-semibold text-[15px] tracking-[0.12em] text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap truncate">
                KAAGAZ
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition shrink-0"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" strokeWidth={1.6} />
            ) : (
              <PanelLeftClose className="w-4 h-4" strokeWidth={1.6} />
            )}
          </button>
        </div>

        {/* Quick Search Trigger */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={`w-full flex items-center rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] hover:border-black/[0.15] dark:hover:border-white/[0.16] text-slate-500 dark:text-slate-400 transition ${
              sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
            }`}
            title="Search tools (Cmd/Ctrl + K)"
          >
            <span className="flex items-center gap-2 text-xs font-medium">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.6} />
              {!sidebarCollapsed && <span className="whitespace-nowrap">Search tools</span>}
            </span>
            {!sidebarCollapsed && (
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/[0.04] dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        {/* Navigation: Standalone Features + PDF Library */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {!sidebarCollapsed && (
            <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Reader
            </div>
          )}
          <button
            type="button"
            onClick={openDocumentViewer}
            title="Universal Document Viewer"
            className={`w-full flex items-center rounded-xl text-[13px] font-medium transition mb-3 ${
              sidebarCollapsed
                ? 'justify-center p-2.5'
                : 'justify-between px-3 py-2'
            } ${
              activeView === 'viewer'
                ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white'
                : 'text-slate-700 dark:text-slate-300 bg-black/[0.025] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <BookOpen
                className={`w-4 h-4 shrink-0 ${
                  activeView === 'viewer' ? 'text-white' : 'text-[#0071E3] dark:text-[#0A84FF]'
                }`}
                strokeWidth={1.6}
              />
              {!sidebarCollapsed && (
                <span className="truncate whitespace-nowrap">Document Viewer</span>
              )}
            </span>
            {!sidebarCollapsed && (
              <span
                className={`text-[10px] font-mono ${
                  activeView === 'viewer' ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                All
              </span>
            )}
          </button>

          {!sidebarCollapsed && (
            <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              PDF Toolkit
            </div>
          )}
          {CATEGORIES.map((category) => {
            const isSelected =
              activeView === 'tools' && !activeToolId && activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setActiveView('tools');
                  setActiveToolId(null);
                  setActiveCategory(category);
                  setConvertDirectionFilter('all');
                }}
                title={category}
                className={`w-full flex items-center rounded-xl text-[13px] font-medium transition ${
                  sidebarCollapsed
                    ? 'justify-center p-2.5'
                    : 'justify-between px-3 py-2'
                } ${
                  isSelected
                    ? 'bg-black/[0.06] dark:bg-white/[0.09] text-[#1D1D1F] dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-[#1D1D1F] dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className={isSelected ? 'text-[#0071E3] dark:text-[#0A84FF]' : ''}>
                    {getCategoryIcon(category)}
                  </span>
                  {!sidebarCollapsed && (
                    <span className="truncate whitespace-nowrap">{category}</span>
                  )}
                </span>
                {!sidebarCollapsed && (
                  <span className="text-[11px] font-mono tabular-nums opacity-60">
                    {categoryCounts[category]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Minimal Theme Toggle */}
        <div className="p-3 border-t border-black/[0.05] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            className={`w-full flex items-center rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-xs font-medium text-slate-700 dark:text-slate-300 transition ${
              sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
            }`}
            title="Toggle Light / Dark Mode"
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              {darkMode ? (
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" strokeWidth={1.6} />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#0071E3] shrink-0" strokeWidth={1.6} />
              )}
              {!sidebarCollapsed && (
                <span>{darkMode ? 'Light appearance' : 'Dark appearance'}</span>
              )}
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-black/60 backdrop-blur-md"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 h-full bg-white dark:bg-[#0C0C0F] border-r border-black/[0.06] dark:border-white/[0.08] p-4 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                <span className="font-display font-semibold text-base tracking-[0.12em] text-[#1D1D1F] dark:text-white">
                  KAAGAZ
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  aria-label="Close navigation menu"
                >
                  <X className="w-4 h-4" strokeWidth={1.6} />
                </button>
              </div>

              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={openDocumentViewer}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium mb-2 ${
                    activeView === 'viewer'
                      ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white'
                      : 'bg-black/[0.03] dark:bg-white/[0.04] text-[#1D1D1F] dark:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4" strokeWidth={1.6} />
                    Document Viewer
                  </span>
                  <span className="text-xs font-mono opacity-75">All</span>
                </button>

                {CATEGORIES.map((category) => {
                  const isSelected =
                    activeView === 'tools' && !activeToolId && activeCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setActiveView('tools');
                        setActiveToolId(null);
                        setActiveCategory(category);
                        setConvertDirectionFilter('all');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                        isSelected
                          ? 'bg-black/[0.06] dark:bg-white/[0.09] text-[#1D1D1F] dark:text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        {getCategoryIcon(category)}
                        {category}
                      </span>
                      <span className="text-xs font-mono tabular-nums opacity-60">
                        {categoryCounts[category]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setDarkMode((d) => !d)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" strokeWidth={1.6} />
                ) : (
                  <Moon className="w-4 h-4 text-[#0071E3]" strokeWidth={1.6} />
                )}
                Switch to {darkMode ? 'Light appearance' : 'Dark appearance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Contextual Header */}
        <header className="sticky top-0 z-20 h-16 px-4 sm:px-6 lg:px-8 border-b border-black/[0.05] dark:border-white/[0.06] bg-[#F5F5F7]/80 dark:bg-[#08080A]/80 backdrop-blur-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" strokeWidth={1.6} />
            </button>

            {activeView === 'viewer' ? (
              <div className="flex items-center gap-2 text-sm min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('tools');
                    setActiveToolId(null);
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition whitespace-nowrap"
                >
                  KAAGAZ
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.6} />
                <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                  Document Viewer
                </span>
              </div>
            ) : activeTool ? (
              <div className="flex items-center gap-2 text-sm min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveToolId(null)}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition whitespace-nowrap"
                >
                  Tools
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.6} />
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
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:inline" strokeWidth={1.6} />
                <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                  {activeTool.title}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap">
                  {activeCategory === 'All' ? 'All Tools' : activeCategory}
                </span>
                <span className="text-slate-400 hidden sm:inline">·</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline truncate">
                  34 Private PDF Tools
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-black/[0.07] dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.04] hover:border-black/[0.15] dark:hover:border-white/[0.18] text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2 transition whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.6} />
              <span className="hidden sm:inline">Quick jump</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/[0.04] dark:bg-white/[0.07] text-slate-500 dark:text-slate-400">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={handleDownloadSamplePdf}
              className="hidden md:flex px-3.5 py-1.5 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-92 text-white text-xs font-medium items-center gap-1.5 transition whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.7} />
              Sample PDF
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="lg:hidden p-2 rounded-xl border border-black/[0.07] dark:border-white/[0.09] bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-300"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" strokeWidth={1.6} />
              ) : (
                <Moon className="w-4 h-4 text-[#0071E3]" strokeWidth={1.6} />
              )}
            </button>
          </div>
        </header>

        {/* Viewport Body */}
        <main className="flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-14">
          {activeView === 'viewer' ? (
            <UniversalDocumentViewer />
          ) : activeTool ? (
            /* Split Workspace Header + Active Tool */
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-black/[0.06] dark:border-white/[0.07]">
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveToolId(null)}
                    className="p-2.5 rounded-xl border border-black/[0.07] dark:border-white/[0.09] bg-white dark:bg-[#121215] hover:border-black/[0.18] dark:hover:border-white/[0.18] text-slate-600 dark:text-slate-300 transition shrink-0"
                    title="Back to all tools"
                  >
                    <ArrowLeft className="w-4 h-4" strokeWidth={1.6} />
                  </button>
                  <div
                    className={`w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0 ${activeTool.badgeClass}`}
                  >
                    <ToolIcon name={activeTool.iconName} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      {activeTool.title}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {activeTool.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => togglePin(activeTool.id)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
                    pinnedIds.includes(activeTool.id)
                      ? 'border-[#0A84FF]/40 bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF]'
                      : 'border-black/[0.07] dark:border-white/[0.09] bg-white dark:bg-[#121215] text-slate-600 dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" strokeWidth={1.6} />
                  {pinnedIds.includes(activeTool.id) ? 'Pinned' : 'Pin tool'}
                </button>
              </div>

              {renderWorkspace(activeTool.id)}
            </div>
          ) : (
            /* Apple-Minimal Bento Dashboard View */
            <div className="space-y-9">
              {/* Hero Summary + Search Row */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                <div className="max-w-2xl">
                  <h1 className="text-2xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#1D1D1F] dark:text-[#F5F5F7] text-balance">
                    KAAGAZ Studio
                  </h1>
                  <p className="text-sm sm:text-[15px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    34 precision PDF tools and a Universal Document Viewer to read, split, merge, organize, optimize, convert, edit, and secure documents directly in your browser.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={openDocumentViewer}
                    className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#121215] border border-black/[0.08] dark:border-white/[0.1] hover:border-[#0071E3] dark:hover:border-[#0A84FF] text-[#1D1D1F] dark:text-[#F5F5F7] text-xs font-medium flex items-center justify-center gap-2 transition whitespace-nowrap shrink-0"
                  >
                    <BookOpen className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" strokeWidth={1.6} />
                    Universal Viewer
                  </button>
                  <div className="relative w-full sm:w-64 shrink-0">
                    <Search
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      strokeWidth={1.6}
                    />
                    <input
                      type="text"
                      value={inlineSearch}
                      onChange={(e) => setInlineSearch(e.target.value)}
                      placeholder="Filter tools or formats..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-[#121215] border border-black/[0.07] dark:border-white/[0.08] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-slate-400 focus:outline-none focus:border-[#0A84FF]"
                    />
                  </div>
                </div>
              </div>

              {/* Recent / Pinned Quick Rail */}
              {quickBarTools.length > 0 && !inlineSearch.trim() && (
                <section aria-label="Recent and pinned tools" className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      {recentIds.length > 0 ? (
                        <Clock className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.6} />
                      ) : (
                        <Pin className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.6} />
                      )}
                      {recentIds.length > 0 ? 'Recent & Pinned' : 'Pinned'}
                    </span>
                    <span className="hidden sm:inline text-slate-400 dark:text-slate-500">
                      Press ⌘K to jump anywhere
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                    {quickBarTools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => openTool(tool.id)}
                        className="group flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] hover:border-black/[0.16] dark:hover:border-white/[0.18] transition shrink-0"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${tool.badgeClass}`}
                        >
                          <ToolIcon name={tool.iconName} className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap">
                          {tool.title}
                        </span>
                        <kbd className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          {tool.shortcut}
                        </kbd>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Minimal Segmented Category Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06] overflow-x-auto">
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
                            ? 'bg-white dark:bg-[#1F1F24] text-[#1D1D1F] dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {activeCategory === 'Convert' && (
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06]">
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                          convertDirectionFilter === tab.id
                            ? 'bg-white dark:bg-[#1F1F24] text-[#1D1D1F] dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bento Tool Grid or Empty State */}
              {visibleTools.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] p-10 text-center max-w-xl mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center mx-auto">
                    {getCategoryIcon(activeCategory)}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#1D1D1F] dark:text-white">
                      No tools matching &ldquo;{inlineSearch}&rdquo;
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Try searching for Split, Merge, OCR, Repair, Word, Excel, Watermark, Sign, Protect, Redact, Compare, or Workflows.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setInlineSearch('');
                        setActiveCategory('All');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-medium"
                    >
                      View all 34 tools
                    </button>
                    <button
                      type="button"
                      onClick={() => openTool('split-pdf')}
                      className="px-4 py-2 rounded-xl bg-black/[0.05] dark:bg-white/[0.07] text-slate-700 dark:text-slate-200 text-xs font-medium"
                    >
                      Open Split PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
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
                        className="group relative rounded-2xl p-5 bg-white dark:bg-[#121215] border border-black/[0.06] dark:border-white/[0.07] hover:border-black/[0.15] dark:hover:border-white/[0.16] hover:bg-white dark:hover:bg-[#16161A] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div
                              className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition-transform duration-150 group-hover:scale-105 ${tool.badgeClass}`}
                            >
                              <ToolIcon name={tool.iconName} className="w-[19px] h-[19px]" />
                            </div>

                            <div className="flex items-center gap-1">
                              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/[0.04] dark:bg-white/[0.05] text-slate-400 dark:text-slate-500">
                                {tool.shortcut}
                              </kbd>
                              <button
                                type="button"
                                onClick={(e) => togglePin(tool.id, e)}
                                title={isPinned ? 'Unpin tool' : 'Pin tool'}
                                aria-label={isPinned ? `Unpin ${tool.title}` : `Pin ${tool.title}`}
                                className={`p-1.5 rounded-lg transition ${
                                  isPinned
                                    ? 'text-[#0071E3] dark:text-[#0A84FF] bg-[#0A84FF]/10'
                                    : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
                                }`}
                              >
                                <Pin className="w-3.5 h-3.5" strokeWidth={1.6} />
                              </button>
                            </div>
                          </div>

                          <h2 className="text-[15px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#0071E3] dark:group-hover:text-white transition-colors">
                            {tool.title}
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                            {tool.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                          <span className="truncate">
                            {tool.category}
                            {tool.conversionDirection === 'to-pdf'
                              ? ' · To PDF'
                              : tool.conversionDirection === 'from-pdf'
                                ? ' · From PDF'
                                : ''}
                          </span>
                          <span className="font-mono tabular-nums opacity-70">
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
          className="lg:hidden fixed bottom-0 inset-x-0 z-20 h-14 px-2 bg-white/90 dark:bg-[#0C0C0F]/90 border-t border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl grid grid-cols-4 items-center"
        >
          <button
            type="button"
            onClick={() => {
              setActiveView('tools');
              setActiveToolId(null);
              setActiveCategory('All');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              activeView === 'tools' && !activeToolId && activeCategory === 'All'
                ? 'text-[#0071E3] dark:text-[#0A84FF]'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Grid className="w-4 h-4" strokeWidth={1.6} />
            <span>Tools</span>
          </button>
          <button
            type="button"
            onClick={openDocumentViewer}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              activeView === 'viewer'
                ? 'text-[#0071E3] dark:text-[#0A84FF]'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-4 h-4" strokeWidth={1.6} />
            <span>Viewer</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('tools');
              setActiveToolId(null);
              setActiveCategory('Convert');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              activeView === 'tools' && !activeToolId && activeCategory === 'Convert'
                ? 'text-[#0071E3] dark:text-[#0A84FF]'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" strokeWidth={1.6} />
            <span>Convert</span>
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            <Search className="w-4 h-4" strokeWidth={1.6} />
            <span>Search</span>
          </button>
        </nav>
      </div>

      {/* Cmd/Ctrl + K Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectTool={openTool}
        onOpenDocumentViewer={openDocumentViewer}
        onGoHome={() => {
          setActiveView('tools');
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
