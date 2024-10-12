import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { FileData } from './types';

import { app } from '../app/firebaseConfig';
const db = getFirestore(app);

export async function addFile(filePath: string): Promise<FileData> {
  const pk = filePath.substring(filePath.lastIndexOf('/') + 1);
  const filesCollectionRef = collection(db, 'files');
  const docRef = doc(filesCollectionRef); // Generate a new document with an auto-generated ID
  const fileId = docRef.id;

  const newFile: FileData = {
    filePath: filePath,
    pk: pk,
    fileId: fileId,
  };

  await setDoc(docRef, newFile);
  return newFile;
}

import { query, where, getDocs } from 'firebase/firestore';

export async function getFileByPk(pk: string): Promise<FileData | null> {
  const filesCollectionRef = collection(db, 'files');
  const q = query(filesCollectionRef, where('pk', '==', pk));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    const fileData = docSnap.data() as FileData;
    return fileData;
  } else {
    return null;
  }
}