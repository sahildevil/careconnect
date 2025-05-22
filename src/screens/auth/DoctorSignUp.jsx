import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {authService} from '../../services/api';
import {
  CustomTextField,
  CustomButton,
  CustomPicker,
  HeaderComponent,
  BackButton,
} from '../../components';

const specialties = [
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Gynecology',
  'Ophthalmology',
  'General Medicine',
  'Other',
];

const DoctorSignUp = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [specialty, setSpecialty] = useState(specialties[0]);
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleSignUp = async () => {
    // Validate inputs
    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim() ||
      !specialty.trim() ||
      !qualification.trim()
    ) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name,
        email,
        password,
        phone_number: phone,
        specialty,
        qualification,
        experience: experience ? parseInt(experience, 10) : 0,
      };

      const response = await authService.register(userData, 'doctor');
      setLoading(false);

      Alert.alert(
        'Registration Successful',
        'Your account has been created and is pending approval. You will be notified when your account is approved.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login', {userType: 'doctor'}),
          },
        ],
      );
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Registration Failed',
        error.message || 'Something went wrong',
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <BackButton />

          <HeaderComponent
            title="Doctor Registration"
            subtitle="Join our healthcare network"
          />

          <View style={styles.formContainer}>
            <CustomTextField
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              required
            />

            <CustomTextField
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              required
            />

            <CustomTextField
              placeholder="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <CustomPicker
              label="Specialty"
              selectedValue={specialty}
              onValueChange={itemValue => setSpecialty(itemValue)}
              items={specialties}
              required
            />

            <CustomTextField
              placeholder="Qualifications"
              value={qualification}
              onChangeText={setQualification}
              multiline
              required
            />

            <CustomTextField
              placeholder="Years of Experience"
              value={experience}
              onChangeText={setExperience}
              keyboardType="number-pad"
            />

            <CustomTextField
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              required
            />

            <CustomTextField
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              required
            />

            <Text style={styles.noteText}>* Required fields</Text>

            <CustomButton
              title="Register"
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
            />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Login', {userType: 'doctor'})
                }>
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 10,
  },
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
  formContainer: {
    width: '100%',
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  loginText: {
    color: '#666',
    fontSize: 16,
  },
  loginButtonText: {
    color: '#0CB69B',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DoctorSignUp;
