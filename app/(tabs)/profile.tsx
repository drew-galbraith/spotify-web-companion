import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import Colors from "../../constants/colors";
import { useAuth } from "../../context/auth-context";
import { useSpotifyProfile } from "../../hooks/use-spotify-profile";
import LoadingScreen from "../../components/loading-screen";
import ErrorView from "../../components/error-view";
import { LogOut, Settings, User, Music, Map, Heart } from "lucide-react-native";
import { usePlayerStore } from "../../store/player-store";
import { useRouter } from "expo-router";
import { useMemo } from "react";

export default function ProfileScreen() {
  const { logout } = useAuth();
  const { data: profile, isLoading, error } = useSpotifyProfile();
  const { currentTrack, isPlaying } = usePlayerStore();
  const router = useRouter();

  // Memoize profile data to prevent unnecessary re-renders
  const profileData = useMemo(() => profile, [profile]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorView message="Failed to load profile" />;
  }

  const handleNowPlayingPress = () => {
    if (currentTrack) {
      router.push("/(tabs)/now-playing");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity style={styles.settingsButton}>
              <Settings size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {currentTrack && (
            <TouchableOpacity 
              style={styles.nowPlayingBanner}
              onPress={handleNowPlayingPress}
            >
              <Image 
                source={{ uri: currentTrack.albumImageUrl }} 
                style={styles.nowPlayingImage} 
                contentFit="cover"
              />
              <View style={styles.nowPlayingInfo}>
                <Text style={styles.nowPlayingTitle}>
                  {isPlaying ? "Now Playing" : "Paused"}
                </Text>
                <Text style={styles.nowPlayingTrack} numberOfLines={1}>
                  {currentTrack.name} • {currentTrack.artists[0]}
                </Text>
              </View>
              <Music size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}

          <View style={styles.profileSection}>
            {profileData?.imageUrl ? (
              <Image 
                source={{ uri: profileData.imageUrl }} 
                style={styles.profileImage} 
                contentFit="cover"
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <User size={40} color={Colors.text} />
              </View>
            )}
            <Text style={styles.profileName}>{profileData?.displayName || "Music Lover"}</Text>
            <Text style={styles.profileEmail}>{profileData?.email || ""}</Text>
          </View>

          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileData?.trips || 0}</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileData?.playlists || 0}</Text>
              <Text style={styles.statLabel}>Playlists</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileData?.tracks || 0}</Text>
              <Text style={styles.statLabel}>Tracks</Text>
            </View>
          </View>

          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem}>
              <Music size={24} color={Colors.text} style={styles.menuIcon} />
              <Text style={styles.menuText}>Spotify Account Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Map size={24} color={Colors.text} style={styles.menuIcon} />
              <Text style={styles.menuText}>Travel Preferences</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Heart size={24} color={Colors.text} style={styles.menuIcon} />
              <Text style={styles.menuText}>Favorite Genres</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <LogOut size={20} color={Colors.text} style={styles.logoutIcon} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <View style={styles.spacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  nowPlayingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  nowPlayingImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingTitle: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 2,
  },
  nowPlayingTrack: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.divider,
    marginHorizontal: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  menuSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 30,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
  },
  spacer: {
    height: 100,
  },
});