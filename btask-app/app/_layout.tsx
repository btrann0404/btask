import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlocksProvider } from '@/store/blocks';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <BlocksProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="kanban/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="add-block" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="calendar" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </BlocksProvider>
  );
}
