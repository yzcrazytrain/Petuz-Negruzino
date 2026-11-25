/**
 * Non-blocking IndexedDB cassette deck storage for user-imported audio tracks
 * (MP3 / OGG / WAV / FLAC / M4A).
 * Features strict open/transaction timeouts, onblocked/onabort recovery,
 * main-thread yielding between files, and safe in-memory fallback so uploading
 * or loading tracks NEVER freezes the game.
 */

export interface StoredCustomTrack {
  id: string;
  name: string;
  mimeType: string;
  blob: Blob;
  addedAt: number;
}

export interface SaveTracksResult {
  saved: StoredCustomTrack[];
  skipped: string[];
  persistedToDb: boolean;
}

const DB_NAME = 'negruzino_cassette_deck_v1';
const STORE_NAME = 'tracks';
const DB_OPEN_TIMEOUT_MS = 3500;
const DB_TX_TIMEOUT_MS = 4500;
export const MAX_CUSTOM_TRACK_BYTES = 48 * 1024 * 1024; // 48 MB safety cap per track

const AUDIO_EXT_RE = /\.(mp3|ogg|oga|wav|flac|m4a|aac|opus|webm)$/i;

export function isSupportedAudioFile(file: { name: string; type?: string; size?: number }): boolean {
  if (typeof file.size === 'number' && (file.size <= 0 || file.size > MAX_CUSTOM_TRACK_BYTES)) {
    return false;
  }
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('audio/')) return true;
  return AUDIO_EXT_RE.test(file.name || '');
}

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function openDeckDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (db: IDBDatabase | null) => {
      if (settled) {
        if (db) {
          try {
            db.close();
          } catch {
            // ignore
          }
        }
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(db);
    };

    const timer = setTimeout(() => finish(null), DB_OPEN_TIMEOUT_MS);

    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        } catch {
          // ignore upgrade error; onerror will fire if fatal
        }
      };
      req.onblocked = () => {
        // Another open handle is blocking IndexedDB — never hang the UI!
        finish(null);
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          try {
            db.close();
          } catch {
            // ignore
          }
        };
        finish(db);
      };
      req.onerror = () => finish(null);
    } catch {
      finish(null);
    }
  });
}

export function cleanTrackDisplayName(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '').replace(/[_]+/g, ' ').trim() || filename;
}

function runTxWithTimeout(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), DB_TX_TIMEOUT_MS);
    try {
      const tx = db.transaction(STORE_NAME, mode);
      tx.oncomplete = () => finish(true);
      tx.onerror = () => finish(false);
      tx.onabort = () => finish(false);
      work(tx.objectStore(STORE_NAME));
    } catch {
      finish(false);
    }
  });
}

export async function saveCustomTrackFiles(files: File[]): Promise<SaveTracksResult> {
  const saved: StoredCustomTrack[] = [];
  const skipped: string[] = [];
  if (!files.length) {
    return { saved, skipped, persistedToDb: true };
  }

  const db = await openDeckDb();
  let persistedToDb = Boolean(db);
  const baseTs = Date.now();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!isSupportedAudioFile(file)) {
      skipped.push(file.name);
      continue;
    }

    // Clone into a detached Blob reference (safe across mobile WebView / Safari / Chromium)
    const mimeType = file.type || 'audio/mpeg';
    const safeBlob = file.slice(0, file.size, mimeType);
    const rec: StoredCustomTrack = {
      id: `trk_${baseTs}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      name: cleanTrackDisplayName(file.name),
      mimeType,
      blob: safeBlob,
      addedAt: baseTs + i,
    };
    saved.push(rec);

    if (db) {
      const ok = await runTxWithTimeout(db, 'readwrite', (store) => {
        store.put(rec);
      });
      if (!ok) {
        persistedToDb = false;
      }
    }

    // Yield to browser paint / event loop between tracks so UI & WebGL stay responsive
    if (i < files.length - 1) {
      await yieldToMainThread();
    }
  }

  try {
    db?.close();
  } catch {
    // ignore
  }
  return { saved, skipped, persistedToDb };
}

export async function loadAllCustomTracks(): Promise<StoredCustomTrack[]> {
  const db = await openDeckDb();
  if (!db) return [];
  return new Promise((resolve) => {
    let settled = false;
    const finish = (list: StoredCustomTrack[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        db.close();
      } catch {
        // ignore
      }
      resolve(list);
    };
    const timer = setTimeout(() => finish([]), DB_TX_TIMEOUT_MS);

    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      tx.onabort = () => finish([]);
      tx.onerror = () => finish([]);
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const raw = Array.isArray(req.result) ? (req.result as StoredCustomTrack[]) : [];
        const valid = raw.filter(
          (item) =>
            item &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            item.blob instanceof Blob &&
            item.blob.size > 0
        );
        valid.sort((a, b) => a.addedAt - b.addedAt);
        finish(valid);
      };
      req.onerror = () => finish([]);
    } catch {
      finish([]);
    }
  });
}

export async function removeStoredCustomTrack(id: string): Promise<void> {
  const db = await openDeckDb();
  if (!db) return;
  await runTxWithTimeout(db, 'readwrite', (store) => {
    store.delete(id);
  });
  try {
    db.close();
  } catch {
    // ignore
  }
}

export async function clearAllStoredCustomTracks(): Promise<void> {
  const db = await openDeckDb();
  if (!db) return;
  await runTxWithTimeout(db, 'readwrite', (store) => {
    store.clear();
  });
  try {
    db.close();
  } catch {
    // ignore
  }
}
