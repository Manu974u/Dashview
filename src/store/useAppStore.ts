import {create} from 'zustand';
import {NativeModules, Platform} from 'react-native';
import {SensitivityLevel} from '../utils/speedCalc';
import {Language} from '../i18n/translations';

// Detect device locale at startup — used as the default language.
// NativeModules.I18nManager.localeIdentifier returns e.g. "fr_FR", "en_US".
const _deviceLocale: string =
  Platform.OS === 'android'
    ? (NativeModules.I18nManager?.localeIdentifier as string | undefined) ?? 'en'
    : 'en';
const _defaultLanguage: Language = _deviceLocale.startsWith('fr') ? 'fr' : 'en';

export type VideoQuality = '720p' | '1080p';
export type AutoDeleteOption = 'never' | '7days' | '30days';
export type AppMode = 'inactive' | 'listening' | 'recording' | 'saving';
export type ClipDuration = 60 | 120 | 240 | 480;

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
  // App mode
  mode: AppMode;
  recordingSecondsLeft: number;
  recordingTrigger: 'voice' | 'impact' | null;
  lastClipSavedAt: string | null;
  voskReady: boolean;

  // Speed monitoring
  speedDetectionEnabled: boolean;
  sensitivity: SensitivityLevel;
  currentSpeedKmh: number;
  gpsActive: boolean;
  currentGps: {lat: number; lng: number} | null;
  lastSpeedDrop: {from: number; to: number} | null;

  // Clips
  clips: ClipMetadata[];

  // Settings
  videoQuality: VideoQuality;
  autoDelete: AutoDeleteOption;
  clipDuration: ClipDuration;

  // Onboarding
  onboardingComplete: boolean;

  // Voice warning — tracks whether the one-time mic privacy modal was shown
  voiceWarningShown: boolean;

  // Language
  language: Language;
  // true = language was set automatically from device locale; false = user manually chose it
  languageIsAutoDetected: boolean;

  // Dev mode
  devMode: boolean;
  devModeVersionTaps: number;

  // Actions
  setMode: (m: AppMode) => void;
  setRecordingSecondsLeft: (v: number) => void;
  setRecordingTrigger: (t: 'voice' | 'impact' | null) => void;
  setLastClipSavedAt: (v: string | null) => void;
  setVoskReady: (v: boolean) => void;
  setSpeedDetectionEnabled: (v: boolean) => void;
  setSensitivity: (s: SensitivityLevel) => void;
  setCurrentSpeed: (kmh: number) => void;
  setGpsActive: (v: boolean) => void;
  setCurrentGps: (gps: {lat: number; lng: number} | null) => void;
  setLastSpeedDrop: (drop: {from: number; to: number} | null) => void;
  addClip: (clip: ClipMetadata) => void;
  removeClip: (id: string) => void;
  setClips: (clips: ClipMetadata[]) => void;
  setVideoQuality: (q: VideoQuality) => void;
  setAutoDelete: (v: AutoDeleteOption) => void;
  setClipDuration: (d: ClipDuration) => void;
  setOnboardingComplete: (v: boolean) => void;
  setVoiceWarningShown: (v: boolean) => void;
  setLanguage: (l: Language) => void;
  setLanguageAutoDetected: (v: boolean) => void;
  tapVersionLabel: () => void;
  clearAllClips: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'inactive',
  recordingSecondsLeft: 60,
  recordingTrigger: null,
  lastClipSavedAt: null,
  voskReady: false,
  speedDetectionEnabled: false,
  sensitivity: 'medium',
  currentSpeedKmh: 0,
  gpsActive: false,
  currentGps: null,
  lastSpeedDrop: null,
  clips: [],
  videoQuality: '1080p',
  autoDelete: 'never',
  clipDuration: 60,
  onboardingComplete: false,
  voiceWarningShown: false,
  language: _defaultLanguage,
  languageIsAutoDetected: true,
  devMode: false,
  devModeVersionTaps: 0,

  setMode: m => set({mode: m}),
  setRecordingSecondsLeft: v => set({recordingSecondsLeft: v}),
  setRecordingTrigger: t => set({recordingTrigger: t}),
  setLastClipSavedAt: v => set({lastClipSavedAt: v}),
  setVoskReady: v => set({voskReady: v}),
  setSpeedDetectionEnabled: v => set({speedDetectionEnabled: v}),
  setSensitivity: s => set({sensitivity: s}),
  setCurrentSpeed: kmh => set({currentSpeedKmh: kmh}),
  setGpsActive: v => set({gpsActive: v}),
  setCurrentGps: gps => set({currentGps: gps}),
  setLastSpeedDrop: drop => set({lastSpeedDrop: drop}),
  addClip: clip =>
    set(state => ({clips: [clip, ...state.clips].slice(0, 20)})),
  removeClip: id =>
    set(state => ({clips: state.clips.filter(c => c.id !== id)})),
  setClips: clips => set({clips}),
  setVideoQuality: q => set({videoQuality: q}),
  setAutoDelete: v => set({autoDelete: v}),
  setClipDuration: d => set({clipDuration: d}),
  setOnboardingComplete: v => set({onboardingComplete: v}),
  setVoiceWarningShown: v => set({voiceWarningShown: v}),
  setLanguage: l => set({language: l, languageIsAutoDetected: false}),
  setLanguageAutoDetected: v => set({languageIsAutoDetected: v}),
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
