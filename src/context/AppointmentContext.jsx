import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { appointmentService } from '../services/api';

const AppointmentContext = createContext();

export const useAppointments = () => useContext(AppointmentContext);

export const AppointmentProvider = ({ children }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all patient appointments
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await appointmentService.getPatientAppointments();
      
      if (response.success) {
        // Sort appointments by appointment date (soonest first)
        const sortedAppointments = response.appointments.sort((a, b) => {
          const dateA = new Date(a.appointment_date);
          const dateB = new Date(b.appointment_date);
          return dateA - dateB; // Ascending order (soonest first)
        });
        
        setAppointments(sortedAppointments);
      } else {
        setError('Failed to fetch appointments');
      }
    } catch (error) {
      console.log('Error fetching appointments:', error);
      setError(error.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize by fetching appointments once
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Add a new appointment to the context state
  const addAppointment = useCallback((newAppointment) => {
    setAppointments(prevAppointments => {
      // Check if the appointment already exists to prevent duplicates
      const exists = prevAppointments.some(app => app.id === newAppointment.id);
      
      if (exists) {
        return prevAppointments;
      }
      
      // Add the new appointment and sort all appointments by date
      const updatedAppointments = [...prevAppointments, newAppointment];
      
      // Sort by appointment date (soonest first)
      return updatedAppointments.sort((a, b) => {
        const dateA = new Date(a.appointment_date);
        const dateB = new Date(b.appointment_date);
        return dateA - dateB; // Ascending order (soonest first)
      });
    });
  }, []);

  // Update an existing appointment
  const updateAppointment = useCallback((updatedAppointment) => {
    setAppointments(prevAppointments => {
      const updated = prevAppointments.map(app => 
        app.id === updatedAppointment.id ? updatedAppointment : app
      );
      
      // Re-sort appointments by date after updating
      return updated.sort((a, b) => {
        const dateA = new Date(a.appointment_date);
        const dateB = new Date(b.appointment_date);
        return dateA - dateB;
      });
    });
  }, []);

  // Remove an appointment
  const cancelAppointment = useCallback((appointmentId) => {
    setAppointments(prevAppointments => 
      prevAppointments.map(app => {
        if (app.id === appointmentId) {
          return { ...app, status: 'canceled' };
        }
        return app;
      })
    );
  }, []);

  const value = {
    appointments,
    loading,
    error,
    fetchAppointments,
    addAppointment,
    updateAppointment,
    cancelAppointment
  };

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};