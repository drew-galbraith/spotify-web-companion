import { db } from './firebase';
import {
  doc,
  setDoc,
  addDoc,
  collection,
  Timestamp,
  runTransaction,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  query,
  where,
  getDocs,
  deleteDoc, // Added missing import
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { getAuth } from 'firebase/auth';

export async function saveUserToFirestore(user: {
  id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
}) {
  const userRef = doc(db, 'users', user.id);
  await setDoc(userRef, {
    spotify_id: user.id,
    display_name: user.display_name,
    email: user.email,
    avatar_url: user.avatar_url ?? null,
  });
}

export async function addTrip(userId: string, tripData: {
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  image_url?: string;
}) {
  const tripId = uuidv4();
  const tripRef = doc(db, 'users', userId, 'trips', tripId);
  await setDoc(tripRef, {
    ...tripData,
    image_url: tripData.image_url ?? null,
    created_at: Timestamp.now(),
    playlists: [], // Initialize with empty playlists array
  });
  return tripId;
}

export async function addPlaylist(
  userId: string,
  tripId: string,
  playlistData: {
    name: string;
    spotify_id: string;
    image_url?: string;
    description?: string;
    track_count?: number;
    destination?: string;
    country_code?: string;
    created_by?: string;
    is_auto_generated?: boolean;
  }
) {
  try {
    console.log("Adding playlist to Firestore:", { userId, tripId, playlistData });
    
    const playlistId = uuidv4();
    
    // Create the playlist document
    const playlistRef = doc(
      db,
      'users',
      userId,
      'trips',
      tripId,
      'playlists',
      playlistId
    );
    
    await setDoc(playlistRef, {
      ...playlistData,
      image_url: playlistData.image_url ?? null,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });
    
    console.log(`Created playlist document with ID: ${playlistId}`);
    
    // Update the trip document to include this playlist
    const tripRef = doc(db, 'users', userId, 'trips', tripId);
    
    // Use transaction to ensure atomicity
    await runTransaction(db, async (transaction) => {
      const tripDoc = await transaction.get(tripRef);
      
      if (!tripDoc.exists()) {
        throw new Error(`Trip document does not exist for tripId: ${tripId}`);
      }
      
      const tripData = tripDoc.data();
      const currentPlaylists = tripData.playlists || [];
      
      // Add the new playlist ID if it doesn't already exist
      if (!currentPlaylists.includes(playlistData.spotify_id)) {
        transaction.update(tripRef, {
          playlists: arrayUnion(playlistData.spotify_id),
          updated_at: Timestamp.now()
        });
        console.log(`Added playlist ${playlistData.spotify_id} to trip ${tripId}`);
      } else {
        console.log(`Playlist ${playlistData.spotify_id} already exists in trip ${tripId}`);
      }
    });
    
    return playlistId;
  } catch (error) {
    console.error('Error adding playlist to Firestore:', error);
    // Don't throw the error to allow the app to continue even if Firestore fails
    throw error;
  }
}

// New function to get user ID from authentication
export function getCurrentUserId(): string | null {
  const auth = getAuth();
  const user = auth.currentUser;
  return user ? user.uid : null;
}

// New function to add playlist with auto user detection
export async function addPlaylistWithAutoUser(
  tripId: string,
  playlistData: {
    name: string;
    spotify_id: string;
    image_url?: string;
    description?: string;
    track_count?: number;
    destination?: string;
    country_code?: string;
    is_auto_generated?: boolean;
  }
) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User not authenticated');
  }
  
  return addPlaylist(userId, tripId, {
    ...playlistData,
    created_by: userId
  });
}

// New function to get playlists for a trip
export async function getPlaylistsForTrip(userId: string, tripId: string) {
  try {
    const playlistsCollection = collection(db, 'users', userId, 'trips', tripId, 'playlists');
    const playlistsSnapshot = await getDocs(playlistsCollection);
    
    return playlistsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting playlists for trip:', error);
    throw error;
  }
}

// New function to remove playlist from trip
export async function removePlaylistFromTrip(userId: string, tripId: string, playlistSpotifyId: string) {
  try {
    // First, update the trip document to remove the playlist reference
    const tripRef = doc(db, 'users', userId, 'trips', tripId);
    await updateDoc(tripRef, {
      playlists: arrayRemove(playlistSpotifyId),
      updated_at: Timestamp.now()
    });
    
    // Find and delete the playlist document
    const playlistsCollection = collection(db, 'users', userId, 'trips', tripId, 'playlists');
    const q = query(playlistsCollection, where('spotify_id', '==', playlistSpotifyId));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    console.log(`Successfully removed playlist ${playlistSpotifyId} from trip ${tripId}`);
  } catch (error) {
    console.error('Error removing playlist from trip:', error);
    throw error;
  }
}

// New helper function to add a playlist to Firebase (backward compatible)
export async function addPlaylistToFirestore(tripId: string, playlistData: {
  spotifyId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  trackCount?: number;
  owner?: string;
  destination?: string;
  countryCode?: string;
  createdBy?: string;
  isAutoGenerated?: boolean;
}) {
  try {
    console.log('addPlaylistToFirestore called with:', { tripId, playlistData });
    
    const userId = getCurrentUserId();
    console.log('Current user ID:', userId);
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Transform the data to match the original format
    const firestoreData = {
      name: playlistData.name,
      spotify_id: playlistData.spotifyId,
      image_url: playlistData.imageUrl,
      description: playlistData.description,
      track_count: playlistData.trackCount,
      destination: playlistData.destination,
      country_code: playlistData.countryCode,
      created_by: playlistData.createdBy || userId,
      is_auto_generated: playlistData.isAutoGenerated,
    };
    
    console.log('Firestore data prepared:', firestoreData);
    
    const result = await addPlaylist(userId, tripId, firestoreData);
    console.log('addPlaylist result:', result);
    
    return result;
  } catch (error) {
    console.error('Error in addPlaylistToFirestore:', error);
    throw error;
  }
}