import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Platform, RefreshControl } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Calendar, MapPin, Music, ArrowLeft, Play, Pause, Heart, Trash2, MoreVertical } from "lucide-react-native";
import Colors from "../../constants/colors";
import { useTrip } from "../../hooks/use-trip";
import LoadingScreen from "../../components/loading-screen";
import ErrorView from "../../components/error-view";
import { LinearGradient } from "expo-linear-gradient";
import { useAutoPlaylist } from "../../hooks/use-auto-playlist";
import { usePlayerStore } from "../../store/player-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useTripDeletion } from "../../hooks/use-trip-deletion";

// Define types for our data
interface Track {
  id: string;
  name: string;
  artists: string[];
  albumName?: string;
  albumImageUrl: string;
  duration_ms: number;
  preview_url?: string;
  uri: string;
  playlistId?: string;
  playlistName?: string;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  trackCount: number;
  tracks?: Track[];
}

export default function TripScreen() {
  // Use useMemo to stabilize the id parameter
  const params = useLocalSearchParams<{ id: string }>();
  const id = useMemo(() => params.id, [params.id]);
  
  const router = useRouter();
  const { data: trip, isLoading, error, refetch } = useTrip(id);
  const { createAutoPlaylist, isCreating, currentStep, progress } = useAutoPlaylist();
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack, 
    resumeTrack 
  } = usePlayerStore();
  
  const { 
    isDeleting, 
    progress: deletionProgress, 
    currentStep: deletionStep,
    confirmAndDeleteTrip,
    confirmAndDeletePlaylist
  } = useTripDeletion();
  
  const [creationStatus, setCreationStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const optionsMenuRef = useRef(null);

  // Update local creation status when auto playlist creation is in progress
  useEffect(() => {
    if (isCreating) {
      setCreationStatus(currentStep);
    } else {
      setCreationStatus("");
    }
  }, [isCreating, currentStep]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !refreshing) {
    return <LoadingScreen />;
  }

  if (error || !trip) {
    return <ErrorView message="Failed to load trip details" onRetry={refetch} />;
  }

  const handlePlayPause = (playlist: Playlist) => {
    if (currentTrack && currentTrack.playlistId === playlist.id && isPlaying) {
      pauseTrack();
    } else if (currentTrack && currentTrack.playlistId === playlist.id) {
      resumeTrack();
    } else if (playlist.tracks && playlist.tracks.length > 0) {
      // Play the first track of the playlist
      const firstTrack = playlist.tracks[0];
      // Ensure albumImageUrl is always defined
      const trackWithDefaults: Track = {
        ...firstTrack,
        playlistId: playlist.id,
        playlistName: playlist.name,
        albumImageUrl: firstTrack.albumImageUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww"
      };
      playTrack(trackWithDefaults);
    }
  };

  const handleCreateAutoPlaylist = async () => {
    try {
      Alert.alert(
        "Create Auto Playlist",
        "Would you like us to create a personalized playlist based on your destination and music preferences?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Create", 
            onPress: async () => {
              try {
                const result = await createAutoPlaylist(
                  id,
                  trip.destination,
                  `Automatically generated based on ${trip.destination} music and your preferences.`,
                  trip.name
                );
                
                if (result) {
                  // Refresh the trip data to show the new playlist
                  await refetch();
                  
                  Alert.alert(
                    "Auto Playlist Created",
                    `Your playlist "${result.name}" has been created with ${result.trackCount} tracks!`,
                    [{ text: "OK", style: "cancel" }]
                  );
                }
              } catch (error) {
                console.error("Error creating playlist:", error);
                Alert.alert(
                  "Playlist Creation Failed",
                  "There was an error creating your playlist. Please try again later.",
                  [{ text: "OK", style: "cancel" }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error creating auto playlist:", error);
    }
  };

  const handleDeleteTrip = () => {
    confirmAndDeleteTrip(id, trip.name || trip.destination);
  };

  const handleDeletePlaylist = (playlistId: string, playlistName: string) => {
    confirmAndDeletePlaylist(id, playlistId, playlistName);
  };

  const toggleOptionsMenu = () => {
    setShowOptionsMenu(!showOptionsMenu);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          <View style={styles.header}>
            <Image 
              source={{ uri: trip.imageUrl }} 
              style={styles.headerImage} 
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', Colors.background]}
              style={styles.headerGradient}
            />
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionsButton} 
              onPress={toggleOptionsMenu}
              ref={optionsMenuRef}
            >
              <MoreVertical size={24} color={Colors.text} />
            </TouchableOpacity>
            
            {showOptionsMenu && (
              <View style={styles.optionsMenu}>
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={() => {
                    setShowOptionsMenu(false);
                    handleDeleteTrip();
                  }}
                >
                  <Trash2 size={18} color={Colors.error} style={styles.optionIcon} />
                  <Text style={[styles.optionText, { color: Colors.error }]}>Delete Trip</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.content}>
            <Text style={styles.destination}>{trip.destination}</Text>
            
            <View style={styles.tripDetails}>
              <View style={styles.tripDetail}>
                <Calendar size={16} color={Colors.primary} style={styles.tripIcon} />
                <Text style={styles.tripDetailText}>{trip.dates}</Text>
              </View>
              <View style={styles.tripDetail}>
                <MapPin size={16} color={Colors.primary} style={styles.tripIcon} />
                <Text style={styles.tripDetailText}>{trip.location}</Text>
              </View>
            </View>

            <Text style={styles.description}>{trip.description}</Text>

            {isDeleting && (
              <View style={styles.deletingContainer}>
                <Text style={styles.deletingText}>{deletionStep}</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${deletionProgress}%` }]} />
                </View>
              </View>
            )}

            {!isDeleting && trip.playlists && trip.playlists.length > 0 ? (
              <View style={styles.playlistSection}>
                <Text style={styles.sectionTitle}>Trip Playlist</Text>
                
                {trip.playlists.map((playlist: Playlist) => (
                  <View key={playlist.id} style={styles.playlistCard}>
                    <Image 
                      source={{ uri: playlist.imageUrl }} 
                      style={styles.playlistImage} 
                      contentFit="cover"
                    />
                    <View style={styles.playlistInfo}>
                      <View style={styles.playlistHeader}>
                        <Text style={styles.playlistName}>{playlist.name}</Text>
                        <TouchableOpacity 
                          style={styles.deletePlaylistButton}
                          onPress={() => handleDeletePlaylist(playlist.id, playlist.name)}
                        >
                          <Trash2 size={16} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.playlistTracks}>{playlist.trackCount} tracks</Text>
                      
                      <View style={styles.playlistActions}>
                        <TouchableOpacity 
                          style={styles.playButton}
                          onPress={() => handlePlayPause(playlist)}
                        >
                          {currentTrack && 
                           currentTrack.playlistId === playlist.id && 
                           isPlaying ? (
                            <Pause size={20} color={Colors.text} />
                          ) : (
                            <Play size={20} color={Colors.text} />
                          )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => router.push(`/playlist/${playlist.id}`)}
                        >
                          <Text style={styles.actionButtonText}>View Details</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {playlist.tracks && playlist.tracks.length > 0 && (
                        <View style={styles.trackPreview}>
                          <Text style={styles.trackPreviewTitle}>Top Tracks:</Text>
                          {playlist.tracks.slice(0, 3).map((track: Track, index: number) => (
                            <TouchableOpacity 
                              key={index}
                              style={styles.trackItem}
                              onPress={() => {
                                // Ensure albumImageUrl is always defined
                                const trackWithDefaults: Track = {
                                  ...track,
                                  playlistId: playlist.id,
                                  playlistName: playlist.name,
                                  albumImageUrl: track.albumImageUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww"
                                };
                                playTrack(trackWithDefaults);
                              }}
                            >
                              <Text style={styles.trackNumber}>{index + 1}</Text>
                              <View style={styles.trackInfo}>
                                <Text style={styles.trackName} numberOfLines={1}>
                                  {track.name}
                                </Text>
                                <Text style={styles.trackArtist} numberOfLines={1}>
                                  {track.artists.join(", ")}
                                </Text>
                              </View>
                              {currentTrack && 
                               currentTrack.id === track.id && 
                               isPlaying ? (
                                <Pause size={16} color={Colors.primary} />
                              ) : (
                                <Play size={16} color={Colors.textSecondary} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
                
                <TouchableOpacity 
                  style={[styles.createAnotherButton, isCreating && styles.disabledButton]} 
                  onPress={handleCreateAutoPlaylist}
                  disabled={isCreating}
                >
                  <Text style={styles.createAnotherButtonText}>
                    {isCreating ? "Creating..." : "Create Another Playlist"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : !isDeleting ? (
              <View style={styles.emptyPlaylists}>
                <Music size={40} color={Colors.primary} style={styles.emptyIcon} />
                <Text style={styles.emptyText}>No playlists yet</Text>
                {isCreating ? (
                  <View style={styles.creatingContainer}>
                    <Text style={styles.creatingText}>{creationStatus || "Creating playlist..."}</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${progress}%` }]} />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.emptyButton, isCreating && styles.disabledButton]} 
                    onPress={handleCreateAutoPlaylist}
                    disabled={isCreating}
                  >
                    <Text style={styles.emptyButtonText}>
                      {isCreating ? "Creating..." : "Create Auto Playlist"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </View>
          
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
    height: 250,
    position: "relative",
  },
  headerImage: {
    width: "100%",
    height: "100%",
  },
  headerGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  backButton: {
    position: "absolute",
    top: 10,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  optionsButton: {
    position: "absolute",
    top: 10,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  optionsMenu: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 20,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  optionIcon: {
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  destination: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  tripDetails: {
    flexDirection: "row",
    marginBottom: 16,
  },
  tripDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  tripIcon: {
    marginRight: 6,
  },
  tripDetailText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  description: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 24,
  },
  playlistSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 16,
  },
  playlistCard: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.cardBackground,
    marginBottom: 16,
  },
  playlistImage: {
    width: "100%",
    height: 180,
  },
  playlistInfo: {
    padding: 16,
  },
  playlistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  playlistName: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  deletePlaylistButton: {
    padding: 8,
  },
  playlistTracks: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  playlistActions: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  actionButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  trackPreview: {
    marginTop: 8,
  },
  trackPreviewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  trackNumber: {
    width: 24,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  trackInfo: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  trackName: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyPlaylists: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    marginBottom: 24,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  createAnotherButton: {
    backgroundColor: Colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: 10,
  },
  createAnotherButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.7,
  },
  creatingContainer: {
    width: "80%",
    alignItems: "center",
  },
  creatingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: "center",
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: Colors.divider,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.primary,
  },
  spacer: {
    height: 100, // Space for the tab bar
  },
  deletingContainer: {
    width: "100%",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  deletingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: "center",
  },
});