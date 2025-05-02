import { Stack } from "expo-router";
import { AuthProvider } from "../context/auth-context";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { Audio } from "expo-av";

export default function RootLayout() {
  // Initialize audio system
  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
        console.log("Audio system initialized");
      } catch (error) {
        console.error("Failed to initialize audio:", error);
      }
    };

    initAudio();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="spotify-callback" options={{ headerShown: false }} />
          <Stack.Screen name="trip/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="create-trip" options={{ headerShown: false }} />
          <Stack.Screen name="create-playlist" options={{ headerShown: false }} />
          <Stack.Screen name="track/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="playlist/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="album/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}