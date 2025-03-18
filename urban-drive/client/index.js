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

// Get control indicator elements
const controlIndicators = {
  up: document.getElementById('control-up'),
  down: document.getElementById('control-down'),
  left: document.getElementById('control-left'),
  right: document.getElementById('control-right'),
  space: document.getElementById('control-space')
};

// Create speed display
const speedDisplay = document.createElement('div');
speedDisplay.id = 'speed-display';
speedDisplay.style.position = 'absolute';
speedDisplay.style.top = '75px';
speedDisplay.style.left = '10px';
speedDisplay.style.color = 'white';
speedDisplay.style.fontFamily = 'monospace';
speedDisplay.style.fontSize = '14px';
speedDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
speedDisplay.style.padding = '5px';
speedDisplay.style.borderRadius = '3px';
speedDisplay.textContent = 'Speed: 0 km/h';
document.body.appendChild(speedDisplay);

// Create district info display
const districtDisplay = document.createElement('div');
districtDisplay.id = 'district-display';
districtDisplay.style.position = 'absolute';
districtDisplay.style.top = '110px';
districtDisplay.style.left = '10px';
districtDisplay.style.color = 'white';
districtDisplay.style.fontFamily = 'monospace';
districtDisplay.style.fontSize = '14px';
districtDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
districtDisplay.style.padding = '5px';
districtDisplay.style.borderRadius = '3px';
districtDisplay.innerHTML = `
  <p>City Districts:</p>
  <ul style="padding-left: 15px; margin: 5px 0;">
    <li>Downtown: Northwest (-100, -100)</li>
    <li>Suburbs: Northeast (100, -100)</li>
    <li>Industrial: Southeast (100, 100)</li>
    <li>Waterfront: Southwest (-100, 150)</li>
  </ul>
  <p>Drive around to explore!</p>
`;
document.body.appendChild(districtDisplay);

// Create collision status display
const collisionDisplay = document.createElement('div');
collisionDisplay.id = 'collision-display';
collisionDisplay.style.position = 'absolute';
collisionDisplay.style.top = '240px';
collisionDisplay.style.left = '10px';
collisionDisplay.style.color = 'white';
collisionDisplay.style.fontFamily = 'monospace';
collisionDisplay.style.fontSize = '14px';
collisionDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
collisionDisplay.style.padding = '5px';
collisionDisplay.style.borderRadius = '3px';
collisionDisplay.style.opacity = '0';
collisionDisplay.style.transition = 'opacity 0.3s';
collisionDisplay.textContent = 'COLLISION!';
document.body.appendChild(collisionDisplay);

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

// Update the speed display
function updateSpeedDisplay(speed) {
  speedDisplay.textContent = `Speed: ${Math.abs(speed).toFixed(1)} km/h`;
  
  // Change color based on speed
  if (Math.abs(speed) > 80) {
    speedDisplay.style.color = '#ff5555'; // Red when speeding
  } else if (Math.abs(speed) > 50) {
    speedDisplay.style.color = '#ffff55'; // Yellow at medium speed
  } else {
    speedDisplay.style.color = 'white'; // White at normal speed
  }
}

// Update collision status display
function updateCollisionDisplay(isColliding) {
  if (isColliding) {
    collisionDisplay.style.opacity = '1';
    collisionDisplay.style.color = '#ff5555'; // Red color for collision
  } else {
    collisionDisplay.style.opacity = '0';
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
  
  // Update UI displays
  updateSpeedDisplay(playerVehicle.state.speed);
  updateCollisionDisplay(playerVehicle.isColliding());
  
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
console.log('Next step: Create a diverse city layout'); 