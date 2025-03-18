# Implementation Plan for "Urban Drive" Base Game

This document provides a detailed, step-by-step implementation plan for AI developers to build the base version of "Urban Drive," an open-world driving game set in a city environment. The plan focuses on establishing a functional foundation using JavaScript, Three.js, Node.js, Express, and WebSocket. Each step is small, specific, and includes a test to validate correct implementation. The base game includes a 3D city, a player-controlled vehicle, basic controls, a simple traffic system, and multiplayer networking.

## Performance Targets
- Minimum 30 FPS on modern browsers
- Maximum network latency of 10 milliseconds
- All steps should be completed within 1-2 days each

---

## Step 1: Set Up the Project Structure

- Create a new directory named `urban-drive`.
- Inside `urban-drive`, create three subdirectories: `client`, `server`, and `shared`.
- In the `client` directory, create subdirectories: `rendering`, `ui`, and `physics`.
- In the `server` directory, create subdirectories: `network` and `game-state`.
- In the `shared` directory, create a file named `config.js` to store shared constants (e.g., maximum players, tick rate).

**Test:**
- Navigate to the `urban-drive` directory and confirm the structure: `client`, `server`, `shared`, with their respective subdirectories and `config.js` present.

**Timeframe:** 1-2 days

---

## Step 2: Set Up the Development Environment

- Install Node.js (version 16 or later) on your system.
- Install Visual Studio Code (VS Code) or a similar code editor.
- Open a terminal in the `urban-drive` directory and run `npm init -y` to create a `package.json` file.
- Install dependencies: run `npm install three express ws parcel oimo` to add Three.js, Express, WebSocket, Parcel, and Oimo.js physics library.
- In the `client` directory, create an `index.html` file with a `<canvas>` element for rendering.

**Test:**
- Run `npm install` again to ensure all dependencies are listed in `package.json` and installed in `node_modules`.
- Create a simple script in `client/index.js` (e.g., log "Hello World" to console), then run `npx parcel index.html` in the `client` directory.
- Open the browser to `http://localhost:1234` and check the console for "Hello World".

**Timeframe:** 1-2 days

---

## Step 3: Create a Basic 3D Scene with Three.js

- In `client/rendering`, create a file named `scene.js`.
- Import Three.js and set up a scene with a perspective camera, WebGL renderer, and a flat plane (e.g., a 100x100 unit square) as the ground.
- Add a directional light to illuminate the scene.
- Use `requestAnimationFrame` to create a render loop that updates the renderer.
- Implement an FPS counter to monitor performance and ensure it stays above 30 FPS.

**Test:**
- Update `client/index.js` to import and call the scene setup from `scene.js`.
- Run `npx parcel index.html` and open the browser to see a lit, flat ground plane rendered in the canvas.
- Verify the FPS counter shows at least 30 FPS.

**Timeframe:** 1-2 days

---

## Step 4: Implement Basic Keyboard Controls

- In the `client` directory, create a file named `controls.js`.
- Add event listeners for keydown and keyup events on the window object.
- Track the state of arrow keys (up for acceleration, down for braking, left/right for steering) and spacebar (handbrake) using a simple object (e.g., `{ up: false, down: false }`).
- Create a basic update function that logs the control state each frame.

**Test:**
- Import `controls.js` into `index.js` and call its update function in the render loop.
- Run the game, press each key (up, down, left, right, space), and check the console for correct state changes (e.g., "Up pressed" when holding the up arrow).

**Timeframe:** 1-2 days

---

## Step 5: Add a Simple Player Vehicle with Oimo.js Physics

- In `client/physics`, create a file named `vehicle.js`.
- Import Oimo.js for physics simulation.
- Define a vehicle object with a basic Three.js mesh (a box with minimum curves for the car body) and initial position/orientation.
- Create an Oimo.js rigid body for the vehicle with appropriate mass and dimensions.
- Update the vehicle's position based on physics simulation and control inputs: move forward/backward with up/down arrows, rotate with left/right arrows.
- Add the vehicle mesh to the scene in `scene.js`.

**Test:**
- Run the game and verify the vehicle appears on the ground plane.
- Press arrow keys to ensure the vehicle moves forward/backward and turns left/right with physics-based movement.
- Confirm the vehicle reacts to acceleration, braking, and steering with appropriate physics behavior.

**Timeframe:** 1-2 days

---

## Step 6: Create a Diverse City Layout with Districts

- In `client/rendering`, create a file named `city.js`.
- Implement a grid-based city layout with multiple distinct districts:
  - Downtown: Tall buildings clustered closely together
  - Suburbs: Smaller buildings with more space between them
  - Industrial: Large warehouse-like structures
  - Waterfront: Buildings along a simulated waterline
- Create roads connecting these districts using flat plane geometries.
- Add simple box-based buildings with minimal detailing and unique characteristics for each district.
- Import and call the city setup in `scene.js` to add these objects to the scene.

**Test:**
- Run the game and confirm the road grid and distinct district buildings render correctly in the 3D scene.
- Drive the vehicle around to ensure it stays on the roads visually.
- Verify each district has a unique architectural style and layout.

**Timeframe:** 1-2 days

---

## Step 7: Implement Collision Detection with Oimo.js

- In `client/physics/vehicle.js`, enhance the simplified physics model with collision detection:
  - Leverage existing Oimo.js integration but maintain our direct control approach for vehicle stability
  - Create physics bodies for buildings and other obstacles
  - Set up collision events that affect the vehicle state without interfering with rotation control
  - Implement collision responses that feel realistic but prioritize gameplay over strict physical accuracy
- Add visual feedback for collisions (e.g., particle effects, sound cues)
- Ensure collision detection doesn't reintroduce the orientation issues we've solved

