// Naive in-memory store. In Vercel serverless this persists per warm instance.
const store = {
  bookings: [],
};

function listBookings() {
  return store.bookings;
}

function addBooking(booking) {
  store.bookings.push(booking);
  return booking;
}

module.exports = {
  listBookings,
  addBooking,
};
