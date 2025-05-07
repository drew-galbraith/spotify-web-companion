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
import { Platform } from 'react-native';



// Ensure browser can handle auth redirects
WebBrowser.maybeCompleteAuthSession();

type SpotifyUser = {
  id: string;
  display_name: string;
  email: string;
  images?: Array<{ url: string }>;
  product?: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: SpotifyUser | null;
  spotifyToken: string | null;
  isLoading: boolean;
  isPremium: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSpotifyToken: () => Promise<string>;
  isTokenExpired: () => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);

  // Get from constants
  const clientId = Constants.expoConfig?.extra?.spotifyClientId || '14457edd9cd944a08d5d1bcac2371875';
  
  // Get the scheme from your app.json
  const SCHEME =
  // 1) Try the new EAS/bare value
  Constants.expoConfig?.scheme ??
  // 2) Fallback to the old “manifest” (Expo Go / SDK < 47)
  Constants.manifest?.scheme ??
  // 3) Last-ditch fallback
  'wandertunes';
    
  // Add this helper function to check if token is expired
  const isTokenExpired = () => {
    if (!tokenExpiresAt) return false;
    return Date.now() >= tokenExpiresAt;
  };

  // Add this token refresh function
  const refreshSpotifyToken = async () => {
    try {
      console.log('Refreshing Spotify token...');
      const storedRefreshToken = await SecureStore.getItemAsync('spotify_refresh_token');
      
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const tokenUrl = 'https://accounts.spotify.com/api/token';
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', storedRefreshToken);
      params.append('client_id', clientId);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      // Store the new access token
      await SecureStore.setItemAsync('spotify_token', data.access_token);
      setSpotifyToken(data.access_token);
      
      // Store the new refresh token if provided
      if (data.refresh_token) {
        await SecureStore.setItemAsync('spotify_refresh_token', data.refresh_token);
        setRefreshToken(data.refresh_token);
      }
      
      // Calculate expiration time
      const expiresIn = data.expires_in || 3600; // Default to 1 hour
      const expiresAt = Date.now() + (expiresIn * 1000);
      await SecureStore.setItemAsync('spotify_token_expires_at', expiresAt.toString());
      setTokenExpiresAt(expiresAt);
      
      console.log('Token refreshed successfully');
      return data.access_token;
    } catch (error) {
      console.error('Error refreshing Spotify token:', error);
      throw error;
    }
  };

  // Use the auto-detected redirect URI from Expo
  const redirectUri = AuthSession.makeRedirectUri({
    //For standalone apps, use the scheme defined in app.json
    scheme: SCHEME,
    path: 'redirect'
  });
  console.log('➡️ redirectUri =', redirectUri);
    
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
      console.log('User product:', spotifyUser.product);

      // Check if user is premium
      const premium = spotifyUser.product === 'premium';
      setIsPremium(premium);

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
            product: spotifyUser.product,
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

          // Follow
          'user-follow-modify',
          'user-follow-read',

          // Library
          'user-library-modify',
          'user-library-read',

          // Player permissions
          'user-read-playback-state',
          'user-modify-playback-state',
          'user-read-currently-playing',
          'streaming',
          'app-remote-control',
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

          //Then when you want to prompt the user for authentication, use the following:
          // const handleLogin = async () => {
          //   promptAsync({
          //     useProxy: Constants.appOwnership === 'expo',
          //   });
          // };
          
          console.log('Token exchange successful');
          const accessToken = tokenResult.accessToken;
          const refreshToken = tokenResult.refreshToken;
          
          // Store both tokens
          await SecureStore.setItemAsync('spotify_token', accessToken);
          if (refreshToken) {
            await SecureStore.setItemAsync('spotify_refresh_token', refreshToken);
            setRefreshToken(refreshToken);
          }

          // Store expiration time
          const expiresIn = tokenResult.expiresIn || 3600;
          const expiresAt = Date.now() + (expiresIn * 1000);
          await SecureStore.setItemAsync('spotify_token_expires_at', expiresAt.toString());
          setTokenExpiresAt(expiresAt);

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

  // Add automatic token refresh check
  useEffect(() => {
    const checkTokenExpiration = async () => {
      if (spotifyToken && tokenExpiresAt) {
        // Check if token is about to expire (5 minutes before)
        if (Date.now() >= tokenExpiresAt - 300000) {
          try {
            await refreshSpotifyToken();
          } catch (error) {
            console.error('Auto token refresh failed:', error);
            // Optionally force a sign out
            await signOut();
          }
        }
      }
    };
    
    // Check every minute
    const intervalId = setInterval(checkTokenExpiration, 60000);
    
    return () => clearInterval(intervalId);
  }, [spotifyToken, tokenExpiresAt]);


  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Signing out');
      setUser(null);
      setSpotifyToken(null);
      setIsPremium(false);
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
        isPremium,
        signIn,
        signOut,
        refreshSpotifyToken,
        isTokenExpired
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
      isPremium: false,
      signIn: async () => { console.warn('signIn called outside AuthProvider'); },
      signOut: async () => { console.warn('signOut called outside AuthProvider'); },
      refreshSpotifyToken: async () => { console.warn('refreshSpotifyToken called outside AuthProvider'); return ''; },
      isTokenExpired: () => false,
    };
  }
  
  return context;
};