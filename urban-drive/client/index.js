/**
 * Urban Drive - Main Entry Point
 * This file imports and initializes the game components
 */

// Import the Scene class from rendering module
import Scene from './rendering/scene.js';
// Import the Controls class for keyboard input
import Controls from './controls.js';

// Log startup message
console.log('Urban Drive is starting up...');

// Create and initialize the 3D scene
const gameScene = new Scene('game-canvas');

// Create and initialize keyboard controls
const controls = new Controls();

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

// Game loop function
function gameLoop() {
  // Update controls and get current state
  const controlState = controls.update();
  
  // Update visual indicators
  updateControlIndicators(controlState);
  
  // Request next frame
  requestAnimationFrame(gameLoop);
}

// Start the animation loop for rendering
gameScene.start();

// Start the game loop for input handling
gameLoop();

// Log success message
console.log('3D Scene initialized successfully');
console.log('Keyboard controls initialized - use Arrow keys or WASD to control');
console.log('FPS counter is active - should maintain at least 30 FPS');
console.log('Next step: Add a simple player vehicle'); 