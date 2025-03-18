/**
 * Urban Drive - City Layout
 * Creates a diverse city with different districts including downtown, suburbs, 
 * industrial areas, and waterfront, connected by a grid of roads.
 */

import * as THREE from 'three';

class City {
  constructor(scene) {
    // Store the Three.js scene
    this.scene = scene;
    
    // City configuration
    this.config = {
      citySize: 500, // Total city size in units
      blockSize: 20, // Size of a city block
      roadWidth: 10, // Width of roads
      maxBuildingHeight: 50, // Max height for downtown buildings
      buildingSpacing: 1, // Spacing between buildings
      waterfrontPosition: 200, // Position of the waterfront from center
      buildingColors: {
        downtown: [0x4477aa, 0x66aadd, 0x3366aa, 0x5588bb],
        suburbs: [0xddaa77, 0xccbb88, 0xddccaa, 0xeeddbb],
        industrial: [0x777788, 0x888899, 0x999999, 0x555566],
        waterfront: [0x88bbcc, 0x99ccdd, 0xaaddee, 0x6699aa]
      }
    };
    
    // Store building data for collision detection
    this.buildings = [];
    
    // Initialize city components
    this._createRoadGrid();
    this._createDowntownDistrict();
    this._createSuburbsDistrict();
    this._createIndustrialDistrict();
    this._createWaterfrontDistrict();
    this._createWater();
    
    console.log('City initialized with multiple districts');
    console.log(`Created ${this.buildings.length} buildings with collision data`);
  }
  
  // Get all building collision data
  getBuildingCollisionData() {
    return this.buildings;
  }
  
  // Create a grid of roads throughout the city
  _createRoadGrid() {
    // Road material - darker gray asphalt with white lines
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Create horizontal roads
    const halfSize = this.config.citySize / 2;
    const blockAndRoad = this.config.blockSize + this.config.roadWidth;
    
    for (let z = -halfSize; z <= halfSize; z += blockAndRoad) {
      // Create a horizontal road
      const horizontalRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(this.config.citySize, this.config.roadWidth),
        roadMaterial
      );
      horizontalRoad.rotation.x = -Math.PI / 2; // Rotate to horizontal
      horizontalRoad.position.set(0, 0.01, z); // Slightly above ground to prevent z-fighting
      
      // Add road markings (white line)
      const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const centerLine = new THREE.Mesh(
        new THREE.PlaneGeometry(this.config.citySize, 0.5),
        lineMaterial
      );
      centerLine.rotation.x = -Math.PI / 2;
      centerLine.position.set(0, 0.02, z); // Slightly above road
      
      this.scene.add(horizontalRoad);
      this.scene.add(centerLine);
    }
    
    // Create vertical roads
    for (let x = -halfSize; x <= halfSize; x += blockAndRoad) {
      // Create a vertical road
      const verticalRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(this.config.roadWidth, this.config.citySize),
        roadMaterial
      );
      verticalRoad.rotation.x = -Math.PI / 2; // Rotate to horizontal
      verticalRoad.position.set(x, 0.01, 0); // Slightly above ground
      
