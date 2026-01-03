/**
 * Temporal filtering to smooth jittery corner detection
 */

export interface DetectedCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  confidence: number;
}

export class TemporalFilter {
  private history: DetectedCorners[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 5) {
    this.maxHistory = maxHistory;
  }

  /**
   * Add a new detection and return the smoothed result
   */
  update(corners: DetectedCorners | null): DetectedCorners | null {
    if (!corners) {
      this.reset();
      return null;
    }

    this.history.push(corners);

    // Keep only the most recent frames
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Average all frames in history
    const averaged: DetectedCorners = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 0, y: 0 },
      bottomRight: { x: 0, y: 0 },
      bottomLeft: { x: 0, y: 0 },
      confidence: 0,
    };

    for (const frame of this.history) {
      averaged.topLeft.x += frame.topLeft.x;
      averaged.topLeft.y += frame.topLeft.y;
      averaged.topRight.x += frame.topRight.x;
      averaged.topRight.y += frame.topRight.y;
      averaged.bottomRight.x += frame.bottomRight.x;
      averaged.bottomRight.y += frame.bottomRight.y;
      averaged.bottomLeft.x += frame.bottomLeft.x;
      averaged.bottomLeft.y += frame.bottomLeft.y;
      averaged.confidence += frame.confidence;
    }

    const count = this.history.length;
    averaged.topLeft.x /= count;
    averaged.topLeft.y /= count;
    averaged.topRight.x /= count;
    averaged.topRight.y /= count;
    averaged.bottomRight.x /= count;
    averaged.bottomRight.y /= count;
    averaged.bottomLeft.x /= count;
    averaged.bottomLeft.y /= count;
    averaged.confidence /= count;

    return averaged;
  }

  /**
   * Clear the history
   */
  reset() {
    this.history = [];
  }

  /**
   * Check if detection is stable (history is full)
   */
  isStable(): boolean {
    return this.history.length >= this.maxHistory;
  }

  /**
   * Get stability as a percentage (0-1)
   */
  getStability(): number {
    return this.history.length / this.maxHistory;
  }
}

/**
 * Frame rate limiter to control processing frequency
 */
export class FrameRateLimiter {
  private lastProcessTime: number = 0;
  private minInterval: number;

  constructor(targetFps: number = 8) {
    this.minInterval = 1000 / targetFps;
  }

  /**
   * Check if enough time has passed to process the next frame
   */
  shouldProcess(): boolean {
    const now = performance.now();
    if (now - this.lastProcessTime >= this.minInterval) {
      this.lastProcessTime = now;
      return true;
    }
    return false;
  }

  /**
   * Update the target FPS
   */
  setFps(fps: number) {
    this.minInterval = 1000 / fps;
  }
}
