import { StyleSheet, Text, View } from "react-native";
import Colors from "../constants/colors";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
}

export default function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(139, 92, 246, 0.1)", // Purple with opacity
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  value: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});