
// app/login.tsx
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert } from "react-native";
import { useAuth } from "../context/auth-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import Colors from "../constants/colors";
import { useState } from "react";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signIn();
    } catch (error: any) {
      console.error("Login failed:", error);
      Alert.alert(
        "Login Failed",
        "There was a problem connecting to Spotify. Please check your internet connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpotifyDeveloperPortal = () => {
    Linking.openURL("https://developer.spotify.com/dashboard");
  };

  const handleShowRedirectInfo = () => {
    Alert.alert(
      "Redirect URI Info",
      "Make sure to add the redirect URI shown in the console logs to your Spotify Developer Dashboard.",
      [
        { text: "OK", style: "default" },
        {
          text: "Open Spotify Dashboard",
          onPress: handleSpotifyDeveloperPortal,
          style: "default",
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.title}>WanderTunes</Text>
        <Text style={styles.subtitle}>Your journey's perfect soundtrack</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.featureText}>• View your Spotify listening stats</Text>
        <Text style={styles.featureText}>• Create playlists based on your trips</Text>
        <Text style={styles.featureText}>• Discover music for every destination</Text>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? "Connecting..." : "Connect with Spotify"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          This app requires Spotify authentication to access your music data.
        </Text>

        <View style={styles.linkContainer}>
          <TouchableOpacity onPress={handleSpotifyDeveloperPortal}>
            <Text style={styles.developerLink}>Spotify Developer Portal</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShowRedirectInfo}>
            <Text style={styles.developerLink}>Redirect URI Help</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    color: Colors.primary,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  contentContainer: {
    flex: 2,
    paddingHorizontal: 24,
  },
  featureText: {
    fontSize: 16,
    color: Colors.text,
    marginVertical: 4,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 20,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.secondary,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 10,
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
  },
  developerLink: {
    fontSize: 12,
    color: Colors.text,
  },
});
