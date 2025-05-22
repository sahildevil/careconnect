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
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';
import {useNavigation} from '@react-navigation/native';
import {doctorService} from '../../services/api';

const DoctorProfileScreen = () => {
  const {user, logout} = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Doctor data state
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

  // Get doctor data on component mount
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}>
          <Icon
            name={isEditing ? 'close' : 'create-outline'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name.charAt(0)}</Text>
            </View>
            {isEditing && (
              <TouchableOpacity style={styles.changePhotoButton}>
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoField}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                />
              ) : (
                <Text style={styles.fieldValue}>{name}</Text>
              )}
            </View>

            <View style={styles.infoField}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{email}</Text>
            </View>

            <View style={styles.infoField}>
              <Text style={styles.fieldLabel}>Phone</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.fieldValue}>{phone || 'Not provided'}</Text>
              )}
            </View>

            <View style={styles.infoField}>
              <Text style={styles.fieldLabel}>Specialty</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={specialty}
                  onChangeText={setSpecialty}
                  placeholder="Enter your specialty"
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {specialty || 'Not provided'}
                </Text>
              )}
            </View>

            <View style={styles.infoField}>
              <Text style={styles.fieldLabel}>Qualifications</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={qualification}
                  onChangeText={setQualification}
                  placeholder="Enter your qualifications"
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {qualification || 'Not provided'}
                </Text>
              )}
            </View>

            <View style={styles.infoField}>
              <Text style={styles.fieldLabel}>Consultation Fee (₹)</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={consultationFee}
                  onChangeText={setConsultationFee}
                  placeholder="Enter consultation fee"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.fieldValue}>₹{consultationFee || '0'}</Text>
              )}
            </View>

            <View style={styles.infoField}>
              <Text style={styles.fieldLabel}>Available Hours</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={availableHours}
                  onChangeText={setAvailableHours}
                  placeholder="e.g., 09:00 AM - 05:00 PM"
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {availableHours || 'Not provided'}
                </Text>
              )}
            </View>

            <View style={styles.infoField}>
              <Text style={styles.fieldLabel}>Bio</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell patients about yourself"
                  multiline
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {bio || 'No bio provided'}
                </Text>
              )}
            </View>
          </View>

          {isEditing && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('DoctorSchedule')}>
            <Icon name="calendar-outline" size={24} color="#008080" />
            <Text style={styles.menuItemText}>Manage Schedule</Text>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="notifications-outline" size={24} color="#008080" />
            <Text style={styles.menuItemText}>Notifications</Text>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="shield-checkmark-outline" size={24} color="#008080" />
            <Text style={styles.menuItemText}>Privacy & Security</Text>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="help-circle-outline" size={24} color="#008080" />
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="settings-outline" size={24} color="#008080" />
            <Text style={styles.menuItemText}>Settings</Text>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutItem]}
            onPress={handleLogout}>
            <Icon name="log-out-outline" size={24} color="#FF6B6B" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: '#008080',
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#008080',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  changePhotoButton: {
    marginTop: 8,
  },
  changePhotoText: {
    color: '#008080',
    fontSize: 16,
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoField: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
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
    backgroundColor: '#008080',
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
  menuSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 15,
    marginTop: 0,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#FF6B6B',
  },
});

export default DoctorProfileScreen;
