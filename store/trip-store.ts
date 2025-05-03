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
  playlists: string[]; // Changed to array of playlist IDs
  createdAt: number;
  countryCode?: string;
  name?: string; // Optional trip name
}

interface TripState {
  trips: Trip[];
  addTrip: (trip: Omit<Trip, "id" | "playlists" | "createdAt">) => string;
  removeTrip: (id: string) => void;
  addPlaylistToTrip: (tripId: string, playlistId: string) => void; // Updated to accept only playlistId
  removePlaylistFromTrip: (tripId: string, playlistId: string) => void;
  getTripById: (id: string) => Trip | undefined;
  updateTripDescription: (tripId: string, description: string) => void;
  // Removed getPlaylistIdsForTrip as it's redundant with playlists being IDs
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
      
      addPlaylistToTrip: (tripId, playlistId) => {
        set((state) => ({
          trips: state.trips.map((trip) => {
            if (trip.id === tripId) {
              if (trip.playlists.includes(playlistId)) {
                return trip; // Playlist ID already exists
              }
              return {
                ...trip,
                playlists: [...trip.playlists, playlistId],
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
                playlists: trip.playlists.filter((id) => id !== playlistId),
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
    }),
    {
      name: "spotify-travel-trips",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);