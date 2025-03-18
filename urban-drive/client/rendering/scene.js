/**
 * Urban Drive - 3D Scene Setup
 * Creates and manages the Three.js scene, camera, renderer, and basic objects
 */

import * as THREE from 'three';

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
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
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
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
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
  
  // Add an object to follow with the camera
  setCameraTarget(target) {
    this.cameraTarget = target;
  }
  
  // Animation loop
  animate(time) {
    requestAnimationFrame(this.animate.bind(this));
    
    // Calculate delta time for smooth animations
    const deltaTime = time - this.lastTime;
    
    // Update FPS counter
    this.frameCount++;
    const currentTime = performance.now();
    
    // Update FPS display every second
    if (currentTime - this.lastTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      if (this.fpsElement) {
        this.fpsElement.textContent = `FPS: ${fps}`;
      }
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
    
    // Update camera position to follow target if available
    if (this.cameraTarget && this.cameraTarget.vehicleGroup) {
      // Get target position and rotation
      const targetPosition = this.cameraTarget.vehicleGroup.position;
      const targetRotation = this.cameraTarget.state.rotation;
      
      // First, directly position the camera based on car's position and rotation
      // Convert car direction to a unit vector
      const directionVector = new THREE.Vector3(
        -Math.sin(targetRotation), // Negative to position camera BEHIND car
        0,
        -Math.cos(targetRotation)  // Negative to position camera BEHIND car
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
        this.camera.position.lerp(idealCameraPosition, this.cameraLerpFactor);
        this.lastCameraPosition.copy(this.camera.position);
      }
      
      // Look at a point slightly above the car
      const lookTarget = new THREE.Vector3(
        targetPosition.x,
        targetPosition.y + 1, // Look slightly above vehicle
        targetPosition.z
      );
      
      this.camera.lookAt(lookTarget);
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
    
    return deltaTime;
  }
  
  // Start the animation loop
  start() {
    this.animate(performance.now());
  }
}

// Export the Scene class
export default Scene; 