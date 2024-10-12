import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Annotation } from './types';

import { app } from '../app/firebaseConfig';
const db = getFirestore(app);

export async function createCollaboration(): Promise<string> {
    const collaborationRef = doc(collection(db, 'collaboration'));
    return collaborationRef.id;
}

async function fetchAllUserIds(): Promise<string[]> {
  const users = collection(db, 'users');
  const userSnapshots = await getDocs(users);
  const userIds: string[] = [];
  userSnapshots.forEach((userDoc) => {
    userIds.push(userDoc.id);
  });
  return userIds;
}

export async function fetchAllUserAnnotations(collaborationId: string, paperId: string): Promise<Annotation[]> {
  const userIds = await fetchAllUserIds();
  const fetchedAnnotations: Annotation[] = [];
  const annotationIds = new Set<string>(); // Set to track annotation IDs

  // Iterate through each user to get their annotations
  for (const userId of userIds) {
    const annotations = await fetchUserAnnotations(collaborationId, userId, paperId);
    
    // Iterate over annotations and only push if the id is not already in the set
    annotations.forEach((annotation) => {
      if (!annotationIds.has(annotation.id)) {  // Check for duplicates
        fetchedAnnotations.push(annotation);
        annotationIds.add(annotation.id);  // Add the id to the set
      }
    });
  }

  console.log('Fetched annotations:', fetchedAnnotations);

  return fetchedAnnotations;
}

export async function fetchUserAnnotations(collaborationId: string, userId: string, paperId: string): Promise<Annotation[]> {
  const annotationsCollectionRef = collection(db, 'collaboration', collaborationId, 'papers', paperId, 'users', userId, 'annotations');
  const querySnapshot = await getDocs(annotationsCollectionRef);
  console.log('querySnapshot: ', querySnapshot)
  const annotations: Annotation[] = [];
  querySnapshot.forEach((doc) => {
    const annotation = doc.data() as Annotation;
    annotations.push(annotation);
  });
  return annotations;
}

export async function addAnnotation(collaborationId: string, userId: string, paperId: string, annotation: Annotation): Promise<void> {
    const annotationDocRef = doc(db, 'collaboration', collaborationId, 'papers', paperId, 'users', userId, 'annotations', annotation.id);
    await setDoc(annotationDocRef, annotation);
}

export async function updateAnnotation(collaborationId: string, userId: string, paperId: string, annotation: Annotation): Promise<void> {
    const annotationDocRef = doc(db, 'collaboration', collaborationId, 'papers', paperId, 'users', userId, 'annotations', annotation.id);
    await setDoc(annotationDocRef, annotation, { merge: true });
}

export async function deleteAnnotation(collaborationId: string, userId: string, paperId: string, annotationId: string): Promise<void> {
    const annotationDocRef = doc(db, 'collaboration', collaborationId, 'papers', paperId, 'users', userId, 'annotations', annotationId);
    await deleteDoc(annotationDocRef);
}