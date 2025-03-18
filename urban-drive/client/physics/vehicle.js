/**
 * Urban Drive - Vehicle Physics
 * Implements vehicle physics using Oimo.js
 */

import * as THREE from 'three';
import OIMO from 'oimo';

class Vehicle {
  constructor(scene) {
    // Store the scene for adding meshes
    this.scene = scene;
    
    // Vehicle physics parameters
    this.params = {
      mass: 1000,               // Vehicle mass in kg
      maxSpeed: 120,            // Max speed in km/h
      acceleration: 10,         // Acceleration rate
      braking: 20,              // Braking rate
      reverseSpeed: 40,         // Max reverse speed in km/h
      steeringAngle: Math.PI/4, // Maximum steering angle in radians (increased from PI/6)
      steeringSpeed: 4,         // Speed of steering rotation (increased from 2)
      friction: 0.7,            // Ground friction
      handbrakeForce: 30,       // Force applied when handbrake is used
      rotationDamping: 0.9     // Rotation damping factor (reduced from 0.95)
    };
    
    // Vehicle state
    this.state = {
      speed: 0,                // Current speed
      rotation: 0,             // Current rotation in radians
      position: new THREE.Vector3(0, 0.5, 0), // Position with y slightly above ground to avoid collision issues
      angularVelocity: 0       // Angular velocity for steering
    };
    
    // Create the vehicle mesh
    this._createVehicleMesh();
    
    // Initialize Oimo.js physics
    this._initPhysics();
    
    console.log('Vehicle initialized');
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
      type: 'box',
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
    
    // Create vehicle body
    this.body = this.world.add({
      type: 'box',
      size: [2, 1, 4],
      pos: [this.state.position.x, this.state.position.y, this.state.position.z],
      rot: [0, this.state.rotation, 0],
      move: true,
      density: this.params.mass / 8, // Approx volume of the box
      friction: 0.5,
      restitution: 0.2,
      belongsTo: 2,
      collidesWith: 0xffffffff
    });
    
    // Prevent the vehicle from rotating around the Z axis (flipping over)
    this.body.setupMass({
      type: 1, // Mass distribution type
      linearFactor: [1, 1, 1], // Linear movement in all directions
      angularFactor: [1, 1, 0]  // Block rotation around z axis
    });
    
    console.log('Physics initialized');
  }
  
