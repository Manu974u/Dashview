import React from 'react';
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
import {useAppStore, AutoDeleteOption, VideoQuality} from '../store/useAppStore';
import {SensitivityLevel} from '../utils/speedCalc';
import {deleteClip, loadClips} from '../services/ClipStorageService';
import {SpeedMonitorService} from '../services/SpeedMonitorService';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {useTranslation} from '../i18n/useTranslation';

export default function SettingsScreen(): React.JSX.Element {
  const {t} = useTranslation();
  const speedDetectionEnabled = useAppStore(s => s.speedDetectionEnabled);
  const setSpeedDetectionEnabled = useAppStore(s => s.setSpeedDetectionEnabled);
  const sensitivity = useAppStore(s => s.sensitivity);
  const setSensitivity = useAppStore(s => s.setSensitivity);
  const videoQuality = useAppStore(s => s.videoQuality);
  const setVideoQuality = useAppStore(s => s.setVideoQuality);
  const autoDelete = useAppStore(s => s.autoDelete);
  const setAutoDelete = useAppStore(s => s.setAutoDelete);
  const devMode = useAppStore(s => s.devMode);
  const tapVersionLabel = useAppStore(s => s.tapVersionLabel);
  const clearAllClips = useAppStore(s => s.clearAllClips);
  const setClips = useAppStore(s => s.setClips);
  const mode = useAppStore(s => s.mode);
  const language = useAppStore(s => s.language);
  const setLanguage = useAppStore(s => s.setLanguage);

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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>{t('settings.title')}</Text>

        {/* Language */}
        <SectionHeader title={t('settings.sectionLanguage')} />
        <View style={styles.card}>
          <Text style={styles.rowLabel}>{t('settings.languageLabel')}</Text>
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
          />
          <Divider />
          <SettingRow
            label={t('settings.recognition')}
            value={t('settings.recognitionValue')}
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
              trackColor={{false: colors.border, true: colors.speed + '70'}}
              thumbColor={speedDetectionEnabled ? colors.speed : colors.textSecondary}
              accessibilityLabel="Toggle speed detection"
            />
          </View>
          {speedDetectionEnabled && (
            <>
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>{t('settings.speedGpsWarning')}</Text>
              </View>
              <Divider />
              <View>
                <Text style={styles.rowLabel}>{t('settings.sensitivity')}</Text>
                <View style={{marginTop: spacing.sm}}>
                  <SegmentedControl<SensitivityLevel>
                    options={[
                      {value: 'low', label: t('settings.sensLow'), desc: t('settings.sensLowDesc')},
                      {value: 'medium', label: t('settings.sensMedium'), desc: t('settings.sensMediumDesc')},
                      {value: 'high', label: t('settings.sensHigh'), desc: t('settings.sensHighDesc')},
                    ]}
                    selected={sensitivity}
                    onSelect={setSensitivity}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Video */}
        <SectionHeader title={t('settings.sectionVideo')} />
        <View style={styles.card}>
          <SettingRow
            label={t('settings.clipDuration')}
            value={t('settings.clipDurationValue')}
          />
          <Divider />
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
              />
            </View>
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
              />
            </View>
          </View>
          <Divider />
          <DevButton label={t('settings.clearAllBtn')} onPress={handleClearAllClips} destructive />
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
              <DevButton label={t('settings.devReloadClips')} onPress={handleViewClips} />
              <Divider />
              <DevButton label={t('settings.devSimulateVoice')} onPress={handleSimulateVoice} />
            </View>

            <SectionHeader title={t('settings.devSpeedSims')} />
            <View style={styles.card}>
              <Text style={styles.devNote}>{t('settings.devNote')}</Text>
              <Divider />
              <DevButton
                label="⚡  130→50 km/h drop (−80 km/h)"
                desc="Severe crash — always triggers"
                onPress={() => handleSimulateSpeedDrop(130, 50)}
              />
              <Divider />
              <DevButton
                label="⚡  80→40 km/h drop (−40 km/h)"
                desc="Hard brake / collision"
                onPress={() => handleSimulateSpeedDrop(80, 40)}
              />
              <Divider />
              <DevButton
                label="⚡  50→10 km/h drop (−40 km/h)"
                desc="Emergency stop"
                onPress={() => handleSimulateSpeedDrop(50, 10)}
              />
              <Divider />
              <DevButton
                label="⚡  150→80 km/h drop (−70 km/h)"
                desc="Highway crash — always triggers"
                onPress={() => handleSimulateSpeedDrop(150, 80)}
              />
              <Divider />
              <DevButton
                label="⚡  180→90 km/h drop (−90 km/h)"
                desc="High-speed collision"
                onPress={() => handleSimulateSpeedDrop(180, 90)}
              />
              <Divider />
              <DevButton
                label="⚡  200→90 km/h drop (−110 km/h)"
                desc="Severe motorway accident"
                onPress={() => handleSimulateSpeedDrop(200, 90)}
              />
              <Divider />
              <DevButton
                label="⚡  160→50 km/h drop (−110 km/h)"
                desc="Severe accident scenario"
                onPress={() => handleSimulateSpeedDrop(160, 50)}
              />
              <Divider />
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
              />
              <Divider />
              <DevButton
                label="✅  60→40 km/h gentle brake (−20 km/h)"
                desc="Should NOT trigger on Low/Medium sensitivity"
                onPress={handleGentleBrake}
                muted
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
  return <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingRow({label, value, note}: {label: string; value: string; note?: string}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      {note && <Text style={styles.rowNote}>{note}</Text>}
    </View>
  );
}

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  desc: string;
}

function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: SegmentOption<T>[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View>
      <View style={styles.segmentedControl}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segment, opt.value === selected && styles.segmentSelected]}
            onPress={() => onSelect(opt.value)}
            accessibilityLabel={`${opt.label}${opt.desc ? ': ' + opt.desc : ''}`}
            accessibilityState={{selected: opt.value === selected}}>
            <Text
              style={[
                styles.segmentLabel,
                opt.value === selected && styles.segmentLabelSelected,
              ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
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
}: {
  label: string;
  desc?: string;
  onPress: () => void;
  destructive?: boolean;
  muted?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.devButton} onPress={onPress} activeOpacity={0.7}>
      <Text
        style={[
          styles.devButtonLabel,
          destructive && {color: colors.error},
          muted && {color: colors.textSecondary},
        ]}>
        {label}
      </Text>
      {desc && <Text style={styles.devButtonDesc}>{desc}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
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
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  rowDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  rowValue: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  rowNote: {
    color: colors.textSecondary,
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
    backgroundColor: colors.warning + '18',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  warningText: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentLabelSelected: {
    color: colors.accent,
    fontWeight: '700',
  },
  segmentDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  devBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent + '18',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  devBadgeText: {
    color: colors.accent,
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
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  devButtonDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  devNote: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
