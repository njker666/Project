/**
 * Urban Drive - Testing and Debugging
 * 
 * This file provides testing utilities for the final testing and debugging phase.
 * It includes performance monitoring, test scenarios, and automatic test execution.
 */

class TestSuite {
  constructor() {
    this.tests = [];
    this.results = {};
    this.metrics = {
      fps: [],
      latency: [],
      collisions: 0,
      positionErrors: 0,
      networkErrors: 0
    };
    this.testRunning = false;
    this.testInterval = null;
    this.lastFpsUpdate = 0;
    this.frameCount = 0;
    this.initDashboard();
  }

  initDashboard() {
    // Create test dashboard container
    this.dashboardContainer = document.createElement('div');
    this.dashboardContainer.id = 'test-dashboard';
    this.dashboardContainer.style.position = 'fixed';
    this.dashboardContainer.style.top = '10px';
    this.dashboardContainer.style.right = '10px';
    this.dashboardContainer.style.width = '300px';
    this.dashboardContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.dashboardContainer.style.color = 'white';
    this.dashboardContainer.style.padding = '10px';
    this.dashboardContainer.style.borderRadius = '5px';
    this.dashboardContainer.style.fontFamily = 'monospace';
    this.dashboardContainer.style.fontSize = '12px';
    this.dashboardContainer.style.zIndex = '1000';
    this.dashboardContainer.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: cyan;">Urban Drive Test Dashboard</h3>
      <div id="test-metrics">
        <div>FPS: <span id="test-fps">0</span></div>
        <div>Latency: <span id="test-latency">0</span> ms</div>
        <div>Collisions: <span id="test-collisions">0</span></div>
        <div>Position Errors: <span id="test-position-errors">0</span></div>
        <div>Network Errors: <span id="test-network-errors">0</span></div>
      </div>
      <hr style="margin: 10px 0; border-color: #444;">
      <div id="test-results" style="height: 150px; overflow-y: auto;"></div>
      <div id="test-controls" style="margin-top: 10px;">
        <button id="run-all-tests" style="background: #2a6496; color: white; border: none; padding: 5px 10px; margin-right: 5px; cursor: pointer;">Run All Tests</button>
        <button id="toggle-dashboard" style="background: #555; color: white; border: none; padding: 5px 10px; cursor: pointer;">Hide</button>
      </div>
    `;
    
    document.body.appendChild(this.dashboardContainer);
    
    // Add event listeners
    document.getElementById('run-all-tests').addEventListener('click', () => this.runAllTests());
    document.getElementById('toggle-dashboard').addEventListener('click', () => this.toggleDashboard());
  }

  toggleDashboard() {
    const metricsEl = document.getElementById('test-metrics');
    const resultsEl = document.getElementById('test-results');
    const toggleBtn = document.getElementById('toggle-dashboard');
    
    if (metricsEl.style.display === 'none') {
      metricsEl.style.display = 'block';
      resultsEl.style.display = 'block';
      toggleBtn.textContent = 'Hide';
      this.dashboardContainer.style.height = 'auto';
    } else {
      metricsEl.style.display = 'none';
      resultsEl.style.display = 'none';
      toggleBtn.textContent = 'Show';
      this.dashboardContainer.style.height = 'auto';
    }
  }

  addTest(name, testFn, timeout = 5000) {
    this.tests.push({ name, testFn, timeout });
    this.results[name] = { status: 'Not Run', message: '' };
    this.updateResultsDisplay();
  }

  updateMetrics(metrics) {
    // Update metrics
    if (metrics.fps !== undefined) {
      this.metrics.fps.push(metrics.fps);
      if (this.metrics.fps.length > 60) this.metrics.fps.shift();
      document.getElementById('test-fps').textContent = metrics.fps;
      
      // Set color based on performance
      const fpsEl = document.getElementById('test-fps');
      if (metrics.fps >= 30) {
        fpsEl.style.color = 'lightgreen';
      } else if (metrics.fps >= 20) {
        fpsEl.style.color = 'yellow';
      } else {
        fpsEl.style.color = 'red';
      }
    }
    
    if (metrics.latency !== undefined) {
      this.metrics.latency.push(metrics.latency);
      if (this.metrics.latency.length > 60) this.metrics.latency.shift();
      document.getElementById('test-latency').textContent = metrics.latency;
      
      // Set color based on performance
      const latencyEl = document.getElementById('test-latency');
      if (metrics.latency <= 10) {
        latencyEl.style.color = 'lightgreen';
      } else if (metrics.latency <= 20) {
        latencyEl.style.color = 'yellow';
      } else {
        latencyEl.style.color = 'red';
      }
    }
    
    if (metrics.collisions !== undefined) {
      this.metrics.collisions = metrics.collisions;
      document.getElementById('test-collisions').textContent = metrics.collisions;
    }
    
    if (metrics.positionErrors !== undefined) {
      this.metrics.positionErrors = metrics.positionErrors;
      document.getElementById('test-position-errors').textContent = metrics.positionErrors;
    }
    
    if (metrics.networkErrors !== undefined) {
      this.metrics.networkErrors = metrics.networkErrors;
      document.getElementById('test-network-errors').textContent = metrics.networkErrors;
    }
  }

  updateFps() {
    const now = performance.now();
    this.frameCount++;
    
    if (now - this.lastFpsUpdate >= 1000) {
      const fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsUpdate));
      this.updateMetrics({ fps });
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  async runTest(test) {
    console.log(`Running test: ${test.name}`);
    this.results[test.name] = { status: 'Running', message: '' };
    this.updateResultsDisplay();
    
    try {
      const result = await Promise.race([
        test.testFn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), test.timeout))
      ]);
      
      this.results[test.name] = { status: 'Passed', message: result || '' };
      console.log(`Test passed: ${test.name}`);
    } catch (error) {
      this.results[test.name] = { status: 'Failed', message: error.message };
      console.error(`Test failed: ${test.name}`, error);
    }
    
    this.updateResultsDisplay();
  }

  async runAllTests() {
    if (this.testRunning) return;
    
    this.testRunning = true;
    document.getElementById('run-all-tests').disabled = true;
    
    for (const test of this.tests) {
      await this.runTest(test);
    }
    
    this.testRunning = false;
    document.getElementById('run-all-tests').disabled = false;
  }

  updateResultsDisplay() {
    const resultsEl = document.getElementById('test-results');
    resultsEl.innerHTML = '';
    
    Object.entries(this.results).forEach(([name, result]) => {
      const resultEl = document.createElement('div');
      resultEl.style.marginBottom = '5px';
      resultEl.style.borderLeft = '3px solid';
      resultEl.style.paddingLeft = '5px';
      
      // Set color based on status
      if (result.status === 'Passed') {
        resultEl.style.borderColor = 'lightgreen';
      } else if (result.status === 'Failed') {
        resultEl.style.borderColor = 'red';
      } else if (result.status === 'Running') {
        resultEl.style.borderColor = 'yellow';
      } else {
        resultEl.style.borderColor = 'gray';
      }
      
      resultEl.innerHTML = `
        <div><strong>${name}</strong> - <span style="color: ${this.getStatusColor(result.status)}">${result.status}</span></div>
        ${result.message ? `<div style="font-size: 10px; color: #aaa;">${result.message}</div>` : ''}
      `;
      
      resultsEl.appendChild(resultEl);
    });
  }

  getStatusColor(status) {
    switch (status) {
      case 'Passed': return 'lightgreen';
      case 'Failed': return 'red';
      case 'Running': return 'yellow';
      default: return 'gray';
    }
  }

  // Call this method in the animation loop
  update() {
    this.updateFps();
  }
}

// Test scenarios
const testScenarios = {
  // Rendering performance test
  testRenderingPerformance: async (testSuite) => {
    const minFps = Math.min(...testSuite.metrics.fps);
    const avgFps = testSuite.metrics.fps.reduce((sum, fps) => sum + fps, 0) / 
                   (testSuite.metrics.fps.length || 1);
    
    if (minFps < 25) {
      throw new Error(`Minimum FPS below threshold: ${minFps.toFixed(1)} (target: 30+)`);
    }
    
    return `Avg FPS: ${avgFps.toFixed(1)}, Min FPS: ${minFps.toFixed(1)}`;
  },
  
  // Network latency test
  testNetworkLatency: async (testSuite) => {
    if (testSuite.metrics.latency.length === 0) {
      throw new Error('No latency data available');
    }
    
    const maxLatency = Math.max(...testSuite.metrics.latency);
    const avgLatency = testSuite.metrics.latency.reduce((sum, latency) => sum + latency, 0) / 
                       testSuite.metrics.latency.length;
    
    if (maxLatency > 20) {
      throw new Error(`Maximum latency exceeds threshold: ${maxLatency.toFixed(1)}ms (target: <10ms)`);
    }
    
    return `Avg Latency: ${avgLatency.toFixed(1)}ms, Max Latency: ${maxLatency.toFixed(1)}ms`;
  },
  
  // Collision detection test
  testCollisionDetection: async () => {
    return new Promise((resolve, reject) => {
      // This test will be manually triggered by driving into a building
      setTimeout(() => {
        if (window.testCollisionOccurred) {
          resolve('Collision detected and handled correctly');
        } else {
          reject(new Error('No collision detected within timeout period'));
        }
      }, 3000);
    });
  },
  
  // Multiplayer sync test
  testMultiplayerSync: async () => {
    return new Promise((resolve, reject) => {
      // Check if other players are being rendered
      if (window.otherPlayersCount > 0) {
        resolve(`Synchronized with ${window.otherPlayersCount} other players`);
      } else {
        reject(new Error('No other players detected for sync test'));
      }
    });
  },
  
  // Console error check
  testConsoleErrors: async () => {
    // Create a hook to capture errors
    if (!window._errorLog) window._errorLog = [];
    
    // If we already have errors, report them
    if (window._errorLog.length > 0) {
      throw new Error(`Found ${window._errorLog.length} console errors`);
    }
    
    return 'No console errors detected';
  }
};

// Create the test suite instance
const testSuite = new TestSuite();

// Add test scenarios
testSuite.addTest('Rendering Performance', () => testScenarios.testRenderingPerformance(testSuite));
testSuite.addTest('Network Latency', () => testScenarios.testNetworkLatency(testSuite));
testSuite.addTest('Collision Detection', testScenarios.testCollisionDetection);
testSuite.addTest('Multiplayer Synchronization', testScenarios.testMultiplayerSync);
testSuite.addTest('Console Error Check', testScenarios.testConsoleErrors);

// Hook into console.error to catch errors
const originalConsoleError = console.error;
console.error = function() {
  if (!window._errorLog) window._errorLog = [];
  window._errorLog.push(Array.from(arguments));
  originalConsoleError.apply(console, arguments);
};

// Export the test suite
window.testSuite = testSuite;

// Initialize global variables for tests
window.testCollisionOccurred = false;
window.otherPlayersCount = 0;

// Log initialization
console.log('Test suite initialized - ready for final testing and debugging');

export default testSuite; 