import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';

const AdminBookingsDialog = ({ 
  open, 
  onClose, 
  selectedTimeslot,
  timeslotBookings, 
  loading, 
  error 
}) => {
  const { t } = useTranslation();

  // Helper function to format timeslot for display
  const formatTimeslot = (startTime, endTime) => {
    return `${startTime} - ${endTime}`;
  };
  
  // Group bookings by client for this timeslot
  const groupBookingsByClient = (bookings) => {
    const groupedBookings = {};
    
    // Ensure bookings is an array before calling forEach
    if (!Array.isArray(bookings)) {
      console.error('Expected bookings to be an array, got:', typeof bookings, bookings);
      return [];
    }
    
    console.log('Received bookings data:', JSON.stringify(bookings));
    
    bookings.forEach(booking => {
      // Ensure booking object has necessary properties
      if (!booking || typeof booking !== 'object') {
        console.warn('Invalid booking object:', booking);
        return;
      }
      
      // Create a unique key for each client
      const clientKey = `${booking.customerEmail || 'unknown'}-${booking.customerPhone || 'unknown'}`;
      
      // Handle timeslots - always ensure we have at least one timeslot with the current timeslot data
      // This prevents the "no timeslots found" message
      let timeslots = [];
      
      // If booking has timeslots array, use it
      if (Array.isArray(booking.timeslots) && booking.timeslots.length > 0) {
        timeslots = booking.timeslots;
      } 
      // If no timeslots but we have startTime/endTime, create a timeslot
      else if (booking.startTime && booking.endTime) {
        timeslots = [{
          startTime: booking.startTime,
          endTime: booking.endTime,
          karts: Array.isArray(booking.kartSelections) ? booking.kartSelections : []
        }];
      }
      
      // Log what we're processing
      console.log('Processing booking:', {
        id: booking._id,
        customerName: booking.customerName,
        timeslotsCount: timeslots.length,
        hasKarts: timeslots.length > 0 && 
                  timeslots[0].karts && 
                  Array.isArray(timeslots[0].karts) && 
                  timeslots[0].karts.length > 0
      });
      
      if (!groupedBookings[clientKey]) {
        groupedBookings[clientKey] = {
          customerName: booking.customerName || 'Unknown Customer',
          customerEmail: booking.customerEmail || '',
          customerPhone: booking.customerPhone || '',
          notes: booking.notes || '',
          bookingIds: [booking._id || ''],
          allTimeslots: timeslots
        };
      } else {
        groupedBookings[clientKey].bookingIds.push(booking._id || '');
        groupedBookings[clientKey].allTimeslots = [
          ...groupedBookings[clientKey].allTimeslots,
          ...timeslots
        ];
      }
    });
    
    // Additional logging to verify the processed data
    const result = Object.values(groupedBookings);
    console.log('Grouped client bookings:', result);
    
    return result;
  };

  // For debugging
  console.log('Raw timeslotBookings data:', timeslotBookings);
  
  // Get all client bookings grouped by client
  const clientBookings = Array.isArray(timeslotBookings) && timeslotBookings.length > 0 
    ? groupBookingsByClient(timeslotBookings) 
    : [];
  
  console.log('Processed clientBookings:', clientBookings);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        {selectedTimeslot && (
          <Typography variant="h6">
            {t('bookings_for_timeslot', 'Broneeringud ajavahemikule')} {formatTimeslot(selectedTimeslot.startTime, selectedTimeslot.endTime)}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        ) : (
          <Box>
            {clientBookings.length > 0 ? (
              clientBookings.map((client, index) => (
                <Paper key={index} sx={{ p: 3, mb: 3, backgroundColor: '#f8f8f8', borderLeft: '4px solid #2196f3' }}>
                  {/* Client Name - prominently displayed */}
                  <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
                    {client.customerName}
                  </Typography>
                  
                  {/* Client Contact Details */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <strong>{t('email', 'E-post')}:</strong>&nbsp;{client.customerEmail}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <strong>{t('phone', 'Telefon')}:</strong>&nbsp;{client.customerPhone}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {client.notes && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>{t('notes', 'Märkused')}:</strong> {client.notes}
                      </Typography>
                    </Box>
                  )}
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {/* Client Rides */}
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    {t('rides', 'Sõidud')}:
                  </Typography>
                  
                  <List>
                    {client.allTimeslots && client.allTimeslots.length > 0 ? (
                      client.allTimeslots.map((ts, tsIndex) => {
                        // Skip rendering if timeslot data is incomplete
                        if (!ts || !ts.startTime || !ts.endTime) {
                          console.warn('Skipping incomplete timeslot data:', ts);
                          return null;
                        }
                        
                        return (
                          <ListItem 
                            key={tsIndex} 
                            sx={{ 
                              mb: 1, 
                              p: 2, 
                              backgroundColor: selectedTimeslot && ts.startTime === selectedTimeslot.startTime ? '#e3f2fd' : '#f5f5f5',
                              borderRadius: 1,
                              display: 'block'
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {formatTimeslot(ts.startTime, ts.endTime)}
                              </Typography>
                              <Chip 
                                size="small" 
                                label={t('ride', 'Sõit') + ' ' + (tsIndex + 1)}
                                color="primary" 
                                variant="outlined"
                              />
                            </Box>
                            
                            {ts.karts && Array.isArray(ts.karts) && ts.karts.length > 0 ? (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                                  {t('selected_karts', 'Valitud kardid')}:
                                </Typography>
                                <Grid container spacing={1}>
                                  {ts.karts.map((kart, kartIndex) => {
                                    if (!kart) return null;
                                    return (
                                      <Grid item xs={12} sm={6} key={kartIndex}>
                                        <Paper 
                                          sx={{ 
                                            p: 1, 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            backgroundColor: kart.quantity > 1 ? '#e8f5e9' : '#fff'
                                          }}
                                        >
                                          <Typography variant="body2">
                                            {kart.name || (kart.kartId ? `Kart ID: ${kart.kartId}` : 'Unknown Kart')}
                                          </Typography>
                                          <Typography variant="body2" fontWeight="bold">
                                            {typeof kart.quantity === 'number' ? kart.quantity : 1} {t('units', 'tk')}
                                          </Typography>
                                        </Paper>
                                      </Grid>
                                    );
                                  })}
                                </Grid>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {t('no_karts_selected', 'Karte pole valitud')}
                              </Typography>
                            )}
                          </ListItem>
                        );
                      }).filter(item => item !== null)  // Filter out any null items
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t('no_timeslots_found', 'Ajavahemikke ei leitud')}
                      </Typography>
                    )}
                  </List>
                </Paper>
              ))
            ) : (
              <Alert severity="info" sx={{ my: 2 }}>
                {t('no_bookings_for_timeslot', 'Selle ajavahemiku jaoks pole broneeringuid')}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t('close', 'Sulge')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminBookingsDialog;
