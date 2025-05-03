import { useState } from "react";

export function useOpenAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Generate a trip description based on name, location, and dates
  const generateTripDescription = async (
    tripName: string,
    destination: string,
    startDate: string,
    endDate: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const location = destination || tripName;
      
      // Prepare the prompt for the AI
      const messages = [
        {
          role: "system",
          content: "You are a helpful travel assistant that creates personalized trip descriptions."
        },
        {
          role: "user",
          content: `Create an exciting and personalized trip description for my trip ${tripName ? `called "${tripName}"` : ""} to ${location} from ${startDate} to ${endDate}. Keep it under 150 words, enthusiastic, and mention some highlights of the destination. Don't include any placeholder text or variables.`
        }
      ];

      // Make the request to the AI
      const response = await fetch("https://toolkit.rork.com/text/llm/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ messages })
      });

      if (!response.ok) {
        throw new Error("Failed to generate trip description");
      }

      const data = await response.json();
      return data.completion.trim();
    } catch (error) {
      console.error("Error generating trip description:", error);
      setError(error instanceof Error ? error : new Error("Failed to generate trip description"));
      // Return a default description as fallback
      return `Exciting trip to ${destination} from ${startDate} to ${endDate}. Looking forward to exploring this amazing destination!`;
    } finally {
      setIsLoading(false);
    }
  };

  // Generate playlist recommendations based on trip details
  const generatePlaylistRecommendations = async (
    tripName: string,
    destination: string,
    description: string,
    countryCode?: string
  ): Promise<string[]> => {
    setIsLoading(true);
    setError(null);

    try {
      // Extract location parts for better context
      const locationParts = destination.split(',');
      const city = locationParts[0].trim();
      const country = locationParts.length > 1 ? locationParts[locationParts.length - 1].trim() : city;
      
      // Prepare the prompt for the AI with more specific instructions
      const messages = [
        {
          role: "system",
          content: "You are a music expert with deep knowledge of local music scenes around the world. Focus on authentic local music that represents the musical culture of the location, not just globally popular songs."
        },
        {
          role: "user",
          content: `I'm going on a trip to ${destination}${tripName ? ` called "${tripName}"` : ""}. Trip description: "${description}". 
          
          Recommend 10 songs that would be perfect for this trip. Include a diverse mix of:
          1. Songs by local artists from ${city} or ${country}
          2. Traditional or folk music from the region
          3. Contemporary songs that mention or are about ${destination}
          4. Songs that match the mood of the trip
          
          Return ONLY a JSON array of song names with artists, like this: [{"name": "Song Name", "artist": "Artist Name"}, ...]. No explanations or other text.`
        }
      ];

      // Make the request to the AI with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch("https://toolkit.rork.com/text/llm/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ messages }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error("Failed to generate playlist recommendations");
        }

        const data = await response.json();
        
        try {
          // Try to parse the JSON response
          const parsedResponse = JSON.parse(data.completion);
          if (Array.isArray(parsedResponse)) {
            // Extract song names for searching on Spotify
            return parsedResponse.map(item => 
              typeof item === 'object' && item.name && item.artist 
                ? `${item.name} ${item.artist}`
                : item.toString()
            );
          }
        } catch (e) {
          // If parsing fails, try to extract the array from the text
          const match = data.completion.match(/\[[\s\S]*\]/);
          if (match) {
            try {
              const parsedArray = JSON.parse(match[0]);
              return parsedArray.map((item: any) => 
                typeof item === 'object' && item.name && item.artist 
                  ? `${item.name} ${item.artist}`
                  : item.toString()
              );
            } catch (e2) {
              console.error("Failed to parse AI response:", e2);
            }
          }
          
          // If still no valid JSON, try to extract song names from the text
          const songMatches = data.completion.match(/["']([^"']+)["']/g);
          if (songMatches && songMatches.length > 0) {
            return songMatches.map((match: string) => match.replace(/["']/g, ''));
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error in AI request:", error);
      }
      
      // If all else fails, return an empty array
      return [];
    } catch (error) {
      console.error("Error generating playlist recommendations:", error);
      setError(error instanceof Error ? error : new Error("Failed to generate playlist recommendations"));
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Generate local artists for a location
  const generateLocalArtists = async (
    location: string,
    countryCode?: string | null,
    limit: number = 5
  ): Promise<any[]> => {
    setIsLoading(true);
    setError(null);

    try {
      // Extract location parts for better context
      const locationParts = location.split(',');
      const city = locationParts[0].trim();
      const country = locationParts.length > 1 ? locationParts[locationParts.length - 1].trim() : city;
      
      // Prepare the prompt for the AI with more specific instructions
      const messages = [
        {
          role: "system",
          content: "You are a music expert with deep knowledge of local music scenes around the world. Focus on authentic local artists that represent the musical culture of the location, not just globally popular artists who happen to be from there."
        },
        {
          role: "user",
          content: `List ${limit} musicians/bands from ${location} that represent the local music scene well. Include a diverse mix of:
          - Traditional/folk artists from the region
          - Contemporary local artists with cultural significance
          - Underground/indie artists with local following
          - Mainstream artists that are especially popular locally
          
          For each artist, include:
          1. Their name
          2. A brief description (1-2 sentences)
          3. How famous they are (local, national, or international)
          
          Return ONLY a JSON array with this structure: [{"name": "Artist Name", "description": "Brief description", "famousLevel": "local/national/international"}, ...]. No explanations or other text.`
        }
      ];

      // Make the request to the AI with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch("https://toolkit.rork.com/text/llm/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ messages }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error("Failed to generate local artists");
        }

        const data = await response.json();
        
        try {
          // Try to parse the JSON response
          const parsedResponse = JSON.parse(data.completion);
          if (Array.isArray(parsedResponse)) {
            return parsedResponse;
          }
        } catch (e) {
          // If parsing fails, try to extract the array from the text
          const match = data.completion.match(/\[[\s\S]*\]/);
          if (match) {
            try {
              return JSON.parse(match[0]);
            } catch (e2) {
              console.error("Failed to parse AI response:", e2);
            }
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error in AI request:", error);
      }
      
      // If all else fails, return an empty array
      return [];
    } catch (error) {
      console.error("Error generating local artists:", error);
      setError(error instanceof Error ? error : new Error("Failed to generate local artists"));
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateTripDescription,
    generatePlaylistRecommendations,
    generateLocalArtists,
    isLoading,
    error
  };
}