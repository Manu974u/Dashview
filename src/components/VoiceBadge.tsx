import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Theme} from '../theme/colors';
import {useTheme} from '../hooks/useTheme';

interface Props {
  isListening: boolean;
}

export default function VoiceBadge({isListening}: Props): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

function createStyles(t: Theme) {
  return StyleSheet.create({
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
      borderColor: t.voice + '60',
    },
    inactive: {
      borderWidth: 1,
      borderColor: t.border,
    },
    icon: {
      fontSize: 12,
    },
    label: {
      fontSize: 11,
      fontWeight: '500',
    },
    labelActive: {
      color: t.voice,
    },
    labelInactive: {
      color: t.textSecondary,
    },
  });
}
