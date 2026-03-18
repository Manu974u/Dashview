import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text, StyleSheet} from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ClipsScreen from '../screens/ClipsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {colors} from '../theme/colors';

export type RootTabParamList = {
  Home: undefined;
  Clips: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({
  label,
  focused,
}: {
  label: string;
  focused: boolean;
}): React.JSX.Element {
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>{label}</Text>
  );
}

export default function AppNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: styles.tabLabel,
        }}>
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({focused}) => (
              <TabIcon label="🏠" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Clips"
          component={ClipsScreen}
          options={{
            tabBarIcon: ({focused}) => (
              <TabIcon label="🎬" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({focused}) => (
              <TabIcon label="⚙️" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  icon: {
    fontSize: 20,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
  },
});
