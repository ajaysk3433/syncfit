import React, { useState, useEffect, useCallback } from "react";
import { plansApi } from "../api/plansApi";
import { useToast } from "../context/ToastContext";
import { PlanCard } from "../components/plans/PlanCard";
import { PlanFormModal } from "../components/plans/PlanFormModal";
import {
  CreditCard,
  Plus,
  Layers,
  RefreshCw,
  Search,
} from "lucide-react";
import { LoadingSpinner } from "../components/common/LoadingSpinner";

export const PlansPage = () => {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [tierFilter, setTierFilter] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState("");
  const [search, setSearch] = useState("");

  // Modals
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await plansApi.listPlans({
        tier: tierFilter || undefined,
        isActive: isActiveFilter || undefined,
        search: search.trim() || undefined,
      });
      const planList = Array.isArray(res?.data) ? res.data : Array.isArray(res?.plans) ? res.plans : Array.isArray(res) ? res : [];
      setPlans(planList);
    } catch (err) {
      toast.error(err.message || "Failed to load membership plans");
    } finally {
      setLoading(false);
    }
  }, [tierFilter, isActiveFilter, search, toast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <CreditCard size={28} style={{ color: "var(--accent-cyan)" }} />
            <span>Membership Plans & Packages</span>
          </h1>
          <p className="page-subtitle">
            Configure access tiers, pricing rates, durations, and facility privilege bundles
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchPlans}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spinner" : ""} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingPlan(null);
              setIsPlanFormOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card" style={{ padding: "18px 20px", marginBottom: "24px" }}>
        <div className="filters-row" style={{ marginBottom: 0 }}>
          <div className="search-bar-wrapper">
            <Search size={16} className="search-bar-icon" />
            <input
              type="text"
              className="input search-bar-input"
              placeholder="Search plans by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="select"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="">All Tiers</option>
            <option value="STANDARD">STANDARD</option>
            <option value="PREMIUM">PREMIUM</option>
            <option value="VIP">VIP</option>
          </select>

          <select
            className="select"
            value={isActiveFilter}
            onChange={(e) => setIsActiveFilter(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="">All Statuses</option>
            <option value="true">Active Plans Only</option>
            <option value="false">Archived Plans</option>
          </select>
        </div>
      </div>

      {/* Plans Cards Grid */}
      {loading ? (
        <LoadingSpinner text="Loading membership plans..." />
      ) : plans.length === 0 ? (
        <div className="glass-card" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
          <Layers size={48} style={{ opacity: 0.3, marginBottom: "14px" }} />
          <h3 style={{ fontSize: "18px", color: "var(--text-primary)", marginBottom: "6px" }}>
            No Membership Plans Found
          </h3>
          <p style={{ fontSize: "14px", marginBottom: "20px" }}>
            Create your first pricing tier to begin onboarding and assigning subscriptions.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingPlan(null);
              setIsPlanFormOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Create Plan</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={(p) => {
                setEditingPlan(p);
                setIsPlanFormOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Plan Form Modal */}
      <PlanFormModal
        isOpen={isPlanFormOpen}
        plan={editingPlan}
        onClose={() => {
          setIsPlanFormOpen(false);
          setEditingPlan(null);
        }}
        onSaved={fetchPlans}
      />
    </div>
  );
};
