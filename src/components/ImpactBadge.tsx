import React, {useMemo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Theme} from '../theme/colors';
import {useTheme} from '../hooks/useTheme';

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

export default function ImpactBadge({
  enabled,
  onToggle,
}: Props): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[styles.container, enabled ? styles.enabled : styles.disabled]}
      activeOpacity={0.8}
      accessibilityLabel={
        enabled
          ? 'Speed Detection ON — tap to disable'
          : 'Speed Detection OFF — tap to enable'
      }>
      <Text style={styles.icon}>⚡</Text>
      <Text style={[styles.label, enabled ? styles.labelEnabled : styles.labelDisabled]}>
        Speed Detection: {enabled ? 'ON' : 'OFF'}
      </Text>
    </TouchableOpacity>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      gap: 6,
      borderWidth: 1,
      minHeight: 48,
    },
    enabled: {
      backgroundColor: t.speedActive + '20',
      borderColor: t.speedActive,
    },
    disabled: {
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderColor: t.speedInactive,
    },
    icon: {
      fontSize: 14,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
    },
    labelEnabled: {
      color: t.speedActive,
    },
    labelDisabled: {
      color: t.speedInactive,
    },
  });
}
