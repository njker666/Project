/**
 * Urban Drive - WebSocket Server
 * Handles real-time multiplayer communication
 */

const WebSocket = require('ws');
const config = require('../../shared/config');

/**
 * WebSocketServer class provides real-time communication for the game
 * @class WebSocketServer
 */
class WebSocketServer {
  /**
   * Create a new WebSocketServer
   * @param {object} server - HTTP server instance to attach to
   */
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    
    // Track connected clients with their data
    this.clients = new Map();
    this.nextClientId = 1;
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      disconnections: 0,
      messagesReceived: 0,
      messagesSent: 0,
      avgLatency: 0,
      totalLatency: 0,
      maxLatency: 0,
      pingsMeasured: 0
    };
    
    this.setupEventHandlers();
    this.startPeriodicTasks();
    
    console.log(`[WEBSOCKET] WebSocket server initialized, max players: ${config.MAX_PLAYERS}`);
  }
  
  /**
   * Set up WebSocket event handlers
   */
  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      // Reject connection if max players reached
      if (this.connectionStats.activeConnections >= config.MAX_PLAYERS) {
        ws.close(1000, 'Server full');
        console.log(`[WEBSOCKET] Connection rejected - server full`);
        return;
      }
      
      // Generate unique ID for this client
      const clientId = this.nextClientId++;
      const clientIp = req.socket.remoteAddress;
      
      // Store client information
      this.clients.set(ws, {
        id: clientId,
        ip: clientIp,
        lastPing: Date.now(),
        latency: 0,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        speed: 0,
        connected: true,
        connectTime: Date.now()
      });
      
      // Update stats
      this.connectionStats.totalConnections++;
      this.connectionStats.activeConnections++;
      
      // Log connection
      console.log(`[WEBSOCKET] Client #${clientId} connected from ${clientIp}`);
      
      // Send welcome message with client ID
      this.sendToClient(ws, {
        type: 'welcome',
        id: clientId,
        maxPlayers: config.MAX_PLAYERS,
        currentPlayers: this.connectionStats.activeConnections,
        tickRate: config.TICK_RATE,
        updateRate: config.UPDATE_RATE,
        timeoutDuration: config.TIMEOUT_DURATION
      });
      
      // Send current players information
      this.broadcastPlayerList();
      
      // Handle incoming messages
      ws.on('message', (message) => {
        this.handleMessage(ws, message);
      });
      
      // Handle disconnection
      ws.on('close', () => {
        const client = this.clients.get(ws);
        if (client) {
          console.log(`[WEBSOCKET] Client #${client.id} disconnected`);
          this.clients.delete(ws);
          this.connectionStats.activeConnections--;
          this.connectionStats.disconnections++;
          
          // Notify other clients about disconnection
          this.broadcastToAll({
            type: 'playerDisconnected',
            id: client.id
          });
        }
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WEBSOCKET] Error with client #${this.clients.get(ws)?.id || 'unknown'}:`, error.message);
      });
      
      // Send initial ping to measure latency
      this.sendPing(ws);
    });
  }
  
  /**
   * Handle incoming WebSocket messages
   * @param {WebSocket} ws - WebSocket client
   * @param {string|Buffer} message - Raw message data
   */
  handleMessage(ws, message) {
    this.connectionStats.messagesReceived++;
    
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(ws);
      
      if (!client) {
        console.warn('[WEBSOCKET] Received message from unknown client');
        return;
      }
      
      // Update client's last activity timestamp
      client.lastPing = Date.now();
      
      // Handle different message types
      switch (data.type) {
        case 'pong':
          // Measure latency
          const latency = Date.now() - data.timestamp;
          client.latency = latency;
          
          // Update latency statistics
          this.connectionStats.totalLatency += latency;
          this.connectionStats.pingsMeasured++;
          this.connectionStats.avgLatency = 
            this.connectionStats.totalLatency / this.connectionStats.pingsMeasured;
          
          if (latency > this.connectionStats.maxLatency) {
            this.connectionStats.maxLatency = latency;
          }
          
          // Log high latency
          if (latency > config.MAX_LATENCY_MS && config.LOG_PERFORMANCE) {
            console.warn(`[WEBSOCKET] High latency: ${latency}ms for client #${client.id}`);
          }
          break;
          
        case 'position':
          // Update client position data
          client.position = data.position;
          client.rotation = data.rotation;
          client.speed = data.speed;
          
          // Broadcast updated position to other clients
          this.broadcastToOthers(ws, {
            type: 'playerPosition',
            id: client.id,
            position: client.position,
            rotation: client.rotation,
            speed: client.speed
          });
          break;
          
        case 'chat':
          // Handle chat messages (for future implementation)
          this.broadcastToAll({
            type: 'chatMessage',
            id: client.id,
            message: data.message
          });
          break;
          
        default:
          console.warn(`[WEBSOCKET] Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('[WEBSOCKET] Error parsing message:', error.message);
    }
  }
  
  /**
   * Send a ping message to measure latency
   * @param {WebSocket} ws - WebSocket client
   */
  sendPing(ws) {
    this.sendToClient(ws, {
      type: 'ping',
      timestamp: Date.now()
    });
  }
  
  /**
   * Send a message to a specific client
   * @param {WebSocket} ws - WebSocket client
   * @param {object} data - Message data to send
   */
  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      this.connectionStats.messagesSent++;
    }
  }
  
  /**
   * Broadcast a message to all connected clients
   * @param {object} data - Message data to broadcast
   */
  broadcastToAll(data) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
        this.connectionStats.messagesSent++;
      }
    });
  }
  
  /**
   * Broadcast a message to all clients except the sender
   * @param {WebSocket} sender - Sender to exclude
   * @param {object} data - Message data to broadcast
   */
  broadcastToOthers(sender, data) {
    this.wss.clients.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
        this.connectionStats.messagesSent++;
      }
    });
  }
  
  /**
   * Broadcast the current player list to all clients
   */
  broadcastPlayerList() {
    const players = [];
    
    // Create array of player data
    this.clients.forEach((client) => {
      players.push({
        id: client.id,
        position: client.position,
        rotation: client.rotation,
        speed: client.speed
      });
    });
    
    // Send player list to all clients
    this.broadcastToAll({
      type: 'playerList',
      players: players
    });
  }
  
  /**
   * Start periodic tasks like pings and cleanup
   */
  startPeriodicTasks() {
    // Send pings to measure latency
    setInterval(() => {
      this.clients.forEach((client, ws) => {
        this.sendPing(ws);
      });
    }, 5000); // Every 5 seconds
    
    // Check for inactive clients
    setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, ws) => {
        // Check if client timed out
        if (now - client.lastPing > config.TIMEOUT_DURATION) {
          console.log(`[WEBSOCKET] Client #${client.id} timed out`);
          ws.close(1000, 'Timeout');
        }
      });
    }, 10000); // Every 10 seconds
    
    // Broadcast player list periodically
    setInterval(() => {
      this.broadcastPlayerList();
    }, 30000); // Every 30 seconds
    
    // Log WebSocket stats if performance logging is enabled
    if (config.LOG_PERFORMANCE) {
      setInterval(() => {
        console.log('[WEBSOCKET STATS]', {
          activeConnections: this.connectionStats.activeConnections,
          totalConnections: this.connectionStats.totalConnections,
          disconnections: this.connectionStats.disconnections,
          messagesReceived: this.connectionStats.messagesReceived,
          messagesSent: this.connectionStats.messagesSent,
          avgLatency: Math.round(this.connectionStats.avgLatency * 100) / 100,
          maxLatency: this.connectionStats.maxLatency
        });
      }, 60000); // Every minute
    }
  }
  
  /**
   * Get WebSocket connection statistics
   * @returns {object} Connection statistics
   */
  getStats() {
    return {
      ...this.connectionStats,
      currentPlayers: this.connectionStats.activeConnections
    };
  }
}

module.exports = WebSocketServer; 