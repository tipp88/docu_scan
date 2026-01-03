import { useState } from 'react';
import { CameraCapture } from './components/Camera/CameraCapture';
import { CornerAdjuster } from './components/Editor/CornerAdjuster';
import { useDocumentStore } from './stores/documentStore';
import { useExport } from './hooks/useExport';
import type { Point } from './types/document';

type View = 'camera' | 'preview' | 'review' | 'export';

function App() {
  const [view, setView] = useState<View>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [corners, setCorners] = useState<[Point, Point, Point, Point]>([
    { x: 0.1, y: 0.1 },
    { x: 0.9, y: 0.1 },
    { x: 0.9, y: 0.9 },
    { x: 0.1, y: 0.9 },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { pages, addPage, deletePage, clear } = useDocumentStore();
  const { downloadPDF, uploadToPaperless, isExporting, error: exportError, progress } = useExport();

  const handleCapture = async (imageData: string) => {
    console.log('Image captured, showing preview for corner adjustment');
    setCapturedImage(imageData);
    // Reset corners to default for new image
    setCorners([
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ]);
    setView('preview');
  };

  const handleCornersChange = (newCorners: [Point, Point, Point, Point]) => {
    setCorners(newCorners);
  };

  const handleAcceptImage = async () => {
    if (!capturedImage) return;

    try {
      setIsProcessing(true);
      await addPage(capturedImage, corners);

      setCapturedImage(null);
      setView('camera'); // Return to camera for next page
    } catch (error) {
      console.error('Error adding page:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setView('camera');
  };

  const handleDownloadPDF = async () => {
    const success = await downloadPDF(pages, {
      filename: `scan_${new Date().toISOString().split('T')[0]}.pdf`,
    });

    if (success) {
      // Optionally clear pages after successful download
      // clear();
      setView('review');
    }
  };

  const handleUploadToPaperless = async () => {
    const result = await uploadToPaperless(pages, {
      title: `Scanned Document ${new Date().toLocaleDateString()}`,
      tags: ['docu_scan'],
    });

    if (result) {
      // Optionally clear pages after successful upload
      // clear();
      setView('review');
    }
  };

  const handleError = (error: string) => {
    console.error('Camera error:', error);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Document Scanner</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('camera')}
            className={`px-4 py-2 rounded ${
              view === 'camera' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
            disabled={view === 'preview'}
          >
            Scan
          </button>
          <button
            onClick={() => setView('review')}
            className={`px-4 py-2 rounded ${
              view === 'review' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
            disabled={pages.length === 0}
          >
            Pages ({pages.length})
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 1000 }}>
            <div className="bg-white p-6 rounded-lg text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-800 font-medium">Processing page...</p>
            </div>
          </div>
        )}

        {view === 'camera' && (
          <CameraCapture onCapture={handleCapture} onError={handleError} />
        )}

        {view === 'preview' && capturedImage && (
          <div className="w-full h-full flex flex-col bg-black">
            {/* Corner Adjustment - constrained to not overflow */}
            <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              <CornerAdjuster
                imageData={capturedImage}
                initialCorners={corners}
                onCornersChange={handleCornersChange}
              />
            </div>

            {/* Preview Controls - Fixed at bottom */}
            <div className="bg-gray-800 p-4 flex-shrink-0">
              <div className="max-w-2xl mx-auto">
                <p className="text-white text-center mb-2 text-sm font-medium">
                  Adjust document boundaries
                </p>
                <p className="text-gray-400 text-center mb-4 text-xs">
                  Drag the blue corners to frame your document
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleRetake}
                    className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-500 text-sm"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleAcceptImage}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-500 text-sm"
                    disabled={isProcessing}
                  >
                    Add to Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'review' && (
          <div className="w-full h-full overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-2xl font-bold">
                  Document Pages ({pages.length})
                </h2>
                <div className="flex gap-2">
                  {pages.length > 0 && (
                    <>
                      <button
                        onClick={() => setView('export')}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium"
                      >
                        Export Document
                      </button>
                      <button
                        onClick={clear}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        Clear All
                      </button>
                    </>
                  )}
                </div>
              </div>

              {pages.length === 0 ? (
                <div className="text-center text-gray-400 mt-12">
                  <p className="text-lg">No pages in document yet</p>
                  <p className="mt-2">Go to Scan view to add pages</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pages.map((page, index) => (
                    <div
                      key={page.id}
                      className="bg-gray-800 rounded-lg overflow-hidden shadow-lg"
                    >
                      <div className="relative aspect-[3/4]">
                        <img
                          src={page.processedImage}
                          alt={`Page ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                          Page {index + 1}
                        </div>
                      </div>
                      <div className="p-4 flex gap-2">
                        <button
                          onClick={() => deletePage(page.id)}
                          className="flex-1 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'export' && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full">
              <h2 className="text-white text-2xl font-bold mb-6">Export Document</h2>
              <p className="text-gray-300 mb-6">
                {pages.length} page{pages.length !== 1 ? 's' : ''} ready to export
              </p>

              {isExporting && (
                <div className="mb-6">
                  <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-gray-300 text-sm mt-2 text-center">
                    Exporting... {progress}%
                  </p>
                </div>
              )}

              {exportError && (
                <div className="mb-6 bg-red-500 bg-opacity-20 border border-red-500 text-red-200 p-4 rounded">
                  <p className="font-medium">Export Failed</p>
                  <p className="text-sm mt-1">{exportError}</p>
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-blue-500 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="font-bold">Download as PDF</div>
                  <div className="text-sm text-blue-100">Save to your device</div>
                </button>

                <button
                  onClick={handleUploadToPaperless}
                  disabled={isExporting}
                  className="w-full bg-green-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-green-500 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="font-bold">Upload to Paperless-ngx</div>
                  <div className="text-sm text-green-100">Send to document management</div>
                </button>

                <button
                  onClick={() => setView('review')}
                  disabled={isExporting}
                  className="w-full bg-gray-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back to Review
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
