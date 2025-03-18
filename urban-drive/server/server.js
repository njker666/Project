/**
 * Urban Drive - Server
 * Simple Express server to serve static files
 */

const express = require('express');
const path = require('path');
const config = require('../shared/config');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve node_modules for client-side libraries
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

// Middleware to set proper MIME types for JavaScript modules
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.type('application/javascript');
  }
  next();
});

// Handle all routes by serving the index.html (for SPA functionality)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`[SERVER] Server running on port ${PORT}`);
  console.log(`[SERVER] Access the game at http://localhost:${PORT}`);
  console.log(`[SERVER] Max players: ${config.MAX_PLAYERS}`);
  console.log(`[SERVER] Tick rate: ${config.TICK_RATE} Hz`);
}); 