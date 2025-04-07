import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  TextField,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker as MuiDatePicker } from '@mui/x-date-pickers';
import { format, addDays, isAfter, isBefore, parseISO } from 'date-fns';
import { et } from 'date-fns/locale';

// Import actions
import { getAvailableTimeslots } from '../../redux/slices/bookingSlice';
import { getSettings } from '../../redux/slices/settingSlice';

const DatePicker = ({ onTimeslotSelect, selectedTimeslots = [], kartQuantities = {}, timeslotKartQuantities = {}, selectedDate, onDateChange }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  const [selectedDateState, setSelectedDate] = useState(selectedDate || new Date());
  
  const { 
    timeslots: availableTimeslots = [], 
    loading: timeslotsLoading, 
    error: timeslotsError 
  } = useSelector((state) => state.bookings) || {};
  
  const {
    settings,
    loading: settingsLoading
  } = useSelector((state) => state.settings) || {};
  
  // Fetch available timeslots when component mounts and when date changes
  useEffect(() => {
    // Add a timestamp parameter to prevent caching
    const timestamp = new Date().getTime();
    dispatch(getAvailableTimeslots(`${format(selectedDateState, 'yyyy-MM-dd')}?_=${timestamp}`));
  }, [dispatch, selectedDateState]);
  
  // Fetch settings when component mounts
  useEffect(() => {
    dispatch(getSettings());
  }, [dispatch]);
  
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };
  
  // Format timeslot for display
  const formatTimeslot = (startTime, endTime) => {
    return `${startTime} - ${endTime}`;
  };
  
  // Get total available places for a timeslot
  const getTotalAvailability = (timeslot) => {
    // Get max karts per timeslot from settings
    const maxKarts = getMaxKartsPerTimeslot();
    
    // Get the server-provided availability (which accounts for previous bookings)
    let serverAvailability = 0;
    if (timeslot.totalAvailability !== undefined) {
      serverAvailability = timeslot.totalAvailability;
    } else if (timeslot.kartAvailability) {
      serverAvailability = timeslot.kartAvailability.reduce((total, kart) => total + kart.available, 0);
    }
    
    // Check if this specific timeslot is already selected
    const isSelected = selectedTimeslots.some(ts => 
      ts.startTime === timeslot.startTime && ts.endTime === timeslot.endTime
    );
    
    // Calculate selected karts for this specific timeslot only
    let selectedKartsCount = 0;
    if (isSelected) {
      // Use the timeslot-specific kart quantities
      const timeslotKey = `${timeslot.startTime}-${timeslot.endTime}`;
      const timeslotQuantities = timeslotKartQuantities[timeslotKey] || {};
      
      // Sum up the quantities for this specific timeslot
      selectedKartsCount = Object.values(timeslotQuantities).reduce((sum, qty) => sum + qty, 0);
      
      console.log(`Selected timeslot ${timeslotKey} has ${selectedKartsCount} karts selected`);
    }
    
    // Calculate final availability by subtracting only the karts selected for this specific timeslot
    // and respecting the global max karts per timeslot setting
    const finalAvailability = Math.min(maxKarts, Math.max(0, serverAvailability - selectedKartsCount));
    
    // Log detailed information for debugging
    console.log(`Timeslot ${timeslot.startTime}-${timeslot.endTime}:`, {
      isSelected,
      serverAvailability,
      selectedKartsCount,
      finalAvailability,
      maxKartsPerTimeslot: maxKarts,
      timeslotKey: `${timeslot.startTime}-${timeslot.endTime}`,
      timeslotQuantities: isSelected ? timeslotKartQuantities[`${timeslot.startTime}-${timeslot.endTime}`] : 'none'
    });
    
    return finalAvailability;
  };
  
  // Get the max karts per timeslot from settings
  const getMaxKartsPerTimeslot = () => {
    return settings?.maxKartsPerTimeslot || 9; // Default to 9 if not set
  };
  
  // Get the total karts for a timeslot (considering existing bookings)
  const getTotalKartsForTimeslot = (timeslot) => {
    // Always use the global max karts setting as the total
    return getMaxKartsPerTimeslot();
  };
  
  // Check if a timeslot is in the past
  const isTimeslotInPast = (timeslotStartTime) => {
    // Get the timeslot object
    const timeslot = availableTimeslots.find(t => t.startTime === timeslotStartTime);
    if (!timeslot) return true; // If not found, consider it in the past
    
    // For today, check if the timeslot's start time is in the past
    const today = new Date();
    const selectedDay = new Date(selectedDateState);
    
    // If selected date is in the future, timeslot is not in the past
    if (selectedDay.getDate() !== today.getDate() || 
        selectedDay.getMonth() !== today.getMonth() || 
        selectedDay.getFullYear() !== today.getFullYear()) {
      return false;
    }
    
    // For today, compare the timeslot's start time with current time
    const [startHour, startMinute] = timeslot.startTime.split(':').map(Number);
    const now = new Date();
    
    // Create a date object for the timeslot's start time today
    const timeslotDate = new Date();
    timeslotDate.setHours(startHour, startMinute, 0, 0);
    
    // Return true if the timeslot's start time is in the past
    return timeslotDate < now;
  };
  
  // Render a timeslot button
  const renderTimeslotButton = (timeslot) => {
    const isPast = isTimeslotInPast(timeslot.startTime);
    const isSelected = selectedTimeslots.some(ts => 
      ts.startTime === timeslot.startTime && ts.endTime === timeslot.endTime
    );
    
    // Get the max karts per timeslot from admin settings
    const maxKartsPerTimeslot = getMaxKartsPerTimeslot();
    
    // Calculate available karts for this timeslot
    // Start with server-provided availability
    let serverAvailability = 0;
    if (timeslot.totalAvailability !== undefined) {
      serverAvailability = timeslot.totalAvailability;
    } else if (timeslot.kartAvailability) {
      serverAvailability = timeslot.kartAvailability.reduce((total, kart) => total + kart.available, 0);
    }
    
    // Calculate selected karts for this specific timeslot
    let selectedKartsCount = 0;
    if (isSelected) {
      const timeslotKey = `${timeslot.startTime}-${timeslot.endTime}`;
      const timeslotQuantities = timeslotKartQuantities[timeslotKey] || {};
      selectedKartsCount = Object.values(timeslotQuantities).reduce((sum, qty) => sum + qty, 0);
    }
    
    // Calculate final availability, capped at the max karts setting
    const availableKarts = Math.min(maxKartsPerTimeslot, Math.max(0, serverAvailability - selectedKartsCount));
    
    // Always use the max karts setting from admin as the total
    const totalKarts = maxKartsPerTimeslot;
    
    console.log(`Timeslot ${timeslot.startTime}-${timeslot.endTime}:`, {
      maxKartsPerTimeslot,
      serverAvailability,
      selectedKartsCount,
      availableKarts,
      totalKarts
    });
    
    // Apply a special style if this timeslot is selected
    const buttonStyle = {
      py: 2,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      opacity: isPast ? 0.5 : 1,
      textDecoration: isPast ? 'line-through' : 'none',
      backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.4)' : 'transparent',
      '&.MuiButton-contained': {
        backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.4)' : 'transparent',
        '&:hover': {
          backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.5)' : 'rgba(25, 118, 210, 0.08)'
        }
      },
      '&.MuiButton-outlined:hover': {
        backgroundColor: 'rgba(25, 118, 210, 0.08)'
      }
    };
    
    return (
      <Button
        fullWidth
        variant={isSelected ? "contained" : "outlined"}
        color={isPast ? 'error' : 'primary'}
        onClick={() => !isPast && onTimeslotSelect(timeslot)}
        sx={buttonStyle}
        disabled={isPast}
      >
        <Box sx={{ 
          fontWeight: isSelected ? 'bold' : 'normal',
          fontSize: isSelected ? '1.1rem' : '1rem'
        }}>
          {formatTimeslot(timeslot.startTime, timeslot.endTime)}
        </Box>
        <Box 
          sx={{ 
            fontSize: isSelected ? '0.85rem' : '0.75rem', 
            mt: 1,
            fontWeight: isSelected ? 'medium' : 'normal',
            color: isSelected ? 'white' : 'rgba(0, 0, 0, 0.6)'
          }}
        >
          {t('available_places')}: {availableKarts} / 9
        </Box>
      </Button>
    );
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('select_time')}
      </Typography>
      
      <Card sx={{ mb: 4, p: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('select_date')}
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={et}>
            <MuiDatePicker
              label={t('select_date')}
              value={selectedDateState}
              onChange={handleDateChange}
              minDate={new Date()}
              maxDate={addDays(new Date(), settings?.maxAdvanceBookingDays || 30)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </LocalizationProvider>
        </CardContent>
      </Card>
      
      {timeslotsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : timeslotsError ? (
        <Alert severity="error" sx={{ my: 2 }}>
          {timeslotsError}
        </Alert>
      ) : (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {availableTimeslots && availableTimeslots.length > 0 ? (
            availableTimeslots.map((timeslot) => (
              <Grid item xs={6} sm={4} md={3} key={timeslot.startTime}>
                {renderTimeslotButton(timeslot)}
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Alert severity="info">
                {t('no_available_timeslots')}
              </Alert>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default DatePicker;
