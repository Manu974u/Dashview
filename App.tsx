/**
 * DashView — Android Dashcam Prototype
 * React Native 0.73 bare workflow
 *
 * TODO: Custom wake word (premium feature)
 * TODO: Adjustable buffer duration 30s/60s/90s (premium feature)
 * TODO: AdMob banner ads (free tier)
 * TODO: RevenueCat subscription for Premium tier
 * TODO: Google Drive backup for saved clips
 * TODO: Trip history screen with map + speed graph replay
 * TODO: OBD-II Bluetooth speed/RPM data overlay on video
 * TODO: iOS support (second phase)
 */
import React from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import {useAppStore} from './src/store/useAppStore';
import {colors} from './src/theme/colors';

export default function App(): React.JSX.Element {
  const onboardingComplete = useAppStore(s => s.onboardingComplete);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
          translucent
        />
        {onboardingComplete ? <AppNavigator /> : <OnboardingScreen />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
