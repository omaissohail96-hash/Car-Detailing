const express = require('express');
const app = express();
const PORT = 3000;

// Middleware for parsing JSON
app.use(express.json());

// In-memory booking storage (in production, use a proper database)
let bookings = [];

// Helper function to check if two time slots overlap
function doTimeSlotsOverlap(slot1Start, slot1End, slot2Start, slot2End) {
  return slot1Start < slot2End && slot2Start < slot1End;
}

// Helper function to check if a booking conflicts with existing ones
function hasBookingConflict(newBooking) {
  const newStart = new Date(newBooking.datetime);
  const newEnd = new Date(newStart.getTime() + getServiceDuration(newBooking.service) * 60 * 1000);
  
  return bookings.some(existingBooking => {
    const existingStart = new Date(existingBooking.datetime);
    const existingEnd = new Date(existingStart.getTime() + getServiceDuration(existingBooking.service) * 60 * 1000);
    
    return doTimeSlotsOverlap(newStart, newEnd, existingStart, existingEnd);
  });
}

// Helper function to get service duration in minutes
function getServiceDuration(service) {
  const durations = {
    'Basic Wash': 60,      // 1 hour
    'Interior Clean': 90,  // 1.5 hours
    'Full Detail': 180     // 3 hours
  };
  return durations[service] || 60; // Default to 1 hour
}

// Helper function to suggest alternative time slots
function suggestAlternativeSlots(requestedDatetime, service) {
  const requestedDate = new Date(requestedDatetime);
  const suggestions = [];
  const duration = getServiceDuration(service);
  
  // Try to suggest times within the same day first
  for (let hourOffset = 1; hourOffset <= 3; hourOffset++) {
    const altTime1 = new Date(requestedDate.getTime() + hourOffset * 60 * 60 * 1000);
    const altTime2 = new Date(requestedDate.getTime() - hourOffset * 60 * 60 * 1000);
    
    // Check if alternative times don't conflict
    if (!hasBookingConflict({datetime: altTime1.toISOString(), service: service})) {
      suggestions.push(altTime1.toISOString());
    }
    if (altTime2 > new Date() && !hasBookingConflict({datetime: altTime2.toISOString(), service: service})) {
      suggestions.push(altTime2.toISOString());
    }
    
    if (suggestions.length >= 3) break; // Limit to 3 suggestions
  }
  
  return suggestions.slice(0, 3); // Return up to 3 suggestions
}

// API Routes

// GET /api/check-availability - Check if a time slot is available
app.get('/api/check-availability', (req, res) => {
  const { datetime, service } = req.query;
  
  if (!datetime || !service) {
    return res.status(400).json({
      error: 'Missing required parameters: datetime and service'
    });
  }
  
  const requestedDate = new Date(datetime);
  
  // Check if the date is in the past
  if (requestedDate <= new Date()) {
    return res.json({
      available: false,
      message: 'Selected time is in the past',
      suggestedTimes: []
    });
  }
  
  const newBooking = { datetime, service };
  const hasConflict = hasBookingConflict(newBooking);
  
  if (hasConflict) {
    const suggestions = suggestAlternativeSlots(datetime, service);
    return res.json({
      available: false,
      message: 'Time slot not available',
      conflictReason: 'Another booking exists during this time',
      suggestedTimes: suggestions
    });
  }
  
  res.json({
    available: true,
    message: 'Time slot is available',
    suggestedTimes: []
  });
});

// POST /api/bookings - Create a new booking
app.post('/api/bookings', (req, res) => {
  const { name, phone, email, address, service, datetime, notes } = req.body;
  
  // Validate required fields
  if (!name || !phone || !address || !service || !datetime) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['name', 'phone', 'address', 'service', 'datetime']
    });
  }
  
  const requestedDate = new Date(datetime);
  
  // Check if the date is in the past
  if (requestedDate <= new Date()) {
    return res.status(400).json({
      error: 'Cannot book appointments in the past'
    });
  }
  
  // Check for conflicts with existing bookings
  const newBooking = { datetime, service };
  const hasConflict = hasBookingConflict(newBooking);
  
  if (hasConflict) {
    const suggestions = suggestAlternativeSlots(datetime, service);
    return res.status(409).json({
      error: 'Time slot conflict',
      message: 'This time slot is already booked',
      suggestedTimes: suggestions
    });
  }
  
  // Create the booking
  const booking = {
    id: Date.now(), // Simple ID generation
    name,
    phone,
    email: email || '',
    address,
    service,
    datetime,
    notes: notes || '',
    createdAt: new Date().toISOString(),
    status: 'confirmed'
  };
  
  bookings.push(booking);
  
  res.status(201).json({
    success: true,
    message: 'Booking confirmed successfully',
    booking: {
      id: booking.id,
      service: booking.service,
      datetime: booking.datetime,
      status: booking.status
    }
  });
});

// GET /api/bookings - Get all bookings (for admin purposes)
app.get('/api/bookings', (req, res) => {
  res.json({
    bookings: bookings.map(booking => ({
      id: booking.id,
      name: booking.name,
      service: booking.service,
      datetime: booking.datetime,
      status: booking.status,
      createdAt: booking.createdAt
    }))
  });
});

// Serve the website - but not for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next(); // Let API routes handle themselves
  } else {
    express.static(__dirname)(req, res, next);
  }
});

// Catch-all for SPA - only for non-API routes that didn't match static files
app.use((req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(__dirname + '/index.html');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
  console.log(`📄 Site: http://localhost:${PORT}`);
  console.log(`📡 API: GET http://localhost:${PORT}/api/check-availability`);
  console.log(`📡 API: POST http://localhost:${PORT}/api/bookings`);
});