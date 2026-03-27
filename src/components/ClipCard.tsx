import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import Video from 'react-native-video';
import {ClipMetadata} from '../store/useAppStore';
import {colors} from '../theme/colors';
import {getDisplayDateTime, formatDuration} from '../utils/datetime';

interface Props {
  clip: ClipMetadata;
  onPress: () => void;
  onDelete: () => void;
  onShare: () => void;
}

export default function ClipCard({clip, onPress, onDelete, onShare}: Props): React.JSX.Element {
  const isVoice = clip.trigger === 'voice';

  function handleLongPress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {options: ['Cancel', 'Share', 'Delete'], destructiveButtonIndex: 2, cancelButtonIndex: 0},
        idx => {
          if (idx === 1) onShare();
          if (idx === 2) confirmDelete();
        },
      );
    } else {
      Alert.alert('Clip Options', clip.filename, [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Share', onPress: onShare},
        {text: 'Delete', style: 'destructive', onPress: confirmDelete},
      ]);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete clip?', 'This cannot be undone.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: onDelete},
    ]);
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.85}
      accessibilityLabel={`Clip from ${getDisplayDateTime(clip.timestamp)}, trigger: ${clip.trigger}`}>

      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        <Video
          source={{uri: `file://${clip.filepath}`}}
          style={styles.thumbnail}
          paused
          muted
          resizeMode="cover"
        />
        <View style={styles.thumbnailOverlay} />
        <View style={styles.durationPill}>
          <Text style={styles.durationText}>{formatDuration(clip.duration)}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={[styles.badge, isVoice ? styles.badgeVoice : styles.badgeSpeed]}>
          <Text style={[styles.badgeText, isVoice ? styles.badgeVoiceText : styles.badgeSpeedText]}>
            {isVoice ? '🎤 Voice' : '⚡ Speed'}
          </Text>
        </View>
        <Text style={styles.datetime} numberOfLines={1}>
          {getDisplayDateTime(clip.timestamp)}
        </Text>
        <Text style={styles.speed}>{Math.round(clip.speedKmh)} km/h</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    flex: 1,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailContainer: {
    height: 110,
    backgroundColor: colors.surfaceElevated,
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  durationPill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  info: {
    padding: 10,
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 2,
  },
  badgeVoice: {
    backgroundColor: colors.voice + '20',
  },
  badgeSpeed: {
    backgroundColor: colors.speed + '20',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeVoiceText: {
    color: colors.voice,
  },
  badgeSpeedText: {
    color: colors.speed,
  },
  datetime: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  speed: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
});
