import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';
import {useNavigation} from '@react-navigation/native';
import {CustomTextField, CustomButton, HeaderComponent} from '../../components';

const PatientProfileScreen = () => {
  const {user, logout} = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // User data state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [address, setAddress] = useState(user?.address || '');

  // Get user data on component mount
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone_number || '');
      setAddress(user.address || '');
    }
  }, [user]);

  const handleSaveProfile = () => {
    setLoading(true);

    // Here you would call your API to update the profile
    // For now we'll just simulate a delay and success
    setTimeout(() => {
      setLoading(false);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    }, 1000);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: logout,
        style: 'destructive',
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          onPress={() => setIsEditing(!isEditing)}
          style={styles.editButton}>
          <Icon
            name={isEditing ? 'close-outline' : 'create-outline'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImage}>
                <Text style={styles.profileInitial}>
                  {name ? name[0].toUpperCase() : 'U'}
                </Text>
              </View>
              {isEditing && (
                <TouchableOpacity style={styles.changePhotoButton}>
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoField}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              {isEditing ? (
                <CustomTextField
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  style={styles.input}
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
                <CustomTextField
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              ) : (
                <Text style={styles.fieldValue}>{phone || 'Not provided'}</Text>
              )}
            </View>

            <View style={styles.infoField}>
              <Text style={styles.fieldLabel}>Address</Text>
              {isEditing ? (
                <CustomTextField
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter your address"
                  multiline
                  style={styles.input}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {address || 'Not provided'}
                </Text>
              )}
            </View>
          </View>

          {isEditing && (
            <CustomButton
              title="Save Changes"
              onPress={handleSaveProfile}
              loading={loading}
              disabled={loading}
              style={styles.saveButton}
            />
          )}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="notifications-outline" size={24} color="#0CB69B" />
            <Text style={styles.menuItemText}>Notifications</Text>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="shield-checkmark-outline" size={24} color="#0CB69B" />
            <Text style={styles.menuItemText}>Privacy & Security</Text>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="help-circle-outline" size={24} color="#0CB69B" />
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="settings-outline" size={24} color="#0CB69B" />
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
    backgroundColor: '#0CB69B',
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
  profileCard: {
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0CB69B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileInitial: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  changePhotoButton: {
    marginTop: 8,
  },
  changePhotoText: {
    color: '#0CB69B',
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
  addressInput: {
    height: 80,
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

export default PatientProfileScreen;
