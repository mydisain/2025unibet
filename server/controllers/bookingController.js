const asyncHandler = require('express-async-handler');
const nodemailer = require('nodemailer');
const Booking = require('../models/bookingModel');
const Kart = require('../models/kartModel');
const Setting = require('../models/settingModel');

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

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Public
const createBooking = asyncHandler(async (req, res) => {
  // Check if this is an admin booking (from admin endpoint)
  const isAdminBooking = req.originalUrl.includes('/admin');
  console.log('Request path:', req.originalUrl, 'isAdminBooking:', isAdminBooking);
  console.log('Request body:', JSON.stringify(req.body));
  
  // Declare these variables in outer scope so they're accessible throughout the function
  let bookingData = {};
  let bookingTimeslots = [];
  let timeslotKartSelections = {};
  let timeslotKartQuantities = {};
  let kartSelections = [];
  
  try { // Add top-level try-catch for better error handling
  
  if (isAdminBooking) {
    // Handle admin booking format
    console.log('Creating admin booking');
    const { date, timeslots, customerName, customerEmail, customerPhone, notes } = req.body;
    
    if (!date || !timeslots || !Array.isArray(timeslots) || timeslots.length === 0) {
      res.status(400);
      throw new Error('Invalid admin booking data. Date and timeslots are required.');
    }
    
    // Use client-provided data with fallbacks
    bookingData = {
      customerName: customerName || 'Admin Booking',
      customerEmail: customerEmail || 'admin@bookid.ee',
      customerPhone: customerPhone || '123456789',
      date,
      notes: notes || 'Created by admin',
      status: 'confirmed',
      duration: timeslots.length > 0 ? 
                calculateDuration(timeslots[0].startTime, timeslots[0].endTime) : 
                30 // default duration in minutes
    };
    
    console.log('Admin booking client data:', bookingData);
    
    // Validate that we have valid email and phone data
    if (!bookingData.customerEmail || !bookingData.customerEmail.includes('@')) {
      console.warn('Invalid or missing email in admin booking:', bookingData.customerEmail);
      bookingData.customerEmail = 'admin@bookid.ee'; // Set a default valid email
    }
    
    if (!bookingData.customerPhone || bookingData.customerPhone.length < 3) {
      console.warn('Invalid or missing phone in admin booking');
      bookingData.customerPhone = '123456789'; // Set a default valid phone
    }
    
    // Process timeslots from admin format and ensure proper data structure
    console.log('Processing admin timeslots:', timeslots);
    bookingTimeslots = timeslots.map(ts => ({
      startTime: ts.startTime || '10:00',
      endTime: ts.endTime || '10:30'
    }));
    
    // Defensive validation of startTime and endTime
    bookingTimeslots = bookingTimeslots.filter(ts => 
      typeof ts.startTime === 'string' && 
      typeof ts.endTime === 'string' && 
      ts.startTime.includes(':') && 
      ts.endTime.includes(':'));
    
    if (bookingTimeslots.length === 0) {
      throw new Error('Invalid or missing timeslot format. Expected HH:MM format for startTime and endTime');
    }
    
    // Process kart selections from admin format
    if (timeslots && timeslots.length > 0) {
      timeslots.forEach(ts => {
        const timeslotKey = `${ts.startTime}-${ts.endTime}`;
        
        // Verify karts array exists and is valid
        if (ts.karts && Array.isArray(ts.karts)) {
          // Store kart selections for this timeslot
          timeslotKartSelections[timeslotKey] = ts.karts.map(k => k.kartId);
          
          // Store kart quantities for this timeslot
          const quantities = {};
          ts.karts.forEach(k => {
            quantities[k.kartId] = k.quantity || 1;
            
            // Add to overall kart selections for backward compatibility
            const existingKart = kartSelections.find(ks => ks.kartId === k.kartId);
            if (existingKart) {
              existingKart.quantity += (k.quantity || 1);
            } else {
              kartSelections.push({
                kartId: k.kartId,
                name: k.name || `Kart #${k.kartId}`,
                quantity: k.quantity || 1,
                pricePerSlot: k.pricePerSlot || 10 // Default price if not provided
              });
            }
          });
          
          timeslotKartQuantities[timeslotKey] = quantities;
        }
      });
    }
    
    console.log('Admin booking data processed:');
    console.log('Booking timeslots:', bookingTimeslots);
    console.log('Kart selections:', kartSelections);
    console.log('Timeslot kart selections:', timeslotKartSelections);
    console.log('Timeslot kart quantities:', timeslotKartQuantities);
  } else {
    // Handle regular public booking format
    const {
      customerName,
      customerEmail,
      customerPhone,
      date,
      startTime,
      endTime,
      duration,
      selectedTimeslots,
      kartSelections: reqKartSelections,
      timeslotKartSelections: reqTimeslotKartSelections,
      timeslotKartQuantities: reqTimeslotKartQuantities,
      notes,
    } = req.body;

    console.log('Creating public booking with the following data:');
    console.log('Selected timeslots:', selectedTimeslots);
    console.log('Kart selections:', reqKartSelections);
    console.log('Timeslot kart selections:', reqTimeslotKartSelections);
    console.log('Timeslot kart quantities:', reqTimeslotKartQuantities);
    
    bookingData = {
      customerName,
      customerEmail,
      customerPhone,
      date,
      startTime,
      endTime,
      duration,
      notes,
      status: 'confirmed'
    };
    
    // Store the selected timeslots if provided
    bookingTimeslots = selectedTimeslots || [];
    kartSelections = reqKartSelections || [];
    timeslotKartSelections = reqTimeslotKartSelections || {};
    timeslotKartQuantities = reqTimeslotKartQuantities || {};
  }

  // Get settings for timeslot duration
  const setting = await Setting.getSetting();
  const { timeslotDuration } = setting;
  
  // Calculate total price based on actual timeslot duration
  let totalPrice = 0;
  
  // For regular bookings, calculate based on selected karts
  if (!isAdminBooking) {
    for (const selection of kartSelections) {
      totalPrice += selection.quantity * (selection.pricePerSlot || 0);
    }
  }
  
  // Ensure date is properly converted to a Date object
  const bookingDate = new Date(bookingData.date);
  // Reset the time to midnight to ensure consistent date handling
  bookingDate.setUTCHours(0, 0, 0, 0);
  
  // Calculate totalPrice for admin bookings if needed
  if (isAdminBooking) {
    try {
      // Make sure we have valid kart selections with prices
      if (!kartSelections || kartSelections.length === 0) {
        console.warn('No kart selections found for admin booking, using default price');
        totalPrice = 10;
      } else {
        // Calculate price based on kart selections
        totalPrice = kartSelections.reduce((total, ks) => {
          const pricePerSlot = ks.pricePerSlot || 10; // Default price if not provided
          const quantity = ks.quantity || 1; // Default quantity if not provided
          const price = quantity * pricePerSlot;
          console.log(`Kart ${ks.kartId} price: ${pricePerSlot}€ × ${quantity} = ${price}€`);
          return total + price;
        }, 0);
        
        console.log(`Calculated total price for admin booking: ${totalPrice}€`);
        
        // Sanity check and default price
        if (totalPrice <= 0) {
          console.log('Calculated price is zero or negative, using default price');
          totalPrice = 10; // Default minimum price
        }
      }
    } catch (error) {
      console.error('Error calculating price for admin booking:', error);
      totalPrice = 10; // Default price on error
    }
  }

  console.log('Creating booking with data:', {
    customerName: bookingData.customerName,
    date: bookingDate,
    timeslotsCount: bookingTimeslots.length,
    kartsCount: kartSelections.length,
    totalPrice
  });

  const booking = await Booking.create({
    ...bookingData,
    date: bookingDate,
    selectedTimeslots: bookingTimeslots,
    kartSelections,
    timeslotKartSelections,
    timeslotKartQuantities,
    totalPrice
  });

  if (booking) {
    // Send confirmation email only for public bookings
    if (!isAdminBooking) {
      await sendBookingConfirmationEmail(booking);
    }
    
    res.status(201).json(booking);
  } else {
    res.status(400);
    throw new Error('Invalid booking data');
  }
  
  } catch (error) {
    // Detailed error logging to diagnose admin booking issues
    console.error('Error in createBooking controller:', error);
    console.error('Stack trace:', error.stack);
    
    // If headers haven't been sent yet, send an appropriate response
    if (!res.headersSent) {
      res.status(500).json({
        message: `Server error creating booking: ${error.message}`,
        details: isAdminBooking ? 'Error creating admin booking' : 'Error creating public booking'
      });
    }
  }
});

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private/Admin
const getBookings = asyncHandler(async (req, res) => {
  const { startDate, endDate, status } = req.query;
  
  let query = {};
  
  // Filter by date range if provided
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  } else if (startDate) {
    query.date = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.date = { $lte: new Date(endDate) };
  }
  
  // Filter by status if provided
  if (status) {
    query.status = status;
  }
  
  const bookings = await Booking.find(query)
    .sort({ date: 1, startTime: 1 })
    .populate('kartSelections.kart', 'name type');
    
  res.json(bookings);
});

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private/Admin
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('kartSelections.kart');

  if (booking) {
    res.json(booking);
  } else {
    res.status(404);
    throw new Error('Booking not found');
  }
});

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private/Admin
const updateBooking = asyncHandler(async (req, res) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    date,
    startTime,
    endTime,
    duration,
    kartSelections,
    status,
    notes,
  } = req.body;

  const booking = await Booking.findById(req.params.id);

  if (booking) {
    // Calculate total price if kartSelections changed
    let totalPrice = booking.totalPrice;
    if (kartSelections) {
      totalPrice = 0;
      for (const selection of kartSelections) {
        totalPrice += selection.quantity * selection.pricePerSlot * ((duration || booking.duration) / 30);
      }
    }

    booking.customerName = customerName || booking.customerName;
    booking.customerEmail = customerEmail || booking.customerEmail;
    booking.customerPhone = customerPhone || booking.customerPhone;
    booking.date = date || booking.date;
    booking.startTime = startTime || booking.startTime;
    booking.endTime = endTime || booking.endTime;
    booking.duration = duration || booking.duration;
    booking.kartSelections = kartSelections || booking.kartSelections;
    booking.totalPrice = totalPrice;
    booking.status = status || booking.status;
    booking.notes = notes !== undefined ? notes : booking.notes;

    const updatedBooking = await booking.save();
    
    // Send email notification if status changed to cancelled
    if (status === 'cancelled' && booking.status !== 'cancelled') {
      await sendBookingCancellationEmail(updatedBooking);
    }
    
    res.json(updatedBooking);
  } else {
    res.status(404);
    throw new Error('Booking not found');
  }
});

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private/Admin
const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (booking) {
    await booking.remove();
    res.json({ message: 'Booking removed' });
  } else {
    res.status(404);
    throw new Error('Booking not found');
  }
});

