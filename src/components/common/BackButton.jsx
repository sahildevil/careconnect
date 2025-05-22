import React from 'react';
import {StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';

const BackButton = ({onPress, color = '#0CB69B', style = {}}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity style={[styles.backButton, style]} onPress={handlePress}>
      <Icon name="arrow-back" size={24} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    marginTop: 10,
    marginBottom: 10,
  },
});

export default BackButton;
