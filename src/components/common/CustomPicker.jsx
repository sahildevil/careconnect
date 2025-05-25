import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const {width: screenWidth} = Dimensions.get('window');

const CustomPicker = ({
  label,
  selectedValue,
  onValueChange,
  items = [],
  required = false,
  placeholder = 'Select an option',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleSelect = (item) => {
    onValueChange(item);
    setIsVisible(false);
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={[
        styles.item,
        selectedValue === item && styles.selectedItem,
      ]}
      onPress={() => handleSelect(item)}>
      <Text
        style={[
          styles.itemText,
          selectedValue === item && styles.selectedItemText,
        ]}>
        {item}
      </Text>
      {selectedValue === item && (
        <Icon name="checkmark" size={20} color="#0CB69B" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={styles.picker}
        onPress={() => setIsVisible(true)}>
        <Text style={[
          styles.pickerText,
          selectedValue ? styles.selectedText : styles.placeholderText
        ]}>
          {selectedValue || placeholder}
        </Text>
        <Icon name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{label || 'Select Option'}</Text>
              <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                style={styles.list}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickerText: {
    fontSize: 16,
    flex: 1,
  },
  selectedText: {
    color: '#333', 
    fontWeight: '500',
  },
  placeholderText: {
    color: '#999', 
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.85,
    maxHeight: '70%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  list: {
    maxHeight: 300,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedItem: {
    backgroundColor: '#E6F8F6',
    borderRadius: 8,
    borderBottomColor: 'transparent',
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedItemText: {
    color: '#0CB69B',
    fontWeight: '500',
  },
});

export default CustomPicker;