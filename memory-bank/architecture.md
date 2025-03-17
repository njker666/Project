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
  - **scene.js** - Implements a Scene class that encapsulates Three.js functionality including camera, renderer, lights, and the ground plane. Manages the render loop and performance monitoring.
- **ui/** - Responsible for user interface elements such as speedometer, mini-map, and menu systems. These components provide feedback to the player and allow interaction with game systems.
- **physics/** - Implements vehicle physics using Oimo.js, including acceleration, steering, collision detection, and other physical interactions in the game world.
- **index.html** - The main HTML file that creates the canvas element, loads the Three.js library via import maps, and initializes the JavaScript entry point.
- **index.js** - The entry point for client-side JavaScript that creates an instance of the Scene class and starts the animation loop.

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

This modular approach allows for clean separation between:
- Scene management (rendering/scene.js)
- Game logic (client/index.js)
- User interface (client/ui/)
- Physics (client/physics/)

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

## Performance Considerations
- Target frame rate: 30+ FPS
- Maximum network latency: 10ms
- Efficient use of Three.js rendering capabilities
- Physics optimizations through Oimo.js
- FPS monitoring to ensure performance targets are met

## Future Extensibility
The architecture is designed to allow for future additions such as:
- More detailed city districts
- Advanced traffic AI
- Additional gameplay modes (missions, challenges)
- Weather effects and day/night cycles
