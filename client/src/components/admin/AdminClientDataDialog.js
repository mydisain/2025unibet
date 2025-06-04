import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
  Grid,
  Paper,
  CircularProgress
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

const AdminClientDataDialog = ({
  open,
  onClose,
  onConfirm,
  selectedTimeslots,
  timeslotKartSelections,
  timeslotKartQuantities,
  karts,
  loading
}) => {
  const { t } = useTranslation();
  
  const [clientData, setClientData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: ''
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setClientData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = () => {
    onConfirm(clientData);
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
  
  // Format timeslot for display
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
      <DialogTitle>{t('new_booking', 'Uus broneering')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            required
            margin="normal"
            label={t('customer_name', 'Kliendi nimi')}
            name="customerName"
            value={clientData.customerName}
            onChange={handleChange}
            placeholder={t('enter_customer_name', 'Sisesta kliendi nimi')}
          />
          <TextField
            fullWidth
            required
            margin="normal"
            label={t('customer_email', 'E-post')}
            name="customerEmail"
            type="email"
            value={clientData.customerEmail}
            onChange={handleChange}
            placeholder={t('enter_customer_email', 'Sisesta e-posti aadress')}
          />
          <TextField
            fullWidth
            required
            margin="normal"
            label={t('customer_phone', 'Telefon')}
            name="customerPhone"
            value={clientData.customerPhone}
            onChange={handleChange}
            placeholder={t('enter_customer_phone', 'Sisesta telefoninumber')}
          />
          <TextField
            fullWidth
            margin="normal"
            label={t('notes', 'Märkused')}
            name="notes"
            value={clientData.notes}
            onChange={handleChange}
            multiline
            rows={4}
            placeholder={t('enter_notes', 'Sisesta märkused')}
          />
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          {t('selected_timeslots', 'Valitud ajad')}:
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          {selectedTimeslots && selectedTimeslots.length > 0 ? selectedTimeslots.map((timeslot, index) => (
            <Paper 
              key={index} 
              elevation={1} 
              sx={{ 
                p: 2, 
                mb: 2, 
                backgroundColor: '#f5f5f5' 
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {formatTimeslot(timeslot.startTime, timeslot.endTime)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {getKartDetails(timeslot).map((kart, idx) => (
                      <Chip 
                        key={idx}
                        label={`${kart.name}: ${kart.quantity}`}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )) : (
            <Typography variant="body2" color="text.secondary">
              {t('no_timeslots_selected', 'Ühtegi ajavahemikku pole valitud')}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('cancel', 'Tühista')}
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading || !clientData.customerName || !clientData.customerEmail || !clientData.customerPhone}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            t('create_booking', 'Loo broneering')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminClientDataDialog;
