import React, { useEffect, useRef } from 'react';
import CollaborativeViewSDKClient from '../../components/CollaborativeViewSDKClient';
import { UserInfo } from '../../../lib/types';

import { Annotation } from '../../../lib/types';
import { createCollaboration, fetchAllUserAnnotations, fetchUserAnnotations, addAnnotation, updateAnnotation, deleteAnnotation } from '../../../lib/coannotations';
import { saveAnnotationDb, getAnnotationsDb, deleteAnnotationDb } from './utils/indexDb';

interface CollaborativeModeProps {
  paperURL: string;
  userInfo: UserInfo;
  paperId: string;
}

const CollaborativeMode: React.FC<CollaborativeModeProps> = ({ paperURL, userInfo, paperId }) => {
  const viewSDKClientRef = useRef<CollaborativeViewSDKClient | null>(null);
  const [selectedText, setSelectedText] = React.useState<string>('');
  const [showButton, setShowButton] = React.useState<boolean>(false);
  const [response, setResponse] = React.useState<string>('');
  const collaborationId = "2rBZ7BfXEpoweXaLYGVs"; // default collaboration ID

  const viewerConfig = {
    /* Viewer configuration options */
    showAnnotationTools: true,
    enableAnnotationAPIs: true,
    enableFormFilling: true,
    showDownloadPDF: true,
    showPrintPDF: true,
    showZoomControl: true,
    defaultViewMode: '',
  };

  const userId = userInfo.id;

  useEffect(() => {
    if (!userId) {
      return;
    }

    const viewSDKClient = new CollaborativeViewSDKClient(paperURL, userInfo);
    viewSDKClientRef.current = viewSDKClient;

    viewSDKClient.ready().then(() => {
      const viewerConfig = {
        enableAnnotationAPIs: true,
        includePDFAnnotations: true,
      };

      // planning:
      // get all the annotations with all the metadata
      // 

      viewSDKClient.previewFile('pdf-div', viewerConfig).then((adobeViewer: any) => {
        adobeViewer.getAnnotationManager().then((annotationManager: any) => {
          // Register event listeners
          annotationManager.registerEventListener(handleAnnotationEvent, {
            listenOn: ['ANNOTATION_ADDED', 'ANNOTATION_UPDATED', 'ANNOTATION_DELETED'],
          });

          // Fetch annotations from Firestore and add them to the PDF
          if (collaborationId) {
            fetchAllUserAnnotations(collaborationId, paperId)
                .then((annotations) => {
                annotationManager.addAnnotations(annotations).then(() => {
                    console.log('Annotations added to the PDF from Firestore.');
                    console.log('Saving annotations to index db...');
                    // add annotation to index db
                    try {
                      annotations.forEach((annotation) => {
                        saveAnnotationDb(annotation);
                      });
                      console.log('Annotations saved to index db successfully.');
                    } catch (error) {
                      console.error('Error saving annotations to index db:', error);
                    }
                });
                })
                .catch((error) => {
                console.error('Error fetching annotations from Firestore:', error);
            });
            };
          });
        });
      viewSDKClient.registerUserProfileApiHandler();
    });

    return () => {
      if (viewSDKClientRef.current) {
        viewSDKClientRef.current = null;
      }
    };
  }, [paperURL, userId, paperId]);

  const handleAnnotationEvent = (event: any) => {
    const annotation = event.data as Annotation;
    if (!userId) return;

    switch (event.type) {
      case 'ANNOTATION_ADDED':
        addAnnotation(collaborationId, userId, paperId, annotation)
          .then(() => {
            console.log('Annotation added to Firestore.');
          })
          .catch((error) => {
            console.error('Error adding annotation to Firestore:', error);
          });
        break;
      case 'ANNOTATION_UPDATED':
        updateAnnotation(collaborationId, userId, paperId, annotation)
          .then(() => {
            console.log('Annotation updated in Firestore.');
          })
          .catch((error) => {
            console.error('Error updating annotation in Firestore:', error);
          });
        break;
      case 'ANNOTATION_DELETED':
        deleteAnnotation(collaborationId, userId, paperId, annotation.id)
          .then(() => {
            console.log('Annotation deleted from Firestore.');
          })
          .catch((error) => {
            console.error('Error deleting annotation from Firestore:', error);
          });
        break;
      default:
        break;
    }
  };

  const handleTextSelection = (event: any) => {
    console.log('Selected text:', event.data);
    const selectedContent = event.data.selectedText;
    if (selectedContent) {
      setSelectedText(selectedContent);
      setShowButton(true);
    } else {
      // setSelectedText('');
      setShowButton(false);
    }
  };

  return (
    <>
      <div id="pdf-div" className="full-window-div" />
    </>
    );
  };

export default CollaborativeMode;