const asyncHandler = require('express-async-handler');
const nodemailer = require('nodemailer');
const Booking = require('../models/bookingModel');
const Kart = require('../models/kartModel');
const Setting = require('../models/settingModel');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Public
const createBooking = asyncHandler(async (req, res) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    date,
    startTime,
    endTime,
    duration,
    selectedTimeslots,
    kartSelections,
    timeslotKartSelections,
    timeslotKartQuantities,
    notes,
  } = req.body;

  console.log('Creating booking with the following data:');
  console.log('Selected timeslots:', selectedTimeslots);
  console.log('Kart selections:', kartSelections);
  console.log('Timeslot kart selections:', timeslotKartSelections);
  console.log('Timeslot kart quantities:', timeslotKartQuantities);

  // Get settings for timeslot duration
  const setting = await Setting.getSetting();
  const { timeslotDuration } = setting;
  
  // Calculate total price based on actual timeslot duration
  let totalPrice = 0;
  for (const selection of kartSelections) {
    totalPrice += selection.quantity * selection.pricePerSlot;
  }
  
  // Store the selected timeslots if provided
  const bookingTimeslots = selectedTimeslots || [];

  // Ensure date is properly converted to a Date object
  const bookingDate = new Date(date);
  // Reset the time to midnight to ensure consistent date handling
  bookingDate.setUTCHours(0, 0, 0, 0);

  const booking = await Booking.create({
    customerName,
    customerEmail,
    customerPhone,
    date: bookingDate,
    startTime,
    endTime,
    duration,
    selectedTimeslots: bookingTimeslots, // Store the selected timeslots
    kartSelections,
    timeslotKartSelections, // Store the timeslot-specific kart selections
    timeslotKartQuantities, // Store the timeslot-specific kart quantities
    totalPrice,
    status: 'confirmed',
    notes,
  });

  if (booking) {
    // Send confirmation email
    await sendBookingConfirmationEmail(booking);
    
    res.status(201).json(booking);
  } else {
    res.status(400);
    throw new Error('Invalid booking data');
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

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getAvailableTimeslots,
};
