import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {
  requestCameraPermission,
  requestMicrophonePermission,
  requestLocationPermission,
  requestStoragePermission,
} from '../utils/permissions';
import {useAppStore} from '../store/useAppStore';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  body: string;
  emoji: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '📱',
    title: 'Your phone.\nYour dashcam.',
    body: 'DashView records everything, silently, in the background.',
  },
  {
    id: '2',
    emoji: '🎤',
    title: 'Just say "Dash"',
    body: 'One word saves the last 60 seconds. No buttons. No distraction.',
  },
  {
    id: '3',
    emoji: '⚡',
    title: 'Sudden stop?\nWe\'ve got it.',
    body: 'Enable speed drop detection and DashView saves automatically if it detects a sudden deceleration — like in a collision.',
  },
];

export default function OnboardingScreen(): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const listRef = useRef<FlatList>(null);
  const setOnboardingComplete = useAppStore(s => s.setOnboardingComplete);

  const isLastSlide = currentIndex === SLIDES.length;
  const isPermissionSlide = isLastSlide;

  function goNext() {
    if (currentIndex < SLIDES.length) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      if (next <= SLIDES.length - 1) {
        listRef.current?.scrollToIndex({index: next, animated: true});
      }
    }
  }

  async function handleRequestPermissions() {
    setRequestingPermissions(true);
    try {
      const cam = await requestCameraPermission();
      if (cam !== 'granted') {
        Alert.alert(
          'Camera required',
          'Camera access is required to record your drive.',
        );
        return;
      }

      const mic = await requestMicrophonePermission();
      if (mic !== 'granted') {
        Alert.alert(
          'Microphone required',
          'Microphone access is required for voice wake word detection.',
        );
        return;
      }

      const loc = await requestLocationPermission();
      if (loc !== 'granted') {
        Alert.alert(
          'Location required',
          'Location access is required to record GPS coordinates and speed.',
        );
        return;
      }

      await requestStoragePermission();

      // All essential permissions granted
      setOnboardingComplete(true);
    } finally {
      setRequestingPermissions(false);
    }
  }

  return (
    <View style={styles.container}>
      {!isPermissionSlide ? (
        <>
          <FlatList
            ref={listRef}
            data={SLIDES}
            keyExtractor={item => item.id}
            horizontal
            pagingEnabled
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            renderItem={({item}) => (
              <View style={styles.slide}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideBody}>{item.body}</Text>
              </View>
            )}
          />

          {/* Dots */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentIndex && styles.dotActive]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.nextBtn}
            onPress={goNext}
            activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>
              {currentIndex === SLIDES.length - 1 ? 'Get started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.permissionSlide}>
          <Text style={styles.permEmoji}>🔐</Text>
          <Text style={styles.permTitle}>Permissions required</Text>
          <Text style={styles.permBody}>
            DashView needs the following permissions to work properly.
          </Text>

          <View style={styles.permList}>
            <PermissionRow
              icon="📷"
              title="Camera"
              desc="Records your drive in continuous loop"
            />
            <PermissionRow
              icon="🎤"
              title="Microphone"
              desc="Detects the 'Dash' wake word while driving"
            />
            <PermissionRow
              icon="📍"
              title="Location (Always)"
              desc="Records GPS and speed when a clip is saved"
            />
            <PermissionRow
              icon="💾"
              title="Storage"
              desc="Saves video clips to your device"
            />
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, requestingPermissions && styles.btnDisabled]}
            onPress={handleRequestPermissions}
            disabled={requestingPermissions}
            activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>
              {requestingPermissions ? 'Requesting...' : 'Allow permissions'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function PermissionRow({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}): React.JSX.Element {
  return (
    <View style={styles.permRow}>
      <Text style={styles.permRowIcon}>{icon}</Text>
      <View style={styles.permRowText}>
        <Text style={styles.permRowTitle}>{title}</Text>
        <Text style={styles.permRowDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'flex-end',
    paddingBottom: spacing.xxl,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
  },
  emoji: {
    fontSize: 72,
    marginBottom: spacing.lg,
  },
  slideTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  slideBody: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.accent,
  },
  nextBtn: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  permissionSlide: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    justifyContent: 'center',
  },
  permEmoji: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  permTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  permBody: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  permList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  permRowIcon: {
    fontSize: 24,
  },
  permRowText: {
    flex: 1,
  },
  permRowTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  permRowDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