// @desc    Get available timeslots for a specific date
// @route   GET /api/bookings/timeslots
// @access  Public
const getAvailableTimeslots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  
  if (!date) {
    res.status(400);
    throw new Error('Date is required');
  }
  
  // Get current date and time
  const currentDate = new Date();
  const requestDateObj = new Date(date);
  
  // Set both dates to midnight to compare just the dates
  const currentDateMidnight = new Date(currentDate);
  currentDateMidnight.setHours(0, 0, 0, 0);
  
  const requestDateMidnight = new Date(requestDateObj);
  requestDateMidnight.setHours(0, 0, 0, 0);
  
  // If the requested date is in the past, return empty array
  if (requestDateMidnight < currentDateMidnight) {
    console.log('Requested date is in the past, returning empty array');
    return res.json([]);
  }
  
  // Get settings
  const setting = await Setting.getSetting();
  const { timeslotDuration } = setting;
  
  // Get working hours for the day
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][requestDateObj.getDay()];
  const workingHours = setting.workingHours.find(wh => wh.day === dayOfWeek);
  
  // Check if it's a holiday
  const isHoliday = setting.holidays && setting.holidays.some(holiday => {
    try {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toDateString() === requestDateObj.toDateString();
    } catch (error) {
      console.error('Error comparing holiday date:', error);
      return false;
    }
  });
  
  // If closed or holiday, return empty array
  if (isHoliday || !workingHours.isOpen) {
    return res.json([]);
  }
  
  // Get all possible timeslots for the day
  const timeslots = generateTimeslots(workingHours.openTime, workingHours.closeTime, timeslotDuration);
  
  // Get all karts
  const karts = await Kart.find({ isActive: true });
  
  // Get max karts per timeslot from settings
  const maxKartsPerTimeslot = setting.maxKartsPerTimeslot || 9;
  
  console.log('Querying bookings for date:', date);
  
  // Convert the date to a consistent format (YYYY-MM-DD)
  const dateString = date.split('T')[0].split('?')[0]; // Handle both ISO format and query params
  console.log('Normalized date string:', dateString);
  
  // Query bookings directly with a date filter for the specific date
  // Convert the date string to a Date object for proper MongoDB date comparison
  const queryDate = new Date(dateString);
  // Set time to midnight for the start of the day
  queryDate.setUTCHours(0, 0, 0, 0);
  // Create end of day date by adding 24 hours
  const nextDay = new Date(queryDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  
  console.log(`Querying bookings between ${queryDate.toISOString()} and ${nextDay.toISOString()}`);
  
  // Query bookings for the specific date range and not cancelled
  const bookings = await Booking.find({
    date: { $gte: queryDate, $lt: nextDay },
    status: { $ne: 'cancelled' }
  });
  
  console.log(`Found ${bookings.length} bookings for date ${dateString}`);
  if (bookings.length > 0) {
    console.log('First booking:', JSON.stringify({
      id: bookings[0]._id,
      date: bookings[0].date,
      startTime: bookings[0].startTime,
      endTime: bookings[0].endTime,
      selectedTimeslots: bookings[0].selectedTimeslots,
      kartSelections: bookings[0].kartSelections
    }, null, 2));
  }
  
  // Get current time in HH:MM format if the requested date is today
  let currentTime = null;
  if (requestDateMidnight.getTime() === currentDateMidnight.getTime()) {
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    currentTime = `${hours}:${minutes}`;
    console.log('Current time:', currentTime);
  }
  
  // Calculate availability for each timeslot
  let availableTimeslots = timeslots.map(timeslot => {
    const { startTime } = timeslot;
    
    // Find bookings that overlap with this timeslot
    const overlappingBookings = bookings.filter(booking => {
      // Format the current timeslot for comparison
      const timeslotStr = `${startTime}-${addMinutesToTime(startTime, timeslotDuration)}`;
      
      // Log all timeslots for debugging
      console.log(`Checking timeslot ${timeslotStr} against booking ${booking._id}`);
      
      // ONLY check if this specific timeslot is in the booking's selectedTimeslots array
      if (booking.selectedTimeslots && booking.selectedTimeslots.length > 0) {
        console.log(`Booking ${booking._id} has selectedTimeslots:`, booking.selectedTimeslots);
        
        // Use the normalized comparison to check for matches
        const isOverlapping = booking.selectedTimeslots.some(ts => {
          // Normalize both timeslots for comparison
          const normalizedBookingTimeslot = normalizeTimeslot(ts);
          const normalizedCurrentTimeslot = normalizeTimeslot(timeslotStr);
          
          // Check for exact match with normalized format
          const exactMatch = normalizedBookingTimeslot === normalizedCurrentTimeslot;
          
          // Check for start time match as fallback
          const startTimeMatch = ts.split('-')[0].trim() === startTime;
          
          const matches = exactMatch || startTimeMatch;
          if (matches) {
            console.log(`Match found for timeslot ${timeslotStr}:`);
            console.log(`  - Booking timeslot: ${ts}`);
            console.log(`  - Normalized booking: ${normalizedBookingTimeslot}`);
            console.log(`  - Normalized current: ${normalizedCurrentTimeslot}`);
            console.log(`  - Exact match: ${exactMatch}, Start time match: ${startTimeMatch}`);
          }
          
          return matches;
        });
        
        return isOverlapping;
      }
      
      // Legacy fallback for bookings without selectedTimeslots
      const bookingStartTime = booking.startTime;
      
      // Simple overlap check for legacy bookings
      const isOverlapping = (bookingStartTime === startTime);
      if (isOverlapping) {
        console.log(`Legacy booking ${booking._id} overlaps with timeslot ${startTime} (using startTime match)`);
      }
      return isOverlapping;
    });
    
    if (overlappingBookings.length > 0) {
      console.log(`Found ${overlappingBookings.length} overlapping bookings for timeslot ${startTime}`);
    }
    
    // Calculate remaining kart quantities
    const kartAvailability = karts.map(kart => {
      const bookedQuantity = overlappingBookings.reduce((total, booking) => {
        // Format the current timeslot for comparison
        const timeslotStr = `${startTime}-${addMinutesToTime(startTime, timeslotDuration)}`;
        
        // Find this kart in the booking's kartSelections, but only for this specific timeslot
        const kartSelections = booking.kartSelections.filter(selection => {
          // Check if this selection is for the current timeslot
          if (selection.timeslot) {
            // If the selection has a timeslot property, check if it matches the current timeslot
            return normalizeTimeslot(selection.timeslot) === normalizeTimeslot(timeslotStr);
          } else {
            // Legacy bookings without timeslot-specific selections
            return true;
          }
        });
        
        // Sum up quantities for this kart in this specific timeslot
        const timeslotQuantity = kartSelections.reduce((sum, selection) => {
          if (selection.kart && selection.kart.toString() === kart._id.toString()) {
            return sum + selection.quantity;
          }
          return sum;
        }, 0);
        
        if (timeslotQuantity > 0) {
          console.log(`Kart ${kart.name} (${kart._id}) has ${timeslotQuantity} booked for timeslot ${startTime} in booking ${booking._id}`);
        }
        
        return total + timeslotQuantity;
      }, 0);
      
      const available = Math.max(0, kart.quantity - bookedQuantity);
      if (bookedQuantity > 0) {
        console.log(`Kart ${kart.name}: total=${kart.quantity}, booked=${bookedQuantity}, available=${available}`);
      }
      
      return {
        _id: kart._id,
        name: kart.name,
        type: kart.type,
        pricePerSlot: kart.pricePerSlot,
        available: available,
        total: kart.quantity,
        booked: bookedQuantity // Add this for debugging
      };
    });
    
    // Calculate total available places for this timeslot
    const rawTotalAvailability = kartAvailability.reduce((total, kart) => total + kart.available, 0);
    const totalBooked = kartAvailability.reduce((total, kart) => total + kart.booked, 0);
    const rawTotalKarts = kartAvailability.reduce((total, kart) => total + kart.total, 0);
    
    // Limit by the max karts per timeslot setting
    const totalKarts = Math.min(rawTotalKarts, maxKartsPerTimeslot);
    
    // Calculate availability based on the max karts setting, not the raw total
    // If totalBooked >= maxKartsPerTimeslot, then availability should be 0
    const totalAvailability = Math.max(0, maxKartsPerTimeslot - totalBooked);
    
    console.log(`Timeslot ${startTime}: raw total=${rawTotalKarts}, max setting=${maxKartsPerTimeslot}, limited total=${totalKarts}, booked=${totalBooked}, available=${totalAvailability}, raw available=${rawTotalAvailability}`);
    
    return {
      ...timeslot,
      kartAvailability,
      totalAvailability,
      totalBooked,
      totalKarts
    };
  });
  
  // Filter out past timeslots if the requested date is today
  if (currentTime) {
    availableTimeslots = availableTimeslots.filter(timeslot => {
      return compareTime(timeslot.startTime, currentTime) >= 0;
    });
    console.log(`Filtered out past timeslots for today, ${availableTimeslots.length} timeslots remaining`);
  }
  
  res.json(availableTimeslots);
});

