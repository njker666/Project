/**
 * Urban Drive - Traffic Renderer
 * Renders AI-controlled traffic vehicles received from the server
 */

import * as THREE from 'three';

/**
 * TrafficManager handles rendering of AI-controlled traffic vehicles
 * @class TrafficManager
 */
class TrafficManager {
  /**
   * Create a new TrafficManager
   * @param {THREE.Scene} scene - Three.js scene to render traffic in
   */
  constructor(scene) {
    this.scene = scene;
    this.vehicles = new Map(); // Map of traffic vehicle ID to vehicle data
    this.meshes = new Map(); // Map of traffic vehicle ID to THREE.js mesh

    // Cache geometries and materials for reuse
    this.geometries = {
      car: {
        body: new THREE.BoxGeometry(2, 1, 4),
        roof: new THREE.BoxGeometry(1.8, 0.7, 2),
        wheel: new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16)
      },
      truck: {
        body: new THREE.BoxGeometry(2.5, 1.8, 7),
        wheel: new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16)
      },
      van: {
        body: new THREE.BoxGeometry(2.2, 1.5, 5),
        roof: new THREE.BoxGeometry(2, 0.5, 3),
        wheel: new THREE.CylinderGeometry(0.45, 0.45, 0.35, 16)
      }
    };

    // Materials will be created dynamically based on vehicle color
    this.genericMaterials = {
      wheel: new THREE.MeshPhongMaterial({
        color: 0x222222,
        specular: 0x444444,
        shininess: 30
      }),
      window: new THREE.MeshPhongMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.7,
        specular: 0xffffff,
        shininess: 100
      }),
      headlight: new THREE.MeshPhongMaterial({
        color: 0xffffcc,
        emissive: 0xffffcc,
        emissiveIntensity: 0.5,
        specular: 0xffffff,
        shininess: 100
      })
    };

    console.log('[TRAFFIC] Traffic renderer initialized');
  }

  /**
   * Update traffic vehicles based on server data
   * @param {Array} vehicleData - Array of traffic vehicle data from server
   */
  updateVehicles(vehicleData) {
    if (!vehicleData || !Array.isArray(vehicleData)) return;

    // Create a set of current vehicle IDs
    const currentVehicleIds = new Set(vehicleData.map(vehicle => vehicle.id));

    // Remove vehicles that are no longer in the data
    this.vehicles.forEach((vehicle, id) => {
      if (!currentVehicleIds.has(id)) {
        this.removeVehicle(id);
      }
    });

    // Update or add vehicles from the data
    vehicleData.forEach(vehicle => {
      if (this.vehicles.has(vehicle.id)) {
        // Update existing vehicle
        this.updateVehiclePosition(vehicle);
      } else {
        // Add new vehicle
        this.addVehicle(vehicle);
      }
    });
  }

  /**
   * Add a new traffic vehicle
   * @param {object} vehicleData - Vehicle data from server
   */
  addVehicle(vehicleData) {
    // Skip if vehicle already exists
    if (this.vehicles.has(vehicleData.id)) return;

    // Create vehicle mesh based on type
    const vehicleMesh = this.createVehicleMesh(vehicleData);

    // Position and rotate the vehicle
    if (vehicleData.position) {
      vehicleMesh.position.set(
        vehicleData.position.x || 0,
        vehicleData.position.y || 0.5,
        vehicleData.position.z || 0
      );
    }

    if (vehicleData.rotation !== undefined) {
      // Apply the base rotation from server plus 90 degrees to correctly orient the vehicle
      vehicleMesh.rotation.y = vehicleData.rotation;
    }

    // Add to scene
    this.scene.add(vehicleMesh);

    // Store vehicle data
    this.vehicles.set(vehicleData.id, {
      ...vehicleData,
      lastUpdate: Date.now()
    });

    // Store mesh reference
    this.meshes.set(vehicleData.id, vehicleMesh);
  }

  /**
   * Create a vehicle mesh based on vehicle type
   * @param {object} vehicleData - Vehicle data from server
   * @returns {THREE.Group} - Vehicle mesh group
   */
  createVehicleMesh(vehicleData) {
    const vehicleGroup = new THREE.Group();
    
    // Choose color from vehicle data with a fallback
    const color = vehicleData.color || 0xaaaaaa;
    
    // Create material with the vehicle's color
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: color,
      specular: 0x555555,
      shininess: 30
    });

    // Different mesh based on vehicle type
    switch (vehicleData.type) {
      case 'truck':
        this.createTruckMesh(vehicleGroup, bodyMaterial);
        break;
      case 'van':
        this.createVanMesh(vehicleGroup, bodyMaterial);
        break;
      case 'car':
      default:
        this.createCarMesh(vehicleGroup, bodyMaterial);
        break;
    }
    
    // Rotate the vehicle 90 degrees (π/2) to align the model with the movement direction
    // This is needed because our vehicle models are built facing +Z axis
    // but in our coordinate system, 0 rotation means facing +X
    vehicleGroup.rotation.y = -Math.PI / 2;

    return vehicleGroup;
  }

  /**
   * Create a car mesh
   * @param {THREE.Group} group - Group to add car parts to
   * @param {THREE.Material} bodyMaterial - Material for car body
   */
  createCarMesh(group, bodyMaterial) {
    // Car body
    const bodyMesh = new THREE.Mesh(this.geometries.car.body, bodyMaterial);
    bodyMesh.position.y = 0.5;
    group.add(bodyMesh);

    // Car roof
    const roofMesh = new THREE.Mesh(this.geometries.car.roof, new THREE.MeshPhongMaterial({
      color: 0x333333,
      specular: 0x111111,
      shininess: 10
    }));
    roofMesh.position.set(0, 1.1, -0.2);
    group.add(roofMesh);

    // Car windows
    const frontWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.7),
      this.genericMaterials.window
    );
    frontWindow.position.set(0, 1.1, 0.9);
    frontWindow.rotation.x = Math.PI * 0.1;
    group.add(frontWindow);

    // Wheels
    this.addWheels(group, 'car');

    // Headlights
    this.addHeadlights(group, 'car');
  }

  /**
   * Create a truck mesh
   * @param {THREE.Group} group - Group to add truck parts to
   * @param {THREE.Material} bodyMaterial - Material for truck body
   */
  createTruckMesh(group, bodyMaterial) {
    // Truck main body (cargo area)
    const bodyMesh = new THREE.Mesh(this.geometries.truck.body, bodyMaterial);
    bodyMesh.position.y = 0.9;
    bodyMesh.position.z = -0.5; // Move back to make room for cabin
    group.add(bodyMesh);

    // Truck cabin
    const cabinGeometry = new THREE.BoxGeometry(2.5, 1.5, 2);
    const cabinMesh = new THREE.Mesh(cabinGeometry, bodyMaterial);
    cabinMesh.position.set(0, 0.75, 2.5);
    group.add(cabinMesh);

    // Cabin window
    const windowGeometry = new THREE.PlaneGeometry(2.2, 0.8);
    const windowMesh = new THREE.Mesh(windowGeometry, this.genericMaterials.window);
    windowMesh.position.set(0, 1.2, 3.5);
    group.add(windowMesh);

    // Wheels
    this.addWheels(group, 'truck');

    // Headlights
    this.addHeadlights(group, 'truck');
  }

  /**
   * Create a van mesh
   * @param {THREE.Group} group - Group to add van parts to
   * @param {THREE.Material} bodyMaterial - Material for van body
   */
  createVanMesh(group, bodyMaterial) {
    // Van body
    const bodyMesh = new THREE.Mesh(this.geometries.van.body, bodyMaterial);
    bodyMesh.position.y = 0.75;
    group.add(bodyMesh);

    // Van roof
    const roofMesh = new THREE.Mesh(this.geometries.van.roof, new THREE.MeshPhongMaterial({
      color: 0x444444,
      specular: 0x111111,
      shininess: 10
    }));
    roofMesh.position.set(0, 1.65, -0.5);
    group.add(roofMesh);

    // Van windows
    const frontWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 0.8),
      this.genericMaterials.window
    );
    frontWindow.position.set(0, 1.2, 2.4);
    frontWindow.rotation.x = Math.PI * 0.05;
    group.add(frontWindow);

    // Side windows
    const sideWindowL = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.6),
      this.genericMaterials.window
    );
    sideWindowL.position.set(-1.1, 1.2, 1.5);
    sideWindowL.rotation.y = Math.PI * 0.5;
    group.add(sideWindowL);

    const sideWindowR = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.6),
      this.genericMaterials.window
    );
    sideWindowR.position.set(1.1, 1.2, 1.5);
    sideWindowR.rotation.y = -Math.PI * 0.5;
    group.add(sideWindowR);

    // Wheels
    this.addWheels(group, 'van');

    // Headlights
    this.addHeadlights(group, 'van');
  }

  /**
   * Add wheels to a vehicle
   * @param {THREE.Group} group - Group to add wheels to
   * @param {string} type - Vehicle type
   */
  addWheels(group, type) {
    const wheelGeometry = this.geometries[type].wheel;
    const wheelMaterial = this.genericMaterials.wheel;
    
    let wheelPositions;
    
    switch (type) {
      case 'truck':
        wheelPositions = [
          { x: -1.25, y: 0.5, z: 3 },     // Front left
          { x: 1.25, y: 0.5, z: 3 },      // Front right
          { x: -1.25, y: 0.5, z: -2.5 },  // Rear left
          { x: 1.25, y: 0.5, z: -2.5 },   // Rear right
          { x: -1.25, y: 0.5, z: -0.5 },  // Middle left
          { x: 1.25, y: 0.5, z: -0.5 }    // Middle right
        ];
        break;
      case 'van':
        wheelPositions = [
          { x: -1.1, y: 0.45, z: 1.8 },   // Front left
          { x: 1.1, y: 0.45, z: 1.8 },    // Front right
          { x: -1.1, y: 0.45, z: -1.5 },  // Rear left
          { x: 1.1, y: 0.45, z: -1.5 }    // Rear right
        ];
        break;
      case 'car':
      default:
        wheelPositions = [
          { x: -1, y: 0.4, z: 1.3 },     // Front left
          { x: 1, y: 0.4, z: 1.3 },      // Front right
          { x: -1, y: 0.4, z: -1.3 },    // Rear left
          { x: 1, y: 0.4, z: -1.3 }      // Rear right
        ];
        break;
    }
    
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.rotation.z = Math.PI / 2;
      group.add(wheel);
    });
  }

  /**
   * Add headlights to a vehicle
   * @param {THREE.Group} group - Group to add headlights to
   * @param {string} type - Vehicle type
   */
  addHeadlights(group, type) {
    const headlightMaterial = this.genericMaterials.headlight;
    let headlightPositions;
    let headlightSize;
    
    switch (type) {
      case 'truck':
        headlightPositions = [
          { x: -1, y: 0.8, z: 3.5 },
          { x: 1, y: 0.8, z: 3.5 }
        ];
        headlightSize = { width: 0.5, height: 0.3, depth: 0.1 };
        break;
      case 'van':
        headlightPositions = [
          { x: -0.9, y: 0.7, z: 2.5 },
          { x: 0.9, y: 0.7, z: 2.5 }
        ];
        headlightSize = { width: 0.45, height: 0.25, depth: 0.1 };
        break;
      case 'car':
      default:
        headlightPositions = [
          { x: -0.8, y: 0.6, z: 2 },
          { x: 0.8, y: 0.6, z: 2 }
        ];
        headlightSize = { width: 0.4, height: 0.2, depth: 0.1 };
        break;
    }
    
    const headlightGeometry = new THREE.BoxGeometry(
      headlightSize.width,
      headlightSize.height,
      headlightSize.depth
    );
    
    headlightPositions.forEach(pos => {
      const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
      headlight.position.set(pos.x, pos.y, pos.z);
      group.add(headlight);
    });
  }

  /**
   * Update a traffic vehicle's position
   * @param {object} vehicleData - Updated vehicle data
   */
  updateVehiclePosition(vehicleData) {
    // Get the vehicle mesh
    const vehicleMesh = this.meshes.get(vehicleData.id);
    const vehicle = this.vehicles.get(vehicleData.id);
    
    if (!vehicleMesh || !vehicle) return;
    
    // Store the previous position and rotation for interpolation
    vehicle.prevPosition = { ...vehicle.position };
    vehicle.prevRotation = vehicle.rotation;
    
    // Update vehicle data
    vehicle.position = vehicleData.position;
    vehicle.rotation = vehicleData.rotation;
    vehicle.state = vehicleData.state;
    vehicle.lastUpdate = Date.now();
    
    // Immediate update for stopped vehicles
    if (vehicle.state === 'stopped') {
      vehicleMesh.position.set(
        vehicle.position.x,
        vehicle.position.y,
        vehicle.position.z
      );
      vehicleMesh.rotation.y = vehicle.rotation;
    }
  }

  /**
   * Remove a traffic vehicle
   * @param {number} id - Vehicle ID to remove
   */
  removeVehicle(id) {
    // Get the vehicle mesh
    const vehicleMesh = this.meshes.get(id);
    
    if (vehicleMesh) {
      // Remove from scene
      this.scene.remove(vehicleMesh);
      
      // Clean up resources
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
    }
    
    // Remove from maps
    this.vehicles.delete(id);
    this.meshes.delete(id);
  }

  /**
   * Update traffic vehicle positions with interpolation
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    const now = Date.now();
    
    this.vehicles.forEach((vehicle, id) => {
      const vehicleMesh = this.meshes.get(id);
      
      if (!vehicleMesh) return;
      
      // Skip if in stopped state
      if (vehicle.state === 'stopped') return;
      
      // Skip if no previous position is available
      if (!vehicle.prevPosition) return;
      
      // Calculate interpolation factor (0 to 1) over 100ms
      const interpolationDuration = 100; // ms
      const timeSinceUpdate = now - vehicle.lastUpdate;
      const alpha = Math.min(timeSinceUpdate / interpolationDuration, 1);
      
      // Interpolate position
      vehicleMesh.position.set(
        vehicle.prevPosition.x + (vehicle.position.x - vehicle.prevPosition.x) * alpha,
        vehicle.prevPosition.y + (vehicle.position.y - vehicle.prevPosition.y) * alpha,
        vehicle.prevPosition.z + (vehicle.position.z - vehicle.prevPosition.z) * alpha
      );
      
      // Interpolate rotation (choose shortest path)
      let rotationDiff = vehicle.rotation - vehicle.prevRotation;
      
      // Ensure we rotate the shortest way
      if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      vehicleMesh.rotation.y = vehicle.prevRotation + rotationDiff * alpha;
      
      // If we've reached the target, reset the previous values
      if (alpha === 1) {
        vehicle.prevPosition = null;
        vehicle.prevRotation = null;
      }
    });
  }
  
  /**
   * Get the current traffic vehicle count
   * @returns {number} - Number of traffic vehicles
   */
  getVehicleCount() {
    return this.vehicles.size;
  }
  
  /**
   * Clean up all resources
   */
  dispose() {
    // Remove all vehicles
    this.vehicles.forEach((vehicle, id) => {
      this.removeVehicle(id);
    });
    
    // Clear cached geometries
    Object.values(this.geometries).forEach(typeGeometries => {
      Object.values(typeGeometries).forEach(geometry => {
        geometry.dispose();
      });
    });
    
    // Clear cached materials
    Object.values(this.genericMaterials).forEach(material => {
      material.dispose();
    });
    
    this.vehicles.clear();
    this.meshes.clear();
  }
}

export default TrafficManager; 