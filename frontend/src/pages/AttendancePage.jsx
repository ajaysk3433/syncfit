import React, { useState, useEffect, useCallback } from "react";
import { attendanceApi } from "../api/attendanceApi";
import { useToast } from "../context/ToastContext";
import { QuickCheckInModal } from "../components/attendance/QuickCheckInModal";
import {
  ClipboardList,
  Download,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  QrCode,
} from "lucide-react";
import { StatusBadge } from "../components/common/Badge";
import { LoadingSpinner } from "../components/common/LoadingSpinner";

export const AttendancePage = () => {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  const fetchAttendance = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await attendanceApi.listAttendance({
        page,
        limit: 15,
        status: status || undefined,
        method: method || undefined,
        location: location || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });

      setLogs(res?.attendances || res?.data || []);
      if (res?.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load attendance logs");
    } finally {
      setLoading(false);
    }
  }, [status, method, location, startDate, endDate, toast]);

  useEffect(() => {
    fetchAttendance(1);
  }, [fetchAttendance]);

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.info("No attendance records to export");
      return;
    }

    const headers = [
      "ID",
      "Member Name",
      "Member Email",
      "Status",
      "Method",
      "Check In Time",
      "Check Out Time",
      "Duration (Mins)",
      "Location",
      "Denial Reason",
    ];

    const csvRows = [headers.join(",")];

    logs.forEach((log) => {
      const row = [
        `"${log.id}"`,
        `"${log.user?.name || ""}"`,
        `"${log.user?.email || ""}"`,
        `"${log.status || ""}"`,
        `"${log.method || ""}"`,
        `"${log.checkInTime ? new Date(log.checkInTime).toISOString() : ""}"`,
        `"${log.checkOutTime ? new Date(log.checkOutTime).toISOString() : ""}"`,
        `"${log.durationMinutes || ""}"`,
        `"${log.location || ""}"`,
        `"${log.denialReason || ""}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `syncfit_attendance_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance logs exported to CSV");
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ClipboardList size={28} style={{ color: "var(--accent-cyan)" }} />
            <span>Attendance & Access Control Logs</span>
          </h1>
          <p className="page-subtitle">
            Audit history of facility check-ins, check-outs, access denials, and duration telemetry
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchAttendance(pagination.page)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spinner" : ""} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            className="btn btn-emerald"
            onClick={() => setIsCheckInOpen(true)}
          >
            <QrCode size={16} />
            <span>Fast Check-In</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-card" style={{ padding: "18px 20px", marginBottom: "24px" }}>
        <div className="filters-row" style={{ marginBottom: 0 }}>
          {/* Status Filter */}
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="">All Statuses</option>
            <option value="CHECKED_IN">CHECKED_IN</option>
            <option value="CHECKED_OUT">CHECKED_OUT</option>
            <option value="AUTO_CHECKED_OUT">AUTO_CHECKED_OUT</option>
            <option value="DENIED">DENIED</option>
          </select>

          {/* Method Filter */}
          <select
            className="select"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="">All Check-In Methods</option>
            <option value="QR_CODE">QR_CODE</option>
            <option value="BARCODE">BARCODE</option>
            <option value="MANUAL">MANUAL</option>
            <option value="CARD">CARD</option>
            <option value="PIN">PIN</option>
            <option value="BIOMETRIC">BIOMETRIC</option>
          </select>

          {/* Location Filter */}
          <input
            type="text"
            className="input"
            placeholder="Filter location (e.g. Main Gym)..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ width: "200px" }}
          />

          {/* Date Range */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>From:</span>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: "auto", padding: "6px 10px" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>To:</span>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: "auto", padding: "6px 10px" }}
            />
          </div>

          {(status || method || location || startDate || endDate) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setStatus("");
                setMethod("");
                setLocation("");
                setStartDate("");
                setEndDate("");
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <LoadingSpinner text="Loading access logs..." />
      ) : logs.length === 0 ? (
        <div className="glass-card" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
          <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: "14px" }} />
          <h3 style={{ fontSize: "18px", color: "var(--text-primary)", marginBottom: "6px" }}>
            No Attendance Records Found
          </h3>
          <p style={{ fontSize: "14px" }}>
            Check-in entries will automatically log here when members swipe or check in.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Status</th>
                <th>Check-In Time</th>
                <th>Check-Out Time</th>
                <th>Duration</th>
                <th>Method</th>
                <th>Location</th>
                <th>Notes / Denial Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const user = log.user || {};
                const isDenied = log.status === "DENIED";

                return (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {user.name || "Unknown Member"}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {user.email || log.userId}
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={log.status} />
                    </td>
                    <td style={{ fontSize: "13px" }}>
                      {log.checkInTime ? new Date(log.checkInTime).toLocaleString() : "—"}
                    </td>
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString() : "—"}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: log.durationMinutes ? "var(--text-primary)" : "var(--accent-cyan)",
                        }}
                      >
                        {log.durationMinutes ? `${log.durationMinutes} mins` : isDenied ? "—" : "In Progress"}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          background: "rgba(255, 255, 255, 0.05)",
                          padding: "3px 7px",
                          borderRadius: "4px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {log.method || "MANUAL"}
                      </span>
                    </td>
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {log.location || "Main Gym"}
                    </td>
                    <td>
                      {log.denialReason ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-rose)", fontSize: "12px", fontWeight: 600 }}>
                          <ShieldAlert size={14} />
                          <span>{log.denialReason}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {log.notes || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            padding: "12px 16px",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-card)",
          }}
        >
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} records)
          </span>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchAttendance(pagination.page - 1)}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchAttendance(pagination.page + 1)}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <QuickCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onCheckInSuccess={async (payload) => {
          const res = await attendanceApi.checkIn(payload);
          fetchAttendance(1);
          return res;
        }}
      />
    </div>
  );
};
