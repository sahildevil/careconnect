import React from 'react';
import {StyleSheet, TextInput, Text, View} from 'react-native';

const CustomTextField = ({
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry = false,
  multiline = false,
  placeholderTextColor = '#666',
  autoCapitalize = 'sentences',
  style = {},
  required = false,
  label = null,
  error = null,
}) => {
  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      <TextInput
        style={[styles.input, multiline && styles.multilineInput, style]}
        placeholder={placeholder + (required ? ' *' : '')}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        placeholderTextColor={placeholderTextColor}
        autoCapitalize={autoCapitalize}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  required: {
    color: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
});

export default CustomTextField;
