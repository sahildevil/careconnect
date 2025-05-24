import {Alert} from 'react-native'; // Add this import
import {calendarService} from './calendarService';

// Add this function to handle appointment confirmations
export const handleAppointmentConfirmation = (appointmentData) => {
  // Show calendar prompt when appointment is confirmed
  const calendarData = {
    appointment_date: appointmentData.appointment_date,
    doctorName: appointmentData.doctors?.name || appointmentData.doctor?.name,
    doctorSpecialty: appointmentData.doctors?.specialty || appointmentData.doctor?.specialty,
    reason: appointmentData.reason,
    consultationFee: appointmentData.doctors?.consultation_fee || appointmentData.doctor?.consultation_fee,
    doctorLocation: appointmentData.doctors?.location || appointmentData.doctor?.location || 'Healthcare Clinic',
  };

  Alert.alert(
    'Appointment Confirmed!',
    `Your appointment with Dr. ${calendarData.doctorName} has been confirmed.`,
    [
      {
        text: 'Add to Calendar',
        onPress: () => {
          calendarService.showAddToCalendarPrompt(calendarData);
        },
      },
      {
        text: 'OK',
        style: 'default',
      },
    ]
  );
};