import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Grid,
  Paper,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';

const KartSelectionDialog = ({
  open,
  onClose,
  onConfirm,
  timeslot,
  karts,
  selectedKarts,
  kartQuantities,
  handleKartSelect,
  handleQuantityChange,
  kartsLoading,
  kartsError,
  isFirstTimeslot,
}) => {
  const { t } = useTranslation();

  if (!timeslot) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, pt: 2 }}>
        <DialogTitle sx={{ p: 0 }}>
          {t('select_karts_for_timeslot', { timeslot: `${timeslot.startTime} - ${timeslot.endTime}` })}
        </DialogTitle>
        <Button
          variant="contained"
          color="primary"
          onClick={typeof onAddTimeslot === 'function' ? onAddTimeslot : undefined}
          sx={{ minWidth: 120, ml: 2 }}
        >
          {t('add_timeslot', 'Lisa aegu')}
        </Button>
      </Box>
      <DialogContent>
        {kartsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : kartsError ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {kartsError}
          </Alert>
        ) : (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              {isFirstTimeslot
                ? t('first_timeslot_selection_info')
                : t('additional_timeslot_selection_info')}
            </DialogContentText>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              {karts && karts.map((kart) => {
                // Get availability for this kart in the current timeslot
                const kartAvailability = timeslot?.kartAvailability?.find(k => k._id === kart._id);
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
        <Button onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={selectedKarts.length === 0}
        >
          {t('confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KartSelectionDialog;
