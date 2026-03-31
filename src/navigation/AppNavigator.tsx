import React, {useEffect, useRef, useMemo} from 'react';
import {NavigationContainerRef, NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text, View, StyleSheet, DeviceEventEmitter} from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ClipsScreen from '../screens/ClipsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {useTheme} from '../hooks/useTheme';

export type RootTabParamList = {
  Home: undefined;
  Clips: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({
  emoji,
  focused,
}: {
  emoji: string;
  focused: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={[iconWrapperBase, focused && {backgroundColor: theme.accent + '14'}]}>
      <Text style={iconStyle}>{emoji}</Text>
    </View>
  );
}

const iconWrapperBase: object = {
  width: 32,
  height: 32,
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 8,
};

const iconStyle: object = {
  fontSize: 20,
};

export default function AppNavigator(): React.JSX.Element {
  const navRef = useRef<NavigationContainerRef<RootTabParamList>>(null);
  const theme = useTheme();

  // When a voice trigger arrives from background (via MainActivity.onVoiceTrigger),
  // switch to the Home tab so the recording UI is visible immediately.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('onVoiceTrigger', () => {
      navRef.current?.navigate('Home');
    });
    return () => sub.remove();
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tabBar: {
          backgroundColor: theme.navBackground,
          borderTopColor: theme.navBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -2},
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabLabel: {
          fontSize: 11,
          fontWeight: '600',
        },
      }),
    [theme],
  );

  return (
    <NavigationContainer ref={navRef}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarLabelStyle: styles.tabLabel,
        }}>
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({focused}) => <TabIcon emoji="🏠" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Clips"
          component={ClipsScreen}
          options={{
            tabBarIcon: ({focused}) => <TabIcon emoji="🎬" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({focused}) => <TabIcon emoji="⚙️" focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
