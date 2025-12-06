const express = require('express');
const path = require('path');
const bookingsRouter = require('./api/bookings');
const app = express();
const PORT = 3000;

// Middleware for parsing JSON
app.use(express.json());

// API routes FIRST (before static files)
app.use('/api', bookingsRouter);

// Static file middleware
app.use(express.static(path.join(__dirname)));

// SPA fallback: serve index.html for all remaining routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
  console.log(`📄 Site: http://localhost:${PORT}`);
  console.log(`📡 API: GET http://localhost:${PORT}/api/check-availability`);
  console.log(`📡 API: POST http://localhost:${PORT}/api/bookings`);
});
