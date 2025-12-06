const express = require('express');
const app = express();
const PORT = 3001;

// Middleware for parsing JSON
app.use(express.json());

// CORS for testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// In-memory booking storage
let bookings = [];

// Helper functions
function doTimeSlotsOverlap(slot1Start, slot1End, slot2Start, slot2End) {
  return slot1Start < slot2End && slot2Start < slot1End;
}

function hasBookingConflict(newBooking) {
  const newStart = new Date(newBooking.datetime);
  const newEnd = new Date(newStart.getTime() + getServiceDuration(newBooking.service) * 60 * 1000);
  
  return bookings.some(existingBooking => {
    const existingStart = new Date(existingBooking.datetime);
    const existingEnd = new Date(existingStart.getTime() + getServiceDuration(existingBooking.service) * 60 * 1000);
    
    return doTimeSlotsOverlap(newStart, newEnd, existingStart, existingEnd);
  });
}

function getServiceDuration(service) {
  const durations = {
    'Basic Wash': 60,
    'Interior Clean': 90,
    'Full Detail': 180
  };
  return durations[service] || 60;
}

function suggestAlternativeSlots(requestedDatetime, service) {
  const requestedDate = new Date(requestedDatetime);
  const suggestions = [];
  
  for (let hourOffset = 1; hourOffset <= 3; hourOffset++) {
    const altTime1 = new Date(requestedDate.getTime() + hourOffset * 60 * 60 * 1000);
    const altTime2 = new Date(requestedDate.getTime() - hourOffset * 60 * 60 * 1000);
    
    if (!hasBookingConflict({datetime: altTime1.toISOString(), service: service})) {
      suggestions.push(altTime1.toISOString());
    }
    if (altTime2 > new Date() && !hasBookingConflict({datetime: altTime2.toISOString(), service: service})) {
      suggestions.push(altTime2.toISOString());
    }
    
    if (suggestions.length >= 3) break;
  }
  
  return suggestions.slice(0, 3);
}

// API Routes
app.get('/api/check-availability', (req, res) => {
  console.log('API called:', req.query);
  const { datetime, service } = req.query;
  
  if (!datetime || !service) {
    return res.status(400).json({
      error: 'Missing required parameters: datetime and service'
    });
  }
  
  const requestedDate = new Date(datetime);
  
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

app.post('/api/bookings', (req, res) => {
  console.log('Booking submitted:', req.body);
  const { name, phone, email, address, service, datetime, notes } = req.body;
  
  if (!name || !phone || !address || !service || !datetime) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['name', 'phone', 'address', 'service', 'datetime']
    });
  }
  
  const requestedDate = new Date(datetime);
  
  if (requestedDate <= new Date()) {
    return res.status(400).json({
      error: 'Cannot book appointments in the past'
    });
  }
  
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
  
  const booking = {
    id: Date.now(),
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

app.listen(PORT, () => {
  console.log(`✅ API Server running: http://localhost:${PORT}`);
  console.log(`📡 API: GET http://localhost:${PORT}/api/check-availability`);
  console.log(`📡 API: POST http://localhost:${PORT}/api/bookings`);
});