import { useState, useEffect } from "react";
import { useSafeAuth } from "../context/auth-context";
import { useTripStore, type Trip } from "../store/trip-store";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

export function useTrips() {
  const { user } = useSafeAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setTrips([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Query trips for the current user using their Spotify ID
        const tripsQuery = query(
          collection(db, "trips"),
          where("userId", "==", user.id)
        );

        // Set up real-time listener
        const unsubscribe = onSnapshot(tripsQuery, (querySnapshot) => {
          const fetchedTrips: Trip[] = [];
          querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            const tripData = doc.data();
            fetchedTrips.push({
              id: doc.id,
              // Ensure all required Trip properties are included
              name: tripData.name,
              destination: tripData.destination || '',
              location: tripData.location || '',
              dates: tripData.dates || '',
              imageUrl: tripData.imageUrl || '',
              playlists: tripData.playlists,
              ...tripData
            } as Trip);
          });
          
          // Update local state instead of the store
          setTrips(fetchedTrips);
          setIsLoading(false);
        }, (err) => {
          setError(err instanceof Error ? err : new Error("Failed to fetch trips"));
          console.error("Trips fetch error:", err);
          setIsLoading(false);
        });

        // Cleanup function to unsubscribe from the listener
        return () => unsubscribe();
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch trips"));
        console.error("Trips fetch error:", err);
        setIsLoading(false);
      }
    };

    const cleanup = loadData();
    
    // Clean up the subscription when the effect is cleaned up
    return () => {
      if (cleanup) {
        cleanup.then(unsubscribe => unsubscribe?.());
      }
    };
  }, [user?.id]);

  return { data: trips, isLoading, error };
}