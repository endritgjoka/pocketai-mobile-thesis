import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ChatListScreen } from "../screens/chats/ChatListScreen";
import { DocumentListScreen } from "../screens/documents/DocumentListScreen";
import { BenchmarkScreen } from "../screens/benchmarks/BenchmarkScreen";
import { InsightsScreen } from "../screens/insights/InsightsScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { colors } from "../config/theme";

export type TabParamList = {
  Chats: undefined;
  Documents: undefined;
  Insights: undefined;
  Benchmarks: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const icons: Record<keyof TabParamList, { focused: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }> = {
  Chats: { focused: "chatbubble-ellipses", idle: "chatbubble-ellipses-outline" },
  Documents: { focused: "document-text", idle: "document-text-outline" },
  Insights: { focused: "fitness", idle: "fitness-outline" },
  Benchmarks: { focused: "bar-chart", idle: "bar-chart-outline" },
  Settings: { focused: "settings", idle: "settings-outline" }
};

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.item,
        tabBarIcon: ({ focused, color }) => {
          const icon = icons[route.name as keyof TabParamList];
          return <Ionicons name={focused ? icon.focused : icon.idle} size={22} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Chats" component={ChatListScreen} />
      <Tab.Screen name="Documents" component={DocumentListScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Benchmarks" component={BenchmarkScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { minHeight: 68, paddingTop: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.background },
  item: { paddingVertical: 4 },
  label: { fontSize: 11, fontWeight: "600", marginTop: 2 }
});
