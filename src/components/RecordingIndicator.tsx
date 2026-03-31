import React, {useEffect, useRef, useMemo} from 'react';
import {View, Text, Animated, StyleSheet} from 'react-native';
import {Theme} from '../theme/colors';
import {useTheme} from '../hooks/useTheme';

interface Props {
  isRecording: boolean;
}

export default function RecordingIndicator({isRecording}: Props): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      opacity.stopAnimation();
      opacity.setValue(0.4);
    }
  }, [isRecording, opacity]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          {opacity},
          !isRecording && styles.dotInactive,
        ]}
      />
      <Text
        style={[styles.label, !isRecording && styles.labelInactive]}>
        {isRecording ? 'REC' : 'IDLE'}
      </Text>
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
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.accent,
    },
    dotInactive: {
      backgroundColor: t.textSecondary,
    },
    label: {
      color: t.accent,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
    },
    labelInactive: {
      color: t.textSecondary,
    },
  });
}
