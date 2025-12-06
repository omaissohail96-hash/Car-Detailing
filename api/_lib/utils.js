// Shared utilities for API functions

function getServiceDuration(service) {
  const durations = {
    'Basic Wash': 60,      // minutes
    'Interior Clean': 90,
    'Full Detail': 180
  };
  return durations[service] || 60;
}

function doTimeSlotsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function hasBookingConflict(bookings, newBooking) {
  const newStart = new Date(newBooking.datetime);
  const newEnd = new Date(newStart.getTime() + getServiceDuration(newBooking.service) * 60 * 1000);

  return bookings.some((existing) => {
    const exStart = new Date(existing.datetime);
    const exEnd = new Date(exStart.getTime() + getServiceDuration(existing.service) * 60 * 1000);
    return doTimeSlotsOverlap(newStart, newEnd, exStart, exEnd);
  });
}

function suggestAlternativeSlots(bookings, requestedDatetime, service) {
  const requestedDate = new Date(requestedDatetime);
  const suggestions = [];
  const duration = getServiceDuration(service) * 60 * 1000;

  for (let hourOffset = 1; hourOffset <= 3; hourOffset++) {
    const alt1 = new Date(requestedDate.getTime() + hourOffset * 60 * 60 * 1000);
    const alt2 = new Date(requestedDate.getTime() - hourOffset * 60 * 60 * 1000);

    if (!hasBookingConflict(bookings, { datetime: alt1.toISOString(), service })) {
      suggestions.push(alt1.toISOString());
    }
    if (
      alt2 > new Date() &&
      !hasBookingConflict(bookings, { datetime: alt2.toISOString(), service })
    ) {
      suggestions.push(alt2.toISOString());
    }

    if (suggestions.length >= 3) break;
  }

  return suggestions.slice(0, 3);
}

module.exports = {
  getServiceDuration,
  hasBookingConflict,
  suggestAlternativeSlots,
};
