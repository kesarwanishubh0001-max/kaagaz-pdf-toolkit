import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sun,
  Moon,
  Download,
  ArrowRight,
  Home,
} from 'lucide-react';
import { PDF_TOOLS, ToolId } from '../data/tools';
import { ToolIcon } from './ToolIcon';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (id: ToolId) => void;
  onGoHome: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onDownloadSamplePdf: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTool,
  onGoHome,
  darkMode,
  onToggleDarkMode,
  onDownloadSamplePdf,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const filteredTools = PDF_TOOLS.filter((t) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.subtitle.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredTools.length > 0 ? (prev + 1) % filteredTools.length : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredTools.length > 0
            ? (prev - 1 + filteredTools.length) % filteredTools.length
            : 0
        );
      } else if (e.key === 'Enter' && filteredTools[selectedIndex]) {
        e.preventDefault();
        onSelectTool(filteredTools[selectedIndex].id);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredTools, selectedIndex, onSelectTool, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-indigo-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to any of the 33 KAAGAZ PDF tools..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shrink-0">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-2">
          <div>
            <div className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Tools</span>
              <span className="font-mono tabular-nums">{filteredTools.length}</span>
            </div>

            {filteredTools.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No tools match &ldquo;{query}&rdquo;
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredTools.map((tool, index) => {
                  const active = index === selectedIndex;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => {
                        onSelectTool(tool.id);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            active ? 'bg-white/15 text-white' : tool.badgeClass
                          }`}
                        >
                          <ToolIcon name={tool.iconName} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium flex items-center gap-2">
                            <span className="truncate">{tool.title}</span>
                            <span
                              className={`text-xs shrink-0 ${
                                active ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              · {tool.category}
                            </span>
                          </div>
                          <div
                            className={`text-xs truncate ${
                              active
                                ? 'text-indigo-100'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {tool.subtitle}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <kbd
                          className={`px-1.5 py-0.5 text-[11px] font-mono rounded ${
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {tool.shortcut}
                        </kbd>
                        <ArrowRight className="w-3.5 h-3.5 opacity-75" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Actions
            </div>
            <button
              type="button"
              onClick={() => {
                onGoHome();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Home className="w-4 h-4 text-slate-400" />
                Return to All Tools Dashboard
              </span>
              <span className="text-xs text-slate-400 font-mono">Home</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleDarkMode();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
                Switch to {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
              <span className="text-xs text-slate-400 font-mono">Theme</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onDownloadSamplePdf();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-violet-500" />
                Download 6-Page Sample PDF
              </span>
              <span className="text-xs text-slate-400 font-mono">Sample</span>
            </button>
          </div>
        </div>

        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Runs locally in browser memory</span>
          <span>Arrows to navigate · Enter to open</span>
        </div>
      </div>
    </div>
  );
};
