import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../config/colors';
import CameraScreen from '../app';
import HistoryScreen from '../app/history';
import ResultScreen from '../app/result';
import SettingsScreen from '../app/settings';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CameraStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
    </Stack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.background,
        },
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTintColor: COLORS.primary,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="CameraTab" 
        component={CameraStack}
        options={{
          title: 'Camera',
          tabBarLabel: 'Scan',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="HistoryTab" 
        component={HistoryScreen}
        options={{
          title: 'History',
          tabBarLabel: 'History',
        }}
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}