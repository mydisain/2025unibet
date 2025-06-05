import React, { useState, useEffect } from 'react';
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
  loading,
  existingClientData = null,
  viewOnly = false
}) => {
  const { t } = useTranslation();
  
  const [clientData, setClientData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: ''
  });
  
  // Initialize client data if provided
  useEffect(() => {
    if (existingClientData) {
      setClientData(existingClientData);
    }
  }, [existingClientData]);
  
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
      <DialogTitle>
        {viewOnly 
          ? t('booking_details', 'Broneeringu detailid') 
          : t('client_data', 'Kliendi andmed')}
      </DialogTitle>
      <DialogContent>
        {viewOnly ? (
          <Box sx={{ minWidth: 400 }}>
            <Typography variant="h6" gutterBottom>
              {t('client_information', 'Kliendi informatsioon')}
            </Typography>
            <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: '#f8f8f8' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {clientData.customerName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>{t('email', 'E-post')}:</strong> {clientData.customerEmail}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>{t('phone', 'Telefon')}:</strong> {clientData.customerPhone}
              </Typography>
              {clientData.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>{t('notes', 'Märkused')}:</strong> {clientData.notes}
                </Typography>
              )}
            </Paper>
          </Box>
        ) : (
          <Box sx={{ minWidth: 400 }}>
            <TextField
              fullWidth
              required
              margin="normal"
              label={t('customer_name', 'Nimi')}
              name="customerName"
              value={clientData.customerName}
              onChange={handleChange}
              placeholder={t('enter_customer_name', 'Sisesta nimi')}
            />
            <TextField
              fullWidth
              required
              margin="normal"
              label={t('customer_email', 'E-post')}
              name="customerEmail"
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
        )}
        
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
          {viewOnly ? t('close', 'Sulge') : t('cancel', 'Tühista')}
        </Button>
        {!viewOnly && (
          <Button 
            onClick={handleSubmit}
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              t('save', 'Salvesta')
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AdminClientDataDialog;
