import React, {forwardRef} from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {colors} from '../theme/colors';

interface Props {
  isActive: boolean;
}

const CameraPreview = forwardRef<Camera, Props>(({isActive}, ref) => {
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

const styles = StyleSheet.create({
  noCamera: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCameraText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
