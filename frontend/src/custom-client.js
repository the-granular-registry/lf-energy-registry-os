// Custom client script to reduce webpack-dev-server logging noise
module.exports = {
  log: {
    error: (message) => {
      // Only log critical errors
      if (message && typeof message === 'string' && message.includes('Failed to fetch')) {
        console.error(message);
      }
    },
    warn: () => {}, // Suppress warnings
    info: () => {}, // Suppress info messages
    debug: () => {}, // Suppress debug messages
  },
  onMessage: () => {},
  send: () => {},
}; 