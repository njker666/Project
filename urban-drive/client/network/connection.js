/**
 * Urban Drive - WebSocket Client Connection
 * Manages the client's connection to the WebSocket server
 */

/**
 * WebSocketConnection manages the client's connection to the server
 * @class WebSocketConnection
 */
class WebSocketConnection {
  /**
   * Create a new WebSocketConnection
   * @param {function} onPlayerList - Callback for player list updates
   * @param {function} onPlayerJoin - Callback for player join events
   * @param {function} onPlayerLeave - Callback for player leave events
   * @param {function} onPlayerMove - Callback for player movement updates
   * @param {function} onServerReconciliation - Callback for server reconciliation (optional)
   */
  constructor(onPlayerList, onPlayerJoin, onPlayerLeave, onPlayerMove, onServerReconciliation) {
    this.ws = null;
    this.connected = false;
    this.id = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second delay
    this.lastPingTime = 0;
    this.latency = 0;
    this.serverConfig = null;
    
    // Callbacks for handling player data
    this.onPlayerList = onPlayerList || (() => {});
    this.onPlayerJoin = onPlayerJoin || (() => {});
    this.onPlayerLeave = onPlayerLeave || (() => {});
    this.onPlayerMove = onPlayerMove || (() => {});
    this.onServerReconciliation = onServerReconciliation || (() => {});
    
    // Connection status display element
    this.statusElement = document.createElement('div');
    this.statusElement.id = 'connection-status';
    this.statusElement.style.position = 'fixed';
    this.statusElement.style.top = '10px';
    this.statusElement.style.right = '10px';
    this.statusElement.style.padding = '5px 10px';
    this.statusElement.style.borderRadius = '5px';
    this.statusElement.style.fontSize = '12px';
    this.statusElement.style.fontFamily = 'Arial, sans-serif';
    this.statusElement.style.color = '#fff';
    this.statusElement.style.background = 'rgba(0, 0, 0, 0.7)';
    this.statusElement.style.zIndex = '1000';
    this.statusElement.style.display = 'none';
    document.body.appendChild(this.statusElement);
    
    // Latency display element
    this.latencyElement = document.createElement('div');
    this.latencyElement.id = 'latency-display';
    this.latencyElement.style.position = 'fixed';
    this.latencyElement.style.top = '35px';
    this.latencyElement.style.right = '10px';
    this.latencyElement.style.padding = '5px 10px';
    this.latencyElement.style.borderRadius = '5px';
    this.latencyElement.style.fontSize = '12px';
    this.latencyElement.style.fontFamily = 'Arial, sans-serif';
    this.latencyElement.style.color = '#fff';
    this.latencyElement.style.background = 'rgba(0, 0, 0, 0.7)';
    this.latencyElement.style.zIndex = '1000';
    this.latencyElement.style.display = 'none';
    document.body.appendChild(this.latencyElement);
    
    // Update status to disconnected
    this.updateStatusDisplay('disconnected');
  }
  
  /**
   * Connect to the WebSocket server
   */
  connect() {
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);
    this.updateStatusDisplay('connecting');
    
    // Set up WebSocket event handlers
    this.ws.onopen = this.onOpen.bind(this);
    this.ws.onmessage = this.onMessage.bind(this);
    this.ws.onclose = this.onClose.bind(this);
    this.ws.onerror = this.onError.bind(this);
    
