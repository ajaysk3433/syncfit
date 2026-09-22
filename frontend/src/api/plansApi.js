import { apiRequest } from "./client";

export const plansApi = {
  // List all plans
  listPlans: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.tier) query.append("tier", params.tier);
    if (params.isActive !== undefined && params.isActive !== "") query.append("isActive", params.isActive);
    if (params.search) query.append("search", params.search);

    const qs = query.toString();
    return await apiRequest(`/v1/membership-plans${qs ? `?${qs}` : ""}`, {
      method: "GET",
    });
  },

  // Get plan by ID
  getPlanById: async (id) => {
    return await apiRequest(`/v1/membership-plans/${id}`, {
      method: "GET",
    });
  },

  // Create plan (Admin / Manager)
  createPlan: async (planData) => {
    return await apiRequest("/v1/membership-plans", {
      method: "POST",
      body: JSON.stringify(planData),
    });
  },

  // Update plan (Admin / Manager)
  updatePlan: async (id, planData) => {
    return await apiRequest(`/v1/membership-plans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(planData),
    });
  },

  // Assign membership plan to member
  assignMembership: async (memberId, data) => {
    return await apiRequest(`/v1/members/${memberId}/memberships`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Get member subscription history
  getMemberMemberships: async (memberId) => {
    return await apiRequest(`/v1/members/${memberId}/memberships`, {
      method: "GET",
    });
  },

  // Pause / freeze membership
  pauseMembership: async (memberId, data = {}) => {
    return await apiRequest(`/v1/members/${memberId}/memberships/pause`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Resume membership (extends end date)
  resumeMembership: async (memberId) => {
    return await apiRequest(`/v1/members/${memberId}/memberships/resume`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  // Cancel membership
  cancelMembership: async (memberId, data) => {
    return await apiRequest(`/v1/members/${memberId}/memberships/cancel`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Renew membership
  renewMembership: async (memberId, data = {}) => {
    return await apiRequest(`/v1/members/${memberId}/memberships/renew`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Upgrade membership tier / change plan
  upgradeMembership: async (memberId, data) => {
    return await apiRequest(`/v1/members/${memberId}/memberships/upgrade`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
