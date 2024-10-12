import { Annotation } from "@/lib/types";


// annotationsDB.ts (continued)

function openAnnDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AnnotationsDB', 1);
  
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains('annotations')) {
          const store = db.createObjectStore('annotations', { keyPath: 'id' });
        }
      };
  
      request.onsuccess = () => {
        const db = request.result;
        resolve(db);
      };
  
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  

// annotationsDB.ts (continued)

export async function saveAnnotationDb(annotation: Annotation): Promise<void> {
    try {
      const db = await openAnnDatabase();
      const transaction = db.transaction('annotations', 'readwrite');
      const store = transaction.objectStore('annotations');
      await new Promise<void>((resolve, reject) => {
        const request = store.put(annotation);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error saving annotation:', error);
      throw error;
    }
  }
  
  


// annotationsDB.ts (continued)

export async function getAnnotationsDb(): Promise<Annotation[]> {
    try {
      const db = await openAnnDatabase();
      const transaction = db.transaction('annotations', 'readonly');
      const store = transaction.objectStore('annotations');
      return await new Promise<Annotation[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as Annotation[]);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting annotations:', error);
      throw error;
    }
  }
  
  

// annotationsDB.ts (continued)

export async function deleteAnnotationDb(id: string): Promise<void> {
    try {
      const db = await openAnnDatabase();
      const transaction = db.transaction('annotations', 'readwrite');
      const store = transaction.objectStore('annotations');
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error deleting annotation:', error);
      throw error;
    }
  }
  