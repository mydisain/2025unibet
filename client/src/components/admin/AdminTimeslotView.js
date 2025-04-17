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
  MenuItem
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { et } from 'date-fns/locale';
import axiosInstance from '../../utils/axiosConfig';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

// Import booking actions
import { getBookings, updateBooking, deleteBooking, createBooking } from '../../redux/slices/bookingSlice';
import { getKarts } from '../../redux/slices/kartSlice';

const AdminTimeslotView = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableTimeslots, setAvailableTimeslots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTimeslot, setSelectedTimeslot] = useState(null);
  const [openBookingsDialog, setOpenBookingsDialog] = useState(false);
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
  
  // State for kart selection
  const [selectedKarts, setSelectedKarts] = useState([]);
  const [kartQuantities, setKartQuantities] = useState({});
  
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
      // Use axiosInstance instead of axios to ensure the request goes to the backend
      console.log(`Fetching timeslots from ${axiosInstance.defaults.baseURL}/api/bookings/timeslots?date=${formattedDate}`);
      const response = await axiosInstance.get(`/api/bookings/timeslots?date=${formattedDate}`);
      
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
      setError(t('error_fetching_timeslots', 'Failed to fetch timeslots'));
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
    
    return bookings.filter(booking => {
      // Check if this booking has selectedTimeslots that match this timeslot
      if (booking.selectedTimeslots && booking.selectedTimeslots.length > 0) {
        return booking.selectedTimeslots.some(ts => {
          // Normalize both timeslots for comparison
          const normalizedBookingTimeslot = ts.replace(/\\s+/g, '');
          const normalizedCurrentTimeslot = timeslotStr.replace(/\\s+/g, '');
          
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
  const handleTimeslotClick = (timeslot) => {
    setSelectedTimeslot(timeslot);
    setOpenBookingsDialog(true);
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
    setOpenKartSelectionDialog(true);
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
    setOpenKartSelectionDialog(false);
    setOpenNewBookingDialog(true);
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
  
  // Create new booking
  const handleCreateBooking = () => {
    if (!selectedTimeslot) return;
    
    // Prepare kart selections
    const kartSelections = selectedKarts.map(kartId => {
      const kart = karts.find(k => k._id === kartId);
      return {
        kart: kartId,
        quantity: kartQuantities[kartId] || 1,
        pricePerSlot: kart?.pricePerSlot || 0
      };
    });
    
    // Prepare timeslot data
    const { startTime, endTime } = selectedTimeslot;
    const timeslotStr = `${startTime}-${endTime}`;
    
    // Create booking data
    const bookingData = {
      ...newBookingData,
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime,
      endTime,
      duration: settings?.timeslotDuration || 30,
      selectedTimeslots: [timeslotStr],
      kartSelections,
      status: 'confirmed'
    };
    
    // Dispatch create booking action
    dispatch(createBooking(bookingData))
      .unwrap()
      .then(() => {
        handleCloseNewBookingDialog();
        // Refresh timeslots
        fetchTimeslots(selectedDate);
        // Show success message
        alert(t('booking_created_successfully', 'Booking created successfully'));
      })
      .catch((error) => {
        console.error('Create booking failed:', error);
        // Show error message
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
          <Chip 
            size="small" 
            label={`${timeslotBookings.length} ${t('bookings')}`} 
            color="primary" 
            sx={{ mt: 1 }}
          />
        )}
      </Button>
    );
  };
  
  return (
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
      </Grid>
      
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
        <DialogTitle>
          {selectedTimeslot && (
            <>
              {t('bookings_for_timeslot', 'Bookings for timeslot')}:{' '}
              {formatTimeslot(selectedTimeslot.startTime, selectedTimeslot.endTime)}
            </>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedTimeslot && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {formatDate(selectedDate)}
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleNewBookingClick}
                  disabled={
                    // Disable if all karts are booked
                    getBookingsForTimeslot(selectedTimeslot).reduce((total, booking) => {
                      if (booking.kartSelections && booking.kartSelections.length > 0) {
                        return total + booking.kartSelections.reduce((sum, selection) => sum + selection.quantity, 0);
                      }
                      return total;
                    }, 0) >= getMaxKartsPerTimeslot()
                  }
                >
                  {t('add_booking')}
                </Button>
              </Box>
              
              {getBookingsForTimeslot(selectedTimeslot).length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {t('no_bookings_for_timeslot', 'No bookings for this timeslot')}
                </Alert>
              ) : (
                <List>
                  {getBookingsForTimeslot(selectedTimeslot).map((booking, index) => (
                    <React.Fragment key={booking._id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1">
                              {booking.customerName} ({booking.customerPhone})
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" component="span">
                                {booking.customerEmail}
                              </Typography>
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" component="span">
                                  {t('karts')}:{' '}
                                  {booking.kartSelections.map((selection, i) => (
                                    <Chip 
                                      key={i}
                                      size="small" 
                                      label={`${selection.kart?.name || 'Kart'} x${selection.quantity}`} 
                                      sx={{ mr: 0.5, mb: 0.5 }}
                                    />
                                  ))}
                                </Typography>
                              </Box>
                              {booking.notes && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="body2">
                                    {t('notes')}: {booking.notes}
                                  </Typography>
                                </Box>
                              )}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" aria-label="edit" onClick={() => handleEditBooking(booking)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteBookingClick(booking)}>
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < getBookingsForTimeslot(selectedTimeslot).length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBookingsDialog}>{t('close')}</Button>
        </DialogActions>
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
      <Dialog
        open={openKartSelectionDialog}
        onClose={() => setOpenKartSelectionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('select_karts_for_timeslot', { 
            timeslot: selectedTimeslot ? `${selectedTimeslot.startTime} - ${selectedTimeslot.endTime}` : '' 
          })}
        </DialogTitle>
        <DialogContent>
          {kartsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                {t('admin_kart_selection_info', 'Select karts for the new booking')}
              </DialogContentText>

              <Grid container spacing={3} sx={{ mt: 2 }}>
                {karts && karts.map((kart) => {
                  // Get availability for this kart in the current timeslot
                  const kartAvailability = selectedTimeslot?.kartAvailability?.find(k => k._id === kart._id);
                  const availableQuantity = kartAvailability?.available || 0;

                  return (
                    <Grid item xs={12} key={kart._id}>
                      <Paper
                        sx={{
                          p: 3,
                          border: selectedKarts.includes(kart._id) ? '2px solid #1976d2' : '1px solid #e0e0e0',
                          '&:hover': {
                            boxShadow: 3,
                          },
                        }}
                      >
                        <Box
                          onClick={() => handleKartSelect(kart._id, !selectedKarts.includes(kart._id))}
                          sx={{ cursor: availableQuantity > 0 ? 'pointer' : 'not-allowed' }}
                        >
                          <Grid container alignItems="center" spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="h6">{kart.name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {kart.description}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="subtitle1">
                                {t('price')}: {kart.pricePerSlot} €
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {t('available')}: {availableQuantity}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <Typography variant="body2" sx={{ mr: 1 }}>{t('quantity')}:</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // If kart is selected and quantity > 1, decrease quantity
                                      if (selectedKarts.includes(kart._id) && kartQuantities[kart._id] > 1) {
                                        handleQuantityChange(kart._id, kartQuantities[kart._id] - 1);
                                      } else if (selectedKarts.includes(kart._id) && kartQuantities[kart._id] === 1) {
                                        // If quantity is 1, deselect the kart
                                        handleKartSelect(kart._id, false);
                                      }
                                    }}
                                    disabled={!selectedKarts.includes(kart._id) || kartQuantities[kart._id] <= 0}
                                  >
                                    -
                                  </Button>
                                  <Typography sx={{ mx: 1 }}>
                                    {selectedKarts.includes(kart._id) ? (kartQuantities[kart._id] || 1) : 0}
                                  </Typography>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const maxAvailable = Math.min(availableQuantity, kart.quantity || 1);

                                      // If kart is not selected, select it with quantity 1
                                      if (!selectedKarts.includes(kart._id)) {
                                        handleKartSelect(kart._id, true);
                                      }
                                      // If kart is already selected, increase quantity if possible
                                      else if (kartQuantities[kart._id] < maxAvailable) {
                                        handleQuantityChange(kart._id, kartQuantities[kart._id] + 1);
                                      }
                                    }}
                                    disabled={selectedKarts.includes(kart._id) && kartQuantities[kart._id] >= Math.min(availableQuantity, kart.quantity || 1) || availableQuantity <= 0}
                                  >
                                    +
                                  </Button>
                                </Box>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenKartSelectionDialog(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmKartSelection}
            disabled={selectedKarts.length === 0}
          >
            {t('next')}
          </Button>
        </DialogActions>
      </Dialog>
      
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
                  {t('selected_karts')}:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedKarts.map(kartId => {
                    const kart = karts.find(k => k._id === kartId);
                    return (
                      <Chip
                        key={kartId}
                        label={`${kart?.name || 'Kart'} x${kartQuantities[kartId] || 1}`}
                        color="primary"
                      />
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
  );
};

export default AdminTimeslotView;
