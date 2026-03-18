/**
 * ClipStorageService.ts
 * Handles saving, loading, deleting clips and their companion JSON metadata.
 */
import RNFS from 'react-native-fs';
import {ClipMetadata} from '../store/useAppStore';

export const CLIPS_DIR = '/sdcard/DashView/clips';
export const MAX_CLIPS = 20;

export async function ensureClipsDir(): Promise<void> {
  const exists = await RNFS.exists(CLIPS_DIR);
  if (!exists) {
    await RNFS.mkdir(CLIPS_DIR);
  }
}

export function metaPath(clipFilepath: string): string {
  return clipFilepath.replace('.mp4', '.json');
}

/**
 * Saves the clip file (by moving it from temp) and writes metadata JSON.
 * Also enforces the MAX_CLIPS limit, deleting oldest when exceeded.
 */
export async function saveClip(
  tempPath: string,
  filename: string,
  meta: Omit<ClipMetadata, 'id' | 'filename' | 'filepath'>,
): Promise<ClipMetadata> {
  await ensureClipsDir();

  const destPath = `${CLIPS_DIR}/${filename}`;
  await RNFS.moveFile(tempPath, destPath);

  const id = filename.replace('.mp4', '');
  const clip: ClipMetadata = {
    id,
    filename,
    filepath: destPath,
    ...meta,
  };

  // Write companion JSON
  await RNFS.writeFile(
    metaPath(destPath),
    JSON.stringify(clip, null, 2),
    'utf8',
  );

  return clip;
}

/**
 * Reads all clips from the clips directory, sorted newest first.
 */
export async function loadClips(): Promise<ClipMetadata[]> {
  await ensureClipsDir();

  const items = await RNFS.readDir(CLIPS_DIR);
  const jsonFiles = items.filter(f => f.name.endsWith('.json'));

  const clips: ClipMetadata[] = [];
  for (const file of jsonFiles) {
    try {
      const raw = await RNFS.readFile(file.path, 'utf8');
      const parsed = JSON.parse(raw) as ClipMetadata;
      // Verify the mp4 exists
      const mp4Exists = await RNFS.exists(parsed.filepath);
      if (mp4Exists) {
        clips.push(parsed);
      }
    } catch {
      // Ignore corrupt metadata
    }
  }

  // Sort newest first
  clips.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return clips;
}

/**
 * Deletes a clip and its companion JSON.
 */
export async function deleteClip(clip: ClipMetadata): Promise<void> {
  try {
    await RNFS.unlink(clip.filepath);
  } catch {
    // Already gone
  }
  try {
    await RNFS.unlink(metaPath(clip.filepath));
  } catch {
    // Already gone
  }
}

/**
 * Deletes all clips older than `days` days.
 */
export async function autoDeleteOldClips(days: number): Promise<void> {
  const clips = await loadClips();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  for (const clip of clips) {
    if (new Date(clip.timestamp).getTime() < cutoff) {
      await deleteClip(clip);
    }
  }
}

/**
 * Enforces MAX_CLIPS limit by deleting oldest clips.
 * Called after adding a new clip.
 */
export async function enforceClipLimit(clips: ClipMetadata[]): Promise<void> {
  if (clips.length <= MAX_CLIPS) {
    return;
  }
  // clips is sorted newest first; delete from end
  const toDelete = clips.slice(MAX_CLIPS);
  for (const clip of toDelete) {
    await deleteClip(clip);
  }
}

/**
 * Writes a temp segment buffer to a temp directory.
 */
export async function getTempDir(): Promise<string> {
  const dir = `${RNFS.CachesDirectoryPath}/dashview_segments`;
  const exists = await RNFS.exists(dir);
  if (!exists) {
    await RNFS.mkdir(dir);
  }
  return dir;
}

/**
 * Clears all temp segment files.
 */
export async function clearTempSegments(segmentPaths: string[]): Promise<void> {
  for (const path of segmentPaths) {
    try {
      await RNFS.unlink(path);
    } catch {
      // Ignore
    }
  }
}
