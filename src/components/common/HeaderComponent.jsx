import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const HeaderComponent = ({
  title,
  subtitle,
  showLogo = true,
  logoText = 'CareConnect',
  style = {},
}) => {
  return (
    <View style={[styles.headerContainer, style]}>
      {showLogo && <Text style={styles.logoText}>{logoText}</Text>}
      <Text style={styles.headerText}>{title}</Text>
      {subtitle && <Text style={styles.subHeaderText}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0CB69B',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
    color: '#666',
  },
});

export default HeaderComponent;
