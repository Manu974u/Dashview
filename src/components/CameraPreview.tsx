import React, {forwardRef, useMemo} from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {Theme} from '../theme/colors';
import {useTheme} from '../hooks/useTheme';

interface Props {
  isActive: boolean;
}

const CameraPreview = forwardRef<Camera, Props>(({isActive}, ref) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const device = useCameraDevice('back');

  if (!device) {
    return (
      <View style={styles.noCamera}>
        <Text style={styles.noCameraText}>
          Camera unavailable
        </Text>
      </View>
    );
  }

  return (
    <Camera
      ref={ref}
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={isActive}
      video
      audio
    />
  );
});

CameraPreview.displayName = 'CameraPreview';
export default CameraPreview;

function createStyles(t: Theme) {
  return StyleSheet.create({
    noCamera: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    noCameraText: {
      color: t.textSecondary,
      fontSize: 16,
    },
  });
}
