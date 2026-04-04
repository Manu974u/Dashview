import React, {useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  ToastAndroid,
  Platform,
} from 'react-native';
import {useAppStore, AutoDeleteOption, VideoQuality, ClipDuration, ThemeMode, CameraMode} from '../store/useAppStore';
import {SensitivityLevel} from '../utils/speedCalc';
import {deleteClip, loadClips} from '../services/ClipStorageService';
import {SpeedMonitorService} from '../services/SpeedMonitorService';
import {Theme, lightTheme} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {useTranslation} from '../i18n/useTranslation';
import {useTheme} from '../hooks/useTheme';

export default function SettingsScreen(): React.JSX.Element {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const speedDetectionEnabled = useAppStore(s => s.speedDetectionEnabled);
  const setSpeedDetectionEnabled = useAppStore(s => s.setSpeedDetectionEnabled);
  const sensitivity = useAppStore(s => s.sensitivity);
  const setSensitivity = useAppStore(s => s.setSensitivity);
  const videoQuality = useAppStore(s => s.videoQuality);
  const setVideoQuality = useAppStore(s => s.setVideoQuality);
  const autoDelete = useAppStore(s => s.autoDelete);
  const setAutoDelete = useAppStore(s => s.setAutoDelete);
  const clipDuration = useAppStore(s => s.clipDuration);
  const setClipDuration = useAppStore(s => s.setClipDuration);
  const devMode = useAppStore(s => s.devMode);
  const tapVersionLabel = useAppStore(s => s.tapVersionLabel);
  const clearAllClips = useAppStore(s => s.clearAllClips);
  const setClips = useAppStore(s => s.setClips);
  const mode = useAppStore(s => s.mode);
  const language = useAppStore(s => s.language);
  const setLanguage = useAppStore(s => s.setLanguage);
  const languageIsAutoDetected = useAppStore(s => s.languageIsAutoDetected);
  const themeMode = useAppStore(s => s.themeMode);
  const setThemeMode = useAppStore(s => s.setThemeMode);
  const cameraMode = useAppStore(s => s.cameraMode);
  const setCameraMode = useAppStore(s => s.setCameraMode);

  async function handleClearAllClips() {
    Alert.alert(t('settings.clearAllTitle'), t('settings.clearAllBody'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('settings.deleteAll'),
        style: 'destructive',
        onPress: async () => {
          const clips = await loadClips();
          for (const clip of clips) {
            await deleteClip(clip);
          }
          clearAllClips();
        },
      },
    ]);
  }

  function requireActive(): boolean {
    if (mode === 'inactive') {
      Alert.alert(t('settings.devNotActiveTitle'), t('settings.devNotActiveBody'));
      return false;
    }
    return true;
  }

  function handleSimulateVoice() {
    if (!requireActive()) return;
    useAppStore.getState().setRecordingTrigger('voice');
    useAppStore.getState().setMode('recording');
  }

  function handleSimulateSpeedDrop(from: number, to: number) {
    if (!requireActive()) return;
    SpeedMonitorService.simulateSpeedDrop(from, to);
    useAppStore.getState().setRecordingTrigger('impact');
    useAppStore.getState().setMode('recording');
  }

  function handleGentleBrake() {
    if (!requireActive()) return;
    const result = SpeedMonitorService.simulateSpeedDropCheck(60, 40);
    if (result.triggered) {
      useAppStore.getState().setRecordingTrigger('impact');
      useAppStore.getState().setMode('recording');
    } else {
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          t('settings.devGentleToast', {threshold: String(result.threshold)}),
          ToastAndroid.LONG,
        );
      } else {
        Alert.alert(t('settings.devNormalBrakingTitle'),
          `Normal braking (${result.drop} km/h drop) — below ${result.threshold} km/h threshold.\n\nNo clip saved.`);
      }
    }
  }

  async function handleViewClips() {
    const clips = await loadClips();
    setClips(clips);
  }

  function handleSpeedToggle(value: boolean) {
    if (value) {
      Alert.alert(t('settings.speedEnableTitle'), t('settings.speedEnableBody'), [
        {text: t('common.cancel'), style: 'cancel'},
        {text: t('common.enable'), onPress: () => setSpeedDetectionEnabled(true)},
      ]);
    } else {
      setSpeedDetectionEnabled(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={theme.textPrimary === '#FFFFFF' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>{t('settings.title')}</Text>

        {/* Theme */}
        <SectionHeader title={t('settings.sectionTheme')} />
        <View style={styles.card}>
          <Text style={styles.rowLabel}>{t('settings.themeModeLabel')}</Text>
          <Text style={styles.rowDesc}>{t('settings.themeModeAutoDesc')}</Text>
          <View style={{marginTop: spacing.sm}}>
            <SegmentedControl<ThemeMode>
              options={[
                {value: 'auto', label: t('settings.themeModeAuto'), desc: ''},
                {value: 'light', label: t('settings.themeModeLight'), desc: ''},
                {value: 'dark', label: t('settings.themeModeDark'), desc: ''},
              ]}
              selected={themeMode}
              onSelect={setThemeMode}
              theme={theme}
              styles={styles}
            />
          </View>
        </View>

        {/* Language */}
        <SectionHeader title={t('settings.sectionLanguage')} />
        <View style={styles.card}>
          <Text style={styles.rowLabel}>{t('settings.languageLabel')}</Text>
          {languageIsAutoDetected && (
            <Text style={styles.rowNote}>{t('settings.languageAutoDetected')}</Text>
          )}
          <View style={[styles.segmentedControl, {marginTop: spacing.sm}]}>
            {(['en', 'fr'] as const).map(lang => (
              <TouchableOpacity
                key={lang}
                style={[styles.segment, language === lang && styles.segmentSelected]}
                onPress={() => setLanguage(lang)}
                accessibilityLabel={lang === 'en' ? t('settings.langEn') : t('settings.langFr')}
                accessibilityState={{selected: language === lang}}>
                <Text
                  style={[
                    styles.segmentLabel,
                    language === lang && styles.segmentLabelSelected,
                  ]}>
                  {lang === 'en' ? t('settings.langEn') : t('settings.langFr')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Voice */}
        <SectionHeader title={t('settings.sectionVoice')} />
        <View style={styles.card}>
          <SettingRow
            label={t('settings.wakeWord')}
            value={t('settings.wakeWordValue')}
            note={t('settings.wakeWordNote')}
            styles={styles}
          />
          <Divider styles={styles} />
          <SettingRow
            label={t('settings.recognition')}
            value={t('settings.recognitionValue')}
            styles={styles}
          />
        </View>

        {/* Speed */}
        <SectionHeader title={t('settings.sectionSpeed')} />
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.flex}>
              <Text style={styles.rowLabel}>{t('settings.speedDropLabel')}</Text>
              <Text style={styles.rowDesc}>{t('settings.speedDropDesc')}</Text>
            </View>
            <Switch
              value={speedDetectionEnabled}
              onValueChange={handleSpeedToggle}
              trackColor={{false: theme.border, true: theme.speed + '70'}}
              thumbColor={speedDetectionEnabled ? theme.speed : theme.textSecondary}
              accessibilityLabel="Toggle speed detection"
            />
          </View>
          {speedDetectionEnabled && (
            <>
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>{t('settings.speedGpsWarning')}</Text>
              </View>
              <Divider styles={styles} />
              <View>
                <Text style={styles.rowLabel}>{t('settings.sensitivity')}</Text>
                <View style={{marginTop: spacing.sm}}>
                  <SegmentedControl<SensitivityLevel>
                    options={[
                      {value: 'low', label: t('settings.sensLow'), desc: t('settings.sensLowDesc'), activeColor: theme.success},
                      {value: 'medium', label: t('settings.sensMedium'), desc: t('settings.sensMediumDesc'), activeColor: theme.warning},
                      {value: 'high', label: t('settings.sensHigh'), desc: t('settings.sensHighDesc'), activeColor: theme.error},
                    ]}
                    selected={sensitivity}
                    onSelect={setSensitivity}
                    theme={theme}
                    styles={styles}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Video */}
        <SectionHeader title={t('settings.sectionVideo')} />
        <View style={styles.card}>
          <View>
            <Text style={styles.rowLabel}>{t('settings.clipDurationTitle')}</Text>
            <Text style={styles.rowDesc}>{t('settings.clipDurationDesc')}</Text>
            <View style={{marginTop: spacing.sm}}>
              <SegmentedControl<ClipDuration>
                options={[
                  {value: 60,  label: t('settings.clipDuration60'),  desc: t('settings.clipDurationBatteryNote60')},
                  {value: 120, label: t('settings.clipDuration120'), desc: t('settings.clipDurationBatteryNote120')},
                  {value: 240, label: t('settings.clipDuration240'), desc: t('settings.clipDurationBatteryNote240')},
                  {value: 480, label: t('settings.clipDuration480'), desc: t('settings.clipDurationBatteryNote480')},
                ]}
                selected={clipDuration}
                onSelect={setClipDuration}
                theme={theme}
                styles={styles}
              />
            </View>
            {clipDuration > 60 && (
              <Text style={[styles.rowNote, {color: theme.warning, fontStyle: 'normal', marginTop: spacing.xs}]}>
                {t('settings.clipDurationWarning')}
              </Text>
            )}
          </View>
          <Divider styles={styles} />
          <View>
            <Text style={styles.rowLabel}>{t('settings.quality')}</Text>
            <View style={{marginTop: spacing.sm}}>
              <SegmentedControl<VideoQuality>
                options={[
                  {value: '720p', label: t('settings.quality720'), desc: t('settings.quality720Desc')},
                  {value: '1080p', label: t('settings.quality1080'), desc: t('settings.quality1080Desc')},
                ]}
                selected={videoQuality}
                onSelect={setVideoQuality}
                theme={theme}
                styles={styles}
              />
            </View>
          </View>
        </View>

        {/* Camera */}
        <SectionHeader title={t('settings.cameraTitle')} />
        <View style={styles.card}>
          <View>
            <Text style={styles.rowLabel}>{t('settings.cameraTitle')}</Text>
            <Text style={styles.rowDesc}>{t('settings.cameraDesc')}</Text>
            <View style={{marginTop: spacing.sm}}>
              <SegmentedControl<CameraMode>
                options={[
                  {value: 'back',  label: t('settings.cameraBack'),  desc: t('settings.cameraBackNote')},
                  {value: 'front', label: t('settings.cameraFront'), desc: t('settings.cameraFrontNote')},
                ]}
                selected={cameraMode}
                onSelect={setCameraMode}
                theme={theme}
                styles={styles}
              />
            </View>
            <Text style={[styles.rowNote, {marginTop: spacing.xs}]}>
              {cameraMode === 'front' ? t('settings.cameraFrontNote') : t('settings.cameraBackNote')}
            </Text>
          </View>
        </View>

        {/* Storage */}
        <SectionHeader title={t('settings.sectionStorage')} />
        <View style={styles.card}>
          <View>
            <Text style={styles.rowLabel}>{t('settings.autoDelete')}</Text>
            <View style={{marginTop: spacing.sm}}>
              <SegmentedControl<AutoDeleteOption>
                options={[
                  {value: 'never', label: t('settings.autoDeleteNever'), desc: t('settings.autoDeleteNeverDesc')},
                  {value: '7days', label: t('settings.autoDelete7'), desc: t('settings.autoDelete7Desc')},
                  {value: '30days', label: t('settings.autoDelete30'), desc: t('settings.autoDelete30Desc')},
                ]}
                selected={autoDelete}
                onSelect={setAutoDelete}
                theme={theme}
                styles={styles}
              />
            </View>
          </View>
          <Divider styles={styles} />
          <DevButton label={t('settings.clearAllBtn')} onPress={handleClearAllClips} destructive theme={theme} styles={styles} />
        </View>

        {/* Battery */}
        <SectionHeader title={t('settings.sectionBattery')} />
        <View style={styles.card}>
          <Text style={styles.rowDesc}>{t('settings.batteryIntro')}</Text>
          <View style={{marginTop: spacing.sm, gap: spacing.sm}}>
            <View style={styles.batteryRow}>
              <Text style={styles.batteryIcon}>🎤</Text>
              <View style={styles.flex}>
                <Text style={styles.rowLabel}>{t('settings.batteryVoice')}</Text>
                <Text style={styles.rowDesc}>{t('settings.batteryVoiceDesc')}</Text>
              </View>
            </View>
            <View style={styles.batteryRow}>
              <Text style={styles.batteryIcon}>⚡</Text>
              <View style={styles.flex}>
                <Text style={styles.rowLabel}>{t('settings.batterySpeed')}</Text>
                <Text style={styles.rowDesc}>{t('settings.batterySpeedDesc')}</Text>
              </View>
            </View>
            <View style={styles.batteryRow}>
              <Text style={styles.batteryIcon}>📹</Text>
              <View style={styles.flex}>
                <Text style={styles.rowLabel}>{t('settings.batteryRecording')}</Text>
                <Text style={styles.rowDesc}>{t('settings.batteryRecordingDesc')}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.warningBanner, {marginTop: spacing.sm}]}>
            <Text style={styles.warningText}>{t('settings.batteryLowNote')}</Text>
          </View>
        </View>

        {/* About */}
        <SectionHeader title={t('settings.sectionAbout')} />
        <TouchableOpacity
          style={styles.card}
          onPress={tapVersionLabel}
          activeOpacity={0.7}
          accessibilityLabel="App version — tap 5 times for dev mode">
          <SettingRow
            label={t('settings.appVersion')}
            value={t('settings.appVersionValue')}
            styles={styles}
          />
          {devMode && (
            <View style={styles.devBadge}>
              <Text style={styles.devBadgeText}>DEV MODE ACTIVE</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Dev Mode */}
        {devMode && (
          <>
            <SectionHeader title={t('settings.sectionDev')} />
            <View style={styles.card}>
              <DevButton label={t('settings.devReloadClips')} onPress={handleViewClips} theme={theme} styles={styles} />
              <Divider styles={styles} />
              <DevButton label={t('settings.devSimulateVoice')} onPress={handleSimulateVoice} theme={theme} styles={styles} />
            </View>

            <SectionHeader title={t('settings.devSpeedSims')} />
            <View style={styles.card}>
              <Text style={styles.devNote}>{t('settings.devNote')}</Text>
              <Divider styles={styles} />
              <DevButton
                label="⚡  130→50 km/h drop (−80 km/h)"
                desc="Severe crash — always triggers"
                onPress={() => handleSimulateSpeedDrop(130, 50)}
                theme={theme}
                styles={styles}
              />
              <Divider styles={styles} />
              <DevButton
                label="⚡  80→40 km/h drop (−40 km/h)"
                desc="Hard brake / collision"
                onPress={() => handleSimulateSpeedDrop(80, 40)}
                theme={theme}
                styles={styles}
              />
              <Divider styles={styles} />
              <DevButton
                label="⚡  50→10 km/h drop (−40 km/h)"
                desc="Emergency stop"
                onPress={() => handleSimulateSpeedDrop(50, 10)}
                theme={theme}
                styles={styles}
              />
              <Divider styles={styles} />
              <DevButton
                label="⚡  150→80 km/h drop (−70 km/h)"
                desc="Highway crash — always triggers"
                onPress={() => handleSimulateSpeedDrop(150, 80)}
                theme={theme}
                styles={styles}
              />
              <Divider styles={styles} />
              <DevButton
                label="⚡  180→90 km/h drop (−90 km/h)"
                desc="High-speed collision"
                onPress={() => handleSimulateSpeedDrop(180, 90)}
                theme={theme}
                styles={styles}
              />
              <Divider styles={styles} />
              <DevButton
                label="⚡  200→90 km/h drop (−110 km/h)"
                desc="Severe motorway accident"
                onPress={() => handleSimulateSpeedDrop(200, 90)}
                theme={theme}
                styles={styles}
              />
              <Divider styles={styles} />
              <DevButton
                label="⚡  160→50 km/h drop (−110 km/h)"
                desc="Severe accident scenario"
                onPress={() => handleSimulateSpeedDrop(160, 50)}
                theme={theme}
                styles={styles}
              />
              <Divider styles={styles} />
              <DevButton
                label="✅  130→100 km/h (−30 km/h)"
                desc="Small drop — triggers only on Medium/High sensitivity"
                onPress={() => {
                  if (!requireActive()) return;
                  const result = SpeedMonitorService.simulateSpeedDropCheck(130, 100);
                  if (result.triggered) {
                    useAppStore.getState().setRecordingTrigger('impact');
                    useAppStore.getState().setMode('recording');
                  } else if (Platform.OS === 'android') {
                    ToastAndroid.show(
                      `✅ 130→100 km/h (−${result.drop} km/h) — below ${result.threshold} km/h threshold. No clip.`,
                      ToastAndroid.LONG,
                    );
                  }
                }}
                muted
                theme={theme}
                styles={styles}
              />
              <Divider styles={styles} />
              <DevButton
                label="✅  60→40 km/h gentle brake (−20 km/h)"
                desc="Should NOT trigger on Low/Medium sensitivity"
                onPress={handleGentleBrake}
                muted
                theme={theme}
                styles={styles}
              />
            </View>
          </>
        )}

        <View style={{height: spacing.xxl}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({title}: {title: string}) {
  const theme = useTheme();
  return (
    <Text style={{
      color: theme.accent,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.5,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xs,
      textTransform: 'uppercase',
    }}>
      {title}
    </Text>
  );
}

type SettingsStyles = ReturnType<typeof createStyles>;

function Divider({styles}: {styles: SettingsStyles}) {
  return <View style={styles.divider} />;
}

function SettingRow({label, value, note, styles}: {label: string; value: string; note?: string; styles: SettingsStyles}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      {note && <Text style={styles.rowNote}>{note}</Text>}
    </View>
  );
}

interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  desc: string;
  activeColor?: string;
}

function SegmentedControl<T extends string | number>({
  options,
  selected,
  onSelect,
  styles,
}: {
  options: SegmentOption<T>[];
  selected: T;
  onSelect: (v: T) => void;
  theme: Theme;
  styles: SettingsStyles;
}) {
  return (
    <View>
      <View style={styles.segmentedControl}>
        {options.map(opt => {
          const isSelected = opt.value === selected;
          const activeStyle = isSelected && opt.activeColor
            ? {backgroundColor: opt.activeColor}
            : undefined;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segment, isSelected && styles.segmentSelected, activeStyle]}
              onPress={() => onSelect(opt.value)}
              accessibilityLabel={`${opt.label}${opt.desc ? ': ' + opt.desc : ''}`}
              accessibilityState={{selected: isSelected}}>
              <Text
                style={[
                  styles.segmentLabel,
                  isSelected && styles.segmentLabelSelected,
                ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {options.map(opt =>
        opt.desc && opt.value === selected ? (
          <Text key={opt.value} style={styles.segmentDesc}>{opt.desc}</Text>
        ) : null,
      )}
    </View>
  );
}

function DevButton({
  label,
  desc,
  onPress,
  destructive = false,
  muted = false,
  theme,
  styles,
}: {
  label: string;
  desc?: string;
  onPress: () => void;
  destructive?: boolean;
  muted?: boolean;
  theme: Theme;
  styles: SettingsStyles;
}) {
  return (
    <TouchableOpacity style={styles.devButton} onPress={onPress} activeOpacity={0.7}>
      <Text
        style={[
          styles.devButtonLabel,
          destructive && {color: theme.error},
          muted && {color: theme.textSecondary},
        ]}>
        {label}
      </Text>
      {desc && <Text style={styles.devButtonDesc}>{desc}</Text>}
    </TouchableOpacity>
  );
}

function createStyles(t: typeof lightTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
    },
    screenTitle: {
      color: t.textPrimary,
      fontSize: 28,
      fontWeight: '800',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    card: {
      backgroundColor: t.surface,
      marginHorizontal: spacing.md,
      borderRadius: 16,
      padding: spacing.md,
      gap: spacing.sm,
      shadowColor: t.shadow,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 4,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    flex: {
      flex: 1,
    },
    settingRow: {
      gap: 2,
    },
    rowLabel: {
      color: t.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    rowDesc: {
      color: t.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    rowValue: {
      color: t.textSecondary,
      fontSize: 14,
    },
    rowNote: {
      color: t.textSecondary,
      fontSize: 11,
      fontStyle: 'italic',
      marginTop: 2,
    },
    batteryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    batteryIcon: {
      fontSize: 18,
      width: 28,
      textAlign: 'center',
    },
    warningBanner: {
      backgroundColor: t.warning + '18',
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: t.warning,
    },
    warningText: {
      color: t.warning,
      fontSize: 12,
      lineHeight: 18,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: t.backgroundSecondary,
      borderRadius: borderRadius.sm,
      padding: 3,
      gap: 3,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: borderRadius.sm - 1,
      alignItems: 'center',
      minHeight: 36,
      justifyContent: 'center',
    },
    segmentSelected: {
      backgroundColor: t.accent,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    segmentLabel: {
      color: t.textSecondary,
      fontSize: 13,
      fontWeight: '500',
    },
    segmentLabelSelected: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    segmentDesc: {
      color: t.textSecondary,
      fontSize: 11,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    divider: {
      height: 1,
      backgroundColor: t.border,
    },
    devBadge: {
      alignSelf: 'flex-start',
      backgroundColor: t.accent + '18',
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    devBadgeText: {
      color: t.accent,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    devButton: {
      paddingVertical: spacing.sm,
      minHeight: 44,
      justifyContent: 'center',
    },
    devButtonLabel: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: '500',
    },
    devButtonDesc: {
      color: t.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    devNote: {
      color: t.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      fontStyle: 'italic',
    },
  });
}