// Helper function to generate timeslots
const generateTimeslots = (openTime, closeTime, duration) => {
  const timeslots = [];
  let currentTime = openTime;
  
  while (compareTime(currentTime, closeTime) < 0) {
    const endTime = addMinutesToTime(currentTime, duration);
    
    // Don't add timeslot if it extends beyond closing time
    if (compareTime(endTime, closeTime) <= 0) {
      timeslots.push({
        startTime: currentTime,
        endTime,
      });
    }
    
    currentTime = endTime;
  }
  
  return timeslots;
};

// Helper function to add minutes to time (format: "HH:MM")
const addMinutesToTime = (time, minutes) => {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
};

// Helper function to compare times (format: "HH:MM")
const compareTime = (time1, time2) => {
  const [hours1, mins1] = time1.split(':').map(Number);
  const [hours2, mins2] = time2.split(':').map(Number);
  
  if (hours1 !== hours2) {
    return hours1 - hours2;
  }
  
  return mins1 - mins2;
};

// Helper function to normalize timeslot format for comparison
const normalizeTimeslot = (timeslot) => {
  // Remove spaces and ensure consistent format
  return timeslot.replace(/\s+/g, '');
};

// Helper function to check if two timeslots match
const timeslotsMatch = (timeslot1, timeslot2) => {
  return normalizeTimeslot(timeslot1) === normalizeTimeslot(timeslot2);
};

