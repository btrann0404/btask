import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SQLiteProvider } from "expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import { BlocksProvider } from "@/store/blocks";
import { db } from "@/db/client";
import migrations from "@/db/migrations";

function AppNavigator() {
  return (
    <BlocksProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="kanban/[id]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="add-block"
          options={{ animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="calendar"
          options={{ animation: "slide_from_bottom" }}
        />
      </Stack>
    </BlocksProvider>
  );
}

function DatabaseGate() {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <Text>Database migration failed: {String(error.message)}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Preparing database...</Text>
      </View>
    );
  }

  return <AppNavigator />;
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="btask.db">
      <DatabaseGate />
    </SQLiteProvider>
  );
}
