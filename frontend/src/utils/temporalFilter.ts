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
  private missedFrames: number = 0;
  private maxMissedFrames: number = 3; // Allow 3 missed frames before reset

  constructor(maxHistory: number = 5) {
    this.maxHistory = maxHistory;
  }

  /**
   * Add a new detection and return the smoothed result
   */
  update(corners: DetectedCorners | null): DetectedCorners | null {
    if (!corners) {
      this.missedFrames++;

      // Only reset after several consecutive missed frames
      if (this.missedFrames > this.maxMissedFrames) {
        this.reset();
        return null;
      }

      // Return last known good average if we have history
      if (this.history.length > 0) {
        return this.getAverage();
      }
      return null;
    }

    // Reset missed frame counter on successful detection
    this.missedFrames = 0;

    this.history.push(corners);

    // Keep only the most recent frames
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return this.getAverage();
  }

  /**
   * Get weighted averaged corners from history
   * More recent frames have higher weight for smoother tracking
   */
  private getAverage(): DetectedCorners {
    const averaged: DetectedCorners = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 0, y: 0 },
      bottomRight: { x: 0, y: 0 },
      bottomLeft: { x: 0, y: 0 },
      confidence: 0,
    };

    let totalWeight = 0;

    // Weight recent frames more heavily (exponential weighting)
    for (let i = 0; i < this.history.length; i++) {
      const frame = this.history[i];
      // Weight increases for more recent frames (later indices)
      const weight = Math.pow(1.5, i);
      totalWeight += weight;

      averaged.topLeft.x += frame.topLeft.x * weight;
      averaged.topLeft.y += frame.topLeft.y * weight;
      averaged.topRight.x += frame.topRight.x * weight;
      averaged.topRight.y += frame.topRight.y * weight;
      averaged.bottomRight.x += frame.bottomRight.x * weight;
      averaged.bottomRight.y += frame.bottomRight.y * weight;
      averaged.bottomLeft.x += frame.bottomLeft.x * weight;
      averaged.bottomLeft.y += frame.bottomLeft.y * weight;
      averaged.confidence += frame.confidence * weight;
    }

    averaged.topLeft.x /= totalWeight;
    averaged.topLeft.y /= totalWeight;
    averaged.topRight.x /= totalWeight;
    averaged.topRight.y /= totalWeight;
    averaged.bottomRight.x /= totalWeight;
    averaged.bottomRight.y /= totalWeight;
    averaged.bottomLeft.x /= totalWeight;
    averaged.bottomLeft.y /= totalWeight;
    averaged.confidence /= totalWeight;

    return averaged;
  }

  /**
   * Clear the history
   */
  reset() {
    this.history = [];
    this.missedFrames = 0;
  }

  /**
   * Check if detection is stable (enough history, allows brief gaps)
   */
  isStable(): boolean {
    // Stable if we have at least 5 detections and at most 2 missed frames
    return this.history.length >= 5 && this.missedFrames <= 2;
  }

  /**
   * Get stability as a percentage (0-1)
   */
  getStability(): number {
    if (this.missedFrames > 0) {
      return Math.max(0, (this.history.length - this.missedFrames) / this.maxHistory);
    }
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
