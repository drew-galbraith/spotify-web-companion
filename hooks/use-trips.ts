import { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { useTripStore } from "../store/trip-store";

export function useTrips() {
  const { token } = useAuth();
  const trips = useTripStore((state) => state.trips);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Data is already loaded from persistent storage via zustand
        // Just simulate a small loading delay for UX
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch trips"));
        console.error("Trips fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token]);

  return { data: trips, isLoading, error };
}