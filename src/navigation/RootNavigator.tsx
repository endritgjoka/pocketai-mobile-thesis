import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSettingsStore } from "../store/useSettingsStore";
import { TabNavigator } from "./TabNavigator";
import { WelcomeScreen } from "../screens/onboarding/WelcomeScreen";
import { PrivacyScreen } from "../screens/onboarding/PrivacyScreen";
import { ModelSelectionScreen } from "../screens/onboarding/ModelSelectionScreen";
import { ModelDownloadScreen } from "../screens/onboarding/ModelDownloadScreen";
import { ChatConversationScreen } from "../screens/chats/ChatConversationScreen";
import { DocumentDetailScreen } from "../screens/documents/DocumentDetailScreen";
import { ModelInfoScreen } from "../screens/settings/ModelInfoScreen";
import { colors } from "../config/theme";
import { ModelId } from "../types";

export type RootStackParamList = {
  Welcome: undefined;
  Privacy: undefined;
  ModelSelection: undefined;
  ModelDownload: { modelId: ModelId };
  MainTabs: undefined;
  ChatConversation: { conversationId: string };
  DocumentDetail: { documentId: string };
  ModelInfo: { modelId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTitleStyle: { color: colors.textPrimary }, headerBackTitle: "" }}>
      {hasCompletedOnboarding ? <>
        <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="ChatConversation" component={ChatConversationScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={{ title: "Document", headerBackTitle: "" }} />
        <Stack.Screen name="ModelInfo" component={ModelInfoScreen} options={{ title: "Model", headerBackTitle: "" }} />
      </> : <>
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ModelSelection" component={ModelSelectionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ModelDownload" component={ModelDownloadScreen} options={{ headerShown: false, gestureEnabled: false }} />
      </>}
    </Stack.Navigator>
  );
}
