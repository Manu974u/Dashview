import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
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

export default function ClipCard({
  clip,
  onPress,
  onDelete,
  onShare,
}: Props): React.JSX.Element {
  const isVoice = clip.trigger === 'voice';

  function handleLongPress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Share', 'Delete'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        idx => {
          if (idx === 1) {
            onShare();
          }
          if (idx === 2) {
            confirmDelete();
          }
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
      activeOpacity={0.8}
      accessibilityLabel={`Clip from ${getDisplayDateTime(clip.timestamp)}, trigger: ${clip.trigger}`}>
      {/* Thumbnail via first frame */}
      <View style={styles.thumbnailContainer}>
        <Video
          source={{uri: `file://${clip.filepath}`}}
          style={styles.thumbnail}
          paused
          muted
          resizeMode="cover"
        />
        <View style={styles.thumbnailOverlay} />
        {/* Duration pill */}
        <View style={styles.durationPill}>
          <Text style={styles.durationText}>
            {formatDuration(clip.duration)}
          </Text>
        </View>
      </View>

      {/* Card info */}
      <View style={styles.info}>
        <View style={[styles.badge, isVoice ? styles.badgeVoice : styles.badgeImpact]}>
          <Text style={styles.badgeText}>
            {isVoice ? '🎤 Voice' : '⚠️ Impact'}
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
    borderRadius: 12,
    overflow: 'hidden',
    flex: 1,
    margin: 6,
  },
  thumbnailContainer: {
    height: 110,
    backgroundColor: '#000',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  durationPill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    color: colors.textPrimary,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 2,
  },
  badgeVoice: {
    backgroundColor: colors.voice + '25',
  },
  badgeImpact: {
    backgroundColor: colors.impact + '25',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
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
