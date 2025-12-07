// Export an Express router for bookings so it can be mounted under /api
const express = require('express');

const router = express.Router();
router.use(express.json());

// In-memory booking storage (in production, use a proper database)
let bookings = [];

// Helper function to check if two time slots overlap
function timeSlotsOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

// Helper function to get service duration in hours
function getServiceDuration(service) {
  const durations = {
    'Basic Wash': 1,
    'Interior Clean': 1.5,
    'Full Detail': 3
  };
  return durations[service] || 2;
}

// Check availability endpoint
router.get('/check-availability', (req, res) => {
  const { datetime, service } = req.query;
  
  if (!datetime || !service) {
    return res.status(400).json({ 
      available: false, 
      message: 'Date/time and service are required' 
    });
  }

  const requestedStart = new Date(datetime);
  const duration = getServiceDuration(service);
  const requestedEnd = new Date(requestedStart.getTime() + duration * 60 * 60 * 1000);
  
  // Check for conflicts with existing bookings
  const conflicts = bookings.filter(booking => {
    const bookingStart = new Date(booking.datetime);
    const bookingDuration = getServiceDuration(booking.service);
    const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60 * 60 * 1000);
    
    return timeSlotsOverlap(requestedStart, requestedEnd, bookingStart, bookingEnd);
  });

  if (conflicts.length > 0) {
    const conflictTime = conflicts[0].datetime;
    const conflictDate = new Date(conflictTime);
    return res.json({
      available: false,
      message: `Time slot not available. There's already a booking at ${conflictDate.toLocaleString()}`,
      suggestedTimes: getSuggestedTimes(requestedStart, duration)
    });
  }

  res.json({
    available: true,
    message: 'Time slot is available!'
  });
});

// Helper function to suggest alternative times
function getSuggestedTimes(requestedDate, duration) {
  const suggestions = [];
  const baseDate = new Date(requestedDate);
  baseDate.setMinutes(0, 0, 0); // Round to hour
  
  // Suggest 3 alternative times: 2 hours before, 4 hours after, next day same time
  const times = [
    new Date(baseDate.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
    new Date(baseDate.getTime() + 4 * 60 * 60 * 1000), // 4 hours after
    new Date(baseDate.getTime() + 24 * 60 * 60 * 1000)  // next day
  ];
  
  times.forEach(time => {
    const endTime = new Date(time.getTime() + duration * 60 * 60 * 1000);
    const hasConflict = bookings.some(booking => {
      const bookingStart = new Date(booking.datetime);
      const bookingDuration = getServiceDuration(booking.service);
      const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60 * 60 * 1000);
      return timeSlotsOverlap(time, endTime, bookingStart, bookingEnd);
    });
    
    if (!hasConflict && time > new Date()) {
      suggestions.push(time.toISOString().slice(0, 16));
    }
  });
  
  return suggestions.slice(0, 3);
}

// POST /bookings
router.post('/bookings', (req, res) => {
  const booking = req.body || {};
  
  if (!booking.datetime || !booking.service) {
    return res.status(400).json({ 
      success: false, 
      message: 'Date/time and service are required' 
    });
  }

  const requestedStart = new Date(booking.datetime);
  const duration = getServiceDuration(booking.service);
  const requestedEnd = new Date(requestedStart.getTime() + duration * 60 * 60 * 1000);
  
  // Check for conflicts again before booking
  const conflicts = bookings.filter(existingBooking => {
    const bookingStart = new Date(existingBooking.datetime);
    const bookingDuration = getServiceDuration(existingBooking.service);
    const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60 * 60 * 1000);
    
    return timeSlotsOverlap(requestedStart, requestedEnd, bookingStart, bookingEnd);
  });

  if (conflicts.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'Time slot is no longer available. Please choose a different time.',
      suggestedTimes: getSuggestedTimes(requestedStart, duration)
    });
  }

  // Create booking
  const id = 'BK-' + Date.now().toString(36).toUpperCase();
  const newBooking = {
    ...booking,
    id,
    createdAt: new Date().toISOString()
  };
  
  bookings.push(newBooking);
  console.log('New booking:', newBooking);
  
  res.json({ 
    success: true, 
    id,
    message: 'Booking confirmed!',
    estimatedDuration: duration + ' hours'
  });
});

// Get all bookings (for testing/admin)
router.get('/bookings', (req, res) => {
  res.json({ bookings: bookings.length, data: bookings });
});

// When run directly, start a standalone server for testing
if (require.main === module) {
  const app = express();
  app.use('/api', router);
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Bookings API running on http://localhost:${port}`));
}


module.exports = router;
