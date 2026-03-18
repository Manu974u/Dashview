import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Video, {OnLoadData, OnProgressData} from 'react-native-video';
import {colors} from '../theme/colors';
import {formatDuration} from '../utils/datetime';

interface Props {
  uri: string;
  onClose: () => void;
}

export default function ClipPlayer({uri, onClose}: Props): React.JSX.Element {
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  function handleLoad(data: OnLoadData) {
    setDuration(Math.floor(data.duration));
  }

  function handleProgress(data: OnProgressData) {
    setCurrentTime(Math.floor(data.currentTime));
  }

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Video
        source={{uri: `file://${uri}`}}
        style={styles.video}
        resizeMode="contain"
        paused={paused}
        onLoad={handleLoad}
        onProgress={handleProgress}
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

const styles = StyleSheet.create({
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
    color: colors.textPrimary,
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
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    color: colors.textPrimary,
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
    color: colors.textPrimary,
    fontSize: 20,
  },
});
