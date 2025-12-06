// Vercel Serverless Function for checking availability
let bookings = [];

function timeSlotsOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

function getServiceDuration(service) {
  const durations = {
    'Basic Wash': 1,
    'Interior Clean': 1.5,
    'Full Detail': 3
  };
  return durations[service] || 2;
}

module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    // Suggest alternative times (2 hours before and after)
    const suggestedTimes = [];
    const suggestedBefore = new Date(requestedStart.getTime() - 2 * 60 * 60 * 1000);
    const suggestedAfter = new Date(requestedStart.getTime() + 2 * 60 * 60 * 1000);
    
    suggestedTimes.push(suggestedBefore.toISOString(), suggestedAfter.toISOString());
    
    return res.status(200).json({
      available: false,
      message: 'This time slot is already booked',
      suggestedTimes
    });
  }

  return res.status(200).json({
    available: true,
    message: 'This time slot is available!'
  });
};
