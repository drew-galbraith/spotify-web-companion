import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";

// Spotify API credentials
const CLIENT_ID = "14457edd9cd944a08d5d1bcac2371875"; // Spotify Client ID

// Create redirect URI - this needs to be added to your Spotify Developer Dashboard
const redirectUri = Linking.createURL("/spotify-callback");

// Log the redirect URI for debugging
console.log("===========================================");
console.log("IMPORTANT: Add this Redirect URI to your Spotify Dashboard:");
console.log(redirectUri);
console.log("===========================================");

const SPOTIFY_AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-top-read",
  "user-read-recently-played",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  // Add scopes for playback control
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  // Add scopes for iOS Spotify Connect
  "app-remote-control"
];

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  token: string | null;
  isPremium: boolean;
  userProfile: any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the useAuth hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Generate a random string for state parameter and code verifier
const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Base64 URL encode a string
const base64URLEncode = (str: string) => {
  return str
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// Generate code challenge from verifier using SHA-256
const generateCodeChallenge = async (codeVerifier: string) => {
  try {
    // Hash the code verifier with SHA-256
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier
    );
    
    // Convert the digest to a base64 URL-encoded string
    // First, convert the hex digest to a byte array
    const byteArray = new Uint8Array(digest.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    // Then convert to base64
    let base64 = '';
    const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const bytes = new Uint8Array(byteArray);
    const byteLength = bytes.byteLength;
    const byteRemainder = byteLength % 3;
    const mainLength = byteLength - byteRemainder;

    let a, b, c, d;
    let chunk;

    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048) >> 12; // 258048 = (2^6 - 1) << 12
      c = (chunk & 4032) >> 6; // 4032 = (2^6 - 1) << 6
      d = chunk & 63; // 63 = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder === 1) {
      chunk = bytes[mainLength];

      a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3) << 4; // 3 = 2^2 - 1

      base64 += encodings[a] + encodings[b] + '==';
    } else if (byteRemainder === 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

      a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008) >> 4; // 1008 = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15) << 2; // 15 = 2^4 - 1

      base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }
    
    // Make it URL safe
    return base64URLEncode(base64);
  } catch (error) {
    console.error("Error generating code challenge:", error);
    throw error;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  
  // Use a ref to track if profile fetch is in progress
  const isFetchingProfileRef = useRef(false);

  // Check for existing token on app start
  useEffect(() => {
    const checkToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("spotify_token");
        const expiresAt = await AsyncStorage.getItem("spotify_expires_at");
        
        if (storedToken && expiresAt) {
          const now = Date.now();
          if (parseInt(expiresAt) > now) {
            console.log("Found valid token, setting authenticated state");
            setToken(storedToken);
            setIsAuthenticated(true);
            
            // Load user profile data
            fetchUserProfile(storedToken);
          } else {
            // Token expired, clear it
            console.log("Token expired, clearing");
            await AsyncStorage.multiRemove(["spotify_token", "spotify_expires_at", "spotify_user_profile"]);
          }
        } else {
          console.log("No token found or missing expiration");
        }
      } catch (error) {
        console.error("Error checking token:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  // Fetch user profile to check premium status
  const fetchUserProfile = async (accessToken: string) => {
    // Prevent multiple simultaneous profile fetches
    if (isFetchingProfileRef.current) {
      return;
    }
    
    isFetchingProfileRef.current = true;
    
    try {
      // Check if we have cached profile data
      const cachedProfile = await AsyncStorage.getItem("spotify_user_profile");
      if (cachedProfile) {
        const profileData = JSON.parse(cachedProfile);
        setUserProfile(profileData);
        setIsPremium(profileData.product === "premium");
        console.log("Loaded cached user profile, premium status:", profileData.product === "premium");
        isFetchingProfileRef.current = false;
        return;
      }
      
      // Fetch profile from Spotify API
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const profileData = await response.json();
      setUserProfile(profileData);
      
      // Check if user has premium
      const hasPremium = profileData.product === "premium";
      setIsPremium(hasPremium);
      
      // Cache the profile data
      await AsyncStorage.setItem("spotify_user_profile", JSON.stringify(profileData));
      
      console.log("User premium status:", hasPremium);
      
      // If user is premium, also fetch their top tracks and artists for personalization
      if (hasPremium) {
        try {
          // Fetch top tracks
          const topTracksResponse = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          
          if (topTracksResponse.ok) {
            const topTracksData = await topTracksResponse.json();
            await AsyncStorage.setItem("spotify_user_top_tracks", JSON.stringify(topTracksData));
          }
          
          // Fetch top artists
          const topArtistsResponse = await fetch("https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          
          if (topArtistsResponse.ok) {
            const topArtistsData = await topArtistsResponse.json();
            await AsyncStorage.setItem("spotify_user_top_artists", JSON.stringify(topArtistsData));
          }
        } catch (error) {
          console.error("Error fetching user preferences:", error);
          // Non-critical error, continue without preferences
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      isFetchingProfileRef.current = false;
    }
  };

  // Handle the initial URL when the app opens from a redirect
  useEffect(() => {
    const handleRedirect = async (url: string) => {
      if (url.includes('code=')) {
        const code = url.split('code=')[1].split('&')[0];
        await exchangeCodeForToken(code);
      }
    };

    // Add event listener for deep linking
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleRedirect(url);
    });

    // Check if app was opened from a deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        handleRedirect(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const exchangeCodeForToken = async (code: string) => {
    try {
      const codeVerifier = await AsyncStorage.getItem("code_verifier");
      if (!codeVerifier) {
        throw new Error("No code verifier found");
      }

      console.log("Exchanging code for token...");
      console.log("Code:", code);
      console.log("Code verifier:", codeVerifier);
      console.log("Redirect URI:", redirectUri);

      const tokenResponse = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }).toString(),
      });

      const data = await tokenResponse.json();
      
      if (data.error) {
        console.error("Token exchange error:", data.error);
        throw new Error(`Token exchange failed: ${data.error}`);
      }

      const { access_token, expires_in, refresh_token } = data;
      const expiresAt = Date.now() + (expires_in * 1000);
      
      // Store token and expiration
      await AsyncStorage.setItem("spotify_token", access_token);
      await AsyncStorage.setItem("spotify_expires_at", expiresAt.toString());
      
      // Store refresh token if available
      if (refresh_token) {
        await AsyncStorage.setItem("spotify_refresh_token", refresh_token);
      }
      
      console.log("Token stored successfully, expires in", expires_in, "seconds");
      
      setToken(access_token);
      setIsAuthenticated(true);
      
      // Fetch user profile to check premium status
      await fetchUserProfile(access_token);
      
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Code exchange error:", error);
      Alert.alert(
        "Authentication Failed",
        "There was a problem connecting to Spotify. Please try again."
      );
    }
  };

  const login = async () => {
    try {
      // Clear any existing tokens first to avoid caching issues
      await AsyncStorage.multiRemove(["spotify_token", "spotify_expires_at", "spotify_user_profile"]);
      
      // Generate PKCE code verifier (between 43-128 chars)
      const codeVerifier = generateRandomString(64);
      await AsyncStorage.setItem("code_verifier", codeVerifier);
      
      // Generate code challenge from verifier
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Generate state parameter for security
      const state = generateRandomString(16);
      
      // Build the authorization URL with the authorization code flow + PKCE
      const authUrl = new URL(SPOTIFY_AUTH_ENDPOINT);
      authUrl.searchParams.append("client_id", CLIENT_ID);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("redirect_uri", redirectUri);
      authUrl.searchParams.append("scope", SCOPES.join(" "));
      authUrl.searchParams.append("code_challenge_method", "S256");
      authUrl.searchParams.append("code_challenge", codeChallenge);
      authUrl.searchParams.append("state", state);
      authUrl.searchParams.append("show_dialog", "true");
      
      console.log("Opening auth URL:", authUrl.toString());
      
      //FIX: Remove this alert in production
      // alert(authUrl.toString());
      // alert(redirectUri);

      //Open the browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl.toString(),
        redirectUri
      );
      
      console.log("Auth result:", JSON.stringify(result));

      if (result.type === 'success' && result.url) {
        // Extract the authorization code from the URL
        const url = result.url;
        if (url.includes('code=')) {
          const code = url.split('code=')[1].split('&')[0];
          await exchangeCodeForToken(code);
        } else if (url.includes('error=')) {
          const error = url.split('error=')[1].split('&')[0];
          console.error("Authorization error:", error);
          throw new Error(`Authorization failed: ${error}`);
        } else {
          console.error("No code found in redirect URL");
          throw new Error("Authentication failed: No authorization code received");
        }
      } else {
        console.error("Authentication failed:", JSON.stringify(result));
        throw new Error("Authentication failed or was cancelled");
      }
    } catch (error) {
      console.error("Spotify auth error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Import the player store dynamically to avoid circular dependencies
      const playerStoreModule = await import("../store/player-store");
      const playerStore = playerStoreModule.usePlayerStore.getState();
      
      // Hide player before logout
      if (playerStore.currentTrack) {
        playerStore.stopTrack();
        playerStore.hidePlayer();
      }
      
      await AsyncStorage.multiRemove([
        "spotify_token", 
        "spotify_expires_at", 
        "code_verifier", 
        "spotify_device_id",
        "spotify_refresh_token",
        "spotify_user_profile",
        "spotify_user_top_tracks",
        "spotify_user_top_artists"
      ]);
      setToken(null);
      setIsAuthenticated(false);
      setIsPremium(false);
      setUserProfile(null);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
        token,
        isPremium,
        userProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}