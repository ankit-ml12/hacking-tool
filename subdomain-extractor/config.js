// Google Apps Script Configuration
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby8Hvt_2EL4IoCA86hRThirJoVMkBD-dL61JmdHRIGO7clqGSQ-S0WsDUfNEwM3yM6E/exec',
  BATCH_SIZE: 50, // Send 50 subdomains per batch
  SYNC_INTERVAL: 30000, // Sync every 30 seconds
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG
}
