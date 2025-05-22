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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {doctorService} from '../../services/api';

const DoctorListScreen = () => {
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [error, setError] = useState(null);

  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    fetchDoctors();

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
  }, [searchQuery, selectedSpecialty, doctors]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await doctorService.getAllDoctors();

      if (response.success) {
        // Debug: print all specialties in the database
        const specialtiesInDb = [...new Set(response.doctors.map(doc => doc.specialty))];
        console.log('Specialties in database:', specialtiesInDb);
        
        // Only show visible doctors
        const visibleDoctors = response.doctors.filter(doc => doc.is_visible !== false);
        console.log(`Found ${visibleDoctors.length} visible doctors out of ${response.doctors.length}`);
        
        setDoctors(visibleDoctors);
        setFilteredDoctors(visibleDoctors);
      } else {
        setError('Failed to fetch doctors');
        console.error('API returned failure:', response);
      }
    } catch (error) {
      setError('Error connecting to server');
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDoctors = () => {
    let filtered = [...doctors];

    // Filter by specialty - more flexible matching
    if (selectedSpecialty) {
      filtered = filtered.filter(
        doctor => {
          // Handle potential null values and normalize strings
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
          
          // Log the comparison for debugging
          console.log(`No match for: DB="${docSpecialty}" vs Selected="${selectedSpec}"`);
          return false;
        }
      );
      console.log(`After specialty filter: ${filtered.length} doctors match "${selectedSpecialty}"`);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        doctor =>
          (doctor.name || '').toLowerCase().includes(query) ||
          ((doctor.specialty || '').toLowerCase().includes(query)),
      );
      console.log(`After search filter: ${filtered.length} doctors match "${searchQuery}"`);
    }

    setFilteredDoctors(filtered);
  };

  // List of specialties - make sure these match exactly with database values
  const specialties = [
    'Cardiology',
    'Dermatology',
    'Neurology',
    'Orthopedics',  // Changed from 'Orthopedic' to match DoctorSignUp.jsx
    'Pediatrics',
    'Dentist',
    'General Medicine',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
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
});

export default DoctorListScreen;
