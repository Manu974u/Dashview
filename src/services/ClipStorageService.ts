/**
 * ClipStorageService.ts
 * Handles saving, loading, and deleting clips with their companion JSON metadata.
 *
 * Storage path: app-specific external storage (no MANAGE_EXTERNAL_STORAGE needed).
 * RNFS.ExternalDirectoryPath → /sdcard/Android/data/com.dashviewcar.app/files
 */
import RNFS from 'react-native-fs';
import {ClipMetadata} from '../store/useAppStore';

// Use app-specific external directory — writable on Android 11+ without special permissions.
export const CLIPS_DIR = `${RNFS.ExternalDirectoryPath}/clips`;
export const MAX_CLIPS = 20;

export async function ensureClipsDir(): Promise<void> {
  console.log('[ClipStorage] CLIPS_DIR:', CLIPS_DIR);
  try {
    const exists = await RNFS.exists(CLIPS_DIR);
    console.log('[ClipStorage] CLIPS_DIR exists:', exists);
    if (!exists) {
      await RNFS.mkdir(CLIPS_DIR);
      console.log('[ClipStorage] CLIPS_DIR created');
    }
  } catch (e: any) {
    console.error('[ClipStorage] ensureClipsDir ERROR:', e?.message ?? e);
    throw e;
  }
}

export function metaPath(clipFilepath: string): string {
  return clipFilepath.replace('.mp4', '.json');
}

/**
 * Moves the clip from temp path to permanent storage and writes metadata.
 */
export async function saveClip(
  tempPath: string,
  filename: string,
  meta: Omit<ClipMetadata, 'id' | 'filename' | 'filepath'>,
): Promise<ClipMetadata> {
  // Strip file:// prefix — RNFS requires absolute paths, not URIs
  const srcPath = tempPath.startsWith('file://') ? tempPath.slice(7) : tempPath;
  console.log('[ClipStorage] saveClip src:', srcPath);
  console.log('[ClipStorage] saveClip dest filename:', filename);

  await ensureClipsDir();

  const srcExists = await RNFS.exists(srcPath);
  console.log('[ClipStorage] src file exists:', srcExists);
  if (!srcExists) {
    throw new Error('Source video file not found: ' + srcPath);
  }

  const destPath = `${CLIPS_DIR}/${filename}`;
  console.log('[ClipStorage] destPath:', destPath);

  // Try move first; fall back to copy+delete if cross-filesystem move fails.
  try {
    await RNFS.moveFile(srcPath, destPath);
    console.log('[ClipStorage] moveFile OK');
  } catch (moveErr: any) {
    console.warn('[ClipStorage] moveFile failed, trying copy:', moveErr?.message);
    await RNFS.copyFile(srcPath, destPath);
    console.log('[ClipStorage] copyFile OK');
    try {
      await RNFS.unlink(srcPath);
    } catch {}
  }

  const id = filename.replace('.mp4', '');
  const clip: ClipMetadata = {id, filename, filepath: destPath, ...meta};

  await RNFS.writeFile(metaPath(destPath), JSON.stringify(clip, null, 2), 'utf8');
  console.log('[ClipStorage] metadata written — clip saved:', filename);

  return clip;
}

/**
 * Reads all clips from the clips directory, sorted newest first.
 */
export async function loadClips(): Promise<ClipMetadata[]> {
  try {
    await ensureClipsDir();
  } catch {
    return [];
  }

  let items: RNFS.ReadDirItem[];
  try {
    items = await RNFS.readDir(CLIPS_DIR);
  } catch {
    return [];
  }

  const jsonFiles = items.filter(f => f.name.endsWith('.json'));
  const clips: ClipMetadata[] = [];

  for (const file of jsonFiles) {
    try {
      const raw = await RNFS.readFile(file.path, 'utf8');
      const parsed = JSON.parse(raw) as ClipMetadata;
      const mp4Exists = await RNFS.exists(parsed.filepath);
      if (mp4Exists) {
        clips.push(parsed);
      }
    } catch {
      // Ignore corrupt metadata
    }
  }

  clips.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return clips;
}

export async function deleteClip(clip: ClipMetadata): Promise<void> {
  try {
    await RNFS.unlink(clip.filepath);
  } catch {}
  try {
    await RNFS.unlink(metaPath(clip.filepath));
  } catch {}
}

export async function autoDeleteOldClips(days: number): Promise<void> {
  const clips = await loadClips();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  for (const clip of clips) {
    if (new Date(clip.timestamp).getTime() < cutoff) {
      await deleteClip(clip);
    }
  }
}

export async function enforceClipLimit(clips: ClipMetadata[]): Promise<void> {
  if (clips.length <= MAX_CLIPS) {
    return;
  }
  const toDelete = clips.slice(MAX_CLIPS);
  for (const clip of toDelete) {
    await deleteClip(clip);
  }
}

export async function getTempDir(): Promise<string> {
  const dir = `${RNFS.CachesDirectoryPath}/dashviewcar_segments`;
  if (!(await RNFS.exists(dir))) {
    await RNFS.mkdir(dir);
  }
  return dir;
}

export async function clearTempSegments(segmentPaths: string[]): Promise<void> {
  for (const path of segmentPaths) {
    try {
      await RNFS.unlink(path);
    } catch {}
  }
}
