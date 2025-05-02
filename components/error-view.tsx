import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import Colors from "../constants/colors";
import { AlertTriangle, RefreshCw } from "lucide-react-native";

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorView({ message = "Something went wrong", onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <AlertTriangle size={48} color={Colors.error} style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
      
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <RefreshCw size={16} color={Colors.text} style={styles.retryIcon} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    padding: 20,
  },
  icon: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
});