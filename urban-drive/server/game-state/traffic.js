/**
 * Urban Drive - Traffic System
 * Manages AI-controlled vehicles that follow predefined paths
 */

const config = require('../../shared/config');

/**
 * Traffic class manages AI-controlled vehicles in the city
 * @class Traffic
 */
class Traffic {
  /**
   * Create a new Traffic system
   * @param {WebSocketServer} wss - WebSocket server for broadcasting updates
   */
  constructor(wss) {
    this.wss = wss;
    this.vehicles = [];
    this.lastUpdate = Date.now();
    this.vehicleCount = 5; // Start with 5 vehicles, configurable up to MAX_TRAFFIC_VEHICLES
    
    // Define road grid parameters (should match client-side city configuration)
    this.roadGrid = {
      citySize: 500,
      blockSize: 20,
      roadWidth: 10
    };
    
    // Vehicle templates with different colors and speeds
    this.vehicleTemplates = [
      { type: 'car', color: 0xff0000, maxSpeed: 15, length: 4, width: 2 },
      { type: 'car', color: 0x00ff00, maxSpeed: 12, length: 4, width: 2 },
      { type: 'car', color: 0x0000ff, maxSpeed: 13, length: 4, width: 2 },
      { type: 'truck', color: 0xffff00, maxSpeed: 10, length: 7, width: 2.5 },
      { type: 'van', color: 0xff00ff, maxSpeed: 11, length: 5, width: 2.2 }
    ];
    
    // Traffic AI states
    this.states = {
      MOVING: 'moving',
      STOPPED: 'stopped',
      TURNING: 'turning'
    };
    
    // District definitions for traffic spawning
    this.districts = {
      downtown: { x: -100, z: -100, size: 100 },
      suburbs: { x: 100, z: -100, size: 150 },
      industrial: { x: 100, z: 100, size: 120 },
      waterfront: { x: -100, z: 150, size: 80 }
    };
    
    // Simplified map of building blocks for collision detection
    this.buildingMap = this.generateBuildingMap();
    
    this.initialize();
    this.startUpdateLoop();
    
    console.log(`[TRAFFIC] Initialized with ${this.vehicleCount} vehicles`);
  }
  
  /**
   * Generate a simplified map of where buildings are located
   * @returns {Map} - Map of cell coordinates to building presence
   */
  generateBuildingMap() {
    const map = new Map();
    const { blockSize, roadWidth } = this.roadGrid;
    const blockAndRoad = blockSize + roadWidth;
    const halfSize = this.roadGrid.citySize / 2;
    
    // Create a grid of cells
    for (let x = -halfSize; x < halfSize; x += blockAndRoad) {
      for (let z = -halfSize; z < halfSize; z += blockAndRoad) {
        // For each grid cell, mark where the buildings should be
        for (let bx = 0; bx < blockSize; bx++) {
          for (let bz = 0; bz < blockSize; bz++) {
            const cellX = Math.floor((x + bx) / 5) * 5; // Group into 5x5 cells for efficiency
            const cellZ = Math.floor((z + bz) / 5) * 5;
            const key = `${cellX},${cellZ}`;
            map.set(key, true); // There is a building here
          }
        }
      }
    }
    
    return map;
  }
  
  /**
   * Check if a position is inside or very close to a building
   * @param {object} position - Position to check {x, z}
   * @returns {boolean} - True if inside a building
   */
  isInsideBuilding(position) {
    const { x, z } = position;
    const { blockSize, roadWidth } = this.roadGrid;
    const blockAndRoad = blockSize + roadWidth;
    
    // Check if we're on a road
    const gridX = (x + this.roadGrid.citySize / 2) % blockAndRoad;
    const gridZ = (z + this.roadGrid.citySize / 2) % blockAndRoad;
    
    // If we're on a road, we're not in a building
    if (gridX < roadWidth || gridZ < roadWidth) {
      return false;
    }
    
    // Convert to cell coordinates
    const cellX = Math.floor(x / 5) * 5;
    const cellZ = Math.floor(z / 5) * 5;
    const key = `${cellX},${cellZ}`;
    
    // Check if this cell contains a building
    return this.buildingMap.has(key) && this.buildingMap.get(key) === true;
  }
  
  /**
   * Initialize traffic vehicles
   */
  initialize() {
    // Clear any existing vehicles
    this.vehicles = [];
    
    // Create initial set of vehicles
    for (let i = 0; i < this.vehicleCount; i++) {
      this.createTrafficVehicle();
    }
  }
  
