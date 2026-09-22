import React, { useState, useEffect, useCallback } from "react";
import { attendanceApi } from "../api/attendanceApi";
import { useToast } from "../context/ToastContext";
import { OccupancyGauge } from "../components/attendance/OccupancyGauge";
import { ActiveAttendeesList } from "../components/attendance/ActiveAttendeesList";
import { QuickCheckInModal } from "../components/attendance/QuickCheckInModal";
import {
  Users,
  Activity,
  UserCheck,
  Clock,
  TrendingUp,
  QrCode,
  RefreshCw,
} from "lucide-react";

export const DashboardPage = () => {
  const toast = useToast();
  const [occupancy, setOccupancy] = useState(null);
  const [overviewStats, setOverviewStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [occRes, statsRes] = await Promise.allSettled([
        attendanceApi.getOccupancy(150),
        attendanceApi.getOverviewStats(),
      ]);

      if (occRes.status === "fulfilled") {
        setOccupancy(occRes.value?.data || occRes.value);
      }
      if (statsRes.status === "fulfilled") {
        setOverviewStats(statsRes.value?.data || statsRes.value?.stats || statsRes.value);
      }
    } catch (err) {
      console.error("Dashboard data error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleCheckOut = async ({ attendanceId, memberId }) => {
    try {
      const res = await attendanceApi.checkOut({ attendanceId, memberId });
      toast.success(
        `Check-out recorded. Duration: ${res?.durationMinutes || 0} minutes.`
      );
      await fetchDashboardData();
    } catch (err) {
      toast.error(err.message || "Failed to check out member");
    }
  };

  const handleAutoCheckout = async (hours) => {
    try {
      const res = await attendanceApi.autoCheckout(hours);
      toast.success(
        `Auto check-out completed: ${res?.checkedOutCount || 0} sessions closed.`
      );
      await fetchDashboardData();
    } catch (err) {
      toast.error(err.message || "Auto check-out failed");
    }
  };

  const handleCheckInSuccess = async (payload) => {
    const res = await attendanceApi.checkIn(payload);
    toast.success("Check-in verified and recorded!");
    await fetchDashboardData();
    return res;
  };

  const activeAttendees = occupancy?.checkedInAttendees || [];

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Activity size={28} style={{ color: "var(--accent-cyan)" }} />
            <span>Gym Floor & Access Desk</span>
          </h1>
          <p className="page-subtitle">
            Real-time occupancy monitoring, front desk check-in, and member session telemetry
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spinner" : ""} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-emerald"
            onClick={() => setIsCheckInOpen(true)}
          >
            <QrCode size={16} />
            <span>Fast Member Check-In</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper emerald">
            <UserCheck size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Currently On Floor</div>
            <div className="stat-value">{occupancy?.activeCount ?? 0}</div>
            <div className="stat-subtext">
              <span style={{ color: "var(--accent-emerald)" }}>Live</span> Headcount
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper cyan">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Visits Today</div>
            <div className="stat-value">{overviewStats?.visitsToday ?? 0}</div>
            <div className="stat-subtext">
              This Week: {overviewStats?.visitsThisWeek ?? 0}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Monthly Unique Visitors</div>
            <div className="stat-value">{overviewStats?.uniqueMonthlyVisitors ?? 0}</div>
            <div className="stat-subtext">
              Total Month Visits: {overviewStats?.visitsThisMonth ?? 0}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper gold">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Avg Session Duration</div>
            <div className="stat-value">
              {overviewStats?.avgDurationMinutes ? `${Math.round(overviewStats.avgDurationMinutes)}m` : "58m"}
            </div>
            <div className="stat-subtext">Optimal workout length</div>
          </div>
        </div>
      </div>

      {/* Main Floor Grid: Occupancy Gauge + Live Attendees */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", marginBottom: "28px" }}>
        <OccupancyGauge
          occupancyData={occupancy}
          maxCapacity={150}
          onRefresh={fetchDashboardData}
          loading={loading}
        />

        <ActiveAttendeesList
          attendees={activeAttendees}
          onCheckOut={handleCheckOut}
          onAutoCheckout={handleAutoCheckout}
          loading={loading}
        />
      </div>

      {/* Quick Check-In Modal */}
      <QuickCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onCheckInSuccess={handleCheckInSuccess}
      />
    </div>
  );
};
