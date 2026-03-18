import {create} from 'zustand';
import {SensitivityLevel} from '../utils/speedCalc';

export type VideoQuality = '720p' | '1080p';
export type AutoDeleteOption = 'never' | '7days' | '30days';

export interface ClipMetadata {
  id: string;
  filename: string;
  filepath: string;
  trigger: 'voice' | 'impact';
  timestamp: string; // ISO
  gps: {lat: number; lng: number};
  speedKmh: number;
  duration: number; // seconds
}

interface AppState {
  // Recording
  isRecording: boolean;
  currentSegments: string[]; // file paths of current loop segments

  // Voice
  isListening: boolean;
  lastVoiceTrigger: string | null;

  // Speed monitoring
  speedDetectionEnabled: boolean;
  sensitivity: SensitivityLevel;
  currentSpeedKmh: number;
  gpsActive: boolean;
  currentGps: {lat: number; lng: number} | null;

  // Clips
  clips: ClipMetadata[];

  // Settings
  videoQuality: VideoQuality;
  autoDelete: AutoDeleteOption;

  // Onboarding
  onboardingComplete: boolean;

  // Dev mode
  devMode: boolean;
  devModeVersionTaps: number;

  // Actions
  setRecording: (v: boolean) => void;
  setSegments: (segments: string[]) => void;
  setListening: (v: boolean) => void;
  setLastVoiceTrigger: (phrase: string | null) => void;
  setSpeedDetectionEnabled: (v: boolean) => void;
  setSensitivity: (s: SensitivityLevel) => void;
  setCurrentSpeed: (kmh: number) => void;
  setGpsActive: (v: boolean) => void;
  setCurrentGps: (gps: {lat: number; lng: number} | null) => void;
  addClip: (clip: ClipMetadata) => void;
  removeClip: (id: string) => void;
  setClips: (clips: ClipMetadata[]) => void;
  setVideoQuality: (q: VideoQuality) => void;
  setAutoDelete: (v: AutoDeleteOption) => void;
  setOnboardingComplete: (v: boolean) => void;
  tapVersionLabel: () => void;
  clearAllClips: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isRecording: false,
  currentSegments: [],
  isListening: false,
  lastVoiceTrigger: null,
  speedDetectionEnabled: false,
  sensitivity: 'medium',
  currentSpeedKmh: 0,
  gpsActive: false,
  currentGps: null,
  clips: [],
  videoQuality: '1080p',
  autoDelete: 'never',
  onboardingComplete: false,
  devMode: false,
  devModeVersionTaps: 0,

  setRecording: v => set({isRecording: v}),
  setSegments: segments => set({currentSegments: segments}),
  setListening: v => set({isListening: v}),
  setLastVoiceTrigger: phrase => set({lastVoiceTrigger: phrase}),
  setSpeedDetectionEnabled: v => set({speedDetectionEnabled: v}),
  setSensitivity: s => set({sensitivity: s}),
  setCurrentSpeed: kmh => set({currentSpeedKmh: kmh}),
  setGpsActive: v => set({gpsActive: v}),
  setCurrentGps: gps => set({currentGps: gps}),
  addClip: clip =>
    set(state => {
      const clips = [clip, ...state.clips].slice(0, 20); // max 20 clips
      return {clips};
    }),
  removeClip: id =>
    set(state => ({clips: state.clips.filter(c => c.id !== id)})),
  setClips: clips => set({clips}),
  setVideoQuality: q => set({videoQuality: q}),
  setAutoDelete: v => set({autoDelete: v}),
  setOnboardingComplete: v => set({onboardingComplete: v}),
  tapVersionLabel: () => {
    const taps = get().devModeVersionTaps + 1;
    if (taps >= 5) {
      set({devModeVersionTaps: 0, devMode: !get().devMode});
    } else {
      set({devModeVersionTaps: taps});
    }
  },
  clearAllClips: () => set({clips: []}),
}));
