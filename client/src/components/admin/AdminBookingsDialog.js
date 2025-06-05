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
  IconButton,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';

const AdminBookingsDialog = ({ 
  open, 
  onClose, 
  selectedTimeslot,
  timeslotBookings, 
  loading, 
  error,
  onEditBooking,
  onCancelBooking
}) => {
  const { t } = useTranslation();
  
  // Handle edit booking button click
  const handleEditClick = (event, booking) => {
    event.stopPropagation();
    if (onEditBooking) {
      onEditBooking(booking);
    }
  };
  
  // Handle cancel booking button click
  const handleCancelClick = (event, booking) => {
    event.stopPropagation();
    if (onCancelBooking) {
      onCancelBooking(booking);
    }
  };

  // Helper function to format timeslot for display
  const formatTimeslot = (startTime, endTime) => {
    return `${startTime} - ${endTime}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {selectedTimeslot && (
          <Typography variant="h6">
            {t('bookings_for_timeslot', 'Broneeringud ajavahemikule')} {formatTimeslot(selectedTimeslot.startTime, selectedTimeslot.endTime)}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
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
            {timeslotBookings && timeslotBookings.length > 0 ? (
              timeslotBookings.map((booking, index) => (
                <Paper key={booking._id} sx={{ p: 2, mb: 3, backgroundColor: '#f8f8f8', borderLeft: '4px solid', borderColor: booking.status === 'confirmed' ? 'success.main' : booking.status === 'cancelled' ? 'error.main' : 'warning.main' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6">
                        {booking.customerName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ 
                          display: 'inline-block', 
                          px: 1.5, 
                          py: 0.5, 
                          borderRadius: 1, 
                          fontSize: '0.75rem',
                          fontWeight: 'medium',
                          color: 'white',
                          bgcolor: booking.status === 'confirmed' ? 'success.main' : booking.status === 'cancelled' ? 'error.main' : 'warning.main',
                          mr: 1
                        }}>
                          {booking.status === 'confirmed' ? t('confirmed', 'Kinnitatud') : 
                           booking.status === 'cancelled' ? t('cancelled', 'Tühistatud') : 
                           t('pending', 'Ootel')}
                        </Box>
                        {booking.status !== 'cancelled' && (
                          <>
                            <Tooltip title={t('edit_booking', 'Muuda broneeringut')}>
                              <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={(e) => handleEditClick(e, booking)}
                                sx={{ mr: 0.5 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('cancel_booking', 'Tühista broneering')}>
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={(e) => handleCancelClick(e, booking)}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, display: 'flex' }}>
                        <strong style={{ minWidth: '80px' }}>{t('email', 'E-post')}:</strong> 
                        <span>{booking.customerEmail}</span>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, display: 'flex' }}>
                        <strong style={{ minWidth: '80px' }}>{t('phone', 'Telefon')}:</strong> 
                        <span>{booking.customerPhone}</span>
                      </Typography>
                      {booking.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: 'flex' }}>
                          <strong style={{ minWidth: '80px' }}>{t('notes', 'Märkused')}:</strong> 
                          <span>{booking.notes}</span>
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        {t('booked_timeslots', 'Broneeritud ajad')}:
                      </Typography>
                      {/* Display booking timeslots */}
                      {(() => {
                        // First determine which timeslots array to use
                        let timeslotsToUse = [];
                        
                        if (booking.timeslots && booking.timeslots.length > 0) {
                          timeslotsToUse = booking.timeslots;
                        } else if (booking.selectedTimeslots && booking.selectedTimeslots.length > 0) {
                          timeslotsToUse = booking.selectedTimeslots;
                        }
                        
                        if (timeslotsToUse.length > 0) {
                          return timeslotsToUse.map((ts, tsIndex) => {
                            // Get timeslot key for looking up kart selections
                            const timeslotKey = `${ts.startTime}-${ts.endTime}`;
                            
                            // Find karts for this timeslot
                            let kartsToShow = [];
                            
                            // First check if the timeslot has karts directly
                            if (ts.karts && Array.isArray(ts.karts) && ts.karts.length > 0) {
                              kartsToShow = ts.karts;
                            } 
                            // Then check timeslotKartSelections
                            else if (booking.timeslotKartSelections && booking.timeslotKartSelections[timeslotKey]) {
                              const kartIds = booking.timeslotKartSelections[timeslotKey];
                              const quantities = booking.timeslotKartQuantities?.[timeslotKey] || {};
                              
                              kartsToShow = kartIds.map(kartId => {
                                // Find kart details in kartSelections
                                const kartDetails = booking.kartSelections?.find(k => k.kartId === kartId);
                                return {
                                  kartId,
                                  name: kartDetails?.name || 'Unknown Kart',
                                  quantity: quantities[kartId] || kartDetails?.quantity || 1
                                };
                              });
                            }
                            // Finally fall back to overall kartSelections
                            else if (booking.kartSelections && booking.kartSelections.length > 0) {
                              kartsToShow = booking.kartSelections;
                            }
                            
                            return (
                              <Box key={tsIndex} sx={{ mb: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                                <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                  {formatTimeslot(ts.startTime, ts.endTime)}
                                </Typography>
                                
                                {kartsToShow.length > 0 ? (
                                  <Box sx={{ pl: 2, backgroundColor: '#ffffff', p: 1, borderRadius: 1, border: '1px solid #eee' }}>
                                    {kartsToShow.map((kart, kartIndex) => (
                                      <Typography key={kartIndex} variant="body2" sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        mb: 0.5
                                      }}>
                                        <span>{kart.name || 'Unknown Kart'}:</span> 
                                        <span><b>{kart.quantity}</b> {t('units', 'tk')}</span>
                                      </Typography>
                                    ))}
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    {t('no_karts_selected', 'Karte pole valitud')}
                                  </Typography>
                                )}
                              </Box>
                            );
                          });
                        } else {
                          return (
                            <Typography variant="body2" color="text.secondary">
                              {t('no_timeslots', 'Ajavahemikke pole valitud')}
                            </Typography>
                          );
                        }
                      })()}
                    </Grid>
                  </Grid>
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
        <Button onClick={onClose}>
          {t('close', 'Sulge')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminBookingsDialog;
