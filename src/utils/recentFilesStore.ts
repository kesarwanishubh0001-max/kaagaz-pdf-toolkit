import { ViewerDocumentKind } from './documentViewerEngine';
import { isAndroidNativeApp, readAndroidFileByPath } from './mobileStorageBridge';

export interface RecentViewedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: ViewerDocumentKind;
  kindLabel: string;
  viewedAt: number;
  nativePath?: string;
  folder?: string;
  hasStoredBlob: boolean;
}

interface StoredRecentRecord extends RecentViewedFile {
  buffer?: ArrayBuffer;
}

const DB_NAME = 'kaagaz_universal_viewer_db';
const DB_VERSION = 1;
const STORE_NAME = 'recent_files';
const MAX_RECENT_ITEMS = 24;
const MAX_BLOB_BYTES = 25 * 1024 * 1024; // 25 MB local IndexedDB cache cap per file

function openRecentDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('viewedAt', 'viewedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function buildStableId(name: string, size: number, nativePath?: string): string {
  if (nativePath) return `path:${nativePath}`;
  return `file:${name.toLowerCase()}::${size}`;
}

export async function listRecentFiles(): Promise<RecentViewedFile[]> {
  try {
    const db = await openRecentDb();
    return await new Promise<RecentViewedFile[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result as StoredRecentRecord[]) || [];
        const sanitized: RecentViewedFile[] = rows
          .map(({ buffer: _buf, ...meta }) => meta)
          .sort((a, b) => b.viewedAt - a.viewedAt);
        resolve(sanitized);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveRecentFile(
  file: File,
  kind: ViewerDocumentKind,
  kindLabel: string,
  meta?: { nativePath?: string; folder?: string }
): Promise<RecentViewedFile[]> {
  try {
    const db = await openRecentDb();
    const id = buildStableId(file.name, file.size, meta?.nativePath);
    // On Android with nativePath we can always reopen directly from storage;
    // otherwise cache file bytes in IndexedDB so recent files reopen 100% locally.
    const shouldCacheBlob = !meta?.nativePath && file.size <= MAX_BLOB_BYTES;
    const buffer = shouldCacheBlob ? await file.arrayBuffer() : undefined;

    const record: StoredRecentRecord = {
      id,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      kind,
      kindLabel,
      viewedAt: Date.now(),
      nativePath: meta?.nativePath,
      folder: meta?.folder,
      hasStoredBlob: Boolean(buffer),
      buffer,
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Prune oldest records past MAX_RECENT_ITEMS
    const all = await listRecentFiles();
    if (all.length > MAX_RECENT_ITEMS) {
      const toDelete = all.slice(MAX_RECENT_ITEMS);
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        toDelete.forEach((item) => store.delete(item.id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
      return all.slice(0, MAX_RECENT_ITEMS);
    }

    return all;
  } catch {
    return listRecentFiles();
  }
}

export async function loadRecentFileObject(entry: RecentViewedFile): Promise<File> {
  // Prefer direct Android storage read if nativePath is present
  if (entry.nativePath && isAndroidNativeApp()) {
    return readAndroidFileByPath(entry.nativePath, entry.name, entry.viewedAt);
  }

  const db = await openRecentDb();
  const record = await new Promise<StoredRecentRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(entry.id);
    req.onsuccess = () => resolve(req.result as StoredRecentRecord | undefined);
    req.onerror = () => reject(req.error);
  });

  if (!record?.buffer) {
    throw new Error(
      'This file was too large to cache locally. Please reopen it from device storage.'
    );
  }

  return new File([record.buffer], record.name, {
    type: record.mimeType || 'application/octet-stream',
    lastModified: record.viewedAt,
  });
}

export async function removeRecentFile(id: string): Promise<RecentViewedFile[]> {
  try {
    const db = await openRecentDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
  return listRecentFiles();
}

export async function clearRecentFiles(): Promise<void> {
  try {
    const db = await openRecentDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
