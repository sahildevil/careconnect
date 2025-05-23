import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {doctorService} from '../../services/api';
import Geolocation from 'react-native-geolocation-service';
import { useAuth } from '../../context/AuthContext';
import { calculateHaversineDistance, calculateRouteDistances } from '../../utils/geoUtils';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const DoctorListScreen = () => {
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [error, setError] = useState(null);
  
  // Add new state variables
  const [userLocation, setUserLocation] = useState(null);
  const [sortBy, setSortBy] = useState('distance'); // 'distance' or 'rating'
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [useRouteDistance, setUseRouteDistance] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  useEffect(() => {
    // Get user location first (if possible)
    getUserLocation();
    
    // Check if specialty was passed as a param
    if (route.params?.specialty) {
      setSelectedSpecialty(route.params.specialty);
    }

    // Check if search query was passed as a param
    if (route.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
    }
  }, [route.params]);

  useEffect(() => {
    if (doctors.length > 0) {
      filterDoctors();
    }
  }, [searchQuery, selectedSpecialty, doctors, sortBy]);

  const getUserLocation = async () => {
    try {
      // Check if we have stored user location
      if (user && user.latitude && user.longitude) {
        const location = {
          latitude: parseFloat(user.latitude),
          longitude: parseFloat(user.longitude)
        };
        console.log('Using stored user location:', location);
        setUserLocation(location);
        
        // Fetch all doctors first
        await fetchDoctors();
      } else {
        // Request location permission
        requestLocationPermission();
      }
    } catch (error) {
      console.error('Error getting user location:', error);
      fetchDoctors();
    }
  };

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'CareConn needs access to your location to find nearby doctors',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentPosition();
        } else {
          console.log('Location permission denied');
          fetchDoctors();
        }
      } else {
        // iOS
        getCurrentPosition();
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
      fetchDoctors();
    }
  };

  const getCurrentPosition = () => {
    Geolocation.getCurrentPosition(
      position => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        console.log('Got current location:', location);
        
        setUserLocation(location);
        fetchDoctors();
      },
      error => {
        console.error('Error getting current location:', error);
        fetchDoctors();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await doctorService.getAllDoctors();

      if (response.success) {
        // Only show visible doctors
        const visibleDoctors = response.doctors.filter(doc => doc.is_visible !== false);
        console.log(`Found ${visibleDoctors.length} visible doctors`);
        
        // If we have user location, calculate distances
        if (userLocation) {
          await calculateDistancesForDoctors(visibleDoctors);
        } else {
          setDoctors(visibleDoctors);
          setFilteredDoctors(visibleDoctors);
        }
      } else {
        setError('Failed to fetch doctors');
      }
    } catch (error) {
      setError('Error connecting to server');
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistancesForDoctors = async (doctorsList) => {
    try {
      setDistanceLoading(true);
      
      if (useRouteDistance) {
        // Use Google Maps Distance Matrix API
        const doctorsWithRouteDistances = await calculateRouteDistances(
          userLocation, 
          doctorsList
        );
        
        if (doctorsWithRouteDistances.length > 0) {
          setDoctors(doctorsWithRouteDistances);
          filterDoctors(doctorsWithRouteDistances);
        }
      } else {
        // Use Haversine formula (faster, less accurate)
        const doctorsWithDistances = doctorsList.map(doctor => {
          const distance = calculateHaversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(doctor.latitude || 0),
            parseFloat(doctor.longitude || 0)
          );
          
          return {
            ...doctor,
            distance,
            distanceSource: 'haversine'
          };
        });
        
        // Sort by distance (null values at the end)
        const sortedDoctors = doctorsWithDistances.sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
        
        setDoctors(sortedDoctors);
        filterDoctors(sortedDoctors);
      }
    } catch (error) {
      console.error('Error calculating distances:', error);
      setDoctors(doctorsList);
      filterDoctors(doctorsList);
    } finally {
      setDistanceLoading(false);
    }
  };

  const filterDoctors = (doctorsList = doctors) => {
    let filtered = [...doctorsList];

    // Filter by specialty
    if (selectedSpecialty) {
      filtered = filtered.filter(
        doctor => {
          // Your existing specialty filtering logic
          const docSpecialty = (doctor.specialty || '').trim().toLowerCase();
          const selectedSpec = selectedSpecialty.trim().toLowerCase();
          
          // Map similar specialties for better matching
          const specialtyMap = {
            'orthopedic': ['orthopedics', 'orthopaedic', 'orthopaedics'],
            'cardiology': ['cardiologist', 'heart specialist', 'cardiac'],
            'dermatology': ['dermatologist', 'skin specialist'],
            'neurology': ['neurologist', 'neuro', 'brain specialist'],
            'pediatrics': ['pediatric', 'pediatrician', 'child specialist'],
            'dentist': ['dental', 'dentistry'],
            'general medicine': ['general physician', 'family medicine', 'gp']
          };
          
          // Check for direct match
          if (docSpecialty === selectedSpec) return true;
          
          // Check for related specialties
          for (const [key, values] of Object.entries(specialtyMap)) {
            if ((key.includes(selectedSpec) || values.some(v => selectedSpec.includes(v))) && 
                (docSpecialty.includes(key) || values.some(v => docSpecialty.includes(v)))) {
              return true;
            }
          }
          
          return false;
        }
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        doctor =>
          (doctor.name || '').toLowerCase().includes(query) ||
          ((doctor.specialty || '').toLowerCase().includes(query)),
      );
    }

    // Sort by distance or rating
    if (sortBy === 'distance') {
      filtered.sort((a, b) => {
        if (a.distance === null || a.distance === undefined) return 1;
        if (b.distance === null || b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
    } else {
      filtered.sort((a, b) => {
        const ratingA = parseFloat(a.rating) || 0;
        const ratingB = parseFloat(b.rating) || 0;
        return ratingB - ratingA;
      });
    }

    setFilteredDoctors(filtered);
  };

  const toggleSortBy = () => {
    const newSortBy = sortBy === 'distance' ? 'rating' : 'distance';
    setSortBy(newSortBy);
  };

  const toggleDistanceCalculation = async () => {
    if (!userLocation) {
      Alert.alert(
        'Location Required',
        'Please enable location services to use route distances',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Toggle between straight-line and route distance
    const newValue = !useRouteDistance;
    setUseRouteDistance(newValue);
    
    if (newValue && doctors.length > 0) {
      // Recalculate using route distance
      calculateDistancesForDoctors(doctors);
    }
  };

  // List of specialties - make sure these match exactly with database values
  const specialties = [
    'Cardiology',
    'Dermatology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Dentist',
    'General Medicine',
  ];

  const renderDistanceText = (item) => {
    if (!item.distance) return null;
    
    // Format distance text
    let distanceText;
    if (item.distance < 1) {
      distanceText = `${(item.distance * 1000).toFixed(0)}m`;
    } else {
      distanceText = `${item.distance.toFixed(1)}km`;
    }
    
    // Add duration if available
    if (item.duration) {
      distanceText += ` • ${item.duration}`;
    }
    
    return (
      <View style={styles.distanceContainer}>
        <Icon 
          name={item.distanceSource === 'route' ? 'navigate' : 'location-outline'} 
          size={14} 
          color="#666" 
        />
        <Text style={styles.distanceText}>{distanceText}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top}]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Doctors</Text>
        <TouchableOpacity onPress={fetchDoctors} style={{padding: 5}}>
          <Icon name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search doctors, specialties..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.specialtyContainer}>
        <FlatList
          data={specialties}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[
                styles.specialtyChip,
                selectedSpecialty === item && styles.selectedSpecialtyChip,
              ]}
              onPress={() =>
                setSelectedSpecialty(selectedSpecialty === item ? null : item)
              }>
              <Text
                style={[
                  styles.specialtyChipText,
                  selectedSpecialty === item && styles.selectedSpecialtyChipText,
                ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Display sort and distance options when location is available */}
      {userLocation && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={toggleSortBy}>
            <Icon 
              name={sortBy === 'distance' ? 'location-outline' : 'star-outline'} 
              size={16} 
              color="#0CB69B" 
            />
            <Text style={styles.controlButtonText}>
              {sortBy === 'distance' ? 'By Distance' : 'By Rating'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.controlButton,
              useRouteDistance && styles.activeControlButton
            ]}
            onPress={toggleDistanceCalculation}>
            <Icon 
              name={useRouteDistance ? 'navigate' : 'location-outline'} 
              size={16} 
              color={useRouteDistance ? '#FFFFFF' : '#0CB69B'} 
            />
            <Text style={[
              styles.controlButtonText,
              useRouteDistance && styles.activeControlButtonText
            ]}>
              {useRouteDistance ? 'Route Distance' : 'Direct Distance'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {distanceLoading && (
        <View style={styles.distanceLoadingBar}>
          <ActivityIndicator size="small" color="#0CB69B" />
          <Text style={styles.distanceLoadingText}>
            Calculating distances...
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0CB69B" />
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle" size={60} color="#ff6b6b" />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchDoctors}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredDoctors}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.doctorCard}
              onPress={() => navigation.navigate('DoctorDetail', {doctorId: item.id})}>
              <View style={styles.cardContent}>
                <View style={styles.doctorAvatar}>
                  {item.avatar_url ? (
                    <Image 
                      source={{uri: item.avatar_url}} 
                      style={styles.avatarImage}
                      defaultSource={require('../../assets/images/Doctor_icon.png')} 
                    />
                  ) : (
                    <Text style={styles.avatarText}>{item.name ? item.name.charAt(0) : '?'}</Text>
                  )}
                </View>

                <View style={styles.doctorInfo}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.doctorName}>Dr. {item.name}</Text>
                    <View style={styles.ratingContainer}>
                      <Icon name="star" size={14} color="#FFD700" />
                      <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
                    </View>
                  </View>
                  <Text style={styles.specialtyText}>{item.specialty}</Text>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.experienceText}>
                      {item.experience || '5'}+ years experience
                    </Text>
                    {renderDistanceText(item)}
                  </View>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.feeContainer}>
                  <Text style={styles.feeLabel}>Consultation Fee</Text>
                  <Text style={styles.feeAmount}>
                    ₹{item.consultation_fee || '500'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={() =>
                    navigation.navigate('BookAppointment', {doctor: item})
                  }>
                  <Text style={styles.bookButtonText}>Book</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.doctorList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="search" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No doctors found</Text>
              <Text style={styles.emptySubText}>
                Try adjusting your search or filters
              </Text>
              
              {selectedSpecialty && (
                <TouchableOpacity 
                  style={styles.clearFilterButton}
                  onPress={() => setSelectedSpecialty(null)}>
                  <Text style={styles.clearFilterText}>Clear specialty filter</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: '#0CB69B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 50,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
  },
  specialtyContainer: {
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  specialtyChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    marginVertical: 5,
  },
  selectedSpecialtyChip: {
    backgroundColor: '#0CB69B',
  },
  specialtyChipText: {
    color: '#666',
    fontWeight: '500',
  },
  selectedSpecialtyChipText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorList: {
    padding: 15,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    padding: 15,
  },
  cardContent: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F8F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0CB69B',
  },
  doctorInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  specialtyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  experienceText: {
    fontSize: 12,
    color: '#888',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  feeContainer: {},
  feeLabel: {
    fontSize: 12,
    color: '#888',
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  bookButton: {
    backgroundColor: '#0CB69B',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  bookButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  retryButton: {
    backgroundColor: '#0CB69B',
    paddingVertical: 10, 
    paddingHorizontal: 30,
    borderRadius: 20,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  clearFilterButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 15,
  },
  clearFilterText: {
    color: '#0CB69B',
    fontWeight: '500',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  activeControlButton: {
    backgroundColor: '#0CB69B',
  },
  controlButtonText: {
    color: '#0CB69B',
    marginLeft: 5,
    fontWeight: '500',
    fontSize: 12,
  },
  activeControlButtonText: {
    color: '#FFFFFF',
  },
  distanceLoadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8f6',
    padding: 8,
    marginHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  distanceLoadingText: {
    color: '#0CB69B',
    marginLeft: 8,
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});

export default DoctorListScreen;
