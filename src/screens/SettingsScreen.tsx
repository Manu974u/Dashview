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
} from 'react-native';
import {useAppStore, AutoDeleteOption, VideoQuality} from '../store/useAppStore';
import {SensitivityLevel} from '../utils/speedCalc';
import {deleteClip, loadClips} from '../services/ClipStorageService';
import {RecordingService} from '../services/RecordingService';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';

export default function SettingsScreen(): React.JSX.Element {
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

  async function handleClearAllClips() {
    Alert.alert('Clear all clips?', 'This will permanently delete all saved clips.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete All',
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

  async function handleSimulateVoice() {
    Alert.alert('Simulating voice trigger...', '"Dash" detected (dev mode)');
    await RecordingService.saveClip('voice');
  }

  async function handleSimulateImpact() {
    Alert.alert('Simulating speed drop trigger...', 'Sudden deceleration detected (dev mode)');
    await RecordingService.saveClip('impact');
    const updated = await loadClips();
    setClips(updated);
  }

  function handleToggleSpeedDetection(value: boolean) {
    if (value) {
      Alert.alert(
        'Enable Speed Detection',
        '⚠️ GPS must be active for this feature to work.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Enable', onPress: () => setSpeedDetectionEnabled(true)},
        ],
      );
    } else {
      setSpeedDetectionEnabled(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Settings</Text>

        {/* Wake Word */}
        <SectionHeader title="Voice" />
        <SettingRow label="Wake Word" value='"Dash"' />

        {/* Speed Drop Detection */}
        <SectionHeader title="Speed Drop Detection" />
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.rowLabel}>Speed Drop Detection</Text>
              <Text style={styles.rowDesc}>
                Automatically saves a clip on sudden deceleration
              </Text>
            </View>
            <Switch
              value={speedDetectionEnabled}
              onValueChange={handleToggleSpeedDetection}
              trackColor={{false: colors.border, true: colors.speedActive + '80'}}
              thumbColor={speedDetectionEnabled ? colors.speedActive : colors.textSecondary}
              accessibilityLabel="Toggle speed drop detection"
            />
          </View>

          {speedDetectionEnabled && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                ⚠️ GPS must be active for this feature to work
              </Text>
            </View>
          )}
        </View>

        {/* Sensitivity — visible only when detection is enabled */}
        {speedDetectionEnabled && (
          <>
            <SectionHeader title="Detection Sensitivity" />
            <View style={styles.card}>
              <SegmentedControl<SensitivityLevel>
                options={[
                  {
                    value: 'low',
                    label: 'Low',
                    desc: '50 km/h drop',
                  },
                  {
                    value: 'medium',
                    label: 'Medium',
                    desc: '30 km/h drop',
                  },
                  {
                    value: 'high',
                    label: 'High',
                    desc: '20 km/h drop',
                  },
                ]}
                selected={sensitivity}
                onSelect={setSensitivity}
              />
            </View>
          </>
        )}

        {/* Recording */}
        <SectionHeader title="Recording" />
        <View style={styles.card}>
          <Text style={styles.rowLabel}>Buffer Duration</Text>
          <Text style={styles.rowValue}>60 seconds (fixed)</Text>
        </View>

        <SectionHeader title="Video Quality" />
        <View style={styles.card}>
          <SegmentedControl<VideoQuality>
            options={[
              {value: '720p', label: '720p', desc: 'Smaller files'},
              {value: '1080p', label: '1080p', desc: 'Best quality'},
            ]}
            selected={videoQuality}
            onSelect={setVideoQuality}
          />
        </View>

        {/* Auto-delete */}
        <SectionHeader title="Auto-Delete Clips" />
        <View style={styles.card}>
          <SegmentedControl<AutoDeleteOption>
            options={[
              {value: 'never', label: 'Never', desc: ''},
              {value: '7days', label: '7 days', desc: ''},
              {value: '30days', label: '30 days', desc: ''},
            ]}
            selected={autoDelete}
            onSelect={setAutoDelete}
          />
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <TouchableOpacity
          style={styles.card}
          onPress={tapVersionLabel}
          activeOpacity={0.7}
          accessibilityLabel="App version. Tap 5 times to unlock dev mode">
          <Text style={styles.rowLabel}>App Version</Text>
          <Text style={styles.rowValue}>DashView v0.1.0 (prototype)</Text>
          {devMode && (
            <View style={styles.devBadge}>
              <Text style={styles.devBadgeText}>DEV MODE</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* DEV MODE section */}
        {devMode && (
          <>
            <SectionHeader title="Developer Mode" />
            <View style={styles.card}>
              <DevButton
                label="🗑 Clear all clips"
                onPress={handleClearAllClips}
                destructive
              />
              <View style={styles.divider} />
              <DevButton
                label='🎤 Simulate voice trigger (test)'
                onPress={handleSimulateVoice}
              />
              <View style={styles.divider} />
              <DevButton
                label="⚡ Simulate speed drop trigger (test)"
                onPress={handleSimulateImpact}
              />
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────

function SectionHeader({title}: {title: string}): React.JSX.Element {
  return (
    <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
  );
}

function SettingRow({label, value}: {label: string; value: string}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
}): React.JSX.Element {
  return (
    <View>
      <View style={styles.segmentedControl}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segment,
              opt.value === selected && styles.segmentSelected,
            ]}
            onPress={() => onSelect(opt.value)}
            accessibilityLabel={`${opt.label}: ${opt.desc}`}
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
          <Text key={opt.value} style={styles.segmentDesc}>
            {opt.desc}
          </Text>
        ) : null,
      )}
    </View>
  );
}

function DevButton({
  label,
  onPress,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.devButton}
      onPress={onPress}
      activeOpacity={0.7}>
      <Text
        style={[
          styles.devButtonLabel,
          destructive && styles.devButtonDestructive,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────

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
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleLabel: {
    flex: 1,
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
    lineHeight: 16,
  },
  rowValue: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  warningBanner: {
    marginTop: spacing.sm,
    backgroundColor: colors.warning + '20',
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
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentLabelSelected: {
    color: colors.textPrimary,
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
    marginVertical: spacing.xs,
  },
  devBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent + '30',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: spacing.xs,
  },
  devBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  devButton: {
    paddingVertical: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  devButtonLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  devButtonDestructive: {
    color: colors.accent,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
