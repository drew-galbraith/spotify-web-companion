import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useSpotifyApi } from './use-spotify-api';
import { db } from '../lib/firebase';
import { doc, getDoc, deleteDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

export function useTripDeletion() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  
  const { fetchFromSpotify } = useSpotifyApi();

// Unfollow a playlist (Spotify doesn't support deleting playlists via API)
const deletePlaylist = async (playlistId: string) => {
  // PUT request to unfollow the playlist
  await fetchFromSpotify(`/v1/playlists/${playlistId}/followers`, {
    method: 'DELETE'
  });
};

// Delete a single playlist from both Firebase and Spotify
const deletePlaylistFromTrip = useCallback(async (tripId: string, playlistId: string) => {
  try {
    setIsDeleting(true);
    setCurrentStep(`Removing playlist from Spotify...`);
    
    console.log(`Attempting to delete playlist: ${playlistId}`);
    
    // First, get the playlist document from Firebase to get the Spotify ID
    const playlistDocRef = doc(db, "playlists", playlistId);
    const playlistDoc = await getDoc(playlistDocRef);
    
    if (!playlistDoc.exists()) {
      console.error(`Playlist document ${playlistId} not found in Firebase`);
      throw new Error("Playlist not found");
    }
    
    const playlistData = playlistDoc.data();
    const spotifyPlaylistId = playlistData.spotifyId;
    
    console.log(`Deleting playlist: Firebase ID: ${playlistId}, Spotify ID: ${spotifyPlaylistId}`);
    
    // Unfollow from Spotify using the correct Spotify ID
    if (spotifyPlaylistId) {
      try {
        await deletePlaylist(spotifyPlaylistId);
        console.log(`Unfollowed playlist ${spotifyPlaylistId} from Spotify`);
      } catch (spotifyError) {
        console.error(`Failed to unfollow playlist ${spotifyPlaylistId} from Spotify:`, spotifyError);
        // Continue with Firebase deletion even if Spotify fails
      }
    }
    
    // Delete from Firebase playlists collection
    await deleteDoc(playlistDocRef);
    console.log(`Deleted playlist document ${playlistId} from Firebase`);
    
    // Update trip in Firebase to remove playlist reference
    setCurrentStep(`Updating trip...`);
    const tripRef = doc(db, "trips", tripId);
    const tripDoc = await getDoc(tripRef);
    
    if (tripDoc.exists()) {
      const tripData = tripDoc.data();
      // Filter by Firebase ID, not Spotify ID
      const updatedPlaylists = (tripData.playlists || []).filter(
        (p: any) => p.id !== playlistId
      );
      
      await updateDoc(tripRef, {
        playlists: updatedPlaylists,
        updatedAt: new Date().toISOString()
      });
      console.log(`Updated trip ${tripId} - removed playlist reference`);
    }
    
    setCurrentStep('Playlist removed successfully');
    return true;
  } catch (error) {
    console.error('Error removing playlist:', error);
    Alert.alert(
      'Error',
      'Failed to remove playlist. Please try again.',
      [{ text: 'OK', style: 'default' }]
    );
    return false;
  } finally {
    setIsDeleting(false);
    setProgress(0);
  }
}, [fetchFromSpotify]);

  // Delete entire trip and all its playlists
// Delete entire trip and all its playlists
const deleteTrip = useCallback(async (tripId: string) => {
  try {
    setIsDeleting(true);
    
    // Get trip data from Firebase
    const tripRef = doc(db, "trips", tripId);
    const tripDoc = await getDoc(tripRef);
    
    if (!tripDoc.exists()) {
      throw new Error("Trip not found");
    }
    
    const tripData = tripDoc.data();
    const playlists = tripData.playlists || [];
    
    console.log(`Found ${playlists.length} playlists to delete`);
    console.log('Playlists data:', playlists);
    
    if (playlists.length > 0) {
      setCurrentStep(`Removing ${playlists.length} playlists...`);
      
      // Delete each playlist from both Spotify and Firebase
      for (let i = 0; i < playlists.length; i++) {
        const playlist = playlists[i];
        setCurrentStep(`Removing playlist ${i + 1} of ${playlists.length}...`);
        setProgress(Math.floor((i / playlists.length) * 80));
        
        try {
          // Get the playlist document from Firebase
          const playlistDocRef = doc(db, "playlists", playlist.id);
          const playlistDoc = await getDoc(playlistDocRef);
          
          if (playlistDoc.exists()) {
            const playlistData = playlistDoc.data();
            const spotifyPlaylistId = playlistData.spotifyId;
            
            console.log(`Deleting playlist: Firebase ID: ${playlist.id}, Spotify ID: ${spotifyPlaylistId}`);
            
            // Try to unfollow from Spotify
            if (spotifyPlaylistId) {
              try {
                await deletePlaylist(spotifyPlaylistId);
                console.log(`Unfollowed playlist ${spotifyPlaylistId} from Spotify`);
              } catch (spotifyError) {
                console.error(`Failed to unfollow playlist ${spotifyPlaylistId} from Spotify:`, spotifyError);
                // Continue even if Spotify deletion fails
                // The playlist might already be deleted or unfollowed
              }
            }
            
            // Always delete from Firebase playlists collection
            await deleteDoc(playlistDocRef);
            console.log(`Deleted playlist document ${playlist.id} from Firebase`);
          } else {
            console.error(`Playlist document ${playlist.id} not found in Firebase`);
          }
          
        } catch (error) {
          console.error(`Failed to delete playlist ${playlist.id}:`, error);
          // Continue with other playlists even if one fails
        }
      }
    }
    
    // Remove trip from Firebase
    setCurrentStep('Removing trip from your collection...');
    setProgress(90);
    await deleteDoc(tripRef);
    console.log(`Deleted trip ${tripId} from Firebase`);
    
    setCurrentStep('Trip deleted successfully');
    setProgress(100);
    
    // Navigate back to trips list
    router.replace('/(tabs)/trips');
    
    return true;
  } catch (error) {
    console.error('Error deleting trip:', error);
    Alert.alert(
      'Error',
      'Failed to delete trip. Please try again.',
      [{ text: 'OK', style: 'default' }]
    );
    return false;
  } finally {
    setIsDeleting(false);
  }
}, [fetchFromSpotify]);


  // Confirm and delete trip
  const confirmAndDeleteTrip = useCallback((tripId: string, tripName: string) => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${tripName || 'this trip'}" and all its playlists? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteTrip(tripId)
        }
      ]
    );
  }, [deleteTrip]);

  // Confirm and delete playlist
  const confirmAndDeletePlaylist = useCallback((tripId: string, playlistId: string, playlistName: string) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlistName}" from Spotify? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deletePlaylistFromTrip(tripId, playlistId)
        }
      ]
    );
  }, [deletePlaylistFromTrip]);

  return {
    isDeleting,
    progress,
    currentStep,
    deleteTrip,
    deletePlaylistFromTrip,
    confirmAndDeleteTrip,
    confirmAndDeletePlaylist
  };
}