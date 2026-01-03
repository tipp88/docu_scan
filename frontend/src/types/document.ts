export interface Point {
  x: number;
  y: number;
}

export type EnhancementMode = 'color' | 'grayscale' | 'bw' | 'enhanced';

export interface DocumentPage {
  id: string;
  originalImage: string; // base64 or Blob URL
  processedImage: string; // After crop + enhancement
  corners: [Point, Point, Point, Point];
  enhancement: EnhancementMode;
  rotation: 0 | 90 | 180 | 270;
  timestamp: number;
}

export interface CameraConstraints {
  video: {
    facingMode: string;
    width: { ideal: number };
    height: { ideal: number };
    aspectRatio: { ideal: number };
  };
}
