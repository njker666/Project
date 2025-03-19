// Import necessary modules
import { getVehicleSpeed } from '../physics/vehicle.js'; // Assuming you have a function to get vehicle speed

// Create a speedometer element
const speedometer = document.createElement('div');
speedometer.style.position = 'absolute';
speedometer.style.top = '10px';
speedometer.style.left = '10px';
speedometer.style.color = 'white';
speedometer.style.fontSize = '20px';
document.body.appendChild(speedometer);

// Create a mini-map element
const miniMap = document.createElement('canvas');
miniMap.width = 200;
miniMap.height = 200;
miniMap.style.position = 'absolute';
miniMap.style.bottom = '10px';
miniMap.style.right = '10px';
document.body.appendChild(miniMap);

// Placeholder for menu button
const menuButton = document.createElement('button');
menuButton.innerText = 'Menu';
menuButton.style.position = 'absolute';
menuButton.style.top = '10px';
menuButton.style.right = '10px';
document.body.appendChild(menuButton);

// Update function to refresh UI elements
function updateUI() {
    const speed = getVehicleSpeed(); // Get the current speed of the vehicle
    speedometer.innerText = `Speed: ${speed.toFixed(2)} mph`;
    
    // Update mini-map (placeholder logic)
    const ctx = miniMap.getContext('2d');
    ctx.clearRect(0, 0, miniMap.width, miniMap.height);
    ctx.fillStyle = 'green'; // Example color for player
    ctx.fillRect(90, 90, 20, 20); // Example player position
}

// Export the update function for use in the main render loop
export { updateUI }; 