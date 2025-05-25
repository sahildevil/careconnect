import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const MenuLink = ({icon, title}) => (
  <TouchableOpacity style={styles.menuLink}>
    <View style={styles.menuIconContainer}>
      <Icon name={icon} size={22} color="#0CB69B" />
    </View>
    <Text style={styles.menuLinkText}>{title}</Text>
    <Icon name="chevron-forward-outline" size={20} color="#CCCCCC" />
  </TouchableOpacity>
);

const PatientProfileScreen = () => {
  const {user, logout} = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);

  const handleLogout = () => {
    logout();
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
            <TouchableOpacity style={styles.headerButton}>
              <Icon name="create-outline" size={22} color="#FFFFFF" />
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
        <View style={styles.profilePreview}>
          <View style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <Image 
                source={{uri: user.avatar_url}} 
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
        </View>
      </View>
      
      <ScrollView style={styles.contentSection}>
        {/* Others Section */}
                  <Text style={styles.sectionTitle}>Options</Text>
        <View style={styles.sectionContainer}>

          <View style={styles.menuContainer}>
            <MenuLink icon="heart-outline" title="My Favorites" />
            <MenuLink icon="people-outline" title="Community" />
            <MenuLink icon="information-circle-outline" title="About Us" />
            <MenuLink icon="chatbubble-ellipses-outline" title="Customer Service" />
            <MenuLink icon="settings-outline" title="Settings" />
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceItem: {
    width: '18%',
    alignItems: 'center',
    marginBottom: 15,
  },
  serviceIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: 'rgba(12, 182, 155, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
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

export default PatientProfileScreen;