import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {appointmentService} from '../../services/api';
import {useAuth} from '../../context/AuthContext';
import {useAppointments} from '../../context/AppointmentContext';
import {
  BackButton,
  CustomButton,
  CustomTextField,
  HeaderComponent,
} from '../../components';

// Helper function to convert local time to UTC
const convertLocalTimeToUTC = (date, timeStr) => {
  const [hours, minutes] = timeStr.split(':');

  // Create a date object with the local date and time
  const localDate = new Date(date);
  localDate.setHours(parseInt(hours, parseInt(minutes), 0, 0));

  // Get UTC components
  const utcHours = localDate.getUTCHours();
  const utcMinutes = localDate.getUTCMinutes();

  // Return formatted UTC time
  return `${utcHours}:${utcMinutes === 0 ? '00' : utcMinutes}`;
};

// Helper function to convert UTC time to local
const convertUTCToLocalTime = (date, utcTimeStr) => {
  const [hours, minutes] = utcTimeStr.split(':');

  // Create a date object with the given date and UTC time
  const utcDate = new Date(date);
  utcDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);

  // Get local components
  const localHours = utcDate.getHours();
  const localMinutes = utcDate.getMinutes();

  // Format hours for 12-hour clock
  let hour12 = localHours % 12;
  if (hour12 === 0) hour12 = 12;
  const period = localHours >= 12 ? 'PM' : 'AM';

  // Return formatted local time
  return `${hour12}:${localMinutes === 0 ? '00' : localMinutes} ${period}`;
};

// Helper function to generate time slots
const generateTimeSlots = (startHour = 9, endHour = 17) => {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    const time = `${hour % 12 === 0 ? 12 : hour % 12}:00 ${
      hour >= 12 ? 'PM' : 'AM'
    }`;
    slots.push(time);

    if (hour < endHour - 1) {
      const halfHourTime = `${hour % 12 === 0 ? 12 : hour % 12}:30 ${
        hour >= 12 ? 'PM' : 'AM'
      }`;
      slots.push(halfHourTime);
    }
  }
  return slots;
};

