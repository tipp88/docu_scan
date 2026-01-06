import { useState } from 'react';
import { CameraCapture } from './components/Camera/CameraCapture';
import { CornerAdjuster } from './components/Editor/CornerAdjuster';
import { SettingsModal, useSettings } from './components/Settings/SettingsModal';
import { PagePreviewModal } from './components/Pages/PagePreviewModal';
import { SortablePageGrid } from './components/Pages/SortablePageGrid';
import { SelectionModeHeader } from './components/Pages/SelectionModeHeader';
import { useDocumentStore } from './stores/documentStore';
import { useExport } from './hooks/useExport';
import type { Point, EnhancementMode } from './types/document';
import type { DetectedCorners } from './utils/opencv';

type View = 'camera' | 'preview' | 'review' | 'export';

// Icons as inline SVGs for the refined design
const ScanIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V6a3 3 0 013-3h3M3 15v3a3 3 0 003 3h3M15 3h3a3 3 0 013 3v3M15 21h3a3 3 0 003-3v-3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8M8 12h8" />
  </svg>
);

const PagesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CloudIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ExportIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const DocumentPlusIcon = () => (
  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

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
  const [showSettings, setShowSettings] = useState(false);

  // Page preview modal state
  const [previewPageId, setPreviewPageId] = useState<string | null>(null);
  const [retakePageId, setRetakePageId] = useState<string | null>(null);

  // Multi-select mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());

  const settings = useSettings();
  const { pages, addPage, deletePage, deletePages, replacePage, updatePage, processPage, reorderPages, clear } = useDocumentStore();
  const { downloadPDF, uploadToPaperless, isExporting, error: exportError, progress } = useExport();

  const handleCapture = async (imageData: string, detectedCorners?: DetectedCorners | null) => {
    console.log('Image captured, detectedCorners:', detectedCorners);
    setCapturedImage(imageData);

    // Use detected corners if available (lowered threshold to 0.3)
    if (detectedCorners && detectedCorners.confidence > 0.3) {
      // Convert pixel coordinates to normalized (0-1) coordinates
      const img = new Image();
      img.src = imageData;
      await new Promise(resolve => { img.onload = resolve; });

      const normalizedCorners: [Point, Point, Point, Point] = [
        { x: detectedCorners.topLeft.x / img.width, y: detectedCorners.topLeft.y / img.height },
        { x: detectedCorners.topRight.x / img.width, y: detectedCorners.topRight.y / img.height },
        { x: detectedCorners.bottomRight.x / img.width, y: detectedCorners.bottomRight.y / img.height },
        { x: detectedCorners.bottomLeft.x / img.width, y: detectedCorners.bottomLeft.y / img.height },
      ];
      console.log('Using detected corners with confidence:', detectedCorners.confidence);
      setCorners(normalizedCorners);
    } else {
      // Fallback to default corners
      console.log('Using default corners (no detection or low confidence)');
      setCorners([
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 },
      ]);
    }

    setView('preview');
  };

  const handleCornersChange = (newCorners: [Point, Point, Point, Point]) => {
    setCorners(newCorners);
  };

  const handleAcceptImage = async () => {
    if (!capturedImage) return;

    try {
      setIsProcessing(true);

      if (retakePageId) {
        // Replace existing page
        await replacePage(retakePageId, capturedImage, corners);
        setRetakePageId(null);
      } else {
        // Add new page
        await addPage(capturedImage, corners);
      }

      setCapturedImage(null);
      setView('camera');
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
      setView('review');
    }
  };

  const handleUploadToPaperless = async () => {
    // Use tags from settings, fallback to default
    const tags = settings.paperlessDefaultTags
      ? settings.paperlessDefaultTags.split(',').map(t => t.trim()).filter(Boolean)
      : ['docu_scan'];

    const result = await uploadToPaperless(pages, {
      title: `Scanned Document ${new Date().toLocaleDateString()}`,
      tags,
      paperlessUrl: settings.paperlessUrl,
      paperlessToken: settings.paperlessToken,
    });

    if (result) {
      setView('review');
    }
  };

  const handleError = (error: string) => {
    console.error('Camera error:', error);
  };

  // Preview modal handlers
  const handleOpenPreview = (pageId: string) => {
    if (!selectionMode) {
      setPreviewPageId(pageId);
    }
  };

  const handleClosePreview = () => {
    setPreviewPageId(null);
  };

  const handleDeleteFromPreview = () => {
    if (previewPageId) {
      deletePage(previewPageId);
      setPreviewPageId(null);
    }
  };

  const handleRetakeFromPreview = () => {
    if (previewPageId) {
      setRetakePageId(previewPageId);
      setPreviewPageId(null);
      setView('camera');
    }
  };

  // Selection mode handlers
  const handleLongPress = (pageId: string) => {
    setSelectionMode(true);
    setSelectedPageIds(new Set([pageId]));
  };

  const handleToggleSelection = (pageId: string) => {
    setSelectedPageIds(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPageIds.size === pages.length) {
      setSelectedPageIds(new Set());
    } else {
      setSelectedPageIds(new Set(pages.map(p => p.id)));
    }
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedPageIds(new Set());
  };

  const handleDeleteSelected = () => {
    deletePages(Array.from(selectedPageIds));
    handleCancelSelection();
  };

  // Reorder handler
  const handleReorder = (fromIndex: number, toIndex: number) => {
    reorderPages(fromIndex, toIndex);
  };

  // Enhancement change handler
  const handleEnhancementChange = async (pageId: string, enhancement: EnhancementMode) => {
    updatePage(pageId, { enhancement });
    await processPage(pageId);
  };

  // Get current preview page
  const previewPage = previewPageId ? pages.find(p => p.id === previewPageId) : null;
  const previewPageNumber = previewPageId ? pages.findIndex(p => p.id === previewPageId) + 1 : 0;

  return (
    <div className="w-full h-screen flex flex-col bg-carbon-950 noise-overlay">
      {/* Header */}
      <header className="header px-4 py-3 flex items-center justify-between safe-top">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-glow-amber">
            <svg className="w-5 h-5 text-carbon-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="font-display text-lg text-carbon-100 tracking-tight">DocuScan</h1>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <button
            onClick={() => setView('camera')}
            className={`nav-tab flex items-center gap-2 ${view === 'camera' ? 'active' : ''}`}
            disabled={view === 'preview'}
          >
            <ScanIcon />
            <span className="hidden sm:inline">Scan</span>
          </button>
          <button
            onClick={() => setView('review')}
            className={`nav-tab flex items-center gap-2 ${view === 'review' || view === 'export' ? 'active' : ''}`}
            disabled={pages.length === 0}
          >
            <PagesIcon />
            <span className="hidden sm:inline">Pages</span>
            {pages.length > 0 && (
              <span className="badge badge-amber">{pages.length}</span>
            )}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="nav-tab flex items-center gap-2"
            title="Settings"
          >
            <SettingsIcon />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </nav>
      </header>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative bg-grid">
        {/* Processing Overlay */}
        {isProcessing && (
          <div className="overlay">
            <div className="modal text-center">
              <div className="spinner spinner-lg mx-auto mb-6"></div>
              <h3 className="font-display text-xl text-carbon-100 mb-2">Processing</h3>
              <p className="text-carbon-400 text-sm">Enhancing your document...</p>
            </div>
          </div>
        )}

        {/* Camera View */}
        {view === 'camera' && (
          <div className="animate-fade-in h-full">
            <CameraCapture onCapture={handleCapture} onError={handleError} />
          </div>
        )}

        {/* Preview View - Corner Adjustment */}
        {view === 'preview' && capturedImage && (
          <div className="w-full h-full flex flex-col bg-carbon-950 animate-fade-in">
            {/* Corner Adjustment Area */}
            <div className="flex-1 flex items-center justify-center overflow-hidden p-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <CornerAdjuster
                imageData={capturedImage}
                initialCorners={corners}
                onCornersChange={handleCornersChange}
              />
            </div>

            {/* Preview Controls */}
            <div className="bg-carbon-900 border-t border-carbon-800 p-4 safe-bottom">
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-4">
                  <h3 className="font-display text-lg text-carbon-100 mb-1">Adjust Boundaries</h3>
                  <p className="text-carbon-400 text-sm">Drag the corners to frame your document precisely</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRetake}
                    className="btn btn-secondary flex-1"
                  >
                    <RefreshIcon />
                    <span>Retake</span>
                  </button>
                  <button
                    onClick={handleAcceptImage}
                    className="btn btn-primary flex-1"
                    disabled={isProcessing}
                  >
                    <CheckIcon />
                    <span>Add Page</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review View - Document Pages */}
        {view === 'review' && (
          <div className="w-full h-full overflow-y-auto p-4 animate-fade-in scrollbar-hide">
            <div className="max-w-5xl mx-auto pb-24">
              {/* Selection Mode Header */}
              {selectionMode ? (
                <SelectionModeHeader
                  selectedCount={selectedPageIds.size}
                  totalCount={pages.length}
                  onDeleteSelected={handleDeleteSelected}
                  onSelectAll={handleSelectAll}
                  onCancel={handleCancelSelection}
                />
              ) : (
                /* Normal Header */
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display text-2xl text-carbon-100 mb-1">Your Document</h2>
                    <p className="text-carbon-400 text-sm">
                      {pages.length} page{pages.length !== 1 ? 's' : ''} scanned
                    </p>
                  </div>
                  {pages.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setView('export')}
                        className="btn btn-primary"
                      >
                        <ExportIcon />
                        <span className="hidden sm:inline">Export</span>
                      </button>
                      <button
                        onClick={clear}
                        className="btn btn-danger btn-icon"
                        title="Clear all pages"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State */}
              {pages.length === 0 ? (
                <div className="empty-state mt-12">
                  <div className="empty-state-icon">
                    <DocumentPlusIcon />
                  </div>
                  <h3 className="font-display text-xl text-carbon-300 mb-2">No pages yet</h3>
                  <p className="text-carbon-500 mb-6">Start scanning to add pages to your document</p>
                  <button
                    onClick={() => setView('camera')}
                    className="btn btn-primary"
                  >
                    <ScanIcon />
                    <span>Start Scanning</span>
                  </button>
                </div>
              ) : (
                /* Sortable Page Grid */
                <SortablePageGrid
                  pages={pages}
                  selectionMode={selectionMode}
                  selectedPageIds={selectedPageIds}
                  onPageClick={handleOpenPreview}
                  onPageLongPress={handleLongPress}
                  onToggleSelection={handleToggleSelection}
                  onReorder={handleReorder}
                  onEnhancementChange={handleEnhancementChange}
                  onDeletePage={deletePage}
                />
              )}
            </div>
          </div>
        )}

        {/* Page Preview Modal */}
        {previewPage && (
          <PagePreviewModal
            page={previewPage}
            pageNumber={previewPageNumber}
            onClose={handleClosePreview}
            onDelete={handleDeleteFromPreview}
            onRetake={handleRetakeFromPreview}
          />
        )}

        {/* Export View */}
        {view === 'export' && (
          <div className="w-full h-full flex items-center justify-center p-4 animate-fade-in">
            <div className="card card-elevated p-8 max-w-md w-full">
              {/* Header */}
              <div className="mb-8">
                <button
                  onClick={() => setView('review')}
                  className="btn btn-ghost btn-sm mb-4 -ml-2"
                >
                  <ArrowLeftIcon />
                  <span>Back</span>
                </button>
                <h2 className="font-display text-2xl text-carbon-100 mb-2">Export Document</h2>
                <p className="text-carbon-400">
                  {pages.length} page{pages.length !== 1 ? 's' : ''} ready to export
                </p>
              </div>

              {/* Progress */}
              {isExporting && (
                <div className="mb-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-carbon-300">Exporting...</span>
                    <span className="text-sm font-medium text-amber-400">{progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Error */}
              {exportError && (
                <div className="mb-6 p-4 rounded-xl bg-crimson-500/10 border border-crimson-500/30 animate-fade-in">
                  <h4 className="font-semibold text-crimson-400 mb-1">Export Failed</h4>
                  <p className="text-sm text-crimson-300/80">{exportError}</p>
                </div>
              )}

              {/* Export Options */}
              <div className="space-y-3">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className="export-option"
                >
                  <div className="export-icon bg-amber-400/20">
                    <DownloadIcon />
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-carbon-100 mb-0.5">Download PDF</div>
                    <div className="text-sm text-carbon-400">Save locally to your device</div>
                  </div>
                </button>

                <button
                  onClick={handleUploadToPaperless}
                  disabled={isExporting}
                  className="export-option"
                >
                  <div className="export-icon bg-sage-500/20">
                    <CloudIcon />
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-carbon-100 mb-0.5">Upload to Paperless</div>
                    <div className="text-sm text-carbon-400">Send to document management</div>
                  </div>
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
