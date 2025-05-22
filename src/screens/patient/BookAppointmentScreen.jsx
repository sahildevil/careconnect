import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {appointmentService} from '../../services/api';
import {useAuth} from '../../context/AuthContext';

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

  const navigation = useNavigation();
  const route = useRoute();
  const {user} = useAuth();
  const {doctor} = route.params;

  useEffect(() => {
    // Generate dates for the next 7 days (excluding today)
    const dates = [];
    const today = new Date();

    // Start from tomorrow
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);

      // Skip Sundays (assuming doctor is not available on Sundays)
      if (date.getDay() !== 0) {
        dates.push(date);
      }
    }

    setAvailableDates(dates);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      // Generate time slots based on selected date
      const day = selectedDate.getDay();

      // Adjust time slots based on day of week (e.g., shorter hours on Saturday)
      const isSaturday = day === 6;
      const slots = generateTimeSlots(9, isSaturday ? 13 : 17);

      setTimeSlots(slots);
      setSelectedTime(null); // Reset selected time when date changes
    }
  }, [selectedDate]);

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

      // Convert date and time to appointment_date
      const appointmentDate = new Date(selectedDate);
      const [timeStr, period] = selectedTime.split(' ');
      const [hours, minutes] = timeStr.split(':');
      let hour = parseInt(hours);

      // Convert to 24-hour format
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      appointmentDate.setHours(hour, parseInt(minutes), 0, 0);

      const appointmentData = {
        doctor_id: doctor.id,
        appointment_date: appointmentDate.toISOString(),
        reason: reason,
        appointment_type: 'consultation',
      };

      const response = await appointmentService.bookAppointment(
        appointmentData,
      );

      if (response.success) {
        Alert.alert('Success', 'Appointment booked successfully!', [
          {
            text: 'View Appointments',
            onPress: () => navigation.navigate('Appointments'),
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
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
            <View style={styles.timeSlotContainer}>
              {timeSlots.map((time, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeSlot,
                    selectedTime === time && styles.selectedTimeSlot,
                  ]}
                  onPress={() => handleTimeSelection(time)}>
                  <Text
                    style={[
                      styles.timeSlotText,
                      selectedTime === time && styles.selectedTimeSlotText,
                    ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Reason for Visit</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Tell the doctor about your symptoms..."
            value={reason}
            onChangeText={setReason}
            multiline
            textAlignVertical="top"
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

        <TouchableOpacity
          style={styles.bookButton}
          onPress={handleBookAppointment}
          disabled={loading || !selectedDate || !selectedTime}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
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
  timeSlotText: {
    fontSize: 14,
    color: '#333',
  },
  selectedTimeSlotText: {
    color: '#fff',
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
});

export default BookAppointmentScreen;
