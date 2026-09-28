/**
 * SyncFit Global Application Configuration
 * Centralized settings for API endpoints, retry policies, backoff factors, and timeouts.
 */
export const appConfig = {
  api: {
    // Base URL for the backend API server
    baseUrl: process.env.REACT_APP_API_BASE_URL || "http://localhost:8080",

    // Maximum number of retry attempts when the server is not responding
    maxRetries: 3,

    // Initial wait delay in milliseconds before the first retry (2 seconds)
    initialRetryDelay: 2000,

    // Multiplier for backoff: doubles the wait time on each subsequent retry (2s -> 4s -> 8s)
    backoffFactor: 2,

    // Maximum request timeout in milliseconds before treating server as not responding (15s)
    timeout: 15000,

    // Whether to retry on HTTP 500 errors (in addition to network errors and 502/503/504)
    retryOn500: false,
  },

  healthCheck: {
    // Interval when backend is healthy (30 seconds)
    pollIntervalHealthy: 30000,

    // Retry interval when backend is offline or not responding (2 seconds)
    retryIntervalOffline: 2000,
  },
};

export default appConfig;
