/**
 * RecordingService.ts
 * Manages the circular-buffer loop recording.
 *
 * Strategy:
 * - Records 10-second segments using react-native-vision-camera
 * - Keeps the last 6 segments in a rolling buffer (= 60 s of footage)
 * - On save: stops the in-progress segment to flush it, snapshots the buffer,
 *   resumes recording immediately (no gap), then merges in the background
 *   using ffmpeg-kit-react-native with -f concat -c copy (fast, lossless).
 */

import {Camera, VideoFile} from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import {FFmpegKit, ReturnCode} from 'ffmpeg-kit-react-native';
import {useAppStore} from '../store/useAppStore';
import {getCurrentGps} from './LocationService';
import {buildClipFilename} from '../utils/datetime';

export const SEGMENT_DURATION_SECONDS = 10;
export const MAX_SEGMENTS = 6; // 6 × 10 s = 60 s

interface SegmentRecord {
  path: string;
  startedAt: number; // ms timestamp
}

class RecordingServiceClass {
  private cameraRef: Camera | null = null;
  private segments: SegmentRecord[] = [];
  private isRecording = false;
  private isSaving = false;
  private segmentTimer: ReturnType<typeof setTimeout> | null = null;

  setCameraRef(ref: Camera | null) {
    this.cameraRef = ref;
  }

  /** Start the loop recording. */
  async start(): Promise<void> {
    if (this.isRecording) {
      return;
    }
    this.isRecording = true;
    useAppStore.getState().setRecording(true);
    await this.recordNextSegment();
  }

  /** Stop all recording cleanly. */
  async stop(): Promise<void> {
    this.isRecording = false;
    if (this.segmentTimer) {
      clearTimeout(this.segmentTimer);
      this.segmentTimer = null;
    }
    try {
      await this.cameraRef?.stopRecording();
    } catch {
      // Ignore if already stopped
    }
    useAppStore.getState().setRecording(false);
  }

  /**
   * Records one 10-second segment, then rotates the buffer.
   * Called recursively to maintain the loop.
   */
  private async recordNextSegment(): Promise<void> {
    if (!this.isRecording || !this.cameraRef) {
      return;
    }

    this.cameraRef.startRecording({
      fileType: 'mp4',
      onRecordingFinished: (video: VideoFile) => {
        this.onSegmentFinished(video.path);
      },
      onRecordingError: _error => {
        if (this.isRecording) {
          setTimeout(() => this.recordNextSegment(), 1_000);
        }
      },
    });

    // Stop this segment after SEGMENT_DURATION_SECONDS
    this.segmentTimer = setTimeout(async () => {
      if (!this.isRecording) {
        return;
      }
      try {
        await this.cameraRef?.stopRecording();
      } catch {
        // Camera may have already been stopped externally
      }
    }, SEGMENT_DURATION_SECONDS * 1_000);
  }

  private onSegmentFinished(path: string): void {
    this.segments.push({path, startedAt: Date.now()});

    // Keep only the last MAX_SEGMENTS; evict and delete the oldest
    if (this.segments.length > MAX_SEGMENTS) {
      const evicted = this.segments.splice(0, this.segments.length - MAX_SEGMENTS);
      for (const seg of evicted) {
        RNFS.unlink(seg.path).catch(() => {});
      }
    }

    useAppStore.getState().setSegments(this.segments.map(s => s.path));

    if (this.isRecording) {
      void this.recordNextSegment();
    }
  }