const BookAppointmentScreen = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();
  const {doctor} = route.params;
  const { addAppointment } = useAppointments();

  // Add a new ref to track the refresh interval
  const refreshIntervalRef = useRef(null);
  // Add ref for app state
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (doctor) {
      console.log('Doctor details:', {
        id: doctor.id,
        name: doctor.name,
        availableDays: doctor.available_days,
        availableHours: doctor.available_hours,
      });
    }
  }, [doctor]);

  useEffect(() => {
    // Parse doctor's available days from the doctor object
    const availableDayNames = doctor?.available_days
      ? doctor.available_days.split(',').map(day => day.trim())
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']; // Default if not specified

    console.log('Doctor available days:', availableDayNames);

    // Map day names to JavaScript day numbers (0 = Sunday, 1 = Monday, etc.)
    const dayNameToNumber = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    // Convert available day names to day numbers
    const availableDayNumbers = availableDayNames.map(
      dayName => dayNameToNumber[dayName],
    );

    // Generate dates for the next 14 days (to ensure we get some valid days)
    const dates = [];
    const today = new Date();

    for (let i = 1; i <= 14; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);

      // Only add dates that match the doctor's available days
      if (availableDayNumbers.includes(date.getDay())) {
        dates.push(date);
      }
    }

    // Limit to first 7 available dates
    setAvailableDates(dates.slice(0, 7));
  }, [doctor?.available_days]);

  useEffect(() => {
    if (selectedDate && doctor?.id) {
      // Parse doctor's available hours if present
      let startHour = 9; // Default start hour
      let endHour = 17; // Default end hour

      if (doctor?.available_hours) {
        try {
          const hoursParts = doctor.available_hours.split('-');
          if (hoursParts.length === 2) {
            const startTime = hoursParts[0].trim();
            const endTime = hoursParts[1].trim();

            // Parse start time (e.g. "9:00 AM" or "2:00 PM")
            if (startTime.includes('AM')) {
              startHour = parseInt(startTime.split(':')[0]);
              if (startHour === 12) startHour = 0; // 12 AM = 0 hour
            } else if (startTime.includes('PM')) {
              startHour = parseInt(startTime.split(':')[0]);
              if (startHour !== 12) startHour += 12; // Convert to 24-hour format
            }

            // Parse end time
            if (endTime.includes('AM')) {
              endHour = parseInt(endTime.split(':')[0]);
              if (endHour === 12) endHour = 0;
            } else if (endTime.includes('PM')) {
              endHour = parseInt(endTime.split(':')[0]);
              if (endHour !== 12) endHour += 12;
            }

            console.log(`Parsed hours: ${startHour} to ${endHour}`);
          }
        } catch (error) {
          console.error('Error parsing doctor hours:', error);
        }
      }

      // Generate time slots based on the doctor's available hours
      const slots = generateTimeSlots(startHour, endHour);
      setTimeSlots(slots);
      setSelectedTime(null); // Reset selected time when date changes

      // Fetch booked slots for this doctor on this date
      fetchBookedSlots(selectedDate);
    }
  }, [selectedDate, doctor?.id]);

  // Set up automatic refresh with cleanup
  useEffect(() => {
    // Start refresh interval when a date is selected
    if (selectedDate && doctor?.id) {
      // Initial fetch
      fetchBookedSlots(selectedDate);

      // Set up interval to check for updates every 10 seconds
      refreshIntervalRef.current = setInterval(() => {
        console.log('Auto-refreshing appointment slots for real-time updates');
        fetchBookedSlots(selectedDate, true); // true flag for silent refresh
      }, 10000); // 10 seconds interval (reduced from 15 for faster updates)

      // Listen for app state changes
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          // App has come to the foreground - refresh immediately
          console.log(
            'App returned to foreground, refreshing slots immediately',
          );
          fetchBookedSlots(selectedDate);
        }
        appStateRef.current = nextAppState;
      });

      // Cleanup function
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
        subscription?.remove();
      };
    }
  }, [selectedDate, doctor?.id]);

  // Update the fetchBookedSlots function

  const fetchBookedSlots = async (date, silent = false) => {
    try {
      // Only show loading indicator if not a silent refresh
      if (!silent) {
        setLoadingSlots(true);
      }

      console.log(
        `Fetching booked slots for ${date.toISOString().split('T')[0]} (User: ${
          user?.id
        })`,
      );

      const response = await appointmentService.getAvailableSlots(
        doctor.id,
        date,
      );

      if (response.success) {
        console.log('Server returned booked slots:', {
          utcSlots: response.bookedSlots,
          totalBookings: response.totalBookings,
          requestedBy: response.requestedBy,
          timestamp: response.timestamp,
        });

        // Store the previous booked slots for comparison
        const previousBookedSlots = [...bookedSlots];

        // Convert UTC booked slots to local time formats that match your UI
        const localBookedTimes = [];

        if (response.bookedSlots && Array.isArray(response.bookedSlots)) {
          response.bookedSlots.forEach(utcTime => {
            // Convert UTC time to local display format
            const [utcHours, utcMinutes] = utcTime
              .split(':')
              .map(part => parseInt(part, 10));

            const localDate = new Date(date);
            localDate.setUTCHours(utcHours, utcMinutes, 0, 0);

            let localHour = localDate.getHours();
            const localMinute = localDate.getMinutes();
            const period = localHour >= 12 ? 'PM' : 'AM';

            localHour = localHour % 12;
            if (localHour === 0) localHour = 12;

            const formattedLocalTime = `${localHour}:${
              localMinute === 0 ? '00' : localMinute
            } ${period}`;
            localBookedTimes.push(formattedLocalTime);
          });

          // Check for newly booked slots
          const newBookings = localBookedTimes.filter(
            time => !previousBookedSlots.includes(time),
          );

          // If there are new bookings and this isn't the initial load, show an alert
          if (
            newBookings.length > 0 &&
            previousBookedSlots.length > 0 &&
            !silent
          ) {
            Alert.alert(
              'Booking Update',
              `Some time slots have just been booked: ${newBookings.join(
                ', ',
              )}`,
              [{text: 'OK'}],
            );
          }

          // If the selected time slot is now booked, clear the selection
          if (selectedTime && localBookedTimes.includes(selectedTime)) {
            setSelectedTime(null);
            if (!silent) {
              Alert.alert(
                'Time Slot No Longer Available',
                'The time slot you selected has been booked by someone else. Please select another time.',
                [{text: 'OK'}],
              );
            }
          }

          console.log(
            `Converted to local times: ${localBookedTimes.length} slots`,
            localBookedTimes,
          );
          setBookedSlots(localBookedTimes);
        } else {
          console.log('No booked slots found');
          setBookedSlots([]);
        }
      }
    } catch (error) {
      console.error('Error fetching booked slots:', error);
      // Don't clear booked slots on error to prevent showing false availability
    } finally {
      if (!silent) {
        setLoadingSlots(false);
      }
    }
  };

  const handleDateSelection = date => {
    setSelectedDate(date);
  };

  const handleTimeSelection = time => {
    setSelectedTime(time);
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please select date and time for appointment');
      return;
    }

    try {
      setLoading(true);

      // Convert the selected local time to a UTC appointment date
      const appointmentDate = new Date(selectedDate);
      const [timeStr, period] = selectedTime.split(' ');
      const [hours, minutes] = timeStr.split(':');
      let hour = parseInt(hours);

      // Convert to 24-hour format
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      // Set the hours and minutes in the local date object
      appointmentDate.setHours(hour, parseInt(minutes), 0, 0);

      // Log appointment date in local timezone for debugging
      console.log('Local appointment date:', appointmentDate.toString());
      console.log('UTC appointment date:', appointmentDate.toISOString());

      const appointmentData = {
        patient_id: user.id,
        doctor_id: doctor.id,
        appointment_date: appointmentDate.toISOString(), 
        reason: reason,
        appointment_type: 'consultation',
      };

      console.log('Booking appointment with data:', appointmentData);
      const response = await appointmentService.bookAppointment(
        appointmentData,
      );

      if (response.success) {
        // When booking is successful, add the selected time to the booked slots
        if (!bookedSlots.includes(selectedTime)) {
          setBookedSlots([...bookedSlots, selectedTime]);
        }

        // Create a complete appointment object with doctor data
        const newAppointment = {
          ...response.appointment,
          doctor: doctor, // Include doctor information for display
          status: 'pending',
        };
        
        // Add the new appointment to the context
        addAppointment(newAppointment);

        Alert.alert(
          'Appointment Requested',
          'Your appointment request has been sent to Dr. ' +
            doctor.name +
            ' and is pending approval. You will be notified once it is confirmed.',
          [
            {
              text: 'View Appointments',
              onPress: () => navigation.navigate('Appointments'),
            },
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = date => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: date.toLocaleString('default', {month: 'short'}),
    };
  };

  // Update the refreshSlotAvailability function
  const refreshSlotAvailability = () => {
    if (selectedDate) {
      fetchBookedSlots(selectedDate);
      // Also reset the interval timer when manually refreshed
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = setInterval(() => {
          fetchBookedSlots(selectedDate, true);
        }, 15000);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton color="#fff" />
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.doctorInfoCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{doctor.name.charAt(0)}</Text>
            </View>
          </View>

          <View style={styles.doctorDetails}>
            <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
            <Text style={styles.specialtyText}>{doctor.specialty}</Text>

            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>{doctor.rating || '4.8'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateScrollView}>
            {availableDates.map((date, index) => {
              const formattedDate = formatDate(date);
              const isSelected =
                selectedDate &&
                selectedDate.getDate() === date.getDate() &&
                selectedDate.getMonth() === date.getMonth();

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateItem,
                    isSelected && styles.selectedDateItem,
                  ]}
                  onPress={() => handleDateSelection(date)}>
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.selectedDateText,
                    ]}>
                    {formattedDate.day}
                  </Text>
                  <Text
                    style={[
                      styles.dateText,
                      isSelected && styles.selectedDateText,
                    ]}>
                    {formattedDate.date}
                  </Text>
                  <Text
                    style={[
                      styles.monthText,
                      isSelected && styles.selectedDateText,
                    ]}>
                    {formattedDate.month}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {selectedDate && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Select Time</Text>

            {loadingSlots ? (
              <View style={styles.loadingSlots}>
                <ActivityIndicator size="small" color="#0CB69B" />
                <Text style={{marginTop: 10, color: '#666'}}>
                  Checking available slots...
                </Text>
              </View>
            ) : (
              <>
                {/* Add a refresh button above the time slots */}
                <View style={styles.refreshContainer}>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={refreshSlotAvailability}>
                    <Icon name="refresh" size={16} color="#0CB69B" />
                    <Text style={styles.refreshText}>Refresh availability</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.timeSlotContainer}>
                  {timeSlots.map((time, index) => {
                    // Check if this slot is already booked by comparing directly with the bookedSlots array
                    const isBooked = bookedSlots.includes(time);

                    // Add debugging to see what's being compared
                    console.log(
                      `Checking time slot: ${time}, isBooked: ${isBooked}`,
                    );

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.timeSlot,
                          selectedTime === time && styles.selectedTimeSlot,
                          isBooked && styles.bookedTimeSlot,
                        ]}
                        onPress={() => !isBooked && handleTimeSelection(time)}
                        disabled={isBooked}>
                        <Text
                          style={[
                            styles.timeSlotText,
                            selectedTime === time &&
                              styles.selectedTimeSlotText,
                            isBooked && styles.bookedTimeSlotText,
                          ]}>
                          {time}
                          {isBooked && ' 🔒'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Appointment Reason</Text>
          <CustomTextField
            value={reason}
            onChangeText={setReason}
            placeholder="Please specify your reason for consultation"
            multiline
            style={styles.reasonInput}
          />
        </View>

        <View style={styles.noticeCard}>
          <Icon name="information-circle-outline" size={20} color="#0CB69B" />
          <Text style={styles.noticeText}>
            You can cancel your appointment up to 4 hours before the scheduled
            time.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.feeContainer}>
          <Text style={styles.feeLabel}>Consultation Fee</Text>
          <Text style={styles.feeAmount}>
            ₹{doctor.consultation_fee || '500'}
          </Text>
        </View>

        <CustomButton
          title="Book Now"
          onPress={handleBookAppointment}
          loading={loading}
          disabled={!selectedDate || !selectedTime || loading}
          style={[
            styles.bookButton,
            (!selectedDate || !selectedTime) && styles.disabledButton,
          ]}
          textStyle={styles.bookButtonText}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: '#0CB69B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  doctorInfoCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F8F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0CB69B',
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  specialtyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 15,
    marginTop: 0,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  dateScrollView: {
    flexDirection: 'row',
  },
  dateItem: {
    width: 70,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  selectedDateItem: {
    backgroundColor: '#0CB69B',
  },
  dayText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  monthText: {
    fontSize: 14,
    color: '#666',
  },
  selectedDateText: {
    color: '#fff',
  },
  timeSlotContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeSlot: {
    width: '30%',
    padding: 10,
    margin: 5,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#0CB69B',
  },
  bookedTimeSlot: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ddd',
    borderWidth: 1,
    opacity: 0.7,
  },
  timeSlotText: {
    fontSize: 14,
    color: '#333',
  },
  selectedTimeSlotText: {
    color: '#fff',
  },
  bookedTimeSlotText: {
    color: '#999',
  },
  reasonInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
    minHeight: 100,
    fontSize: 16,
  },
  noticeCard: {
    backgroundColor: '#E6F8F6',
    flexDirection: 'row',
    padding: 15,
    margin: 15,
    marginTop: 0,
    borderRadius: 10,
    alignItems: 'center',
  },
  noticeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  footer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  feeContainer: {},
  feeLabel: {
    fontSize: 12,
    color: '#666',
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bookButton: {
    backgroundColor: '#0CB69B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loadingSlots: {
    alignItems: 'center',
    padding: 20,
  },
  refreshContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#E6F8F6',
  },
  refreshText: {
    marginLeft: 5,
    color: '#0CB69B',
    fontSize: 14,
  },
});

export default BookAppointmentScreen;
