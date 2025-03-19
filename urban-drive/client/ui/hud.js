/**
 * Urban Drive - Heads-Up Display (HUD)
 * Manages UI elements like speedometer, mini-map, and menu system
 */

class HUD {
  constructor() {
    // Container for all HUD elements
    this.container = document.createElement('div');
    this.container.id = 'hud-container';
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none'; // Don't interfere with game input
    document.body.appendChild(this.container);
    
    // Trip meter - track distance traveled in meters
    this.tripDistance = 0;
    this.lastPosition = null;
    
    // Create HUD elements
    this.createSpeedometer();
    this.createMiniMap();
    this.createMenuButton();
    this.createCollisionFeedback();
    
    // Menu panel (initially hidden)
    this.menuVisible = false;
    this.createMenuPanel();
  }
  
  /**
   * Creates an analog speedometer at the bottom center of the screen
   */
  createSpeedometer() {
    // Speedometer container
    this.speedometer = document.createElement('div');
    this.speedometer.id = 'speedometer';
    this.speedometer.style.position = 'absolute';
    this.speedometer.style.bottom = '20px';
    this.speedometer.style.left = '50%';
    this.speedometer.style.transform = 'translateX(-50%)';
    this.speedometer.style.width = '220px';
    this.speedometer.style.height = '220px';
    this.speedometer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    this.speedometer.style.borderRadius = '50%';
    this.speedometer.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.7)';
    this.container.appendChild(this.speedometer);
    
    // Create canvas for drawing the speedometer
    this.speedCanvas = document.createElement('canvas');
    this.speedCanvas.width = 220;
    this.speedCanvas.height = 220;
    this.speedCanvas.style.width = '100%';
    this.speedCanvas.style.height = '100%';
    this.speedometer.appendChild(this.speedCanvas);
    
    // Get the context for drawing
    this.speedContext = this.speedCanvas.getContext('2d');
    
    // Draw the initial speedometer (0 km/h)
    this.drawAnalogSpeedometer(0);
    
    // Digital display container
    this.digitalDisplay = document.createElement('div');
    this.digitalDisplay.style.position = 'absolute';
    this.digitalDisplay.style.bottom = '60px';
    this.digitalDisplay.style.left = '50%';
    this.digitalDisplay.style.transform = 'translateX(-50%)';
    this.digitalDisplay.style.width = '80px';
    this.digitalDisplay.style.height = '40px';
    this.digitalDisplay.style.backgroundColor = 'rgba(173, 216, 230, 0.2)';
    this.digitalDisplay.style.borderRadius = '5px';
    this.digitalDisplay.style.display = 'flex';
    this.digitalDisplay.style.flexDirection = 'column';
    this.digitalDisplay.style.justifyContent = 'center';
    this.digitalDisplay.style.alignItems = 'center';
    this.speedometer.appendChild(this.digitalDisplay);
    
    // Speed text display (digital readout)
    this.speedText = document.createElement('div');
    this.speedText.style.color = 'rgba(173, 216, 230, 0.9)';
    this.speedText.style.fontFamily = 'monospace';
    this.speedText.style.fontSize = '16px';
    this.speedText.style.fontWeight = 'bold';
    this.speedText.style.textAlign = 'center';
    this.speedText.textContent = '0.0';
    this.digitalDisplay.appendChild(this.speedText);
    
