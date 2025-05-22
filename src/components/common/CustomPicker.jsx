import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {Picker} from '@react-native-picker/picker';

const CustomPicker = ({
  label,
  selectedValue,
  onValueChange,
  items,
  required = false,
  style = {},
}) => {
  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      <View style={[styles.pickerContainer, style]}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={styles.picker}>
          {items.map((item, index) => (
            <Picker.Item
              key={index}
              label={item.label || item}
              value={item.value || item}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  picker: {
    height: 50,
  },
  required: {
    color: 'red',
  },
});

export default CustomPicker;