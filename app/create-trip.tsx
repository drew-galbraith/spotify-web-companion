import { useState, useEffect } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Colors from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useOpenAI } from "../hooks/use-openai";
import DateTimePicker from "@react-native-community/datetimepicker";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../context/auth-context";

export default function CreateTripScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { generateTripDescription, isLoading: isGeneratingDescription } = useOpenAI();
  
  const [destination, setDestination] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDescriptionControls, setShowDescriptionControls] = useState(false);
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDateObj, setStartDateObj] = useState<Date | null>(null);
  const [endDateObj, setEndDateObj] = useState<Date | null>(null);
  
  // Location suggestions
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [tripName, setTripName] = useState("");

  const handleClose = () => {
    if (destination || location || startDate || endDate || description || image) {
      Alert.alert(
        "Discard Changes",
        "Are you sure you want to discard your trip?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  const handlePickImage = async () => {
    // No permissions request is necessary for launching the image library
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsSearchingLocation(true);
    setShowSuggestions(true);
    
    try {
      // Use a location API to get suggestions
      try {
        // This is a simple example using a free geocoding API
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // Format the results to simple City, Country format
          const apiSuggestions = data.map((item: any) => {
            // Extract city and country
            const parts = item.display_name.split(',');
            const city = parts[0].trim();
            const country = parts[parts.length - 1].trim();
            
            return {
              name: `${city}, ${country}`,
              city: city,
              country: country,
              lat: item.lat,
              lon: item.lon,
              // Try to extract country code from the result
              countryCode: item.address?.country_code?.toUpperCase() || null,
              source: "nominatim"
            };
          });
          
          setLocationSuggestions(apiSuggestions);
        } else {
          // Fallback to static list if API fails
          const popularDestinations = [
            "Paris, France",
            "London, United Kingdom",
            "New York, USA",
            "Tokyo, Japan",
            "Rome, Italy",
            "Barcelona, Spain",
            "Amsterdam, Netherlands",
            "Berlin, Germany",
            "Sydney, Australia",
            "Dubai, UAE"
          ];
          
          // Filter destinations that match the query
          const filteredDestinations = popularDestinations.filter(
            dest => dest.toLowerCase().includes(query.toLowerCase())
          );
          
          setLocationSuggestions(filteredDestinations.map(dest => ({
            name: dest,
            city: dest.split(',')[0].trim(),
            country: dest.split(',').length > 1 ? dest.split(',')[1].trim() : "",
            source: "static"
          })));
        }
      } catch (error) {
        console.error("Error fetching location suggestions:", error);
        // Fallback to static list
        const popularDestinations = [
          "Paris, France",
          "London, United Kingdom",
          "New York, USA",
          "Tokyo, Japan",
          "Rome, Italy",
          "Barcelona, Spain",
          "Amsterdam, Netherlands",
          "Berlin, Germany",
          "Sydney, Australia",
          "Dubai, UAE"
        ];
        
        // Filter destinations that match the query
        const filteredDestinations = popularDestinations.filter(
          dest => dest.toLowerCase().includes(query.toLowerCase())
        );
        
        setLocationSuggestions(filteredDestinations.map(dest => ({
          name: dest,
          city: dest.split(',')[0].trim(),
          country: dest.split(',').length > 1 ? dest.split(',')[1].trim() : "",
          source: "static"
        })));
      }
    } catch (error) {
      console.error("Error searching locations:", error);
      setLocationSuggestions([]);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleDestinationChange = (text: string) => {
    setDestination(text);
    searchLocations(text);
  };

  const selectLocation = async (suggestion: any) => {
    setDestination(suggestion.name);
    setLocation(suggestion.name);
    setShowSuggestions(false);
    
    // If we have a country code in the suggestion, use it
    if (suggestion.countryCode) {
      setCountryCode(suggestion.countryCode);
    } else {
      // Try to get country code from country name
      try {
        const country = suggestion.country || suggestion.name.split(',').pop()?.trim();
        if (country) {
          const response = await fetch(
            `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fields=cca2`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              setCountryCode(data[0].cca2);
              console.log("Found country code:", data[0].cca2, "for", country);
            }
          }
        }
      } catch (err) {
        console.log("Error getting country code:", err);
      }
    }
    
    // Try to get a destination image if none is selected
    if (!image) {
      try {
        // Use a predefined list of travel images
        const travelImages = [
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dHJhdmVsfGVufDB8fDB8fHww",
          "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8dHJhdmVsfGVufDB8fDB8fHww",
          "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fHRyYXZlbHxlbnwwfHwwfHx8MA%3D%3D",
          "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fHRyYXZlbHxlbnwwfHwwfHx8MA%3D%3D"
        ];
        
        // Select a random image from the list
        const randomImage = travelImages[Math.floor(Math.random() * travelImages.length)];
        setImage(randomImage);
      } catch (err) {
        console.log("Error getting destination image:", err);
      }
    }
  };

  // Format date as MMM DD, YYYY (e.g., Jan 15, 2023)
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Format date range for storage (e.g., "Jan 15, 2023 - Jan 20, 2023")
  const formatDateRange = (start: Date, end: Date): string => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  // Handle date picker changes
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDateObj(selectedDate);
      setStartDate(formatDate(selectedDate));
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDateObj(selectedDate);
      setEndDate(formatDate(selectedDate));
    }
  };

  // Generate description when we have enough information
  useEffect(() => {
    const hasRequiredFields = (tripName || destination) && startDate && endDate;
    const canGenerateDescription = hasRequiredFields && !isGeneratingDescription;
    
    if (canGenerateDescription && !generatedDescription && !description) {
      handleGenerateDescription();
    }
  }, [tripName, destination, startDate, endDate]);

  const handleGenerateDescription = async () => {
    if (!(tripName || destination) || !startDate || !endDate) {
      Alert.alert("Missing Information", "Please enter trip name/destination and dates to generate a description");
      return;
    }

    try {
      const generated = await generateTripDescription(
        tripName,
        destination,
        startDate,
        endDate
      );
      
      setGeneratedDescription(generated);
      setDescription(generated);
      setShowDescriptionControls(true);
    } catch (error) {
      console.error("Error generating description:", error);
      Alert.alert("Error", "Failed to generate description. Please try again or enter one manually.");
    }
  };

  const handleEditDescription = () => {
    setIsEditingDescription(true);
  };

  const handleConfirmDescription = () => {
    setIsEditingDescription(false);
    setGeneratedDescription(description);
  };

  const validateForm = () => {
    if (!destination.trim() && !tripName.trim()) {
      Alert.alert("Missing Information", "Please enter a trip name or destination");
      return false;
    }
    
    if (!startDate.trim()) {
      Alert.alert("Missing Information", "Please enter a start date");
      return false;
    }
    
    if (!endDate.trim()) {
      Alert.alert("Missing Information", "Please enter an end date");
      return false;
    }
    
    if (!image) {
      Alert.alert("Missing Image", "Please select a cover image for your trip");
      return false;
    }
    
    return true;
  };

  const handleCreateTrip = async () => {
    if (!validateForm() || isSubmitting || !user?.id) return;
    
    setIsSubmitting(true);
    
    try {
      // Format dates for display
      let dates = startDate && endDate ? `${startDate} - ${endDate}` : "";
      
      // If we have date objects, use them to format a proper date range
      if (startDateObj && endDateObj) {
        dates = formatDateRange(startDateObj, endDateObj);
      }
      
      // Use a default image if none selected (shouldn't happen due to validation)
      const imageUrl = image || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dHJhdmVsfGVufDB8fDB8fHww";
      
      // Use trip name if provided, otherwise use destination
      const finalTripName = tripName.trim() || `Trip to ${destination.split(',')[0]}`;
      
      // Create trip object
      const tripData = {
        destination,
        location: location || destination, // Use destination as fallback
        dates,
        description: description || `Trip to ${destination}`, // Use default description if empty
        imageUrl,
        countryCode: countryCode || undefined,
        name: finalTripName,
        userId: user.id, // Add user ID for Firebase queries
        playlists: [], // Initialize with empty playlists array
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add trip to Firebase
      const docRef = await addDoc(collection(db, "trips"), tripData);
      
      // Navigate to the trip screen
      router.replace(`/trip/${docRef.id}`);
    } catch (error) {
      console.error("Error creating trip:", error);
      Alert.alert("Error", "Failed to create trip. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render iOS date picker in a modal to prevent overlay issues
  const renderIOSDatePicker = (
    isStartDate: boolean,
    visible: boolean,
    onClose: () => void
  ) => {
    if (Platform.OS !== 'ios' || !visible) return null;
    
    const currentDate = isStartDate ? (startDateObj || new Date()) : (endDateObj || new Date());
    const minimumDate = isStartDate ? undefined : startDateObj || undefined;
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.modalContent}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>
                {isStartDate ? "Start Date" : "End Date"}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  if (isStartDate) {
                    onStartDateChange(null, currentDate);
                  } else {
                    onEndDateChange(null, currentDate);
                  }
                  onClose();
                }}
              >
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={currentDate}
              mode="date"
              display="spinner"
              onChange={isStartDate ? onStartDateChange : onEndDateChange}
              minimumDate={minimumDate}
              style={styles.datePickerIOS}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Trip</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.imageContainer} onPress={handlePickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.tripImage} contentFit="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={40} color={Colors.textSecondary} />
                <Text style={styles.imagePlaceholderText}>Add Cover Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Trip Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Give your trip a name (optional)"
                  placeholderTextColor={Colors.textSecondary}
                  value={tripName}
                  onChangeText={setTripName}
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Destination</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Where are you going?"
                  placeholderTextColor={Colors.textSecondary}
                  value={destination}
                  onChangeText={handleDestinationChange}
                  onFocus={() => setShowSuggestions(true)}
                />
                {isSearchingLocation && (
                  <ActivityIndicator size="small" color={Colors.primary} style={styles.searchIndicator} />
                )}
              </View>
              
              {showSuggestions && locationSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {locationSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectLocation(suggestion)}
                    >
                      <Ionicons name="location-outline" size={16} color={Colors.textSecondary} style={styles.suggestionIcon} />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionText}>{suggestion.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.dateContainer}>
              <View style={[styles.inputGroup, styles.dateInput]}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TouchableOpacity 
                  style={styles.inputWrapper}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.input, !startDate && styles.placeholderText]}>
                    {startDate || "Select date"}
                  </Text>
                </TouchableOpacity>
                {Platform.OS === 'android' && showStartDatePicker && (
                  <DateTimePicker
                    value={startDateObj || new Date()}
                    mode="date"
                    display="default"
                    onChange={onStartDateChange}
                  />
                )}
              </View>

              <View style={[styles.inputGroup, styles.dateInput]}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TouchableOpacity 
                  style={styles.inputWrapper}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.input, !endDate && styles.placeholderText]}>
                    {endDate || "Select date"}
                  </Text>
                </TouchableOpacity>
                {Platform.OS === 'android' && showEndDatePicker && (
                  <DateTimePicker
                    value={endDateObj || new Date()}
                    mode="date"
                    display="default"
                    onChange={onEndDateChange}
                    minimumDate={startDateObj || undefined}
                  />
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.descriptionHeader}>
                <Text style={styles.inputLabel}>Description</Text>
                {showDescriptionControls && (
                  <View style={styles.descriptionControls}>
                    {isEditingDescription ? (
                      <TouchableOpacity 
                        style={styles.descriptionControl} 
                        onPress={handleConfirmDescription}
                      >
                        <Ionicons name="checkmark-outline" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={styles.descriptionControl} 
                        onPress={handleEditDescription}
                      >
                        <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.descriptionControl} 
                      onPress={handleGenerateDescription}
                      disabled={isGeneratingDescription || !(tripName || destination) || !startDate || !endDate}
                    >
                      <Ionicons name="refresh-outline" size={18} color={
                        isGeneratingDescription || !(tripName || destination) || !startDate || !endDate 
                          ? Colors.divider 
                          : Colors.textSecondary
                      } />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              {isGeneratingDescription ? (
                <View style={styles.generatingContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.generatingText}>Generating description...</Text>
                </View>
              ) : (
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={
                      (tripName || destination) && startDate && endDate
                        ? "Tell us about your trip..."
                        : "Fill in trip details above to generate a description"
                    }
                    placeholderTextColor={Colors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={Platform.OS === 'ios' ? 0 : 4}
                    textAlignVertical="top"
                    editable={!isGeneratingDescription && (isEditingDescription || !generatedDescription)}
                  />
                </View>
              )}
              
              {generatedDescription && !isEditingDescription && (
                <Text style={styles.aiGeneratedLabel}>AI-generated description</Text>
              )}
            </View>

            <TouchableOpacity 
              style={[
                styles.createButton, 
                (isSubmitting || (!destination && !tripName) || !startDate || !endDate || !image) && styles.disabledButton
              ]} 
              onPress={handleCreateTrip}
              disabled={isSubmitting || (!destination && !tripName) || !startDate || !endDate || !image}
            >
              <Text style={styles.createButtonText}>
                {isSubmitting ? "Creating..." : "Create Trip"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* iOS Date Pickers in Modal */}
      {renderIOSDatePicker(
        true, 
        showStartDatePicker, 
        () => setShowStartDatePicker(false)
      )}
      
      {renderIOSDatePicker(
        false, 
        showEndDatePicker, 
        () => setShowEndDatePicker(false)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    height: 200,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  tripImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
    position: "relative",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    color: Colors.text,
    fontSize: 16,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  searchIndicator: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: "absolute",
    top: 80, // Below the input
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  suggestionIcon: {
    marginRight: 8,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.text,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateInput: {
    width: "48%",
  },
  datePicker: {
    width: "100%",
  },
  datePickerIOS: {
    width: "100%",
    height: 200,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  pickerCancel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  pickerDone: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: "600",
  },
  descriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  descriptionControls: {
    flexDirection: "row",
    padding: 4,
  },
  descriptionControl: {
    marginLeft: 12,
    padding: 4,
  },
  textAreaWrapper: {
    paddingVertical: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  generatingContainer: {
    height: 100,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  generatingText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  aiGeneratedLabel: {
    fontSize: 12,
    color: Colors.accent,
    marginTop: 4,
    fontStyle: "italic",
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: Colors.secondary,
    opacity: 0.7,
  },
  createButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "bold",
  },
});