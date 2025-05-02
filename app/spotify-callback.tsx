import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Colors from "../constants/colors";

export default function SpotifyCallbackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    // This screen is just a placeholder for the redirect
    // The actual token exchange happens in auth-context.tsx
    console.log("Callback screen loaded with params:", JSON.stringify(params));
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>Connecting to Spotify...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: Colors.text,
  },
});