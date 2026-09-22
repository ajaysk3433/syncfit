import { auth } from "../config/firebase";

// API URL Configuration
const DEFAULT_API_URL = "http://localhost:8080";
export const getApiBaseUrl = () => {
  return localStorage.getItem("syncfit_api_url") || DEFAULT_API_URL;
};

export const setApiBaseUrl = (url) => {
  if (!url) {
    localStorage.removeItem("syncfit_api_url");
  } else {
    localStorage.setItem("syncfit_api_url", url.replace(/\/+$/, ""));
  }
};

// Dev Bypass Header Configuration
export const getDevUserId = () => {
  return localStorage.getItem("syncfit_dev_user_id") || "";
};

export const setDevUserId = (userId) => {
  if (!userId) {
    localStorage.removeItem("syncfit_dev_user_id");
  } else {
    localStorage.setItem("syncfit_dev_user_id", userId);
  }
};

/**
 * Universal Fetch Request Helper
 */
export async function apiRequest(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Attach Firebase ID Token if logged in
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Could not get Firebase token:", e);
    }
  }

  // Attach Dev User Bypass Header if set
  const devUserId = getDevUserId();
  if (devUserId && !headers["Authorization"]) {
    headers["x-user-id"] = devUserId;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

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
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      const networkError = new Error(
        `Unable to reach backend server at ${baseUrl}. Ensure backend is running on http://localhost:8080.`
      );
      networkError.status = 0;
      throw networkError;
    }
    throw error;
  }
}
