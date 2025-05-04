import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ErrorBoundary from "../error-boundary";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { BlurView } from "expo-blur";
import { useSafeAuth } from "../../context/auth-context";
import { Redirect } from "expo-router";
import { usePlayerStore } from "../../store/player-store";

function TabBarIcon(props: {
  name: React.ReactNode;
  color: string;
}) {
  return props.name;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const auth = useSafeAuth();
  const { isAuthenticated, isLoading } = auth;
  const { currentTrack, isPlaying } = usePlayerStore();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const tabBarStyles = StyleSheet.create({
    tabBar: {
      backgroundColor: Colors.background,
      borderTopWidth: 0,
      elevation: 0,
      height: 60 + insets.bottom,
      paddingBottom: insets.bottom,
    }
  });

  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          headerShown: false,
          tabBarStyle: tabBarStyles.tabBar,
          tabBarBackground: () =>
            Platform.OS === 'ios' ? (
              <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
            ) : null,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Stats",
            tabBarIcon: ({ color }) => <Ionicons name="stats-chart-outline" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: "Trips",
            tabBarIcon: ({ color }) => <Ionicons name="compass-outline" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="now-playing"
          options={{
            title: "Now Playing",
            tabBarIcon: ({ color }) => (
              <Ionicons name="musical-notes-outline" size={24} color={color} style={isPlaying ? styles.pulsingIcon : undefined} />
            ),
            tabBarLabel: ({ color }) => (
              <>
                {currentTrack && isPlaying && (
                  <View style={styles.playingIndicator} />
                )}
                <Text style={{ color, fontSize: 10, marginTop: 2 }}>
                  Now Playing
                </Text>
              </>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  pulsingIcon: {
    opacity: 0.9,
  },
  playingIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginBottom: 2,
  },
});
