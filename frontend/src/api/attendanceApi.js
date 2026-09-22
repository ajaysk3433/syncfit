import { apiRequest } from "./client";

export const attendanceApi = {
  // Real-time facility occupancy and active attendees
  getOccupancy: async (maxCapacity = 150) => {
    return await apiRequest(`/v1/attendance/occupancy?maxCapacity=${maxCapacity}`, {
      method: "GET",
    });
  },

  // Member check-in
  checkIn: async (checkInData) => {
    return await apiRequest("/v1/attendance/check-in", {
      method: "POST",
      body: JSON.stringify(checkInData),
    });
  },

  // Member check-out
  checkOut: async (checkOutData) => {
    return await apiRequest("/v1/attendance/check-out", {
      method: "POST",
      body: JSON.stringify(checkOutData),
    });
  },

  // Auto check-out stale sessions
  autoCheckout: async (maxDurationHours = 4) => {
    return await apiRequest("/v1/attendance/auto-checkout", {
      method: "POST",
      body: JSON.stringify({ maxDurationHours }),
    });
  },

  // List attendance logs
  listAttendance: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page);
    if (params.limit) query.append("limit", params.limit);
    if (params.memberId) query.append("memberId", params.memberId);
    if (params.status) query.append("status", params.status);
    if (params.method) query.append("method", params.method);
    if (params.location) query.append("location", params.location);
    if (params.startDate) query.append("startDate", params.startDate);
    if (params.endDate) query.append("endDate", params.endDate);

    const qs = query.toString();
    return await apiRequest(`/v1/attendance${qs ? `?${qs}` : ""}`, {
      method: "GET",
    });
  },

  // Get single member attendance history & stats
  getMemberAttendanceHistory: async (memberId, params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page);
    if (params.limit) query.append("limit", params.limit);

    const qs = query.toString();
    return await apiRequest(`/v1/attendance/members/${memberId}${qs ? `?${qs}` : ""}`, {
      method: "GET",
    });
  },

  // Analytics Overview Stats
  getOverviewStats: async () => {
    return await apiRequest("/v1/attendance/analytics/overview", {
      method: "GET",
    });
  },

  // Peak Hours Heatmap Analytics
  getPeakHoursAnalytics: async () => {
    return await apiRequest("/v1/attendance/analytics/peak-hours", {
      method: "GET",
    });
  },

  // Member Visit Frequency & Churn Risk Insights
  getMemberFrequencyAnalytics: async () => {
    return await apiRequest("/v1/attendance/analytics/member-frequency", {
      method: "GET",
    });
  },
};
