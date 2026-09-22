import React, { useState, useEffect, useCallback } from "react";
import { membersApi } from "../api/membersApi";
import { useToast } from "../context/ToastContext";
import { MemberCard } from "../components/members/MemberCard";
import { MemberOnboardingModal } from "../components/members/MemberOnboardingModal";
import { MemberDetailModal } from "../components/members/MemberDetailModal";
import { EditMemberModal } from "../components/members/EditMemberModal";
import { SubscriptionActionModal } from "../components/plans/SubscriptionActionModal";
import {
  Users,
  UserPlus,
  Search,
  Grid,
  List,
  QrCode,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { StatusBadge, TierBadge } from "../components/common/Badge";
import { LoadingSpinner } from "../components/common/LoadingSpinner";

export const MembersPage = () => {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [hasActiveMembership, setHasActiveMembership] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Modals State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [subActionConfig, setSubActionConfig] = useState(null); // { type, member, membership }

  const fetchMembers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await membersApi.listMembers({
        page,
        limit: 12,
        search: search.trim() || undefined,
        tier: tier || undefined,
        status: status || undefined,
        hasActiveMembership: hasActiveMembership || undefined,
      });

      setMembers(res?.members || []);
      if (res?.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load members directory");
    } finally {
      setLoading(false);
    }
  }, [search, tier, status, hasActiveMembership, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchMembers]);

  const handleOpenQr = (member) => {
    setSelectedMemberId(member.id);
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Users size={28} style={{ color: "var(--accent-cyan)" }} />
            <span>Members Directory</span>
          </h1>
          <p className="page-subtitle">
            Manage member accounts, digital QR passes, and subscription lifecycles
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchMembers(pagination.page)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spinner" : ""} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsOnboardingOpen(true)}
            id="onboard-member-btn"
          >
            <UserPlus size={16} />
            <span>Onboard New Member</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-card" style={{ padding: "18px 20px", marginBottom: "24px" }}>
        <div className="filters-row" style={{ marginBottom: 0 }}>
          {/* Search Input */}
          <div className="search-bar-wrapper">
            <Search size={16} className="search-bar-icon" />
            <input
              type="text"
              className="input search-bar-input"
              placeholder="Search by name, email, phone, referral code, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Tier Filter */}
          <select
            className="select"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="">All Tiers</option>
            <option value="STANDARD">STANDARD</option>
            <option value="PREMIUM">PREMIUM</option>
            <option value="VIP">VIP</option>
          </select>

          {/* Status Filter */}
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="PENDING">PENDING</option>
          </select>

          {/* Plan Subscription filter */}
          <select
            className="select"
            value={hasActiveMembership}
            onChange={(e) => setHasActiveMembership(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="">All Subscriptions</option>
            <option value="true">Active Subscription</option>
            <option value="false">No Active Plan</option>
          </select>

          {/* View Toggle */}
          <div style={{ display: "flex", gap: "4px", background: "rgba(255, 255, 255, 0.05)", padding: "3px", borderRadius: "var(--radius-md)" }}>
            <button
              className={`btn-icon ${viewMode === "grid" ? "btn-secondary" : "btn-ghost"}`}
              onClick={() => setViewMode("grid")}
              style={{ width: "32px", height: "32px" }}
              title="Grid View"
            >
              <Grid size={15} />
            </button>
            <button
              className={`btn-icon ${viewMode === "table" ? "btn-secondary" : "btn-ghost"}`}
              onClick={() => setViewMode("table")}
              style={{ width: "32px", height: "32px" }}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Members Content */}
      {loading ? (
        <LoadingSpinner text="Loading members directory..." />
      ) : members.length === 0 ? (
        <div className="glass-card" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
          <Users size={48} style={{ opacity: 0.3, marginBottom: "14px" }} />
          <h3 style={{ fontSize: "18px", color: "var(--text-primary)", marginBottom: "6px" }}>
            No Members Found
          </h3>
          <p style={{ fontSize: "14px", marginBottom: "20px" }}>
            {search || tier || status || hasActiveMembership
              ? "Try adjusting your search criteria or filters."
              : "Get started by onboarding your first gym member."}
          </p>
          <button className="btn btn-primary" onClick={() => setIsOnboardingOpen(true)}>
            <UserPlus size={16} />
            <span>Onboard Member</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onSelect={(m) => setSelectedMemberId(m.id)}
              onOpenQr={handleOpenQr}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Phone</th>
                <th>Active Plan</th>
                <th>Referral Code</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const activePlan = member.memberships?.find(
                  (m) => m.status === "ACTIVE" && new Date(m.endDate) >= new Date()
                );
                return (
                  <tr
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {member.name}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {member.email}
                        </span>
                      </div>
                    </td>
                    <td>
                      <TierBadge tier={member.memberTier} />
                    </td>
                    <td>
                      <StatusBadge status={member.status} />
                    </td>
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {member.phone || "—"}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: activePlan ? "var(--accent-emerald)" : "var(--text-muted)",
                        }}
                      >
                        {activePlan?.plan?.name || "None"}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--accent-gold)" }}>
                      {member.profile?.referralCode || "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMemberId(member.id);
                        }}
                      >
                        <QrCode size={13} />
                        <span>Pass & Plans</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
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
            Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total members)
          </span>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchMembers(pagination.page - 1)}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchMembers(pagination.page + 1)}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <MemberOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCreated={() => fetchMembers(1)}
      />

      <MemberDetailModal
        isOpen={!!selectedMemberId}
        memberId={selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
        onMemberUpdated={() => fetchMembers(pagination.page)}
        onOpenSubscriptionAction={(type, member, membership) => {
          setSubActionConfig({ type, member, membership });
        }}
        onOpenEditProfile={(member) => {
          setEditingMember(member);
        }}
      />

      {editingMember && (
        <EditMemberModal
          isOpen={!!editingMember}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onUpdated={() => {
            fetchMembers(pagination.page);
            setSelectedMemberId(editingMember.id);
          }}
        />
      )}

      {subActionConfig && (
        <SubscriptionActionModal
          isOpen={!!subActionConfig}
          actionType={subActionConfig.type}
          member={subActionConfig.member}
          membership={subActionConfig.membership}
          onClose={() => setSubActionConfig(null)}
          onCompleted={() => {
            fetchMembers(pagination.page);
            if (selectedMemberId) {
              // Trigger reload in detail modal if open
            }
          }}
        />
      )}
    </div>
  );
};
