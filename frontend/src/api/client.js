import { auth } from "../config/firebase";
import appConfig from "../config/appConfig";

// API URL Configuration
export const getApiBaseUrl = () => {
  return localStorage.getItem("syncfit_api_url") || appConfig.api.baseUrl;
};

export const setApiBaseUrl = (url) => {
  if (!url) {
    localStorage.removeItem("syncfit_api_url");
  } else {
    localStorage.setItem("syncfit_api_url", url.replace(/\/+$/, ""));
  }
};

// Retry Configuration loaded from appConfig
let globalRetryConfig = {
  retries: appConfig.api.maxRetries,
  initialRetryDelay: appConfig.api.initialRetryDelay,
  backoffFactor: appConfig.api.backoffFactor,
  timeout: appConfig.api.timeout,
  retryOn500: appConfig.api.retryOn500,
};

export const getApiRetryConfig = () => ({ ...globalRetryConfig });

export const setApiRetryConfig = (newConfig = {}) => {
  globalRetryConfig = {
    ...globalRetryConfig,
    ...newConfig,
  };
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Checks if the error or HTTP response status indicates the server is not responding or unavailable.
 */
export const isServerNotResponding = (error, status, retryOn500 = false) => {
  if (status) {
    if ([502, 503, 504].includes(status)) {
      return true;
    }
    if (retryOn500 && status === 500) {
      return true;
    }
  }

  if (error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return true;
    }
    if (error.name === "TypeError") {
      return true;
    }
    if (error.status === 0 || error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return true;
    }
    const msg = (error.message || "").toLowerCase();
    if (
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("load failed") ||
      msg.includes("unable to reach") ||
      msg.includes("timed out") ||
      msg.includes("connection refused")
    ) {
      return true;
    }
  }

  return false;
};

const isNetworkError = (error) => {
  if (!error) return false;
  if (error.status === 0) return true;
  if (error.name === "TypeError") return true;
  if (error.name === "AbortError" || error.name === "TimeoutError") return true;
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("unable to reach") ||
    msg.includes("timed out") ||
    msg.includes("connection refused")
  );
};

/**
 * Universal Fetch Request Helper with Strict Firebase ID Token Authentication
 * Configured via appConfig.js: maxRetries 3 with doubling delay on each retry (2s -> 4s -> 8s)
 */
export async function apiRequest(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const {
    retries = globalRetryConfig.retries,
    initialRetryDelay = globalRetryConfig.initialRetryDelay,
    retryDelay = initialRetryDelay,
    backoffFactor = globalRetryConfig.backoffFactor,
    timeout = globalRetryConfig.timeout,
    retryOn500 = globalRetryConfig.retryOn500,
    onRetry,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // If not first attempt, wait with doubled backoff time before retrying
    if (attempt > 0) {
      // Calculate delay: doubles for each retry attempt (e.g. 2s -> 4s -> 8s)
      const currentDelay = retryDelay * Math.pow(backoffFactor, attempt - 1);

      if (typeof onRetry === "function") {
        try {
          onRetry(attempt, lastError, currentDelay);
        } catch (e) {
          console.warn("Error in onRetry callback:", e);
        }
      }
      console.warn(
        `[SyncFit API] Server not responding for ${fetchOptions.method || "GET"} ${endpoint}. Waiting ${currentDelay / 1000}s before retry ${attempt}/${retries}...`
      );
      await wait(currentDelay);
    }

    try {
      const headers = {
        "Content-Type": "application/json",
        ...customHeaders,
      };

      // Strictly attach Firebase ID Token if user is logged in
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
        } catch (e) {
          console.warn("Could not retrieve Firebase token:", e);
        }
      }

      // Configure request timeout if supported and caller did not provide conflicting signal
      let timeoutId = null;
      let signal = fetchOptions.signal;
      if (!signal && timeout > 0 && typeof AbortController !== "undefined") {
        const controller = new AbortController();
        signal = controller.signal;
        timeoutId = setTimeout(() => {
          controller.abort(new Error(`Server not responding: request timed out after ${timeout}ms`));
        }, timeout);
      }

      const config = {
        ...fetchOptions,
        headers,
        signal,
      };

      let response;
      try {
        response = await fetch(url, config);
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }

      // If server returned 502/503/504 (server not responding / unavailable), retry if attempts remain
      if (isServerNotResponding(null, response.status, retryOn500)) {
        if (attempt < retries) {
          lastError = new Error(`Server returned HTTP ${response.status} (${response.statusText || "Unavailable"})`);
          lastError.status = response.status;
          continue;
        }
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return { success: true };
      }

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMessage =
          (data && data.message) ||
          (data && data.error) ||
          `Request failed with status ${response.status}: ${response.statusText}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        error.errorCode = data?.errorCode;
        throw error;
      }

      return data;
    } catch (error) {
      lastError = error;

      // If the caller intentionally aborted via their own signal, do not retry
      if (fetchOptions.signal?.aborted) {
        throw error;
      }

      // If server is not responding and we haven't reached max retries, loop to wait and retry
      if (isServerNotResponding(error, error.status, retryOn500) && attempt < retries) {
        continue;
      }

      if (isNetworkError(error)) {
        const networkError = new Error(
          `Unable to reach backend server at ${baseUrl}. Ensure the backend is running on http://localhost:8080.`
        );
        networkError.status = 0;
        networkError.cause = error;
        throw networkError;
      }

      throw error;
    }
  }

  if (lastError) {
    if (isNetworkError(lastError)) {
      const networkError = new Error(
        `Unable to reach backend server at ${baseUrl}. Ensure the backend is running on http://localhost:8080.`
      );
      networkError.status = 0;
      networkError.cause = lastError;
      throw networkError;
    }
    throw lastError;
  }
}
