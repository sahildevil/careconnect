import {Alert, Platform, Linking} from 'react-native';
import RNCalendarEvents from 'react-native-calendar-events';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';

class CalendarService {
  async requestCalendarPermission() {
    try {
      const authStatus = await RNCalendarEvents.checkPermissions();
      console.log('Current calendar auth status:', authStatus);
      
      if (authStatus === 'authorized') {
        return true;
      }

      const requestStatus = await RNCalendarEvents.requestPermissions();
      console.log('Calendar permission request result:', requestStatus);
      
      if (requestStatus === 'authorized') {
        return true;
      }

      const permission = Platform.select({
        ios: PERMISSIONS.IOS.CALENDARS,
        android: PERMISSIONS.ANDROID.WRITE_CALENDAR,
      });

      if (permission) {
        const result = await check(permission);
        
        if (result === RESULTS.GRANTED) {
          return true;
        }

        if (result === RESULTS.DENIED) {
          const requestResult = await request(permission);
          return requestResult === RESULTS.GRANTED;
        }
      }

      return false;
    } catch (error) {
      console.error('Error requesting calendar permission:', error);
      return false;
    }
  }

  async addAppointmentToCalendar(appointmentData) {
    try {
      
      const hasPermission = await this.requestCalendarPermission();
      
      if (!hasPermission) {
        Alert.alert(
          'Calendar Permission Required',
          'Please grant calendar access in your device settings to add appointments to your calendar.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Open Settings', 
              onPress: () => {
                Linking.openSettings();
              }
            }
          ]
        );
        return {success: false, error: 'Permission denied'};
      }

      // Create calendar event
      const startDate = new Date(appointmentData.appointment_date).toISOString();
      const endDate = new Date(new Date(appointmentData.appointment_date).getTime() + 60 * 60 * 1000).toISOString(); // 1 hour duration

      const eventDetails = {
        title: `Appointment with Dr. ${appointmentData.doctorName}`,
        startDate,
        endDate,
        description: `Medical consultation with Dr. ${appointmentData.doctorName}\nSpecialty: ${appointmentData.doctorSpecialty}\nReason: ${appointmentData.reason || 'General consultation'}`,
        location: appointmentData.doctorLocation || 'Healthcare Clinic',
        notes: `Booked through CareConnect\nConsultation Fee: ₹${appointmentData.consultationFee || 'N/A'}`,
        alarms: [
          {
            date: -60, 
          },
          {
            date: -15, 
          }
        ]
      };

      const eventId = await RNCalendarEvents.saveEvent(eventDetails.title, eventDetails);
      
      return {
        success: true,
        eventId,
        message: 'Appointment added to calendar successfully!'
      };

    } catch (error) {
      console.error('Error adding event to calendar:', error);
      return {
        success: false,
        error: error.message || 'Failed to add appointment to calendar'
      };
    }
  }

  showAddToCalendarPrompt(appointmentData, onSuccess = () => {}, onError = () => {}) {
    Alert.alert(
      'Add to Calendar',
      'Would you like to add this appointment to your device calendar? We\'ll set up reminders for you.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => {
           
            onError({cancelled: true});
          }
        },
        {
          text: 'Add to Calendar',
          onPress: async () => {
            const result = await this.addAppointmentToCalendar(appointmentData);
            
            if (result.success) {
              Alert.alert('Success', result.message, [
                {
                  text: 'OK',
                  onPress: () => onSuccess(result)
                }
              ]);
            } else {
              Alert.alert('Error', result.error || 'Failed to add to calendar', [
                {
                  text: 'OK', 
                  onPress: () => onError(result)
                }
              ]);
            }
          },
        },
      ]
    );
  }
}

export const calendarService = new CalendarService();