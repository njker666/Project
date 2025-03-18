/**
 * Urban Drive - Keyboard Controls
 * Handles keyboard input for vehicle control
 */

// Control state object to track pressed keys
class Controls {
  constructor() {
    // Initialize control states
    this.keys = {
      up: false,      // Acceleration (up arrow or W)
      down: false,    // Braking/Reverse (down arrow or S)
      left: false,    // Left steering (left arrow or A)
      right: false,   // Right steering (right arrow or D)
      space: false    // Handbrake (spacebar)
    };
    
    // Additional keys for common functionality
    this.additionalKeys = {
      h: false,      // Horn
      c: false,      // Camera toggle
      q: false,      // Left indicator
      e: false       // Right indicator
    };
    
    // Bind event handlers to maintain 'this' context
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    
    // Initialize event listeners
    this._setupEventListeners();
    
    // For throttling console logs
    this.lastLogTime = 0;
    this.logInterval = 500; // Log at most every 500ms
    
    // Log initialization
    console.log('Keyboard controls initialized');
  }
  
  // Set up event listeners for keyboard input
  _setupEventListeners() {
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
  }
  
  // Clean up event listeners (useful when destroying the control instance)
  cleanup() {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
  }
  
  // Handle keydown events
  _handleKeyDown(event) {
    // Prevent default behavior for game control keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'h', 'c', 'q', 'e'].includes(event.key)) {
      event.preventDefault();
    }
    
    this._updateKeyState(event.key, true);
  }
  
  // Handle keyup events
  _handleKeyUp(event) {
    this._updateKeyState(event.key, false);
  }
  
  // Update the state of a specific key
  _updateKeyState(key, isPressed) {
    const currentTime = performance.now();
    const shouldLog = isPressed && (currentTime - this.lastLogTime > this.logInterval);
    
    // Handle arrow keys and WASD
    switch(key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.keys.up = isPressed;
        if (shouldLog && isPressed) {
          console.log('Acceleration pressed - control state:', this.keys);
          this.lastLogTime = currentTime;
        }
        break;
        
      case 'ArrowDown':
      case 's':
      case 'S':
        this.keys.down = isPressed;
        if (shouldLog && isPressed) {
          console.log('Braking/Reverse pressed - control state:', this.keys);
          this.lastLogTime = currentTime;
        }
        break;
        
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.keys.left = isPressed;
        if (shouldLog && isPressed) {
          console.log('Left steering pressed - control state:', this.keys);
          this.lastLogTime = currentTime;
        }
        break;
        
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.keys.right = isPressed;
        if (shouldLog && isPressed) {
          console.log('Right steering pressed - control state:', this.keys);
          this.lastLogTime = currentTime;
        }
        break;
        
      case ' ':  // Spacebar
        this.keys.space = isPressed;
        if (shouldLog && isPressed) {
          console.log('Handbrake pressed - control state:', this.keys);
          this.lastLogTime = currentTime;
        }
        break;
        
      // Additional controls
      case 'h':
      case 'H':
        this.additionalKeys.h = isPressed;
        if (shouldLog && isPressed) {
          console.log('Horn pressed');
          this.lastLogTime = currentTime;
        }
        break;
        
      case 'c':
      case 'C':
        // Only trigger once on keydown to toggle
        if (isPressed) {
          this.additionalKeys.c = !this.additionalKeys.c;
          if (shouldLog) {
            console.log(`Camera view toggled: ${this.additionalKeys.c ? 'First Person' : 'Third Person'}`);
            this.lastLogTime = currentTime;
          }
        }
        break;
        
      case 'q':
      case 'Q':
        this.additionalKeys.q = isPressed;
        if (shouldLog && isPressed) {
          console.log('Left indicator toggled');
          this.lastLogTime = currentTime;
        }
        break;
        
      case 'e':
      case 'E':
        this.additionalKeys.e = isPressed;
        if (shouldLog && isPressed) {
          console.log('Right indicator toggled');
          this.lastLogTime = currentTime;
        }
        break;
    }
  }
  
  // Update function to be called each frame
  update() {
    // For debugging: throttle log messages to avoid console spam
    const currentTime = performance.now();
    if (currentTime - this.lastLogTime > this.logInterval) {
      if (this.keys.up || this.keys.down || this.keys.left || this.keys.right || this.keys.space) {
        console.log('Control state:', {
          acceleration: this.keys.up,
          braking: this.keys.down,
          steeringLeft: this.keys.left,
          steeringRight: this.keys.right,
          handbrake: this.keys.space
        });
        this.lastLogTime = currentTime;
      }
    }
    
    // Return the current state for use by other components
    return {
      ...this.keys,
      ...this.additionalKeys
    };
  }
}

export default Controls; 