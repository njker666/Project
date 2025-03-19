import { updateUI } from './ui/hud.js'; // Import the updateUI function

function render() {
    // ... existing rendering code ...
    
    updateUI(); // Call the update function to refresh UI elements

    requestAnimationFrame(render);
} 