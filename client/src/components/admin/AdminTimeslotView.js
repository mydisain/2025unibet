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

// Import actions
import { getAvailableTimeslots } from '../../redux/slices/bookingSlice';
import { getSettings } from '../../redux/slices/settingSlice';
import { getKarts } from '../../redux/slices/kartSlice';

// Import components
import AdminKartSelectionDialog from './AdminKartSelectionDialog';
import AdminClientDataDialog from './AdminClientDataDialog';
import AdminBookingsDialog from './AdminBookingsDialog';

const AdminTimeslotView = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
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
  const [refreshCounter, setRefreshCounter] = useState(0); // Counter to force re-renders
  const [bookingError, setBookingError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Bookings dialog state
  const [bookingsDialogOpen, setBookingsDialogOpen] = useState(false);
  const [selectedTimeslotBookings, setSelectedTimeslotBookings] = useState(null);
  const [timeslotBookings, setTimeslotBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState(null);
  
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
    // Prepare booking data in the exact format expected by the server
    // The key here is to use selectedTimeslots instead of timeslots for admin bookings
    const bookingData = {
      // Client data
      customerName: clientData.customerName,
      customerEmail: clientData.customerEmail,
      customerPhone: clientData.customerPhone,
      notes: clientData.notes,
      
      // Booking data
      date: format(selectedDate, 'yyyy-MM-dd'),
      status: 'confirmed',
      
      // Create separate objects for timeslot kart selections and quantities
      timeslotKartSelections: {},
      timeslotKartQuantities: {},
      
      // Use selectedTimeslots array for admin bookings
      selectedTimeslots: selectedTimeslots.map(timeslot => ({
        startTime: timeslot.startTime,
        endTime: timeslot.endTime
      })),
      
      // Also include the timeslots array for backward compatibility
      timeslots: selectedTimeslots.map(timeslot => ({
        startTime: timeslot.startTime,
        endTime: timeslot.endTime
      })),
      
      // Add kart selections array
      kartSelections: []
    };
    
    // Process kart selections for each timeslot
    selectedTimeslots.forEach(timeslot => {
      const timeslotKey = `${timeslot.startTime}-${timeslot.endTime}`;
      const timeslotKarts = timeslotKartSelections[timeslotKey] || [];
      const timeslotQuantities = timeslotKartQuantities[timeslotKey] || {};
      
      // Add kart selections for this timeslot
      bookingData.timeslotKartSelections[timeslotKey] = timeslotKarts;
      bookingData.timeslotKartQuantities[timeslotKey] = {};
      
      // Process each kart in this timeslot
      timeslotKarts.forEach(kartId => {
        const kart = karts.find(k => k._id === kartId);
        const quantity = timeslotQuantities[kartId] || 1;
        
        // Add to timeslot kart quantities
        bookingData.timeslotKartQuantities[timeslotKey][kartId] = quantity;
        
        // Add to overall kart selections
        const existingKart = bookingData.kartSelections.find(k => k.kartId === kartId);
        if (existingKart) {
          existingKart.quantity += quantity;
        } else {
          bookingData.kartSelections.push({
            kartId,
            name: kart?.name || 'Unknown Kart',
            quantity: quantity,
            price: kart?.price || 0,
            pricePerSlot: kart?.price || 0
          });
        }
      });
    });
    
    // Add debug logging
    console.log('Admin booking data prepared:', JSON.stringify(bookingData, null, 2));
    
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
      
      // Log the final booking data before sending
      console.log('Final admin booking data to send:', JSON.stringify(bookingData, null, 2));
      
      // Create booking via API
      const response = await axios.post('/api/bookings/admin', bookingData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Booking created successfully:', response.data);
      
      // Close the client dialog
      handleClientDialogClose();
      
      // Show success message
      setSnackbarMessage(t('booking_created', 'Broneering loodud'));
      setSnackbarOpen(true);
      
      // Reset selections
      setSelectedTimeslots([]);
      setTimeslotKartSelections({});
      setTimeslotKartQuantities({});
      
      // Function to refresh timeslots
      const refreshTimeslots = async () => {
        try {
          const timestamp = new Date().getTime();
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          
          // Get the token from localStorage
          const userInfo = JSON.parse(localStorage.getItem('userInfo'));
          const token = userInfo?.token;
          
          if (!token) {
            throw new Error('No authentication token found');
          }
          
          console.log('Refreshing timeslots for date:', dateStr);
          
          // First, make a direct API call to get the latest timeslot data
          const refreshResponse = await axios.get(`/api/bookings/admin-timeslots?date=${dateStr}&_=${timestamp}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('Direct API refresh response:', refreshResponse.data);
          
          // Then dispatch the Redux action to update the store
          await dispatch(getAvailableTimeslots(`${dateStr}?_=${timestamp}`));
          
          // Show a success message that indicates the booking was saved and timeslots refreshed
          setSnackbarMessage(t('booking_saved_refresh_success', 'Broneering salvestatud ja ajavahemikud värskendatud!'));
          setSnackbarOpen(true);
          
          // Force a re-render by updating a state variable
          setRefreshCounter(prev => prev + 1);
          
          return true;
        } catch (error) {
          console.error('Error refreshing timeslots after booking:', error);
          setSnackbarMessage(t('refresh_error', 'Ajavahemike värskendamine ebaõnnestus, palun laadige leht uuesti'));
          setSnackbarOpen(true);
          return false;
        } finally {
          setBookingLoading(false);
        }
      };
      
      // Try refreshing multiple times with increasing delays
      setTimeout(() => refreshTimeslots(), 1000); // First attempt after 1 second
      setTimeout(() => refreshTimeslots(), 3000); // Second attempt after 3 seconds
      setTimeout(() => refreshTimeslots(), 5000); // Third attempt after 5 seconds
      
    } catch (error) {
      console.error('Error saving booking:', error);
      setBookingError(error.message || t('booking_error', 'Viga broneeringu salvestamisel'));
      setSnackbarMessage(error.message || t('booking_error', 'Viga broneeringu salvestamisel'));
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
  
  // Handle bookings button click
  const handleBookingsButtonClick = async (event, timeslot) => {
    // Important: Stop event propagation to prevent the timeslot button click event
    event.stopPropagation();
    event.preventDefault();
    
    try {
      setBookingsLoading(true);
      setBookingsError(null);
      setSelectedTimeslotBookings(timeslot);
      
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
      
      // Fetch bookings for this timeslot and date
      const response = await axios.get('/api/bookings/timeslot', {
        params: {
          date: format(selectedDate, 'yyyy-MM-dd'),
          startTime: timeslot.startTime,
          endTime: timeslot.endTime
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Timeslot bookings response:', response.data);
      
      // Check if the response data has the expected structure
      if (response.data && Array.isArray(response.data)) {
        // Process each booking to ensure it has the correct structure for display
        const processedBookings = response.data.map(booking => {
          console.log(`Processing booking:`, booking._id);
          
          // Ensure each booking has a timeslots array
          if (!booking.timeslots || !Array.isArray(booking.timeslots) || booking.timeslots.length === 0) {
            console.log(`No timeslots found, using selectedTimeslots:`, booking.selectedTimeslots);
            // If no timeslots, use selectedTimeslots if available
            if (booking.selectedTimeslots && Array.isArray(booking.selectedTimeslots) && booking.selectedTimeslots.length > 0) {
              booking.timeslots = booking.selectedTimeslots;
            } else {
              booking.timeslots = [];
            }
          }
          
          // Process each timeslot to ensure it has karts
          booking.timeslots = booking.timeslots.map(ts => {
            // If timeslot doesn't have karts, try to get them from timeslotKartSelections
            if (!ts.karts || !Array.isArray(ts.karts) || ts.karts.length === 0) {
              const timeslotKey = `${ts.startTime}-${ts.endTime}`;
              const kartSelections = booking.timeslotKartSelections?.[timeslotKey] || [];
              const kartQuantities = booking.timeslotKartQuantities?.[timeslotKey] || {};
              
              // Create karts array from kartSelections
              if (kartSelections.length > 0) {
                ts.karts = kartSelections.map(kartId => {
                  const kart = booking.kartSelections?.find(k => k.kartId === kartId);
                  return {
                    kartId,
                    name: kart?.name || 'Unknown Kart',
                    quantity: kartQuantities[kartId] || kart?.quantity || 1
                  };
                });
              } else if (booking.kartSelections && booking.kartSelections.length > 0) {
                // Fallback to overall kartSelections
                ts.karts = booking.kartSelections.map(kart => ({
                  kartId: kart.kartId,
                  name: kart.name || 'Unknown Kart',
                  quantity: kart.quantity || 1
                }));
              } else {
                ts.karts = [];
              }
            }
            return ts;
          });
          
          return booking;
        });
        
        // Update the timeslot bookings with the processed data
        setTimeslotBookings(processedBookings);
      } else {
        console.log('No bookings found or invalid response format');
        setTimeslotBookings([]);
      }
      // Open the bookings dialog immediately after setting the data
      setBookingsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching timeslot bookings:', error);
      setBookingsError(error.response?.data?.message || error.message);
      // Still open the dialog even if there's an error, so the error can be displayed
      setBookingsDialogOpen(true);
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
  
  // Handle edit booking
  const handleEditBooking = (booking) => {
    console.log('Edit booking:', booking);
    // TODO: Implement edit booking functionality
    // For now, just show a snackbar message
    setSnackbarMessage(t('edit_booking_not_implemented', 'Broneeringu muutmine pole veel implementeeritud'));
    setSnackbarOpen(true);
  };
  
  // Handle cancel booking
  const handleCancelBooking = async (booking) => {
    if (!window.confirm(t('confirm_cancel_booking', 'Kas olete kindel, et soovite selle broneeringu tühistada?'))) {
      return;
    }
    
    try {
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
      
      // Make API call to cancel the booking
      await axios.put(`/api/bookings/${booking._id}`, { status: 'cancelled' }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Show success message
      setSnackbarMessage(t('booking_cancelled_success', 'Broneering edukalt tühistatud!'));
      setSnackbarOpen(true);
      
      // Refresh the bookings list
      if (selectedTimeslotBookings) {
        handleBookingsButtonClick(new Event('click'), selectedTimeslotBookings);
      }
      
      // Refresh available timeslots
      const timestamp = new Date().getTime();
      dispatch(getAvailableTimeslots(`${format(selectedDate, 'yyyy-MM-dd')}?_=${timestamp}`));
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setSnackbarMessage(error.response?.data?.message || error.message);
      setSnackbarOpen(true);
    }
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
        selectedTimeslots={selectedTimeslots}
        timeslotKartSelections={timeslotKartSelections}
        timeslotKartQuantities={timeslotKartQuantities}
        karts={karts}
        loading={bookingLoading}
      />
      
      {/* Bookings dialog */}
      <AdminBookingsDialog
        open={bookingsDialogOpen}
        onClose={handleBookingsDialogClose}
        selectedTimeslot={selectedTimeslotBookings}
        timeslotBookings={timeslotBookings}
        loading={bookingsLoading}
        error={bookingsError}
        onEditBooking={handleEditBooking}
        onCancelBooking={handleCancelBooking}
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
                          sx={{ 
                            fontWeight: 'bold',
                            boxShadow: 2,
                            '&:hover': {
                              boxShadow: 4,
                              backgroundColor: '#2e7d32'
                            }
                          }}
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
