/**
 * Stub for ffmpeg-kit-react-native.
 * The official Maven artifacts (com.arthenica:ffmpeg-kit-min:6.0-2) are not
 * available on any public Maven repository, so the native module is disabled
 * via react-native.config.js.  This stub preserves the TypeScript API shape
 * and lets mergeSegments() return null gracefully at runtime.
 */

export class ReturnCode {
  static isSuccess(_rc: ReturnCode | null): boolean {
    return false;
  }
  static isCancel(_rc: ReturnCode | null): boolean {
    return false;
  }
}

class FFmpegSession {
  async getReturnCode(): Promise<ReturnCode | null> {
    return null;
  }
  async getOutput(): Promise<string> {
    return '[ffmpeg-kit stub] native module not available';
  }
}

export const FFmpegKit = {
  async execute(_command: string): Promise<FFmpegSession> {
    console.warn(
      '[ffmpeg-kit-react-native] Running as stub — native module not linked. ' +
        'Video merging is unavailable.',
    );
    return new FFmpegSession();
  },
};
