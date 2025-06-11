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
  Divider,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker as MuiDatePicker } from '@mui/x-date-pickers';
import { format, addDays } from 'date-fns';
import { et } from 'date-fns/locale';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import axiosInstance from '../../utils/axiosConfig';

// Import actions
import { getAvailableTimeslots, getBookings } from '../../redux/slices/bookingSlice';
import { getSettings } from '../../redux/slices/settingSlice';
import { getKarts } from '../../redux/slices/kartSlice';

// Import components
import AdminKartSelectionDialog from './AdminKartSelectionDialog';
import AdminClientDataDialog from './AdminClientDataDialog';
import AdminBookingsDialog from './AdminBookingsDialog';

const AdminTimeslotView = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  // Helper function to calculate duration between two time strings in minutes
  const calculateDuration = (startTime, endTime) => {
    // Parse times in format 'HH:mm'
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    // Calculate total minutes for each time
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    // Calculate duration (handle cases where endTime is on the next day)
    let durationMinutes = endTotalMinutes - startTotalMinutes;
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60; // Add 24 hours in minutes
    }
    
    return durationMinutes;
  };

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeslots, setSelectedTimeslots] = useState([]);
  const [selectedKarts, setSelectedKarts] = useState([]);
  const [kartQuantities, setKartQuantities] = useState({});
  const [timeslotKartQuantities, setTimeslotKartQuantities] = useState({});
  const [timeslotKartSelections, setTimeslotKartSelections] = useState({});
  
  // Dialog state
  const [kartDialogOpen, setKartDialogOpen] = useState(false);
  const [currentTimeslot, setCurrentTimeslot] = useState(null);
  const [initialKartSelection, setInitialKartSelection] = useState(null);
  
  // Booking state
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  // Bookings dialog state
  const [bookingsDialogOpen, setBookingsDialogOpen] = useState(false);
  const [selectedTimeslotBookings, setSelectedTimeslotBookings] = useState(null);
  const [timeslotBookings, setTimeslotBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Client data dialog state
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientData, setClientData] = useState(null);
  
  const { 
    timeslots: availableTimeslots = [], 
    loading: timeslotsLoading, 
    error: timeslotsError 
  } = useSelector((state) => state.bookings) || {};
  
  const {
    settings,
    loading: settingsLoading
  } = useSelector((state) => state.settings) || {};
  
  const { 
    karts = [], 
    loading: kartsLoading, 
    error: kartsError 
  } = useSelector((state) => state.karts) || {};
  
  // Fetch available timeslots when component mounts and when date changes
  useEffect(() => {
    // Add a timestamp parameter to prevent caching
    const timestamp = new Date().getTime();
    dispatch(getAvailableTimeslots(`${format(selectedDate, 'yyyy-MM-dd')}?_=${timestamp}`));
  }, [dispatch, selectedDate]);
  
  // Fetch settings when component mounts
  useEffect(() => {
    dispatch(getSettings());
  }, [dispatch]);
  
  // Fetch karts when component mounts
  useEffect(() => {
    dispatch(getKarts());
  }, [dispatch]);
  
  // Reset kart selections when dialog opens or closes
  useEffect(() => {
    // When dialog opens and we have initial selection
    if (kartDialogOpen && selectedTimeslots.length > 0 && initialKartSelection) {
      // Only set if not already set
      if (selectedKarts.length === 0) {
        setSelectedKarts(initialKartSelection.karts);
        setKartQuantities(initialKartSelection.quantities);
      }
    }
    // When dialog closes, reset selections if no timeslots are selected
    if (!kartDialogOpen && selectedTimeslots.length === 0) {
      setSelectedKarts([]);
      setKartQuantities({});
    }
  }, [kartDialogOpen, selectedTimeslots.length, initialKartSelection, selectedKarts.length]);
  
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };
  
  // Format timeslot for display
  const formatTimeslot = (startTime, endTime) => {
    return `${startTime} - ${endTime}`;
  };
  
  // Handle timeslot click
  const handleTimeslotClick = (timeslot) => {
    // Set the current timeslot
    setCurrentTimeslot(timeslot);
    
    // Check if this timeslot already has saved kart selections
    const timeslotKey = `${timeslot.startTime}-${timeslot.endTime}`;
    const savedKartSelections = timeslotKartSelections[timeslotKey];
    const savedKartQuantities = timeslotKartQuantities[timeslotKey];
    
    if (savedKartSelections && savedKartQuantities) {
      // Load the saved kart selections for this timeslot
      setSelectedKarts(savedKartSelections);
      setKartQuantities(savedKartQuantities);
      console.log('Loaded saved kart selections for timeslot:', timeslotKey);
    } else if (initialKartSelection && selectedTimeslots.length > 0) {
      // Use the initial kart selection as a starting point for new timeslots
      setSelectedKarts(initialKartSelection.karts);
      setKartQuantities(initialKartSelection.quantities);
      console.log('Using initial kart selection for new timeslot');
    } else {
      // Reset kart selections for new timeslots
      setSelectedKarts([]);
      setKartQuantities({});
      console.log('Reset kart selections for new timeslot');
    }
    
    // Open the kart selection dialog
    setKartDialogOpen(true);
  };
  
  const handleKartDialogClose = () => {
    setKartDialogOpen(false);
    setCurrentTimeslot(null);
  };
  
  const handleKartDialogConfirm = () => {
    if (currentTimeslot && selectedKarts.length > 0) {
      // If this is the first timeslot selection, save the initial kart selection
      if (selectedTimeslots.length === 0) {
        setInitialKartSelection({
          karts: [...selectedKarts],
          quantities: {...kartQuantities}
        });
      }
      
      // Check if this timeslot is already selected (editing an existing selection)
      const existingIndex = selectedTimeslots.findIndex(
        ts => ts.startTime === currentTimeslot.startTime && ts.endTime === currentTimeslot.endTime
      );
      
      // Store the kart quantities for this specific timeslot
      const timeslotKey = `${currentTimeslot.startTime}-${currentTimeslot.endTime}`;
      setTimeslotKartQuantities(prev => ({
        ...prev,
        [timeslotKey]: {...kartQuantities}
      }));
      
      // Store kart selections for this timeslot
      setTimeslotKartSelections(prev => ({
        ...prev,
        [timeslotKey]: [...selectedKarts]
      }));
      
      // Add the timeslot to selected timeslots only if it's not already there
      if (existingIndex === -1) {
        setSelectedTimeslots([...selectedTimeslots, currentTimeslot]);
        console.log('Added new timeslot:', currentTimeslot);
      } else {
        console.log('Updated existing timeslot:', currentTimeslot);
      }
      
      console.log('Timeslot key:', timeslotKey);
      console.log('Kart selections for this timeslot:', [...selectedKarts]);
      console.log('Kart quantities for this timeslot:', {...kartQuantities});
      
      setKartDialogOpen(false);
      setCurrentTimeslot(null);
    }
  };
  
  const handleKartSelect = (kartId, isSelected) => {
    if (isSelected) {
      // Check if adding this kart would exceed the maximum allowed
      const totalCurrentKarts = Object.values(kartQuantities).reduce((sum, qty) => sum + qty, 0);
      if (totalCurrentKarts < (settings?.maxKartsPerTimeslot || 9)) {
        setSelectedKarts([...selectedKarts, kartId]);
        setKartQuantities(prev => ({ ...prev, [kartId]: 1 }));
      } else {
        // Could add a notification here that max karts limit is reached
        alert(t('maximum_karts_reached', { max: settings?.maxKartsPerTimeslot || 9 }));
      }
    } else {
      setSelectedKarts(selectedKarts.filter((id) => id !== kartId));
      setKartQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[kartId];
        return newQuantities;
      });
    }
  };
  
  const handleQuantityChange = (kartId, newQuantity) => {
    // Calculate the total quantity of all karts after this change
    const otherKartsQuantity = Object.entries(kartQuantities)
      .filter(([id]) => id !== kartId)
      .reduce((sum, [, qty]) => sum + qty, 0);
    
    const totalAfterChange = otherKartsQuantity + newQuantity;
    
    // Check if the new total would exceed the maximum allowed
    if (totalAfterChange <= (settings?.maxKartsPerTimeslot || 9)) {
      setKartQuantities(prev => ({ ...prev, [kartId]: newQuantity }));
    } else {
      alert(t('maximum_karts_reached', { max: settings?.maxKartsPerTimeslot || 9 }));
    }
  };
  
  // Handle removing a timeslot from selected timeslots
  const handleRemoveTimeslot = (index) => {
    const timeslotToRemove = selectedTimeslots[index];
    const timeslotKey = `${timeslotToRemove.startTime}-${timeslotToRemove.endTime}`;
    
    // Remove the timeslot from selected timeslots
    const newSelectedTimeslots = [...selectedTimeslots];
    newSelectedTimeslots.splice(index, 1);
    setSelectedTimeslots(newSelectedTimeslots);
    
    // Remove the timeslot-specific kart quantities
    setTimeslotKartQuantities(prev => {
      const newQuantities = {...prev};
      delete newQuantities[timeslotKey];
      return newQuantities;
    });
    
    // Remove kart selections for this timeslot
    setTimeslotKartSelections(prev => {
      const newSelections = {...prev};
      delete newSelections[timeslotKey];
      return newSelections;
    });
    
    // If all timeslots are removed, reset kart selections
    if (newSelectedTimeslots.length === 0) {
      setSelectedKarts([]);
      setKartQuantities({});
      setInitialKartSelection(null);
    }
  };
  
  // Open client data dialog
  const handleOpenClientDialog = () => {
    if (selectedTimeslots.length === 0) {
      setSnackbarMessage(t('no_timeslots_selected', 'Palun vali vähemalt üks ajavahemik'));
      setSnackbarOpen(true);
      return;
    }
    setClientDialogOpen(true);
  };
  
  // Handle client dialog close
  const handleClientDialogClose = () => {
    setClientDialogOpen(false);
    setClientData(null);
  };
  
  // Handle client data submission and booking creation
  const handleClientDataSubmit = async (clientData) => {
    // Prepare booking data to match the working client-side structure
    const firstTimeslot = selectedTimeslots[0] || { startTime: '10:00', endTime: '10:30' };
    const lastTimeslot = selectedTimeslots[selectedTimeslots.length - 1] || firstTimeslot;
    
    // Calculate duration between first and last timeslot
    const duration = calculateDuration(firstTimeslot.startTime, lastTimeslot.endTime);
    
    // Format timeslots as strings (like "10:00-10:15")
    const formattedTimeslots = selectedTimeslots.map(ts => `${ts.startTime}-${ts.endTime}`);
    
    // Create kartSelections with kartId (NOT kart) - this is key
    const kartSelections = [];
    
    // Process all karts across all timeslots
    selectedTimeslots.forEach(timeslot => {
      const timeslotKey = `${timeslot.startTime}-${timeslot.endTime}`;
      const timeslotKarts = timeslotKartSelections[timeslotKey] || [];
      const timeslotQuantities = timeslotKartQuantities[timeslotKey] || {};
      
      timeslotKarts.forEach(kartId => {
        const kart = karts.find(k => k._id === kartId);
        const quantity = timeslotQuantities[kartId] || 1;
        
        // Find if we already have this kart in the kartSelections array
        const existingSelection = kartSelections.find(ks => ks.kartId === kartId);
        
        if (existingSelection) {
          // If already exists, just update the quantity
          existingSelection.quantity += quantity;
        } else {
          // Otherwise add a new entry
          kartSelections.push({
            kartId: kartId, // Important: Use kartId, not kart
            quantity: quantity,
            pricePerSlot: kart?.pricePerSlot || 10,
            name: kart?.name || 'Unknown Kart'
          });
        }
      });
    });
    
    // Calculate the total price from all kart selections
    const totalPrice = kartSelections.reduce(
      (total, selection) => total + (selection.pricePerSlot * selection.quantity), 0
    );
    
    // Create the complete booking data structure like the client-side version
    const bookingData = {
      // Client data
      customerName: clientData.customerName,
      customerEmail: clientData.customerEmail,
      customerPhone: clientData.customerPhone,
      notes: clientData.notes,
      
      // Booking time data
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime: firstTimeslot.startTime,
      endTime: lastTimeslot.endTime,
      duration: duration,
      
      // Important booking data - match client structure exactly
      selectedTimeslots: formattedTimeslots,
      // CRITICAL: Add the timeslots field that the backend controller expects
      timeslots: selectedTimeslots.map(ts => ({
        startTime: ts.startTime,
        endTime: ts.endTime
      })),
      kartSelections: kartSelections,
      timeslotKartSelections: timeslotKartSelections,
      timeslotKartQuantities: timeslotKartQuantities,
      totalPrice: totalPrice,
      status: 'confirmed'
    };
    
    console.log('Booking data to save:', bookingData);
    
    try {
      setBookingLoading(true);
      setBookingError(null);
      
      // Get the token from userInfo in localStorage
      const userInfoString = localStorage.getItem('userInfo');
      if (!userInfoString) {
        throw new Error(t('not_authenticated', 'Kasutaja pole sisse logitud'));
      }
      
      let token;
      try {
        const userInfo = JSON.parse(userInfoString);
        if (!userInfo || !userInfo.token) {
          throw new Error(t('invalid_token', 'Vigane autentimistoken'));
        }
        token = userInfo.token;
      } catch (error) {
        console.error('Error parsing userInfo from localStorage:', error);
        throw new Error(t('auth_error', 'Autentimise viga'));
      }
      
      // Make API call to save booking
      // Using axiosInstance instead of axios to ensure correct base URL
      const response = await axiosInstance.post('/api/bookings/admin', bookingData, {
        headers: {
          'Content-Type': 'application/json'
          // Authorization header is already added by axiosInstance interceptor
        }
      });
      
      console.log('Booking saved successfully:', response.data);
      setBookingSuccess(true);
      setSnackbarMessage(t('booking_saved_success', 'Broneering edukalt salvestatud!'));
      setSnackbarOpen(true);
      
      // Close client dialog
      setClientDialogOpen(false);
      
      // Reset form after successful booking
      setSelectedTimeslots([]);
      setSelectedKarts([]);
      setKartQuantities({});
      setTimeslotKartQuantities({});
      setTimeslotKartSelections({});
      setInitialKartSelection(null);
      
      // Refresh available timeslots and bookings list
      const timestamp = new Date().getTime();
      
      // Refresh timeslots
      dispatch(getAvailableTimeslots(`${format(selectedDate, 'yyyy-MM-dd')}?_=${timestamp}`));
      
      // Refresh bookings list - this is crucial for seeing the new booking in the admin panel
      dispatch(getBookings({ startDate: format(selectedDate, 'yyyy-MM-dd'), endDate: format(selectedDate, 'yyyy-MM-dd') }));
      
      // Also add a small delay and fetch again to ensure we get the latest data
      setTimeout(() => {
        dispatch(getAvailableTimeslots(`${format(selectedDate, 'yyyy-MM-dd')}?_=${timestamp + 1000}`));
        dispatch(getBookings({ startDate: format(selectedDate, 'yyyy-MM-dd'), endDate: format(selectedDate, 'yyyy-MM-dd') }));
      }, 1000);
      
    } catch (error) {
      // Enhanced error logging
      console.error('Error saving booking:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : 'No response data',
        request: error.request ? 'Request was made but no response received' : 'No request made'
      });
      
      // Extract the most helpful error message
      let errorMessage = t('booking_error', 'Viga broneeringu salvestamisel');
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setBookingError(errorMessage);
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    } finally {
      setBookingLoading(false);
    }
  };
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  // Get the selected kart details for a timeslot
  const getKartDetails = (timeslot) => {
    const timeslotKey = `${timeslot.startTime}-${timeslot.endTime}`;
    const timeslotKarts = timeslotKartSelections[timeslotKey] || [];
    const timeslotQuantities = timeslotKartQuantities[timeslotKey] || {};
    
    return timeslotKarts.map(kartId => {
      const kart = karts.find(k => k._id === kartId);
      return {
        id: kartId,
        name: kart?.name || 'Unknown Kart',
        quantity: timeslotQuantities[kartId] || 1,
        price: kart?.pricePerSlot || 0
      };
    });
  };
  
  // Handle opening the bookings dialog
  const handleBookingsButtonClick = async (event, timeslot) => {
    event.stopPropagation(); // Prevent the timeslot button click event
    
    setSelectedTimeslotBookings(timeslot);
    setBookingsDialogOpen(true);
    setBookingsLoading(true);
    setBookingsError(null);
    
    try {
      // Fetch bookings for this timeslot and date
      console.log('Fetching bookings for:', {
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: timeslot.startTime,
        endTime: timeslot.endTime
      });
      
      const response = await axiosInstance.get('/api/bookings/timeslot', {
        params: {
          date: format(selectedDate, 'yyyy-MM-dd'),
          startTime: timeslot.startTime,
          endTime: timeslot.endTime
        }
        // Note: axiosInstance already adds Authorization header from interceptor
      });
      
      console.log('Received bookings response:', response.data);
      setTimeslotBookings(response.data);
    } catch (error) {
      console.error('Error fetching timeslot bookings:', error);
      setBookingsError(error.message || t('bookings_fetch_error', 'Viga broneeringute laadimisel'));
    } finally {
      setBookingsLoading(false);
    }
  };
  
  // Handle closing the bookings dialog
  const handleBookingsDialogClose = () => {
    setBookingsDialogOpen(false);
    setSelectedTimeslotBookings(null);
    setTimeslotBookings([]);
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('admin_dashboard')}
      </Typography>
      
      {/* Kart selection dialog */}
      <AdminKartSelectionDialog
        open={kartDialogOpen}
        onClose={handleKartDialogClose}
        onConfirm={handleKartDialogConfirm}
        timeslot={currentTimeslot}
        karts={karts}
        selectedKarts={selectedKarts}
        kartQuantities={kartQuantities}
        handleKartSelect={handleKartSelect}
        handleQuantityChange={handleQuantityChange}
        kartsLoading={kartsLoading}
        kartsError={kartsError}
      />
      
      {/* Client data dialog */}
      <AdminClientDataDialog
        open={clientDialogOpen}
        onClose={handleClientDialogClose}
        onConfirm={handleClientDataSubmit}
        clientData={clientData}
        loading={bookingLoading}
        selectedTimeslots={selectedTimeslots}
        timeslotKartSelections={timeslotKartSelections}
        timeslotKartQuantities={timeslotKartQuantities}
        karts={karts}
      />
      
      {/* Bookings dialog */}
      <AdminBookingsDialog
        open={bookingsDialogOpen}
        onClose={handleBookingsDialogClose}
        selectedTimeslot={selectedTimeslotBookings}
        timeslotBookings={timeslotBookings}
        loading={bookingsLoading}
        error={bookingsError}
      />
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
      
      <Card sx={{ mb: 4, p: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('select_date')}
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={et}>
            <MuiDatePicker
              label={t('select_date')}
              value={selectedDate}
              onChange={handleDateChange}
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
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            {t('timeslots')}
          </Typography>
          
          <Grid container spacing={2}>
            {availableTimeslots && availableTimeslots.length > 0 ? (
              availableTimeslots.map((timeslot) => (
                <Grid item xs={6} sm={4} md={3} key={timeslot.startTime}>
                  <Button
                    fullWidth
                    variant={selectedTimeslots.some(ts => ts.startTime === timeslot.startTime && ts.endTime === timeslot.endTime) ? "contained" : "outlined"}
                    color="primary"
                    onClick={() => handleTimeslotClick(timeslot)}
                    sx={{
                      py: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Box sx={{ 
                      fontWeight: 'normal',
                      fontSize: '1rem'
                    }}>
                      {formatTimeslot(timeslot.startTime, timeslot.endTime)}
                    </Box>
                    <Box 
                      sx={{ 
                        fontSize: '0.75rem', 
                        mt: 1,
                        color: 'rgba(0, 0, 0, 0.6)'
                      }}
                    >
                      {t('available_places')}: {timeslot.totalAvailability || 0} / {settings?.maxKartsPerTimeslot || 9}
                    </Box>
                    
                    {/* Show bookings button at the bottom center */}
                    <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'center', pt: 2 }}>
                      {timeslot.totalBooked > 0 ? (
                        <Button
                          variant="contained"
                          color="success"
                          onClick={(event) => handleBookingsButtonClick(event, timeslot)}
                          size="small"
                        >
                          {t('bookings', 'Broneeringuid')}: {timeslot.totalBooked}
                        </Button>
                      ) : (
                        <Button
                          variant="outlined"
                          color="success"
                          disabled
                          size="small"
                        >
                          {t('no_bookings', 'Broneeringuid pole')}
                        </Button>
                      )}
                    </Box>
                  </Button>
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
          
          {/* Selected Timeslots Section */}
          {selectedTimeslots.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                {t('selected_timeslots')}
              </Typography>
              
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  {selectedTimeslots.map((timeslot, index) => (
                    <Paper 
                      key={`${timeslot.startTime}-${index}`} 
                      sx={{ 
                        p: 2, 
                        mb: 2,
                        backgroundColor: '#f5f5f5'
                      }}
                    >
                      <Grid container alignItems="center" spacing={2}>
                        <Grid item xs={10}>
                          <Typography variant="subtitle1">
                            {formatTimeslot(timeslot.startTime, timeslot.endTime)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {timeslot && getKartDetails(timeslot).length > 0 ? 
                              getKartDetails(timeslot).map(kart => `${kart.name} (${kart.quantity})`).join(', ') : 
                              t('no_karts_selected')}
                          </Typography>
                        </Grid>
                        <Grid item xs={2} sx={{ textAlign: 'right' }}>
                          <Button 
                            color="error" 
                            onClick={() => handleRemoveTimeslot(index)}
                            size="small"
                            variant="outlined"
                          >
                            {t('remove')}
                          </Button>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleOpenClientDialog}
                      size="large"
                      disabled={bookingLoading || selectedTimeslots.length === 0}
                    >
                      {bookingLoading ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        t('confirm_booking', 'Kinnita broneering')
                      )}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AdminTimeslotView;
