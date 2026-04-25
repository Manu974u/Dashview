import React, {useState, useMemo} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Video, {OnLoadData, OnProgressData} from 'react-native-video';
import {Theme} from '../theme/colors';
import {useTheme} from '../hooks/useTheme';
import {formatDuration} from '../utils/datetime';

interface Props {
  uri: string;
  onClose: () => void;
}

export default function ClipPlayer({uri, onClose}: Props): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleLoad(data: OnLoadData) {
    setDuration(Math.floor(data.duration));
  }

  function handleProgress(data: OnProgressData) {
    setCurrentTime(Math.floor(data.currentTime));
  }

  function handleError(e: any) {
    const msg: string =
      e?.error?.errorString ??
      e?.message ??
      'Unable to play this video. The file may be corrupted or incomplete.';
    setError(msg);
  }

  const safeUri = uri && uri.trim() ? `file://${uri}` : null;
  const progress = duration > 0 ? currentTime / duration : 0;

  // Error / invalid URI state
  if (!safeUri || error) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.errorBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Playback Error</Text>
          <Text style={styles.errorMessage}>
            {error ?? 'Video file path is invalid.'}
          </Text>
          <TouchableOpacity
            style={styles.errorCloseBtn}
            onPress={onClose}
            accessibilityLabel="Close player">
            <Text style={styles.errorCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Video
        source={{uri: safeUri}}
        style={styles.video}
        resizeMode="contain"
        paused={paused}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onError={handleError}
        repeat={false}
        onEnd={() => setPaused(true)}
      />

      {/* Controls overlay */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          accessibilityLabel="Close player">
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {width: `${progress * 100}%`}]} />
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>
            <TouchableOpacity
              onPress={() => setPaused(p => !p)}
              style={styles.playBtn}
              accessibilityLabel={paused ? 'Play' : 'Pause'}>
              <Text style={styles.playBtnText}>{paused ? '▶' : '⏸'}</Text>
            </TouchableOpacity>
            <Text style={styles.timeText}>{formatDuration(duration)}</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000',
      zIndex: 100,
    },
    video: {
      ...StyleSheet.absoluteFillObject,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'space-between',
    },
    closeBtn: {
      margin: 16,
      alignSelf: 'flex-end',
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeBtnText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
    },
    bottomBar: {
      padding: 16,
      gap: 8,
    },
    progressTrack: {
      height: 3,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: t.accent,
      borderRadius: 2,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '500',
      width: 40,
    },
    playBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    playBtnText: {
      color: '#FFFFFF',
      fontSize: 20,
    },
    // Error state
    errorBox: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    errorIcon: {
      fontSize: 48,
    },
    errorTitle: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    errorMessage: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    errorCloseBtn: {
      marginTop: 8,
      paddingHorizontal: 32,
      paddingVertical: 12,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    errorCloseBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
