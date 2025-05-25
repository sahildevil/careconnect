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
  TextInput,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {authService} from '../../services/api';
import {
  CustomTextField,
  CustomButton,
  CustomPicker,
  BackButton,
} from '../../components';
import Icon from 'react-native-vector-icons/Ionicons';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    try {
      setLoading(true);
      const userData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone_number: phone.trim(),
        specialty,
        qualification: qualification.trim(),
        experience: experience ? parseInt(experience, 10) : 0,
      };

      console.log('Sending registration data:', JSON.stringify(userData));
      const response = await authService.register(userData, 'doctor');

      if (response.success) {
        Alert.alert(
          'Registration Successful',
          'Your doctor account has been created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login', {userType: 'doctor'}),
            },
          ],
        );
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);

      let errorMessage = error.message || 'Registration failed';

      if (
        errorMessage.toLowerCase().includes('email') &&
        (errorMessage.toLowerCase().includes('already') ||
          errorMessage.toLowerCase().includes('exists'))
      ) {
        Alert.alert(
          'Registration Failed',
          'This email is already registered. Please use another email or login to your existing account.',
        );
      } else {
        Alert.alert('Registration Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <BackButton />

          {/* Direct header code instead of HeaderComponent */}
          <View style={styles.headerContainer}>
            <Text style={styles.logoText}>CareConnect</Text>
            <Text style={styles.headerText}>Doctor Registration</Text>
            {/* <Text style={styles.subHeaderText}>Join our healthcare network</Text> */}
          </View>

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
              required
            />

            <CustomTextField
              placeholder="Years of Experience"
              value={experience}
              onChangeText={setExperience}
              keyboardType="number-pad"
            />

            {/* Password Input with Eye Button */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}>
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input with Eye Button */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm Password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Icon
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

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
    marginBottom: 20,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0CB69B',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 12,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 15,
    paddingLeft: 10,
  },
});

export default DoctorSignUp;
