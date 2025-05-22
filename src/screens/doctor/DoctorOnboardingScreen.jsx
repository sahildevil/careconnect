import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';
import {doctorService} from '../../services/api';
import {CustomTextField, CustomButton, CustomPicker} from '../../components';
import {WebView} from 'react-native-webview';

const DaysOfWeekPicker = ({selectedDays, onDayToggle}) => {
  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  return (
    <View style={styles.daysContainer}>
      {daysOfWeek.map(day => (
        <CustomButton
          key={day}
          title={day.substring(0, 3)}
          onPress={() => onDayToggle(day)}
          style={[
            styles.dayButton,
            selectedDays.includes(day) ? styles.selectedDayButton : null,
          ]}
          textStyle={[
            styles.dayButtonText,
            selectedDays.includes(day) ? styles.selectedDayButtonText : null,
          ]}
        />
      ))}
    </View>
  );
};

const LocationMapSearch = ({onLocationSelect, onCancel}) => {
  const apiKey = 'AlzaSyqZs_bjOOJpN6SgvYMQcE_1ODyr21cj31E'; // Replace with your actual API key

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body, html { 
          margin: 0; 
          padding: 0; 
          height: 100%; 
          width: 100%; 
          font-family: Arial, sans-serif; 
          overflow-y: auto;
        }
        .container { 
          padding: 20px; 
          background: #fff; 
          display: flex; 
          flex-direction: column;
          min-height: 100%;
        }
        input { 
          width: 100%; 
          padding: 12px; 
          box-sizing: border-box; 
          margin-bottom: 10px; 
          border: 1px solid #ddd; 
          border-radius: 5px; 
          font-size: 16px; 
        }
        button { 
          background: #0CB69B; 
          color: white; 
          border: none; 
          padding: 12px; 
          width: 100%; 
          border-radius: 5px; 
          margin-top: 10px; 
          font-size: 16px; 
          cursor: pointer; 
        }
        .search-button {
          margin-bottom: 10px;
        }
        .selected-location { 
          margin-top: 15px; 
          padding: 12px; 
          background: #f9f9f9; 
          border-radius: 5px; 
          font-size: 14px; 
        }
        #status-message { 
          color: #666; 
          margin: 5px 0; 
          font-style: italic; 
        }
        #autocomplete-results { 
          background: #fff; 
          border: 1px solid #ddd; 
          border-radius: 5px; 
          max-height: 200px; 
          overflow-y: auto;
          width: 100%;
          z-index: 1000; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          margin-bottom: 15px;
        }
        .autocomplete-item { 
          padding: 12px; 
          cursor: pointer; 
          border-bottom: 1px solid #eee; 
        }
        .autocomplete-item:hover, .autocomplete-item:active { 
          background-color: #f5f5f5; 
        }
        .main-text { 
          font-weight: bold; 
        }
        .secondary-text { 
          color: #666; 
          font-size: 12px; 
        }
        .location-details {
          margin: 15px 0;
          padding: 15px;
          background-color: #f0f9f7;
          border-radius: 5px;
          border-left: 4px solid #0CB69B;
        }
        .location-title {
          font-weight: bold;
          font-size: 16px;
          color: #333;
          margin-bottom: 5px;
        }
        .location-address {
          color: #555;
          margin-bottom: 8px;
        }
        .location-coordinates {
          color: #777;
          font-size: 13px;
          font-family: monospace;
        }
        h2 {
          margin-top: 0;
          font-size: 20px;
        }
        #confirm-btn {
          margin-top: 20px;
          margin-bottom: 20px;
          padding: 15px;
          font-weight: bold;
          font-size: 18px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Search for Your Clinic Location</h2>
        <p>Enter your clinic address or a nearby landmark to find your location.</p>
        
        <input type="text" id="search-input" placeholder="Search for your clinic location..." />
        <button type="button" onclick="searchPlace()" class="search-button">Search</button>
        <div id="status-message">Enter your clinic location and press Search</div>
        
        <div id="autocomplete-results"></div>
        
        <div id="selected-location" class="location-details" style="display: none;">
          <div class="location-title">Selected Location</div>
          <div id="location-address" class="location-address"></div>
          <div id="location-coordinates" class="location-coordinates"></div>
        </div>
        
        <button onclick="confirmLocation()" id="confirm-btn" disabled>Confirm Location</button>
      </div>

      <script>
        // Variables
        let selectedLocation = {};

        // Log errors
        window.onerror = function(message, source, lineno, colno, error) {
          document.getElementById('status-message').textContent = 'Error: ' + message;
          console.error('JS Error:', message, error);
        };
        
        // Function to fetch autocomplete suggestions using direct API call
        async function fetchAutocompleteResults(query) {
          if (!query || query.trim().length < 2) {
            document.getElementById('autocomplete-results').innerHTML = '';
            return;
          }

          document.getElementById('status-message').textContent = 'Searching...';
          
          try {
            // Using proper GoMaps Autocomplete endpoint with correct parameters
            const response = await fetch(
              \`https://maps.gomaps.pro/maps/api/place/queryautocomplete/json?input=\${encodeURIComponent(query)}&key=${apiKey}\`
            );
            
            const data = await response.json();
            
            if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
              displayAutocompleteResults(data.predictions);
            } else {
              document.getElementById('autocomplete-results').innerHTML = '<div class="autocomplete-item">No results found</div>';
              document.getElementById('status-message').textContent = 'No results found: ' + (data.status || 'Unknown error');
            }
          } catch (error) {
            console.error('Error fetching autocomplete results:', error);
            document.getElementById('status-message').textContent = 'Error fetching results: ' + error.message;
          }
        }

        // Search for a place with button click
        async function searchPlace() {
          const query = document.getElementById('search-input').value;
          if (!query || query.trim() === '') {
            alert('Please enter a location to search');
            return;
          }
          
          document.getElementById('status-message').textContent = 'Searching for place...';
          await fetchAutocompleteResults(query);
        }
        
        // Display autocomplete results
        function displayAutocompleteResults(predictions) {
          const resultsContainer = document.getElementById('autocomplete-results');
          resultsContainer.innerHTML = '';
          
          predictions.forEach(prediction => {
            const resultItem = document.createElement('div');
            resultItem.className = 'autocomplete-item';
            
            // Format the display with structured formatting if available
            if (prediction.structured_formatting) {
              resultItem.innerHTML = \`
                <div class="main-text">\${prediction.structured_formatting.main_text || ''}</div>
                <div class="secondary-text">\${prediction.structured_formatting.secondary_text || ''}</div>
              \`;
            } else {
              resultItem.textContent = prediction.description;
            }
            
            resultItem.addEventListener('click', () => {
              selectPlace(prediction.description);
              document.getElementById('search-input').value = prediction.description;
            });
            
            resultsContainer.appendChild(resultItem);
          });
          
          document.getElementById('status-message').textContent = 'Select a location from the results';
        }
        
        // Select a place and geocode it
        async function selectPlace(placeDescription) {
          document.getElementById('status-message').textContent = 'Getting location details...';
          
          try {
            // Use geocoding API to get lat/lng for the selected place
            const response = await fetch(
              \`https://maps.gomaps.pro/maps/api/geocode/json?address=\${encodeURIComponent(placeDescription)}&key=${apiKey}\`
            );
            
            const data = await response.json();
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
              const location = data.results[0].geometry.location;
              const formattedAddress = data.results[0].formatted_address;
              
              // Store the selected location
              selectedLocation = {
                latitude: location.lat,
                longitude: location.lng,
                address: formattedAddress
              };
              
              // Display the selected location
              document.getElementById('location-address').textContent = formattedAddress;
              document.getElementById('location-coordinates').textContent = \`Latitude: \${location.lat.toFixed(6)}, Longitude: \${location.lng.toFixed(6)}\`;
              document.getElementById('selected-location').style.display = 'block';
              document.getElementById('confirm-btn').disabled = false;
              
              // Make sure the Confirm button is visible by scrolling to it
              document.getElementById('confirm-btn').scrollIntoView({ behavior: 'smooth', block: 'center' });
              document.getElementById('status-message').textContent = 'Location selected, press Confirm to continue';
              
              // Clear autocomplete results
              document.getElementById('autocomplete-results').innerHTML = '';
            } else {
              document.getElementById('status-message').textContent = 'Could not find location details: ' + (data.status || 'Unknown error');
            }
          } catch (error) {
            console.error('Error geocoding location:', error);
            document.getElementById('status-message').textContent = 'Error finding location: ' + error.message;
          }
        }
        
        // Confirm location and send back to React Native
        function confirmLocation() {
          if (selectedLocation.latitude && selectedLocation.longitude) {
            // Add console log to verify data before sending
            console.log('Sending location data to React Native:', selectedLocation);
            // Post message to React Native
            window.ReactNativeWebView.postMessage(JSON.stringify(selectedLocation));
          } else {
            alert('Please select a location first');
          }
        }
        
        // Add search input event listener
        document.addEventListener('DOMContentLoaded', function() {
          const searchInput = document.getElementById('search-input');
          
          // Handle search on Enter key
          searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
              searchPlace();
            }
          });
        });
      </script>
    </body>
    </html>
  `;

  const handleMessage = event => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Location data received from WebView:', data);
      if (data && data.latitude && data.longitude && data.address) {
        onLocationSelect(data);
      } else {
        console.error('Invalid location data received:', data);
      }
    } catch (error) {
      console.error('Error parsing location data:', error);
    }
  };

  return (
    <View style={styles.mapContainer}>
      <WebView
        source={{html: htmlContent}}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={true}
        bounces={false}
        onError={error => console.error('WebView error:', error)}
      />
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const DoctorOnboardingScreen = () => {
  const {user, updateUser} = useAuth();
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Add console log for debugging
  useEffect(() => {
    console.log('Current user data in onboarding:', user);
  }, [user]);

  // Form data
  const [consultationFee, setConsultationFee] = useState('');
  const [selectedDays, setSelectedDays] = useState([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
  ]);
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('5:00 PM');
  const [locationLink, setLocationLink] = useState('');
  const [bio, setBio] = useState('');

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [address, setAddress] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [locationSelected, setLocationSelected] = useState(false);

  const timeSlots = [
    '7:00 AM',
    '8:00 AM',
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
    '5:00 PM',
    '6:00 PM',
    '7:00 PM',
    '8:00 PM',
  ];

  const handleDayToggle = day => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!consultationFee.trim()) {
        Alert.alert('Required', 'Please enter your consultation fee');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedDays.length === 0) {
        Alert.alert('Required', 'Please select at least one day');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Check if both latitude and longitude are available, not just locationSelected flag
      if (!latitude || !longitude || !address) {
        Alert.alert('Required', 'Please select your clinic location');
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      completeOnboarding();
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      setLoading(true);

      // Make sure we have the user id
      if (!user || !user.id) {
        throw new Error('User data is missing. Please log in again.');
      }

      // Make sure location is selected
      if (!latitude || !longitude) {
        throw new Error('Please select your clinic location.');
      }

      const onboardingData = {
        doctor_id: user.id,
        consultation_fee: parseFloat(consultationFee),
        available_days: selectedDays.join(','),
        available_hours: `${startTime} - ${endTime}`,
        bio: bio,
        latitude: latitude,
        longitude: longitude,
        location_link: address, // Use address as location_link
      };

      console.log('Sending onboarding data:', onboardingData);

      const response = await doctorService.completeOnboarding(onboardingData);

      if (response.success) {
        // Update local user data to reflect onboarding completion
        updateUser({
          ...user,
          profile: {
            ...user.profile,
            consultation_fee: parseFloat(consultationFee),
            available_days: selectedDays.join(','),
            available_hours: `${startTime} - ${endTime}`,
            bio: bio,
            latitude: latitude,
            longitude: longitude,
            location_link: address,
            onboarding_complete: true,
            is_visible: true,
          },
        });

        Alert.alert(
          'Onboarding Complete',
          'Your profile is now visible to patients. You can update these details anytime from your profile.',
          [
            {
              text: 'OK',
              onPress: () =>
                navigation.reset({
                  index: 0,
                  routes: [{name: 'DoctorFlow'}],
                }),
            },
          ],
        );
      } else {
        throw new Error(response.message || 'Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert(
        'Error',
        error.message || 'Something went wrong with the onboarding process',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.stepText}>Step {currentStep} of 4</Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}>
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconContainer}>
                <Icon name="cash-outline" size={50} color="#0CB69B" />
              </View>
              <Text style={styles.stepTitle}>Set Your Consultation Fee</Text>
              <Text style={styles.stepDescription}>
                Enter the fee you'd like to charge for each consultation. This
                can be updated later from your profile.
              </Text>

              <View style={styles.feeContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <CustomTextField
                  value={consultationFee}
                  onChangeText={setConsultationFee}
                  placeholder="Amount"
                  keyboardType="numeric"
                  style={styles.feeInput}
                />
              </View>
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconContainer}>
                <Icon name="calendar-outline" size={50} color="#0CB69B" />
              </View>
              <Text style={styles.stepTitle}>Set Your Availability</Text>
              <Text style={styles.stepDescription}>
                Select the days and times you're available for appointments.
              </Text>

              <Text style={styles.sectionLabel}>Available Days</Text>
              <DaysOfWeekPicker
                selectedDays={selectedDays}
                onDayToggle={handleDayToggle}
              />

              <Text style={styles.sectionLabel}>Working Hours</Text>
              <View style={styles.timeContainer}>
                <View style={styles.timePickerContainer}>
                  <Text style={styles.timeLabel}>From</Text>
                  <CustomPicker
                    selectedValue={startTime}
                    onValueChange={setStartTime}
                    items={timeSlots.map(time => ({
                      label: time,
                      value: time,
                    }))}
                    style={styles.timePicker}
                  />
                </View>

                <View style={styles.timePickerContainer}>
                  <Text style={styles.timeLabel}>To</Text>
                  <CustomPicker
                    selectedValue={endTime}
                    onValueChange={setEndTime}
                    items={timeSlots.map(time => ({
                      label: time,
                      value: time,
                    }))}
                    style={styles.timePicker}
                  />
                </View>
              </View>
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconContainer}>
                <Icon name="location-outline" size={50} color="#0CB69B" />
              </View>
              <Text style={styles.stepTitle}>Set Your Clinic Location</Text>
              <Text style={styles.stepDescription}>
                Search and select your clinic's location so patients can find
                you easily.
              </Text>

              {!showMap ? (
                <View style={styles.locationContainer}>
                  {!locationSelected ? (
                    <CustomButton
                      title="Search & Select Location"
                      onPress={() => setShowMap(true)}
                      style={styles.locationButton}
                    />
                  ) : (
                    <View style={styles.selectedLocationContainer}>
                      <Text style={styles.addressLabel}>
                        Selected Location:
                      </Text>
                      <Text style={styles.addressText}>{address}</Text>
                      <Text style={styles.addressText}>
                        Lat: {latitude}, Lng: {longitude}
                      </Text>
                      <TouchableOpacity
                        style={styles.changeLocationButton}
                        onPress={() => setShowMap(true)}>
                        <Text style={styles.changeLocationText}>
                          Change Location
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <LocationMapSearch
                  onLocationSelect={location => {
                    console.log('Location selected:', location); // Add debug log
                    setLatitude(location.latitude);
                    setLongitude(location.longitude);
                    setAddress(location.address);
                    setLocationSelected(true);
                    setShowMap(false);
                  }}
                  onCancel={() => setShowMap(false)}
                />
              )}
            </View>
          )}

          {currentStep === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconContainer}>
                <Icon
                  name="information-circle-outline"
                  size={50}
                  color="#0CB69B"
                />
              </View>
              <Text style={styles.stepTitle}>Additional Information</Text>
              <Text style={styles.stepDescription}>
                Add a short bio to help patients learn more about you.
              </Text>

              <Text style={styles.sectionLabel}>Bio (Optional)</Text>
              <CustomTextField
                value={bio}
                onChangeText={setBio}
                placeholder="Write a short description about yourself, your specialties, and your practice"
                multiline
                style={styles.bioInput}
              />

              <Text style={styles.note}>
                You can update all this information anytime from your profile
                settings.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 1 && (
            <CustomButton
              title="Back"
              onPress={handleBackStep}
              style={styles.backButton}
              textStyle={styles.backButtonText}
              disabled={loading}
            />
          )}

          <CustomButton
            title={currentStep < 4 ? 'Next' : 'Complete Setup'}
            onPress={handleNextStep}
            style={styles.nextButton}
            loading={loading}
            disabled={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#0CB69B',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stepText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  stepContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(12, 182, 155, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#333',
  },
  feeInput: {
    flex: 1,
    fontSize: 18,
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  dayButton: {
    margin: 5,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedDayButton: {
    backgroundColor: '#0CB69B',
    borderColor: '#0CB69B',
  },
  dayButtonText: {
    color: '#333',
  },
  selectedDayButtonText: {
    color: '#fff',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  timePickerContainer: {
    width: '48%',
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timePicker: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  input: {
    width: '100%',
  },
  bioInput: {
    width: '100%',
    height: 120,
    textAlignVertical: 'top',
  },
  note: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    flex: 1,
    marginRight: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0CB69B',
  },
  backButtonText: {
    color: '#0CB69B',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#0CB69B',
  },
  mapContainer: {
    height: 450,
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 15,
  },
  webview: {
    height: '100%',
    width: '100%',
  },
  cancelButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  locationContainer: {
    width: '100%',
    marginTop: 20,
  },
  locationButton: {
    width: '100%',
    backgroundColor: '#0CB69B',
  },
  selectedLocationContainer: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  addressLabel: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  addressText: {
    color: '#555',
    marginBottom: 10,
  },
  changeLocationButton: {
    alignSelf: 'flex-end',
  },
  changeLocationText: {
    color: '#0CB69B',
    fontWeight: 'bold',
  },
});

export default DoctorOnboardingScreen;
