// Vercel Serverless Function for bookings
// In-memory booking storage (persists across invocations in same instance)
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

// Generate suggested alternative times if a slot is unavailable
function getSuggestedTimes(baseDate, duration) {
  const suggestions = [];
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

// Main handler function for Vercel
module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/bookings - Get all bookings
  if (req.method === 'GET') {
    return res.status(200).json({ 
      bookings: bookings.length, 
      data: bookings 
    });
  }

  // POST /api/bookings - Create new booking
  if (req.method === 'POST') {
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
    console.log('New booking created:', newBooking);
    
    return res.status(200).json({ 
      success: true, 
      id,
      message: 'Booking confirmed!',
      estimatedDuration: duration + ' hours'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
