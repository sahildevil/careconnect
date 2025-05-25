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
import {calculateHaversineDistance, calculateRouteDistances} from '../../utils/geoUtils';
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
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'rating', or 'fees'
  const [sortOrder, setSortOrder] = useState('ascending'); // 'ascending' or 'descending'
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
    // Get user location first (if possible)
    getUserLocation();
    
    // Check if specialty was passed as a param
    if (route.params?.specialty) {
      setSelectedSpecialty(route.params.specialty);
    }

    // Check if search query was passed as a param
    if (route.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
      filterDoctors(); // Ensure doctors are filtered based on the query
    }
    
    // Initialize filter values based on data
    const initializeFilters = async () => {
      try {
        const response = await doctorService.getAllDoctors();
        if (response.success && response.doctors.length > 0) {
          // Find maximum fee
          const highestFee = Math.max(
            ...response.doctors.map(
              doc => parseInt(doc.consultation_fee) || 500
            ),
            5000
          );
          setMaxFee(highestFee);
          setOriginalMaxFee(highestFee);
          
          // Find highest experience
          const highestExperience = Math.max(
            ...response.doctors.map(doc => parseInt(doc.experience) || 5),
            10
          );
          // Keep min experience at 0, but we have the max for reference
          console.log('Maximum values:', {highestFee, highestExperience});
        }
      } catch (error) {
        console.error('Error initializing filters:', error);
      }
    };
    
    initializeFilters();
  }, [route.params]);

  useEffect(() => {
    // Skip the first render
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    
    if (doctors.length > 0) {
      filterAndSortDoctors();
    }
  }, [searchQuery, selectedSpecialty, doctors, sortBy, sortOrder, applyingFilters]);

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

  // Improve the location handling in your app:
  const calculateDistancesForDoctors = async (doctorsList) => {
    try {
      setDistanceLoading(true);
      
      if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
        console.warn('User location not available for distance calculation');
        setDoctors(doctorsList);
        setFilteredDoctors(doctorsList);
        return;
      }
      
      console.log(`Calculating distances for ${doctorsList.length} doctors`);
      
      // Use Haversine formula (faster, less accurate)
      const doctorsWithDistances = doctorsList.map(doctor => {
        // Skip if doctor has no coordinates
        if (!doctor.latitude || !doctor.longitude) {
          return {
            ...doctor,
            distance: null
          };
        }
        
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
      
      console.log(`Distance calculation completed for ${doctorsWithDistances.length} doctors`);
      console.log('Sample distances:', doctorsWithDistances.slice(0, 3).map(d => d.distance));
      
      // Set doctors with distances
      setDoctors(doctorsWithDistances);
      
      // Initial sort by distance
      const sortedDoctors = [...doctorsWithDistances].sort((a, b) => {
        const distA = typeof a.distance === 'number' ? a.distance : Infinity;
        const distB = typeof b.distance === 'number' ? b.distance : Infinity;
        return distA - distB;
      });
      
      setFilteredDoctors(sortedDoctors);
      
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
    setApplyingFilters(!applyingFilters); // Toggle to trigger the useEffect
  };
  
  const removeFilter = (filterType) => {
    switch(filterType) {
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
    setApplyingFilters(!applyingFilters); // Toggle to trigger the useEffect
  };

  const filterAndSortDoctors = () => {
    let filtered = [...doctors];
    console.log('Sorting by:', sortBy, 'Order:', sortOrder);
    
    // Filter by specialty
    if (selectedSpecialty) {
      filtered = filtered.filter(doctor => {
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
      });
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
    
    // Apply filter for consultation fee
    filtered = filtered.filter(doctor => {
      const fee = parseInt(doctor.consultation_fee) || 500;
      return fee <= maxFee;
    });
    
    // Apply filter for distance
    if (userLocation) {
      filtered = filtered.filter(doctor => {
        if (!doctor.distance) return true; // Include if distance unknown
        return doctor.distance <= maxDistance;
      });
    }
    
    // Apply filter for experience
    filtered = filtered.filter(doctor => {
      const experience = parseInt(doctor.experience) || 0;
      return experience >= minExperience;
    });

    // Apply sorting
    switch(sortBy) {
      case 'distance':
        filtered.sort((a, b) => {
          // Convert to number and handle undefined/null values
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
      default: // rating
        filtered.sort((a, b) => {
          const ratingA = parseFloat(a.rating) || 0;
          const ratingB = parseFloat(b.rating) || 0;
          return sortOrder === 'ascending' ? ratingA - ratingB : ratingB - ratingA;
        });
    }

    // Log before sorting
    console.log('Before sorting, first 3 doctors distances:', 
      filtered.slice(0, 3).map(d => ({
        name: d.name, 
        distance: d.distance,
        distanceType: typeof d.distance
      }))
    );
    
    // Fix the distance sorting by ensuring values are numbers
    switch(sortBy) {
      case 'distance':
        filtered.sort((a, b) => {
          // Convert to number and handle undefined/null values
          const distA = typeof a.distance === 'number' ? a.distance : Infinity;
          const distB = typeof b.distance === 'number' ? b.distance : Infinity;
          
          return sortOrder === 'ascending' ? distA - distB : distB - distA;
        });
        break;
      // Other sort cases remain the same...
    }
    
    // Log after sorting
    console.log('After sorting, first 3 doctors distances:', 
      filtered.slice(0, 3).map(d => ({
        name: d.name, 
        distance: d.distance
      }))
    );

    setFilteredDoctors(filtered);
  };

  const toggleSortBy = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle order if same sort type
      setSortOrder(sortOrder === 'ascending' ? 'descending' : 'ascending');
    } else {
      // Set new sort type and default to ascending
      setSortBy(newSortBy);
      setSortOrder('ascending');
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

  // 1. Update the renderDistanceText function to always show distance when available
  const renderDistanceText = (item) => {
    if (!item.distance) return null;
    
    // Format distance text with better visibility
    let distanceText;
    if (item.distance < 1) {
      distanceText = `${(item.distance * 1000).toFixed(0)}m`;
    } else {
      distanceText = `${item.distance.toFixed(1)}km`;
    }
    
    return (
      <View style={styles.distanceContainer}>
        <Icon 
          name="location-outline"
          size={14} 
          color="#0CB69B" 
        />
        <Text style={styles.distanceText}>{distanceText}</Text>
      </View>
    );
  };
  
  // Filter Modal Component
  const FilterModal = () => {
    // Create temporary state values for the sliders
    const [tempMaxFee, setTempMaxFee] = useState(maxFee);
    const [tempMaxDistance, setTempMaxDistance] = useState(maxDistance);
    const [tempMinExperience, setTempMinExperience] = useState(minExperience);
    const [tempSortBy, setTempSortBy] = useState(sortBy);
    const [tempSortOrder, setTempSortOrder] = useState(sortOrder);
    
    // Reset temporary values when modal opens
    useEffect(() => {
      if (showFilterModal) {
        setTempMaxFee(maxFee);
        setTempMaxDistance(maxDistance);
        setTempMinExperience(minExperience);
        setTempSortBy(sortBy);
        setTempSortOrder(sortOrder);
      }
    }, [showFilterModal]);
    
    // Temporary toggle sort function
    const tempToggleSortBy = (newSortBy) => {
      if (tempSortBy === newSortBy) {
        setTempSortOrder(tempSortOrder === 'ascending' ? 'descending' : 'ascending');
      } else {
        setTempSortBy(newSortBy);
        setTempSortOrder('ascending');
      }
    };
    
    // Apply all changes at once
    const handleApplyFilters = () => {
      setMaxFee(tempMaxFee);
      setMaxDistance(tempMaxDistance);
      setMinExperience(tempMinExperience);
      setSortBy(tempSortBy);
      setSortOrder(tempSortOrder);
      setShowFilterModal(false);
      // Trigger filter application with a slight delay
      setTimeout(() => setApplyingFilters(!applyingFilters), 50);
    };
    
    // Handle the temporary remove filter function
    const tempRemoveFilter = (filterType) => {
      switch(filterType) {
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
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.filtersTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {/* Fees Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterHeaderRow}>
                  <Text style={styles.filterTitle}>Fees under</Text>
                  <TouchableOpacity onPress={() => tempRemoveFilter('fees')}>
                    <Text style={styles.removeFilterText}>Remove Fees Filter</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={100}
                    maximumValue={originalMaxFee}
                    step={100}
                    value={tempMaxFee}
                    onValueChange={setTempMaxFee}
                    minimumTrackTintColor="#0CB69B"
                    maximumTrackTintColor="#DDDDDD"
                    thumbTintColor="#0CB69B"
                  />
                  <Text style={styles.sliderValue}>₹{tempMaxFee}</Text>
                </View>
              </View>
              
              {/* Distance Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterHeaderRow}>
                  <Text style={styles.filterTitle}>Distance Under</Text>
                  <TouchableOpacity onPress={() => tempRemoveFilter('distance')}>
                    <Text style={styles.removeFilterText}>Remove Distance Filter</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={originalMaxDistance}
                    step={1}
                    value={tempMaxDistance}
                    onValueChange={setTempMaxDistance}
                    minimumTrackTintColor="#0CB69B"
                    maximumTrackTintColor="#DDDDDD"
                    thumbTintColor="#0CB69B"
                  />
                  <Text style={styles.sliderValue}>{tempMaxDistance} km</Text>
                </View>
              </View>
              
              {/* Experience Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterHeaderRow}>
                  <Text style={styles.filterTitle}>Experience Over</Text>
                  <TouchableOpacity onPress={() => tempRemoveFilter('experience')}>
                    <Text style={styles.removeFilterText}>Remove Experience Filter</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={20}
                    step={1}
                    value={tempMinExperience}
                    onValueChange={setTempMinExperience}
                    minimumTrackTintColor="#0CB69B"
                    maximumTrackTintColor="#DDDDDD"
                    thumbTintColor="#0CB69B"
                  />
                  <Text style={styles.sliderValue}>{tempMinExperience} years</Text>
                </View>
              </View>
              
              {/* Sort By Options */}
              <View style={styles.filterSection}>
                <View style={styles.filterHeaderRow}>
                  <Text style={styles.filterTitle}>Sort By</Text>
                  <TouchableOpacity onPress={() => tempRemoveFilter('sort')}>
                    <Text style={styles.removeFilterText}>Remove Sort Filter</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.sortOptionsContainer}>
                  <View style={styles.sortButtonsRow}>
                    <TouchableOpacity 
                      style={[
                        styles.sortButton, 
                        tempSortBy === 'fees' && styles.activeSortButton
                      ]}
                      onPress={() => tempToggleSortBy('fees')}
                    >
                      <Text style={[
                        styles.sortButtonText,
                        tempSortBy === 'fees' && styles.activeSortButtonText
                      ]}>Fees</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.sortButton, 
                        tempSortBy === 'distance' && styles.activeSortButton
                      ]}
                      onPress={() => tempToggleSortBy('distance')}
                    >
                      <Text style={[
                        styles.sortButtonText,
                        tempSortBy === 'distance' && styles.activeSortButtonText
                      ]}>Distance</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.sortButton, 
                        tempSortBy === 'experience' && styles.activeSortButton
                      ]}
                      onPress={() => tempToggleSortBy('experience')}
                    >
                      <Text style={[
                        styles.sortButtonText,
                        tempSortBy === 'experience' && styles.activeSortButtonText
                      ]}>Experience</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.sortButtonsRow}>
                    <TouchableOpacity 
                      style={[
                        styles.sortButton, 
                        tempSortOrder === 'ascending' && styles.activeSortButton
                      ]}
                      onPress={() => setTempSortOrder('ascending')}
                    >
                      <Text style={[
                        styles.sortButtonText,
                        tempSortOrder === 'ascending' && styles.activeSortButtonText
                      ]}>Low to High</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.sortButton, 
                        tempSortOrder === 'descending' && styles.activeSortButton
                      ]}
                      onPress={() => setTempSortOrder('descending')}
                    >
                      <Text style={[
                        styles.sortButtonText,
                        tempSortOrder === 'descending' && styles.activeSortButtonText
                      ]}>High to Low</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={handleApplyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Add this function to check for active filters
  const hasActiveFilters = () => {
    return maxFee < originalMaxFee || 
           maxDistance < originalMaxDistance || 
           minExperience > 0 ||
           sortBy !== 'distance' ||
           sortOrder !== 'ascending';
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
          onPress={fetchDoctors} 
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
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchActionButton}>
            <Icon name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
        
        <TouchableOpacity 
          onPress={() => setShowFilterModal(true)}
          style={[styles.filterButton, hasActiveFilters() && styles.activeFilterButton]}>
          <Icon 
            name="options-outline" 
            size={20} 
            color={hasActiveFilters() ? "#fff" : "#0CB69B"} 
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
            <Text style={styles.activeFilterText}>{minExperience}+ years exp</Text>
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
              
              {(selectedSpecialty || maxFee < originalMaxFee || maxDistance < originalMaxDistance || minExperience > 0) && (
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    height: '80%',
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
