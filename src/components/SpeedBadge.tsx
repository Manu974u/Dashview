import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Theme} from '../theme/colors';
import {useTheme} from '../hooks/useTheme';

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
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

function createStyles(t: Theme) {
  return StyleSheet.create({
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
      color: t.textSecondary,
      fontSize: 11,
      fontWeight: '500',
    },
    separator: {
      width: 1,
      height: 12,
      backgroundColor: t.border,
      marginHorizontal: 2,
    },
    speed: {
      color: t.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    unit: {
      color: t.textSecondary,
      fontSize: 10,
    },
    detectionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: t.speedActive,
      marginLeft: 2,
    },
  });
}