  /**
   * Create a single traffic vehicle with random type and starting position
   */
  createTrafficVehicle() {
    // Choose a random vehicle template
    const template = this.vehicleTemplates[Math.floor(Math.random() * this.vehicleTemplates.length)];
    
    // Choose a random district to spawn in
    const districtKeys = Object.keys(this.districts);
    const districtKey = districtKeys[Math.floor(Math.random() * districtKeys.length)];
    const district = this.districts[districtKey];
    
    // Place on a road in that district
    const { x, z } = this.getRandomRoadPosition(district);
    
    // Determine if vehicle should align to x or z axis (0, π/2, π, or 3π/2)
    // 0 = east, π/2 = north, π = west, 3π/2 = south
    const direction = Math.floor(Math.random() * 4);
    const rotation = direction * Math.PI / 2;
    
    // Set random speed within limits of the template
    const speed = template.maxSpeed * (0.6 + Math.random() * 0.4);
    
    // Create the vehicle
    const vehicle = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: template.type,
      color: template.color,
      position: { x, y: 0.5, z },
      rotation,
      speed,
      maxSpeed: template.maxSpeed,
      dimensions: {
        length: template.length,
        width: template.width
      },
      state: this.states.MOVING,
      stateTime: 0,
      direction: 1, // Always move forward in the direction of rotation
      nextTurn: {
        distance: 100 + Math.random() * 200, // Distance until next turn
        direction: Math.random() > 0.5 ? 1 : -1 // Left or right
      },
      lastUpdate: Date.now(),
      collisionCount: 0,
      offRoadCount: 0
    };
    
