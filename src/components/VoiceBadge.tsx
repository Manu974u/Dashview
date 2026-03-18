import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors} from '../theme/colors';

interface Props {
  isListening: boolean;
}

export default function VoiceBadge({isListening}: Props): React.JSX.Element {
  return (
    <View
      style={[
        styles.container,
        isListening ? styles.active : styles.inactive,
      ]}>
      <Text style={styles.icon}>🎤</Text>
      <Text
        style={[
          styles.label,
          isListening ? styles.labelActive : styles.labelInactive,
        ]}>
        {isListening ? 'Listening for "Dash"' : 'Voice off'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  active: {
    borderWidth: 1,
    borderColor: colors.voice + '60',
  },
  inactive: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.voice,
  },
  labelInactive: {
    color: colors.textSecondary,
  },
});
