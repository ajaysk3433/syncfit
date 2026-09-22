import { apiRequest } from "./client";

export const membersApi = {
  // List members with search, filters, pagination
  listMembers: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page);
    if (params.limit) query.append("limit", params.limit);
    if (params.search) query.append("search", params.search);
    if (params.tier) query.append("tier", params.tier);
    if (params.status) query.append("status", params.status);
    if (params.role) query.append("role", params.role);
    if (params.hasActiveMembership !== undefined && params.hasActiveMembership !== "") {
      query.append("hasActiveMembership", params.hasActiveMembership);
    }

    const qs = query.toString();
    return await apiRequest(`/v1/members${qs ? `?${qs}` : ""}`, {
      method: "GET",
    });
  },

  // Get member by ID with profile and membership history
  getMemberById: async (id) => {
    return await apiRequest(`/v1/members/${id}`, {
      method: "GET",
    });
  },

  // Onboard new member (creates Firebase Auth user + Postgres user + Profile + optional Plan)
  createMember: async (memberData) => {
    return await apiRequest("/v1/members", {
      method: "POST",
      body: JSON.stringify(memberData),
    });
  },

  // Update member profile fields
  updateMemberProfile: async (id, profileData) => {
    return await apiRequest(`/v1/members/${id}`, {
      method: "PATCH",
      body: JSON.stringify(profileData),
    });
  },

  // Update member status (Active, Suspended, Inactive, Pending)
  updateMemberStatus: async (id, statusData) => {
    return await apiRequest(`/v1/members/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(statusData),
    });
  },

  // Get member QR code token
  getMemberAccessQr: async (id) => {
    return await apiRequest(`/v1/members/${id}/access-qr`, {
      method: "GET",
    });
  },

  // Regenerate member QR code token
  regenerateMemberAccessQr: async (id) => {
    return await apiRequest(`/v1/members/${id}/access-qr/regenerate`, {
      method: "POST",
    });
  },
};