**Test:**
- Drive the vehicle toward a building and confirm it collides physically instead of passing through
- Test collisions at different speeds to ensure physics responses are appropriate
- Verify that the car maintains proper upright orientation during and after collisions
- Ensure that collision detection performs well and maintains the target 30 FPS

**Timeframe:** 1-2 days

---

## Step 8: Add Basic UI Elements

- In `client/ui`, create a file named `hud.js`.
- Implement a speedometer that displays the vehicle's current speed.
- Create a mini-map showing a top-down view of the city and the player's position.
- Add a placeholder for a menu system (e.g., a button that opens a simple panel).
- Make sure UI elements are positioned appropriately on screen and scale with the window size.

**Test:**
- Run the game and confirm the speedometer updates correctly based on vehicle speed.
- Verify the mini-map shows the player's position accurately as they drive around.
- Test the menu placeholder button to ensure it opens and closes correctly.

**Timeframe:** 1-2 days

---

## Step 9: Set Up the Server with Node.js and Express

- In the `server` directory, create a file named `server.js`.
- Import Express, create an app instance, and set it to serve static files from the `client` directory.
- Start the server on port 3000 and log a message (e.g., "Server running on port 3000").
- Implement basic server monitoring to track performance metrics like latency.

**Test:**
- Run `node server.js` in the `server` directory and check the console for the startup message.
- Open a browser to `http://localhost:3000` and verify the client's `index.html` loads with the 3D scene.
- Confirm server performance metrics are within the target range (≤10ms latency).

**Timeframe:** 1-2 days

---

## Step 10: Implement WebSocket for Multiplayer

- In `server/network`, create a file named `websocket.js`.
- Import the `ws` library and create a WebSocket server attached to the Express server's port (3000).
- Add event listeners to log when clients connect or disconnect.
- Implement a ping/pong mechanism to monitor connection latency.

**Test:**
- Update `server.js` to integrate `websocket.js`.
- Run the server, open two browser tabs to `http://localhost:3000`, and check the server console for connection/disconnection logs from both clients.
- Verify the ping/pong mechanism reports latency under 10ms.

**Timeframe:** 1-2 days

---

## Step 11: Implement Client-Side Prediction and Reconciliation

- In `client/physics/vehicle.js`, implement client-side prediction:
  - Apply local physics updates immediately without waiting for server confirmation.
  - Keep a history of input commands and timestamps.
- In `server/network/websocket.js`, implement server-side physics and broadcast authoritative positions.
- In `client/physics/vehicle.js`, add reconciliation:
  - Upon receiving server updates, reapply inputs since the last acknowledged state if needed.
  - Smoothly correct any discrepancies between client prediction and server state.

**Test:**
- Open two browser tabs and verify smooth movement in both clients.
- Intentionally create network delay (e.g., using browser dev tools) and confirm the client still provides responsive controls.
- Verify reconciliation by checking that the vehicle position remains consistent across clients.

**Timeframe:** 1-2 days

---

## Step 12: Sync Player Vehicle Positions

- In `client/physics/vehicle.js`, send the vehicle's position and rotation to the server via WebSocket every 33ms (approximately 30 updates/sec).
- In `server/network/websocket.js`, broadcast received player positions to all connected clients.
- In `client/rendering/scene.js`, render other players' vehicles as simple boxes with minimal curves based on received position data.

**Test:**
- Open two browser tabs, move the vehicle in one tab, and confirm the other tab shows the movement in near real-time.
- Verify that each player's vehicle appears as a distinct object in the scene.
- Check that the network updates maintain latency under 10ms.

**Timeframe:** 1-2 days

---

## Step 13: Implement a Basic Traffic System

- In `server/game-state`, create a file named `traffic.js`.
- Define a few AI-controlled vehicles (e.g., 5) with predefined paths along the city roads (e.g., move 1 unit per tick).
- Update their positions every 33ms (30 Hz tick rate) and broadcast them to clients via WebSocket.
- In `client/rendering/scene.js`, render traffic vehicles as distinct meshes (simple boxes with minimal curves).

**Test:**
- Run the game and ensure traffic vehicles appear and move along roads in both browser tabs.
- Confirm all players see the same traffic vehicle positions.
- Verify the traffic system doesn't impact the target 30 FPS performance.

**Timeframe:** 1-2 days

---

## Step 14: Final Testing and Debugging

- Play the game in multiple browser tabs, driving around the city and interacting with traffic.
- Check for issues like vehicles passing through objects, inconsistent multiplayer sync, or performance lag.
- Use console logs to track FPS (should stay above 30) and network events (latency should stay under 10ms).
- Fix any identified bugs, such as adjusting collision boundaries or reducing update frequency if lag occurs.

**Test:**
- Drive around for 5 minutes in two tabs, ensuring smooth movement, no crashes, and consistent multiplayer syncing.
- Confirm FPS stays above 30 and no major errors appear in the console.
- Verify that network latency remains under 10ms during gameplay.

**Timeframe:** 1-2 days

---

## Conclusion

This plan outlines the creation of a base "Urban Drive" game with a 3D city with diverse districts, player-controlled vehicle with physics, basic controls, UI elements including speedometer and mini-map, a simple traffic system, and multiplayer functionality with client-side prediction. The implementation focuses on maintaining 30+ FPS performance and network latency under 10ms. By following these steps, developers will have a solid foundation to expand with additional features later. Each step includes a clear test to ensure correctness, making it suitable for manual testing and validation.

Note that weather effects, day/night cycles, and gameplay modes beyond Free Drive are intentionally excluded from this initial implementation to focus on core functionality.