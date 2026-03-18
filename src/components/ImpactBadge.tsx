import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors} from '../theme/colors';

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

export default function ImpactBadge({
  enabled,
  onToggle,
}: Props): React.JSX.Element {
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

const styles = StyleSheet.create({
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
    backgroundColor: colors.speedActive + '20',
    borderColor: colors.speedActive,
  },
  disabled: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderColor: colors.speedInactive,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelEnabled: {
    color: colors.speedActive,
  },
  labelDisabled: {
    color: colors.speedInactive,
  },
});
