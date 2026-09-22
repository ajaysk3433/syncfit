import React, { useState, useEffect, useCallback } from "react";
import { attendanceApi } from "../api/attendanceApi";
import { useToast } from "../context/ToastContext";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Flame,
  AlertTriangle,
  Award,
  RefreshCw,
  Mail,
} from "lucide-react";
import { TierBadge } from "../components/common/Badge";
import { LoadingSpinner } from "../components/common/LoadingSpinner";

export const AnalyticsPage = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [peakHours, setPeakHours] = useState(null);
  const [churnData, setChurnData] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, peakRes, churnRes] = await Promise.allSettled([
        attendanceApi.getOverviewStats(),
        attendanceApi.getPeakHoursAnalytics(),
        attendanceApi.getMemberFrequencyAnalytics(),
      ]);

      if (ovRes.status === "fulfilled") setOverview(ovRes.value?.stats || ovRes.value);
      if (peakRes.status === "fulfilled") setPeakHours(peakRes.value);
      if (churnRes.status === "fulfilled") setChurnData(churnRes.value);
    } catch (err) {
      toast.error(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Hourly traffic formatting for 24 hours
  const hourlyStats = peakHours?.hourlyStats || [];
  // Ensure array of 24 items exists
  const full24Hours = Array.from({ length: 24 }, (_, hour) => {
    const found = hourlyStats.find((h) => h.hour === hour || h.hourOfDay === hour);
    return {
      hour,
      count: found ? found.count || found.visits || 0 : 0,
    };
  });

  const maxVisitsInHour = Math.max(...full24Hours.map((h) => h.count), 1);

  const atRiskMembers = churnData?.atRiskMembers || churnData?.inactiveActiveMembers || [];
  const topMembers = churnData?.topMembers || churnData?.frequentVisitors || [];

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <BarChart3 size={28} style={{ color: "var(--accent-cyan)" }} />
            <span>Facility Intelligence & Retention</span>
          </h1>
          <p className="page-subtitle">
            Peak workout hours, gym utilization heatmaps, and churn risk prevention
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={fetchAnalytics}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "spinner" : ""} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Computing facility metrics and retention data..." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Overview Metric Cards */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon-wrapper cyan">
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Visits Today</div>
                <div className="stat-value">{overview?.visitsToday ?? 0}</div>
                <div className="stat-subtext">This Week: {overview?.visitsThisWeek ?? 0}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper purple">
                <Users size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Unique Members (Month)</div>
                <div className="stat-value">{overview?.uniqueMonthlyVisitors ?? 0}</div>
                <div className="stat-subtext">Total Visits: {overview?.visitsThisMonth ?? 0}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper emerald">
                <Clock size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Average Session Length</div>
                <div className="stat-value">
                  {overview?.avgDurationMinutes ? `${Math.round(overview.avgDurationMinutes)}m` : "58m"}
                </div>
                <div className="stat-subtext">Elapsed workout time</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper rose">
                <AlertTriangle size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Members at Churn Risk</div>
                <div className="stat-value" style={{ color: "var(--accent-rose)" }}>
                  {atRiskMembers.length}
                </div>
                <div className="stat-subtext">14+ days since last visit</div>
              </div>
            </div>
          </div>

          {/* 24-Hour Peak Facility Traffic Histogram */}
          <div className="glass-card">
            <div className="card-header">
              <div>
                <div className="card-title">
                  <Flame size={18} style={{ color: "var(--accent-gold)" }} />
                  <span>24-Hour Peak Facility Traffic Heatmap</span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Distribution of check-in volume throughout the day to forecast peak floor congestion
                </p>
              </div>

              <span
                style={{
                  fontSize: "12px",
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "var(--accent-gold)",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  fontWeight: 700,
                }}
              >
                Rush Hours: 06:00 - 09:00 & 17:00 - 20:00
              </span>
            </div>

            {/* Visual Histogram Bars */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(24, 1fr)",
                gap: "6px",
                alignItems: "flex-end",
                height: "180px",
                paddingTop: "24px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              {full24Hours.map((item) => {
                const heightPercent = Math.max(Math.round((item.count / maxVisitsInHour) * 100), 8);
                const isPeak = (item.hour >= 6 && item.hour <= 9) || (item.hour >= 17 && item.hour <= 20);

                return (
                  <div
                    key={item.hour}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "100%",
                      justifyContent: "flex-end",
                    }}
                    title={`${item.hour}:00 - ${item.count} visits`}
                  >
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      {item.count > 0 ? item.count : ""}
                    </span>
                    <div
                      style={{
                        width: "100%",
                        height: `${heightPercent}%`,
                        borderRadius: "4px 4px 0 0",
                        background: isPeak
                          ? "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)"
                          : "linear-gradient(180deg, #06b6d4 0%, #0284c7 100%)",
                        boxShadow: isPeak ? "0 0 10px rgba(245, 158, 11, 0.3)" : "none",
                        transition: "height 0.4s ease",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Hour Labels */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(24, 1fr)",
                gap: "6px",
                marginTop: "8px",
                textAlign: "center",
              }}
            >
              {full24Hours.map((item) => (
                <span
                  key={item.hour}
                  style={{
                    fontSize: "10px",
                    color: item.hour % 3 === 0 ? "var(--text-primary)" : "var(--text-muted)",
                    fontWeight: item.hour % 3 === 0 ? 700 : 400,
                  }}
                >
                  {item.hour}h
                </span>
              ))}
            </div>
          </div>

          {/* Bottom Grid: Churn Risk Alerts & Top Frequent Members */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
            {/* Churn Risk Members */}
            <div className="glass-card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <AlertTriangle size={18} style={{ color: "var(--accent-rose)" }} />
                    <span>Members at Churn Risk (14+ Days Inactive)</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Active paying members with zero recent check-ins. Reach out to re-engage!
                  </p>
                </div>
              </div>

              {atRiskMembers.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  No members currently flagged at high churn risk!
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Tier</th>
                        <th>Days Inactive</th>
                        <th style={{ textAlign: "right" }}>Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atRiskMembers.slice(0, 8).map((m, idx) => (
                        <tr key={idx}>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                {m.name || m.user?.name || "Member"}
                              </span>
                              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                {m.email || m.user?.email}
                              </span>
                            </div>
                          </td>
                          <td>
                            <TierBadge tier={m.memberTier || m.user?.memberTier} />
                          </td>
                          <td>
                            <span style={{ color: "var(--accent-rose)", fontWeight: 700, fontSize: "13px" }}>
                              {m.daysSinceLastVisit || m.inactiveDays || "14+"} Days
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <a
                              href={`mailto:${m.email || m.user?.email}`}
                              className="btn btn-secondary btn-sm"
                              title="Send Re-engagement Email"
                            >
                              <Mail size={13} />
                              <span>Outreach</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Frequent Members */}
            <div className="glass-card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <Award size={18} style={{ color: "var(--accent-gold)" }} />
                    <span>Top Active & Loyal Members</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Leaderboard of most frequent facility visitors this month
                  </p>
                </div>
              </div>

              {topMembers.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  Visit data will populate the leaderboard as check-ins occur.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {topMembers.slice(0, 6).map((item, rank) => (
                    <div
                      key={rank}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: rank === 0 ? "rgba(245, 158, 11, 0.1)" : "rgba(255, 255, 255, 0.02)",
                        border: `1px solid ${rank === 0 ? "rgba(245, 158, 11, 0.3)" : "var(--border-subtle)"}`,
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: rank === 0 ? "var(--accent-gold)" : "rgba(255, 255, 255, 0.1)",
                            color: rank === 0 ? "#000" : "#fff",
                            fontWeight: 800,
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {rank + 1}
                        </span>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>
                            {item.name || item.user?.name || `Member #${rank + 1}`}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>
                            {item.email || item.user?.email}
                          </span>
                        </div>
                      </div>

                      <span style={{ fontWeight: 700, color: "var(--accent-emerald)", fontSize: "13px" }}>
                        {item.visitCount || item.visits || 0} Check-Ins
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
