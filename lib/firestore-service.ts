
import { db } from './firebase';
import {
  doc,
  setDoc,
  addDoc,
  collection,
  Timestamp
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

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
  }
) {
  const playlistId = uuidv4();
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
  });
}
