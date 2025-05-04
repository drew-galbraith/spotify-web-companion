import { useState, useEffect, useRef } from "react";
import { useSafeAuth } from "../context/auth-context";
import { mockTravelPlaylists } from "../mocks/travel-data";
import { getAuth } from 'firebase/auth';

export function useTravelPlaylists() {
  const { user } = useSafeAuth(); // Changed from token to user
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use a ref to track if this is the initial load
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      // Only fetch data on initial mount
      if (!isInitialLoadRef.current) {
        return;
      }
      
      isInitialLoadRef.current = false;
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real app, we would fetch from an API
        // For demo purposes, we'll use mock data
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setData(mockTravelPlaylists);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch playlists"));
        console.error("Playlists fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]); // Changed dependency from token to user

  return { data, isLoading, error };
}