import React, {useState, useEffect, useRef} from 'react';
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
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {doctorService} from '../../services/api';
import Geolocation from 'react-native-geolocation-service';
import {useAuth} from '../../context/AuthContext';
import {
  calculateHaversineDistance,
  calculateRouteDistances,
} from '../../utils/geoUtils';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';

const DoctorListScreen = () => {
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [error, setError] = useState(null);

  // Location states
  const [userLocation, setUserLocation] = useState(null);
  const [sortBy, setSortBy] = useState('distance'); 
  const [sortOrder, setSortOrder] = useState('ascending'); 
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [useRouteDistance, setUseRouteDistance] = useState(false);

  // Filter states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [maxFee, setMaxFee] = useState(5000);
  const [maxDistance, setMaxDistance] = useState(50);
  const [minExperience, setMinExperience] = useState(0);
  const [applyingFilters, setApplyingFilters] = useState(false);

  // Keep original values for reset
  const [originalMaxFee, setOriginalMaxFee] = useState(5000);
  const [originalMaxDistance, setOriginalMaxDistance] = useState(50);
  const [originalMinExperience, setOriginalMinExperience] = useState(0);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();

  // For detecting first render
  const isInitialRender = useRef(true);

  useEffect(() => {
    // Get user location first 
    getUserLocation();

    // Check if specialty was passed as a param
    if (route.params?.specialty) {
      setSelectedSpecialty(route.params.specialty);
    }

    // Check if search query was passed as a param
    if (route.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
      filterDoctors(); 
    }

    const initializeFilters = async () => {
      try {
        const response = await doctorService.getAllDoctors();
        if (response.success && response.doctors.length > 0) {
          const highestFee = Math.max(
            ...response.doctors.map(
              doc => parseInt(doc.consultation_fee) || 500,
            ),
            5000,
          );
          setMaxFee(highestFee);
          setOriginalMaxFee(highestFee);

          const highestExperience = Math.max(
            ...response.doctors.map(doc => parseInt(doc.experience) || 5),
            10,
          );
     
          console.log('Maximum values:', {highestFee, highestExperience});
        }
      } catch (error) {
        console.error('Error initializing filters:', error);
      }
    };

    initializeFilters();
  }, [route.params]);

  useEffect(() => {
  
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    if (doctors.length > 0) {
      filterAndSortDoctors();
    }
  }, [
    searchQuery,
    selectedSpecialty,
    doctors,
    sortBy,
    sortOrder,
    applyingFilters,
  ]);

  const getUserLocation = async () => {
    try {
      let location = null;

      // Check if we have stored user location
      if (user && user.latitude && user.longitude) {
        location = {
          latitude: parseFloat(user.latitude),
          longitude: parseFloat(user.longitude),
        };
        console.log('Using stored user location:', location);
        setUserLocation(location);
      } else {
        await requestLocationPermission();
        return; 
      }

      // If we have location, fetch doctors with it
      if (location) {
        await fetchDoctorsWithLocation(location);
      } else {
        await fetchDoctors(true);
      }
    } catch (error) {
      console.error('Error getting user location:', error);
      // Fetch doctors without location
      await fetchDoctors(true);
    }
  };

  // Add this new function that accepts location as parameter:
  const fetchDoctorsWithLocation = async location => {
    try {
      setLoading(true);
      setError(null);

      const response = await doctorService.getAllDoctors();

      if (response.success) {
        const visibleDoctors = response.doctors.filter(
          doc => doc.is_visible !== false,
        );

        console.log(`Found ${visibleDoctors.length} visible doctors`);

        if (location && location.latitude && location.longitude) {
          await calculateDistancesWithLocation(visibleDoctors, location);
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

  const calculateDistancesWithLocation = async (doctorsList, location) => {
    try {
      setDistanceLoading(true);

      console.log(
        `Calculating distances for ${doctorsList.length} doctors with location:`,
        location,
      );

      const doctorsWithDistances = doctorsList.map((doctor, index) => {
        if (!doctor.latitude || !doctor.longitude) {
          console.log(`Doctor ${doctor.name} has no coordinates`);
          return {
            ...doctor,
            distance: null,
          };
        }

        try {
          const distance = calculateHaversineDistance(
            location.latitude,
            location.longitude,
            parseFloat(doctor.latitude),
            parseFloat(doctor.longitude),
          );

          console.log(`Distance to Dr. ${doctor.name}: ${distance}km`);

          return {
            ...doctor,
            distance: distance,
            distanceSource: 'haversine',
          };
        } catch (error) {
          console.error(
            `Error calculating distance for ${doctor.name}:`,
            error,
          );
          return {
            ...doctor,
            distance: null,
          };
        }
      });

      console.log('Distance calculation completed');

      setDoctors(doctorsWithDistances);
      setFilteredDoctors(doctorsWithDistances);
    } catch (error) {
      console.error('Error calculating distances:', error);
      setDoctors(doctorsList);
      setFilteredDoctors(doctorsList);
    } finally {
      setDistanceLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'CareConn needs access to your location to find nearby doctors',
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
          longitude: position.coords.longitude,
        };
        console.log('Got current location:', location);

        setUserLocation(location);
        fetchDoctorsWithLocation(location);
      },
      error => {
        console.error('Error getting current location:', error);
        fetchDoctors(true); 
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  };

  const fetchDoctors = async (forceLocationCheck = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await doctorService.getAllDoctors();

      if (response.success) {
        const visibleDoctors = response.doctors.filter(
          doc => doc.is_visible !== false,
        );

        const doctorsWithCoords = visibleDoctors.filter(
          d => d.latitude && d.longitude,
        );
        console.log(
          `Found ${visibleDoctors.length} visible doctors, ${doctorsWithCoords.length} have coordinates`,
        );

        console.log(
          'Sample doctor data:',
          visibleDoctors.slice(0, 2).map(d => ({
            name: d.name,
            latitude: d.latitude,
            longitude: d.longitude,
            hasCoords: !!(d.latitude && d.longitude),
          })),
        );

        if (!userLocation && !forceLocationCheck) {
          console.log(
            'No user location available, attempting to get location first...',
          );

          setDoctors(visibleDoctors);
          setFilteredDoctors(visibleDoctors);

          // Try to get location and then recalculate
          try {
            await getUserLocationAndCalculateDistances(visibleDoctors);
          } catch (locationError) {
            console.log('Could not get location, proceeding without distances');
          }
        } else if (userLocation) {
          // We have location, calculate distances
          await calculateDistancesForDoctors(visibleDoctors);
        } else {
          // No location available and we've already tried, just set doctors
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
  const getUserLocationAndCalculateDistances = async doctorsList => {
    return new Promise((resolve, reject) => {
      // Check if we have stored user location first
      if (user && user.latitude && user.longitude) {
        const location = {
          latitude: parseFloat(user.latitude),
          longitude: parseFloat(user.longitude),
        };
        console.log(
          'Using stored user location for distance calculation:',
          location,
        );
        setUserLocation(location);
        calculateDistancesWithLocation(doctorsList, location)
          .then(resolve)
          .catch(reject);
        return;
      }

      // Try to get current position with a shorter timeout for this scenario
      Geolocation.getCurrentPosition(
        position => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log(
            'Got current location for distance calculation:',
            location,
          );
          setUserLocation(location);
          calculateDistancesWithLocation(doctorsList, location)
            .then(resolve)
            .catch(reject);
        },
        error => {
          console.error(
            'Error getting location for distance calculation:',
            error,
          );
          reject(error);
        },
        {enableHighAccuracy: false, timeout: 8000, maximumAge: 30000}, // Shorter timeout, allow cached location
      );
    });
  };
  
  const calculateDistancesForDoctors = async doctorsList => {
    try {
      setDistanceLoading(true);

      if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
        console.warn('User location not available for distance calculation');
        setDoctors(doctorsList);
        setFilteredDoctors(doctorsList);
        return;
      }

      console.log(`Calculating distances for ${doctorsList.length} doctors`);
      console.log('User location:', userLocation);

      const doctorsWithDistances = doctorsList.map((doctor, index) => {
        console.log(`Processing doctor ${index + 1}:`, {
          name: doctor.name,
          latitude: doctor.latitude,
          longitude: doctor.longitude,
          hasCoords: !!(doctor.latitude && doctor.longitude),
        });

        // Skip if doctor has no coordinates
        if (!doctor.latitude || !doctor.longitude) {
          console.log(`Doctor ${doctor.name} has no coordinates`);
          return {
            ...doctor,
            distance: null,
          };
        }

        try {
          const distance = calculateHaversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(doctor.latitude),
            parseFloat(doctor.longitude),
          );

          console.log(`Distance to Dr. ${doctor.name}: ${distance}km`);

          return {
            ...doctor,
            distance: distance,
            distanceSource: 'haversine',
          };
        } catch (error) {
          console.error(
            `Error calculating distance for ${doctor.name}:`,
            error,
          );
          return {
            ...doctor,
            distance: null,
          };
        }
      });

      console.log(`Distance calculation completed`);
      console.log(
        'Doctors with calculated distances:',
        doctorsWithDistances.map(d => ({
          name: d.name,
          distance: d.distance,
          hasCoords: !!(d.latitude && d.longitude),
        })),
      );

      // Set doctors with distances
      setDoctors(doctorsWithDistances);

      setFilteredDoctors(doctorsWithDistances);
    } catch (error) {
      console.error('Error calculating distances:', error);
      setDoctors(doctorsList);
      setFilteredDoctors(doctorsList);
    } finally {
      setDistanceLoading(false);
    }
  };

  const resetFilters = () => {
    setMaxFee(originalMaxFee);
    setMaxDistance(originalMaxDistance);
    setMinExperience(originalMinExperience);
  };

  const applyFilters = () => {
    setShowFilterModal(false);
    setApplyingFilters(!applyingFilters); 
  };

  const removeFilter = filterType => {
    switch (filterType) {
      case 'fees':
        setMaxFee(originalMaxFee);
        break;
      case 'distance':
        setMaxDistance(originalMaxDistance);
        break;
      case 'experience':
        setMinExperience(originalMinExperience);
        break;
      case 'sort':
        setSortBy('distance');
        setSortOrder('ascending');
        break;
    }
    setApplyingFilters(!applyingFilters); 
  };

  const filterAndSortDoctors = () => {
    let filtered = [...doctors];
    console.log('Starting filter with', filtered.length, 'doctors');
    console.log('User location:', userLocation);

    if (selectedSpecialty) {
      filtered = filtered.filter(doctor => {
        const docSpecialty = (doctor.specialty || '').trim().toLowerCase();
        const selectedSpec = selectedSpecialty.trim().toLowerCase();

        const specialtyMap = {
          orthopedic: ['orthopedics', 'orthopaedic', 'orthopaedics'],
          cardiology: ['cardiologist', 'heart specialist', 'cardiac'],
          dermatology: ['dermatologist', 'skin specialist'],
          neurology: ['neurologist', 'neuro', 'brain specialist'],
          pediatrics: ['pediatric', 'pediatrician', 'child specialist'],
          dentist: ['dental', 'dentistry'],
          'general medicine': ['general physician', 'family medicine', 'gp'],
        };

        if (docSpecialty === selectedSpec) return true;

        for (const [key, values] of Object.entries(specialtyMap)) {
          if (
            (key.includes(selectedSpec) ||
              values.some(v => selectedSpec.includes(v))) &&
            (docSpecialty.includes(key) ||
              values.some(v => docSpecialty.includes(v)))
          ) {
            return true;
          }
        }

        return false;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        doctor =>
          (doctor.name || '').toLowerCase().includes(query) ||
          (doctor.specialty || '').toLowerCase().includes(query),
      );
    }

    filtered = filtered.filter(doctor => {
      const fee = parseInt(doctor.consultation_fee) || 500;
      return fee <= maxFee;
    });

    if (userLocation) {
      filtered = filtered.filter(doctor => {
        if (!doctor.distance && doctor.distance !== 0) return true; // Include if distance unknown
        return doctor.distance <= maxDistance;
      });
    }

    filtered = filtered.filter(doctor => {
      const experience = parseInt(doctor.experience) || 0;
      return experience >= minExperience;
    });

    console.log('Sorting by:', sortBy, 'Order:', sortOrder);
    console.log(
      'Before sorting, sample distances:',
      filtered.slice(0, 3).map(d => ({
        name: d.name,
        distance: d.distance,
        distanceType: typeof d.distance,
      })),
    );

    switch (sortBy) {
      case 'distance':
        filtered.sort((a, b) => {
          const distA = typeof a.distance === 'number' ? a.distance : Infinity;
          const distB = typeof b.distance === 'number' ? b.distance : Infinity;
          return sortOrder === 'ascending' ? distA - distB : distB - distA;
        });
        break;
      case 'fees':
        filtered.sort((a, b) => {
          const feeA = parseInt(a.consultation_fee) || 500;
          const feeB = parseInt(b.consultation_fee) || 500;
          return sortOrder === 'ascending' ? feeA - feeB : feeB - feeA;
        });
        break;
      case 'experience':
        filtered.sort((a, b) => {
          const expA = parseInt(a.experience) || 0;
          const expB = parseInt(b.experience) || 0;
          return sortOrder === 'ascending' ? expA - expB : expB - expA;
        });
        break;
      default: 
        filtered.sort((a, b) => {
          const ratingA = parseFloat(a.rating) || 0;
          const ratingB = parseFloat(b.rating) || 0;
          return sortOrder === 'ascending'
            ? ratingA - ratingB
            : ratingB - ratingA;
        });
    }

    console.log(
      'After sorting, sample distances:',
      filtered.slice(0, 3).map(d => ({
        name: d.name,
        distance: d.distance,
      })),
    );

    setFilteredDoctors(filtered);
  };

  const toggleSortBy = newSortBy => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortBy(newSortBy);
      setSortOrder('ascending');
    }
  };

  const specialties = [
    'Cardiology',
    'Dermatology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Dentist',
    'General Medicine',
  ];

  const renderDistanceText = item => {
    console.log(
      'Rendering distance for:',
      item.name,
      'Distance:',
      item.distance,
      'Type:',
      typeof item.distance,
    );

    // Check if distance exists and is a valid number
    if (
      item.distance === null ||
      item.distance === undefined ||
      isNaN(item.distance)
    ) {
      return null;
    }

    let distanceText;
    if (item.distance < 1) {
      distanceText = `${Math.round(item.distance * 1000)}m`;
    } else {
      distanceText = `${item.distance.toFixed(1)}km`;
    }

    return (
      <View style={styles.distanceContainer}>
        <Icon name="location-outline" size={14} color="#0CB69B" />
        <Text style={styles.distanceText}>{distanceText}</Text>
      </View>
    );
  };


const FilterModal = () => {
  const [tempMaxFee, setTempMaxFee] = useState(maxFee);
  const [tempMaxDistance, setTempMaxDistance] = useState(maxDistance);
  const [tempMinExperience, setTempMinExperience] = useState(minExperience);
  const [tempSortBy, setTempSortBy] = useState(sortBy);
  const [tempSortOrder, setTempSortOrder] = useState(sortOrder);

  useEffect(() => {
    if (showFilterModal) {
      setTempMaxFee(maxFee);
      setTempMaxDistance(maxDistance);
      setTempMinExperience(minExperience);
      setTempSortBy(sortBy);
      setTempSortOrder(sortOrder);
    }
  }, [showFilterModal]);

  const tempToggleSortBy = newSortBy => {
    if (tempSortBy === newSortBy) {
      setTempSortOrder(
        tempSortOrder === 'ascending' ? 'descending' : 'ascending',
      );
    } else {
      setTempSortBy(newSortBy);
      setTempSortOrder('ascending');
    }
  };

  const handleApplyFilters = () => {
    setMaxFee(tempMaxFee);
    setMaxDistance(tempMaxDistance);
    setMinExperience(tempMinExperience);
    setSortBy(tempSortBy);
    setSortOrder(tempSortOrder);
    setShowFilterModal(false);
    setTimeout(() => setApplyingFilters(!applyingFilters), 50);
  };

  const tempRemoveFilter = filterType => {
    switch (filterType) {
      case 'fees':
        setTempMaxFee(originalMaxFee);
        break;
      case 'distance':
        setTempMaxDistance(originalMaxDistance);
        break;
      case 'experience':
        setTempMinExperience(originalMinExperience);
        break;
      case 'sort':
        setTempSortBy('distance');
        setTempSortOrder('ascending');
        break;
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showFilterModal}
      onRequestClose={() => setShowFilterModal(false)}>
      <View style={modernStyles.modalOverlay}>
        <View style={modernStyles.modalContainer}>
          <View style={modernStyles.modalHeader}>
            <Text style={modernStyles.filtersTitle}>Filter Doctors</Text>
            <TouchableOpacity style={modernStyles.closeButtonContainer} onPress={() => setShowFilterModal(false)}>
              <Icon name="close" size={22} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={modernStyles.modalDragHandle} />
          
          <ScrollView 
            style={modernStyles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Fees Filter */}
            <View style={modernStyles.filterSection}>
              <View style={modernStyles.filterHeaderRow}>
                <View style={modernStyles.filterTitleContainer}>
                  <Icon name="wallet-outline" size={20} color="#0CB69B" style={modernStyles.filterIcon} />
                  <Text style={modernStyles.filterTitle}>Consultation Fee</Text>
                </View>
                <Text style={modernStyles.sliderValue}>₹{tempMaxFee}</Text>
              </View>
              
              <View style={modernStyles.sliderContainer}>
                <Slider
                  style={modernStyles.slider}
                  minimumValue={100}
                  maximumValue={originalMaxFee}
                  step={100}
                  value={tempMaxFee}
                  onValueChange={setTempMaxFee}
                  minimumTrackTintColor="#0CB69B"
                  maximumTrackTintColor="#DDDDDD"
                  thumbTintColor="#0CB69B"
                />
                <View style={modernStyles.rangeLabelsContainer}>
                  <Text style={modernStyles.rangeMinLabel}>₹100</Text>
                  <Text style={modernStyles.rangeMaxLabel}>₹{originalMaxFee}</Text>
                </View>
              </View>
              
              {tempMaxFee < originalMaxFee && (
                <TouchableOpacity 
                  style={modernStyles.resetButtonContainer}
                  onPress={() => tempRemoveFilter('fees')}
                >
                  <Icon name="refresh-outline" size={16} color="#FF6B6B" />
                  <Text style={modernStyles.resetButtonText}>Reset to Max</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={modernStyles.sectionDivider} />
            
            {/* Distance Filter */}
            <View style={modernStyles.filterSection}>
              <View style={modernStyles.filterHeaderRow}>
                <View style={modernStyles.filterTitleContainer}>
                  <Icon name="location-outline" size={20} color="#0CB69B" style={modernStyles.filterIcon} />
                  <Text style={modernStyles.filterTitle}>Distance</Text>
                </View>
                <Text style={modernStyles.sliderValue}>{tempMaxDistance} km</Text>
              </View>
              
              <View style={modernStyles.sliderContainer}>
                <Slider
                  style={modernStyles.slider}
                  minimumValue={1}
                  maximumValue={originalMaxDistance}
                  step={1}
                  value={tempMaxDistance}
                  onValueChange={setTempMaxDistance}
                  minimumTrackTintColor="#0CB69B"
                  maximumTrackTintColor="#DDDDDD"
                  thumbTintColor="#0CB69B"
                />
                <View style={modernStyles.rangeLabelsContainer}>
                  <Text style={modernStyles.rangeMinLabel}>1 km</Text>
                  <Text style={modernStyles.rangeMaxLabel}>{originalMaxDistance} km</Text>
                </View>
              </View>
              
              {tempMaxDistance < originalMaxDistance && (
                <TouchableOpacity 
                  style={modernStyles.resetButtonContainer}
                  onPress={() => tempRemoveFilter('distance')}
                >
                  <Icon name="refresh-outline" size={16} color="#FF6B6B" />
                  <Text style={modernStyles.resetButtonText}>Reset to Max</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={modernStyles.sectionDivider} />
            
            {/* Experience Filter */}
            <View style={modernStyles.filterSection}>
              <View style={modernStyles.filterHeaderRow}>
                <View style={modernStyles.filterTitleContainer}>
                  <Icon name="briefcase-outline" size={20} color="#0CB69B" style={modernStyles.filterIcon} />
                  <Text style={modernStyles.filterTitle}>Experience</Text>
                </View>
                <Text style={modernStyles.sliderValue}>{tempMinExperience}+ years</Text>
              </View>
              
              <View style={modernStyles.sliderContainer}>
                <Slider
                  style={modernStyles.slider}
                  minimumValue={0}
                  maximumValue={20}
                  step={1}
                  value={tempMinExperience}
                  onValueChange={setTempMinExperience}
                  minimumTrackTintColor="#0CB69B"
                  maximumTrackTintColor="#DDDDDD"
                  thumbTintColor="#0CB69B"
                />
                <View style={modernStyles.rangeLabelsContainer}>
                  <Text style={modernStyles.rangeMinLabel}>0 years</Text>
                  <Text style={modernStyles.rangeMaxLabel}>20+ years</Text>
                </View>
              </View>
              
              {tempMinExperience > 0 && (
                <TouchableOpacity 
                  style={modernStyles.resetButtonContainer}
                  onPress={() => tempRemoveFilter('experience')}
                >
                  <Icon name="refresh-outline" size={16} color="#FF6B6B" />
                  <Text style={modernStyles.resetButtonText}>Reset to 0</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={modernStyles.sectionDivider} />
            
            {/* Sort By Options */}
            <View style={modernStyles.filterSection}>
              <View style={modernStyles.filterHeaderRow}>
                <View style={modernStyles.filterTitleContainer}>
                  <Icon name="funnel-outline" size={20} color="#0CB69B" style={modernStyles.filterIcon} />
                  <Text style={modernStyles.filterTitle}>Sort By</Text>
                </View>
              </View>
              
              <View style={modernStyles.sortOptionsGrid}>
                <TouchableOpacity 
                  style={[
                    modernStyles.sortOptionButton, 
                    tempSortBy === 'distance' && modernStyles.activeSortOptionButton
                  ]}
                  onPress={() => tempToggleSortBy('distance')}
                >
                  <Icon 
                    name="navigate-outline" 
                    size={22} 
                    color={tempSortBy === 'distance' ? "#fff" : "#666"} 
                  />
                  <Text style={[
                    modernStyles.sortOptionText,
                    tempSortBy === 'distance' && modernStyles.activeSortOptionText
                  ]}>Distance</Text>
                  {tempSortBy === 'distance' && (
                    <Icon 
                      name={tempSortOrder === 'ascending' ? "arrow-up" : "arrow-down"} 
                      size={16} 
                      color="#fff" 
                      style={modernStyles.sortDirectionIcon}
                    />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    modernStyles.sortOptionButton, 
                    tempSortBy === 'fees' && modernStyles.activeSortOptionButton
                  ]}
                  onPress={() => tempToggleSortBy('fees')}
                >
                  <Icon 
                    name="cash-outline" 
                    size={22} 
                    color={tempSortBy === 'fees' ? "#fff" : "#666"} 
                  />
                  <Text style={[
                    modernStyles.sortOptionText,
                    tempSortBy === 'fees' && modernStyles.activeSortOptionText
                  ]}>Fees</Text>
                  {tempSortBy === 'fees' && (
                    <Icon 
                      name={tempSortOrder === 'ascending' ? "arrow-up" : "arrow-down"} 
                      size={16} 
                      color="#fff" 
                      style={modernStyles.sortDirectionIcon}
                    />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    modernStyles.sortOptionButton, 
                    tempSortBy === 'experience' && modernStyles.activeSortOptionButton
                  ]}
                  onPress={() => tempToggleSortBy('experience')}
                >
                  <Icon 
                    name="ribbon-outline" 
                    size={22} 
                    color={tempSortBy === 'experience' ? "#fff" : "#666"} 
                  />
                  <Text style={[
                    modernStyles.sortOptionText,
                    tempSortBy === 'experience' && modernStyles.activeSortOptionText
                  ]}>Experience</Text>
                  {tempSortBy === 'experience' && (
                    <Icon 
                      name={tempSortOrder === 'ascending' ? "arrow-up" : "arrow-down"} 
                      size={16} 
                      color="#fff" 
                      style={modernStyles.sortDirectionIcon}
                    />
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={modernStyles.sortOrderContainer}>
                <Text style={modernStyles.sortOrderLabel}>Order:</Text>
                <View style={modernStyles.sortOrderButtons}>
                  <TouchableOpacity
                    style={[
                      modernStyles.sortOrderButton,
                      tempSortOrder === 'ascending' && modernStyles.activeSortOrderButton
                    ]}
                    onPress={() => setTempSortOrder('ascending')}
                  >
                    <Icon 
                      name="arrow-up" 
                      size={16} 
                      color={tempSortOrder === 'ascending' ? "#0CB69B" : "#666"} 
                    />
                    <Text style={[
                      modernStyles.sortOrderText,
                      tempSortOrder === 'ascending' && modernStyles.activeSortOrderText
                    ]}>
                      Low to High
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      modernStyles.sortOrderButton,
                      tempSortOrder === 'descending' && modernStyles.activeSortOrderButton
                    ]}
                    onPress={() => setTempSortOrder('descending')}
                  >
                    <Icon 
                      name="arrow-down" 
                      size={16} 
                      color={tempSortOrder === 'descending' ? "#0CB69B" : "#666"} 
                    />
                    <Text style={[
                      modernStyles.sortOrderText,
                      tempSortOrder === 'descending' && modernStyles.activeSortOrderText
                    ]}>
                      High to Low
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
          
          <View style={modernStyles.modalFooter}>
            <TouchableOpacity 
              style={modernStyles.resetAllButton}
              onPress={() => {
                setTempMaxFee(originalMaxFee);
                setTempMaxDistance(originalMaxDistance);
                setTempMinExperience(0);
                setTempSortBy('distance');
                setTempSortOrder('ascending');
              }}
            >
              <Text style={modernStyles.resetAllText}>Reset All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={modernStyles.applyButton}
              onPress={handleApplyFilters}
            >
              <Text style={modernStyles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

  const hasActiveFilters = () => {
    return (
      maxFee < originalMaxFee ||
      maxDistance < originalMaxDistance ||
      minExperience > 0 ||
      sortBy !== 'distance' ||
      sortOrder !== 'ascending'
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
        <TouchableOpacity
          onPress={() => fetchDoctors(true)} // Pass true to force location check
          style={styles.refreshButton}>
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
        {searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.searchActionButton}>
            <Icon name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={() => setShowFilterModal(true)}
          style={[
            styles.filterButton,
            hasActiveFilters() && styles.activeFilterButton,
          ]}>
          <Icon
            name="options-outline"
            size={20}
            color={hasActiveFilters() ? '#fff' : '#0CB69B'}
          />
        </TouchableOpacity>
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
                  selectedSpecialty === item &&
                    styles.selectedSpecialtyChipText,
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

      {/* Active Filters Display */}
      <View style={styles.activeFiltersContainer}>
        {maxFee < originalMaxFee && (
          <View style={styles.activeFilterChip}>
            <Text style={styles.activeFilterText}>Under ₹{maxFee}</Text>
            <TouchableOpacity onPress={() => removeFilter('fees')}>
              <Icon name="close-circle" size={16} color="#0CB69B" />
            </TouchableOpacity>
          </View>
        )}

        {maxDistance < originalMaxDistance && (
          <View style={styles.activeFilterChip}>
            <Text style={styles.activeFilterText}>Within {maxDistance}km</Text>
            <TouchableOpacity onPress={() => removeFilter('distance')}>
              <Icon name="close-circle" size={16} color="#0CB69B" />
            </TouchableOpacity>
          </View>
        )}

        {minExperience > 0 && (
          <View style={styles.activeFilterChip}>
            <Text style={styles.activeFilterText}>
              {minExperience}+ years exp
            </Text>
            <TouchableOpacity onPress={() => removeFilter('experience')}>
              <Icon name="close-circle" size={16} color="#0CB69B" />
            </TouchableOpacity>
          </View>
        )}

        {(sortBy !== 'distance' || sortOrder !== 'ascending') && (
          <View style={styles.activeFilterChip}>
            <Text style={styles.activeFilterText}>
              {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)} ({sortOrder})
            </Text>
            <TouchableOpacity onPress={() => removeFilter('sort')}>
              <Icon name="close-circle" size={16} color="#0CB69B" />
            </TouchableOpacity>
          </View>
        )}
      </View>

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
          <TouchableOpacity style={styles.retryButton} onPress={fetchDoctors}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredDoctors}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.doctorCard}
              onPress={() =>
                navigation.navigate('DoctorDetail', {doctorId: item.id})
              }>
              <View style={styles.cardContent}>
                <View style={styles.doctorAvatar}>
                  {item.avatar_url ? (
                    <Image
                      source={{uri: item.avatar_url}}
                      style={styles.avatarImage}
                      defaultSource={require('../../assets/images/Doctor_icon.png')}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {item.name ? item.name.charAt(0) : '?'}
                    </Text>
                  )}
                </View>

                <View style={styles.doctorInfo}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.doctorName}>Dr. {item.name}</Text>
                    <View style={styles.ratingContainer}>
                      <Icon name="star" size={14} color="#FFD700" />
                      <Text style={styles.ratingText}>
                        {item.rating || '4.5'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.specialtyRow}>
                    <Text style={styles.specialtyText}>{item.specialty}</Text>
                    {renderDistanceText(item)}
                  </View>

                  <Text style={styles.experienceText}>
                    {item.experience || '5'}+ years experience
                  </Text>
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

              {(selectedSpecialty ||
                maxFee < originalMaxFee ||
                maxDistance < originalMaxDistance ||
                minExperience > 0) && (
                <TouchableOpacity
                  style={styles.clearFilterButton}
                  onPress={() => {
                    setSelectedSpecialty(null);
                    resetFilters();
                    setApplyingFilters(!applyingFilters);
                  }}>
                  <Text style={styles.clearFilterText}>Clear all filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <FilterModal />
    </SafeAreaView>
  );
};

const modernStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filtersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButtonContainer: {
    padding: 6,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalContent: {
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  modalFooter: {
  flexDirection: 'row',
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 0, 
  borderTopWidth: 1,
  borderTopColor: '#f0f0f0',
},
  
  // Filter sections
  filterSection: {
    marginVertical: 8,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    marginRight: 8,
  },
  filterTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
  },
  
  // Sliders
  sliderContainer: {
    paddingHorizontal: 5,
    marginBottom: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    fontSize: 16,
    color: '#0CB69B',
    fontWeight: '600',
  },
  rangeLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  rangeMinLabel: {
    fontSize: 12,
    color: '#999',
  },
  rangeMaxLabel: {
    fontSize: 12,
    color: '#999',
  },
  
  // Reset buttons
  resetButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    padding: 5,
    marginTop: 4,
  },
  resetButtonText: {
    color: '#FF6B6B',
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  
  // Sort options
  sortOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
    justifyContent: 'space-between',
  },
  sortOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 12,
    width: '31%',
    justifyContent: 'center',
  },
  activeSortOptionButton: {
    backgroundColor: '#0CB69B',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
    marginLeft: 6,
    marginRight: 4,
  },
  activeSortOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  sortDirectionIcon: {
    marginLeft: 2,
  },
  sortOrderContainer: {
    marginTop: 10,
  },
  sortOrderLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  sortOrderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sortOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    width: '48%',
    justifyContent: 'center',
  },
  activeSortOrderButton: {
    backgroundColor: '#E6F8F6',
    borderWidth: 1,
    borderColor: '#0CB69B',
  },
  sortOrderText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  activeSortOrderText: {
    color: '#0CB69B',
    fontWeight: '500',
  },
  
  // Footer buttons
  resetAllButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#0CB69B',
    borderRadius: 12,
  },
  resetAllText: {
    color: '#0CB69B',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#0CB69B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});


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
    paddingLeft: 15,
    paddingRight: 5,
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
    color: '#333',
    paddingRight: 5,
  },
  searchActionButton: {
    padding: 5,
  },
  filterButton: {
    backgroundColor: '#E6F8F6',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
    marginRight: 5,
  },
  activeFilterButton: {
    backgroundColor: '#0CB69B',
  },
  refreshButton: {
    padding: 5,
  },

  // Filter modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 0, 
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 16,
    color: '#0CB69B',
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 25,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  removeFilterText: {
    fontSize: 14,
    color: '#FF6B6B',
  },
  sliderContainer: {
    paddingHorizontal: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    textAlign: 'right',
    fontSize: 14,
    color: '#0CB69B',
    fontWeight: '600',
    marginTop: 5,
  },
  sortOptionsContainer: {
    marginTop: 5,
  },
  sortButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  activeSortButton: {
    backgroundColor: '#0CB69B',
  },
  sortButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  activeSortButtonText: {
    color: '#fff',
  },
  applyButton: {
    backgroundColor: '#0CB69B',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Active filters display
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F8F6',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilterText: {
    color: '#0CB69B',
    fontSize: 12,
    marginRight: 5,
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
    flex: 1,
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
    backgroundColor: '#E6F8F6',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  distanceText: {
    fontSize: 12,
    color: '#0CB69B',
    fontWeight: '500',
    marginLeft: 4,
  },
  specialtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
});

export default DoctorListScreen;
