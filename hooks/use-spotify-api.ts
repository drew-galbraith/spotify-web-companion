import { useState, useCallback } from "react";
import { useSafeAuth } from "../context/auth-context";

export function useSpotifyApi() {
  const { spotifyToken, refreshSpotifyToken, isTokenExpired } = useSafeAuth();

  const fetchFromSpotify = async (endpoint: string, options: RequestInit = {}) => {
    try {
      let currentToken = spotifyToken;
      
      // Check if token is expired and refresh if needed
      if (isTokenExpired()) {
        console.log('Token expired, refreshing...');
        currentToken = await refreshSpotifyToken();
      }
      
      const url = `https://api.spotify.com${endpoint}`;
      console.log(`Fetching from Spotify: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      // If 401, try refreshing token and retry once
      if (response.status === 401) {
        console.log('Received 401, attempting token refresh...');
        try {
          const newToken = await refreshSpotifyToken();
          
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Spotify API error: ${retryResponse.status} - ${await retryResponse.text()}`);
          }
          
          return retryResponse.json();
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Authentication failed. Please sign in again.');
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Spotify API error: ${response.status} - ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error in fetchFromSpotify:', error);
      throw error;
    }
  };

  return {
    fetchFromSpotify,
    spotifyToken,
  };
}