/**
 * Persistent IndexedDB cassette deck storage for user-imported real audio tracks
 * (MP3 / OGG / WAV / FLAC / M4A), e.g. original «Багровый Фантомас» recordings.
 * Keeps tracks saved locally across browser reloads with zero server uploads.
 */

export interface StoredCustomTrack {
  id: string;
  name: string;
  mimeType: string;
  blob: Blob;
  addedAt: number;
}

const DB_NAME = 'negruzino_cassette_deck_v1';
const STORE_NAME = 'tracks';

function openDeckDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function cleanTrackDisplayName(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '').replace(/[_]+/g, ' ').trim() || filename;
}

export async function saveCustomTrackFiles(files: File[]): Promise<StoredCustomTrack[]> {
  const saved: StoredCustomTrack[] = [];
  const db = await openDeckDb();
  const baseTs = Date.now();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const rec: StoredCustomTrack = {
      id: `trk_${baseTs}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      name: cleanTrackDisplayName(file.name),
      mimeType: file.type || 'audio/mpeg',
      blob: file,
      addedAt: baseTs + i,
    };
    saved.push(rec);

    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(rec);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  }

  db?.close();
  return saved;
}

export async function loadAllCustomTracks(): Promise<StoredCustomTrack[]> {
  const db = await openDeckDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const list = (req.result as StoredCustomTrack[]) || [];
        list.sort((a, b) => a.addedAt - b.addedAt);
        db.close();
        resolve(list);
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    } catch {
      db.close();
      resolve([]);
    }
  });
}

export async function removeStoredCustomTrack(id: string): Promise<void> {
  const db = await openDeckDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

export async function clearAllStoredCustomTracks(): Promise<void> {
  const db = await openDeckDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}
