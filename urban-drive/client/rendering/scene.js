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
  
  // Animation loop
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
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
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
  
  // Start the animation loop
  start() {
    this.animate();
  }
}

// Export the Scene class
export default Scene; 