/**
 * localDB.ts
 *
 * Drop-in replacement for firestoreService.ts.
 * Uses window.electronAPI.db (IPC → SQLite via main process).
 *
 * The API surface is intentionally identical to firestoreService so that
 * all Zustand stores only need a one-line import change.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  type UpdateData,
  type DocumentData,
  type WithFieldValue,
} from 'firebase/firestore';
import { db as firestoreDb } from './firebase';

// ─── Type shim for window.electronAPI ─────────────────────────────────────────
declare global {
  interface Window {
    electronAPI?: {
      db: {
        getAll: (userId: string, collection: string) => Promise<unknown[]>;
        getOne: (userId: string, collection: string, id: string) => Promise<unknown | null>;
        insert: (userId: string, collection: string, id: string | null, data: unknown) => Promise<string>;
        update: (userId: string, collection: string, id: string, data: unknown) => Promise<void>;
        upsert: (userId: string, collection: string, id: string, data: unknown) => Promise<string>;
        delete: (userId: string, collection: string, id: string) => Promise<void>;
        onCollectionChanged: (cb: (userId: string, collection: string) => void) => () => void;
      };
      app: {
        isOnline: () => Promise<boolean>;
        getVersion: () => Promise<string>;
      };
    };
  }
}

// ─── Strip large binary fields before persisting to localStorage ─────────────
/**
 * Removes base64 image data from a document before it is written to
 * localStorage. Images stay in React state for the current session but are
 * NOT persisted — this prevents the localStorage quota-exceeded error.
 */
function stripImages<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;
  const stripped = { ...(data as any) };
  // Remove base64 image arrays (products, girvis, etc.)
  if (Array.isArray(stripped.images)) {
    stripped.images = [];
  }
  // Remove base64 logo from settings (large binary string)
  if (typeof stripped.logo === 'string' && stripped.logo.startsWith('data:')) {
    stripped.logo = '';
  }
  return stripped as T;
}

