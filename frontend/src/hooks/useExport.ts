import { useState } from 'react';
import type { DocumentPage } from '../types/document';

// Use relative URL - Vite will proxy to backend
const API_BASE_URL = '';

interface ExportOptions {
  filename?: string;
  title?: string;
  tags?: string[];
  paperlessUrl?: string;
  paperlessToken?: string;
}

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const downloadPDF = async (pages: DocumentPage[], options: ExportOptions = {}) => {
    setIsExporting(true);
    setError(null);
    setProgress(0);

    try {
      // Prepare images - just send base64 strings
      const images = pages.map(page => page.processedImage);

      setProgress(25);

      const response = await fetch(`${API_BASE_URL}/api/pdf/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images,
          title: options.filename?.replace('.pdf', '') || `scan_${Date.now()}`,
        }),
      });

      setProgress(75);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate PDF: ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      setProgress(90);

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = options.filename || `scan_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProgress(100);
      setIsExporting(false);

      return true;
    } catch (err) {
      console.error('PDF export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
      setIsExporting(false);
      return false;
    }
  };

  const uploadToPaperless = async (pages: DocumentPage[], options: ExportOptions = {}) => {
    setIsExporting(true);
    setError(null);
    setProgress(0);

    try {
      // Prepare images - just send base64 strings
      const images = pages.map(page => page.processedImage);

      setProgress(10);

      // Use XMLHttpRequest for upload progress tracking
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress (10% to 80%)
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 70) + 10;
            setProgress(percentComplete);
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(90);
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (parseError) {
              reject(new Error('Failed to parse server response'));
            }
          } else {
            reject(new Error(`Failed to upload to Paperless: ${xhr.statusText} - ${xhr.responseText}`));
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was aborted'));
        });

        // Send the request
        xhr.open('POST', `${API_BASE_URL}/api/paperless/upload`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
          images,
          title: options.title || `Scanned Document ${new Date().toLocaleDateString()}`,
          tags: options.tags || ['docu_scan'],
          paperless_url: options.paperlessUrl,
          paperless_token: options.paperlessToken,
        }));
      });

      setProgress(100);
      setIsExporting(false);

      return result;
    } catch (err) {
      console.error('Paperless upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload to Paperless');
      setIsExporting(false);
      return null;
    }
  };

  return {
    downloadPDF,
    uploadToPaperless,
    isExporting,
    error,
    progress,
  };
}
