import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';
const { width, height } = Dimensions.get('window');
const Login = ({navigation, route}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('patient');
  const [showPassword, setShowPassword] = useState(false);

  const {login, error} = useAuth();

  useEffect(() => {
    // Get user type from route params if available
    if (route.params?.userType) {
      setUserType(route.params.userType);
    }
  }, [route.params]);

  const handleLogin = async () => {
    // Validate inputs
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await login(email, password, userType);

      if (response.success) {
        if (userType === 'doctor' && response.needsOnboarding) {
          console.log('Redirecting to onboarding...');
          // Use replace instead of navigate to prevent going back to login
          navigation.replace('DoctorOnboarding');
        } else {
          // Normal login flow
          if (userType === 'doctor') {
            navigation.reset({
              index: 0,
              routes: [{name: 'DoctorHome'}],
            });
          } else {
            navigation.reset({
              index: 0,
              routes: [{name: 'PatientFlow'}],
            });
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignUp = () => {
    if (userType === 'doctor') {
      navigation.navigate('DoctorSignUp');
    } else {
      navigation.navigate('SignUp');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
              <View style={styles.topRightShape} />
        <View style={styles.bottomRightShape} />
        <View style={styles.topRightShapee} />
        <View style={styles.bottomRightShapee} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>CareConnect</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>
              {userType === 'doctor' ? 'Doctor Login' : 'Patient Login'}
            </Text>
            <Text style={styles.subtitleText}>Sign in to continue</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor={'#999'}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor={'#999'}
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

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.switchUserTypeContainer}>
              <TouchableOpacity
                onPress={() => navigation.navigate('UserTypeSelection')}>
                <Text style={styles.switchUserTypeText}>
                  Switch to {userType === 'doctor' ? 'Patient' : 'Doctor'} login
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={navigateToSignUp}>
                <Text style={styles.signupButtonText}>Sign Up</Text>
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
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 30,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0CB69B',
  },
  formContainer: {
    width: '100%',
    padding: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#0CB69B',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#0CB69B',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
    height: 60,
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchUserTypeContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  switchUserTypeText: {
    color: '#0CB69B',
    fontSize: 14,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#666',
    fontSize: 16,
  },
  signupButtonText: {
    color: '#0CB69B',
    fontSize: 16,
    fontWeight: 'bold',
  },
    topRightShape: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.7 / 2,
    backgroundColor: '#5cedd7',//#0CB69B
    zIndex: 1,
  },
  bottomRightShape: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.7 / 2,
    backgroundColor: '#5cedd7',//#0CB69B
    zIndex: 1,
  },
  topRightShapee: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: width * 0.7 / 2,
    backgroundColor: '#f8f8f8',//#0CB69B
    zIndex: 0,
  },
  bottomRightShapee: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: width * 0.7 / 2,
    backgroundColor: '#f8f8f8',//#0CB69B
    zIndex: 0,
  },
});

export default Login;
