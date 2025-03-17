/**
 * Urban Drive - Main Entry Point
 * This file imports and initializes the game components
 */

// Import the Scene class from rendering module
import Scene from './rendering/scene.js';

// Log startup message
console.log('Urban Drive is starting up...');

// Create and initialize the 3D scene
const gameScene = new Scene('game-canvas');

// Start the animation loop
gameScene.start();

// Log success message
console.log('3D Scene initialized successfully');
console.log('FPS counter is active - should maintain at least 30 FPS');
console.log('Next step: Implement basic keyboard controls'); 