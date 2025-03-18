# Urban Drive Architectural Overview

This document explains the architectural organization of the Urban Drive project, including the purpose of each directory and file.

## Directory Structure

### Project Root
```
urban-drive/ - Main project directory
├── client/ - Front-end code
│   ├── rendering/ - 3D scene rendering with Three.js
│   │   └── scene.js - Core Three.js scene implementation
│   ├── ui/ - User interface components
│   ├── physics/ - Vehicle physics and collision detection
│   │   └── vehicle.js - Vehicle implementation with Oimo.js physics
│   ├── controls.js - Keyboard input handling
│   ├── oimo.module.js - ES module wrapper for Oimo.js
│   ├── index.html - Main HTML entry point
│   └── index.js - JavaScript entry point
├── server/ - Back-end code
│   ├── network/ - WebSocket implementation for multiplayer
│   ├── game-state/ - Server-side game logic and state management
│   └── server.js - Express server for hosting the game
├── shared/ - Code shared between client and server
│   └── config.js - Shared constants and configuration
└── package.json - Project dependencies and scripts
```

## File Purposes

### Client Directory
- **rendering/** - Contains files that handle the Three.js scene setup, camera configuration, lighting, and rendering of the 3D world. This is where the visual representation of the game is managed.
  - **scene.js** - Implements a Scene class that encapsulates Three.js functionality including camera, renderer, lights, and the ground plane. Manages the render loop, performance monitoring, and camera following for vehicles.
- **ui/** - Responsible for user interface elements such as speedometer, mini-map, and menu systems. These components provide feedback to the player and allow interaction with game systems.
- **physics/** - Implements vehicle physics using Oimo.js, including acceleration, steering, collision detection, and other physical interactions in the game world.
  - **vehicle.js** - Defines the Vehicle class that manages the player's car using Oimo.js physics. Handles vehicle mesh creation, physics simulation, and movement in response to controls.
- **controls.js** - Manages keyboard input through a Controls class that tracks key states and provides an update interface for the game loop. Supports arrow keys, WASD, spacebar, and additional function keys.
- **oimo.module.js** - Provides an ES module wrapper around the global Oimo.js physics library to support imports in other files.
- **index.html** - The main HTML file that creates the canvas element, loads the Three.js and Oimo.js libraries, and includes UI elements for control state visualization.
- **index.js** - The entry point for client-side JavaScript that creates instances of the Scene, Controls, and Vehicle classes, updates visual indicators, and manages the game loop.

### Server Directory
- **network/** - Handles the WebSocket connections, player synchronization, and message passing between the server and connected clients. This ensures all players see a consistent game state.
- **game-state/** - Manages the authoritative game state, AI traffic systems, and server-side physics validation. This is where the "truth" of the game world is maintained.
- **server.js** - The Express server that serves the static client files, provides proper MIME types for ES modules, and will eventually host the WebSocket server for multiplayer functionality.

### Shared Directory
- **config.js** - Contains constants and configuration values used by both client and server, ensuring consistency across the entire application. This includes physics parameters, network settings, and game rules.

### Root Files
- **package.json** - Defines project dependencies, development tools, and npm scripts for running and building the game.

## Rendering Architecture
The rendering system is built around a central Scene class that:
1. Creates and manages the Three.js scene, camera, and renderer
2. Sets up lighting and creates the ground plane
3. Provides a responsive canvas that adjusts to window size
4. Implements the animation loop with performance monitoring
5. Offers methods for adding and manipulating 3D objects
6. Supports camera targeting and following for vehicles

This modular approach allows for clean separation between:
- Scene management (rendering/scene.js)
- Game logic (client/index.js)
- User interface (client/ui/)
- Physics (client/physics/)

## Physics System
The physics system is centered around the Vehicle class and Oimo.js:
1. Creates a physical representation of the vehicle using Oimo.js bodies
2. Applies forces based on control inputs (acceleration, braking, steering)
3. Updates the visual representation to match the physics state
4. Simulates realistic vehicle behavior including:
   - Variable steering sensitivity based on speed
   - Friction and damping for natural movement
   - Handbrake effects including drifting
   - Realistic acceleration and braking

The physics implementation balances realism with fun gameplay, providing:
- Responsive controls for an enjoyable driving experience
- Enough physical realism to create immersion
- Proper wheel rotation animations synchronized with vehicle speed
- A standalone physics world for each vehicle to simplify implementation

## Input System
The input system is managed through the Controls class that:
1. Sets up event listeners for keyboard input (keydown/keyup)
2. Tracks the state of control keys (arrows, WASD, spacebar, etc.)
3. Provides an update method that returns the current control state
4. Logs control state changes for debugging purposes
5. Supports both arrow keys and WASD for movement controls

The control state is used by:
- Visual indicators in the UI to show active controls
- The vehicle physics system to control movement
- The network system (in future steps) to send player inputs to the server

## Game Loop Architecture
The game uses two synchronized loops:
1. **Rendering Loop**: Managed by the Scene class, responsible for:
   - Updating and rendering the 3D scene
   - Calculating FPS for performance monitoring
   - Moving the camera to follow the vehicle
   - Returning delta time for animation consistency

2. **Game Loop**: Managed in index.js, responsible for:
   - Processing user input through the Controls class
   - Updating vehicle physics with the current control state
   - Updating visual indicators and UI elements
   - Ensuring consistent timing using delta time

## Camera System
The camera system provides a dynamic view of the game world:
1. Follows the player's vehicle from behind and slightly above
2. Smoothly interpolates to new positions for fluid movement
3. Rotates to match the vehicle's direction
4. Maintains an appropriate distance to show the surrounding environment

## Communication Flow
1. Client inputs are captured and processed locally for immediate feedback
2. Physics updates are calculated on the client for prediction
3. Player state is sent to the server via WebSocket
4. Server validates and updates the authoritative game state
5. Server broadcasts updated state to all connected clients
6. Clients reconcile any differences between predicted and actual states

## Development Workflow
1. Run `npm start` to start the Express server
2. Access the game at http://localhost:3000
3. For production builds, run `npm run build` to create optimized bundles

## Design Principles
- **Separation of Concerns**: The codebase is organized to separate rendering, physics, networking, and game logic.
- **Client-Side Prediction**: For responsive controls despite network latency
- **Server Authority**: Server maintains the "source of truth" for game state
- **Shared Constants**: Configuration values in shared/config.js ensure consistency between client and server
- **Class-Based Architecture**: Using ES6 classes for better organization and encapsulation
- **Responsive Design**: The canvas and UI adjust to window size changes
- **Physics-Based Movement**: Vehicle control uses physics simulation for realistic behavior

## Performance Considerations
- Target frame rate: 30+ FPS
- Maximum network latency: 10ms
- Efficient use of Three.js rendering capabilities
- Physics optimizations through Oimo.js
- FPS monitoring to ensure performance targets are met
- Throttled logging to avoid performance impacts from console output
- Simplified physics calculations for improved performance

## Future Extensibility
The architecture is designed to allow for future additions such as:
- More detailed city districts
- Advanced traffic AI
- Additional gameplay modes (missions, challenges)
- Weather effects and day/night cycles
- Support for additional input methods (gamepads, touch controls)
- More vehicle types with different physics characteristics
