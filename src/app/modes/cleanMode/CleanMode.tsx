// src/clearMode/CleanMode.tsx
import React, { useEffect, useRef } from 'react';
import CleanViewSDKClient from '../../components/CleanViewSDKClient';

interface CleanModeProps {
  paperURL: string;
}

const CleanMode: React.FC<CleanModeProps> = ({ paperURL }) => {
  const viewSDKClientRef = useRef<CleanViewSDKClient | null>(null);

  const viewerConfig = {
    /* Viewer configuration options */
    showAnnotationTools: false,
    enableAnnotationAPIs: false,
    enableFormFilling: false,
    showDownloadPDF: true,
    showPrintPDF: true,
    showZoomControl: true,
    defaultViewMode: '',
  };

  useEffect(() => {
    // Clean up the previous instance if exists
    if (viewSDKClientRef.current) {
      // If ViewSDKClient has a cleanup method, call it here
      viewSDKClientRef.current = null;
    }

    // Initialize a new ViewSDKClient instance
    const viewSDKClient = new CleanViewSDKClient(paperURL);
    viewSDKClientRef.current = viewSDKClient;

    viewSDKClient.ready().then(() => {
      /* Invoke file preview */
      viewSDKClient.previewFile('pdf-div', viewerConfig);
    });

    // Cleanup function when component unmounts or paperURL changes
    return () => {
      if (viewSDKClientRef.current) {
        // If ViewSDKClient has a cleanup method, call it here
        viewSDKClientRef.current = null;
      }
    };
  }, [paperURL]); // Re-run when paperURL changes

  return <div id="pdf-div" className="full-window-div" />;
};

export default CleanMode;