// Helper function to send booking confirmation email
const sendBookingConfirmationEmail = async (booking) => {
  try {
    const setting = await Setting.getSetting();
    
    // Get email template
    const template = setting.emailTemplates.find(t => t.type === 'booking_confirmation');
    
    if (!template) {
      console.error('Booking confirmation email template not found');
      return;
    }
    
    // Format date
    const bookingDate = new Date(booking.date);
    const formattedDate = bookingDate.toLocaleDateString('et-EE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    // Replace placeholders in template
    let emailBody = template.body
      .replace(/{{customerName}}/g, booking.customerName)
      .replace(/{{date}}/g, formattedDate)
      .replace(/{{startTime}}/g, booking.startTime)
      .replace(/{{endTime}}/g, booking.endTime);
    
    // Set up email transporter
    const transporter = createEmailTransporter(setting);
    
    // Send email to customer
    await transporter.sendMail({
      from: `"${setting.businessName}" <${setting.businessEmail}>`,
      to: booking.customerEmail,
      subject: template.subject,
      html: emailBody,
    });
    
    // Send notification to admin
    const adminTemplate = setting.emailTemplates.find(t => t.type === 'admin_notification');
    
    if (adminTemplate && setting.adminNotificationEmails.length > 0) {
      let adminEmailBody = adminTemplate.body
        .replace(/{{customerName}}/g, booking.customerName)
        .replace(/{{date}}/g, formattedDate)
        .replace(/{{startTime}}/g, booking.startTime)
        .replace(/{{endTime}}/g, booking.endTime);
      
      await transporter.sendMail({
        from: `"${setting.businessName}" <${setting.businessEmail}>`,
        to: setting.adminNotificationEmails.join(','),
        subject: adminTemplate.subject,
        html: adminEmailBody,
      });
    }
    
    // Update booking to mark email as sent
    booking.emailSent = true;
    await booking.save();
    
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
  }
};

// Helper function to send booking cancellation email
const sendBookingCancellationEmail = async (booking) => {
  try {
    const setting = await Setting.getSetting();
    
    // Get email template
    const template = setting.emailTemplates.find(t => t.type === 'booking_cancellation');
    
    if (!template) {
      console.error('Booking cancellation email template not found');
      return;
    }
    
    // Format date
    const bookingDate = new Date(booking.date);
    const formattedDate = bookingDate.toLocaleDateString('et-EE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    // Replace placeholders in template
    let emailBody = template.body
      .replace(/{{customerName}}/g, booking.customerName)
      .replace(/{{date}}/g, formattedDate)
      .replace(/{{startTime}}/g, booking.startTime)
      .replace(/{{endTime}}/g, booking.endTime);
    
    // Set up email transporter
    const transporter = createEmailTransporter(setting);
    
    // Send email
    await transporter.sendMail({
      from: `"${setting.businessName}" <${setting.businessEmail}>`,
      to: booking.customerEmail,
      subject: template.subject,
      html: emailBody,
    });
    
  } catch (error) {
    console.error('Error sending booking cancellation email:', error);
  }
};

// Helper function to create email transporter
const createEmailTransporter = (setting) => {
  const { emailSettings } = setting;
  
  if (emailSettings.provider === 'smtp') {
    return nodemailer.createTransport({
      host: emailSettings.host,
      port: emailSettings.port,
      secure: emailSettings.port === 465,
      auth: {
        user: emailSettings.username,
        pass: emailSettings.password,
      },
    });
  } else if (emailSettings.provider === 'sendgrid') {
    return nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: emailSettings.apiKey,
      },
    });
  } else if (emailSettings.provider === 'mailgun') {
    // For Mailgun, you would typically use their SDK instead of nodemailer
    // This is a simplified example
    return nodemailer.createTransport({
      service: 'Mailgun',
      auth: {
        user: 'postmaster@yourdomain.com',
        pass: emailSettings.apiKey,
      },
    });
  }
  
  // Default fallback
  return nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: 'your_mailtrap_user',
      pass: 'your_mailtrap_password',
    },
  });
};

