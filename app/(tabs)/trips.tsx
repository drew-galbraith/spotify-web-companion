import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import Colors from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { usePlayerStore } from "../../store/player-store";
import { useTripDeletion } from "../../hooks/use-trip-deletion";
import { useState } from "react";
import { useTrips } from "../../hooks/use-trips";
import type { Trip } from "../../store/trip-store";

export default function TripsScreen() {
  const router = useRouter();
  const { currentTrack, isPlaying } = usePlayerStore();
  const { confirmAndDeleteTrip, isDeleting } = useTripDeletion();
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const { data: trips, isLoading, error } = useTrips();

  const handleCreateTrip = () => {
    router.push("/create-trip");
  };

  const handleTripPress = (id: string) => {
    router.push(`/trip/${id}`);
  };

  const handleNowPlayingPress = () => {
    if (currentTrack) {
      router.push("/(tabs)/now-playing");
    }
  };

  const handleDeleteTrip = (id: string, e: any) => {
    // Stop event propagation to prevent navigation
    e.stopPropagation();
    
    setDeletingTripId(id);
    // Use destination as fallback if name is not available
    const tripToDelete = trips?.find(trip => trip.id === id);
    const tripName = tripToDelete?.name || tripToDelete?.destination || "Trip";
    confirmAndDeleteTrip(id, tripName);
  };

  const renderTripItem = ({ item }: { item: Trip }) => {
    return (
      <TouchableOpacity 
        style={styles.tripCard} 
        onPress={() => handleTripPress(item.id)}
        activeOpacity={0.8}
        disabled={isDeleting && deletingTripId === item.id}
      >
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.tripImage} 
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.tripGradient}
        />
        <View style={styles.tripInfo}>
          <Text style={styles.tripDestination}>{item.destination}</Text>
          <View style={styles.tripDetails}>
            <View style={styles.tripDetail}>
              <Ionicons name="calendar-outline" size={14} color={Colors.text} style={styles.tripIcon} />
              <Text style={styles.tripDetailText}>{item.dates}</Text>
            </View>
            <View style={styles.tripDetail}>
              <Ionicons name="location-outline" size={14} color={Colors.text} style={styles.tripIcon} />
              <Text style={styles.tripDetailText}>{item.location}</Text>
            </View>
          </View>
          {item.playlists && item.playlists.length > 0 && (
            <View style={styles.playlistBadge}>
              <Text style={styles.playlistBadgeText}>{item.playlists.length} playlist{item.playlists.length !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
        
        {/* Delete button */}
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={(e) => handleDeleteTrip(item.id, e)}
          disabled={isDeleting}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.text} />
        </TouchableOpacity>
        
        {isDeleting && deletingTripId === item.id && (
          <View style={styles.deletingOverlay}>
            <Text style={styles.deletingText}>Deleting...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Trips</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Trips</Text>
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Error loading trips: {error.message}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.replace("/(tabs)/trips")}>
              <Text style={styles.emptyButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Trips</Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateTrip}>
            <Ionicons name="add" size={24} color={Colors.text} />
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
            <Ionicons name="musical-notes-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}

        {trips && trips.length > 0 ? (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id}
            renderItem={renderTripItem}
            contentContainerStyle={styles.tripsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't created any trips yet</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreateTrip}>
              <Text style={styles.emptyButtonText}>Create Your First Trip</Text>
            </TouchableOpacity>
          </View>
        )}
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
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
    marginBottom: 16,
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
  tripsList: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 100, // Extra padding for tab bar
  },
  tripCard: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    position: "relative",
  },
  tripImage: {
    width: "100%",
    height: "100%",
  },
  tripGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  tripInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  tripDestination: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  tripDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tripDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  tripIcon: {
    marginRight: 4,
  },
  tripDetailText: {
    fontSize: 12,
    color: Colors.text,
  },
  playlistBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  playlistBadgeText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "500",
  },
  deleteButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 59, 48, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  deletingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  deletingText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  emptyButtonText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});