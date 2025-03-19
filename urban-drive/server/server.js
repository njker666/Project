/**
 * Urban Drive - Server
 * Express server with performance monitoring
 */

const express = require('express');
const path = require('path');
const config = require('../shared/config');
const os = require('os');
const http = require('http');
const WebSocketServer = require('./network/websocket');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Performance monitoring setup
const performanceMetrics = {
  startTime: Date.now(),
  requests: 0,
  errors: 0,
  totalResponseTime: 0,
  averageResponseTime: 0,
  maxResponseTime: 0,
  lastUpdated: new Date().toISOString(),
  cpuUsage: 0,
  memoryUsage: 0,
  activeConnections: 0
};

// Middleware to track request/response times and log high latency
app.use((req, res, next) => {
  // Skip monitoring for static asset requests to avoid performance impact
  if (req.url.includes('.') && !req.url.endsWith('.html')) {
    return next();
  }
  
  performanceMetrics.activeConnections++;
  const startTime = process.hrtime();
  
  res.on('finish', () => {
    performanceMetrics.activeConnections--;
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTimeMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);
    
    performanceMetrics.requests++;
    performanceMetrics.totalResponseTime += parseFloat(responseTimeMs);
    performanceMetrics.averageResponseTime = (performanceMetrics.totalResponseTime / performanceMetrics.requests).toFixed(2);
    
    if (parseFloat(responseTimeMs) > performanceMetrics.maxResponseTime) {
      performanceMetrics.maxResponseTime = parseFloat(responseTimeMs);
    }
    
    performanceMetrics.lastUpdated = new Date().toISOString();
    
    // Log high latency requests (> 100ms)
    if (responseTimeMs > 100 && config.LOG_PERFORMANCE) {
      console.log(`[PERFORMANCE] High latency: ${responseTimeMs}ms for ${req.method} ${req.url}`);
    }
  });
  
  res.on('error', () => {
    performanceMetrics.errors++;
    performanceMetrics.activeConnections--;
  });
  
  next();
});

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

// Health endpoint
app.get('/api/health', (req, res) => {
  const uptime = Math.floor((Date.now() - performanceMetrics.startTime) / 1000);
  performanceMetrics.cpuUsage = process.cpuUsage().user / 1000000;
  performanceMetrics.memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
  
  // Include WebSocket stats if available
  const wsStats = wss ? wss.getStats() : null;
  
  res.json({
    status: 'ok',
    uptime,
    requests: performanceMetrics.requests,
    errors: performanceMetrics.errors,
    averageResponseTime: performanceMetrics.averageResponseTime,
    maxResponseTime: performanceMetrics.maxResponseTime,
    activeConnections: performanceMetrics.activeConnections,
    cpuUsage: performanceMetrics.cpuUsage,
    memoryUsage: performanceMetrics.memoryUsage,
    lastUpdated: performanceMetrics.lastUpdated,
    websocket: wsStats
  });
});

// Serve metrics dashboard
app.get('/metrics', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/server-metrics.html'));
});

// Serve network health dashboard
app.get('/network', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/network-health.html'));
});

// Handle SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Periodic performance logging
if (config.LOG_PERFORMANCE) {
  setInterval(() => {
    console.log('[SERVER METRICS]', {
      uptime: Math.floor((Date.now() - performanceMetrics.startTime) / 1000),
      requests: performanceMetrics.requests,
      averageResponseTime: performanceMetrics.averageResponseTime,
      activeConnections: performanceMetrics.activeConnections,
      cpuUsage: performanceMetrics.cpuUsage,
      memoryUsage: performanceMetrics.memoryUsage
    });
  }, 60000); // Log every minute
}

// Initialize WebSocket server
let wss;

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Max players: ${config.MAX_PLAYERS}`);
  console.log(`Tick rate: ${config.TICK_RATE}ms`);
  console.log(`Health metrics available at: http://localhost:${PORT}/api/health`);
  console.log(`Metrics dashboard available at: http://localhost:${PORT}/metrics`);
  console.log(`Network Health dashboard available at: http://localhost:${PORT}/network`);
  
  // Initialize WebSocket server after HTTP server is listening
  wss = new WebSocketServer(server);
  console.log(`WebSocket server initialized for multiplayer`);
}); 