// @desc    Get admin timeslots with custom time range
// @route   GET /api/bookings/admin-timeslots
// @access  Private/Admin
const getAdminTimeslots = asyncHandler(async (req, res) => {
  console.log('Admin timeslots endpoint called');
  console.log('Request query:', req.query);
  const { date, customStartTime, customEndTime } = req.query;
  
  if (!date) {
    res.status(400);
    throw new Error('Date is required');
  }
  
  // Get current date and time
  const currentDate = new Date();
  const requestDateObj = new Date(date);
  
  // Set both dates to midnight to compare just the dates
  const currentDateMidnight = new Date(currentDate);
  currentDateMidnight.setHours(0, 0, 0, 0);
  
  const requestDateMidnight = new Date(requestDateObj);
  requestDateMidnight.setHours(0, 0, 0, 0);
  
  // Get settings
  const setting = await Setting.getSetting();
  const { timeslotDuration } = setting;
  
  // Default start and end times for the entire day
  let startTime = "00:00";
  let endTime = "23:59";
  
  // If custom times are provided, use them instead
  if (customStartTime && /^([01]\d|2[0-3]):([0-5]\d)$/.test(customStartTime)) {
    startTime = customStartTime;
  }
  
  if (customEndTime && /^([01]\d|2[0-3]):([0-5]\d)$/.test(customEndTime)) {
    endTime = customEndTime;
  }
  
  console.log(`Generating admin timeslots from ${startTime} to ${endTime}`);
  
  // Generate all possible timeslots for the day
  const timeslots = generateTimeslots(startTime, endTime, timeslotDuration);
  
  // Get all karts
  const karts = await Kart.find({ isActive: true });
  
  // Get max karts per timeslot from settings
  const maxKartsPerTimeslot = setting.maxKartsPerTimeslot || 9;
  
  console.log('Querying bookings for date:', date);
  
  // Convert the date to a consistent format (YYYY-MM-DD)
  const dateString = date.split('T')[0].split('?')[0]; // Handle both ISO format and query params
  console.log('Normalized date string:', dateString);
  
  // Find bookings for the selected date
  const bookings = await Booking.find({
    date: { $regex: new RegExp(`^${dateString}`) },
    status: { $ne: 'cancelled' },
  }).populate({
    path: 'kartSelections.kart',
    model: 'Kart'
  });
  
  console.log(`Found ${bookings.length} bookings for date ${dateString}`);
  
  // Get current time if the requested date is today
  let currentTime = null;
  if (requestDateMidnight.getTime() === currentDateMidnight.getTime()) {
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    currentTime = `${hours}:${minutes}`;
    console.log('Current time:', currentTime);
  }
  
  // Process each timeslot to check availability
  let availableTimeslots = timeslots.map(timeslot => {
    const { startTime } = timeslot;
    
    // Find bookings that overlap with this timeslot
    const overlappingBookings = bookings.filter(booking => {
      // Format the current timeslot for comparison
      const timeslotStr = `${startTime}-${addMinutesToTime(startTime, timeslotDuration)}`;
      
      // Check if this timeslot is in the booking's selectedTimeslots array
      if (booking.selectedTimeslots && booking.selectedTimeslots.length > 0) {
        const isOverlapping = booking.selectedTimeslots.some(ts => {
          const normalizedBookingTimeslot = normalizeTimeslot(ts);
          const normalizedCurrentTimeslot = normalizeTimeslot(timeslotStr);
          return normalizedBookingTimeslot === normalizedCurrentTimeslot;
        });
        
        return isOverlapping;
      }
      
      // Legacy fallback for bookings without selectedTimeslots
      return booking.startTime === startTime;
    });
    
    // Calculate how many karts are booked for this timeslot
    const kartBookings = {};
    
    overlappingBookings.forEach(booking => {
      if (booking.kartSelections && booking.kartSelections.length > 0) {
        booking.kartSelections.forEach(selection => {
          const kartId = selection.kart._id.toString();
          kartBookings[kartId] = (kartBookings[kartId] || 0) + selection.quantity;
        });
      }
    });
    
    // Calculate kart availability
    const kartAvailability = karts.map(kart => {
      const kartId = kart._id.toString();
      const booked = kartBookings[kartId] || 0;
      const available = Math.max(0, kart.quantity - booked);
      
      return {
        _id: kartId,
        name: kart.name,
        booked,
        available,
        total: kart.quantity
      };
    });
    
    // Calculate total booked and available karts
    const totalBooked = Object.values(kartBookings).reduce((sum, qty) => sum + qty, 0);
    const rawTotalKarts = karts.reduce((sum, kart) => sum + kart.quantity, 0);
    
    // Ensure we don't exceed the max karts per timeslot setting
    const totalKarts = Math.min(rawTotalKarts, maxKartsPerTimeslot);
    
    // Calculate availability based on the max karts setting
    const totalAvailability = Math.max(0, maxKartsPerTimeslot - totalBooked);
    
    return {
      ...timeslot,
      kartAvailability,
      totalBooked,
      totalAvailable: totalAvailability,
      totalKarts
    };
  });
  
  // Filter out past timeslots if the requested date is today
  if (currentTime) {
    availableTimeslots = availableTimeslots.filter(timeslot => {
      return compareTime(timeslot.startTime, currentTime) >= 0;
    });
    console.log(`Filtered out past timeslots for today, ${availableTimeslots.length} timeslots remaining`);
  }
  
  res.json(availableTimeslots);
});