    this.vehicles.push(vehicle);
  }
  
  /**
   * Get a random position on a road in the specified district
   * @param {object} district - District coordinates and size
   * @returns {object} - Random road position {x, z}
   */
  getRandomRoadPosition(district) {
    const { blockSize, roadWidth } = this.roadGrid;
    const blockAndRoad = blockSize + roadWidth;
    
    // Calculate district bounds
    const minX = district.x - district.size / 2;
    const maxX = district.x + district.size / 2;
    const minZ = district.z - district.size / 2;
    const maxZ = district.z + district.size / 2;
    
    // Decide whether to place on horizontal or vertical road
    const isHorizontal = Math.random() > 0.5;
    
    if (isHorizontal) {
      // Find a valid z coordinate that corresponds to a road
      let z;
      let validRoad = false;
      let attempts = 0;
      
      while (!validRoad && attempts < 20) {
        attempts++;
        // Calculate road positions based on grid
        const roadCount = Math.floor(district.size / blockAndRoad);
        const roadIndex = Math.floor(Math.random() * (roadCount + 1));
        z = minZ + (roadIndex * blockAndRoad) + (roadWidth / 2); // Center of road
        
        // Verify it's a valid road position
        validRoad = true;
      }
      
      // Random x position within district bounds
      const x = minX + Math.random() * district.size;
      
      return { x, z };
    } else {
      // Find a valid x coordinate that corresponds to a road
      let x;
      let validRoad = false;
      let attempts = 0;
      
      while (!validRoad && attempts < 20) {
        attempts++;
        // Calculate road positions based on grid
        const roadCount = Math.floor(district.size / blockAndRoad);
        const roadIndex = Math.floor(Math.random() * (roadCount + 1));
        x = minX + (roadIndex * blockAndRoad) + (roadWidth / 2); // Center of road
        
        // Verify it's a valid road position
        validRoad = true;
      }
      
      // Random z position within district bounds
      const z = minZ + Math.random() * district.size;
      
      return { x, z };
    }
  }
  
  /**
   * Check if a position is on a valid road
   * @param {object} position - Position to check {x, z}
   * @returns {boolean} - True if on a road
   */
  isOnRoad(position) {
    const { blockSize, roadWidth } = this.roadGrid;
    const blockAndRoad = blockSize + roadWidth;
    
    // Calculate relative position in the grid
    const normalizedX = (position.x + this.roadGrid.citySize / 2) % blockAndRoad;
    const normalizedZ = (position.z + this.roadGrid.citySize / 2) % blockAndRoad;
    
    // Check if we're on a road in either direction
    return normalizedX < roadWidth || normalizedZ < roadWidth;
  }
  
  /**
   * Start the traffic update loop
   */
  startUpdateLoop() {
    setInterval(() => {
      this.update();
    }, 1000 / config.TICK_RATE); // Update at server tick rate
  }
  
  /**
   * Update traffic vehicle positions and states
   */
  update() {
    const now = Date.now();
    const deltaTime = (now - this.lastUpdate) / 1000; // Convert to seconds
    this.lastUpdate = now;
    
    // Update each vehicle
    this.vehicles.forEach(vehicle => {
      this.updateVehicle(vehicle, deltaTime);
    });
    
    // Broadcast updated traffic state
    this.broadcastTrafficState();
  }
  
  /**
   * Update a single vehicle
   * @param {object} vehicle - Vehicle to update
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateVehicle(vehicle, deltaTime) {
    // Update state time
    vehicle.stateTime += deltaTime;
    
    // Handle different states
    switch (vehicle.state) {
      case this.states.MOVING:
        this.handleMovingState(vehicle, deltaTime);
        break;
        
      case this.states.STOPPED:
        this.handleStoppedState(vehicle, deltaTime);
        break;
        
      case this.states.TURNING:
        this.handleTurningState(vehicle, deltaTime);
        break;
    }
    
    // Check if vehicle has gone off the map
    if (this.isOutOfBounds(vehicle.position)) {
      // Reset position to a valid road
      this.resetVehiclePosition(vehicle);
    }
    
    vehicle.lastUpdate = Date.now();
  }
  
  /**
   * Handle vehicle in moving state
   * @param {object} vehicle - Vehicle to update
   * @param {number} deltaTime - Time since last update in seconds
   */
  handleMovingState(vehicle, deltaTime) {
    // Calculate movement based on direction and rotation
    const distance = vehicle.speed * deltaTime;
    
    // Determine the new position based on rotation
    const forwardVector = {
      x: Math.cos(vehicle.rotation),
      z: Math.sin(vehicle.rotation)
    };
    
    const newPosition = {
      x: vehicle.position.x + forwardVector.x * distance * vehicle.direction,
      y: vehicle.position.y,
      z: vehicle.position.z + forwardVector.z * distance * vehicle.direction
    };
    
    // Check if the new position is valid (on a road and not in a building)
    if (this.isOnRoad(newPosition) && !this.isInsideBuilding(newPosition)) {
      // Update position if valid
      vehicle.position = newPosition;
      vehicle.offRoadCount = 0;
    } else {
      // We're off the road or in a building - handle the collision
      vehicle.collisionCount++;
      vehicle.offRoadCount++;
      
      // If we've had multiple consecutive off-road or collision issues, reset the vehicle
      if (vehicle.offRoadCount > 5 || vehicle.collisionCount > 10) {
        this.resetVehiclePosition(vehicle);
        return;
      }
      
      // Try to handle the collision by turning
      vehicle.state = this.states.TURNING;
      vehicle.stateTime = 0;
      
      // Pick a new direction that's 90 or 270 degrees from the current direction (left or right turn)
      const turnDirection = Math.random() > 0.5 ? 1 : -1;
      vehicle.nextTurn.direction = turnDirection;
      
      return;
    }
    
    // Update distance until next turn
    vehicle.nextTurn.distance -= distance;
    
    // Check if it's time to turn
    if (vehicle.nextTurn.distance <= 0) {
      vehicle.state = this.states.TURNING;
      vehicle.stateTime = 0;
      
      // Calculate next turn distance (longer stretches between turns)
      vehicle.nextTurn.distance = 100 + Math.random() * 200;
      vehicle.nextTurn.direction = Math.random() > 0.5 ? 1 : -1;
    }
    
    // Random chance to stop at intersections
    if (this.isAtIntersection(vehicle.position) && Math.random() < 0.01) {
      vehicle.state = this.states.STOPPED;
      vehicle.stateTime = 0;
    }
  }
  
  /**
   * Handle vehicle in stopped state
   * @param {object} vehicle - Vehicle to update
   * @param {number} deltaTime - Time since last update in seconds
   */
  handleStoppedState(vehicle, deltaTime) {
    // Stay stopped for 3-5 seconds
    if (vehicle.stateTime > 3 + Math.random() * 2) {
      vehicle.state = this.states.MOVING;
      vehicle.stateTime = 0;
    }
  }
  
  /**
   * Handle vehicle in turning state
   * @param {object} vehicle - Vehicle to update
   * @param {number} deltaTime - Time since last update in seconds
   */
  handleTurningState(vehicle, deltaTime) {
    // Turn for about 1 second
    if (vehicle.stateTime < 1) {
      // Rotation direction: 1 = right turn (clockwise), -1 = left turn (counter-clockwise)
      const turnDirection = vehicle.nextTurn.direction;
      
      // Rotate 90 degrees (Math.PI/2) over 1 second
      const turnAmount = (Math.PI / 2) * deltaTime * turnDirection;
      vehicle.rotation += turnAmount;
      
      // Keep rotation between 0 and 2*PI
      while (vehicle.rotation < 0) vehicle.rotation += Math.PI * 2;
      while (vehicle.rotation >= Math.PI * 2) vehicle.rotation -= Math.PI * 2;
    } else {
      // Finish turning, normalize rotation to closest 90-degree multiple
      // This ensures vehicles are always aligned with the grid
      vehicle.rotation = Math.round(vehicle.rotation / (Math.PI / 2)) * (Math.PI / 2);
      
      // Ensure rotation is between 0 and 2*PI
      while (vehicle.rotation < 0) vehicle.rotation += Math.PI * 2;
      while (vehicle.rotation >= Math.PI * 2) vehicle.rotation -= Math.PI * 2;
      
      // Return to moving state
      vehicle.state = this.states.MOVING;
      vehicle.stateTime = 0;
    }
  }
  
  /**
   * Check if a position is at an intersection
   * @param {object} position - Position to check {x, z}
   * @returns {boolean} - True if at an intersection
   */
  isAtIntersection(position) {
    const { blockSize, roadWidth } = this.roadGrid;
    const blockAndRoad = blockSize + roadWidth;
    
    // Calculate grid position
    const gridX = (position.x + this.roadGrid.citySize / 2) % blockAndRoad;
    const gridZ = (position.z + this.roadGrid.citySize / 2) % blockAndRoad;
    
    // At intersection if both coordinates are on roads
    return (gridX < roadWidth && gridZ < roadWidth);
  }
  
  /**
   * Check if a position is out of the city bounds
   * @param {object} position - Position to check {x, z}
   * @returns {boolean} - True if out of bounds
   */
  isOutOfBounds(position) {
    const halfSize = this.roadGrid.citySize / 2;
    return (
      position.x < -halfSize ||
      position.x > halfSize ||
      position.z < -halfSize ||
      position.z > halfSize
    );
  }
  
  /**
   * Reset a vehicle's position to a valid location
   * @param {object} vehicle - Vehicle to reset
   */
  resetVehiclePosition(vehicle) {
    // Choose a random district
    const districtKeys = Object.keys(this.districts);
    const districtKey = districtKeys[Math.floor(Math.random() * districtKeys.length)];
    const district = this.districts[districtKey];
    
    // Get a new road position
    const { x, z } = this.getRandomRoadPosition(district);
    
    // Reset vehicle properties
    vehicle.position = { x, y: 0.5, z };
    vehicle.state = this.states.MOVING;
    vehicle.stateTime = 0;
    
    // Set vehicle to face in a cardinal direction (0, π/2, π, or 3π/2)
    const direction = Math.floor(Math.random() * 4);
    vehicle.rotation = direction * Math.PI / 2;
    
    // Always move forward in the direction of rotation
    vehicle.direction = 1;
    
    // Reset next turn
    vehicle.nextTurn = {
      distance: 100 + Math.random() * 200,
      direction: Math.random() > 0.5 ? 1 : -1
    };
    
    // Reset collision counters
    vehicle.collisionCount = 0;
    vehicle.offRoadCount = 0;
  }
  
  /**
   * Broadcast traffic state to all clients
   */
  broadcastTrafficState() {
    if (!this.wss) return;
    
    // Prepare vehicle data for transmission
    const trafficData = this.vehicles.map(vehicle => ({
      id: vehicle.id,
      type: vehicle.type,
      color: vehicle.color,
      position: vehicle.position,
      rotation: vehicle.rotation,
      state: vehicle.state,
      dimensions: vehicle.dimensions
    }));
    
    // Send to clients
    this.wss.broadcastToAll({
      type: 'trafficUpdate',
      vehicles: trafficData,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get current traffic vehicle count
   * @returns {number} - Number of traffic vehicles
   */
  getVehicleCount() {
    return this.vehicles.length;
  }
  
  /**
   * Set the number of traffic vehicles (within limits)
   * @param {number} count - Desired number of vehicles
   */
  setVehicleCount(count) {
    // Ensure count is within limits
    this.vehicleCount = Math.min(
      Math.max(count, 1), 
      config.MAX_TRAFFIC_VEHICLES
    );
    
    // Adjust vehicle array
    if (this.vehicles.length < this.vehicleCount) {
      // Add more vehicles
      while (this.vehicles.length < this.vehicleCount) {
        this.createTrafficVehicle();
      }
    } else if (this.vehicles.length > this.vehicleCount) {
      // Remove excess vehicles
      this.vehicles = this.vehicles.slice(0, this.vehicleCount);
    }
    
    console.log(`[TRAFFIC] Adjusted to ${this.vehicleCount} vehicles`);
  }
}

module.exports = Traffic; 