  // Update vehicle position and rotation based on controls
  update(controls, deltaTime) {
    if (!controls || !deltaTime) return;
    
    // Convert delta time to seconds
    const dt = deltaTime / 1000;
    
    // Handle acceleration and braking
    if (controls.up) {
      // Accelerate forward
      this.state.speed += this.params.acceleration * dt;
      
      // Limit to max speed
      if (this.state.speed > this.params.maxSpeed) {
        this.state.speed = this.params.maxSpeed;
      }
    } else if (controls.down) {
      // Brake if moving forward
      if (this.state.speed > 0) {
        this.state.speed -= this.params.braking * dt;
        
        // Stop completely if speed is very low
        if (this.state.speed < 0.1) {
          this.state.speed = 0;
        }
      } else {
        // Reverse if already stopped
        this.state.speed -= this.params.acceleration * dt;
        
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
    
    // Apply handbrake
    if (controls.space) {
      const handbrakeForce = this.params.handbrakeForce * dt;
      
      if (Math.abs(this.state.speed) > 0.1) {
        // Apply strong braking force
        if (this.state.speed > 0) {
          this.state.speed -= handbrakeForce;
          
          if (this.state.speed < 0) {
            this.state.speed = 0;
          }
        } else {
          this.state.speed += handbrakeForce;
          
          if (this.state.speed > 0) {
            this.state.speed = 0;
          }
        }
        
        // Increase angular velocity when handbraking at speed (drift effect)
        if (Math.abs(this.state.speed) > 10 && (controls.left || controls.right)) {
          this.state.angularVelocity *= 1.05;
        }
      }
    }
    
    // Handle steering - modified to be more responsive and allow turning at lower speeds
    const minSpeedForSteering = 0.1; // Reduced minimum speed for steering
    
    // Track current steering angle for wheels
    let steeringAngle = 0;
    
    if (Math.abs(this.state.speed) > minSpeedForSteering) {
      // Calculate steering factor based on speed (less effective at high speeds)
      const speedFactor = 1 - (Math.min(Math.abs(this.state.speed), this.params.maxSpeed) / this.params.maxSpeed) * 0.3; // Reduced speed impact
      
      // Reset angular velocity each frame instead of accumulating it
      this.state.angularVelocity = 0;
      
      if (controls.left) {
        // Set fixed steering rate for left turns - reversed to fix direction
        this.state.angularVelocity = -this.params.steeringSpeed * speedFactor; // Reversed sign
        steeringAngle = -Math.PI / 6; // -30 degrees wheel rotation for LEFT turn
      } else if (controls.right) {
        // Set fixed steering rate for right turns - reversed to fix direction
        this.state.angularVelocity = this.params.steeringSpeed * speedFactor; // Reversed sign
        steeringAngle = Math.PI / 6; // +30 degrees wheel rotation for RIGHT turn
      }
      
      // Apply steering limits
      const maxAngularVelocity = this.params.steeringAngle * speedFactor;
      this.state.angularVelocity = Math.max(-maxAngularVelocity, Math.min(maxAngularVelocity, this.state.angularVelocity));
    } else {
      // No steering at very low speeds
      this.state.angularVelocity = 0;
    }
    
    // Front-wheel steering model - calculate next position first, then rotate
    const turnRate = this.state.angularVelocity * dt * 0.8;
    const carLength = 4; // Length of car in units
    
    // Calculate position delta from velocity
    const forwardDirection = new THREE.Vector3(
      Math.sin(this.state.rotation),
      0,
      Math.cos(this.state.rotation)
    );
    
    // Update position based on forward direction and speed
    const positionDelta = forwardDirection.clone().multiplyScalar(this.state.speed * dt);
    this.state.position.add(positionDelta);
    
    // Apply rotation at the front of the car (front-wheel steering)
    if (Math.abs(turnRate) > 0.001 && Math.abs(this.state.speed) > 0.5) {
      // Position of front axle in world space
      const frontAxlePos = new THREE.Vector3(
        this.state.position.x + Math.sin(this.state.rotation) * (carLength/2),
        this.state.position.y,
        this.state.position.z + Math.cos(this.state.rotation) * (carLength/2)
      );
      
      // Update car rotation
      this.state.rotation += turnRate;
      
      // Calculate the new position that keeps the rear axle's path continuous
      const rearAxlePos = new THREE.Vector3(
        frontAxlePos.x - Math.sin(this.state.rotation) * carLength,
        this.state.position.y,
        frontAxlePos.z - Math.cos(this.state.rotation) * carLength
      );
      
      // Update car position to the correct rear axle position
      this.state.position.copy(rearAxlePos);
    } else {
      // Just update rotation normally at very low speeds or no turning
      this.state.rotation += turnRate;
    }
    
    // Update physics body position and rotation
    this.body.position.set(this.state.position.x, this.state.position.y, this.state.position.z);
    this.body.quaternion.setFromEuler(0, this.state.rotation, 0);
    
    // Step the physics world
    this.world.step();
    
    // Update vehicle position and rotation from physics
    const bodyPosition = this.body.getPosition();
    const bodyQuaternion = this.body.getQuaternion();
    
    // Update the Three.js mesh group
    this.vehicleGroup.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
    this.vehicleGroup.quaternion.set(bodyQuaternion.x, bodyQuaternion.y, bodyQuaternion.z, bodyQuaternion.w);
    
    // Update wheel rotations
    // Rotate front wheels for steering
    this.frontWheels.forEach(wheelGroup => {
      wheelGroup.rotation.y = steeringAngle; // Apply steering angle to front wheels
    });
    
    // Rotate all wheels based on vehicle speed (visual effect only)
    const wheelRotationSpeed = this.state.speed * dt * 2;
    this.wheels.forEach(wheel => {
      wheel.rotation.x += wheelRotationSpeed;
    });
    
    // Log vehicle state for debugging (throttled)
    if (controls.up || controls.down || controls.left || controls.right || Math.abs(this.state.speed) > 1) {
      console.log('Vehicle speed:', this.state.speed.toFixed(2), 'km/h');
    }
  }
}

export default Vehicle; 