  /**
   * Saves the current buffer as a single merged clip.
   *
   * Flow:
   * 1. Flush the in-progress segment (stopRecording).
   * 2. Snapshot the segment paths + GPS metadata.
   * 3. Resume recording immediately → no gap in the loop.
   * 4. Merge the snapshotted segments with ffmpeg-kit in the background.
   * 5. Persist the clip and clean up source segments.
   *
   * Returns the final clip filepath, or null on failure.
   */
  async saveClip(trigger: 'voice' | 'impact'): Promise<string | null> {
    if (this.isSaving || this.segments.length === 0) {
      return null;
    }
    this.isSaving = true;

    // ── Step 1: flush the in-progress segment ──────────────────────────
    const wasRecording = this.isRecording;
    if (wasRecording) {
      // Cancel the auto-stop timer so it doesn't fire mid-flush
      if (this.segmentTimer) {
        clearTimeout(this.segmentTimer);
        this.segmentTimer = null;
      }
      this.isRecording = false; // prevent onSegmentFinished from restarting loop
      try {
        await this.cameraRef?.stopRecording();
      } catch {
        // Already stopped
      }
    }

    // ── Step 2: snapshot before resuming ───────────────────────────────
    const segPaths = this.segments.map(s => s.path);
    const segCount = segPaths.length;
    const gps = await getCurrentGps().catch(() => ({
      lat: 0,
      lng: 0,
      speedKmh: 0,
      timestamp: Date.now(),
    }));
    const timestamp = new Date().toISOString();
    const filename = buildClipFilename(trigger);

    // ── Step 3: resume recording immediately ───────────────────────────
    if (wasRecording) {
      this.segments = [];
      useAppStore.getState().setSegments([]);
      this.isRecording = true;
      useAppStore.getState().setRecording(true);
      void this.recordNextSegment();
    }

    // ── Steps 4 & 5: merge + persist (background) ──────────────────────
    try {
      const mergedPath = await this.mergeSegments(segPaths, filename);

      if (!mergedPath) {
        return null;
      }

      const {saveClip, enforceClipLimit} = await import('./ClipStorageService');

      const clip = await saveClip(mergedPath, filename, {
        trigger,
        timestamp,
        gps: {lat: gps.lat, lng: gps.lng},
        speedKmh: gps.speedKmh,
        duration: segCount * SEGMENT_DURATION_SECONDS,
      });

      const store = useAppStore.getState();
      store.addClip(clip);
      await enforceClipLimit(store.clips);

      return clip.filepath;
    } finally {
      this.isSaving = false;
      // Delete source segments now that they're merged (or merge failed)
      for (const p of segPaths) {
        RNFS.unlink(p).catch(() => {});
      }
    }
  }

  /**
   * Merges multiple MP4 segments into one file using ffmpeg-kit-react-native.
   *
   * Uses the concat demuxer with -c copy (stream copy, no re-encoding).
   * This is nearly instantaneous since it just concatenates the bitstream.
   * -movflags +faststart moves the moov atom to the file start for proper playback.
   *
   * Single-segment shortcut: skips FFmpeg and copies directly.
   */
  private async mergeSegments(
    segPaths: string[],
    filename: string,
  ): Promise<string | null> {
    if (segPaths.length === 0) {
      return null;
    }

    const tempOutput = `${RNFS.CachesDirectoryPath}/${filename}`;

    // Fast path: only one segment, no concat needed
    if (segPaths.length === 1) {
      try {
        await RNFS.copyFile(segPaths[0], tempOutput);
        return tempOutput;
      } catch {
        return null;
      }
    }

    // Write concat list: each line is  file '/absolute/path/to/seg.mp4'
    const listContent = segPaths.map(p => `file '${p}'`).join('\n');
    const listPath = `${RNFS.CachesDirectoryPath}/dashview_concat_list.txt`;

    try {
      await RNFS.writeFile(listPath, listContent, 'utf8');

      const session = await FFmpegKit.execute(
        `-f concat -safe 0 -i "${listPath}" -c copy -movflags +faststart "${tempOutput}"`,
      );

      const returnCode = await session.getReturnCode();

      if (ReturnCode.isSuccess(returnCode)) {
        return tempOutput;
      }

      // Log FFmpeg output to help diagnose failures in dev builds
      if (__DEV__) {
        const output = await session.getOutput();
        console.warn('[RecordingService] FFmpeg merge failed:', output);
      }

      return null;
    } catch (e) {
      if (__DEV__) {
        console.warn('[RecordingService] FFmpeg error:', e);
      }
      return null;
    } finally {
      RNFS.unlink(listPath).catch(() => {});
    }
  }

  getSegments(): string[] {
    return this.segments.map(s => s.path);
  }
}

export const RecordingService = new RecordingServiceClass();
