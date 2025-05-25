import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import {useAuth} from '../../context/AuthContext';
import {useNavigation} from '@react-navigation/native';
import {doctorService} from '../../services/api';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const MenuLink = ({icon, title, onPress}) => (
  <TouchableOpacity style={styles.menuLink} onPress={onPress}>
    <View style={styles.menuIconContainer}>
      <Icon name={icon} size={22} color="#0CB69B" />
    </View>
    <Text style={styles.menuLinkText}>{title}</Text>
    <Icon name="chevron-forward-outline" size={20} color="#CCCCCC" />
  </TouchableOpacity>
);

const DoctorProfileScreen = () => {
  const {user, logout, uploadProfilePicture} = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [specialty, setSpecialty] = useState(user?.specialty || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [consultationFee, setConsultationFee] = useState(
    user?.consultation_fee?.toString() || '',
  );
  const [qualification, setQualification] = useState(user?.qualification || '');
  const [availableHours, setAvailableHours] = useState(
    user?.available_hours || '',
  );

  useEffect(() => {
    if (user) {
      fetchDoctorDetails();
    }
  }, [user]);

  const fetchDoctorDetails = async () => {
    try {
      setLoading(true);
      const response = await doctorService.getDoctorProfile();

      if (response.success) {
        const doctorData = response.doctor;
        setName(doctorData.name || '');
        setEmail(doctorData.email || '');
        setPhone(doctorData.phone_number || '');
        setSpecialty(doctorData.specialty || '');
        setBio(doctorData.bio || '');
        setConsultationFee(doctorData.consultation_fee?.toString() || '');
        setQualification(doctorData.qualification || '');
        setAvailableHours(doctorData.available_hours || '');
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      const updatedData = {
        name,
        phone_number: phone,
        specialty,
        bio,
        consultation_fee: parseFloat(consultationFee) || 0,
        qualification,
        available_hours: availableHours,
      };

      const response = await doctorService.updateDoctorProfile(updatedData);

      if (response.success) {
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditing(false);
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Yes',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Select Profile Picture',
      'Choose an option to update your profile picture',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Choose from Library',
          onPress: openImageLibrary,
        },
      ]
    );
  };

  const openImageLibrary = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const imageUri = response.assets[0].uri;
        setImageLoading(true);

        try {
          const result = await uploadProfilePicture(imageUri);
          
          if (result.success) {
            Alert.alert('Success', 'Profile picture updated successfully!');
            fetchDoctorDetails();
          } else {
            Alert.alert('Error', result.message || 'Failed to update profile picture');
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to update profile picture. Please try again.');
        } finally {
          setImageLoading(false);
        }
      }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0CB69B" />
      
      {/* Header Section */}
      <View 
        style={[
          styles.headerSection, 
          {paddingTop: insets.top + 10}
        ]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Icon name={isEditing ? "close-outline" : "create-outline"} size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="notifications-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Profile Info Section */}
        <TouchableOpacity 
          style={styles.profilePreview}
          onPress={handleImagePicker}
        >
          <View style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <Image 
                source={{uri: user.avatar_url}} 
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'D'}
                </Text>
              </View>
            )}
            {imageLoading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#FFFFFF" size="small" />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{"Dr. " + (name || 'Doctor')}</Text>
          {specialty && (
            <Text style={styles.profileSpecialty}>{specialty}</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.contentSection}>
        {/* Doctor Info Section*/}
        {isEditing && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>
            <View style={styles.formContainer}>
              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                />
              </View>
              
              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>Specialty</Text>
                <TextInput
                  style={styles.input}
                  value={specialty}
                  onChangeText={setSpecialty}
                  placeholder="Enter your specialty"
                />
              </View>
              
              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>Qualifications</Text>
                <TextInput
                  style={styles.input}
                  value={qualification}
                  onChangeText={setQualification}
                  placeholder="Enter your qualifications"
                />
              </View>
              
              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>Consultation Fee (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={consultationFee}
                  onChangeText={setConsultationFee}
                  placeholder="Enter consultation fee"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>Available Hours</Text>
                <TextInput
                  style={styles.input}
                  value={availableHours}
                  onChangeText={setAvailableHours}
                  placeholder="e.g., 09:00 AM - 05:00 PM"
                />
              </View>
              
              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell patients about yourself"
                  multiline
                />
              </View>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Doctor Info Display (When not editing) */}
        {!isEditing && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Professional Details</Text>
            <View style={styles.infoDisplay}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Specialty:</Text>
                <Text style={styles.infoValue}>{specialty || 'Not specified'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Qualifications:</Text>
                <Text style={styles.infoValue}>{qualification || 'Not specified'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Consultation Fee:</Text>
                <Text style={styles.infoValue}>₹{consultationFee || '0'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Available Hours:</Text>
                <Text style={styles.infoValue}>{availableHours || 'Not specified'}</Text>
              </View>
              
              <View style={styles.infoRowBio}>
                <Text style={styles.infoLabel}>About Me:</Text>
                <Text style={styles.bioValue}>{bio || 'No bio provided.'}</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Quick Links Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.menuContainer}>
            <MenuLink 
              icon="calendar-outline" 
              title="Manage Schedule" 
              onPress={() => navigation.navigate('DoctorSchedule')}
            />
            <MenuLink 
              icon="people-outline" 
              title="View Patients" 
              onPress={() => {}}
            />
            <MenuLink 
              icon="stats-chart-outline" 
              title="Practice Analytics" 
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuContainer}>
            <MenuLink 
              icon="shield-checkmark-outline" 
              title="Privacy & Security" 
              onPress={() => {}}
            />
            <MenuLink 
              icon="notifications-outline" 
              title="Notification Preferences" 
              onPress={() => {}}
            />
            <MenuLink 
              icon="help-circle-outline" 
              title="Help & Support" 
              onPress={() => {}}
            />
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Icon name="log-out-outline" size={22} color="#FF6B6B" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerSection: {
    backgroundColor: '#0CB69B',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 20,
    paddingBottom: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 15,
    padding: 5,
  },
  profilePreview: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
    position: 'relative',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#0CB69B',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  profileEmail: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  profileSpecialty: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  contentSection: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#F5F7FA',
  },
  sectionContainer: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  formContainer: {
    marginBottom: 15,
  },
  inputField: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#0CB69B',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoDisplay: {
    backgroundColor: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoRowBio: {
    paddingVertical: 12,
  },
  infoLabel: {
    width: '40%',
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  bioValue: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
    lineHeight: 20,
  },
  menuContainer: {
    backgroundColor: 'white',
  },
  menuLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuIconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 15,
  },
  menuLinkText: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 5,
  },
  logoutText: {
    marginLeft: 15,
    fontSize: 15,
    color: '#FF6B6B',
    flex: 1,
  },
});

export default DoctorProfileScreen;