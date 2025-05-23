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
        // Sort appointments by creation date (newest first)
        const sortedAppointments = response.appointments.sort((a, b) => {
          const aCreated = a.created_at ? new Date(a.created_at) : new Date(a.appointment_date);
          const bCreated = b.created_at ? new Date(b.created_at) : new Date(b.appointment_date);
          return bCreated - aCreated;
        });
        
        setAppointments(sortedAppointments);
      } else {
        setError('Failed to fetch appointments');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
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
      
      // Add the new appointment at the beginning of the array
      // This ensures the newest appointment is always first
      const updatedAppointments = [newAppointment, ...prevAppointments];
      
      // Sort by creation date (newest first)
      return updatedAppointments.sort((a, b) => {
        const aCreated = a.created_at ? new Date(a.created_at) : new Date(a.appointment_date);
        const bCreated = b.created_at ? new Date(b.created_at) : new Date(b.appointment_date);
        return bCreated - aCreated;
      });
    });
  }, []);

  // Update an existing appointment
  const updateAppointment = useCallback((updatedAppointment) => {
    setAppointments(prevAppointments => 
      prevAppointments.map(app => 
        app.id === updatedAppointment.id ? updatedAppointment : app
      )
    );
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