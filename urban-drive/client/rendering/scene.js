/**
 * Urban Drive - 3D Scene Setup
 * Creates and manages the Three.js scene, camera, renderer, and basic objects
 */

import * as THREE from 'three';
import City from './city.js'; // Import the City class

// Scene class to encapsulate all Three.js functionality
class Scene {
  constructor(canvasId) {
    // Get the canvas element
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas element with ID "${canvasId}" not found`);
      return;
    }
    
    // Initialize core Three.js components
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.createGround();
    
    // Create the city with diverse districts
    this.createCity();
    
    // Setup resize handler
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Initial resize to set correct dimensions
    this.handleResize();
    
    // Performance monitoring
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsElement = document.getElementById('fps-counter');
    
    // Camera follow properties
    this.cameraHeight = 4; // Camera height above car
    this.cameraDistance = 12; // Camera distance behind car
    this.cameraLerpFactor = 0.05; // Slower camera movement for stability
    this.lastCameraPosition = new THREE.Vector3(); // Last camera position for smoothing
    this.targetFOV = 75; // Default FOV
    this.currentFOV = 75; // Current FOV that will be adjusted
    this.fovLerpFactor = 0.1; // FOV adjustment speed
    this.lastControls = { left: false, right: false, up: false, down: false }; // Track last control state
    this.controlTransitionTime = 0; // Track time since last control change
    this.maxCameraDistance = 15; // Maximum allowed distance between car and camera
  }
  
  // Initialize the Three.js scene
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    this.scene.fog = new THREE.Fog(0x87CEEB, 100, 700); // Add fog for distance
  }
  
  // Set up the camera with perspective view
  initCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(this.targetFOV, aspect, 0.1, 1000);
    this.camera.position.set(0, 10, 20); // Position camera above and behind the starting point
    this.camera.lookAt(0, 0, 0);
  }
  
  // Create the WebGL renderer
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
  }
  
  // Add lights to the scene
  initLights() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    
    // Directional light for shadows and highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 200, 100);
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 10;
    directionalLight.shadow.camera.far = 400;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    
    this.scene.add(directionalLight);
  }
  
  // Create a flat ground plane
  createGround() {
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000); // Larger ground to accommodate the city
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e824c, // Green color for grass
      roughness: 0.8,
      metalness: 0.2
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.receiveShadow = true;
    this.scene.add(ground);
  }
  
  // Create the city with diverse districts
  createCity() {
    this.city = new City(this.scene);
    console.log('City created and added to scene');
  }
  
  // Handle window resize
  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  // Get the Three.js scene object
  getScene() {
    return this.scene;
  }
  
  // Get the Three.js camera object
  getCamera() {
    return this.camera;
  }
  
  // Set a target object to be followed by the camera
  setCameraTarget(target) {
    this.cameraTarget = target;
    console.log('Camera target set');
  }
  
  // Add camera shake effect for collisions
  addCameraShake(intensity) {
    // Safeguard against invalid intensity
    if (typeof intensity !== 'number') intensity = 0.5;
    
    // Clamp intensity to reasonable values (0-1)
    intensity = Math.max(0, Math.min(intensity, 1));
    
    this.cameraShake = {
      startTime: performance.now(),
      duration: 300 + (intensity * 200), // 300-500ms based on intensity
      intensity: intensity * 0.5, // Scale intensity down to avoid excessive shake
      originalPosition: this.camera.position.clone()
    };
    
    console.log(`Camera shake added with intensity: ${intensity}`);
  }
  
  // Update camera shake effect
  _updateCameraShake(deltaTime) {
    if (!this.cameraShake) return;
    
    const now = performance.now();
    const elapsed = now - this.cameraShake.startTime;
    
    if (elapsed < this.cameraShake.duration) {
      // Calculate shake progress (1-0)
      const progress = 1 - (elapsed / this.cameraShake.duration);
      
      // Calculate current shake intensity
      const currentIntensity = this.cameraShake.intensity * progress;
      
      // Apply random shake offset that decreases over time
      this.camera.position.x += (Math.random() - 0.5) * currentIntensity;
      this.camera.position.y += (Math.random() - 0.5) * currentIntensity;
      this.camera.position.z += (Math.random() - 0.5) * currentIntensity;
    } else {
      // Shake effect is over
      this.cameraShake = null;
    }
  }
  
  // Update camera to follow the target
  _updateCameraFollow(deltaTime) {
    // Get target position and rotation
    const targetPosition = this.cameraTarget.vehicleGroup.position;
    const targetRotation = this.cameraTarget.state.rotation;
    
    // Calculate ideal camera position
    const directionVector = new THREE.Vector3(
      -Math.sin(targetRotation),
      0,
      -Math.cos(targetRotation)
    );
    
    // Calculate ideal camera position
    const idealCameraPosition = new THREE.Vector3(
      targetPosition.x + (directionVector.x * this.cameraDistance),
      targetPosition.y + this.cameraHeight,
      targetPosition.z + (directionVector.z * this.cameraDistance)
    );
    
    // If this is the first frame, snap camera to position
    if (this.lastCameraPosition.lengthSq() === 0) {
      this.lastCameraPosition.copy(idealCameraPosition);
      this.camera.position.copy(idealCameraPosition);
    } else {
      // Smoothly move current camera position toward ideal position
      // Use faster lerping during collisions for a more dramatic effect
      let lerpFactor = this.cameraLerpFactor;
      
      // If there's a camera shake active, reduce the lerp factor slightly to make the camera more "loose"
      if (this.cameraShake) {
        lerpFactor *= 0.8;
      }
      
      this.camera.position.lerp(idealCameraPosition, lerpFactor);
      this.lastCameraPosition.copy(this.camera.position);
    }
    
    // Look at a point slightly above the car
    const lookTarget = new THREE.Vector3(
      targetPosition.x,
      targetPosition.y + 1,
      targetPosition.z
    );
    
    this.camera.lookAt(lookTarget);
  }
  
  // Animation loop
  animate() {
    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Update FPS counter occasionally
    this.frameCount++;
    if (currentTime - this.lastTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      if (this.fpsElement) {
        this.fpsElement.textContent = `FPS: ${fps}`;
      }
      this.frameCount = 0;
    }
    
    // Update camera position if following a target
    if (this.cameraTarget && this.cameraTarget.vehicleGroup) {
      this._updateCameraFollow(deltaTime);
    }
    
    // Update camera shake if active
    this._updateCameraShake(deltaTime);
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
    
    // Request next frame
    window.gameScene = this; // Make gameScene accessible globally for collision feedback
    requestAnimationFrame(this.animate.bind(this));
  }
  
  // Start the animation loop
  start() {
    // Return the first animation frame call
    return requestAnimationFrame(this.animate.bind(this));
  }
}

// Export the Scene class
export default Scene; 