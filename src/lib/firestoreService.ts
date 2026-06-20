import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  setDoc,
  getDoc,
  type DocumentData,
  type WithFieldValue,
  type UpdateData,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Current authenticated user ID.
 * All Firestore paths are scoped under: users/{userId}/{collectionName}
 * This ensures each user only sees their own data.
 */
let currentUserId: string | null = null;

/**
 * Build a user-scoped collection path.
 * e.g. "products" → "users/abc123/products"
 */
function getUserCollectionPath(collectionName: string): string {
  if (!currentUserId) {
    throw new Error('FirestoreService: No user ID set. Call setUserId() first.');
  }
  return `users/${currentUserId}/${collectionName}`;
}

export const firestoreService = {
  /**
   * Set the current user ID for scoping all Firestore operations.
   * Must be called when the user logs in / auth state changes.
   */
  setUserId(userId: string | null) {
    currentUserId = userId;
  },

  /**
   * Get the current user ID.
   */
  getUserId(): string | null {
    return currentUserId;
  },

  /**
   * Universal collection listener (user-scoped)
   */
  subscribeToCollection<T>(
    collectionName: string,
    callback: (data: T[]) => void
  ) {
    const path = getUserCollectionPath(collectionName);
    const q = query(collection(db, path));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as T[];
      callback(data);
    });
  },

  /**
   * Subscribe to a single document (user-scoped)
   */
  subscribeToDoc<T>(
    collectionName: string,
    docId: string,
    callback: (data: T | null) => void
  ) {
    const path = getUserCollectionPath(collectionName);
    return onSnapshot(doc(db, path, docId), (doc) => {
      if (doc.exists()) {
        callback({ ...doc.data(), id: doc.id } as T);
      } else {
        callback(null);
      }
    });
  },

  /**
   * Add a new document with an auto-generated ID (user-scoped)
   */
  async addDocument<T extends WithFieldValue<DocumentData>>(
    collectionName: string,
    data: T
  ) {
    const path = getUserCollectionPath(collectionName);
    const docRef = await addDoc(collection(db, path), data);
    return docRef.id;
  },

  /**
   * Set a document with a specific ID (user-scoped)
   */
  async setDocument<T extends WithFieldValue<DocumentData>>(
    collectionName: string,
    docId: string,
    data: T
  ) {
    const path = getUserCollectionPath(collectionName);
    await setDoc(doc(db, path, docId), data);
  },

  /**
   * Update an existing document (user-scoped)
   */
  async updateDocument(
    collectionName: string,
    docId: string,
    data: UpdateData<DocumentData>
  ) {
    const path = getUserCollectionPath(collectionName);
    const docRef = doc(db, path, docId);
    await updateDoc(docRef, data);
  },

  /**
   * Delete a document (user-scoped)
   */
  async deleteDocument(collectionName: string, docId: string) {
    const path = getUserCollectionPath(collectionName);
    await deleteDoc(doc(db, path, docId));
  },

  /**
   * Fetch all documents once (user-scoped)
   */
  async getAllDocuments<T>(collectionName: string) {
    const path = getUserCollectionPath(collectionName);
    const querySnapshot = await getDocs(collection(db, path));
    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as T[];
  },

  /**
   * Fetch a single document once (user-scoped)
   */
  async getDocument<T>(collectionName: string, docId: string) {
    const path = getUserCollectionPath(collectionName);
    const docSnap = await getDoc(doc(db, path, docId));
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as T;
    }
    return null;
  },

  /**
   * Fetch a single global document (not scoped to user)
   */
  async getGlobalDocument<T>(collectionName: string, docId: string) {
    const docSnap = await getDoc(doc(db, collectionName, docId));
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as T;
    }
    return null;
  },

  /**
   * Set a global document (not scoped to user)
   */
  async setGlobalDocument<T extends WithFieldValue<DocumentData>>(
    collectionName: string,
    docId: string,
    data: T
  ) {
    await setDoc(doc(db, collectionName, docId), data);
  },

  /**
   * Fetch all global documents for a collection
   */
  async getGlobalCollection<T>(collectionName: string) {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as T[];
  },

  /**
   * Delete a global document
   */
  async deleteGlobalDocument(collectionName: string, docId: string) {
    await deleteDoc(doc(db, collectionName, docId));
  },

  /**
   * Update a global document
   */
  async updateGlobalDocument(
    collectionName: string,
    docId: string,
    data: UpdateData<DocumentData>
  ) {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data);
  },
};
