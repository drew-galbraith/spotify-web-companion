import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import Colors from "../constants/colors";

interface TopItemsListProps {
  title: string;
  items: any[] | undefined;
  type: "artist" | "track";
}

export default function TopItemsList({ title, items, type }: TopItemsListProps) {
  // Add null check for items
  const itemsToRender = items || [];
  
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      
      {itemsToRender.length > 0 ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.itemsContainer}
        >
          {itemsToRender.map((item, index) => (
            <View key={item?.id || index} style={styles.item}>
              <View style={styles.rankContainer}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <Image 
                source={{ uri: item?.imageUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww' }} 
                style={[styles.itemImage, type === "artist" && styles.artistImage]} 
                contentFit="cover"
              />
              <Text style={styles.itemName} numberOfLines={1}>{item?.name || 'Unknown'}</Text>
              {type === "track" && (
                <Text style={styles.itemSubtitle} numberOfLines={1}>
                  {item?.artist || 'Unknown Artist'}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No {type}s available</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginVertical: 16,
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
  itemsContainer: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  item: {
    width: 120,
    marginRight: 16,
    position: "relative",
  },
  rankContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  rankText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "bold",
  },
  itemImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  artistImage: {
    borderRadius: 60,
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
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});