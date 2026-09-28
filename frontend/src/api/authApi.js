import { apiRequest } from "./client";

export const authApi = {
  // Register a new user in Firebase Auth and PostgreSQL
  signUp: async (userData) => {
    return await apiRequest("/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  // Health check
  checkHealth: async () => {
    return await apiRequest("/health", {
      method: "GET",
      retries: 0, // Quick single probe; AuthContext manages polling interval
      timeout: 5000,
    });
  },

  // Get Swagger documentation JSON
  getSwaggerDoc: async () => {
    return await apiRequest("/api-docs.json", {
      method: "GET",
    });
  },
};
