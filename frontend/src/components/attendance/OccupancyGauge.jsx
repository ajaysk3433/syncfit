import React from "react";
import { Users, RefreshCw } from "lucide-react";

export const OccupancyGauge = ({ occupancyData, maxCapacity = 150, onRefresh, loading }) => {
  const activeCount = occupancyData?.activeCount ?? 0;
  const capacity = occupancyData?.maxCapacity || maxCapacity;
  const percentage = Math.min(Math.round((activeCount / capacity) * 100), 100);

  let statusText = "Optimal";
  let statusColor = "var(--accent-emerald)";
  let progressColor = "linear-gradient(90deg, #10b981 0%, #059669 100%)";

  if (percentage >= 85) {
    statusText = "Near Full Capacity";
    statusColor = "var(--accent-rose)";
    progressColor = "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)";
  } else if (percentage >= 60) {
    statusText = "Moderate Activity";
    statusColor = "var(--accent-gold)";
    progressColor = "linear-gradient(90deg, #06b6d4 0%, #f59e0b 100%)";
  }

  return (
    <div className="occupancy-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--accent-cyan)", display: "flex" }}>
              <Users size={20} />
            </span>
            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Real-Time Facility Occupancy</h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "2px" }}>
            Live count of members currently checked-in on gym floor
          </p>
        </div>

        <button
          className="btn-icon"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Occupancy"
        >
          <RefreshCw size={16} className={loading ? "spinner" : ""} />
        </button>
      </div>

      <div className="occupancy-meter-wrapper">
        {/* Circle Meter */}
        <div
          className="occupancy-gauge-circle"
          style={{
            background: `radial-gradient(closest-side, #0f172a 79%, transparent 80% 100%), conic-gradient(${statusColor} ${percentage}%, rgba(255,255,255,0.06) 0)`,
          }}
        >
          <span className="occupancy-percent">{activeCount}</span>
          <span className="occupancy-percent-label">On Floor</span>
        </div>

        {/* Breakdown details */}
        <div style={{ flex: 1, minWidth: "200px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
              {statusText}
            </span>
            <span style={{ fontSize: "13px", color: statusColor, fontWeight: 700 }}>
              {percentage}% of {capacity} max
            </span>
          </div>

          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{
                width: `${percentage}%`,
                background: progressColor,
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            <span>0 Minimum</span>
            <span>Capacity: {capacity}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
