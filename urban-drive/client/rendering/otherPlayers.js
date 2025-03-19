/**
 * Urban Drive - Other Players Manager
 * Handles the rendering and management of other players' vehicles
 */

import * as THREE from 'three';

/**
 * OtherPlayersManager handles the rendering and updates of other players' vehicles
 * @class OtherPlayersManager
 */
class OtherPlayersManager {
  /**
   * Create a new OtherPlayersManager
   * @param {THREE.Scene} scene - The Three.js scene to add players to
   */
  constructor(scene) {
    this.scene = scene;
    this.players = new Map(); // Map of player ID to player data
    this.vehicleMeshes = new Map(); // Map of player ID to THREE.js meshes
  }
  
  /**
   * Update the list of players from server data
   * @param {Array} playerList - List of player data from server
   */
  updatePlayerList(playerList) {
    if (!playerList || !Array.isArray(playerList)) return;
    
    // Create a set of current player IDs
    const currentPlayerIds = new Set(playerList.map(player => player.id));
    
    // Remove players that are no longer in the list
    this.players.forEach((player, id) => {
      if (!currentPlayerIds.has(id)) {
        this.removePlayer(id);
      }
    });
    
    // Update or add players from the list
    playerList.forEach(player => {
      if (this.players.has(player.id)) {
        // Update existing player data
        this.updatePlayerPosition(
          player.id,
          player.position,
          player.rotation,
          player.speed
        );
      } else {
        // Add new player
        this.addPlayer(player.id, player.position, player.rotation);
      }
    });
  }
  
