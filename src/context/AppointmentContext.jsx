import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {appointmentService} from '../services/api';
import {useAuth} from './AuthContext';

const AppointmentContext = createContext();

export const useAppointments = () => useContext(AppointmentContext);

export const AppointmentProvider = ({children}) => {
  const {user} = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Use ref to track the current request to prevent race conditions
  const currentRequestRef = useRef(null);
  const lastFetchTimeRef = useRef(null);

  // Reset appointments when user changes with better isolation
  useEffect(() => {
    const newUserId = user?.id;

    if (newUserId !== currentUserId) {
      console.log(
        `AppointmentContext: User changed from ${currentUserId} to ${newUserId}`,
      );

      // Cancel any pending requests
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
        console.log('Cancelled previous appointment fetch request');
      }

      // Clear state immediately
      setAppointments([]);
      setError(null);
      setLoading(false);
      setCurrentUserId(newUserId);
      lastFetchTimeRef.current = null;

      // Fetch appointments for the new user after a small delay
      if (newUserId) {
        const timeoutId = setTimeout(() => {
          fetchAppointments();
        }, 100); // Small delay to ensure state is cleared

        return () => clearTimeout(timeoutId);
      }
    }
  }, [user?.id, currentUserId]);

  // Fetch all patient appointments with request tracking
  const fetchAppointments = useCallback(async () => {
    if (!user?.id) {
      console.log(
        'AppointmentContext: No user ID available, skipping appointment fetch',
      );
      setAppointments([]);
      return;
    }

    // Prevent multiple simultaneous requests for the same user
    const now = Date.now();
    if (lastFetchTimeRef.current && now - lastFetchTimeRef.current < 1000) {
      console.log('AppointmentContext: Skipping duplicate fetch request');
      return;
    }

    // Cancel any pending request
    if (currentRequestRef.current) {
      currentRequestRef.current.cancelled = true;
    }

    // Create new request tracker
    const requestTracker = {cancelled: false, userId: user.id};
    currentRequestRef.current = requestTracker;
    lastFetchTimeRef.current = now;

    try {
      setLoading(true);
      setError(null);

      console.log(
        `AppointmentContext: Fetching appointments for user: ${
          user.id
        } at ${new Date().toISOString()}`,
      );

      const response = await appointmentService.getPatientAppointments();

      // Check if this request was cancelled
      if (requestTracker.cancelled) {
        console.log(
          'AppointmentContext: Request was cancelled, ignoring response',
        );
        return;
      }

      // Verify the response is for the current user
      if (user?.id !== requestTracker.userId) {
        console.log(
          'AppointmentContext: User changed during fetch, ignoring response',
        );
        return;
      }

      if (response.success) {
        // Sort appointments by appointment date (soonest first)
        const sortedAppointments = response.appointments.sort((a, b) => {
          const dateA = new Date(a.appointment_date);
          const dateB = new Date(b.appointment_date);
          return dateA - dateB;
        });

        console.log(
          `AppointmentContext: Successfully fetched ${sortedAppointments.length} appointments for user ${user.id}`,
        );

        // Double-check user hasn't changed before setting state
        if (user?.id === requestTracker.userId && !requestTracker.cancelled) {
          setAppointments(sortedAppointments);
        }
      } else {
        console.error(
          'AppointmentContext: Failed to fetch appointments:',
          response.message,
        );
        if (!requestTracker.cancelled) {
          setError('Failed to fetch appointments');
          setAppointments([]);
        }
      }
    } catch (error) {
      console.error('AppointmentContext: Error fetching appointments:', error);

      if (!requestTracker.cancelled) {
        setError(error.message || 'Failed to fetch appointments');
        setAppointments([]);
      }
    } finally {
      if (!requestTracker.cancelled) {
        setLoading(false);
      }

      // Clear current request if it's still this one
      if (currentRequestRef.current === requestTracker) {
        currentRequestRef.current = null;
      }
    }
  }, [user?.id]);

  // Clear appointments when user logs out
  useEffect(() => {
    if (!user) {
      console.log('AppointmentContext: User logged out, clearing appointments');

      // Cancel any pending requests
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
        currentRequestRef.current = null;
      }

      setAppointments([]);
      setCurrentUserId(null);
      setError(null);
      setLoading(false);
      lastFetchTimeRef.current = null;
    }
  }, [user]);

  // Update an existing appointment
  const updateAppointment = useCallback(updatedAppointment => {
    setAppointments(prevAppointments => {
      const updated = prevAppointments.map(app =>
        app.id === updatedAppointment.id ? updatedAppointment : app,
      );

      return updated.sort((a, b) => {
        const dateA = new Date(a.appointment_date);
        const dateB = new Date(b.appointment_date);
        return dateA - dateB;
      });
    });
  }, []);

  // Cancel an appointment
  const cancelAppointment = useCallback(appointmentId => {
    setAppointments(prevAppointments =>
      prevAppointments.map(app => {
        if (app.id === appointmentId) {
          return {...app, status: 'canceled'};
        }
        return app;
      }),
    );
  }, []);

  // Add a new appointment
  const addAppointment = useCallback(newAppointment => {
    setAppointments(prevAppointments => {
      const exists = prevAppointments.some(app => app.id === newAppointment.id);

      if (exists) {
        return prevAppointments;
      }

      const updatedAppointments = [...prevAppointments, newAppointment];

      return updatedAppointments.sort((a, b) => {
        const dateA = new Date(a.appointment_date);
        const dateB = new Date(b.appointment_date);
        return dateA - dateB;
      });
    });
  }, []);

  const value = {
    appointments,
    loading,
    error,
    fetchAppointments,
    updateAppointment,
    cancelAppointment,
    addAppointment,
  };

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};
