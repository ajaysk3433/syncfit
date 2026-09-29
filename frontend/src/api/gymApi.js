import { apiRequest } from "./client";

export const gymApi = {
  /**
   * Get active gym QR code details
   * @param {string} [gymId]
   * @param {string} [code]
   */
  getGymQr: async (gymId, code) => {
    let url = "/v1/gym/qr";
    const params = new URLSearchParams();
    if (gymId) params.append("gymId", gymId);
    if (code) params.append("code", code);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    return await apiRequest(url, { method: "GET" });
  },

  /**
   * Regenerate default or gym facility QR code token
   * @param {string} [gymId]
   */
  regenerateGymQr: async (gymId) => {
    return await apiRequest("/v1/gym/qr/regenerate", {
      method: "POST",
      body: JSON.stringify({ gymId }),
    });
  },

  /**
   * List all gym locations
   */
  listGyms: async () => {
    return await apiRequest("/v1/gyms", { method: "GET" });
  },

  /**
   * Update gym details
   */
  updateGym: async (id, data) => {
    return await apiRequest(`/v1/gym/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
