/**
 * Urban Drive - Main Entry Point
 * This file imports and initializes the game components
 */

// Import the Scene class from rendering module
import Scene from './rendering/scene.js';
// Import the Controls class for keyboard input
import Controls from './controls.js';
// Import the Vehicle class for the player vehicle
import Vehicle from './physics/vehicle.js';

// Log startup message
console.log('Urban Drive is starting up...');

// Create and initialize the 3D scene
const gameScene = new Scene('game-canvas');

// Create and initialize keyboard controls
const controls = new Controls();

// Create the player vehicle
const playerVehicle = new Vehicle(gameScene.getScene());

// Set the vehicle as the camera target to follow
gameScene.setCameraTarget(playerVehicle);

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
  
  // Update vehicle physics
  playerVehicle.update(controlState, deltaTime);
  
  // Update speed display
  updateSpeedDisplay(playerVehicle.state.speed);
  
  // Request next frame
  requestAnimationFrame(gameLoop);
}

// Start the animation loop for rendering
const deltaTime = gameScene.start();

// Start the game loop for input handling and physics
requestAnimationFrame(gameLoop);

// Log success message
console.log('3D Scene initialized successfully');
console.log('Keyboard controls initialized - use Arrow keys or WASD to control');
console.log('Vehicle created - blue car with physics-based movement');
console.log('FPS counter is active - should maintain at least 30 FPS');
console.log('Next step: Create a diverse city layout'); 