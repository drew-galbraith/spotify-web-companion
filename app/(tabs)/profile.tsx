import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import Colors from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAuth } from '../../context/auth-context';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import LoadingScreen from '../../components/loading-screen';
import ErrorView from '../../components/error-view';
import { usePlayerStore } from '../../store/player-store';

// Type for the user profile data from Firestore
type FirestoreUserProfile = {
  spotify_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  trips?: number;
  playlists?: number;
  tracks?: number;
  last_login?: string;
};

export default function ProfileScreen() {
  const { 
    isAuthenticated, 
    isLoading: authLoading, 
    user, 
    spotifyToken, 
    signOut 
  } = useSafeAuth();
  
  const [profile, setProfile] = useState<FirestoreUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  console.log('Auth state:', { isAuthenticated, authLoading, user });

  // Fetch user profile data from Firestore
  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id || !isAuthenticated) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          console.log('No user profile found in Firestore');
          setProfile(null);
        } else {
          const userData = userDoc.data() as FirestoreUserProfile;
          setProfile(userData);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProfile();
  }, [user?.id, isAuthenticated]);

  // Handle authentication errors
  useEffect(() => {
    if (!isLoading && !profile && error) {
      console.log("Failed to load profile. Redirecting...");
      signOut();
    }
  }, [isLoading, profile, error]);
  
  const { currentTrack, isPlaying } = usePlayerStore();

  // While auth is loading
  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Auth loading...</Text>
      </View>
    );
  }

  // If not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Text>User not authenticated.</Text>
      </View>
    );
  }

  // While fetching profile data
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Error fetching profile
  if (error) {
    return <ErrorView message="Failed to load profile" />;
  }

  // If no profile but authenticated, create a profile from user data
  const displayProfile = profile || {
    spotify_id: user?.id || '',
    display_name: user?.display_name || '',
    email: user?.email || '',
    avatar_url: user?.images?.[0]?.url || null,
    trips: 0,
    playlists: 0,
    tracks: 0
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Debug Info */}
        <View style={styles.debugSection}>
          <Text style={styles.debugText}>Auth OK: {isAuthenticated ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>User ID: {user?.id || 'None'}</Text>
          {spotifyToken && (
            <Text style={styles.debugText}>Spotify Token: {spotifyToken.slice(0, 10)}...</Text>
          )}
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {displayProfile.avatar_url ? (
            <Image source={{ uri: displayProfile.avatar_url }} style={styles.profileImage} contentFit="cover" />
          ) : (
            <View style={styles.profileImagePlaceholder} />
          )}
          <Text style={styles.profileName}>{displayProfile.display_name}</Text>
          <Text style={styles.profileEmail}>{displayProfile.email}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{displayProfile.trips ?? 0}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{displayProfile.playlists ?? 0}</Text>
            <Text style={styles.statLabel}>Playlists</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{displayProfile.tracks ?? 0}</Text>
            <Text style={styles.statLabel}>Tracks</Text>
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="musical-notes-outline" size={24} color={Colors.text} style={styles.menuIcon} />
            <Text style={styles.menuText}>Spotify Account Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="map-outline" size={24} color={Colors.text} style={styles.menuIcon} />
            <Text style={styles.menuText}>Travel Preferences</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="heart-outline" size={24} color={Colors.text} style={styles.menuIcon} />
            <Text style={styles.menuText}>Favorite Genres</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  contentContainer: { padding: 20 },
  debugSection: { marginBottom: 20, padding: 10, backgroundColor: '#333', borderRadius: 8 },
  debugText: { color: '#fff', fontSize: 12 },
  profileSection: { alignItems: 'center', paddingVertical: 30 },
  profileImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  profileImagePlaceholder: { width: 120, height: 120, borderRadius: 60, marginBottom: 16, backgroundColor: Colors.secondary },
  profileName: { fontSize: 24, color: Colors.text, fontWeight: 'bold' },
  profileEmail: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  statsSection: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, color: Colors.text, fontWeight: 'bold' },
  statLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  menuSection: { borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 20, paddingBottom: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuIcon: { marginRight: 12 },
  menuText: { fontSize: 16, color: Colors.text },
  logoutButton: { position: 'absolute', bottom: 20, alignSelf: 'center', padding: 10 },
  logoutText: { color: Colors.error, fontSize: 16 },
});