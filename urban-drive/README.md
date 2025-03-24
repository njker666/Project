# Urban Drive

Open-world driving game set in a city environment with multiplayer capability, built with Three.js, Oimo.js, and WebSocket.

## Features

- 3D city environment with distinct districts
- Physics-based vehicle movement with collision detection
- Multiplayer support with real-time position synchronization
- AI traffic system with path following
- User interface with speedometer, minimap, and collision feedback
- Comprehensive testing framework for debugging and performance monitoring

## Installation

1. Clone the repository
2. Install dependencies:
```
npm install
```

## Running the Game

Start the server with:
```
npm run server
```

Or for development with automatic restart on changes:
```
npm run server:dev
```

Then open a browser and navigate to:
```
http://localhost:3000
```

## Game Controls

- **Arrow keys** or **WASD**: Drive the vehicle
- **Spacebar**: Handbrake
- Menu button in the top-right corner: Access game menu

## Testing and Debugging

The game includes a comprehensive testing framework for debugging and performance monitoring. The test dashboard appears in the top-right corner of the game screen.

### Test Dashboard Features

- **FPS Counter**: Displays current frames per second (green if above 30 FPS)
- **Latency Monitor**: Shows WebSocket latency (green if below 10ms)
- **Collision Counter**: Tracks collisions with buildings
- **Position Errors**: Indicates reconciliation errors between client and server
- **Network Errors**: Shows WebSocket connection issues

### Running Tests

Click the "Run All Tests" button on the dashboard to execute automated tests:

1. **Rendering Performance**: Verifies FPS stays above target threshold
2. **Network Latency**: Checks that WebSocket latency stays below target
3. **Collision Detection**: Tests building collision detection functionality
4. **Multiplayer Synchronization**: Verifies player synchronization works correctly
5. **Console Error Check**: Ensures no unexpected errors are occurring

### Hiding/Showing the Dashboard

Click the "Hide" button to collapse the dashboard and leave only the controls visible. Click "Show" to expand it again.

## Architecture

The game is built using a modular architecture:

- **/client**: Front-end code (rendering, UI, physics)
- **/server**: Back-end code (WebSocket, game state)
- **/shared**: Code shared between client and server (constants, utilities)

Key technologies:
- **Three.js**: 3D rendering
- **Oimo.js**: Physics simulation
- **WebSocket**: Real-time communication
- **Express**: Server framework

## Development

The project uses ES6 modules and is built with:
- **Parcel**: For bundling
- **Nodemon**: For auto-restarting the server during development

## Performance Targets

- **FPS**: Minimum 30 FPS on modern browsers
- **Latency**: Maximum 10ms network latency
- **Players**: Support for up to 32 simultaneous players 