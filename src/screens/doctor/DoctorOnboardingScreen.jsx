import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';
import {doctorService} from '../../services/api';
import {CustomTextField, CustomButton, CustomPicker} from '../../components';

const DaysOfWeekPicker = ({selectedDays, onDayToggle}) => {
  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  return (
    <View style={styles.daysContainer}>
      {daysOfWeek.map(day => (
        <CustomButton
          key={day}
          title={day.substring(0, 3)}
          onPress={() => onDayToggle(day)}
          style={[
            styles.dayButton,
            selectedDays.includes(day) ? styles.selectedDayButton : null,
          ]}
          textStyle={[
            styles.dayButtonText,
            selectedDays.includes(day) ? styles.selectedDayButtonText : null,
          ]}
        />
      ))}
    </View>
  );
};

const DoctorOnboardingScreen = () => {
  const {user, updateUser} = useAuth();
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Add console log for debugging
  useEffect(() => {
    console.log('Current user data in onboarding:', user);
  }, [user]);

  // Form data
  const [consultationFee, setConsultationFee] = useState('');
  const [selectedDays, setSelectedDays] = useState([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
  ]);
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('5:00 PM');
  const [locationLink, setLocationLink] = useState('');
  const [bio, setBio] = useState('');

  const timeSlots = [
    '7:00 AM',
    '8:00 AM',
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
    '5:00 PM',
    '6:00 PM',
    '7:00 PM',
    '8:00 PM',
  ];

  const handleDayToggle = day => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!consultationFee.trim()) {
        Alert.alert('Required', 'Please enter your consultation fee');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedDays.length === 0) {
        Alert.alert('Required', 'Please select at least one day');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      completeOnboarding();
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      setLoading(true);

      // Make sure we have the user id
      if (!user || !user.id) {
        throw new Error('User data is missing. Please log in again.');
      }

      const onboardingData = {
        doctor_id: user.id,
        consultation_fee: parseFloat(consultationFee),
        available_days: selectedDays.join(','),
        available_hours: `${startTime} - ${endTime}`,
        location_link: locationLink,
        bio: bio,
      };

      console.log('Sending onboarding data:', onboardingData);

      const response = await doctorService.completeOnboarding(onboardingData);

      if (response.success) {
        // Update local user data to reflect onboarding completion
        updateUser({
          ...user,
          profile: {
            ...user.profile,
            consultation_fee: parseFloat(consultationFee),
            available_days: selectedDays.join(','),
            available_hours: `${startTime} - ${endTime}`,
            location_link: locationLink,
            bio: bio,
            onboarding_complete: true,
            is_visible: true,
          },
        });

        Alert.alert(
          'Onboarding Complete',
          'Your profile is now visible to patients. You can update these details anytime from your profile.',
          [
            {
              text: 'OK',
              onPress: () =>
                navigation.reset({
                  index: 0,
                  routes: [{name: 'DoctorFlow'}],
                }),
            },
          ],
        );
      } else {
        throw new Error(response.message || 'Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert(
        'Error',
        error.message || 'Something went wrong with the onboarding process',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.stepText}>Step {currentStep} of 3</Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}>
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconContainer}>
                <Icon name="cash-outline" size={50} color="#0CB69B" />
              </View>
              <Text style={styles.stepTitle}>Set Your Consultation Fee</Text>
              <Text style={styles.stepDescription}>
                Enter the fee you'd like to charge for each consultation. This
                can be updated later from your profile.
              </Text>

              <View style={styles.feeContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <CustomTextField
                  value={consultationFee}
                  onChangeText={setConsultationFee}
                  placeholder="Amount"
                  keyboardType="numeric"
                  style={styles.feeInput}
                />
              </View>
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconContainer}>
                <Icon name="calendar-outline" size={50} color="#0CB69B" />
              </View>
              <Text style={styles.stepTitle}>Set Your Availability</Text>
              <Text style={styles.stepDescription}>
                Select the days and times you're available for appointments.
              </Text>

              <Text style={styles.sectionLabel}>Available Days</Text>
              <DaysOfWeekPicker
                selectedDays={selectedDays}
                onDayToggle={handleDayToggle}
              />

              <Text style={styles.sectionLabel}>Working Hours</Text>
              <View style={styles.timeContainer}>
                <View style={styles.timePickerContainer}>
                  <Text style={styles.timeLabel}>From</Text>
                  <CustomPicker
                    selectedValue={startTime}
                    onValueChange={setStartTime}
                    items={timeSlots.map(time => ({
                      label: time,
                      value: time,
                    }))}
                    style={styles.timePicker}
                  />
                </View>

                <View style={styles.timePickerContainer}>
                  <Text style={styles.timeLabel}>To</Text>
                  <CustomPicker
                    selectedValue={endTime}
                    onValueChange={setEndTime}
                    items={timeSlots.map(time => ({
                      label: time,
                      value: time,
                    }))}
                    style={styles.timePicker}
                  />
                </View>
              </View>
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconContainer}>
                <Icon name="location-outline" size={50} color="#0CB69B" />
              </View>
              <Text style={styles.stepTitle}>Additional Information</Text>
              <Text style={styles.stepDescription}>
                Add your practice location and a short bio to help patients
                learn more about you.
              </Text>

              <Text style={styles.sectionLabel}>
                Practice Location (Optional)
              </Text>
              <CustomTextField
                value={locationLink}
                onChangeText={setLocationLink}
                placeholder="Google Maps link to your practice"
                style={styles.input}
              />

              <Text style={styles.sectionLabel}>Bio (Optional)</Text>
              <CustomTextField
                value={bio}
                onChangeText={setBio}
                placeholder="Write a short description about yourself, your specialties, and your practice"
                multiline
                style={styles.bioInput}
              />

              <Text style={styles.note}>
                You can update all this information anytime from your profile
                settings.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 1 && (
            <CustomButton
              title="Back"
              onPress={handleBackStep}
              style={styles.backButton}
              textStyle={styles.backButtonText}
              disabled={loading}
            />
          )}

          <CustomButton
            title={currentStep < 3 ? 'Next' : 'Complete Setup'}
            onPress={handleNextStep}
            style={styles.nextButton}
            loading={loading}
            disabled={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#0CB69B',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stepText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  stepContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(12, 182, 155, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#333',
  },
  feeInput: {
    flex: 1,
    fontSize: 18,
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  dayButton: {
    margin: 5,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedDayButton: {
    backgroundColor: '#0CB69B',
    borderColor: '#0CB69B',
  },
  dayButtonText: {
    color: '#333',
  },
  selectedDayButtonText: {
    color: '#fff',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  timePickerContainer: {
    width: '48%',
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timePicker: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  input: {
    width: '100%',
  },
  bioInput: {
    width: '100%',
    height: 120,
    textAlignVertical: 'top',
  },
  note: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    flex: 1,
    marginRight: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0CB69B',
  },
  backButtonText: {
    color: '#0CB69B',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#0CB69B',
  },
});

export default DoctorOnboardingScreen;
