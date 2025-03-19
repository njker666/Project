/**
 * Urban Drive - Vehicle Physics
 * Implements vehicle physics using Oimo.js
 */

import * as THREE from 'three';
import OIMO from 'oimo';

class Vehicle {
  constructor(scene, initialPosition) {
    // Store the scene for adding meshes
    this.scene = scene;
    
    // Fixed height for the car
    this.fixedHeight = 0.5; // Height above ground
    
    // Logging timers
    this.lastLogTime = 0;
    this.lastForceLog = 0;
    this.lastSpeedLog = 0;
    
    // Vehicle physics parameters
    this.params = {
      mass: 1000,               // Vehicle mass in kg
      maxSpeed: 100,            // Max speed in km/h (reduced from 120)
      acceleration: 15,         // Base acceleration rate (increased from 10)
      braking: 20,              // Braking rate
      reverseSpeed: 40,         // Max reverse speed in km/h
      steeringAngle: Math.PI/4, // Maximum steering angle in radians
      steeringSpeed: 4,         // Speed of steering rotation
      friction: 0.7,            // Ground friction
      handbrakeForce: 30,       // Force applied when handbrake is used
      rotationDamping: 0.9,     // Rotation damping factor
      collisionRestitution: 0.4 // Bounciness of collisions (0-1)
    };
    
    // Vehicle state
    this.state = {
      speed: 0,                // Current speed
      rotation: 0,             // Current rotation in radians
      position: initialPosition || new THREE.Vector3(0, this.fixedHeight, 0), // Use provided position or default
      angularVelocity: 0,      // Angular velocity for steering
      isColliding: false,      // Whether the vehicle is currently colliding
      lastCollision: null      // Information about the last collision
    };
    
    // Client-side prediction and reconciliation properties
    this.inputHistory = [];    // History of inputs for reconciliation
    this.historyMaxSize = 100; // Maximum number of inputs to store
    this.lastProcessedServerState = null; // Last state acknowledged by the server
    this.pendingInputs = [];   // Inputs not yet acknowledged by the server
    this.sequence = 0;         // Sequence number for tracking inputs
    
    // Ensure Y position is at fixed height
    this.state.position.y = this.fixedHeight;
    
    // Create the vehicle mesh
    this._createVehicleMesh();
    
    // Initialize Oimo.js physics
    this._initPhysics();
    
    console.log('Vehicle initialized at position', this.state.position);
  }
  
  // Create the vehicle mesh with a simple box shape with rounded edges
  _createVehicleMesh() {
    // Create a group to hold all vehicle parts
    this.vehicleGroup = new THREE.Group();
    
    // Create the main body - slightly rounded box
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4).toNonIndexed();
    
    // Get positions and move vertices to create rounded corners
    const positions = bodyGeometry.attributes.position;
    const vector = new THREE.Vector3();
    const amount = 0.15; // Amount of rounding
    
    // Round the corners by adjusting vertex positions
    for (let i = 0; i < positions.count; i++) {
      vector.fromBufferAttribute(positions, i);
      
      // Normalize the position to get direction from center
      vector.normalize();
      
      // Move vertices slightly inward to create rounded corners
      positions.setXYZ(
        i,
        positions.getX(i) - vector.x * amount,
        positions.getY(i) - vector.y * amount,
        positions.getZ(i) - vector.z * amount
      );
    }
    
    // Calculate normals for proper lighting
    bodyGeometry.computeVertexNormals();
    
