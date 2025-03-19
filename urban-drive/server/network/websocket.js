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
    
    // Server-side physics simulation properties
    this.physicsWorld = this.initializePhysicsWorld();
    this.lastPhysicsUpdate = Date.now();
    
    this.setupEventHandlers();
    this.startPeriodicTasks();
    
    console.log(`[WEBSOCKET] WebSocket server initialized, max players: ${config.MAX_PLAYERS}`);
  }
  
  /**
   * Initialize a simplified physics world for server-side verification
   */
  initializePhysicsWorld() {
    console.log('[PHYSICS] Initializing server-side physics world');
    
    // Simplified physics model for server-side validation
    const physicsParams = {
      maxSpeed: 30, // Maximum speed in m/s
      acceleration: 5, // Acceleration in m/s²
      braking: 8, // Braking in m/s²
      turnSpeed: 2, // Turn speed in radians/s
      friction: 0.98 // Ground friction coefficient
    };
    
    return {
      ...physicsParams,
      updateVehicle: (vehicle, input, deltaTime) => {
        if (!vehicle || !input) {
          console.warn('[PHYSICS] Invalid vehicle or input data');
          return vehicle;
        }

        // Ensure controls exist with default values if undefined
        const controls = input.controls || {
          accelerate: false,
          brake: false,
          turnLeft: false,
          turnRight: false,
          handbrake: false
        };
        
        // Create a copy of the vehicle object to avoid modification issues
        const updatedVehicle = { ...vehicle };
        
        // Update speed based on input
        if (controls.accelerate || controls.up) {
          updatedVehicle.speed = Math.min(updatedVehicle.speed + physicsParams.acceleration * deltaTime, physicsParams.maxSpeed);
        } else if (controls.brake || controls.down) {
          updatedVehicle.speed = Math.max(updatedVehicle.speed - physicsParams.braking * deltaTime, 0);
        } else {
          // Apply friction when no input
          updatedVehicle.speed *= physicsParams.friction;
        }

        // Update rotation based on input
        if (controls.turnLeft || controls.left) {
          updatedVehicle.rotation -= physicsParams.turnSpeed * deltaTime;
        }
        if (controls.turnRight || controls.right) {
          updatedVehicle.rotation += physicsParams.turnSpeed * deltaTime;
        }

        // Update position based on speed and rotation
        updatedVehicle.x += Math.cos(updatedVehicle.rotation) * updatedVehicle.speed * deltaTime;
        updatedVehicle.y += Math.sin(updatedVehicle.rotation) * updatedVehicle.speed * deltaTime;
        updatedVehicle.z = updatedVehicle.z || 0; // Ensure z is defined

        return updatedVehicle;
      }
    };
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
      
      // Initialize client state with default values
      const clientState = {
        x: 0,
        y: 0,
        z: 0,
        rotation: 0,
        speed: 0,
        sequence: 0,
        timestamp: Date.now()
      };
      
      // Store client information
      this.clients.set(ws, {
        id: clientId,
        ip: clientIp,
        ws: ws, // Explicitly store reference to the WebSocket
        lastPing: Date.now(),
        latency: 0,
        state: clientState,
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
          try {
            // Validate position data with more lenient checks and default values
            if (!data.position) {
              data.position = { x: 0, y: 0.5, z: 0 };
            } else {
              // Ensure the position has numeric values
              data.position.x = typeof data.position.x === 'number' ? data.position.x : 0;
              data.position.y = typeof data.position.y === 'number' ? data.position.y : 0.5;
              data.position.z = typeof data.position.z === 'number' ? data.position.z : 0;
            }

            // Ensure other required properties with defaults
            data.rotation = typeof data.rotation === 'number' ? data.rotation : 0;
            data.speed = typeof data.speed === 'number' ? data.speed : 0;
            data.sequence = typeof data.sequence === 'number' ? data.sequence : 0;
            
            // Add controls if missing
            if (!data.controls) {
              data.controls = {
                accelerate: false,
                brake: false,
                turnLeft: false,
                turnRight: false,
                handbrake: false
              };
            }

            // Store client input for server-side physics
            client.lastInput = data;
            client.lastInputTime = Date.now();
            
            // Update client state with position data
            client.state = {
              x: data.position.x,
              y: data.position.y,
              z: data.position.z,
              rotation: data.rotation,
              speed: data.speed,
              sequence: data.sequence,
              timestamp: Date.now()
            };
            
            // Process server-side physics
            this.processServerPhysics(client);
            
            // Broadcast updated position to other clients with interpolation data
            this.broadcastToOthers(ws, {
              type: 'playerPosition',
              id: client.id,
              position: {
                x: client.state.x,
                y: client.state.y,
                z: client.state.z
              },
              rotation: client.state.rotation,
              speed: client.state.speed,
              sequence: client.state.sequence,
              timestamp: client.state.timestamp,
              interpolation: {
                startTime: client.state.timestamp,
                endTime: client.state.timestamp + (1000 / config.UPDATE_RATE)
              }
            });
          } catch (error) {
            console.error(`[WEBSOCKET] Error processing position update from client #${client.id}:`, error);
          }
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
   * Process server-side physics simulation for a client
   * @param {object} client - Client data object
   */
  processServerPhysics(client) {
    if (!client.lastInput || !this.physicsWorld) return;

    try {
      const deltaTime = (Date.now() - client.lastInputTime) / 1000;
      const serverState = this.physicsWorld.updateVehicle(
        { ...client.state },
        client.lastInput,
        deltaTime
      );

      // Check for significant discrepancies between client and server state
      const positionDiff = Math.sqrt(
        Math.pow(serverState.x - client.state.x, 2) +
        Math.pow(serverState.y - client.state.y, 2) +
        Math.pow(serverState.z - client.state.z, 2)
      );
      
      const rotationDiff = Math.abs(serverState.rotation - client.state.rotation);
      const speedDiff = Math.abs(serverState.speed - client.state.speed);

      // If there's a significant discrepancy, send reconciliation message
      if (positionDiff > 0.5 || rotationDiff > 0.1 || speedDiff > 1) {
        const reconciliationMessage = {
          type: 'serverReconciliation',
          sequence: client.state.sequence,
          state: {
            position: {
              x: serverState.x,
              y: serverState.y,
              z: serverState.z
            },
            rotation: serverState.rotation,
            speed: serverState.speed
          },
          timestamp: Date.now()
        };

        if (client.ws && client.ws.readyState === 1) { // WebSocket.OPEN = 1
          client.ws.send(JSON.stringify(reconciliationMessage));
          
          // Update client state to match server
          client.state = { ...serverState };
        } else {
          console.warn(`[WEBSOCKET] Can't send reconciliation: WebSocket not available for client #${client.id}`);
        }
      }
    } catch (error) {
      console.error(`[WEBSOCKET] Error in server physics for client #${client.id}:`, error);
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
    
    // Create array of player data with interpolation info
    this.clients.forEach((client) => {
      // Skip if client state is not properly initialized
      if (!client.state) {
        console.warn(`[WEBSOCKET] Client #${client.id} has no state initialized`);
        return;
      }

      players.push({
        id: client.id,
        position: {
          x: client.state.x,
          y: client.state.y,
          z: client.state.z
        },
        rotation: client.state.rotation,
        speed: client.state.speed,
        sequence: client.state.sequence,
        timestamp: client.state.timestamp,
        interpolation: {
          startTime: client.state.timestamp,
          endTime: client.state.timestamp + (1000 / config.UPDATE_RATE)
        }
      });
    });
    
    // Only broadcast if we have players to send
    if (players.length > 0) {
      // Send player list to all clients
      this.broadcastToAll({
        type: 'playerList',
        players: players,
        timestamp: Date.now()
      });
    }
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