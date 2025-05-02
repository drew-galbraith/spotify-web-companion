import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import Colors from "../constants/colors";

interface FeaturedSectionProps {
  title: string;
  data: any[];
  onItemPress: (id: string) => void;
  isTrack?: boolean;
}

export default function FeaturedSection({ title, data, onItemPress, isTrack = false }: FeaturedSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.itemsContainer}
      >
        {data.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.item}
            onPress={() => onItemPress(item.id)}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: item.imageUrl }} 
              style={[styles.itemImage, isTrack && styles.trackImage]} 
              contentFit="cover"
            />
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {isTrack ? item.artists.join(", ") : item.description || item.owner || item.artist}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  itemsContainer: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  item: {
    width: 150,
    marginRight: 12,
  },
  itemImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  trackImage: {
    borderRadius: 75,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});