import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initDatabase } from "./src/db/database";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { useSettingsStore } from "./src/store/useSettingsStore";
import { colors } from "./src/config/theme";

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);

  useEffect(() => {
    const boot = async () => {
      try {
        await initDatabase();
        await hydrateSettings();
        setReady(true);
      } catch (bootError) {
        setError(bootError instanceof Error ? bootError.message : "Failed to start PocketAI.");
      }
    };
    boot();
  }, [hydrateSettings]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background
  },
  error: {
    color: colors.error,
    padding: 24,
    textAlign: "center"
  }
});
