/**
 * Urban Drive - Collision Manager
 * Manages collision detection and response between the vehicle and city objects
 */

import * as THREE from 'three';

class CollisionManager {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.lastCollisionTime = 0;
    this.collisionCooldown = 500; // ms between collision effect triggers
    this.debugMode = false; // Set to true to visualize collision boxes
    
    // Create collision effects container
    this.collisionEffects = new THREE.Group();
    this.scene.add(this.collisionEffects);
  }
  
  // Set buildings data for collision detection
  setBuildingData(buildingData) {
    this.buildings = buildingData;
    
    if (this.debugMode) {
      this._createDebugVisualizations();
    }
    
    console.log(`Collision manager initialized with ${this.buildings.length} buildings`);
  }
  
  // Check for collisions with the vehicle
  checkCollisions(vehicle) {
    if (!vehicle || !this.buildings.length) return null;
    
    // Create a box representing the vehicle
    const vehicleWidth = 2; // Width of the vehicle
    const vehicleHeight = 1; // Height of the vehicle
    const vehicleDepth = 4; // Depth of the vehicle
    
    // Use slightly smaller dimensions for more forgiving collisions
    const margin = 0.2;
    const vehicleBox = new THREE.Box3().setFromCenterAndSize(
      vehicle.state.position,
      new THREE.Vector3(vehicleWidth - margin, vehicleHeight - margin, vehicleDepth - margin)
    );
    
    // Check for collisions with each building
    for (const building of this.buildings) {
      // Create building box
      const buildingBox = new THREE.Box3().setFromCenterAndSize(
        building.position,
        building.dimensions
      );
      
      // Check for intersection
      if (vehicleBox.intersectsBox(buildingBox)) {
        return this._handleCollision(vehicle, building, buildingBox, vehicleBox);
      }
    }
    
    return null;
  }
  
  // Handle a collision between the vehicle and a building
  _handleCollision(vehicle, building, buildingBox, vehicleBox) {
    // Calculate collision normal and penetration depth
    const vehicleCenter = vehicle.state.position;
    const buildingCenter = building.position;
    
    // Vector from building to vehicle
    const collisionNormal = new THREE.Vector3().subVectors(vehicleCenter, buildingCenter).normalize();
    
    // Calculate overlap in each dimension
    const vehicleMin = vehicleBox.min;
    const vehicleMax = vehicleBox.max;
    const buildingMin = buildingBox.min;
    const buildingMax = buildingBox.max;
    
    // Calculate overlap on each axis
    const overlapX = Math.min(vehicleMax.x - buildingMin.x, buildingMax.x - vehicleMin.x);
    const overlapZ = Math.min(vehicleMax.z - buildingMin.z, buildingMax.z - vehicleMin.z);
    
    // Determine which axis has the smallest overlap (that's our collision normal)
    let axis, amount;
    if (overlapX < overlapZ) {
      axis = 'x';
      amount = overlapX;
      // Figure out the direction
      if (vehicleCenter.x < buildingCenter.x) {
        collisionNormal.set(-1, 0, 0);
      } else {
        collisionNormal.set(1, 0, 0);
      }
    } else {
      axis = 'z';
      amount = overlapZ;
      // Figure out the direction
      if (vehicleCenter.z < buildingCenter.z) {
        collisionNormal.set(0, 0, -1);
      } else {
        collisionNormal.set(0, 0, 1);
      }
    }
    
    // Create collision info object
    const collision = {
      building: building,
      normal: collisionNormal,
      magnitude: Math.abs(vehicle.state.speed),
      position: new THREE.Vector3(
        axis === 'x' ? (collisionNormal.x < 0 ? vehicleMax.x : vehicleMin.x) : vehicleCenter.x,
        vehicleCenter.y,
        axis === 'z' ? (collisionNormal.z < 0 ? vehicleMax.z : vehicleMin.z) : vehicleCenter.z
      ),
      penetration: amount
    };
    
    // Create visual feedback if enough time has passed since last collision
    const now = performance.now();
    if (now - this.lastCollisionTime > this.collisionCooldown) {
      this._createCollisionEffect(collision);
      this.lastCollisionTime = now;
    }
    
    return collision;
  }
  
  // Create visual effect for collision
  _createCollisionEffect(collision) {
    // Create particle burst at collision point
    // Increase base particle count for more dramatic effect
    const particleCount = Math.min(20 + Math.floor(collision.magnitude / 3), 40);
    
    // Create a spark/debris burst effect
    for (let i = 0; i < particleCount; i++) {
      // More varied particle sizes based on collision magnitude
      const size = 0.05 + Math.random() * 0.15 + (collision.magnitude / 100);
      const geometry = new THREE.BoxGeometry(size, size, size);
      
      // Choose particle color based on collision magnitude and randomness
      let particleColor;
      if (Math.random() > 0.7) {
        // Some sparks (yellow/orange)
        particleColor = new THREE.Color(
          0.9 + Math.random() * 0.1, 
          0.6 + Math.random() * 0.4, 
          Math.random() * 0.3
        );
      } else if (collision.magnitude > 50 && Math.random() > 0.6) {
        // Some fire particles for high-speed impacts
        particleColor = new THREE.Color(
          0.9 + Math.random() * 0.1, 
          0.2 + Math.random() * 0.3, 
          Math.random() * 0.1
        );
      } else {
        // Default debris (white/gray with slight variation)
        const shade = 0.7 + Math.random() * 0.3;
        particleColor = new THREE.Color(shade, shade, shade);
      }
      
      const material = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: 0.9
      });
      
      const particle = new THREE.Mesh(geometry, material);
      
      // Position at collision point with more random offset for bigger explosions
      const posOffset = collision.magnitude > 60 ? 0.8 : 0.5;
      particle.position.copy(collision.position).add(
        new THREE.Vector3(
          (Math.random() - 0.5) * posOffset,
          Math.random() * 0.5,
          (Math.random() - 0.5) * posOffset
        )
      );
      
      // Add velocity based on collision normal with more energy for bigger impacts
      const speedFactor = 0.1 + Math.min(collision.magnitude / 100, 0.5);
      const velocity = collision.normal.clone()
        .multiplyScalar(speedFactor + Math.random() * 0.3)
        .add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          0.2 + Math.random() * 0.3, // More upward bounce
          (Math.random() - 0.5) * 0.2
        ));
      
      particle.userData.velocity = velocity;
      
      // Higher speed collisions have longer-lasting particles
      const lifetimeFactor = 1 + Math.min(collision.magnitude / 40, 2);
      particle.userData.lifetime = lifetimeFactor + Math.random(); // 1-3 seconds based on impact
      particle.userData.age = 0;
      
      // Add a bit of rotation to the particles
      particle.userData.rotationAxis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      
      particle.userData.rotationSpeed = Math.random() * 5;
      
      this.collisionEffects.add(particle);
    }
    
    // Add a dust cloud effect for ground impacts
    if (collision.magnitude > 20) {
      const dustCount = Math.min(10 + Math.floor(collision.magnitude / 5), 20);
      
      for (let i = 0; i < dustCount; i++) {
        const size = 0.3 + Math.random() * 0.7; // Larger, cloud-like particles
        const geometry = new THREE.PlaneGeometry(size, size);
        
        // Dust color (light gray/tan)
        const dustColor = Math.random() > 0.5 ? 0xdddddd : 0xd0c8b0;
        
        const material = new THREE.MeshBasicMaterial({
          color: dustColor,
          transparent: true,
          opacity: 0.3 + Math.random() * 0.2,
          side: THREE.DoubleSide
        });
        
        const dust = new THREE.Mesh(geometry, material);
        
        // Position dust near the ground around the collision point
        dust.position.copy(collision.position).add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            0.1 + Math.random() * 0.3,
            (Math.random() - 0.5) * 2
          )
        );
        
        // Face the dust particles toward the camera approximately
        dust.rotation.set(
          -Math.PI / 2 + (Math.random() - 0.5) * 0.5,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        );
        
        // Slower outward drift for dust
        dust.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          0.05 + Math.random() * 0.1,
          (Math.random() - 0.5) * 0.2
        );
        
        dust.userData.lifetime = 1.5 + Math.random() * 1.5; // 1.5-3 seconds
        dust.userData.age = 0;
        dust.userData.growFactor = 1.2 + Math.random() * 0.8; // Dust clouds expand over time
        
        this.collisionEffects.add(dust);
      }
    }
    
    // Play sound here if audio implemented
  }
  
  // Update collision effects (particles, etc.)
  update(deltaTime) {
    // Convert deltaTime to seconds
    const dt = deltaTime / 1000;
    
    // Update particle effects
    const removeParticles = [];
    
    this.collisionEffects.children.forEach(particle => {
      if (particle.userData.age !== undefined) {
        // Update position based on velocity
        particle.position.add(particle.userData.velocity.clone().multiplyScalar(dt));
        
        // Add gravity effect - more for debris, less for dust
        const gravity = particle.geometry.type === 'PlaneGeometry' ? 0.3 : 1.2;
        particle.userData.velocity.y -= gravity * dt;
        
        // Apply some drag to slow particles over time
        particle.userData.velocity.multiplyScalar(0.98);
        
        // Age the particle
        particle.userData.age += dt;
        
        // Handle particle rotation if it has a rotation axis
        if (particle.userData.rotationAxis && particle.userData.rotationSpeed) {
          particle.rotateOnAxis(
            particle.userData.rotationAxis,
            particle.userData.rotationSpeed * dt
          );
        }
        
        // Handle dust cloud growth
        if (particle.userData.growFactor) {
          particle.scale.multiplyScalar(1 + (0.2 * dt * particle.userData.growFactor));
        }
        
        // Fade out based on age
        const lifeRatio = particle.userData.age / particle.userData.lifetime;
        
        // Fade out dust more quickly at the end of its life
        if (particle.geometry.type === 'PlaneGeometry') {
          // Dust particles
          if (lifeRatio > 0.7) {
            particle.material.opacity = 0.5 * (1.0 - (lifeRatio - 0.7) / 0.3);
          }
        } else {
          // Regular debris particles
          particle.material.opacity = 0.9 * (1 - lifeRatio);
        }
        
        // Mark for removal if expired
        if (particle.userData.age >= particle.userData.lifetime) {
          removeParticles.push(particle);
        }
      }
    });
    
    // Remove expired particles
    removeParticles.forEach(particle => {
      this.collisionEffects.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
    });
  }
  
  // Create debug visualizations of collision boxes
  _createDebugVisualizations() {
    if (!this.debugMode) return;
    
    // Create a debug visualization group
    this.debugGroup = new THREE.Group();
    this.scene.add(this.debugGroup);
    
    // Create wireframe boxes for each building collision box
    const boxMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    
    this.buildings.forEach(building => {
      const boxGeometry = new THREE.BoxGeometry(
        building.dimensions.x,
        building.dimensions.y,
        building.dimensions.z
      );
      
      // Convert BoxGeometry to wireframe
      const wireframe = new THREE.EdgesGeometry(boxGeometry);
      const wireframeMesh = new THREE.LineSegments(wireframe, boxMaterial);
      
      wireframeMesh.position.copy(building.position);
      this.debugGroup.add(wireframeMesh);
    });
    
    console.log('Created debug visualizations for collision boxes');
  }
  
  // Enable or disable debug mode
  setDebugMode(enabled) {
    this.debugMode = enabled;
    
    if (enabled && this.buildings.length && !this.debugGroup) {
      this._createDebugVisualizations();
    } else if (!enabled && this.debugGroup) {
      this.scene.remove(this.debugGroup);
      this.debugGroup = null;
    }
  }
}

export default CollisionManager; 