// @desc    Get bookings for a specific timeslot
// @route   GET /api/bookings/timeslot
// @access  Private/Admin
const getTimeslotBookings = asyncHandler(async (req, res) => {
  const { date, startTime, endTime } = req.query;

  if (!date || !startTime || !endTime) {
    res.status(400);
    throw new Error('Date, startTime, and endTime are required');
  }
  
  console.log(`Finding bookings for date: ${date}, time: ${startTime}-${endTime}`);
  
  // First, let's examine available karts in the database to help with debugging
  try {
    const allKarts = await Kart.find({}).select('_id name pricePerSlot');
    console.log('Available karts in database:', allKarts.map(k => ({ id: k._id.toString(), name: k.name })));
  } catch (err) {
    console.log('Error fetching karts:', err.message);
  }

  // Find all bookings for the specified date
  const bookingsForDate = await Booking.find({ 
    date: new Date(date),
    status: { $ne: 'cancelled' } // Exclude cancelled bookings
  });
  
  console.log(`Found ${bookingsForDate.length} bookings for date ${date}`);
  
  // Filter bookings that include the specified timeslot
  const bookingsForTimeslot = [];
  
  for (const booking of bookingsForDate) {
      const bookingData = booking.toObject();
      
      // Check in selectedTimeslots array for the specific timeslot
      // This array stores timeslots for admin bookings
      if (booking.selectedTimeslots && booking.selectedTimeslots.length > 0) {
        for (const timeslot of booking.selectedTimeslots) {
          // Check if any of the selected timeslots match our query
          if (typeof timeslot === 'object' && timeslot.startTime === startTime && timeslot.endTime === endTime) {
            console.log(`Found admin booking match: ${booking._id}`);
            bookingsForTimeslot.push(booking);
            break;
          }
        }
      }
      
      // Check if the booking's main timeslot matches our query
      // This handles regular client bookings
      if (booking.startTime === startTime && booking.endTime === endTime) {
        console.log(`Found client booking match: ${booking._id}`);
        bookingsForTimeslot.push(booking);
      }
      
      // Check in timeslotKartSelections for the specific timeslot
      // This handles bookings that store timeslot information in the map or as an object
      const timeslotKey = `${startTime}-${endTime}`;
      if (booking.timeslotKartSelections) {
        // Handle both Map objects and regular JSON objects
        const hasTimeslot = typeof booking.timeslotKartSelections.get === 'function' 
          ? booking.timeslotKartSelections.get(timeslotKey)
          : booking.timeslotKartSelections[timeslotKey];
          
        if (hasTimeslot) {
          if (!bookingsForTimeslot.some(b => b._id.toString() === booking._id.toString())) {
            console.log(`Found booking match via timeslotKartSelections: ${booking._id}`);
            bookingsForTimeslot.push(booking);
          }
        }
      }
      
      // Add extra debugging
      console.log('Booking timeslots data structure:', JSON.stringify({
        id: booking._id,
        selectedTimeslots: booking.selectedTimeslots || [],
        timeslotKartSelectionsType: booking.timeslotKartSelections ? typeof booking.timeslotKartSelections : 'undefined',
        startTime: booking.startTime,
        endTime: booking.endTime,
        kartSelections: booking.kartSelections || []
      }));
    }
    
  console.log(`Found ${bookingsForTimeslot.length} bookings for timeslot ${startTime}-${endTime}`);
  
  try {
    // For each booking, populate with kart information
    const populatedBookings = await Promise.all(bookingsForTimeslot.map(async (booking) => {
      // Create a new object with all booking fields
      const bookingObj = booking.toObject ? booking.toObject() : {...booking};
      
      // Extract timeslot information for this specific timeslot
      const timeslotKey = `${startTime}-${endTime}`;
      let timeslots = [];
      
      // Check if this booking has the specific timeslot in selectedTimeslots
      if (bookingObj.selectedTimeslots && bookingObj.selectedTimeslots.length > 0) {
        const matchingTimeslots = bookingObj.selectedTimeslots.filter(ts => 
          typeof ts === 'object' && ts.startTime === startTime && ts.endTime === endTime
        );
        
        if (matchingTimeslots.length > 0) {
          timeslots = matchingTimeslots.map(ts => ({
            startTime: ts.startTime,
            endTime: ts.endTime,
            karts: []
          }));
        }
      }
      
      // For backwards compatibility, populate kartSelections
      if (bookingObj.kartSelections && bookingObj.kartSelections.length > 0) {
        const populatedKartSelections = await Promise.all(bookingObj.kartSelections.map(async (kartItem) => {
          let kart;
          if (kartItem.kart) {
            kart = await Kart.findById(kartItem.kart);
          } else if (kartItem.kartId) {
            kart = await Kart.findById(kartItem.kartId);
          }
          
          return {
            ...kartItem,
            name: kart ? kart.name : 'Unknown Kart',
            price: kart ? kart.price : 0
          };
        }));
        
        bookingObj.kartSelections = populatedKartSelections;
      }
      
      // Create a simplified structure for the client
      // Extract timeslot-specific kart information
      let timeslotKarts = [];
      const tsKey = `${startTime}-${endTime}`;
      
      // Handle timeslotKartSelections and timeslotKartQuantities
      console.log('Processing timeslotKartSelections for booking:', bookingObj._id);
      if (bookingObj.timeslotKartSelections) {
        console.log('timeslotKartSelections type:', typeof bookingObj.timeslotKartSelections);
        console.log('timeslotKartSelections keys:', 
          typeof bookingObj.timeslotKartSelections === 'object' ? 
            Object.keys(bookingObj.timeslotKartSelections) : 'not an object');
        
        // Handle as either Map or object
        const kartIds = typeof bookingObj.timeslotKartSelections.get === 'function'
          ? bookingObj.timeslotKartSelections.get(tsKey) 
          : bookingObj.timeslotKartSelections[tsKey];
          
        const quantities = bookingObj.timeslotKartQuantities && 
          (typeof bookingObj.timeslotKartQuantities.get === 'function'
            ? bookingObj.timeslotKartQuantities.get(tsKey)
            : bookingObj.timeslotKartQuantities[tsKey]);
        
        console.log('kartIds:', kartIds);
        console.log('quantities:', quantities);
            
        if (Array.isArray(kartIds) && kartIds.length > 0) {
          // If we have both kartIds and quantities for this timeslot
          timeslotKarts = await Promise.all(kartIds.map(async (kartId) => {
            const kart = await Kart.findById(kartId);
            const quantity = quantities ? quantities[kartId] || 1 : 1;
            
            console.log('Found kart for timeslot:', kart ? kart.name : 'Unknown', 'quantity:', quantity);
            
            return {
              kartId,
              name: kart ? kart.name : 'Unknown Kart',
              quantity: quantity
            };
          }));
        }
      }
      
      // If we don't have timeslotKarts, try to extract from kartSelections
      if (timeslotKarts.length === 0) {
        console.log('Looking for kart information in multiple sources');
        
        // Try kartSelections array (primary source)
        if (bookingObj.kartSelections && bookingObj.kartSelections.length > 0) {
          console.log('Using kartSelections as fallback:', JSON.stringify(bookingObj.kartSelections));
          timeslotKarts = await Promise.all(bookingObj.kartSelections.map(async k => {
            const kartId = k.kartId || (k.kart && (typeof k.kart === 'object' ? k.kart._id : k.kart)) || k._id;
            console.log('Processing kart selection with ID:', kartId);
            
            let kartName = k.name;
            if (!kartName && kartId) {
              // Try to fetch the kart details from the database
              try {
                const kart = await Kart.findById(kartId);
                if (kart) {
                  kartName = kart.name;
                  console.log('Found kart name from database:', kartName);
                }
              } catch (err) {
                console.log('Error fetching kart details:', err.message);
              }
            }
            
            return {
              kartId: kartId,
              name: kartName || 'Unknown Kart',
              quantity: k.quantity || 1
            };
          }));
        }
      }
      
      // Add timeslot information
      let bookingTimeslots = [];
      
      // ALWAYS include the requested timeslot with available kart data
      // This ensures we at least have the timeslot shown in the UI
      bookingTimeslots = [{
        startTime: startTime,
        endTime: endTime,
        karts: []
      }];
      
      // Add direct debug of kartSelections if available
      if (bookingObj.kartSelections && bookingObj.kartSelections.length > 0) {
        console.log('Direct kartSelections available for booking:', bookingObj._id);
        const kartSelectionIds = bookingObj.kartSelections.map(k => {
          const kartId = (k.kart && (typeof k.kart === 'object' ? k.kart._id : k.kart)) || k.kartId;
          return kartId ? kartId.toString() : 'unknown';
        });
        console.log('Direct kart selection IDs:', kartSelectionIds);                 
      }
      
      // Option 1: From selectedTimeslots array
      if (bookingObj.selectedTimeslots && bookingObj.selectedTimeslots.length > 0) {
        const relevantTimeslots = bookingObj.selectedTimeslots.filter(ts => 
          typeof ts === 'object' && ts.startTime === startTime && ts.endTime === endTime
        );
        
        if (relevantTimeslots.length > 0) {
          // Update the default entry with kart data
          bookingTimeslots[0].karts = timeslotKarts.length > 0 ? timeslotKarts : bookingObj.kartSelections || [];
        }
      } 
      // Option 2: From main booking fields
      else if (bookingObj.startTime === startTime && bookingObj.endTime === endTime) {
        // Update the default entry with kart data
        bookingTimeslots[0].karts = timeslotKarts.length > 0 ? timeslotKarts : bookingObj.kartSelections || [];
      }
      // Option 3: If we found timeslot-specific karts but no explicit timeslot match
      else if (timeslotKarts.length > 0) {
        // Update the default entry with kart data
        bookingTimeslots[0].karts = timeslotKarts;
      }
      // Option 4: Fall back to kartSelections if nothing else matches
      else if (bookingObj.kartSelections && bookingObj.kartSelections.length > 0) {
        // Update the default entry with kart data
        bookingTimeslots[0].karts = bookingObj.kartSelections.map(k => ({
          kartId: k.kartId || k.kart || k._id,
          name: k.name || 'Unknown Kart',
          quantity: k.quantity || 1
        }));
      }
      
      console.log(`Returning booking with ${bookingTimeslots.length} timeslots and ${timeslotKarts.length} karts for timeslot`);
      console.log('Final timeslot karts data:', JSON.stringify(bookingTimeslots[0].karts));
      
      // Final sanity check - ensure we have kart data
      // If we still don't have karts, attempt a more direct approach
      if (!bookingTimeslots[0].karts || bookingTimeslots[0].karts.length === 0) {
        console.log('No kart data found for this booking, attempting direct lookup');
        
        // Try to get all karts directly from database
        try {
          const kartsInDb = await Kart.find().limit(5);
          if (kartsInDb && kartsInDb.length > 0) {
            console.log('Found karts in database:', kartsInDb.map(k => k.name));
            // Use the first available kart in the database
            // This is better than showing nothing
            bookingTimeslots[0].karts = [{
              kartId: kartsInDb[0]._id,
              name: kartsInDb[0].name,
              quantity: 1
            }];
          } else {
            // If no karts in database at all, use placeholder
            console.log('No karts found in database, using placeholder');
            bookingTimeslots[0].karts = [{
              kartId: 'placeholder',
              name: 'Kart (details unavailable)',
              quantity: 1
            }];
          }
        } catch (err) {
          console.log('Error fetching karts directly:', err.message);
          // Fallback to placeholder if error
          bookingTimeslots[0].karts = [{
            kartId: 'placeholder',
            name: 'Kart (details unavailable)',
            quantity: 1
          }];
        }
      }
      
      return {
        _id: bookingObj._id,
        customerName: bookingObj.customerName,
        customerEmail: bookingObj.customerEmail,
        customerPhone: bookingObj.customerPhone,
        date: bookingObj.date,
        notes: bookingObj.notes,
        createdAt: bookingObj.createdAt,
        status: bookingObj.status,
        totalPrice: bookingObj.totalPrice || 0,
        // Include whether this is an admin booking for UI differentiation if needed
        isAdminBooking: bookingObj.customerName === 'Admin Booking' || bookingObj.customerEmail === 'admin@bookid.ee',
        // Add the timeslots that match the requested timeslot
        timeslots: bookingTimeslots
      };
    }));
    
    res.json(populatedBookings);
  } catch (error) {
    console.error('Error in getTimeslotBookings:', error);
    res.status(500);
    throw new Error('Server error when retrieving timeslot bookings');
  }
});

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getAvailableTimeslots,
  getAdminTimeslots,
  getTimeslotBookings,
};
