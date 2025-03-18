# Urban Drive Architecture Overview

This document outlines the architecture of the Urban Drive project, explaining key components and their relationships.

## Core Architecture

Urban Drive follows a modular design with clear separation of concerns. The major components are:

### Rendering Layer
- **Scene (`scene.js`)**: Manages the Three.js scene, camera, renderer, and lighting.
  - Responsible for overall rendering pipeline
  - Handles window resizing
  - Provides camera following behavior
  - Maintains the master animation loop
  
- **City (`city.js`)**: Creates and manages the city layout with multiple districts.
  - Generates building meshes with district-specific characteristics
  - Creates the road grid connecting districts
  - Stores building data needed for collision detection
  - Provides access to building collision data via `getBuildingCollisionData()`

### Physics Layer
- **Vehicle (`vehicle.js`)**: Implements the player-controlled vehicle.
  - Creates vehicle mesh and components (body, wheels, windshield)
  - Manages vehicle state (position, rotation, speed)
  - Handles input from controls to update vehicle state
  - Processes collision responses while maintaining stable physics
  - Uses a simplified physics approach that prioritizes gameplay over perfect simulation
  
- **CollisionManager (`collisionManager.js`)**: Manages collision detection and visual effects.
  - Detects collisions between the vehicle and buildings
  - Calculates collision normals and penetration depths
  - Creates visual feedback (particle effects) on collision
  - Manages debug visualization of collision boundaries
  - Handles lifecycle of collision effects (spawning, aging, removal)

### Input Layer
- **Controls (`controls.js`)**: Manages keyboard input.
  - Captures key presses and updates control state
  - Provides control state to the vehicle for movement
  - Supports multiple input methods (arrow keys, WASD)

### Integration Layer
- **Main (`index.js`)**: Ties all components together.
  - Initializes scene, city, vehicle, controls, and collision manager
  - Connects building data from city to collision manager
  - Runs the game loop
  - Updates UI based on game state
  - Manages performance monitoring

## Collision Detection System

The collision detection system was carefully designed to maintain vehicle stability while providing realistic collisions:

### Design Goals
1. Accurate collision detection with buildings
2. Realistic collision responses
3. Maintaining vehicle stability (no tipping/flipping)
4. Visual feedback for collisions
5. Optimal performance

### Implementation

#### Data Flow
1. **City** provides building collision data (position, dimensions)
2. **CollisionManager** checks for vehicle-building intersections
3. **CollisionManager** calculates collision details (normal, penetration)
4. **Vehicle** receives collision data and adjusts its state
5. **CollisionManager** creates visual effects at collision points

#### Collision Response Mechanism
The collision response follows these steps:
1. Calculate impact speed along collision normal
2. Reduce speed based on impact and bounce factor
3. Add angular velocity for glancing collisions
4. Push vehicle out of collision zone
5. Ensure vehicle stays at correct height
6. Create visual feedback

#### Key Design Decisions
- **Box Collisions**: Used simple box collisions for performance
- **Direct State Manipulation**: Directly modify vehicle state instead of applying physics forces
- **Collision Margins**: Slightly reduced collision box sizes to prevent "sticky" collisions
- **Y-Axis Preservation**: Carefully designed to maintain upright orientation
- **Separate Visual Effects**: Decoupled collision visuals from physics response

## Performance Considerations

- **Optimized Collision Checks**: Only perform detailed collision calculation when boxes intersect
- **Particle Lifecycle Management**: Proper disposal of particle geometries and materials
- **Simplified Physics**: Use of kinematic physics for stability and performance
- **Collision Cooldown**: Visual effects have a cooldown to prevent excessive particle creation

## File Structure

```
urban-drive/
├── client/
│   ├── rendering/
│   │   ├── scene.js     # Main Three.js scene manager
│   │   └── city.js      # City generation with districts
│   ├── physics/
│   │   ├── vehicle.js          # Vehicle model and physics
│   │   └── collisionManager.js # Collision detection system
│   ├── controls.js     # Keyboard input handler
│   └── index.js        # Main entry point and integration
├── server/
│   └── ...             # Server-side components (not yet implemented)
└── shared/
    └── ...             # Shared constants and utilities
```

## Future Expansion

The architecture is designed to accommodate future enhancements:
- Additional collision types (vehicle-vehicle, vehicle-props)
- Damage modeling on vehicles
- More advanced visual and audio feedback
- Integration with networking for multiplayer collision handling
