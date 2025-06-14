import { Hono } from 'hono';
import debugCallbackRoutes from './src/controllers/DebugCallbackController';
import dataLoggerRoutes from './src/controllers/DataLoggerController'; // Import new controller

const honoApp = new Hono(); // Use honoApp consistently

// Register the debug callback routes under a specific path, e.g., /api
honoApp.route('/api/debug', debugCallbackRoutes);
honoApp.route('/api/datalogger', dataLoggerRoutes); // Register new routes

// Basic root endpoint
honoApp.get('/', (c) => { // Use honoApp
  return c.text('Hello Hono!');
});

console.log("Server starting on port 3000...");

// Export for Bun runtime
export default {
  port: 3000,
  fetch: honoApp.fetch, // Use honoApp.fetch
};

// Export the Hono app instance for testing
export { honoApp as appInstance };
