
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert } from "react-native";
import { useAuth } from "../context/auth-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import Colors from "../constants/colors";
import { useState } from "react";

export default function LoginScreen() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
    } catch (error) {
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
    paddingTop: 100,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#fff",
    opacity: 0.9,
    textAlign: "center",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 80,
    paddingHorizontal: 24,
  },
  featureText: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 12,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  loginButton: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: "100%",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  disclaimer: {
    color: "#ddd",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },
  developerLink: {
    color: "#fff",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
