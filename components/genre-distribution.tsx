import { StyleSheet, View, Text } from "react-native";
import Colors from "../constants/colors";

interface GenreDistributionProps {
  data: Array<{ name: string; count: number }>;
}

export default function GenreDistribution({ data }: GenreDistributionProps) {
  // Add null check for data
  const genreData = data || [];
  
  // If no data, show a message
  if (genreData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No genre data available</Text>
      </View>
    );
  }
  
  // Calculate total count for percentage
  const totalCount = genreData.reduce((sum, genre) => sum + genre.count, 0);
  
  // Take top 5 genres for display
  const topGenres = genreData.slice(0, 5);
  
  return (
    <View style={styles.container}>
      {topGenres.map((genre, index) => {
        const percentage = Math.round((genre.count / totalCount) * 100);
        return (
          <View key={index} style={styles.genreItem}>
            <View style={styles.genreInfo}>
              <Text style={styles.genreName}>{genre.name}</Text>
              <Text style={styles.genrePercentage}>{percentage}%</Text>
            </View>
            <View style={styles.barContainer}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    width: `${percentage}%`,
                    backgroundColor: getBarColor(index)
                  }
                ]} 
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Function to get different colors for bars
function getBarColor(index: number): string {
  const colors = [
    Colors.primary,
    "#4A90E2", // Blue
    "#50E3C2", // Teal
    "#F5A623", // Orange
    "#D0021B", // Red
  ];
  
  return colors[index % colors.length];
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  genreItem: {
    marginBottom: 12,
  },
  genreInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  genreName: {
    fontSize: 14,
    color: Colors.text,
    textTransform: "capitalize",
  },
  genrePercentage: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  barContainer: {
    height: 8,
    backgroundColor: Colors.divider,
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
  },
  emptyContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});