    console.log('[NETWORK] Connecting to WebSocket server...');
  }
  
  /**
   * Handle WebSocket open event
   */
  onOpen() {
    this.connected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.updateStatusDisplay('connected');
    
    console.log('[NETWORK] WebSocket connection established');
  }
  
  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event - WebSocket message event
   */
  onMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // Handle different message types
      switch (message.type) {
        case 'welcome':
          this.handleWelcomeMessage(message);
          break;
          
        case 'ping':
          this.handlePingMessage(message);
          break;
          
        case 'playerList':
          this.handlePlayerListMessage(message);
          break;
          
        case 'playerPosition':
          this.handlePlayerPositionMessage(message);
          break;
          
        case 'playerDisconnected':
          this.handlePlayerDisconnectedMessage(message);
          break;
          
        case 'serverReconciliation':
          this.handleServerReconciliationMessage(message);
          break;
          
        case 'chatMessage':
          // Future implementation
          break;
          
        default:
          console.warn(`[NETWORK] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('[NETWORK] Error parsing message:', error);
    }
  }
  
  /**
   * Handle WebSocket close event
   * @param {CloseEvent} event - WebSocket close event
   */
  onClose(event) {
    this.connected = false;
    this.updateStatusDisplay('disconnected');
    
    console.log(`[NETWORK] WebSocket connection closed: ${event.code} ${event.reason}`);
    
    // Attempt to reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.reconnectDelay *= 1.5; // Exponential backoff
      
      console.log(`[NETWORK] Reconnecting in ${this.reconnectDelay / 1000} seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.updateStatusDisplay('reconnecting');
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('[NETWORK] Maximum reconnection attempts reached');
      this.updateStatusDisplay('failed');
    }
  }
  
  /**
   * Handle WebSocket error event
   * @param {Event} error - WebSocket error event
   */
  onError(error) {
    console.error('[NETWORK] WebSocket error:', error);
    this.updateStatusDisplay('error');
  }
  
  /**
   * Handle welcome message from server
   * @param {object} message - Welcome message data
   */
  handleWelcomeMessage(message) {
    this.id = message.id;
    this.serverConfig = {
      maxPlayers: message.maxPlayers,
      currentPlayers: message.currentPlayers,
      tickRate: message.tickRate,
      updateRate: message.updateRate,
      timeoutDuration: message.timeoutDuration
    };
    
    console.log(`[NETWORK] Connected as client #${this.id}`);
    console.log(`[NETWORK] Server info: ${message.currentPlayers}/${message.maxPlayers} players`);
    
    // Update status with player information
    this.updateStatusDisplay('connected', `ID: ${this.id} | Players: ${message.currentPlayers}/${message.maxPlayers}`);
  }
  
  /**
   * Handle ping message from server
   * @param {object} message - Ping message data
   */
  handlePingMessage(message) {
    // Record ping receive time
    this.lastPingTime = message.timestamp;
    
    // Send pong response
    this.sendMessage({
      type: 'pong',
      timestamp: message.timestamp
    });
    
    // Calculate and display latency
    this.latency = Date.now() - message.timestamp;
    this.updateLatencyDisplay();
  }
  
  /**
   * Handle player list message from server
   * @param {object} message - Player list message data
   */
  handlePlayerListMessage(message) {
    // Forward to callback handler
    this.onPlayerList(message.players);
  }
  
  /**
   * Handle player position message from server
   * @param {object} message - Player position message data
   */
  handlePlayerPositionMessage(message) {
    // Add interpolation data if not present
    if (!message.interpolation) {
      message.interpolation = {
        startTime: message.timestamp,
        endTime: message.timestamp + (1000 / this.serverConfig.updateRate)
      };
    }

    // Forward to callback handler with enhanced data
    this.onPlayerMove(
      message.id,
      message.position,
      message.rotation,
      message.speed,
      message.sequence,
      message.timestamp,
      message.interpolation
    );
  }
  
  /**
   * Handle player disconnected message from server
   * @param {object} message - Player disconnected message data
   */
  handlePlayerDisconnectedMessage(message) {
    // Forward to callback handler
    this.onPlayerLeave(message.id);
  }
  
  /**
   * Handle server reconciliation message from server
   * @param {object} message - Server reconciliation message data
   */
  handleServerReconciliationMessage(message) {
    // If it's not for this client, ignore
    if (message.id !== this.id) return;
    
    console.log(`[NETWORK] Received server reconciliation for sequence ${message.sequence}`);
    
    // Forward to the callback handler with enhanced state data
    this.onServerReconciliation(message.state, message.sequence, message.timestamp);
  }
  
  /**
   * Send position update to server with sequence number for reconciliation
   * @param {object} networkState - Vehicle network state including position, rotation, speed, and sequence
   */
  sendPosition(networkState) {
    if (!this.connected) return;
    
    console.log('Sending position to server:', networkState);
    
    try {
      // Ensure networkState has all required fields with fallbacks
      const safeNetworkState = {
        position: networkState.position || { x: 0, y: 0.5, z: 0 },
        rotation: networkState.rotation || 0,
        speed: networkState.speed || 0,
        sequence: networkState.sequence || 0,
        controls: networkState.controls || {
          accelerate: false,
          brake: false,
          turnLeft: false, 
          turnRight: false,
          handbrake: false
        },
        timestamp: Date.now()
      };
      
      const positionMessage = {
        type: 'position',
        position: safeNetworkState.position,
        rotation: safeNetworkState.rotation,
        speed: safeNetworkState.speed,
        sequence: safeNetworkState.sequence,
        controls: safeNetworkState.controls,
        timestamp: safeNetworkState.timestamp
      };
      
      this.sendMessage(positionMessage);
    } catch (error) {
      console.error('Error sending position:', error);
    }
  }
  
  /**
   * Send a message to the server
   * @param {object} data - Message data to send
   */
  sendMessage(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  /**
   * Update the connection status display
   * @param {string} status - Connection status
   * @param {string} [detail] - Additional status details
   */
  updateStatusDisplay(status, detail = '') {
    if (!this.statusElement) return;
    
    let color = '#fff';
    let text = 'Status: ';
    
    switch (status) {
      case 'connecting':
        color = '#ffcc00';
        text += 'Connecting...';
        break;
        
      case 'connected':
        color = '#00cc00';
        text += 'Connected';
        break;
        
      case 'disconnected':
        color = '#cc0000';
        text += 'Disconnected';
        break;
        
      case 'reconnecting':
        color = '#ff9900';
        text += `Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`;
        break;
        
      case 'error':
      case 'failed':
        color = '#cc0000';
        text += status === 'error' ? 'Connection Error' : 'Connection Failed';
        break;
        
      default:
        text += status;
    }
    
    if (detail) {
      text += ` | ${detail}`;
    }
    
    this.statusElement.textContent = text;
    this.statusElement.style.color = color;
    this.statusElement.style.display = 'block';
  }
  
  /**
   * Update the latency display
   */
  updateLatencyDisplay() {
    if (!this.latencyElement) return;
    
    let color = '#00cc00';
    
    // Color coding based on latency
    if (this.latency > 100) {
      color = '#cc0000'; // Red for high latency
    } else if (this.latency > 50) {
      color = '#ffcc00'; // Yellow for medium latency
    }
    
    this.latencyElement.textContent = `Latency: ${this.latency}ms`;
    this.latencyElement.style.color = color;
    this.latencyElement.style.display = this.connected ? 'block' : 'none';
  }
  
  /**
   * Get the client's id assigned by the server
   * @returns {number|null} Client id
   */
  getClientId() {
    return this.id;
  }
  
  /**
   * Get the current connection latency
   * @returns {number} Latency in milliseconds
   */
  getLatency() {
    return this.latency;
  }
  
  /**
   * Check if the client is connected to the server
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.connected;
  }
  
  /**
   * Get server configuration information
   * @returns {object|null} Server configuration
   */
  getServerConfig() {
    return this.serverConfig;
  }
}

export default WebSocketConnection; 