    // Trip meter display
    this.tripMeterDisplay = document.createElement('div');
    this.tripMeterDisplay.style.color = 'rgba(173, 216, 230, 0.9)';
    this.tripMeterDisplay.style.fontFamily = 'monospace';
    this.tripMeterDisplay.style.fontSize = '12px';
    this.tripMeterDisplay.style.textAlign = 'center';
    this.tripMeterDisplay.textContent = 'TRIP: 0.0 km';
    this.digitalDisplay.appendChild(this.tripMeterDisplay);
  }
  
  /**
   * Draws the analog speedometer with current speed
   * @param {number} speed - Current speed in km/h
   */
  drawAnalogSpeedometer(speed) {
    const ctx = this.speedContext;
    const width = this.speedCanvas.width;
    const height = this.speedCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw outer circle (speedometer background)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fill();
    
    // Draw speedometer border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw tick marks and numbers
    this.drawTickMarks(ctx, centerX, centerY, radius);
    
    // Draw needle
    this.drawNeedle(ctx, centerX, centerY, radius, speed);
    
    // Draw center cap
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#550000';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = '#cc0000';
    ctx.fill();
  }
  
  /**
   * Draws the tick marks and numbers on the speedometer
   */
  drawTickMarks(ctx, centerX, centerY, radius) {
    // Define the start and end angles for the speedometer arc
    // In canvas: 0° is right, 90° is down, 180° is left, 270° is up
    // We want 0 at bottom left (about 135°) and 140 at bottom right (about 45°)
    const startAngle = Math.PI * 0.75; // 135 degrees - bottom left
    const endAngle = Math.PI * 0.25;   // 45 degrees - bottom right
    
    // Draw km/h numbers (main scale: 0, 10, 20, ... 140)
    for (let speed = 0; speed <= 140; speed += 10) {
      // Calculate angle for this speed
      const angle = this.speedToAngle(speed);
      
      // Determine if this is a major tick (divisible by 20)
      const isMajor = speed % 20 === 0;
      
      // Calculate tick position
      const innerRadius = isMajor ? radius * 0.75 : radius * 0.8;
      const outerRadius = radius * 0.88;
      const startX = centerX + innerRadius * Math.cos(angle);
      const startY = centerY + innerRadius * Math.sin(angle);
      const endX = centerX + outerRadius * Math.cos(angle);
      const endY = centerY + outerRadius * Math.sin(angle);
      
      // Draw tick mark
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = isMajor ? 'white' : 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.stroke();
      
      // Draw speed number for major ticks
      if (isMajor) {
        const textRadius = radius * 0.65;
        const textX = centerX + textRadius * Math.cos(angle);
        const textY = centerY + textRadius * Math.sin(angle);
        
        // Use cyan color for the numbers as in the reference image
        ctx.font = speed === 0 ? 'bold 16px Arial' : 'bold 16px Arial';
        ctx.fillStyle = '#00FFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(speed.toString(), textX, textY);
      }
    }
  }
  
  /**
   * Draws the needle on the speedometer
   */
  drawNeedle(ctx, centerX, centerY, radius, speed) {
    // Cap speed at max (140 km/h)
    const cappedSpeed = Math.min(Math.abs(speed), 140);
    
    // Calculate needle angle
    const angle = this.speedToAngle(cappedSpeed);
    
    // Create needle shape
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    
    // Draw needle
    ctx.beginPath();
    
    // Needle back part
    ctx.moveTo(-10, 0);
    ctx.lineTo(0, 2);
    
    // Needle front part
    ctx.lineTo(radius * 0.8, 0);
    ctx.lineTo(0, -2);
    ctx.closePath();
    
    // Fill with red gradient to match reference image
    const needleGradient = ctx.createLinearGradient(-10, 0, radius * 0.8, 0);
    needleGradient.addColorStop(0, '#990000');
    needleGradient.addColorStop(0.5, '#cc0000');
    needleGradient.addColorStop(1, '#ff0000');
    
    ctx.fillStyle = needleGradient;
    ctx.fill();
    
    ctx.restore();
  }
  
  /**
   * Converts speed to angle for the speedometer needle
   * @param {number} speed - Speed in km/h
   * @returns {number} - Angle in radians
   */
  speedToAngle(speed) {
    // Map speed 0-140 to angle between 135 degrees and 45 degrees
    // In canvas coordinates: 0° right, 90° down, 180° left, 270° up
    const startAngle = Math.PI * 0.75; // 135 degrees - bottom left (0 km/h)
    const endAngle = Math.PI * 0.25;   // 45 degrees - bottom right (140 km/h)
    
    // Convert speed to a percentage of max speed (140 km/h)
    const speedPercent = Math.min(speed / 140, 1);
    
    // Calculate angle moving CLOCKWISE from startAngle to endAngle
    // To move clockwise:
    // 1. If end angle < start angle (which is our case), we need to go the short way around
    // 2. Interpolate: startAngle + percentage * (2π - (startAngle - endAngle))
    if (endAngle < startAngle) {
      // Short arc (clockwise) from bottom left to bottom right
      return startAngle + speedPercent * ((Math.PI * 2) - (startAngle - endAngle));
    } else {
      // This won't be used in our case but handles the general case
      return startAngle + speedPercent * (endAngle - startAngle);
    }
  }
  
  /**
   * Creates a mini-map in the bottom-right corner showing a top-down view of the city
   */
  createMiniMap() {
    // Mini-map container
    this.miniMap = document.createElement('div');
    this.miniMap.id = 'mini-map';
    this.miniMap.style.position = 'absolute';
    this.miniMap.style.bottom = '20px';
    this.miniMap.style.right = '20px';
    this.miniMap.style.width = '200px';
    this.miniMap.style.height = '200px';
    this.miniMap.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.miniMap.style.borderRadius = '5px';
    this.miniMap.style.overflow = 'hidden';
    this.miniMap.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    this.container.appendChild(this.miniMap);
    
    // Create canvas for drawing the map
    this.mapCanvas = document.createElement('canvas');
    this.mapCanvas.width = 200;
    this.mapCanvas.height = 200;
    this.mapCanvas.style.width = '100%';
    this.mapCanvas.style.height = '100%';
    this.miniMap.appendChild(this.mapCanvas);
    
    // Get the context for drawing
    this.mapContext = this.mapCanvas.getContext('2d');
    
    // Initial minimap rendering with placeholder
    this.renderMiniMapPlaceholder();
    
    // Add district labels
    this.addDistrictLabels();
  }
  
  /**
   * Renders a placeholder minimap with basic city layout
   */
  renderMiniMapPlaceholder() {
    const ctx = this.mapContext;
    const width = this.mapCanvas.width;
    const height = this.mapCanvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines for roads
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    
    // Vertical road lines
    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal road lines
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw districts with different colors
    // Downtown (top-left)
    ctx.fillStyle = 'rgba(100, 149, 237, 0.3)';
    ctx.fillRect(0, 0, width/2, height/2);
    
    // Suburbs (top-right)
    ctx.fillStyle = 'rgba(144, 238, 144, 0.3)';
    ctx.fillRect(width/2, 0, width/2, height/2);
    
    // Industrial (bottom-right)
    ctx.fillStyle = 'rgba(210, 180, 140, 0.3)';
    ctx.fillRect(width/2, height/2, width/2, height/2);
    
    // Waterfront (bottom-left)
    ctx.fillStyle = 'rgba(135, 206, 250, 0.3)';
    ctx.fillRect(0, height/2, width/2, height/2);
    
    // Draw blue area for water
    ctx.fillStyle = 'rgba(65, 105, 225, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width/2, height);
    ctx.lineTo(width/3, height*0.8);
    ctx.lineTo(0, height*0.7);
    ctx.fill();
    
    // Draw player position (center)
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(width/2, height/2, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  /**
   * Adds text labels for the city districts
   */
  addDistrictLabels() {
    const ctx = this.mapContext;
    const width = this.mapCanvas.width;
    const height = this.mapCanvas.height;
    
    ctx.font = '10px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    
    // Add district labels
    ctx.fillText('Downtown', width/4, height/4);
    ctx.fillText('Suburbs', width*3/4, height/4);
    ctx.fillText('Industrial', width*3/4, height*3/4);
    ctx.fillText('Waterfront', width/4, height*3/4);
  }
  
  /**
   * Creates a menu button in the top-right corner
   */
  createMenuButton() {
    // Menu button is clickable, so it needs pointer events
    this.menuButton = document.createElement('div');
    this.menuButton.id = 'menu-button';
    this.menuButton.textContent = '☰';
    this.menuButton.style.position = 'absolute';
    this.menuButton.style.top = '20px';
    this.menuButton.style.right = '20px';
    this.menuButton.style.width = '40px';
    this.menuButton.style.height = '40px';
    this.menuButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.menuButton.style.color = 'white';
    this.menuButton.style.fontSize = '24px';
    this.menuButton.style.textAlign = 'center';
    this.menuButton.style.lineHeight = '40px';
    this.menuButton.style.borderRadius = '5px';
    this.menuButton.style.cursor = 'pointer';
    this.menuButton.style.pointerEvents = 'auto'; // Make sure it's clickable
    this.menuButton.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    this.menuButton.style.transition = 'background-color 0.3s';
    
    // Hover effect
    this.menuButton.addEventListener('mouseover', () => {
      this.menuButton.style.backgroundColor = 'rgba(80, 80, 80, 0.9)';
    });
    this.menuButton.addEventListener('mouseout', () => {
      this.menuButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    });
    
    // Click handler to toggle menu
    this.menuButton.addEventListener('click', this.toggleMenu.bind(this));
    
    this.container.appendChild(this.menuButton);
  }
  
  /**
   * Creates the menu panel (initially hidden)
   */
  createMenuPanel() {
    this.menuPanel = document.createElement('div');
    this.menuPanel.id = 'menu-panel';
    this.menuPanel.style.position = 'absolute';
    this.menuPanel.style.top = '70px';
    this.menuPanel.style.right = '20px';
    this.menuPanel.style.width = '200px';
    this.menuPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    this.menuPanel.style.borderRadius = '5px';
    this.menuPanel.style.padding = '10px';
    this.menuPanel.style.color = 'white';
    this.menuPanel.style.fontFamily = 'Arial, sans-serif';
    this.menuPanel.style.display = 'none';
    this.menuPanel.style.pointerEvents = 'auto';
    this.menuPanel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.7)';
    
    // Add menu items
    this.menuPanel.innerHTML = `
      <div class="menu-item" style="padding: 10px; border-bottom: 1px solid #444; cursor: pointer;">
        Continue
      </div>
      <div class="menu-item" style="padding: 10px; border-bottom: 1px solid #444; cursor: pointer;">
        Restart
      </div>
      <div class="menu-item" style="padding: 10px; border-bottom: 1px solid #444; cursor: pointer;">
        Controls
      </div>
      <div class="menu-item" style="padding: 10px; cursor: pointer;">
        Settings
      </div>
    `;
    
    // Add hover effects to menu items
    const menuItems = this.menuPanel.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('mouseover', () => {
        item.style.backgroundColor = 'rgba(100, 100, 100, 0.5)';
      });
      item.addEventListener('mouseout', () => {
        item.style.backgroundColor = 'transparent';
      });
      // First item (Continue) closes the menu when clicked
      if (item === menuItems[0]) {
        item.addEventListener('click', this.toggleMenu.bind(this));
      }
    });
    
    this.container.appendChild(this.menuPanel);
  }
  
  /**
   * Creates a collision feedback element that appears when the vehicle collides
   */
  createCollisionFeedback() {
    // Collision feedback container
    this.collisionFeedback = document.createElement('div');
    this.collisionFeedback.id = 'collision-feedback';
    this.collisionFeedback.style.position = 'absolute';
    this.collisionFeedback.style.top = '50%';
    this.collisionFeedback.style.left = '50%';
    this.collisionFeedback.style.transform = 'translate(-50%, -50%)';
    this.collisionFeedback.style.color = '#ff5555';
    this.collisionFeedback.style.fontFamily = 'Arial, sans-serif';
    this.collisionFeedback.style.fontSize = '32px';
    this.collisionFeedback.style.fontWeight = 'bold';
    this.collisionFeedback.style.textShadow = '0 0 10px rgba(255, 0, 0, 0.7)';
    this.collisionFeedback.style.opacity = '0';
    this.collisionFeedback.style.transition = 'opacity 0.2s';
    this.collisionFeedback.style.padding = '15px';
    this.collisionFeedback.style.borderRadius = '5px';
    this.collisionFeedback.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    this.collisionFeedback.textContent = 'COLLISION!';
    this.container.appendChild(this.collisionFeedback);
    
    // Add a screen flash effect div
    this.screenFlash = document.createElement('div');
    this.screenFlash.id = 'screen-flash';
    this.screenFlash.style.position = 'absolute';
    this.screenFlash.style.top = '0';
    this.screenFlash.style.left = '0';
    this.screenFlash.style.width = '100%';
    this.screenFlash.style.height = '100%';
    this.screenFlash.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    this.screenFlash.style.opacity = '0';
    this.screenFlash.style.transition = 'opacity 0.2s';
    this.screenFlash.style.pointerEvents = 'none';
    this.container.appendChild(this.screenFlash);
  }
  
  /**
   * Updates the speedometer with the current speed
   * @param {number} speed - Current speed in km/h
   */
  updateSpeed(speed) {
    const absSpeed = Math.abs(speed);
    
    // Update the analog speedometer
    this.drawAnalogSpeedometer(absSpeed);
    
    // Update digital readout with one decimal place
    this.speedText.textContent = absSpeed.toFixed(1);
  }
  
  /**
   * Updates the trip meter based on vehicle position
   * @param {THREE.Vector3} position - Current vehicle position
   * @param {number} deltaTime - Time since last update in milliseconds
   */
  updateTripMeter(position, deltaTime) {
    // If this is the first position update, just store it
    if (!this.lastPosition) {
      this.lastPosition = position.clone();
      return;
    }
    
    // Calculate distance traveled since last update
    const distanceMoved = position.distanceTo(this.lastPosition);
    
    // Scale factor - simulate more realistic distances
    // This multiplier gives better feeling of distance in the game world
    const distanceScaleFactor = 5;
    
    // Only add if:
    // 1. The movement is reasonable (to prevent large jumps)
    // 2. The vehicle is actually moving (not just floating in place due to physics)
    if (distanceMoved < 10 && distanceMoved > 0.001) {
      this.tripDistance += distanceMoved * distanceScaleFactor;
    }
    
    // Update last position
    this.lastPosition.copy(position);
    
    // Update trip meter display (convert from game units to kilometers)
    const distanceInKm = this.tripDistance / 1000;
    
    // Format based on distance:
    // - Show meters if less than 0.1 km
    // - Show 1 decimal place if 0.1-10 km
    // - Show no decimals if > 10 km
    let displayText;
    if (distanceInKm < 0.1) {
      displayText = `TRIP: ${Math.round(distanceInKm * 1000)} m`;
    } else if (distanceInKm < 10) {
      displayText = `TRIP: ${distanceInKm.toFixed(1)} km`;
    } else {
      displayText = `TRIP: ${Math.round(distanceInKm)} km`;
    }
    
    this.tripMeterDisplay.textContent = displayText;
  }
  
  /**
   * Updates the mini-map with player position
   * @param {THREE.Vector3} position - Player's current position
   * @param {number} rotation - Player's current rotation in radians
   * @param {Object} cityData - Data about the city layout
   */
  updateMiniMap(position, rotation, cityData = null) {
    // We need to render the base map first
    this.renderMiniMapPlaceholder();
    
    // Calculate player position on mini-map
    // The map is 200x200 pixels, representing the game world
    // We need to map the player's position to this range
    const mapWidth = this.mapCanvas.width;
    const mapHeight = this.mapCanvas.height;
    
    // Map world coordinates to mini-map pixels
    // Assuming world coordinates go from -200 to 200
    const worldSize = 400;
    const mapX = ((position.x + worldSize/2) / worldSize) * mapWidth;
    const mapY = ((position.z + worldSize/2) / worldSize) * mapHeight;
    
    const ctx = this.mapContext;
    
    // Draw player position
    ctx.save();
    
    // Draw a triangle for the player (pointing in the direction of rotation)
    ctx.fillStyle = '#ff0000';
    ctx.translate(mapX, mapY);
    
    // Fix: Cars in Three.js typically have rotation where 0 is facing negative Z
    // The minimap needs to account for this, so we need to adjust by PI
    // And also account for the triangle orientation in our drawing
    ctx.rotate(rotation); // Fixed rotation alignment
    
    // Draw triangle
    ctx.beginPath();
    ctx.moveTo(0, -7); // Point at the front
    ctx.lineTo(-4, 7); // Bottom left corner
    ctx.lineTo(4, 7);  // Bottom right corner
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
  
  /**
   * Updates the collision feedback visibility
   * @param {boolean} isColliding - Whether the vehicle is currently colliding
   * @param {Object} collisionData - Data about the collision (optional)
   */
  updateCollisionFeedback(isColliding, collisionData = null) {
    if (isColliding) {
      // Show collision feedback
      this.collisionFeedback.style.opacity = '1';
      
      // Flash the screen red
      this.screenFlash.style.opacity = '1';
      
      // Clear any existing timeout
      if (this.collisionTimeout) {
        clearTimeout(this.collisionTimeout);
      }
      
      // Hide the flash effect after a short delay
      this.collisionTimeout = setTimeout(() => {
        this.screenFlash.style.opacity = '0';
      }, 200);
      
      // If we have collision data, we could customize the feedback
      if (collisionData && collisionData.force > 20) {
        this.collisionFeedback.textContent = 'MAJOR IMPACT!';
        this.collisionFeedback.style.fontSize = '36px';
      } else {
        this.collisionFeedback.textContent = 'COLLISION!';
        this.collisionFeedback.style.fontSize = '32px';
      }
    } else {
      // Hide collision feedback
      this.collisionFeedback.style.opacity = '0';
      this.screenFlash.style.opacity = '0';
    }
  }
  
  /**
   * Toggles the menu panel visibility
   */
  toggleMenu() {
    this.menuVisible = !this.menuVisible;
    this.menuPanel.style.display = this.menuVisible ? 'block' : 'none';
  }
  
  /**
   * Resets the trip meter to zero
   */
  resetTripMeter() {
    this.tripDistance = 0;
    this.tripMeterDisplay.textContent = 'TRIP: 0.0 km';
  }
}

export default HUD; 