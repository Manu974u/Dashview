import React, {useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import {Camera} from 'react-native-vision-camera';
import CameraPreview from '../components/CameraPreview';
import RecordingIndicator from '../components/RecordingIndicator';
import VoiceBadge from '../components/VoiceBadge';
import SpeedBadge from '../components/SpeedBadge';
import ImpactBadge from '../components/ImpactBadge';
import {useAppStore} from '../store/useAppStore';
import {RecordingService} from '../services/RecordingService';
import {VoiceService} from '../services/VoiceService';
import {SpeedMonitorService} from '../services/SpeedMonitorService';
import {startLocationWatch, stopLocationWatch} from '../services/LocationService';
import {startForegroundService, stopForegroundService} from '../services/ForegroundService';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  }
}

export default function HomeScreen(): React.JSX.Element {
  const cameraRef = useRef<Camera>(null);

  const isRecording = useAppStore(s => s.isRecording);
  const isListening = useAppStore(s => s.isListening);
  const currentSpeedKmh = useAppStore(s => s.currentSpeedKmh);
  const gpsActive = useAppStore(s => s.gpsActive);
  const speedDetectionEnabled = useAppStore(s => s.speedDetectionEnabled);
  const setSpeedDetectionEnabled = useAppStore(s => s.setSpeedDetectionEnabled);

  /**
   * Triggered when voice wake word "Dash" is detected.
   */
  const handleVoiceTrigger = useCallback(async () => {
    showToast('🎤 Clip saved');
    await RecordingService.saveClip('voice');
  }, []);

  /**
   * Triggered when speed drop + G-force spike are detected.
   */
  const handleImpactTrigger = useCallback(async () => {
    Alert.alert(
      '⚠️ Sudden speed drop detected',
      'Clip saved automatically.',
      [{text: 'OK'}],
    );
    await RecordingService.saveClip('impact');
  }, []);

  // Wire up service callbacks
  useEffect(() => {
    VoiceService.setWakeWordCallback(handleVoiceTrigger);
    SpeedMonitorService.setImpactCallback(handleImpactTrigger);
  }, [handleVoiceTrigger, handleImpactTrigger]);

  // Start services on mount
  useEffect(() => {
    RecordingService.setCameraRef(cameraRef.current);
    const stopLocation = startLocationWatch();
    VoiceService.start().catch(console.warn);
    SpeedMonitorService.start();

    return () => {
      stopLocation();
      VoiceService.stop().catch(console.warn);
      SpeedMonitorService.stop();
    };
  }, []);

  // Keep camera ref in sync
  useEffect(() => {
    RecordingService.setCameraRef(cameraRef.current);
  });

  async function handleStartStop() {
    if (isRecording) {
      await stopForegroundService();
      await RecordingService.stop();
    } else {
      await startForegroundService();
      await RecordingService.start();
    }
  }

  function handleToggleSpeedDetection() {
    if (!speedDetectionEnabled) {
      if (!gpsActive) {
        Alert.alert(
          '⚠️ GPS required',
          'GPS must be active for speed drop detection to work.',
        );
        return;
      }
      Alert.alert(
        'Enable Speed Detection',
        '⚠️ GPS must be active for this feature to work. DashView will save a clip automatically if a sudden speed drop is detected.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Enable',
            onPress: () => setSpeedDetectionEnabled(true),
          },
        ],
      );
    } else {
      setSpeedDetectionEnabled(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Full-screen camera preview */}
      <CameraPreview ref={cameraRef} isActive={true} />

      {/* UI overlay */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Top bar */}
        <View style={styles.topBar} pointerEvents="box-none">
          <Text style={styles.appName}>DashView</Text>
          {/* Status row */}
          <View style={styles.statusRow} pointerEvents="box-none">
            <RecordingIndicator isRecording={isRecording} />
            <VoiceBadge isListening={isListening} />
            <SpeedBadge
              speedKmh={currentSpeedKmh}
              gpsActive={gpsActive}
              detectionEnabled={speedDetectionEnabled}
            />
          </View>
        </View>

        {/* Center content */}
        <View style={styles.center} pointerEvents="box-none">
          <ImpactBadge
            enabled={speedDetectionEnabled}
            onToggle={handleToggleSpeedDetection}
          />
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[
              styles.recordBtn,
              isRecording ? styles.recordBtnActive : styles.recordBtnIdle,
            ]}
            onPress={handleStartStop}
            activeOpacity={0.8}
            accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}>
            <View style={styles.recordBtnInner}>
              {isRecording ? (
                <View style={styles.stopSquare} />
              ) : (
                <View style={styles.startCircle} />
              )}
            </View>
            <Text style={styles.recordBtnLabel}>
              {isRecording ? 'Stop' : 'Start'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  appName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  center: {
    alignItems: 'center',
  },
  bottomControls: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  recordBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  recordBtnActive: {
    backgroundColor: colors.accent + '30',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  recordBtnIdle: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 3,
    borderColor: colors.textPrimary,
  },
  recordBtnInner: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSquare: {
    width: 22,
    height: 22,
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  startCircle: {
    width: 34,
    height: 34,
    backgroundColor: colors.accent,
    borderRadius: 17,
  },
  recordBtnLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
