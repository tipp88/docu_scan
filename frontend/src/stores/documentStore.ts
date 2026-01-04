import { create } from 'zustand';
import type { DocumentPage, Point, EnhancementMode } from '../types/document';
import { applyPerspectiveTransform } from '../utils/perspectiveTransform';
import { cropWithPerspective } from '../utils/canvasCrop';
import { detectBestEnhancement, enhanceImage } from '../utils/imageEnhancement';
import { getOpenCV } from '../utils/opencv';

// Get default enhancement mode from settings
function getDefaultEnhancement(): EnhancementMode | 'auto' {
  try {
    const stored = localStorage.getItem('docuscan_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      return settings.defaultEnhancement || 'auto';
    }
  } catch (e) {
    console.error('Failed to read enhancement setting:', e);
  }
  return 'auto'; // Fallback
}

interface DocumentStore {
  pages: DocumentPage[];
  currentPageIndex: number | null;
  isProcessing: boolean;

  // Actions
  addPage: (originalImage: string, corners?: [Point, Point, Point, Point]) => Promise<void>;
  updatePage: (id: string, updates: Partial<DocumentPage>) => void;
  deletePage: (id: string) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  rotatePage: (id: string) => void;
  setCurrentPage: (index: number | null) => void;
  processPage: (id: string) => Promise<void>;
  clear: () => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  pages: [],
  currentPageIndex: null,
  isProcessing: false,

  addPage: async (originalImage: string, corners?: [Point, Point, Point, Point]) => {
    set({ isProcessing: true });

    try {
      const pageCorners = corners || [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];

      // Determine enhancement mode from settings
      const defaultMode = getDefaultEnhancement();
      let enhancementMode: EnhancementMode;

      if (defaultMode === 'auto') {
        // Auto-detect best enhancement based on image characteristics
        enhancementMode = await detectBestEnhancement(originalImage);
        console.log('Auto-detected enhancement mode:', enhancementMode);
      } else {
        enhancementMode = defaultMode;
        console.log('Using configured enhancement mode:', enhancementMode);
      }

      const newPage: DocumentPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        originalImage,
        processedImage: originalImage, // Will be updated by processing
        corners: pageCorners, // Normalized coordinates (0-1)
        enhancement: enhancementMode,
        rotation: 0,
        timestamp: Date.now(),
      };

      set(state => ({
        pages: [...state.pages, newPage],
        currentPageIndex: state.pages.length,
      }));

      console.log('Page added successfully, processing...', newPage.id);

      // Process the page in the background
      await get().processPage(newPage.id);

      set({ isProcessing: false });
    } catch (error) {
      console.error('Error adding page:', error);
      set({ isProcessing: false });
    }
  },

  processPage: async (id: string) => {
    const state = get();
    const page = state.pages.find(p => p.id === id);
    if (!page) return;

    set({ isProcessing: true });

    try {
      let processed = page.originalImage;

      // Check if corners are custom (not default full image)
      const isDefaultCorners =
        page.corners[0].x === 0 && page.corners[0].y === 0 &&
        page.corners[1].x === 1 && page.corners[1].y === 0 &&
        page.corners[2].x === 1 && page.corners[2].y === 1 &&
        page.corners[3].x === 0 && page.corners[3].y === 1;

      const hasValidCorners = !isDefaultCorners;

      if (hasValidCorners) {
        // Get image dimensions to denormalize corners
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = page.originalImage;
        });

        const denormalizedCorners: [Point, Point, Point, Point] = page.corners.map(c => ({
          x: c.x * img.width,
          y: c.y * img.height,
        })) as [Point, Point, Point, Point];

        // Try OpenCV-based perspective correction first
        const cv = getOpenCV();
        if (cv) {
          try {
            processed = await applyPerspectiveTransform(
              page.originalImage,
              denormalizedCorners
            );
          } catch (error) {
            processed = await cropWithPerspective(page.originalImage, page.corners);
          }
        } else {
          processed = await cropWithPerspective(page.originalImage, page.corners);
        }
      }

      // Apply enhancement if OpenCV is available (loaded via HTML script tag)
      let enhanced = processed;
      if (page.enhancement !== 'color') {
        const cv = getOpenCV();
        if (cv) {
          try {
            enhanced = await enhanceImage(processed, page.enhancement);
          } catch (error) {
            console.error('Enhancement failed:', error);
          }
        }
      }

      // Update the page
      set(state => ({
        pages: state.pages.map(p =>
          p.id === id ? { ...p, processedImage: enhanced } : p
        ),
        isProcessing: false,
      }));
    } catch (error) {
      console.error('Error processing page:', error);
      set({ isProcessing: false });
    }
  },

  updatePage: (id: string, updates: Partial<DocumentPage>) => {
    set(state => ({
      pages: state.pages.map(page =>
        page.id === id ? { ...page, ...updates } : page
      ),
    }));
  },

  deletePage: (id: string) => {
    set(state => {
      const newPages = state.pages.filter(page => page.id !== id);
      const currentIndex = state.currentPageIndex;
      let newCurrentIndex = currentIndex;

      if (currentIndex !== null) {
        if (newPages.length === 0) {
          newCurrentIndex = null;
        } else if (currentIndex >= newPages.length) {
          newCurrentIndex = newPages.length - 1;
        }
      }

      return {
        pages: newPages,
        currentPageIndex: newCurrentIndex,
      };
    });
  },

  reorderPages: (fromIndex: number, toIndex: number) => {
    set(state => {
      const pages = [...state.pages];
      const [removed] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, removed);

      return { pages };
    });
  },

  rotatePage: (id: string) => {
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === id) {
          const newRotation = ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270;
          return { ...page, rotation: newRotation };
        }
        return page;
      }),
    }));
  },

  setCurrentPage: (index: number | null) => {
    set({ currentPageIndex: index });
  },

  clear: () => {
    set({ pages: [], currentPageIndex: null });
  },
}));
