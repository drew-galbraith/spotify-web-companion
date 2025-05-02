// Mock data for travel-related features

// Trips
export const mockTrips = [
  {
    id: "trip1",
    destination: "Paris, France",
    location: "Paris, France",
    dates: "May 15 - May 22, 2023",
    description: "Exploring the City of Light, visiting the Eiffel Tower, Louvre Museum, and enjoying French cuisine.",
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cGFyaXN8ZW58MHx8MHx8fDA%3D",
    playlistCount: 2,
    playlists: [
      {
        id: "playlist1",
        name: "Paris Café Vibes",
        imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fHBhcmlzJTIwY2FmZXxlbnwwfHwwfHx8MA%3D%3D",
        trackCount: 8,
      },
      {
        id: "playlist2",
        name: "French Classics",
        imageUrl: "https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8ZnJlbmNoJTIwbXVzaWN8ZW58MHx8MHx8fDA%3D",
        trackCount: 5,
      },
    ],
    popularGenres: ["French Pop", "Jazz", "Electronic", "Classical", "Chanson"],
    localArtists: [
      {
        name: "Daft Punk",
        imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bXVzaWN8ZW58MHx8MHx8fDA%3D",
      },
      {
        name: "Christine and the Queens",
        imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bXVzaWMlMjBhcnRpc3R8ZW58MHx8MHx8fDA%3D",
      },
      {
        name: "Air",
        imageUrl: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bXVzaWMlMjBhcnRpc3R8ZW58MHx8MHx8fDA%3D",
      },
    ],
  },
  {
    id: "trip2",
    destination: "Tokyo, Japan",
    location: "Tokyo, Japan",
    dates: "October 5 - October 15, 2023",
    description: "Immersing in Japanese culture, visiting temples, exploring Shibuya and Shinjuku, and trying authentic sushi.",
    imageUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8dG9reW98ZW58MHx8MHx8fDA%3D",
    playlistCount: 2,
    playlists: [
      {
        id: "playlist3",
        name: "Tokyo Nights",
        imageUrl: "https://images.unsplash.com/photo-1554797589-7241bb691973?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dG9reW8lMjBuaWdodHxlbnwwfHwwfHx8MA%3D%3D",
        trackCount: 10,
      },
      {
        id: "playlist4",
        name: "J-Pop Essentials",
        imageUrl: "https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8amFwYW5lc2UlMjBtdXNpY3xlbnwwfHwwfHx8MA%3D%3D",
        trackCount: 7,
      },
    ],
    popularGenres: ["J-Pop", "City Pop", "Electronic", "Rock", "Traditional"],
    localArtists: [
      {
        name: "BABYMETAL",
        imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cmFwfGVufDB8fDB8fHww",
      },
      {
        name: "Perfume",
        imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cmFwfGVufDB8fDB8fHww",
      },
      {
        name: "ONE OK ROCK",
        imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cmFwfGVufDB8fDB8fHww",
      },
    ],
  },
  {
    id: "trip3",
    destination: "New York City, USA",
    location: "New York, NY, USA",
    dates: "December 10 - December 17, 2023",
    description: "Experiencing the Big Apple during the holiday season, seeing Broadway shows, and exploring iconic landmarks.",
    imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bmV3JTIweW9ya3xlbnwwfHwwfHx8MA%3D%3D",
    playlistCount: 1,
    playlists: [
      {
        id: "playlist5",
        name: "NYC Winter",
        imageUrl: "https://images.unsplash.com/photo-1545348425-6ce0b5bdf2df?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fG5ldyUyMHlvcmslMjB3aW50ZXJ8ZW58MHx8MHx8fDA%3D",
        trackCount: 6,
      },
    ],
    popularGenres: ["Hip Hop", "Jazz", "R&B", "Broadway", "Indie"],
    localArtists: [
      {
        name: "Jay-Z",
        imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cmFwfGVufDB8fDB8fHww",
      },
      {
        name: "The Strokes",
        imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cmFwfGVufDB8fDB8fHww",
      },
      {
        name: "LCD Soundsystem",
        imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cmFwfGVufDB8fDB8fHww",
      },
    ],
  },
];

// Travel Playlists
export const mockTravelPlaylists = [
  {
    id: "playlist1",
    name: "Paris Café Vibes",
    destination: "Paris, France",
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fHBhcmlzJTIwY2FmZXxlbnwwfHwwfHx8MA%3D%3D",
    trackCount: 8,
    description: "Relaxing tunes for sipping coffee at a Parisian café",
    dominantColor: "#7D6E83",
  },
  {
    id: "playlist2",
    name: "French Classics",
    destination: "Paris, France",
    imageUrl: "https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8ZnJlbmNoJTIwbXVzaWN8ZW58MHx8MHx8fDA%3D",
    trackCount: 5,
    description: "Classic French songs to enhance your Parisian experience",
    dominantColor: "#A27B5C",
  },
  {
    id: "playlist3",
    name: "Tokyo Nights",
    destination: "Tokyo, Japan",
    imageUrl: "https://images.unsplash.com/photo-1554797589-7241bb691973?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dG9reW8lMjBuaWdodHxlbnwwfHwwfHx8MA%3D%3D",
    trackCount: 10,
    description: "Electronic and city pop for exploring Tokyo after dark",
    dominantColor: "#3F72AF",
  },
  {
    id: "playlist4",
    name: "J-Pop Essentials",
    destination: "Tokyo, Japan",
    imageUrl: "https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8amFwYW5lc2UlMjBtdXNpY3xlbnwwfHwwfHx8MA%3D%3D",
    trackCount: 7,
    description: "Essential J-Pop tracks to get you in the Tokyo mood",
    dominantColor: "#E84545",
  },
  {
    id: "playlist5",
    name: "NYC Winter",
    destination: "New York City, USA",
    imageUrl: "https://images.unsplash.com/photo-1545348425-6ce0b5bdf2df?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fG5ldyUyMHlvcmslMjB3aW50ZXJ8ZW58MHx8MHx8fDA%3D",
    trackCount: 6,
    description: "The perfect soundtrack for a winter trip to NYC",
    dominantColor: "#2C3E50",
  },
];