      // Add road markings (white line)
      const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const centerLine = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, this.config.citySize),
        lineMaterial
      );
      centerLine.rotation.x = -Math.PI / 2;
      centerLine.position.set(x, 0.02, 0); // Slightly above road
      
      this.scene.add(verticalRoad);
      this.scene.add(centerLine);
    }
    
    console.log('Road grid created');
  }
  
  // Create a downtown district with tall buildings
  _createDowntownDistrict() {
    const districtCenter = new THREE.Vector3(-100, 0, -100);
    const districtSize = 100;
    const buildingDensity = 0.8; // Higher density for downtown
    
    this._createDistrict({
      center: districtCenter,
      size: districtSize,
      minHeight: 20,
      maxHeight: this.config.maxBuildingHeight,
      minWidth: 8,
      maxWidth: 15,
      density: buildingDensity,
      colorPalette: this.config.buildingColors.downtown,
      shouldAddWindows: true,
      windowFrequency: 0.5 // More windows for downtown buildings
    });
    
    console.log('Downtown district created');
  }
  
  // Create a suburbs district with smaller spaced-out buildings
  _createSuburbsDistrict() {
    const districtCenter = new THREE.Vector3(100, 0, -100);
    const districtSize = 150;
    const buildingDensity = 0.4; // Lower density for suburbs
    
    this._createDistrict({
      center: districtCenter,
      size: districtSize,
      minHeight: 3,
      maxHeight: 8,
      minWidth: 5,
      maxWidth: 10,
      density: buildingDensity,
      colorPalette: this.config.buildingColors.suburbs,
      shouldAddWindows: true,
      windowFrequency: 0.3
    });
    
    console.log('Suburbs district created');
  }
  
  // Create an industrial district with large warehouse-like buildings
  _createIndustrialDistrict() {
    const districtCenter = new THREE.Vector3(100, 0, 100);
    const districtSize = 120;
    const buildingDensity = 0.5;
    
    this._createDistrict({
      center: districtCenter,
      size: districtSize,
      minHeight: 8,
      maxHeight: 15,
      minWidth: 12,
      maxWidth: 25,
      density: buildingDensity,
      colorPalette: this.config.buildingColors.industrial,
      shouldAddWindows: false,
      isIndustrial: true // Special flag for industrial buildings
    });
    
    console.log('Industrial district created');
  }
  
  // Create a waterfront district with medium-sized buildings along water
  _createWaterfrontDistrict() {
    const districtCenter = new THREE.Vector3(-100, 0, 150);
    const districtSize = 80;
    const buildingDensity = 0.5;
    
    this._createDistrict({
      center: districtCenter,
      size: districtSize,
      minHeight: 10,
      maxHeight: 25,
      minWidth: 8,
      maxWidth: 12,
      density: buildingDensity,
      colorPalette: this.config.buildingColors.waterfront,
      shouldAddWindows: true,
      windowFrequency: 0.4,
      isWaterfront: true // Special flag for waterfront buildings
    });
    
    console.log('Waterfront district created');
  }
  
  // Create water surface
  _createWater() {
    const waterGeometry = new THREE.PlaneGeometry(this.config.citySize, this.config.citySize / 2);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x0066aa,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.8
    });
    
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2; // Rotate to horizontal
    water.position.set(0, 0.05, this.config.waterfrontPosition); // Slightly above ground to prevent z-fighting
    
    this.scene.add(water);
    
    console.log('Water created');
  }
  
  // Utility function to create a district with specific characteristics
  _createDistrict({ center, size, minHeight, maxHeight, minWidth, maxWidth, density, colorPalette, shouldAddWindows, windowFrequency, isIndustrial, isWaterfront }) {
    const halfSize = size / 2;
    const blockSize = this.config.blockSize;
    const buildingSpacing = this.config.buildingSpacing;
    
    // Create buildings in a grid pattern
    for (let x = -halfSize; x < halfSize; x += blockSize) {
      for (let z = -halfSize; z < halfSize; z += blockSize) {
        // Skip some buildings based on density
        if (Math.random() > density) continue;
        
        // Position within the district with some randomness
        const posX = center.x + x + (Math.random() * 4 - 2);
        const posZ = center.z + z + (Math.random() * 4 - 2);
        
        // Skip if too close to a road
        const distToRoadX = Math.abs(posX) % (blockSize + this.config.roadWidth);
        const distToRoadZ = Math.abs(posZ) % (blockSize + this.config.roadWidth);
        if (distToRoadX < this.config.roadWidth/2 || distToRoadZ < this.config.roadWidth/2) continue;
        
        // For waterfront, skip buildings too far into the water
        if (isWaterfront && posZ > this.config.waterfrontPosition - 10) continue;
        
        // Determine building dimensions
        const width = minWidth + Math.random() * (maxWidth - minWidth);
        const depth = minWidth + Math.random() * (maxWidth - minWidth);
        const height = minHeight + Math.random() * (maxHeight - minHeight);
        
        // Create the building
        this._createBuilding({
          position: new THREE.Vector3(posX, height/2, posZ),
          width: width,
          depth: depth,
          height: height,
          color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
          shouldAddWindows: shouldAddWindows,
          windowFrequency: windowFrequency,
          isIndustrial: isIndustrial
        });
      }
    }
  }
  
  // Create a single building with the specified parameters
  _createBuilding({ position, width, depth, height, color, shouldAddWindows, windowFrequency, isIndustrial }) {
    // Create basic building geometry
    let buildingGeometry;
    
    if (isIndustrial) {
      // Industrial buildings have flat roofs
      buildingGeometry = new THREE.BoxGeometry(width, height, depth);
    } else {
      // Regular buildings
      buildingGeometry = new THREE.BoxGeometry(width, height, depth);
      
      // Round the edges slightly - only for non-industrial buildings
      const positions = buildingGeometry.attributes.position;
      const vector = new THREE.Vector3();
      const amount = 0.1; // Amount of rounding
      
      for (let i = 0; i < positions.count; i++) {
        vector.fromBufferAttribute(positions, i);
        
        // Only round the top edges
        if (vector.y > 0) {
          // Normalize the position to get direction from center
          const normalized = vector.clone().normalize();
          
          // Move vertices slightly inward to create rounded corners
          positions.setXYZ(
            i,
            vector.x - normalized.x * amount,
            vector.y - normalized.y * amount,
            vector.z - normalized.z * amount
          );
        }
      }
      
      // Recalculate normals after modifying vertices
      buildingGeometry.computeVertexNormals();
    }
    
    // Create building material
    const buildingMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.2
    });
    
    // Create the building mesh
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.copy(position);
    building.castShadow = true;
    building.receiveShadow = true;
    
    // Add building to the scene
    this.scene.add(building);
    
    // Store building data for collision detection
    // Using slightly smaller dimensions for collision to prevent "sticky" collision
    const collisionMargin = 0.1;
    this.buildings.push({
      position: building.position.clone(),
      dimensions: new THREE.Vector3(
        width - collisionMargin,
        height - collisionMargin, 
        depth - collisionMargin
      ),
      type: isIndustrial ? 'industrial' : 'standard'
    });
    
    // Add windows if needed
    if (shouldAddWindows) {
      this._addWindowsToBuilding(building, windowFrequency);
    }
    
    // Add rooftop details for taller buildings
    if (height > 15 && !isIndustrial) {
      this._addRooftopDetails(building);
    }
    
    return building;
  }
  
  // Add windows to a building
  _addWindowsToBuilding(building, frequency) {
    const buildingBox = new THREE.Box3().setFromObject(building);
    const size = new THREE.Vector3();
    buildingBox.getSize(size);
    
    // Window material - bright with emissive for glow
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.2,
      roughness: 0.1,
      metalness: 0.9
    });
    
    // Window size as a proportion of building size
    const windowWidth = size.x * 0.15;
    const windowHeight = size.y * 0.08;
    const windowDepth = 0.1;
    
    // Window geometry
    const windowGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth);
    
    // Number of windows based on building size
    const maxWindowsX = Math.floor(size.x / (windowWidth * 1.5));
    const maxWindowsY = Math.floor(size.y / (windowHeight * 1.5));
    
    // Add windows to each side of the building
    for (let side = 0; side < 4; side++) {
      // Determine rotation and offset based on which side we're adding windows to
      let rotation = 0;
      let xOffset = 0;
      let zOffset = 0;
      
      if (side === 0) {
        // Front face
        zOffset = size.z / 2 + windowDepth / 2;
      } else if (side === 1) {
        // Right face
        rotation = Math.PI / 2;
        xOffset = size.x / 2 + windowDepth / 2;
      } else if (side === 2) {
        // Back face
        rotation = Math.PI;
        zOffset = -size.z / 2 - windowDepth / 2;
      } else {
        // Left face
        rotation = -Math.PI / 2;
        xOffset = -size.x / 2 - windowDepth / 2;
      }
      
      // Add windows in a grid pattern
      for (let wx = 0; wx < maxWindowsX; wx++) {
        for (let wy = 0; wy < maxWindowsY; wy++) {
          // Skip some windows based on frequency
          if (Math.random() > frequency) continue;
          
          // Skip windows on the ground floor
          if (wy === 0) continue;
          
          // Calculate window position
          const xPos = -size.x / 2 + windowWidth + wx * (size.x - windowWidth) / maxWindowsX;
          const yPos = -size.y / 2 + windowHeight + wy * (size.y - windowHeight) / maxWindowsY;
          
          // Create window
          const window = new THREE.Mesh(windowGeometry, windowMaterial);
          window.position.set(
            building.position.x + xPos + xOffset,
            building.position.y + yPos,
            building.position.z + zOffset
          );
          
          // Rotate window to face outward
          window.rotation.y = rotation;
          
          // Add window to scene
          this.scene.add(window);
        }
      }
    }
  }
  
  // Add details to building rooftops
  _addRooftopDetails(building) {
    const buildingBox = new THREE.Box3().setFromObject(building);
    const size = new THREE.Vector3();
    buildingBox.getSize(size);
    
    // Rooftop material
    const rooftopMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.8,
      metalness: 0.3
    });
    
    // Add water tower (common in cities)
    if (Math.random() > 0.5) {
      const towerHeight = size.y * 0.15;
      const towerRadius = size.x * 0.1;
      
      const towerGeometry = new THREE.CylinderGeometry(towerRadius, towerRadius, towerHeight, 8);
      const tower = new THREE.Mesh(towerGeometry, rooftopMaterial);
      
      // Position tower on rooftop
      tower.position.set(
        building.position.x + (Math.random() - 0.5) * size.x * 0.5,
        building.position.y + size.y / 2 + towerHeight / 2,
        building.position.z + (Math.random() - 0.5) * size.z * 0.5
      );
      
      tower.castShadow = true;
      tower.receiveShadow = true;
      
      this.scene.add(tower);
    }
    
    // Add air conditioning units or other rooftop equipment
    if (Math.random() > 0.3) {
      const unitSize = size.x * 0.15;
      const unitHeight = size.y * 0.07;
      
      const unitGeometry = new THREE.BoxGeometry(unitSize, unitHeight, unitSize);
      const unit = new THREE.Mesh(unitGeometry, rooftopMaterial);
      
      // Position unit on rooftop
      unit.position.set(
        building.position.x + (Math.random() - 0.5) * size.x * 0.6,
        building.position.y + size.y / 2 + unitHeight / 2,
        building.position.z + (Math.random() - 0.5) * size.z * 0.6
      );
      
      unit.castShadow = true;
      unit.receiveShadow = true;
      
      this.scene.add(unit);
    }
  }
}

export default City; 