import { detectDocumentKind, ViewerDocumentKind } from './documentViewerEngine';

export interface DeviceFileEntry {
  name: string;
  path: string;
  folder: string;
  size: number;
  lastModified: number;
  extension: string;
  kind: ViewerDocumentKind;
  kindLabel: string;
  /** Populated when picked via browser directory input instead of Android native path */
  browserFile?: File;
}

interface KaagazAndroidNativeBridge {
  hasStoragePermission: () => boolean;
  requestStoragePermission: () => void;
  scanDeviceFiles: () => string;
  readFileBase64: (filePath: string) => string;
  saveFileToDownloads: (filename: string, base64Data: string, mimeType: string) => string;
  printCurrentPage: (jobName: string) => void;
}

declare global {
  interface Window {
    KaagazNative?: KaagazAndroidNativeBridge;
  }
}

export function isAndroidNativeApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.KaagazNative);
}

export function hasAndroidStoragePermission(): boolean {
  if (!isAndroidNativeApp()) return false;
  try {
    return Boolean(window.KaagazNative!.hasStoragePermission());
  } catch {
    return false;
  }
}

export function requestAndroidStoragePermission(): void {
  if (!isAndroidNativeApp()) return;
  try {
    window.KaagazNative!.requestStoragePermission();
  } catch {
    // Ignore bridge errors
  }
}

export async function scanAndroidDeviceFiles(): Promise<DeviceFileEntry[]> {
  if (!isAndroidNativeApp()) return [];
  try {
    const rawJson = window.KaagazNative!.scanDeviceFiles();
    const parsed = JSON.parse(rawJson || '[]') as Array<{
      name: string;
      path: string;
      folder: string;
      size: number;
      lastModified: number;
      ext: string;
    }>;
    return parsed.map((item) => {
      const detected = detectDocumentKind(item.name);
      return {
        name: item.name,
        path: item.path,
        folder: item.folder || 'Storage',
        size: Number(item.size) || 0,
        lastModified: Number(item.lastModified) || Date.now(),
        extension: item.ext || '',
        kind: detected.kind,
        kindLabel: detected.label,
      };
    });
  } catch {
    return [];
  }
}

function guessMimeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    md: 'text/markdown',
    html: 'text/html',
    htm: 'text/html',
    json: 'application/json',
    txt: 'text/plain',
    zip: 'application/zip',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    mp4: 'video/mp4',
    webm: 'video/webm',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function readAndroidFileByPath(
  filePath: string,
  filename: string,
  lastModified = Date.now()
): Promise<File> {
  if (!isAndroidNativeApp()) {
    throw new Error('Android native storage bridge is not available in browser mode.');
  }
  const base64 = window.KaagazNative!.readFileBase64(filePath);
  if (!base64) {
    throw new Error(`Unable to read file at ${filePath}`);
  }
  const bytes = base64ToUint8Array(base64);
  const ext = filename.includes('.') ? filename.split('.').pop() || '' : '';
  const mime = guessMimeFromExtension(ext);
  return new File([new Uint8Array(bytes)], filename, {
    type: mime,
    lastModified,
  });
}

export async function saveFileNativelyOnAndroid(
  blob: Blob,
  filename: string,
  mimeType = 'application/pdf'
): Promise<string | null> {
  if (!isAndroidNativeApp()) return null;
  try {
    const base64 = await blobToBase64(blob);
    const savedPath = window.KaagazNative!.saveFileToDownloads(
      filename,
      base64,
      mimeType
    );
    return savedPath || 'Downloads/Kaagaz';
  } catch {
    return null;
  }
}

export function triggerNativePrint(jobTitle = 'KAAGAZ Document'): void {
  if (isAndroidNativeApp()) {
    try {
      window.KaagazNative!.printCurrentPage(jobTitle);
      return;
    } catch {
      // Fallback to window.print
    }
  }
  window.print();
}

export function mapBrowserFilesToDeviceEntries(fileList: File[]): DeviceFileEntry[] {
  return fileList
    .filter((f) => !f.name.startsWith('.'))
    .map((file) => {
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || '';
      const parts = rel ? rel.split('/') : [];
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Selected Folder';
      const detected = detectDocumentKind(file.name, file.type);
      const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
      return {
        name: file.name,
        path: rel || file.name,
        folder,
        size: file.size,
        lastModified: file.lastModified || Date.now(),
        extension: ext,
        kind: detected.kind,
        kindLabel: detected.label,
        browserFile: file,
      };
    })
    .sort((a, b) => b.lastModified - a.lastModified);
}
