
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  FlatList, ActivityIndicator, Platform, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Colors from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/player-store';
import { useSafeAuth } from '../../context/auth-context';
import LoadingScreen from '../../components/loading-screen';
import ErrorView from '../../components/error-view';
import { LinearGradient } from 'expo-linear-gradient';
import TrackListItem from '../../components/track-list-item';
import PlayerControls from '../../components/player-controls';
import { useSpotifyApi } from '../../hooks/use-spotify-api';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

interface PlaylistTrack {
  id: string;
  name: string;
  artists: string[];
  albumName?: string;
  albumImageUrl: string;
  duration_ms: number;
  preview_url?: string;
  uri: string;
}

interface PlaylistData {
  id: string;
  name: string;
  imageUrl: string;
  trackCount: number;
  tracks: PlaylistTrack[];
  uri: string;
  location?: string;
  spotifyId: string;
}

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isPremium, user } = useSafeAuth();
  const { fetchFromSpotify } = useSpotifyApi();

  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Player store
  const {
    currentTrack,
    isPlaying,
    isLoading: isPlayerLoading,
    playTrack,
    pauseTrack
  } = usePlayerStore();

  // Fetch playlist
  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const docSnap = await getDoc(doc(db, 'playlists', id));
        if (!docSnap.exists()) throw new Error('Playlist not found');
        const data = docSnap.data();
        const spotifyId = data.spotifyId as string;
        const pl = await fetchFromSpotify(`/v1/playlists/${spotifyId}?fields=id,name,images,uri,tracks.total`);
        const trResp = await fetchFromSpotify(
          `/v1/playlists/${spotifyId}/tracks?fields=items(track(id,name,artists,album(name,images),duration_ms,preview_url,uri))`
        );
        const items = Array.isArray(trResp.items) ? trResp.items : [];
        const tracks: PlaylistTrack[] = items
          .map((item: any) => item.track)
          .filter((t: any) => t && !t.is_local)
          .map((t: any) => ({
            id: t.id,
            name: t.name,
            artists: t.artists.map((a: any) => a.name),
            albumName: t.album.name,
            albumImageUrl: t.album.images[0]?.url || '',
            duration_ms: t.duration_ms,
            preview_url: t.preview_url,
            uri: t.uri
          }));
        setPlaylist({
          id,
          name: pl.name,
          imageUrl: pl.images?.[0]?.url || data.imageUrl,
          trackCount: pl.tracks.total,
          tracks,
          uri: pl.uri,
          location: data.destination || data.location,
          spotifyId
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  // Play/pause handlers
  const firstTrack = playlist?.tracks[0];
  const isPlayingFirst = Boolean(firstTrack && isPlaying && currentTrack?.id === firstTrack.id);
  const handlePlayPause = () => {
    if (!firstTrack) return;
    if (isPlayingFirst) pauseTrack();
    else playTrack({ ...firstTrack, playlistId: playlist!.id, playlistName: playlist!.name });
  };

  const handleTrackPress = (track: PlaylistTrack) => {
    playTrack({ ...track, playlistId: playlist!.id, playlistName: playlist!.name });
  };

  const handleOpenInSpotify = async () => {
    if (!playlist) return;
    const parts = playlist.uri.split(':');
    const link = Platform.OS === 'web'
      ? `https://open.spotify.com/playlist/${parts[2]}`
      : `spotify:playlist:${parts[2]}`;
    const can = await Linking.canOpenURL(link);
    if (can) await Linking.openURL(link);
  };

  if (isLoading) return <LoadingScreen />;
  if (error || !playlist) return <ErrorView message="Failed to load playlist" />;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.playlistInfo}>
              <Image source={{ uri: playlist.imageUrl }} style={styles.playlistImage} contentFit="cover" />
              <View style={styles.playlistDetails}>
                <Text style={styles.playlistName}>{playlist.name}</Text>
                <Text style={styles.playlistTrackCount}>{playlist.tracks.length} tracks</Text>
              </View>
            </View>
            <View style={styles.playlistActions}>
              <TouchableOpacity onPress={handlePlayPause} style={[styles.playButton, (!firstTrack || isPlayerLoading) && styles.disabledButton]} disabled={!firstTrack || isPlayerLoading}>
                {isPlayerLoading
                  ? <ActivityIndicator color={Colors.text} />
                  : isPlayingFirst
                    ? <Ionicons name="pause" size={24} color={Colors.text} />
                    : <Ionicons name="play" size={24} color={Colors.text} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleOpenInSpotify} style={styles.spotifyButton}>
                <Ionicons name="open-outline" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
        <FlatList
          data={playlist.tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TrackListItem
              track={item}
              index={index}
              onPress={() => handleTrackPress(item)}
              showIndex
              showArtwork
            />
          )}
          contentContainerStyle={styles.listContent}
        />
        <PlayerControls
          compact
          showProgress
          isPlaying={isPlaying}
          onPlay={handlePlayPause}
          onPause={pauseTrack}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  headerContent: { gap: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)' },
  playlistInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  playlistImage: { width: 120, height: 120, borderRadius: 8 },
  playlistDetails: { flex: 1 },
  playlistName: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  playlistTrackCount: { fontSize: 14, color: Colors.textSecondary },
  playlistActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  playButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  disabledButton: { backgroundColor: Colors.secondary, opacity: 0.7 },
  spotifyButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1DB954', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  listContent: { paddingBottom: 100 }
});
