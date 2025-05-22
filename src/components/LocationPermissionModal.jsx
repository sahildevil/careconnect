import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const LocationPermissionModal = ({visible, onRequestClose, onPermissionSelect}) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onRequestClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <Icon name="location" size={36} color="#4a89f3" />
          </View>
          
          <Text style={styles.titleText}>
            Allow <Text style={styles.appName}>CareConn</Text> to access this
            device's location?
          </Text>
          
          <View style={styles.optionsContainer}>
            <View style={styles.optionRow}>
              <TouchableOpacity 
                style={styles.optionButton}
                onPress={() => onPermissionSelect('precise')}>
                <View style={styles.mapContainer}>
                  <View style={styles.preciseMap}>
                    <View style={styles.preciseMarker} />
                  </View>
                </View>
                <Text style={styles.optionText}>Precise</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.optionButton}
                onPress={() => onPermissionSelect('approximate')}>
                <View style={styles.mapContainer}>
                  <View style={styles.approximateMap}>
                    <View style={styles.approximateMarker} />
                  </View>
                </View>
                <Text style={styles.optionText}>Approximate</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={() => onPermissionSelect('while-using')}>
            <Text style={styles.permissionButtonText}>While using the app</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={() => onPermissionSelect('once')}>
            <Text style={styles.permissionButtonText}>Only this time</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.denyButton}
            onPress={() => onPermissionSelect('deny')}>
            <Text style={styles.denyButtonText}>Don't allow</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 15,
  },
  titleText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  appName: {
    fontWeight: 'bold',
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 15,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  optionButton: {
    alignItems: 'center',
    padding: 10,
  },
  mapContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 8,
  },
  preciseMap: {
    width: '100%',
    height: '100%',
    backgroundColor: '#434343',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approximateMap: {
    width: '100%',
    height: '100%',
    backgroundColor: '#434343',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preciseMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4a89f3',
    shadowColor: '#4a89f3',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.7,
  },
  approximateMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4a89f3',
  },
  optionText: {
    color: 'white',
    marginTop: 5,
  },
  permissionButton: {
    width: '100%',
    paddingVertical: 12,
    marginVertical: 5,
  },
  permissionButtonText: {
    color: '#4a89f3',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
  },
  denyButton: {
    width: '100%',
    paddingVertical: 12,
    marginTop: 5,
  },
  denyButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default LocationPermissionModal;