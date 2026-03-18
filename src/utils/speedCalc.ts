export type SensitivityLevel = 'low' | 'medium' | 'high';

const THRESHOLDS: Record<SensitivityLevel, number> = {
  low: 50,
  medium: 30,
  high: 20,
};

const WINDOW_SECONDS = 3;

export interface SpeedSample {
  speedKmh: number;
  timestamp: number; // ms
}

/**
 * Returns the threshold (km/h drop) for a given sensitivity level.
 */
export function getThreshold(sensitivity: SensitivityLevel): number {
  return THRESHOLDS[sensitivity];
}

/**
 * Given a rolling window of speed samples and the current sensitivity,
 * returns true if a sudden speed drop is detected.
 *
 * Checks the drop between the oldest sample within the 3-second window
 * and the most recent sample.
 */
export function detectSpeedDrop(
  samples: SpeedSample[],
  sensitivity: SensitivityLevel,
): boolean {
  if (samples.length < 2) {
    return false;
  }

  const now = samples[samples.length - 1];
  const windowStart = now.timestamp - WINDOW_SECONDS * 1000;

  // Find the oldest sample within the window
  const windowSamples = samples.filter(s => s.timestamp >= windowStart);
  if (windowSamples.length < 2) {
    return false;
  }

  const oldest = windowSamples[0];
  const drop = oldest.speedKmh - now.speedKmh;
  const threshold = getThreshold(sensitivity);

  return drop >= threshold;
}

/**
 * Converts m/s (from GPS) to km/h
 */
export function msToKmh(ms: number): number {
  return ms * 3.6;
}
