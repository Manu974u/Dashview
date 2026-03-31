import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Alert,
  ScrollView,
  NativeModules,
  AppState,
  AppStateStatus,
} from 'react-native';
import {Theme} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {useTheme} from '../hooks/useTheme';
import {
  requestCameraPermission,
  requestMicrophonePermission,
  requestLocationPermission,
  requestStoragePermission,
} from '../utils/permissions';
import {useAppStore} from '../store/useAppStore';
import {useTranslation} from '../i18n/useTranslation';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  body: string;
  emoji: string;
}

export default function OnboardingScreen(): React.JSX.Element {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const SLIDES: Slide[] = [
    {
      id: '1',
      emoji: '📱',
      title: t('onboarding.slide1Title'),
      body: t('onboarding.slide1Body'),
    },
    {
      id: '2',
      emoji: '🎤',
      title: t('onboarding.slide2Title'),
      body: t('onboarding.slide2Body'),
    },
    {
      id: '3',
      emoji: '🛡',
      title: t('onboarding.slide3Title'),
      body: t('onboarding.slide3Body'),
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  // 'initial' = standard permission slide; 'overlay' = Display over other apps step
  const [permPhase, setPermPhase] = useState<'initial' | 'overlay'>('initial');
  const [overlayGranted, setOverlayGranted] = useState<boolean | null>(null);
  const [requestingOverlay, setRequestingOverlay] = useState(false);
  // true after the user has tapped the grant button at least once
  const [hasOpenedSettings, setHasOpenedSettings] = useState(false);
  const listRef = useRef<FlatList>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const setOnboardingComplete = useAppStore(s => s.setOnboardingComplete);

  const isPermissionSlide = currentIndex === SLIDES.length;

  // Check overlay permission and re-check when app returns from settings.
  const checkOverlay = useCallback(async () => {
    try {
      const granted: boolean =
        await NativeModules.DashSpeech?.checkOverlayPermission?.();
      setOverlayGranted(granted ?? false);
      return granted ?? false;
    } catch {
      setOverlayGranted(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (permPhase !== 'overlay') return;
    checkOverlay();
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appStateRef.current !== 'active' && next === 'active') {
        checkOverlay(); // user returned from system settings
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [permPhase, checkOverlay]);

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
        Alert.alert(t('onboarding.permCameraRequired'), t('onboarding.permCameraRequiredDesc'));
        return;
      }

      const mic = await requestMicrophonePermission();
      if (mic !== 'granted') {
        Alert.alert(t('onboarding.permMicRequired'), t('onboarding.permMicRequiredDesc'));
        return;
      }

      const loc = await requestLocationPermission();
      if (loc !== 'granted') {
        Alert.alert(t('onboarding.permLocationRequired'), t('onboarding.permLocationRequiredDesc'));
        return;
      }

      await requestStoragePermission();

      // Move to the overlay permission step
      setPermPhase('overlay');
    } finally {
      setRequestingPermissions(false);
    }
  }

  async function handleGrantOverlay() {
    setRequestingOverlay(true);
    try {
      await NativeModules.DashSpeech?.requestOverlayPermission?.();
      // Mark that settings were opened — shows instruction + retry state on return
      setHasOpenedSettings(true);
      // AppState listener will re-check when user returns from settings
    } catch (e: any) {
      console.warn('[Onboarding] overlay settings error:', e?.message ?? e);
    } finally {
      setRequestingOverlay(false);
    }
  }

  async function handleContinue() {
    const granted = await checkOverlay();
    if (granted) {
      setOnboardingComplete(true);
    } else {
      Alert.alert(t('onboarding.overlayNotYetTitle'), t('onboarding.overlayNotYetBody'));
    }
  }

  function handleSkip() {
    setOnboardingComplete(true);
  }

  // ── Overlay permission phase ──────────────────────────────────────────────
  if (isPermissionSlide && permPhase === 'overlay') {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.permEmoji}>📱</Text>
          <Text style={styles.permTitle}>{t('onboarding.overlayTitle')}</Text>
          <Text style={styles.permBody}>{t('onboarding.overlayBody')}</Text>

          {overlayGranted === true ? (
            // ── Granted ──────────────────────────────────────────────────────
            <View style={styles.grantedBadge}>
              <Text style={styles.grantedBadgeText}>{t('onboarding.overlayGranted')}</Text>
            </View>
          ) : hasOpenedSettings && overlayGranted === false ? (
            // ── Opened settings but not yet granted ───────────────────────────
            <>
              <View style={styles.overlayNotGrantedWarning}>
                <Text style={styles.overlayNotGrantedText}>
                  {t('onboarding.overlayNotGrantedYet')}
                </Text>
              </View>
              <Text style={styles.overlayInstruction}>{t('onboarding.overlayInstruction')}</Text>
              <TouchableOpacity
                style={[styles.nextBtn, requestingOverlay && styles.btnDisabled]}
                onPress={handleGrantOverlay}
                disabled={requestingOverlay}
                activeOpacity={0.8}>
                <Text style={styles.nextBtnText}>
                  {requestingOverlay ? t('onboarding.overlayGranting') : t('onboarding.overlayRetryBtn')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            // ── Initial state ────────────────────────────────────────────────
            <TouchableOpacity
              style={[styles.nextBtn, requestingOverlay && styles.btnDisabled]}
              onPress={handleGrantOverlay}
              disabled={requestingOverlay}
              activeOpacity={0.8}>
              <Text style={styles.nextBtnText}>
                {requestingOverlay ? t('onboarding.overlayGranting') : t('onboarding.overlayGrantBtn')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextBtn, {marginTop: spacing.sm}]}
            onPress={overlayGranted === true ? () => setOnboardingComplete(true) : handleContinue}
            activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>
              {overlayGranted === true ? t('common.getStarted') : t('common.continue')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleSkip}
            activeOpacity={0.7}>
            <Text style={styles.skipBtnText}>{t('onboarding.overlaySkip')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Standard permission slide ─────────────────────────────────────────────
  if (isPermissionSlide) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.permEmoji}>🔐</Text>
          <Text style={styles.permTitle}>{t('onboarding.permTitle')}</Text>
          <Text style={styles.permBody}>{t('onboarding.permBody')}</Text>

          <View style={styles.permList}>
            <PermissionRow
              icon="📷"
              title={t('onboarding.permCamera')}
              desc={t('onboarding.permCameraDesc')}
            />
            <PermissionRow
              icon="🎤"
              title={t('onboarding.permMic')}
              desc={t('onboarding.permMicDesc')}
            />
            <PermissionRow
              icon="📍"
              title={t('onboarding.permLocation')}
              desc={t('onboarding.permLocationDesc')}
            />
            <PermissionRow
              icon="💾"
              title={t('onboarding.permStorage')}
              desc={t('onboarding.permStorageDesc')}
            />
            <PermissionRow
              icon="📱"
              title={t('onboarding.permOverlay')}
              desc={t('onboarding.permOverlayDesc')}
            />
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, requestingPermissions && styles.btnDisabled]}
            onPress={handleRequestPermissions}
            disabled={requestingPermissions}
            activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>
              {requestingPermissions ? t('onboarding.permRequesting') : t('onboarding.permAllowBtn')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Intro slides ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
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
          {currentIndex === SLIDES.length - 1 ? t('common.getStarted') : t('common.next')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PermissionRow({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}): React.JSX.Element {
  const t = useTheme();
  const s = useMemo(() => createStyles(t), [t]);
  return (
    <View style={s.permRow}>
      <Text style={s.permRowIcon}>{icon}</Text>
      <View style={s.permRowText}>
        <Text style={s.permRowTitle}>{title}</Text>
        <Text style={s.permRowDesc}>{desc}</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.xl,
      paddingTop: 64,
      paddingBottom: spacing.xxl,
      alignItems: 'stretch',
    },

    // ── Intro slides ──────────────────────────────────────────────────────────
    slide: {
      width: SCREEN_WIDTH,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: 80,
      paddingBottom: 160,
    },
    emoji: {
      fontSize: 72,
      marginBottom: spacing.lg,
      textAlign: 'center',
    },
    slideTitle: {
      color: t.textPrimary,
      fontSize: 28,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: spacing.md,
      lineHeight: 36,
      letterSpacing: 0.3,
    },
    slideBody: {
      color: t.textSecondary,
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
      backgroundColor: t.textSecondary + '40',
    },
    dotActive: {
      width: 20,
      backgroundColor: t.accent,
    },
    nextBtn: {
      marginHorizontal: spacing.xl,
      backgroundColor: t.accent,
      borderRadius: borderRadius.lg,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    btnDisabled: {
      opacity: 0.5,
    },
    nextBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
    },

    // ── Permission slides ──────────────────────────────────────────────────────
    permEmoji: {
      fontSize: 56,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    permTitle: {
      color: t.textPrimary,
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    permBody: {
      color: t.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 22,
    },
    permList: {
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    permRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: spacing.md,
      shadowColor: t.shadow,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 2,
    },
    permRowIcon: {
      fontSize: 22,
    },
    permRowText: {
      flex: 1,
    },
    permRowTitle: {
      color: t.textPrimary,
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 2,
    },
    permRowDesc: {
      color: t.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },

    // ── Overlay phase ──────────────────────────────────────────────────────────
    overlayNotGrantedWarning: {
      backgroundColor: t.error + '15',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.error + '80',
      padding: 14,
      marginBottom: 12,
    },
    overlayNotGrantedText: {
      color: t.error,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 20,
    },
    overlayInstruction: {
      color: t.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 20,
      fontStyle: 'italic',
    },
    grantedBadge: {
      backgroundColor: t.success + '15',
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: t.success + '40',
    },
    grantedBadgeText: {
      color: t.success,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    skipBtn: {
      marginTop: spacing.sm,
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    skipBtnText: {
      color: t.textSecondary,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
}
