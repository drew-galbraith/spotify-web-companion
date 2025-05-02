import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { router } from "expo-router";

export interface Trip {
  id: string;
  destination: string;
  location: string;
  dates: string;
  description: string;
  imageUrl: string;
  playlistCount: number;
  playlists: {
    id: string;
    name: string;
    imageUrl: string;
    trackCount: number;
    location?: string;
  }[];
  createdAt: number;
  countryCode?: string;
  name?: string; // Optional trip name
}

interface TripState {
  trips: Trip[];
  addTrip: (trip: Omit<Trip, "id" | "playlistCount" | "playlists" | "createdAt">) => string;
  removeTrip: (id: string) => void;
  addPlaylistToTrip: (tripId: string, playlist: { id: string; name: string; imageUrl: string; trackCount: number; location?: string }) => void;
  removePlaylistFromTrip: (tripId: string, playlistId: string) => void;
  getTripById: (id: string) => Trip | undefined;
  updateTripDescription: (tripId: string, description: string) => void;
  // New function to get all playlist IDs for a trip
  getPlaylistIdsForTrip: (tripId: string) => string[];
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      
      addTrip: (tripData) => {
        const id = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const newTrip: Trip = {
          id,
          ...tripData,
          playlistCount: 0,
          playlists: [],
          createdAt: Date.now(),
        };
        
        set((state) => ({
          trips: [newTrip, ...state.trips],
        }));
        
        return id;
      },
      
      removeTrip: (id) => {
        set((state) => ({
          trips: state.trips.filter((trip) => trip.id !== id),
        }));
      },
      
      addPlaylistToTrip: (tripId, playlist) => {
        set((state) => ({
          trips: state.trips.map((trip) => {
            if (trip.id === tripId) {
              const existingPlaylist = trip.playlists.find(p => p.id === playlist.id);
              if (existingPlaylist) {
                return trip; // Playlist already exists
              }
              
              return {
                ...trip,
                playlistCount: trip.playlistCount + 1,
                playlists: [...trip.playlists, playlist],
              };
            }
            return trip;
          }),
        }));
      },
      
      removePlaylistFromTrip: (tripId, playlistId) => {
        set((state) => ({
          trips: state.trips.map((trip) => {
            if (trip.id === tripId) {
              return {
                ...trip,
                playlistCount: Math.max(0, trip.playlistCount - 1),
                playlists: trip.playlists.filter((p) => p.id !== playlistId),
              };
            }
            return trip;
          }),
        }));
      },
      
      getTripById: (id) => {
        return get().trips.find((trip) => trip.id === id);
      },
      
      updateTripDescription: (tripId, description) => {
        set((state) => ({
          trips: state.trips.map((trip) => {
            if (trip.id === tripId) {
              return {
                ...trip,
                description,
              };
            }
            return trip;
          }),
        }));
      },

      // New function to get all playlist IDs for a trip
      getPlaylistIdsForTrip: (tripId) => {
        const trip = get().trips.find((trip) => trip.id === tripId);
        if (!trip) return [];
        return trip.playlists.map(playlist => playlist.id);
      },
    }),
    {
      name: "spotify-travel-trips",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);