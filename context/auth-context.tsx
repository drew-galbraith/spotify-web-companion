import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

// Ensure browser can handle auth redirects
WebBrowser.maybeCompleteAuthSession();

type SpotifyUser = {
  id: string;
  display_name: string;
  email: string;
  images?: Array<{ url: string }>;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: SpotifyUser | null;
  spotifyToken: string | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get from constants
  const clientId = Constants.expoConfig?.extra?.spotifyClientId || '14457edd9cd944a08d5d1bcac2371875';
  
  // Use the auto-detected redirect URI from Expo
  const redirectUri = AuthSession.makeRedirectUri();
  
  console.log("Current redirect URI:", redirectUri);
  
  // Spotify API endpoints
  const discovery = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
  };
  
  // Load user data from SecureStore on initial render
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('spotify_token');
        if (storedToken) {
          console.log('Found stored token, attempting to validate');
          console.log('Token length:', storedToken.length);

          // Validate the token and get fresh user data
          try {
            const userResponse = await fetch('https://api.spotify.com/v1/me', {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            
            console.log('Token validation response status:', userResponse.status);

            if (userResponse.ok) {
              const spotifyUser = await userResponse.json();
              setUser(spotifyUser);
              setSpotifyToken(storedToken);
              console.log('Successfully restored session from stored token');
            } else {
              console.log('Stored token is invalid, signing out');
              await signOut();
            }
          } catch (error) {
            console.log('Error fetching user data with stored token', error);
            await signOut();
          }
        } else {
          console.log('No stored token found');
        }
      } catch (error) {
        console.log('Error loading stored credentials', error);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    loadUserData();
  }, []);

  // Add this helper function to check token scopes
  const checkTokenScopes = async (token: string) => {
    try {
      // Use a test endpoint to verify token validity
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        console.error('Token validation failed:', response.status);
        return false;
      }
      
      const userData = await response.json();
      console.log('Token is valid for user:', userData.id);
      
      // Try to get token info (this endpoint might give us scope info)
      try {
        const tokenInfoResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (tokenInfoResponse.ok) {
          console.log('Token has valid scopes for user endpoints');
        }
        
        // Test playlist creation permissions specifically
        const playlistTestResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=1', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (playlistTestResponse.ok) {
          console.log('Token has valid scopes for playlist operations');
        } else {
          console.error('Token lacks playlist permissions:', playlistTestResponse.status);
        }
        
      } catch (scopeError) {
        console.error('Error checking token scopes:', scopeError);
      }
      
      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  };

  const fetchUserProfile = async (token: string) => {
    try {
      console.log('Fetching user profile');
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!userResponse.ok) {
        console.error('Failed to fetch user profile');
        throw new Error('Failed to fetch user profile');
      }
      
      const spotifyUser = await userResponse.json();
      console.log('User profile fetched successfully');
      setUser(spotifyUser);
      
      // Update user record in Firestore
      try {
        console.log('Updating user record in Firestore');
        await setDoc(
          doc(db, 'users', spotifyUser.id),
          {
            spotify_id: spotifyUser.id,
            display_name: spotifyUser.display_name,
            email: spotifyUser.email,
            avatar_url: spotifyUser.images?.[0]?.url ?? null,
            last_login: new Date().toISOString(),
          },
          { merge: true }
        );
        console.log('User record updated in Firestore');
      } catch (firestoreError) {
        console.error('Error updating Firestore', firestoreError);
      }
      
      return spotifyUser;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  };

  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Starting Spotify authentication flow');
      console.log('Using redirect URI:', redirectUri);
      
      // Create a new auth request
      const authRequest = new AuthSession.AuthRequest({
        clientId,
        scopes: [
          // Basic profile access
          'user-read-email',
          'user-read-private',
          
          // Listening stats permissions
          'user-top-read',
          'user-read-recently-played',
          
          // Playlist permissions
          'playlist-read-private',
          'playlist-read-collaborative',
          'playlist-modify-public',
          'playlist-modify-private',
          
          // Player permissions
          'user-read-playback-state',
          'user-modify-playback-state',
          'user-read-currently-playing',
          'streaming',
          'app-remote-control'        
        ],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      });
      
      console.log('Created auth request');
      
      // Generate the authorization URL
      await authRequest.makeAuthUrlAsync(discovery);
      console.log('Generated auth URL');
      
      // Launch the browser for authentication
      console.log('Prompting for authentication...');
      const authResult = await authRequest.promptAsync(discovery);
      
      console.log('Auth result type:', authResult.type);
      
      if (authResult.type === 'success' && authResult.params.code) {
        console.log('Authentication successful, exchanging code for token');
        
        try {
          // Exchange the code for tokens
          const tokenResult = await AuthSession.exchangeCodeAsync(
            {
              clientId,
              code: authResult.params.code,
              redirectUri,
              extraParams: {
                code_verifier: authRequest.codeVerifier || '',
              },
            },
            discovery
          );
          
          console.log('Token exchange successful');
          const accessToken = tokenResult.accessToken;
          
          // Store the token securely
          await SecureStore.setItemAsync('spotify_token', accessToken);
          setSpotifyToken(accessToken);
          
          // Debug: Check token scopes
          await checkTokenScopes(accessToken);
  
          // Fetch the user profile
          await fetchUserProfile(accessToken);
          
          console.log('Authentication process completed successfully');
          
          // Navigate to the home screen
          router.replace('/');
        } catch (exchangeError) {
          console.error('Error during token exchange:', exchangeError);
          Alert.alert('Authentication Error', 'Failed to exchange code for token');
        }
      } else {
        console.log('Authentication was not successful:', authResult);
        Alert.alert('Authentication Failed', 'Could not complete Spotify login');
      }
    } catch (error) {
      console.error('Error during Spotify authentication:', error);
      Alert.alert('Authentication Error', 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, redirectUri]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Signing out');
      setUser(null);
      setSpotifyToken(null);
      await SecureStore.deleteItemAsync('spotify_token');
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Don't render children until initialized
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }


  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        spotifyToken,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useSafeAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  // Return a default context if not available
  if (context === undefined) {
    console.warn('useSafeAuth called outside AuthProvider, returning default context');
    return {
      isAuthenticated: false,
      user: null,
      spotifyToken: null,
      isLoading: true,
      signIn: async () => { console.warn('signIn called outside AuthProvider'); },
      signOut: async () => { console.warn('signOut called outside AuthProvider'); },
    };
  }
  
  return context;
};