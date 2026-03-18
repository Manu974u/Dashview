import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors} from '../theme/colors';

interface Props {
  speedKmh: number;
  gpsActive: boolean;
  detectionEnabled: boolean;
}

export default function SpeedBadge({
  speedKmh,
  gpsActive,
  detectionEnabled,
}: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📍</Text>
      <Text style={styles.label}>
        GPS: {gpsActive ? 'active' : 'inactive'}
      </Text>
      <View style={styles.separator} />
      <Text style={styles.speed}>{speedKmh}</Text>
      <Text style={styles.unit}>km/h</Text>
      {detectionEnabled && (
        <View style={styles.detectionDot} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  speed: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  unit: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  detectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.speedActive,
    marginLeft: 2,
  },
});
