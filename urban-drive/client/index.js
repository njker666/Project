/**
 * Urban Drive - Main Entry Point
 * This file imports and initializes the game components
 */

// Import THREE.js
import * as THREE from 'three';
// Import the Scene class from rendering module
import Scene from './rendering/scene.js';
// Import the Controls class for keyboard input
import Controls from './controls.js';
// Import the Vehicle class for the player vehicle
import Vehicle from './physics/vehicle.js';
// Import the CollisionManager for handling building collisions
import CollisionManager from './physics/collisionManager.js';
// Import the HUD class for UI elements
import HUD from './ui/hud.js';
// Import the WebSocket connection manager
import WebSocketConnection from './network/connection.js';
// Import the Other Players Manager
import OtherPlayersManager from './rendering/otherPlayers.js';

// Log startup message
console.log('Urban Drive is starting up...');

// Create and initialize the 3D scene
const gameScene = new Scene('game-canvas');

// Create and initialize keyboard controls
const controls = new Controls();

// Create the player vehicle at a good starting position on a road
const initialPosition = new THREE.Vector3(5, 0.5, 5);
const playerVehicle = new Vehicle(gameScene.getScene(), initialPosition);

// Set the vehicle as the camera target to follow
gameScene.setCameraTarget(playerVehicle);

// Create collision manager
const collisionManager = new CollisionManager(gameScene.getScene());

// Connect city building data with collision manager
const cityBuildingData = gameScene.city.getBuildingCollisionData();
collisionManager.setBuildingData(cityBuildingData);

// Toggle collision debug mode (uncomment for debugging)
// collisionManager.setDebugMode(true);

// Initialize the HUD
const hud = new HUD();

// Initialize the other players manager
const otherPlayers = new OtherPlayersManager(gameScene.getScene());

// Create WebSocket connection
const connection = new WebSocketConnection(
  // Player list handler
  (playerList) => {
    // Filter out the current player from the list
    const clientId = connection.getClientId();
    const otherPlayersList = playerList.filter(player => player.id !== clientId);
    
    // Update other players with the filtered list
    otherPlayers.updatePlayerList(otherPlayersList);
    
    // Update HUD player count
    hud.updatePlayerCount(playerList.length);
  },
  // Player join handler
  (id, position, rotation) => {
    // Skip if it's the current player
    if (id === connection.getClientId()) return;
    
    // Add new player to the scene
    otherPlayers.addPlayer(id, position, rotation);
    
    // Update HUD player count
    hud.updatePlayerCount(otherPlayers.getPlayerCount() + 1); // +1 for local player
    
    console.log(`[MULTIPLAYER] Player #${id} joined the game`);
  },
  // Player leave handler
  (id) => {
    // Skip if it's the current player
    if (id === connection.getClientId()) return;
    
    // Remove player from the scene
    otherPlayers.removePlayer(id);
    
    // Update HUD player count
    hud.updatePlayerCount(otherPlayers.getPlayerCount() + 1); // +1 for local player
    
    console.log(`[MULTIPLAYER] Player #${id} left the game`);
  },
  // Player movement handler
  (id, position, rotation, speed) => {
    // Skip if it's the current player
    if (id === connection.getClientId()) return;
    
    // Update player position
    otherPlayers.updatePlayerPosition(id, position, rotation, speed);
  }
);

// Connect to the WebSocket server
connection.connect();

// Position update timer
let lastPositionUpdate = 0;
const POSITION_UPDATE_INTERVAL = 1000 / 30; // 30 updates per second

// Get control indicator elements
const controlIndicators = {
  up: document.getElementById('control-up'),
  down: document.getElementById('control-down'),
  left: document.getElementById('control-left'),
  right: document.getElementById('control-right'),
  space: document.getElementById('control-space')
};

// Update the visual indicators based on control state
function updateControlIndicators(controlState) {
  for (const key in controlIndicators) {
    if (controlIndicators[key]) {
      if (controlState[key]) {
        controlIndicators[key].classList.add('active');
      } else {
        controlIndicators[key].classList.remove('active');
      }
    }
  }
}

// Last timestamp for calculating delta time
let lastTime = performance.now();

// Game loop function
function gameLoop(currentTime) {
  // Calculate delta time
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  // Update controls and get current state
  const controlState = controls.update();
  
  // Update visual indicators
  updateControlIndicators(controlState);
  
  // Check for collisions
  const collision = collisionManager.checkCollisions(playerVehicle);
  
  // Update vehicle physics with collision info
  playerVehicle.update(controlState, deltaTime, collision);
  
  // Update collision effects
  collisionManager.update(deltaTime);
  
  // Update HUD elements
  hud.updateSpeed(playerVehicle.state.speed);
  hud.updateMiniMap(playerVehicle.state.position, playerVehicle.state.rotation);
  hud.updateCollisionFeedback(playerVehicle.isColliding(), playerVehicle.getLastCollision());
  
  // Update trip meter with vehicle position
  hud.updateTripMeter(playerVehicle.state.position, deltaTime);
  
  // Update network latency display if connected
  if (connection.isConnected()) {
    if (hud.updateNetworkLatency) {
      hud.updateNetworkLatency(connection.getLatency());
    }
  }
  
  // Send position updates at a fixed rate
  if (connection.isConnected() && currentTime - lastPositionUpdate > POSITION_UPDATE_INTERVAL) {
    // Send position to server
    connection.sendPosition(
      playerVehicle.state.position,
      playerVehicle.state.rotation,
      playerVehicle.state.speed
    );
    
    lastPositionUpdate = currentTime;
  }
  
  // Update other players
  otherPlayers.update(deltaTime / 1000);
  
  // Request next frame
  requestAnimationFrame(gameLoop);
}

// Start the animation loop for rendering
gameScene.start();

// Start the game loop for input handling and physics
requestAnimationFrame(gameLoop);

// Log success message
console.log('3D Scene initialized successfully');
console.log('Keyboard controls initialized - use Arrow keys or WASD to control');
console.log('Vehicle created - blue car with physics-based movement');
console.log('Collision detection active - car will collide with buildings');
console.log('FPS counter is active - should maintain at least 30 FPS');
console.log('HUD elements created - speedometer and mini-map visible');
console.log('WebSocket connection established for multiplayer');
console.log('Players joining the game will be visible as colored cars');
console.log('Vehicle position is synchronized with other players');
console.log('Next step: Set up the server with Node.js and Express'); 