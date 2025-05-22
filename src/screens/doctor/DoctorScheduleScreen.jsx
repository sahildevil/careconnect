import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {doctorService} from '../../services/api';

const weekDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const timeSlots = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM',
];

const DoctorScheduleScreen = () => {
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [schedule, setSchedule] = useState({});
  const navigation = useNavigation();

  useEffect(() => {
    fetchDoctorSchedule();
  }, []);

  const fetchDoctorSchedule = async () => {
    try {
      setLoading(true);

      // Initialize default schedule for each day
      const defaultSchedule = {};
      weekDays.forEach(day => {
        defaultSchedule[day] = {
          isAvailable: day !== 'Sunday',
          slots: timeSlots.reduce((acc, slot) => {
            acc[slot] = day !== 'Saturday' && day !== 'Sunday';
            return acc;
          }, {}),
        };
      });

      // Get schedule from API
      const response = await doctorService.getDoctorSchedule();

      if (response.success && response.schedule) {
        setSchedule(response.schedule);
      } else {
        setSchedule(defaultSchedule);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      Alert.alert('Error', 'Failed to load schedule');

      // Set default schedule if API fails
      const defaultSchedule = {};
      weekDays.forEach(day => {
        defaultSchedule[day] = {
          isAvailable: day !== 'Sunday',
          slots: timeSlots.reduce((acc, slot) => {
            acc[slot] = day !== 'Saturday' && day !== 'Sunday';
            return acc;
          }, {}),
        };
      });
      setSchedule(defaultSchedule);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = day => {
    setSchedule(prevSchedule => {
      const updatedDay = {
        ...prevSchedule[day],
        isAvailable: !prevSchedule[day].isAvailable,
      };

      // If day is toggled off, disable all time slots
      if (!updatedDay.isAvailable) {
        for (const slot in updatedDay.slots) {
          updatedDay.slots[slot] = false;
        }
      }

      return {
        ...prevSchedule,
        [day]: updatedDay,
      };
    });
  };

  const handleSlotToggle = (day, slot) => {
    setSchedule(prevSchedule => {
      const updatedSlots = {
        ...prevSchedule[day].slots,
        [slot]: !prevSchedule[day].slots[slot],
      };

      return {
        ...prevSchedule,
        [day]: {
          ...prevSchedule[day],
          slots: updatedSlots,
        },
      };
    });
  };

  const saveSchedule = async () => {
    try {
      setSavingSchedule(true);

      const response = await doctorService.updateSchedule(schedule);

      if (response.success) {
        Alert.alert('Success', 'Schedule updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update schedule');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to update schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0CB69B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Schedule</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.instructionCard}>
          <Icon name="information-circle-outline" size={24} color="#0CB69B" />
          <Text style={styles.instructionText}>
            Set your availability for patient appointments by toggling days and
            time slots.
          </Text>
        </View>

        {weekDays.map(day => (
          <View key={day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayText}>{day}</Text>
              <Switch
                trackColor={{false: '#ccc', true: '#b2dfdb'}}
                thumbColor={schedule[day]?.isAvailable ? '#0CB69B' : '#f4f3f4'}
                onValueChange={() => handleDayToggle(day)}
                value={schedule[day]?.isAvailable}
              />
            </View>

            {schedule[day]?.isAvailable && (
              <View style={styles.timeSlotContainer}>
                {timeSlots.map(slot => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.timeSlot,
                      schedule[day]?.slots[slot] && styles.activeTimeSlot,
                    ]}
                    onPress={() => handleSlotToggle(day, slot)}>
                    <Text
                      style={[
                        styles.timeSlotText,
                        schedule[day]?.slots[slot] && styles.activeTimeSlotText,
                      ]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSchedule}
          disabled={savingSchedule}>
          {savingSchedule ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Schedule</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#e0f2f1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  instructionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: schedule => (schedule ? 1 : 0),
    borderBottomColor: '#f0f0f0',
  },
  dayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timeSlotContainer: {
    marginTop: 15,
  },
  timeSlot: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  activeTimeSlot: {
    backgroundColor: '#e0f2f1',
    borderWidth: 1,
    borderColor: '#0CB69B',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#666',
  },
  activeTimeSlotText: {
    color: '#0CB69B',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#0CB69B',
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DoctorScheduleScreen;
