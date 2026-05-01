import { get, set } from 'idb-keyval';
import { db, auth, storage, OperationType, handleFirestoreError } from './firebase';
import { collection, doc, getDocs, setDoc, updateDoc, serverTimestamp, getDoc, query, where, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

export interface Stamp {
  id: string;
  date: string; // YYYY-MM-DD format
  imageDataUrl: string;
  journalEntry: string;
  isHolographic?: boolean;
}

const STAMPS_KEY = 'daily-stamps';

async function uploadImageToStorage(userId: string, stampId: string, dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:')) {
    return dataUrl; // Already a URL
  }
  const storageRef = ref(storage, `users/${userId}/stamps/${stampId}.jpg`);
  await uploadString(storageRef, dataUrl, 'data_url');
  return await getDownloadURL(storageRef);
}

export async function getStamps(): Promise<Stamp[]> {
  const user = auth.currentUser;
  if (user) {
    try {
      const q = query(collection(db, 'users', user.uid, 'stamps'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const stamps = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          date: data.date,
          imageDataUrl: data.imageDataUrl,
          journalEntry: data.journalEntry,
        } as Stamp;
      });
      stamps.sort((a, b) => b.date.localeCompare(a.date));
      return stamps;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/stamps`);
    }
  }

  // Fallback to local
  const stamps = await get<Stamp[]>(STAMPS_KEY);
  return stamps || [];
}

export async function saveStamp(stamp: Stamp): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    try {
      const storageUrl = await uploadImageToStorage(user.uid, stamp.id, stamp.imageDataUrl);
      const stampRef = doc(db, 'users', user.uid, 'stamps', stamp.id);
      await setDoc(stampRef, {
        userId: user.uid,
        date: stamp.date,
        imageDataUrl: storageUrl,
        journalEntry: stamp.journalEntry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/stamps/${stamp.id}`);
    }
  }

  // Local storage
  const stamps = await getStamps();
  const existingIndex = stamps.findIndex((s) => s.date === stamp.date);
  if (existingIndex >= 0) {
    stamps[existingIndex] = stamp;
  } else {
    stamps.push(stamp);
  }
  stamps.sort((a, b) => b.date.localeCompare(a.date));
  await set(STAMPS_KEY, stamps);
}

export async function updateStampJournal(id: string, journalEntry: string): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    try {
      const stampRef = doc(db, 'users', user.uid, 'stamps', id);
      await updateDoc(stampRef, {
        journalEntry,
        updatedAt: serverTimestamp()
      });
      return;
    } catch(error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/stamps/${id}`);
    }
  }

  // Local storage
  const stamps = await getStamps();
  const stampIndex = stamps.findIndex((s) => s.id === id);
  if (stampIndex >= 0) {
    stamps[stampIndex].journalEntry = journalEntry;
    await set(STAMPS_KEY, stamps);
  }
}

export async function deleteStamp(id: string): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    try {
      const stampRef = doc(db, 'users', user.uid, 'stamps', id);
      await deleteDoc(stampRef);
      const storageRef = ref(storage, `users/${user.uid}/stamps/${id}.jpg`);
      try {
        await deleteObject(storageRef);
      } catch (err) {
        console.warn("Could not delete image from storage:", err);
      }
    } catch(error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/stamps/${id}`);
    }
  }

  // Local storage
  const stamps = await get<Stamp[]>(STAMPS_KEY) || [];
  const updated = stamps.filter(s => s.id !== id);
  await set(STAMPS_KEY, updated);
}

export async function syncLocalStampsToCloud(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  
  const localStamps = await get<Stamp[]>(STAMPS_KEY);
  if (!localStamps || localStamps.length === 0) return;

  // Ensure user doc exists
  try {
     const userRef = doc(db, 'users', user.uid);
     const userSnap = await getDoc(userRef);
     if (!userSnap.exists()) {
       await setDoc(userRef, {
         uid: user.uid,
         createdAt: serverTimestamp()
       });
     }
  } catch(e) {
     console.error(e);
  }

  for (const stamp of localStamps) {
    try {
      const stampRef = doc(db, 'users', user.uid, 'stamps', stamp.id);
      const snap = await getDoc(stampRef);
      if (!snap.exists()) {
        const storageUrl = await uploadImageToStorage(user.uid, stamp.id, stamp.imageDataUrl);
        await setDoc(stampRef, {
          userId: user.uid,
          date: stamp.date,
          imageDataUrl: storageUrl,
          journalEntry: stamp.journalEntry,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch(e) {
      console.error(e);
    }
  }
  
  // Clear local storage after successful sync? No, keep it or clear it.
  // Actually, let's clear it so they don't resync next time they log out/in.
  await set(STAMPS_KEY, []);
}
