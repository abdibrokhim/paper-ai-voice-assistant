import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { Annotation } from './types';

import { app } from '../app/firebaseConfig';
const db = getFirestore(app);

export async function fetchUserAnnotations(userId: string, paperId: string): Promise<Annotation[]> {
  const annotationsCollectionRef = collection(db, 'users', userId, 'papers', paperId, 'annotations');
  const querySnapshot = await getDocs(annotationsCollectionRef);
  const annotations: Annotation[] = [];
  querySnapshot.forEach((doc) => {
    const annotation = doc.data() as Annotation;
    annotations.push(annotation);
  });
  return annotations;
}

export async function addAnnotation(userId: string, paperId: string, annotation: Annotation): Promise<void> {
  const annotationDocRef = doc(db, 'users', userId, 'papers', paperId, 'annotations', annotation.id);
  await setDoc(annotationDocRef, annotation);
}

export async function updateAnnotation(userId: string, paperId: string, annotation: Annotation): Promise<void> {
  const annotationDocRef = doc(db, 'users', userId, 'papers', paperId, 'annotations', annotation.id);
  await setDoc(annotationDocRef, annotation, { merge: true });
}

export async function deleteAnnotation(userId: string, paperId: string, annotationId: string): Promise<void> {
  const annotationDocRef = doc(db, 'users', userId, 'papers', paperId, 'annotations', annotationId);
  await deleteDoc(annotationDocRef);
}