    // Create material with color and shininess
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2980b9, // Blue color
      metalness: 0.6,
      roughness: 0.4
    });
    
    // Create the body mesh
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.vehicleGroup.add(this.bodyMesh);
    
    // Create wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    wheelGeometry.rotateZ(Math.PI/2); // Rotate to align with vehicle
    
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111, // Dark grey/black
      metalness: 0.5,
      roughness: 0.7
    });
    
    // Create four wheels and position them at the corners
    this.wheels = [];
    this.frontWheels = [];
    this.rearWheels = [];
    
    const wheelPositions = [
      {x: -0.9, y: -0.3, z: 1.2, front: true},  // Front left
      {x: 0.9, y: -0.3, z: 1.2, front: true},   // Front right
      {x: -0.9, y: -0.3, z: -1.2, front: false}, // Rear left
      {x: 0.9, y: -0.3, z: -1.2, front: false}   // Rear right
    ];
    
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      
      if (pos.front) {
        // Create wheel groups for front wheels to allow steering rotation
        const wheelGroup = new THREE.Group();
        wheelGroup.position.set(pos.x, pos.y, pos.z);
        wheelGroup.add(wheel);
        wheel.position.set(0, 0, 0); // Reset wheel position relative to group
        this.vehicleGroup.add(wheelGroup);
        this.frontWheels.push(wheelGroup);
      } else {
        this.vehicleGroup.add(wheel);
        this.rearWheels.push(wheel);
      }
      
      this.wheels.push(wheel);
    });
    
    // Add windshield - simple semi-transparent blue plane
    const windshieldGeometry = new THREE.PlaneGeometry(1.6, 0.7);
    const windshieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x84c3eb,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0, 0.35, 0.6);
    windshield.rotation.x = Math.PI/2.5;
    this.vehicleGroup.add(windshield);
    
    // Add headlights
    const headlightGeometry = new THREE.CircleGeometry(0.15, 16);
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5
    });
    
    const headlightPositions = [
      {x: -0.7, y: 0, z: 1.9}, // Left
      {x: 0.7, y: 0, z: 1.9}   // Right
    ];
    
    headlightPositions.forEach(pos => {
      const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
      headlight.position.set(pos.x, pos.y, pos.z);
      headlight.rotation.y = Math.PI;
      this.vehicleGroup.add(headlight);
    });
    
    // Position the vehicle and add it to the scene
    this.vehicleGroup.position.copy(this.state.position);
    this.scene.add(this.vehicleGroup);
  }
  
  // Initialize Oimo.js physics
  _initPhysics() {
    try {
      // Create world
      this.world = new OIMO.World({
        timestep: 1/60,
        iterations: 8,
        broadphase: 2, // SAP
        worldscale: 1,
        random: true,
        info: false,
        gravity: [0, -9.8, 0]
      });
      
      // Create ground
      this.ground = this.world.add({
        type: 'box', // Use primitive type
        size: [1000, 1, 1000],
        pos: [0, -0.5, 0],
        rot: [0, 0, 0],
        move: false,
        density: 1,
        friction: this.params.friction,
        restitution: 0.1,
        belongsTo: 1,
        collidesWith: 0xffffffff
      });
      
      // Create vehicle body - using a kinematic body that follows our manual positioning
      this.body = this.world.add({
        type: 'box', // Use primitive type
        size: [2, 1, 4],
        pos: [this.state.position.x, this.fixedHeight, this.state.position.z],
        rot: [0, this.state.rotation, 0],
        move: true,
        kinematic: true, // Make it kinematic so we can manually position it
        density: this.params.mass / 8, // Approx volume of the box
        friction: 0.5,
        restitution: 0.2,
        belongsTo: 2,
        collidesWith: 0xffffffff
      });
      
      // Completely restrict vertical movement for maximum stability
      this.body.setupMass({
        type: 1, // Mass distribution type
        linearFactor: [1, 0, 1], // No Y movement at all
        angularFactor: [0, 1, 0]  // Only allow rotation around Y axis (steering)
      });
      
      // Add damping to make movement more responsive
      this.body.linearDamping = 0.5;
      this.body.angularDamping = 0.5;
      
      console.log('Physics initialized');
    } catch (error) {
      console.error('Error initializing physics:', error);
      // Create a fallback minimal physics setup if the full setup fails
      this.world = null;
      this.ground = null;
      this.body = null;
    }
  }
  
  // Update vehicle position and rotation based on controls
  update(controls, deltaTime, collision = null) {
    if (!controls || !deltaTime) return;
    
    // Debug log the controls received
    console.log('Vehicle update with controls:', controls);
    
    // Convert delta time to seconds
    const dt = deltaTime / 1000;
    
    // Create an input object to track for prediction and reconciliation
    const input = {
      sequence: this.sequence++,
      controls: { 
        // Support both control formats - original and normalized
        up: controls.up === true,
        down: controls.down === true,
        left: controls.left === true,
        right: controls.right === true,
        space: controls.space === true,
        // Also include normalized controls
        accelerate: controls.up === true,
        brake: controls.down === true,
        turnLeft: controls.left === true,
        turnRight: controls.right === true,
        handbrake: controls.space === true
      },
      deltaTime: dt,
      timestamp: Date.now(),
      collision: collision ? { ...collision } : null
    };
    
    // Log what we're processing
    console.log('Processing input:', input.controls);
    
    // Save input to history
    this.inputHistory.push(input);
    
    // Limit history size
    if (this.inputHistory.length > this.historyMaxSize) {
      this.inputHistory.shift();
    }
    
    // Add input to pending inputs awaiting server confirmation
    this.pendingInputs.push(input);
    
    // Process the input immediately for client-side prediction
    this._processInput(input);
    
    // After processing, log the current state
    console.log('After processing input - position:', this.state.position, 'speed:', this.state.speed, 'rotation:', this.state.rotation);
  }
  
  // Process a single input to update vehicle state
  _processInput(input) {
    const controls = input.controls;
    const dt = input.deltaTime;
    const collision = input.collision;
    
    // Handle collision if one occurred
    if (collision) {
      this._handleCollision(collision, dt);
    } else {
      this.state.isColliding = false;
    }
    
    // Update visual effects (bouncing, etc.)
    this._updateVisualEffects(dt);
    
    // Handle acceleration and braking
    if (controls.accelerate || controls.up) {
      // Calculate a non-linear acceleration factor - higher at low speeds, lower at high speeds
      const currentSpeedRatio = Math.abs(this.state.speed) / this.params.maxSpeed;
      const accelerationFactor = 1 - (currentSpeedRatio * 0.7); // Decreases acceleration as speed increases
      
      // Apply non-linear acceleration
      this.state.speed += this.params.acceleration * accelerationFactor * dt;
      
      // Limit to max speed
      if (this.state.speed > this.params.maxSpeed) {
        this.state.speed = this.params.maxSpeed;
      }
    } else if (controls.brake || controls.down) {
      // Brake if moving forward
      if (this.state.speed > 0) {
        this.state.speed -= this.params.braking * dt;
        
        // Stop completely if speed is very low
        if (this.state.speed < 0.1) {
          this.state.speed = 0;
        }
      } else {
        // Reverse with non-linear acceleration
        const currentSpeedRatio = Math.abs(this.state.speed) / this.params.reverseSpeed;
        const accelerationFactor = 1 - (currentSpeedRatio * 0.5); // Decreases acceleration as reverse speed increases
        
        // Apply non-linear acceleration for reverse
        this.state.speed -= this.params.acceleration * accelerationFactor * dt;
        
        // Limit reverse speed
        if (this.state.speed < -this.params.reverseSpeed) {
          this.state.speed = -this.params.reverseSpeed;
        }
      }
    } else {
      // Apply natural friction when no input
      if (Math.abs(this.state.speed) > 0.1) {
        const frictionForce = this.params.friction * dt * 5;
        this.state.speed *= (1 - frictionForce);
      } else {
        this.state.speed = 0;
      }
    }
    
    // Handle steering
    const minSpeedForSteering = 0.1;
    let steeringAngle = 0;
    
    if (Math.abs(this.state.speed) > minSpeedForSteering) {
      // Calculate steering factor based on speed (less effective at high speeds)
      const speedFactor = 1 - (Math.min(Math.abs(this.state.speed), this.params.maxSpeed) / this.params.maxSpeed) * 0.3;
      
      if (controls.turnLeft || controls.left) {
        this.state.angularVelocity = this.params.steeringSpeed * speedFactor;
        steeringAngle = Math.PI / 6; // +30 degrees wheel rotation for LEFT turn
      } else if (controls.turnRight || controls.right) {
        this.state.angularVelocity = -this.params.steeringSpeed * speedFactor;
        steeringAngle = -Math.PI / 6; // -30 degrees wheel rotation for RIGHT turn
      } else {
        // Gradually return to straight when no steering input
        this.state.angularVelocity *= 0.95;
        if (Math.abs(this.state.angularVelocity) < 0.01) {
          this.state.angularVelocity = 0;
        }
      }
      
      // Apply steering limits
      const maxAngularVelocity = this.params.steeringAngle * speedFactor;
      this.state.angularVelocity = Math.max(-maxAngularVelocity, Math.min(maxAngularVelocity, this.state.angularVelocity));
    } else {
      // No steering at very low speeds
      this.state.angularVelocity = 0;
    }
    
    // Update position and rotation
    const turnRate = this.state.angularVelocity * dt;
    
    // Calculate forward direction based on current rotation
    const forwardDirection = new THREE.Vector3(
      Math.sin(this.state.rotation),
      0,
      Math.cos(this.state.rotation)
    );
    
    // Update position based on forward direction and speed
    const positionDelta = forwardDirection.clone().multiplyScalar(this.state.speed * dt);
    this.state.position.add(positionDelta);
    
    // Update rotation - ONLY around Y axis
    this.state.rotation += turnRate;
    
    // Update the vehicle mesh position and rotation
    this.vehicleGroup.position.copy(this.state.position);
    
    // Create a new quaternion from Euler rotation that ONLY rotates around Y axis
    const rotation = new THREE.Euler(0, this.state.rotation, 0);
    this.vehicleGroup.quaternion.setFromEuler(rotation);
    
    // Update the physics body to match our simplified movement if it exists
    if (this.body) {
      try {
        this.body.position.set(this.state.position.x, this.fixedHeight, this.state.position.z);
        this.body.rotation.set(0, this.state.rotation, 0);
        this.body.awake();
        
        // Step the physics world if it exists
        if (this.world) {
          this.world.step();
        }
      } catch (error) {
        console.warn('Error updating physics body in process input:', error);
      }
    }
    
    // Rotate wheels based on steering angle and vehicle speed
    // Rotate front wheels for steering
    this.frontWheels.forEach(wheelGroup => {
      wheelGroup.rotation.y = steeringAngle;
    });
    
    // Rotate all wheels based on vehicle speed (visual effect only)
    const wheelRotationSpeed = this.state.speed * dt * 2;
    this.wheels.forEach(wheel => {
      wheel.rotation.x += wheelRotationSpeed;
    });
  }
  
  // Apply server reconciliation when receiving an authoritative state
  applyServerReconciliation(serverState, sequence, timestamp) {
    // Store this state as the last processed server state
    this.lastProcessedServerState = { ...serverState };
    
    // Find the position in the pending inputs array for the acknowledged input
    const ackIndex = this.pendingInputs.findIndex(input => input.sequence === sequence);
    
    if (ackIndex !== -1) {
      // Remove all inputs up to and including the acknowledged one
      this.pendingInputs.splice(0, ackIndex + 1);
    }
    
    // Calculate discrepancy between server and client state
    const positionDiscrepancy = new THREE.Vector3(
      serverState.position.x - this.state.position.x,
      0, // We don't reconcile Y position
      serverState.position.z - this.state.position.z
    );
    
    const rotationDiscrepancy = serverState.rotation - this.state.rotation;
    const speedDiscrepancy = serverState.speed - this.state.speed;
    
    // Check if significant discrepancy exists
    const positionDiscrepancyMagnitude = positionDiscrepancy.length();
    const significantDiscrepancy = positionDiscrepancyMagnitude > 0.5 || 
                                 Math.abs(rotationDiscrepancy) > 0.1 || 
                                 Math.abs(speedDiscrepancy) > 2;
    
    if (significantDiscrepancy) {
      console.log(`[RECONCILIATION] Significant discrepancy detected: 
        Position: ${positionDiscrepancyMagnitude.toFixed(2)} units, 
        Rotation: ${Math.abs(rotationDiscrepancy).toFixed(2)} rad, 
        Speed: ${Math.abs(speedDiscrepancy).toFixed(2)} km/h`);
      
      // Dispatch a position error event for test suite
      const positionErrorEvent = new CustomEvent('positionerror', {
        detail: {
          discrepancy: positionDiscrepancyMagnitude,
          rotation: Math.abs(rotationDiscrepancy),
          speed: Math.abs(speedDiscrepancy)
        }
      });
      window.dispatchEvent(positionErrorEvent);
      
      // Set state to the server-provided values
      this.state.position.set(
        serverState.position.x,
        this.fixedHeight,
        serverState.position.z
      );
      this.state.rotation = serverState.rotation;
      this.state.speed = serverState.speed;
      
      // Update the vehicle mesh to match the corrected state
      this.vehicleGroup.position.copy(this.state.position);
      const rotation = new THREE.Euler(0, this.state.rotation, 0);
      this.vehicleGroup.quaternion.setFromEuler(rotation);
      
      // Re-apply pending inputs to bring the state back up-to-date
      this.pendingInputs.forEach(input => {
        this._processInput(input);
      });
    }
  }
  
  // Update other player's vehicle position with interpolation
  updateOtherPlayerPosition(position, rotation, speed, sequence, timestamp, interpolation) {
    // Store the target state for interpolation
    this.targetState = {
      position: new THREE.Vector3(position.x, this.fixedHeight, position.z),
      rotation: rotation,
      speed: speed,
      sequence: sequence,
      timestamp: timestamp,
      interpolation: interpolation
    };

    // If this is the first update, set current state to target state
    if (!this.currentState) {
      this.currentState = { ...this.targetState };
      this.vehicleGroup.position.copy(this.currentState.position);
      this.vehicleGroup.rotation.y = this.currentState.rotation;
    }
  }

  // Update interpolated position for other players
  updateInterpolation(deltaTime) {
    if (!this.targetState || !this.currentState) return;

    const now = Date.now();
    const interpolationProgress = (now - this.targetState.interpolation.startTime) / 
                                 (this.targetState.interpolation.endTime - this.targetState.interpolation.startTime);

    if (interpolationProgress >= 1) {
      // Interpolation complete, update to target state
      this.currentState = { ...this.targetState };
      this.vehicleGroup.position.copy(this.currentState.position);
      this.vehicleGroup.rotation.y = this.currentState.rotation;
      return;
    }

    // Interpolate position
    this.currentState.position.lerp(this.targetState.position, interpolationProgress);

    // Interpolate rotation (using shortest path)
    let rotationDiff = this.targetState.rotation - this.currentState.rotation;
    while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
    while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
    this.currentState.rotation += rotationDiff * interpolationProgress;

    // Update visual representation
    this.vehicleGroup.position.copy(this.currentState.position);
    this.vehicleGroup.rotation.y = this.currentState.rotation;
  }
  
  // Handle collision response
  _handleCollision(collision, dt) {
    if (!collision) return;
    
    // Store collision info
    this.state.isColliding = true;
    this.state.lastCollision = collision;
    
    // Calculate impact speed along normal
    const impactSpeed = this.state.speed;
    const normalizedSpeed = Math.abs(impactSpeed) / this.params.maxSpeed;
    
    // Calculate forward direction
    const forwardDirection = new THREE.Vector3(
      Math.sin(this.state.rotation),
      0,
      Math.cos(this.state.rotation)
    );
    
    // Dot product to find how much of our speed is along collision normal
    const normalComponent = forwardDirection.dot(collision.normal);
    
    // Only respond to collisions if we're moving toward the obstacle
    if (impactSpeed * normalComponent < 0) {
      // Calculate collision intensity for various effects
      const collisionIntensity = Math.min(Math.abs(impactSpeed) * Math.abs(normalComponent) / 20, 1);
      
      // Calculate how much to slow down based on impact speed
      const speedReduction = impactSpeed * Math.abs(normalComponent) * (1 + this.params.collisionRestitution);
      
      // Enhanced speed reduction based on collision severity
      const enhancedSpeedReduction = speedReduction * (1 + normalizedSpeed);
      
      // Reduce speed based on collision - more dramatically now
      this.state.speed -= enhancedSpeedReduction;
      
      // Add a "bounce back" effect on significant impacts
      if (Math.abs(impactSpeed) > 20 && Math.abs(normalComponent) > 0.5) {
        // Calculate bounce force - stronger at higher speeds
        const bounceForce = this.params.collisionRestitution * 
                           (0.2 + normalizedSpeed * 0.5) * 
                           Math.abs(impactSpeed);
        
        // Apply a stronger bounce effect
        this.state.speed = -bounceForce * Math.sign(impactSpeed) * normalComponent;
        
        // Add a short-term visual bounce effect (non-physics)
        this._applyVisualBounce(collision, collisionIntensity);
      } else if (Math.abs(speedReduction) > 10 && Math.abs(normalComponent) > 0.3) {
        // Medium impact - smaller bounce
        const mediumBounce = this.params.collisionRestitution * 0.3 * Math.abs(impactSpeed);
        this.state.speed = -mediumBounce * Math.sign(impactSpeed) * normalComponent;
        
        // Add smaller visual bounce
        this._applyVisualBounce(collision, collisionIntensity * 0.5);
      } else if (Math.abs(this.state.speed) < 1) {
        // Stop completely for small speeds
        this.state.speed = 0;
      }
      
      // Add more angular velocity for glancing collisions - increased effect
      if (Math.abs(normalComponent) < 0.8 && Math.abs(normalComponent) > 0.2) {
        const sideComponent = 1 - Math.abs(normalComponent);
        // Increase torque effect for more dramatic spins
        const torqueEffect = sideComponent * normalizedSpeed * 0.7;
        
        // Determine direction of rotation based on which side was hit
        const crossProduct = new THREE.Vector3().crossVectors(forwardDirection, collision.normal);
        const rotationDirection = Math.sign(crossProduct.y);
        
        this.state.angularVelocity += rotationDirection * torqueEffect;
      }
      
      // Move vehicle out of collision to prevent getting stuck - push back more on high-speed impacts
      const pushbackFactor = 1.05 + (normalizedSpeed * 0.2);
      const pushbackDistance = collision.penetration * pushbackFactor;
      const pushbackVector = collision.normal.clone().multiplyScalar(pushbackDistance);
      this.state.position.add(pushbackVector);
      
      // Ensure Y position is maintained
      this.state.position.y = this.fixedHeight;
      
      // Apply a short jolt to the camera through the scene (if implemented)
      if (window.gameScene && typeof window.gameScene.addCameraShake === 'function' && 
          collisionIntensity > 0.3) {
        window.gameScene.addCameraShake(collisionIntensity);
      }
    }
  }
  
  // Apply visual bounce effect for collisions
  _applyVisualBounce(collision, intensity) {
    // Store bounce effect data
    this.bouncingEffect = {
      startTime: performance.now(),
      duration: 300 + (intensity * 200), // 300-500ms based on intensity
      intensity: intensity,
      normal: collision.normal.clone(),
      phase: 0
    };
  }
  
  // Process visual bouncing effect on update
  _updateVisualEffects(dt) {
    // Handle visual bounce effect if active
    if (this.bouncingEffect) {
      const now = performance.now();
      const elapsed = now - this.bouncingEffect.startTime;
      
      if (elapsed < this.bouncingEffect.duration) {
        // Calculate bounce progress (0-1)
        const progress = elapsed / this.bouncingEffect.duration;
        
        // Use a sine wave to create a bounce effect
        const bounceAmount = Math.sin(progress * Math.PI) * this.bouncingEffect.intensity;
        
        // Apply a subtle up/down movement to the vehicle mesh
        this.vehicleGroup.position.y = this.state.position.y + (bounceAmount * 0.3);
        
        // Add a subtle tilt in the direction of the impact
        const maxTilt = 0.1 * this.bouncingEffect.intensity;
        const tiltX = this.bouncingEffect.normal.z * maxTilt * bounceAmount;
        const tiltZ = -this.bouncingEffect.normal.x * maxTilt * bounceAmount;
        
        // Apply the tilt as a temporary rotation
        this.bodyMesh.rotation.x = tiltX;
        this.bodyMesh.rotation.z = tiltZ;
      } else {
        // Reset after effect completes
        this.vehicleGroup.position.y = this.state.position.y;
        this.bodyMesh.rotation.x = 0;
        this.bodyMesh.rotation.z = 0;
        this.bouncingEffect = null;
      }
    } else {
      // Ensure vehicle is at the correct height when no bounce is active
      this.vehicleGroup.position.y = this.state.position.y;
      
      // Ensure body rotation is reset
      if (this.bodyMesh.rotation.x !== 0 || this.bodyMesh.rotation.z !== 0) {
        this.bodyMesh.rotation.x = 0;
        this.bodyMesh.rotation.z = 0;
      }
    }
  }
  
  // Check if the vehicle is currently in a collision state
  isColliding() {
    return this.state.isColliding;
  }
  
  // Get information about the last collision
  getLastCollision() {
    return this.state.lastCollision;
  }
  
  // Get the current position and state for network updates
  getNetworkState() {
    return {
      position: {
        x: this.state.position.x || 0,
        y: this.state.position.y || this.fixedHeight || 0.5,
        z: this.state.position.z || 0
      },
      rotation: this.state.rotation || 0,
      speed: this.state.speed || 0,
      sequence: this.sequence - 1, // Latest sequence number
      timestamp: Date.now(),
      controls: {
        // Include both control formats
        up: false,
        down: false,
        left: false,
        right: false,
        space: false,
        // Normalized controls
        accelerate: false,
        brake: false,
        turnLeft: false,
        turnRight: false,
        handbrake: false
      }
    };
  }
}

export default Vehicle; 