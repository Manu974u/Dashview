import React, {useEffect, useRef} from 'react';
import {View, Text, Animated, StyleSheet} from 'react-native';
import {colors} from '../theme/colors';

interface Props {
  isRecording: boolean;
}

export default function RecordingIndicator({isRecording}: Props): React.JSX.Element {
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

const styles = StyleSheet.create({
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
    backgroundColor: colors.accent,
  },
  dotInactive: {
    backgroundColor: colors.textSecondary,
  },
  label: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  labelInactive: {
    color: colors.textSecondary,
  },
});
