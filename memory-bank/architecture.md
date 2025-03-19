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

# Urban Drive Architecture: Multiplayer Implementation

This document provides an overview of the Urban Drive game's multiplayer architecture, detailing how real-time synchronization is implemented using client-side prediction and server reconciliation.

## Multiplayer System Overview

Urban Drive implements a multiplayer system that allows players to drive vehicles in a shared environment. The architecture follows an authoritative server model with client-side prediction for responsive gameplay.

### Key Design Principles

1. **Responsive Controls**: Players should experience immediate feedback when pressing controls
2. **Network Transparency**: Latency and network issues should be hidden from the player when possible
3. **Consistent Experience**: All players should see a consistent game state
4. **Cheat Prevention**: The server maintains authority to prevent cheating
5. **Bandwidth Efficiency**: Minimal data is transmitted to support many concurrent players

## Component Architecture

### Client Components

#### 1. Vehicle Class (`client/physics/vehicle.js`)
- Manages local vehicle physics simulation
- Implements client-side prediction
- Tracks input history for reconciliation
- Applies server corrections when received
- Handles visual representation and interpolation

#### 2. WebSocketConnection (`client/network/connection.js`)
- Manages WebSocket connection to server
- Sends position and input updates
- Handles incoming messages from server
- Processes server reconciliation messages
- Provides network status information

#### 3. OtherPlayersManager (`client/rendering/otherPlayers.js`)
- Manages the visual representation of other players
- Implements position interpolation for smooth movement
- Adds/removes players as they join/leave
- Updates player positions based on server data

### Server Components

#### 1. WebSocketServer (`server/network/websocket.js`)
- Manages all client connections
- Broadcasts player positions to all clients
- Validates client physics using server-side simulation
- Sends reconciliation messages when discrepancies are detected
- Handles player joining and leaving

#### 2. Server Physics (`server/network/websocket.js` > `physicsWorld`)
- Implements simplified but authoritative physics
- Validates client movement
- Detects and corrects physics violations
- Ensures consistent game state

## Data Flow and Synchronization

### Client-Side Prediction Flow

1. **Input Processing**:
   - User presses a control key
   - Control state is updated immediately
   - Input is processed locally to update vehicle position
   - Input is stored in history with sequence number

2. **State Transmission**:
   - Client sends input to server with sequence number
   - Position updates are sent at fixed rate (30 updates/sec)
   - Each update includes position, rotation, speed, and input sequence

3. **Receiving Updates**:
   - Client receives other player positions
   - Positions are interpolated for smooth movement
   - Client may receive reconciliation messages for its own position

4. **Reconciliation**:
   - When receiving a correction from server:
   - Client applies the authoritative state
   - All pending inputs since the reconciled state are reapplied
   - This maintains responsive controls while correcting drift

### Message Types

1. **Position Update** (Client → Server):
```json
{
  "type": "position",
  "position": { "x": 120.5, "y": 0.5, "z": 80.2 },
  "rotation": 1.57,
  "speed": 15.2,
  "sequence": 42,
  "controls": {
    "accelerate": true,
    "brake": false,
    "turnLeft": false,
    "turnRight": true,
    "handbrake": false
  },
  "timestamp": 1620000000000
}
```

2. **Player Position Broadcast** (Server → Clients):
```json
{
  "type": "playerPosition",
  "id": 3,
  "position": { "x": 120.5, "y": 0.5, "z": 80.2 },
  "rotation": 1.57,
  "speed": 15.2,
  "sequence": 42,
  "timestamp": 1620000000000,
  "interpolation": {
    "startTime": 1620000000000,
    "endTime": 1620000000033
  }
}
```

3. **Reconciliation Message** (Server → Client):
```json
{
  "type": "serverReconciliation",
  "sequence": 42,
  "state": {
    "position": { "x": 121.0, "y": 0.5, "z": 80.5 },
    "rotation": 1.58,
    "speed": 15.0
  },
  "timestamp": 1620000000000
}
```

## Interpolation and Smoothing

### Position Interpolation

For other players' movements, the client implements interpolation to ensure smooth transitions between position updates:

1. When a position update is received, it's stored as a target state
2. The client interpolates between current and target states over time
3. Interpolation factors in the timestamp and network latency
4. This creates smooth movement even with irregular updates

### Rotation Handling

Rotation interpolation uses the shortest path algorithm:
- Calculate the difference between current and target rotations
- Normalize to find the smallest angle (-π to +π)
- Interpolate along this shortest path

## Error Handling and Edge Cases

### Network Issues

The system is designed to handle common network issues:

1. **Packet Loss**:
   - Missed position updates: Interpolation continues to target position
   - Missed reconciliation: Next reconciliation will correct position

2. **High Latency**:
   - Client prediction continues to work locally
   - Reconciliation may be more frequent
   - Interpolation time is adjusted based on measured latency

3. **Disconnection**:
   - Client attempts to reconnect automatically
   - Server removes player after timeout
   - Other players are notified of disconnection

### Physics Discrepancies

When client and server physics disagree:

1. Small discrepancies are allowed for smoother gameplay
2. Significant discrepancies trigger reconciliation
3. Threshold values determine what constitutes "significant":
   - Position: > 0.5 units
   - Rotation: > 0.1 radians
   - Speed: > 1 unit

## Performance Considerations

### Bandwidth Optimization

1. Position updates are rate-limited (30 per second)
2. Only changed properties are sent when possible
3. Reconciliation messages are only sent when needed

### CPU Efficiency

1. Physics calculations are optimized for both client and server
2. Server uses simplified physics for validation
3. Interpolation is computationally efficient

## Future Improvements

1. **Delta Compression**: Send only changes in position rather than absolute values
2. **Prediction Verification**: Improve the algorithm to better predict client-side drift
3. **Binary Protocol**: Replace JSON with a binary protocol for smaller packet size
4. **Lag Compensation**: Add techniques to compensate for varying latencies between players
5. **Zone-Based Updates**: Only send position updates for players in the vicinity