  /**
   * Add a new player to the scene
   * @param {number} id - Player ID
   * @param {object} position - Initial position
   * @param {number} rotation - Initial rotation
   */
  addPlayer(id, position, rotation) {
    // Skip if player already exists
    if (this.players.has(id)) return;
    
    // Create a simple player vehicle mesh
    const vehicleGroup = new THREE.Group();
    
    // Car body - slightly different color for each player
    const bodyGeometry = new THREE.BoxGeometry(2.5, 1, 4);
    const hue = (id * 137.5) % 360; // Generate unique hue based on player ID
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(`hsl(${hue}, 75%, 50%)`),
      specular: 0x555555,
      shininess: 30
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 0.75;
    vehicleGroup.add(bodyMesh);
    
    // Car roof
    const roofGeometry = new THREE.BoxGeometry(2.2, 0.7, 2);
    const roofMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      specular: 0x111111,
      shininess: 10
    });
    const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
    roofMesh.position.set(0, 1.6, -0.2);
    vehicleGroup.add(roofMesh);
    
    // Car windshield
    const windshieldGeometry = new THREE.BoxGeometry(2.1, 0.7, 0.1);
    const windshieldMaterial = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7,
      specular: 0xffffff,
      shininess: 100
    });
    const windshieldMesh = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshieldMesh.position.set(0, 1.3, 0.9);
    windshieldMesh.rotation.x = Math.PI * 0.12;
    vehicleGroup.add(windshieldMesh);
    
    // Car wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelMaterial = new THREE.MeshPhongMaterial({
      color: 0x222222,
      specular: 0x444444,
      shininess: 30
    });
    
    // Front-left wheel
    const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFL.position.set(-1.2, 0.4, 1.3);
    wheelFL.rotation.z = Math.PI / 2;
    vehicleGroup.add(wheelFL);
    
    // Front-right wheel
    const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFR.position.set(1.2, 0.4, 1.3);
    wheelFR.rotation.z = Math.PI / 2;
    vehicleGroup.add(wheelFR);
    
    // Rear-left wheel
    const wheelRL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelRL.position.set(-1.2, 0.4, -1.3);
    wheelRL.rotation.z = Math.PI / 2;
    vehicleGroup.add(wheelRL);
    
    // Rear-right wheel
    const wheelRR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelRR.position.set(1.2, 0.4, -1.3);
    wheelRR.rotation.z = Math.PI / 2;
    vehicleGroup.add(wheelRR);
    
    // Headlights
    const headlightGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.1);
    const headlightMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5,
      specular: 0xffffff,
      shininess: 100
    });
    
    // Left headlight
    const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightL.position.set(-0.8, 0.7, 2);
    vehicleGroup.add(headlightL);
    
    // Right headlight
    const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightR.position.set(0.8, 0.7, 2);
    vehicleGroup.add(headlightR);
    
    // Add player ID display
    const playerId = this.createPlayerIdDisplay(id);
    playerId.position.set(0, 2.5, 0);
    vehicleGroup.add(playerId);
    
    // Position the vehicle
    if (position) {
      vehicleGroup.position.set(
        position.x || 0,
        position.y || 0,
        position.z || 0
      );
    }
    
    // Set rotation
    if (rotation !== undefined) {
      vehicleGroup.rotation.y = rotation;
    }
    
    // Add to scene
    this.scene.add(vehicleGroup);
    
    // Store player data
    this.players.set(id, {
      id,
      position: position || { x: 0, y: 0, z: 0 },
      rotation: rotation || 0,
      speed: 0,
      lastUpdate: Date.now()
    });
    
    // Store mesh reference
    this.vehicleMeshes.set(id, vehicleGroup);
    
    console.log(`[PLAYER] Added player #${id} to scene`);
  }
  
  /**
   * Create a text display for player ID
   * @param {number} id - Player ID
   * @returns {THREE.Object3D} - Text display object
   */
  createPlayerIdDisplay(id) {
    // Use a simple sprite with canvas as a texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, 128, 64);
    context.fillStyle = 'white';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`ID: ${id}`, 64, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1 // Avoid rendering issues with transparency
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 1, 1);
    
    return sprite;
  }
  
  /**
   * Remove a player from the scene
   * @param {number} id - Player ID to remove
   */
  removePlayer(id) {
    // Get the player mesh
    const vehicleMesh = this.vehicleMeshes.get(id);
    
    if (vehicleMesh) {
      // Remove from scene
      this.scene.remove(vehicleMesh);
      
      // Clean up any animations or event listeners
      vehicleMesh.traverse(child => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      
      // Remove from maps
      this.vehicleMeshes.delete(id);
      this.players.delete(id);
      
      console.log(`[PLAYER] Removed player #${id} from scene`);
    }
  }
  
  /**
   * Update a player's position
   * @param {number} id - Player ID
   * @param {object} position - New position
   * @param {number} rotation - New rotation
   * @param {number} speed - New speed
   */
  updatePlayerPosition(id, position, rotation, speed) {
    // Get player data and mesh
    const player = this.players.get(id);
    const vehicleMesh = this.vehicleMeshes.get(id);
    
    if (!player || !vehicleMesh) {
      // Player doesn't exist, add them
      this.addPlayer(id, position, rotation);
      return;
    }
    
    // Store the previous position for interpolation
    const previousPosition = {
      x: vehicleMesh.position.x,
      y: vehicleMesh.position.y,
      z: vehicleMesh.position.z
    };
    
    // Update player data
    player.position = position;
    player.rotation = rotation;
    player.speed = speed;
    player.lastUpdate = Date.now();
    player.previousPosition = previousPosition;
  }
  
  /**
   * Update player vehicle visuals (called in animation loop)
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
    const now = Date.now();
    
    // Update each player's vehicle
    this.players.forEach((player, id) => {
      const vehicleMesh = this.vehicleMeshes.get(id);
      
      if (!vehicleMesh) return;
      
      // Calculate how much to interpolate (0 to 1)
      const timeSinceUpdate = now - player.lastUpdate;
      const interpolationFactor = Math.min(timeSinceUpdate / 100, 1);
      
      if (player.previousPosition) {
        // Interpolate position for smoother movement
        vehicleMesh.position.x += (player.position.x - vehicleMesh.position.x) * interpolationFactor;
        vehicleMesh.position.y += (player.position.y - vehicleMesh.position.y) * interpolationFactor;
        vehicleMesh.position.z += (player.position.z - vehicleMesh.position.z) * interpolationFactor;
        
        // Interpolate rotation (with shortest path handling)
        let rotationDiff = player.rotation - vehicleMesh.rotation.y;
        
        // Ensure we rotate in the shorter direction
        if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
        if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
        
        vehicleMesh.rotation.y += rotationDiff * interpolationFactor;
      } else {
        // If no previous position, just set directly
        vehicleMesh.position.set(
          player.position.x,
          player.position.y,
          player.position.z
        );
        vehicleMesh.rotation.y = player.rotation;
      }
      
      // Animate wheels based on speed
      vehicleMesh.children.forEach(child => {
        // Check if this is a wheel (cylinders at wheel positions)
        if (
          child.geometry instanceof THREE.CylinderGeometry &&
          child.position.y < 0.5 &&
          Math.abs(child.position.z) > 1
        ) {
          // Rotate the wheel based on speed
          child.rotation.x += player.speed * deltaTime * 0.1;
        }
      });
    });
  }
  
  /**
   * Get the number of players being managed
   * @returns {number} Number of players
   */
  getPlayerCount() {
    return this.players.size;
  }
  
  /**
   * Get player data by ID
   * @param {number} id - Player ID
   * @returns {object|undefined} Player data
   */
  getPlayer(id) {
    return this.players.get(id);
  }
  
  /**
   * Get all player data
   * @returns {Array} Array of player data
   */
  getAllPlayers() {
    return Array.from(this.players.values());
  }
}

export default OtherPlayersManager; 