/**
 * Shared configuration constants for Urban Drive
 * This file contains constants used by both client and server
 */

const CONFIG = {
  // Game settings
  MAX_PLAYERS: 32,
  TICK_RATE: 30, // Server updates per second
  
  // Performance settings
  TARGET_FPS: 60,
  MAX_LATENCY_MS: 10,
  
  // Vehicle settings
  DEFAULT_VEHICLE_MASS: 1000, // kg
  MAX_VEHICLE_SPEED: 120, // mph
  
  // Network settings
  UPDATE_RATE: 30, // Client position updates per second (30 = ~33ms between updates)
  TIMEOUT_DURATION: 5000, // ms before disconnecting inactive players
  
  // World settings
  WORLD_SIZE: 1000, // units
  ROAD_WIDTH: 10, // units
  
  // Traffic settings
  MAX_TRAFFIC_VEHICLES: 50,
  
  // Debug settings
  DEBUG_MODE: true,
  LOG_PERFORMANCE: true
};

// Export for use in both client and server
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  // For browser environment
  window.CONFIG = CONFIG;
} 