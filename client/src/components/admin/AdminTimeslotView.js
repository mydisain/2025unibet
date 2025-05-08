import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Grid,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Tooltip,
  Badge,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { et } from 'date-fns/locale';
import axiosInstance from '../../utils/axiosConfig';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';

import KartSelectionDialog from '../booking/KartSelectionDialog';
// Import booking actions
import { getBookings, updateBooking, deleteBooking, createBooking } from '../../redux/slices/bookingSlice';
import { getKarts } from '../../redux/slices/kartSlice';

const AdminTimeslotView = () => {
  // Handle removing a timeslot
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
    }
  };

  // Open booking confirmation dialog (for Kinnita)
  const handleOpenBookingDialog = () => {
    setOpenNewBookingDialog(true);
  };


  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableTimeslots, setAvailableTimeslots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTimeslots, setSelectedTimeslots] = useState([]); // Multi-select timeslots from grid
  // State for per-timeslot kart quantities and selections
  const [timeslotKartQuantities, setTimeslotKartQuantities] = useState({});
  const [timeslotKartSelections, setTimeslotKartSelections] = useState({});
  const [currentTimeslotIndex, setCurrentTimeslotIndex] = useState(0); // For kart selection stepper
  const [openBookingsDialog, setOpenBookingsDialog] = useState(false);
