/**
 * IndexedDB Persistent Storage for Letter Document Images
 * Provides reliable, unlimited local offline storage for high-resolution
 * letter camera scans and document attachments, surviving page reloads,
 * cache clears, and network outages.
 */

const DB_NAME = 'VaharaiDS_Mail_Images_DB';
const DB_VERSION = 1;
const STORE_NAME = 'letter_images';

interface StoredImageRecord {
  id: string; // Letter ID (e.g. LTR-...)
  originalNo?: string;
  image: string; // Base64 Data URL
  imageSizeKb?: number;
  updatedAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('originalNo', 'originalNo', { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  return dbPromise;
}

/**
 * Saves a letter image directly to IndexedDB.
 */
export async function saveLetterImage(
  letterId: string,
  imageBase64: string,
  options?: { originalNo?: string; imageSizeKb?: number }
): Promise<void> {
  if (!letterId || !imageBase64) return;
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredImageRecord = {
        id: String(letterId).trim(),
        originalNo: options?.originalNo ? String(options.originalNo).trim() : undefined,
        image: imageBase64,
        imageSizeKb: options?.imageSizeKb || Math.round((imageBase64.length * 3) / 4 / 1024),
        updatedAt: new Date().toISOString(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[imageStorage] Failed to save image to IndexedDB:', err);
  }
}

/**
 * Retrieves a single letter's image from IndexedDB.
 */
export async function getLetterImage(letterId: string): Promise<{ image: string; imageSizeKb?: number } | null> {
  if (!letterId) return null;
  try {
    const db = await getDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(letterId).trim());
      req.onsuccess = () => {
        if (req.result && req.result.image) {
          resolve({
            image: req.result.image,
            imageSizeKb: req.result.imageSizeKb,
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Retrieves all stored images as a Map of letter ID -> { image, imageSizeKb }.
 */
export async function getAllLetterImages(): Promise<Map<string, { image: string; imageSizeKb?: number }>> {
  const map = new Map<string, { image: string; imageSizeKb?: number }>();
  try {
    const db = await getDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          if (cursor.value && cursor.value.id && cursor.value.image) {
            map.set(cursor.value.id, {
              image: cursor.value.image,
              imageSizeKb: cursor.value.imageSizeKb,
            });
            if (cursor.value.originalNo) {
              map.set(cursor.value.originalNo, {
                image: cursor.value.image,
                imageSizeKb: cursor.value.imageSizeKb,
              });
            }
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('[imageStorage] Failed to load all images from IndexedDB:', err);
  }
  return map;
}

/**
 * Deletes a letter image from IndexedDB.
 */
export async function deleteLetterImage(letterId: string): Promise<void> {
  if (!letterId) return;
  try {
    const db = await getDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(String(letterId).trim());
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
}

/**
 * Hydrates an array of letters by filling in any missing images from IndexedDB.
 */
export async function hydrateLettersWithImages<T extends { id: string; originalNo?: string; image?: string; imageSizeKb?: number }>(
  letters: T[]
): Promise<T[]> {
  try {
    const imagesMap = await getAllLetterImages();
    if (imagesMap.size === 0) return letters;

    return letters.map((ltr) => {
      if (ltr.image) return ltr;
      const found = imagesMap.get(ltr.id) || (ltr.originalNo ? imagesMap.get(ltr.originalNo) : null);
      if (found) {
        return {
          ...ltr,
          image: found.image,
          imageSizeKb: ltr.imageSizeKb || found.imageSizeKb,
        };
      }
      return ltr;
    });
  } catch {
    return letters;
  }
}