// ─── Browser LocalStorage Fallback ───────────────────────────────────────────
const webLocalStorage = {
  getAll: (userId: string, collection: string): unknown[] => {
    const key = `pos_${userId}_${collection}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },
  insert: async (userId: string, collection: string, id: string | null, data: unknown): Promise<string> => {
    const docs = webLocalStorage.getAll(userId, collection);
    const newId = id || uuidv4();
    const newDoc = { ...stripImages(data as any), id: newId };
    docs.push(newDoc);
    localStorage.setItem(`pos_${userId}_${collection}`, JSON.stringify(docs));
    window.dispatchEvent(new CustomEvent('pos-db-changed', { detail: { userId, collection } }));
    return newId;
  },
  upsert: async (userId: string, collection: string, id: string, data: unknown): Promise<string> => {
    const docs = webLocalStorage.getAll(userId, collection);
    const index = docs.findIndex((d: any) => d.id === id);
    const safeData = stripImages(data as any);
    if (index !== -1) {
      docs[index] = { ...safeData, id };
    } else {
      docs.push({ ...safeData, id });
    }
    localStorage.setItem(`pos_${userId}_${collection}`, JSON.stringify(docs));
    window.dispatchEvent(new CustomEvent('pos-db-changed', { detail: { userId, collection } }));
    return id;
  },
  update: async (userId: string, collection: string, id: string, data: unknown): Promise<void> => {
    const docs = webLocalStorage.getAll(userId, collection);
    const index = docs.findIndex((d: any) => d.id === id);
    if (index !== -1) {
      docs[index] = { ...(docs[index] as any), ...stripImages(data as any) };
      localStorage.setItem(`pos_${userId}_${collection}`, JSON.stringify(docs));
      window.dispatchEvent(new CustomEvent('pos-db-changed', { detail: { userId, collection } }));
    }
  },
  delete: async (userId: string, collection: string, id: string): Promise<void> => {
    const docs = webLocalStorage.getAll(userId, collection);
    const newDocs = docs.filter((d: any) => d.id !== id);
    localStorage.setItem(`pos_${userId}_${collection}`, JSON.stringify(newDocs));
    window.dispatchEvent(new CustomEvent('pos-db-changed', { detail: { userId, collection } }));
  }
};

// ─── Is this running inside Electron? ────────────────────────────────────────
export const isElectron = (): boolean =>
  typeof window !== 'undefined' && !!window.electronAPI;

// ─── Current user ID (mirrors firestoreService pattern) ───────────────────────
let currentUserId: string | null = null;

// ─── In-memory subscriber registry ───────────────────────────────────────────
type Callback<T> = (data: T) => void;
type CollectionSub = { callbacks: Callback<unknown[]>[]; unsub: (() => void) | null };

const collectionSubs: Map<string, CollectionSub> = new Map();
let globalChangeUnsub: (() => void) | null = null;

function subKey(userId: string, collection: string) {
  return `${userId}::${collection}`;
}

/** Called every time the database says a collection changed */
function handleChange(userId: string, collection: string) {
  if (!userId) return;
  const key = subKey(userId, collection);
  const entry = collectionSubs.get(key);
  if (!entry || entry.callbacks.length === 0) return;

  const fetchData = isElectron()
    ? window.electronAPI!.db.getAll(userId, collection)
    : Promise.resolve(webLocalStorage.getAll(userId, collection));

  fetchData
    .then((docs) => {
      entry.callbacks.forEach((cb) => cb(docs));
    })
    .catch(console.error);
}

/** Set up global listeners for data changes */
function ensureGlobalListener() {
  if (globalChangeUnsub) return;

  if (isElectron()) {
    globalChangeUnsub = window.electronAPI!.db.onCollectionChanged(handleChange);
  } else {
    // Web version: Listen for internal events and cross-tab storage events
    const handleWebChange = (e: any) => {
      const { userId, collection } = e.detail || {};
      if (userId && collection) handleChange(userId, collection);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('pos_')) {
        const parts = e.key.split('_');
        const userId = parts[1];
        const collection = parts[2];
        if (userId && collection) handleChange(userId, collection);
      }
    };

    window.addEventListener('pos-db-changed' as any, handleWebChange);
    window.addEventListener('storage', handleStorageChange);
    
    globalChangeUnsub = () => {
      window.removeEventListener('pos-db-changed' as any, handleWebChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const localDB = {
  setUserId(userId: string | null) {
    currentUserId = userId;
    if (userId) ensureGlobalListener();
  },

  getUserId(): string | null {
    return currentUserId;
  },

  // ── Subscribe to a collection (reactive — notified on any write) ────────────
  subscribeToCollection<T>(
    collectionName: string,
    callback: (data: T[]) => void
  ): () => void {
    if (!currentUserId) {
      callback([]);
      return () => {};
    }

    const userId = currentUserId;
    const key = subKey(userId, collectionName);

    if (!collectionSubs.has(key)) {
      collectionSubs.set(key, { callbacks: [], unsub: null });
    }

    const entry = collectionSubs.get(key)!;
    const typedCb = callback as Callback<unknown[]>;
    entry.callbacks.push(typedCb);

    // Immediate fetch
    if (isElectron()) {
      window.electronAPI!.db
        .getAll(userId, collectionName)
        .then((docs) => callback(docs as T[]))
        .catch(console.error);
    } else {
      // Web version: Immediate fetch from local storage
      const docs = webLocalStorage.getAll(userId, collectionName);
      callback(docs as T[]);
    }

    return () => {
      const e = collectionSubs.get(key);
      if (e) {
        e.callbacks = e.callbacks.filter((c) => c !== typedCb);
      }
    };
  },

  // ── Subscribe to a single document ─────────────────────────────────────────
  subscribeToDoc<T>(
    collectionName: string,
    docId: string,
    callback: (data: T | null) => void
  ): () => void {
    if (!currentUserId) {
      callback(null);
      return () => {};
    }

    // For single-doc subscriptions, piggyback on the collection subscription
    // and filter for the specific doc
    return localDB.subscribeToCollection<T>(collectionName, (docs) => {
      const found = docs.find((d: unknown) => (d as { id?: string }).id === docId) ?? null;
      callback(found as T | null);
    });
  },

  async addDocument<T extends WithFieldValue<DocumentData>>(
    collectionName: string,
    data: T
  ): Promise<string> {
    if (!currentUserId) throw new Error('localDB: No user ID set. Call setUserId() first.');
    
    if (isElectron()) {
      return await window.electronAPI!.db.insert(currentUserId, collectionName, null, data);
    } else {
      return await webLocalStorage.insert(currentUserId, collectionName, null, data);
    }
  },

  // ── Set document with specific ID ──────────────────────────────────────────
  async setDocument<T extends WithFieldValue<DocumentData>>(
    collectionName: string,
    docId: string,
    data: T
  ): Promise<void> {
    if (!currentUserId) throw new Error('localDB: No user ID set.');
    
    if (isElectron()) {
      await window.electronAPI!.db.upsert(currentUserId, collectionName, docId, data);
    } else {
      await webLocalStorage.upsert(currentUserId, collectionName, docId, data);
    }
  },

  // ── Update document (partial merge) ────────────────────────────────────────
  async updateDocument(
    collectionName: string,
    docId: string,
    data: UpdateData<DocumentData>
  ): Promise<void> {
    if (!currentUserId) throw new Error('localDB: No user ID set.');
    
    if (isElectron()) {
      await window.electronAPI!.db.update(currentUserId, collectionName, docId, data);
    } else {
      await webLocalStorage.update(currentUserId, collectionName, docId, data);
    }
  },

  // ── Delete document ─────────────────────────────────────────────────────────
  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    if (!currentUserId) throw new Error('localDB: No user ID set.');
    
    if (isElectron()) {
      await window.electronAPI!.db.delete(currentUserId, collectionName, docId);
    } else {
      await webLocalStorage.delete(currentUserId, collectionName, docId);
    }
  },

  // ── Fetch all once ──────────────────────────────────────────────────────────
  async getAllDocuments<T>(collectionName: string): Promise<T[]> {
    if (!currentUserId) return [];
    
    if (isElectron()) {
      const docs = await window.electronAPI!.db.getAll(currentUserId, collectionName);
      return docs as T[];
    } else {
      return webLocalStorage.getAll(currentUserId, collectionName) as T[];
    }
  },

  // ── Fetch one by ID ─────────────────────────────────────────────────────────
  async getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
    if (!currentUserId) return null;
    
    if (isElectron()) {
      const result = await window.electronAPI!.db.getOne(currentUserId, collectionName, docId);
      return result as T | null;
    } else {
      const docs = webLocalStorage.getAll(currentUserId, collectionName);
      return (docs.find((d: any) => d.id === docId) as T) || null;
    }
  },

  // ── Global documents — Firestore with LocalStorage cache/fallback ───────────
  async getGlobalDocument<T>(collectionName: string, docId: string): Promise<T | null> {
    try {
      const docSnap = await getDoc(doc(firestoreDb, collectionName, docId));
      if (docSnap.exists()) {
        const data = { ...docSnap.data(), id: docSnap.id } as T;
        // Cache for offline/web use
        if (!isElectron()) {
          localStorage.setItem(`global_${collectionName}_${docId}`, JSON.stringify(data));
        }
        return data;
      }
    } catch (e) {
      console.warn(`Firestore getGlobal failed for ${collectionName}/${docId}:`, e);
    }

    // Fallback to localStorage if web
    if (!isElectron()) {
      const cached = localStorage.getItem(`global_${collectionName}_${docId}`);
      if (cached) return JSON.parse(cached) as T;
    }
    return null;
  },

  async setGlobalDocument<T extends WithFieldValue<DocumentData>>(
    collectionName: string,
    docId: string,
    data: T
  ): Promise<void> {
    try {
      await setDoc(doc(firestoreDb, collectionName, docId), data);
    } catch (e) {
      console.warn("Firestore setGlobal failed:", e);
    }
    
    if (!isElectron()) {
      localStorage.setItem(`global_${collectionName}_${docId}`, JSON.stringify(data));
    }
  },

  async updateGlobalDocument(
    collectionName: string,
    docId: string,
    data: UpdateData<DocumentData>
  ): Promise<void> {
    try {
      await updateDoc(doc(firestoreDb, collectionName, docId), data);
    } catch (e) {
      console.warn("Firestore updateGlobal failed:", e);
    }

    if (!isElectron()) {
      const cached = localStorage.getItem(`global_${collectionName}_${docId}`);
      if (cached) {
        const current = JSON.parse(cached);
        const updated = { ...current, ...data };
        localStorage.setItem(`global_${collectionName}_${docId}`, JSON.stringify(updated));
      }
    }
  },

  async deleteGlobalDocument(collectionName: string, docId: string): Promise<void> {
    await deleteDoc(doc(firestoreDb, collectionName, docId));
  },

  // ── Backup helpers ──────────────────────────────────────────────────────────
  async exportAll(): Promise<Record<string, unknown[]>> {
    if (!currentUserId) return {};
    const result: Record<string, unknown[]> = {};
    const collections = [
      'products', 
      'customers', 
      'sales', 
      'girvis', 
      'daybook', 
      'settings', 
      'sales_orders', 
      'purchase_orders', 
      'suppliers', 
      'karigars', 
      'karigar_transactions',
      'old_gold_purchases',
      'owner_loans',
      'karigar_orders'
    ];
    for (const col of collections) {
      if (isElectron()) {
        result[col] = await window.electronAPI!.db.getAll(currentUserId, col);
      } else {
        result[col] = webLocalStorage.getAll(currentUserId, col);
      }
    }
    return result;
  },
};