const [dialogTimeslot, setDialogTimeslot] = useState(null); // For viewing bookings for a single timeslot
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openNewBookingDialog, setOpenNewBookingDialog] = useState(false);
  const [openKartSelectionDialog, setOpenKartSelectionDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // State for new booking
  const [newBookingData, setNewBookingData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: ''
  });
  
  // Multi-timeslot booking session state
  const [selectedTimeslotSessions, setSelectedTimeslotSessions] = useState([]); // [{ timeslot, selectedKarts, kartQuantities }]

  // State for kart selection for the current timeslot
  const [selectedKarts, setSelectedKarts] = useState([]);
  const [kartQuantities, setKartQuantities] = useState({});
  const [currentTimeslot, setCurrentTimeslot] = useState(null); // For dialog

  // Add state for custom time range
  const [useCustomTimeRange, setUseCustomTimeRange] = useState(false);
  const [customStartTime, setCustomStartTime] = useState("09:00");
  const [customEndTime, setCustomEndTime] = useState("18:00");
  
  // Get data from Redux store
  const { bookings = [], loading: bookingsLoading } = useSelector((state) => state.bookings);
  const { settings } = useSelector((state) => state.settings);
  const { karts = [], loading: kartsLoading } = useSelector((state) => state.karts);
  
  // Fetch bookings, karts, and timeslots when component mounts or date changes
  useEffect(() => {
    dispatch(getBookings());
    dispatch(getKarts());
    fetchTimeslots(selectedDate);
  }, [dispatch, selectedDate]);
  
  // Format date for display
  const formatDate = (date) => {
    return format(new Date(date), 'EEEE, d. MMMM yyyy', { locale: et });
  };
  
  // Format timeslot for display
  const formatTimeslot = (startTime, endTime) => {
    return `${startTime} - ${endTime}`;
  };
  
  // Fetch available timeslots for the selected date
  const fetchTimeslots = async (date) => {
    setLoading(true);
    setError(null);
    
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      console.log('Fetching timeslots for date:', formattedDate);
      
      // Get the user token from localStorage
      const userInfoString = localStorage.getItem('userInfo');
      const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
      const token = userInfo?.token;
      
      // Set the Authorization header if token exists
      if (token) {
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Added Authorization header with token');
      } else {
        console.warn('No token found in localStorage');
      }
      
      // Determine which endpoint to use based on useCustomTimeRange
      let url = `/api/bookings/timeslots?date=${formattedDate}`;
      
      if (useCustomTimeRange) {
        // Store the regular URL as a fallback
        const regularUrl = url;
        
        // Try to use the admin-timeslots endpoint
        url = `/api/bookings/admin-timeslots?date=${formattedDate}&customStartTime=${customStartTime}&customEndTime=${customEndTime}`;
        console.log('Using admin timeslots endpoint with custom time range');
        console.log('Custom start time:', customStartTime);
        console.log('Custom end time:', customEndTime);
        
        try {
          // Use axiosInstance instead of axios to ensure the request goes to the backend
          console.log(`Fetching timeslots from ${axiosInstance.defaults.baseURL}${url}`);
          
          // Log the auth token to check if it's being sent (only log that it exists, not the actual token)
          const hasAuthToken = axiosInstance.defaults.headers.common['Authorization'] ? 'Yes' : 'No';
          console.log('Has Authorization header:', hasAuthToken);
          
          const response = await axiosInstance.get(url);
          
          // If we get here, the admin endpoint worked
          console.log('Admin endpoint successful');
          
          // Ensure response.data is an array
          if (Array.isArray(response.data)) {
            console.log('Received timeslots array with length:', response.data.length);
            setAvailableTimeslots(response.data);
          } else {
            console.error('API did not return an array for timeslots:', response.data);
            // If not an array, set to empty array to prevent map errors
            setAvailableTimeslots([]);
          }
          
          // Exit the function early since we've handled everything
          setLoading(false);
          return;
        } catch (adminError) {
          // If the admin endpoint fails, fall back to the regular endpoint
          console.error('Admin endpoint failed, falling back to regular endpoint:', adminError);
          
          // Log more detailed error information
          if (adminError.response) {
            console.error('Admin error response data:', adminError.response.data);
            console.error('Admin error response status:', adminError.response.status);
          }
          
          // Show a notification to the user
          setError(t('admin_endpoint_error', 'Custom time range not available. Using regular timeslots instead.'));
          
          // Fall back to the regular endpoint
          console.log('Using fallback URL:', regularUrl);
          url = regularUrl;
        }
      }
      
      // Use axiosInstance instead of axios to ensure the request goes to the backend
      console.log(`Fetching timeslots from ${axiosInstance.defaults.baseURL}${url}`);
      
      // Log the auth token to check if it's being sent (only log that it exists, not the actual token)
      const hasAuthToken = axiosInstance.defaults.headers.common['Authorization'] ? 'Yes' : 'No';
      console.log('Has Authorization header:', hasAuthToken);
      
      const response = await axiosInstance.get(url);
      
      // Ensure response.data is an array
      if (Array.isArray(response.data)) {
        console.log('Received timeslots array with length:', response.data.length);
        setAvailableTimeslots(response.data);
      } else {
        console.error('API did not return an array for timeslots:', response.data);
        // If not an array, set to empty array to prevent map errors
        setAvailableTimeslots([]);
      }
    } catch (error) {
      console.error('Error fetching timeslots:', error);
      
      // Log more detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        
        // If it's a 401 or 403 error, it's likely an authentication issue
        if (error.response.status === 401 || error.response.status === 403) {
          setError(t('authentication_error', 'Authentication error. Please log in again as an admin user.'));
        } else {
          setError(t('error_fetching_timeslots', 'Failed to fetch timeslots: ' + (error.response.data?.message || error.message)));
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        setError(t('no_response_error', 'No response received from server'));
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        setError(t('error_fetching_timeslots', 'Failed to fetch timeslots: ' + error.message));
      }
      
      // Set to empty array on error
      setAvailableTimeslots([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Get bookings for a specific timeslot
  const getBookingsForTimeslot = (timeslot) => {
    if (!timeslot) return [];
    
    const { startTime, endTime } = timeslot;
    const timeslotStr = `${startTime}-${endTime}`;
    
    // Format the selected date to YYYY-MM-DD for comparison
    const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
    
    return bookings.filter(booking => {
      // First, check if the booking is for the selected date
      let bookingDateStr = '';
      
      if (booking.date) {
        // Convert booking date to string for comparison
        if (booking.date instanceof Date) {
          bookingDateStr = format(booking.date, 'yyyy-MM-dd');
        } else {
          // If it's a string, extract the date part
          bookingDateStr = new Date(booking.date).toISOString().split('T')[0];
        }
        
        // If dates don't match, exclude this booking
        if (bookingDateStr !== formattedSelectedDate) {
          return false;
        }
      } else {
        // If booking has no date, exclude it
        return false;
      }
      
      // Then check if this booking has selectedTimeslots that match this timeslot
      if (booking.selectedTimeslots && booking.selectedTimeslots.length > 0) {
        return booking.selectedTimeslots.some(ts => {
          // Normalize both timeslots for comparison
          const normalizedBookingTimeslot = ts.replace(/\s+/g, '');
          const normalizedCurrentTimeslot = timeslotStr.replace(/\s+/g, '');
          
          return normalizedBookingTimeslot === normalizedCurrentTimeslot;
        });
      }
      
      // Legacy fallback for bookings without selectedTimeslots
      return booking.startTime === startTime && booking.endTime === endTime;
    });
  };
  
  // Get the max karts per timeslot from settings
  const getMaxKartsPerTimeslot = () => {
    return settings?.maxKartsPerTimeslot || 9; // Default to 9 if not set
  };
  
  // Handle timeslot click
  const handleTimeslotClick = (timeslot, openDialog = false) => {
    if (openDialog) {
      setDialogTimeslot(timeslot);
      setOpenBookingsDialog(true);
      return;
    }
    
    // Set the current timeslot and open kart selection dialog
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
    } else if (selectedTimeslots.length > 0) {
      // Use the first timeslot's kart selection as a starting point for new timeslots
      const firstTimeslotKey = `${selectedTimeslots[0].startTime}-${selectedTimeslots[0].endTime}`;
      const firstSelections = timeslotKartSelections[firstTimeslotKey];
      const firstQuantities = timeslotKartQuantities[firstTimeslotKey];
      
      if (firstSelections && firstQuantities) {
        setSelectedKarts([...firstSelections]);
        setKartQuantities({...firstQuantities});
        console.log('Using first timeslot kart selection for new timeslot');
      } else {
        // Reset if no selections found
        setSelectedKarts([]);
        setKartQuantities({});
      }
    } else {
      // Reset kart selections for new timeslots
      setSelectedKarts([]);
      setKartQuantities({});
      console.log('Reset kart selections for new timeslot');
    }
    
    // Open the kart selection dialog
    setOpenKartSelectionDialog(true);
  };
  
  // Close bookings dialog
  const handleCloseBookingsDialog = () => {
    setOpenBookingsDialog(false);
  };
  
  // Handle edit booking
  const handleEditBooking = (booking) => {
    setSelectedBooking(booking);
    setOpenEditDialog(true);
  };
  
  // Close edit dialog
  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
  };
  
  // Handle delete booking
  const handleDeleteBookingClick = (booking) => {
    setSelectedBooking(booking);
    setDeleteConfirmOpen(true);
  };
  
  // Close delete confirm dialog
  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
  };
  
  // Confirm delete booking
  const handleDeleteBooking = () => {
    if (selectedBooking && selectedBooking._id) {
      dispatch(deleteBooking(selectedBooking._id))
        .unwrap()
        .then(() => {
          handleCloseDeleteConfirm();
          // Refresh timeslots
          fetchTimeslots(selectedDate);
          // Show success message
          alert(t('booking_deleted_successfully', 'Booking deleted successfully'));
        })
        .catch((error) => {
          console.error('Delete booking failed:', error);
          // Show error message
          alert(t('delete_booking_failed', 'Failed to delete booking'));
        });
    }
  };
  
  // Handle update booking
  const handleUpdateBooking = (values) => {
    if (selectedBooking && selectedBooking._id) {
      dispatch(updateBooking({ id: selectedBooking._id, bookingData: values }))
        .unwrap()
        .then(() => {
          handleCloseEditDialog();
          // Refresh timeslots
          fetchTimeslots(selectedDate);
          // Show success message
          alert(t('booking_updated_successfully', 'Booking updated successfully'));
        })
        .catch((error) => {
          console.error('Update booking failed:', error);
          // Show error message
          alert(t('update_booking_failed', 'Failed to update booking'));
        });
    }
  };
  
  // Handle new booking button click
  const handleNewBookingClick = () => {
    // Reset kart selection
    setSelectedKarts([]);
    setKartQuantities({});
    setCurrentTimeslot(dialogTimeslot);
    setOpenKartSelectionDialog(true);
  };

  // Add another timeslot to the session
  const handleAddTimeslot = () => {
    // Save current timeslot/kart selection to session
    if (currentTimeslot && selectedKarts.length > 0) {
      // Check if this timeslot is already in the sessions
      const existingIndex = selectedTimeslotSessions.findIndex(
        session => session.timeslot._id === currentTimeslot._id
      );
      
      if (existingIndex >= 0) {
        // Update existing session
        const updatedSessions = [...selectedTimeslotSessions];
        updatedSessions[existingIndex] = {
          timeslot: currentTimeslot,
          selectedKarts: [...selectedKarts],
          kartQuantities: { ...kartQuantities },
        };
        setSelectedTimeslotSessions(updatedSessions);
      } else {
        // Add new session
        setSelectedTimeslotSessions(prev => [
          ...prev,
          {
            timeslot: currentTimeslot,
            selectedKarts: [...selectedKarts],
            kartQuantities: { ...kartQuantities },
          },
        ]);
      }
    }
    // Reset selection state for next timeslot
    setSelectedKarts([]);
    setKartQuantities({});
    setCurrentTimeslot(null);
    setOpenKartSelectionDialog(false); // Close kart selection, show timeslot view
    // Do NOT open booking dialog here; admin can pick more timeslots
  };

  
  // Handle kart selection
  const handleKartSelect = (kartId, isSelected) => {
    if (isSelected) {
      setSelectedKarts([...selectedKarts, kartId]);
      // Initialize quantity to 1 if not already set
      if (!kartQuantities[kartId]) {
        setKartQuantities({
          ...kartQuantities,
          [kartId]: 1
        });
      }
    } else {
      setSelectedKarts(selectedKarts.filter(id => id !== kartId));
      // Remove quantity for this kart
      const newQuantities = { ...kartQuantities };
      delete newQuantities[kartId];
      setKartQuantities(newQuantities);
    }
  };
  
  // Handle quantity change
  const handleQuantityChange = (kartId, quantity) => {
    setKartQuantities({
      ...kartQuantities,
      [kartId]: quantity
    });
  };
  
  // Confirm kart selection
  const handleConfirmKartSelection = () => {
    if (currentTimeslot && selectedKarts.length > 0) {
      // Check if this timeslot is already selected (editing an existing selection)
      const existingIndex = selectedTimeslots.findIndex(
        ts => ts.startTime === currentTimeslot.startTime && ts.endTime === currentTimeslot.endTime
      );
      
      // Store the kart quantities for this specific timeslot
      const timeslotKey = `${currentTimeslot.startTime}-${currentTimeslot.endTime}`;
      
      // Store kart quantities for this timeslot
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
    }
    
    setOpenKartSelectionDialog(false); // Close dialog
  };

  

  // Close new booking dialog
  const handleCloseNewBookingDialog = () => {
    setOpenNewBookingDialog(false);
    setNewBookingData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      notes: ''
    });
  };
  
  // Handle new booking input change
  const handleNewBookingInputChange = (e) => {
    const { name, value } = e.target;
    setNewBookingData({
      ...newBookingData,
      [name]: value
    });
  };
  
  // Create new booking (multi-timeslot)
  const handleCreateBooking = () => {
    if (selectedTimeslots.length === 0) return;

    console.log('Creating booking with timeslots:', selectedTimeslots);
    console.log('Kart selections:', timeslotKartSelections);
    console.log('Kart quantities:', timeslotKartQuantities);

    // Prepare all timeslots and kart selections
    const allTimeslots = selectedTimeslots.map(timeslot => {
      return `${timeslot.startTime}-${timeslot.endTime}`;
    });
    
    const allKartSelections = [];
    
    // Process each selected timeslot
    selectedTimeslots.forEach(timeslot => {
      const timeslotKey = `${timeslot.startTime}-${timeslot.endTime}`;
      const kartSelections = timeslotKartSelections[timeslotKey] || [];
      const kartQtys = timeslotKartQuantities[timeslotKey] || {};
      
      // Add each kart selection for this timeslot
      kartSelections.forEach(kartId => {
        const kart = karts.find(k => k._id === kartId);
        allKartSelections.push({
          kart: kartId,
          quantity: kartQtys[kartId] || 1,
          pricePerSlot: kart?.pricePerSlot || 0,
          timeslot: timeslot._id, // Send only the timeslot ID
        });
      });
    });

    // Use the first timeslot for start/end/duration for legacy fields
    const { startTime, endTime } = selectedTimeslots[0];
    const bookingData = {
      ...newBookingData,
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime,
      endTime,
      duration: settings?.timeslotDuration || 30,
      selectedTimeslots: allTimeslots,
      kartSelections: allKartSelections,
      status: 'confirmed',
    };

    console.log('Sending booking data:', bookingData);

    dispatch(createBooking(bookingData))
      .unwrap()
      .then(() => {
        handleCloseNewBookingDialog();
        // Clear selected timeslots and kart selections
        setSelectedTimeslots([]);
        setTimeslotKartSelections({});
        setTimeslotKartQuantities({});
        // Refresh timeslots
        fetchTimeslots(selectedDate);
        alert(t('booking_created_successfully', 'Booking created successfully'));
      })
      .catch((error) => {
        console.error('Create booking failed:', error);
        alert(t('create_booking_failed', 'Failed to create booking'));
      });
  };

  
  // Render a timeslot button
  const renderTimeslotButton = (timeslot) => {
    const { startTime, endTime } = timeslot;
    
    // Get bookings for this timeslot
    const timeslotBookings = getBookingsForTimeslot(timeslot);
    const bookedKarts = timeslotBookings.reduce((total, booking) => {
      // Sum up all kart selections for this booking
      if (booking.kartSelections && booking.kartSelections.length > 0) {
        return total + booking.kartSelections.reduce((sum, selection) => sum + selection.quantity, 0);
      }
      return total;
    }, 0);
    
    // Get the max karts per timeslot from settings
    const maxKartsPerTimeslot = getMaxKartsPerTimeslot();
    
    // Calculate available karts
    const availableKarts = Math.max(0, maxKartsPerTimeslot - bookedKarts);
    
    // Apply a special style if this timeslot has bookings
    const buttonStyle = {
      py: 2,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: timeslotBookings.length > 0 ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
      '&:hover': {
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
      },
    };
    
    return (
      <Button
        fullWidth
        variant="outlined"
        color="primary"
        onClick={() => handleTimeslotClick(timeslot)}
        sx={buttonStyle}
      >
        <Box sx={{ 
          fontWeight: timeslotBookings.length > 0 ? 'bold' : 'normal',
          fontSize: '1rem'
        }}>
          {formatTimeslot(startTime, endTime)}
        </Box>
        <Box 
          sx={{ 
            fontSize: '0.75rem', 
            mt: 1,
            fontWeight: 'normal',
            color: 'rgba(0, 0, 0, 0.6)'
          }}
        >
          {t('booked_karts')}: {bookedKarts} / {maxKartsPerTimeslot}
        </Box>
        {timeslotBookings.length > 0 && (
          <Button 
            size="small" 
            variant="contained"
            color="primary" 
            onClick={(e) => {
              e.stopPropagation(); // Prevent the main button click
              setDialogTimeslot(timeslot);
              setOpenBookingsDialog(true);
            }}
            sx={{ 
              mt: 1, 
              minWidth: 120, 
              fontWeight: 'bold',
              fontSize: '0.75rem',
              py: 0.5,
              px: 2
            }}
          >
            {timeslotBookings.length} {t('bookings', 'BRONEERINGUD')}
          </Button>
        )}
      </Button>
    );
  };
  
  return (
    <Box>
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={et}>
            <DatePicker
              label={t('select_date')}
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom>
            {formatDate(selectedDate)}
          </Typography>
        </Grid>
        
        {/* Add custom time range controls */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={useCustomTimeRange}
                  onChange={(e) => {
                    setUseCustomTimeRange(e.target.checked);
                    // Refresh timeslots when toggling
                    if (selectedDate) {
                      fetchTimeslots(selectedDate);
                    }
                  }}
                />
              }
              label={t('use_custom_time_range', 'Use custom time range')}
            />
            
            {useCustomTimeRange && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={t('start_time', 'Start time')}
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 300 }}
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={t('end_time', 'End time')}
                      type="time"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 300 }}
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button 
                      variant="contained" 
                      onClick={() => fetchTimeslots(selectedDate)}
                      startIcon={<RefreshIcon />}
                    >
                      {t('apply_time_range', 'Apply time range')}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Selected Timeslots Section - Displayed above timeslots table */}
      {selectedTimeslots.length > 0 && (
        <Box sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {t('selected_timeslots', 'Valitud ajavahemikud')}
          </Typography>
          {selectedTimeslots.map((timeslot, idx) => {
            const timeslotKey = `${timeslot.startTime}-${timeslot.endTime}`;
            const kartSelections = timeslotKartSelections[timeslotKey] || [];
            const kartQtys = timeslotKartQuantities[timeslotKey] || {};
            
            return (
              <Paper key={idx} sx={{ p: 2, mb: 2, position: 'relative' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      {formatTimeslot(timeslot.startTime, timeslot.endTime)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {kartSelections.map(kartId => {
                        const kart = karts.find(k => k._id === kartId);
                        return `${kart?.name || 'Kart'} (${kartQtys[kartId] || 1})`;
                      }).join(', ')}
                    </Typography>
                  </Box>
                  <IconButton
                    edge="end"
                    aria-label="remove"
                    onClick={() => handleRemoveTimeslot(idx)}
                    size="small"
                    color="error"
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            );
          })}
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenBookingDialog}
            disabled={selectedTimeslots.length === 0}
            sx={{ mt: 1 }}
          >
            {t('confirm_booking', 'Jätka andmetega')}
          </Button>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      ) : !Array.isArray(availableTimeslots) ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t('invalid_timeslots_data', 'Invalid timeslots data received. Please refresh the page.')}
        </Alert>
      ) : availableTimeslots.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('no_timeslots_available', 'No timeslots available for this date')}
        </Alert>
      ) : (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {Array.isArray(availableTimeslots) && availableTimeslots.map((timeslot, index) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
              {renderTimeslotButton(timeslot)}
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Bookings Dialog */}
      <Dialog 
        open={openBookingsDialog} 
        onClose={handleCloseBookingsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {dialogTimeslot && (
            <>
              <Typography variant="h6">
                {formatTimeslot(dialogTimeslot.startTime, dialogTimeslot.endTime)}
                <Typography variant="subtitle2" component="span" sx={{ ml: 2, color: 'text.secondary' }}>
                  {formatDate(selectedDate)}
                </Typography>
              </Typography>
            </>
          )}
          <IconButton onClick={handleCloseBookingsDialog} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {dialogTimeslot && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  {t('bookings_list', 'Broneeringud')}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleNewBookingClick}
                  disabled={
                    // Disable if all karts are booked
                    getBookingsForTimeslot(dialogTimeslot).reduce((total, booking) => {
                      if (booking.kartSelections && booking.kartSelections.length > 0) {
                        return total + booking.kartSelections.reduce((sum, selection) => sum + selection.quantity, 0);
                      }
                      return total;
                    }, 0) >= getMaxKartsPerTimeslot()
                  }
                >
                  {t('add_booking', 'Lisa broneering')}
                </Button>
              </Box>
              
              {getBookingsForTimeslot(dialogTimeslot).length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {t('no_bookings_for_timeslot', 'Sellel ajal pole broneeringuid')}
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {getBookingsForTimeslot(dialogTimeslot).map((booking, index) => (
                    <Grid item xs={12} key={booking._id}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          borderLeft: '4px solid #1976d2',
                          position: 'relative'
                        }}
                      >
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              {booking.customerName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {booking.customerPhone}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {booking.customerEmail}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              {t('selected_karts', 'Valitud kardid')}:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {booking.kartSelections.map((selection, i) => (
                                <Chip 
                                  key={i}
                                  size="small" 
                                  label={`${selection.kart?.name || 'Kart'} x${selection.quantity}`} 
                                  color="primary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                            {booking.notes && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>{t('notes', 'Märkused')}:</strong> {booking.notes}
                                </Typography>
                              </Box>
                            )}
                          </Grid>
                          <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleEditBooking(booking)}
                              sx={{ mr: 1 }}
                            >
                              {t('edit', 'Muuda')}
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDeleteBookingClick(booking)}
                            >
                              {t('delete', 'Kustuta')}
                            </Button>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Edit Booking Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('edit_booking')}</DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <Box component="form" sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('customer_name')}
                    defaultValue={selectedBooking.customerName}
                    name="customerName"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('status')}</InputLabel>
                    <Select
                      defaultValue={selectedBooking.status}
                      label={t('status')}
                      name="status"
                    >
                      <MenuItem value="confirmed">{t('confirmed')}</MenuItem>
                      <MenuItem value="pending">{t('pending')}</MenuItem>
                      <MenuItem value="cancelled">{t('cancelled')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={et}>
                    <DatePicker
                      label={t('booking_date')}
                      defaultValue={selectedBooking.date ? new Date(selectedBooking.date) : selectedDate}
                      onChange={(newDate) => {
                        // Store the selected date in a hidden input field
                        const dateInput = document.getElementsByName('bookingDate')[0];
                        if (dateInput) {
                          dateInput.value = format(newDate, 'yyyy-MM-dd');
                        }
                      }}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                    <input 
                      type="hidden" 
                      name="bookingDate" 
                      defaultValue={selectedBooking.date ? format(new Date(selectedBooking.date), 'yyyy-MM-dd') : format(selectedDate, 'yyyy-MM-dd')} 
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('email')}
                    defaultValue={selectedBooking.customerEmail}
                    name="customerEmail"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('phone')}
                    defaultValue={selectedBooking.customerPhone}
                    name="customerPhone"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('notes')}
                    defaultValue={selectedBooking.notes}
                    name="notes"
                    multiline
                    rows={3}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>{t('cancel')}</Button>
          <Button 
            onClick={() => handleUpdateBooking({
              customerName: document.getElementsByName('customerName')[0].value,
              customerEmail: document.getElementsByName('customerEmail')[0].value,
              customerPhone: document.getElementsByName('customerPhone')[0].value,
              status: document.getElementsByName('status')[0].value,
              notes: document.getElementsByName('notes')[0].value,
              date: document.getElementsByName('bookingDate')[0].value,
            })}
            variant="contained"
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle>{t('confirm_delete')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('delete_booking_confirmation', { id: selectedBooking?._id })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>{t('cancel')}</Button>
          <Button 
            onClick={handleDeleteBooking} 
            variant="contained" 
            color="error"
          >
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>
      
      

      {/* Kart Selection Dialog */}
      <KartSelectionDialog
        open={openKartSelectionDialog}
        onClose={() => {
          setOpenKartSelectionDialog(false);
          setCurrentTimeslot(null);
          setSelectedKarts([]);
          setKartQuantities({});
        }}
        onConfirm={handleConfirmKartSelection}
        onAddTimeslot={handleAddTimeslot}
        timeslot={currentTimeslot}
        karts={karts}
        selectedKarts={selectedKarts}
        kartQuantities={kartQuantities}
        handleKartSelect={handleKartSelect}
        handleQuantityChange={handleQuantityChange}
        kartsLoading={kartsLoading}
        kartsError={null}
        isFirstTimeslot={selectedTimeslotSessions.length === 0}
      />

      
      {/* New Booking Dialog */}
      <Dialog
        open={openNewBookingDialog}
        onClose={handleCloseNewBookingDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('new_booking')}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label={t('customer_name')}
                  name="customerName"
                  value={newBookingData.customerName}
                  onChange={handleNewBookingInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label={t('email')}
                  name="customerEmail"
                  value={newBookingData.customerEmail}
                  onChange={handleNewBookingInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label={t('phone')}
                  name="customerPhone"
                  value={newBookingData.customerPhone}
                  onChange={handleNewBookingInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('notes')}
                  name="notes"
                  value={newBookingData.notes}
                  onChange={handleNewBookingInputChange}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('selected_times', 'Valitud ajad')}:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {selectedTimeslots.map((timeslot, idx) => {
                    const timeslotKey = `${timeslot.startTime}-${timeslot.endTime}`;
                    const kartSelections = timeslotKartSelections[timeslotKey] || [];
                    const kartQtys = timeslotKartQuantities[timeslotKey] || {};
                    
                    return (
                      <Box key={idx} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {formatTimeslot(timeslot.startTime, timeslot.endTime)}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {kartSelections.map(kartId => {
                            const kart = karts.find(k => k._id === kartId);
                            return (
                              <Chip
                                key={kartId}
                                label={`${kart?.name || 'Kart'} x${kartQtys[kartId] || 1}`}
                                color="primary"
                                size="small"
                              />
                            );
                          })}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewBookingDialog}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleCreateBooking}
            disabled={!newBookingData.customerName || !newBookingData.customerEmail || !newBookingData.customerPhone}
          >
            {t('create_booking')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </Box>
  );
};

export default AdminTimeslotView;
