import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { plansApi } from "../../api/plansApi";
import { useToast } from "../../context/ToastContext";
import {
  CreditCard,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  ArrowUpRight,
  AlertTriangle,
  Check,
} from "lucide-react";

export const SubscriptionActionModal = ({
  isOpen,
  actionType, // "ASSIGN" | "PAUSE" | "RESUME" | "CANCEL" | "RENEW" | "UPGRADE"
  member,
  membership,
  onClose,
  onCompleted,
  zIndex,
}) => {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [cancellationReason, setCancellationReason] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSelectedPlanId("");
      setCancellationReason("");
      setNotes("");
      return;
    }

    if (actionType === "ASSIGN" || actionType === "RENEW" || actionType === "UPGRADE") {
      const fetchPlans = async () => {
        try {
          const res = await plansApi.listPlans({ isActive: "true" });
          const allPlans = Array.isArray(res?.data) ? res.data : Array.isArray(res?.plans) ? res.plans : Array.isArray(res) ? res : [];
          setPlans(allPlans);
          if (allPlans.length > 0) {
            setSelectedPlanId(allPlans[0].id);
          }
        } catch (err) {
          console.error("Failed to load plans:", err);
        }
      };
      fetchPlans();
    }
  }, [isOpen, actionType]);

  const getModalConfig = () => {
    switch (actionType) {
      case "ASSIGN":
        return {
          title: `Assign Plan to ${member?.name}`,
          icon: <CreditCard size={20} />,
          btnText: "Assign Plan",
          btnClass: "btn-primary",
        };
      case "PAUSE":
        return {
          title: `Pause / Freeze Membership`,
          icon: <PauseCircle size={20} />,
          btnText: "Freeze Membership",
          btnClass: "btn-secondary",
        };
      case "RESUME":
        return {
          title: `Resume Membership`,
          icon: <PlayCircle size={20} />,
          btnText: "Resume & Extend Expiry",
          btnClass: "btn-emerald",
        };
      case "CANCEL":
        return {
          title: `Cancel Membership`,
          icon: <AlertTriangle size={20} />,
          btnText: "Confirm Cancellation",
          btnClass: "btn-danger",
        };
      case "RENEW":
        return {
          title: `Renew Membership Subscription`,
          icon: <RefreshCw size={20} />,
          btnText: "Renew Subscription",
          btnClass: "btn-primary",
        };
      case "UPGRADE":
        return {
          title: `Upgrade / Change Plan Tier`,
          icon: <ArrowUpRight size={20} />,
          btnText: "Upgrade Membership",
          btnClass: "btn-primary",
        };
      default:
        return {
          title: "Subscription Action",
          icon: <CreditCard size={20} />,
          btnText: "Submit",
          btnClass: "btn-primary",
        };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!member?.id) return;
    setSubmitting(true);

    try {
      if (actionType === "ASSIGN") {
        await plansApi.assignMembership(member.id, {
          planId: selectedPlanId,
          autoRenew,
          startDate: new Date(startDate).toISOString(),
          notes: notes || undefined,
        });
        toast.success(`Assigned plan to ${member.name}`);
      } else if (actionType === "PAUSE") {
        await plansApi.pauseMembership(member.id, {
          notes: notes || undefined,
        });
        toast.success(`Membership for ${member.name} paused/frozen.`);
      } else if (actionType === "RESUME") {
        await plansApi.resumeMembership(member.id);
        toast.success(`Membership for ${member.name} resumed with extended end date!`);
      } else if (actionType === "CANCEL") {
        await plansApi.cancelMembership(member.id, {
          cancellationReason: cancellationReason || "Member requested cancellation",
          notes: notes || undefined,
        });
        toast.info(`Membership for ${member.name} has been cancelled.`);
      } else if (actionType === "RENEW") {
        await plansApi.renewMembership(member.id, {
          planId: selectedPlanId || undefined,
          autoRenew,
          notes: notes || undefined,
        });
        toast.success(`Membership renewed successfully!`);
      } else if (actionType === "UPGRADE") {
        await plansApi.upgradeMembership(member.id, {
          newPlanId: selectedPlanId,
          notes: notes || "Upgraded subscription package",
        });
        toast.success(`Membership upgraded successfully!`);
      }

      if (onCompleted) onCompleted();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || err.message || "Failed to execute subscription action");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  const config = getModalConfig();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      icon={config.icon}
      size="md"
      zIndex={zIndex}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Back
          </button>
          <button
            className={`btn ${config.btnClass}`}
            onClick={handleSubmit}
            disabled={submitting || (actionType === "CANCEL" && !cancellationReason.trim())}
          >
            <Check size={15} />
            <span>{submitting ? "Processing..." : config.btnText}</span>
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Info card on target member */}
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
              {member?.name}
            </span>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{member?.email}</p>
          </div>
          {membership && (
            <span style={{ fontSize: "12px", color: "var(--accent-cyan)", fontWeight: 600 }}>
              Current: {membership.plan?.name || "Active Plan"}
            </span>
          )}
        </div>

        {/* Plan Select for ASSIGN / RENEW / UPGRADE */}
        {(actionType === "ASSIGN" || actionType === "RENEW" || actionType === "UPGRADE") && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              {actionType === "UPGRADE" ? "Select New Target Plan *" : "Select Membership Plan *"}
            </label>
            <select
              className="select"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              required
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${p.price} ({p.durationDays} Days / {p.tier})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Start Date & Auto Renew for ASSIGN */}
        {actionType === "ASSIGN" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", paddingTop: "24px" }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                />
                <span>Enable Auto-Renew</span>
              </label>
            </div>
          </div>
        )}

        {/* Cancel Reason for CANCEL */}
        {actionType === "CANCEL" && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cancellation Reason *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. Relocating, Medical reasons, Budget constraints..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>
        )}

        {/* Notes */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            {actionType === "PAUSE" ? "Pause Reason & Notes" : "Staff Notes (Optional)"}
          </label>
          <textarea
            className="textarea"
            placeholder="Add any relevant details or billing agreement context..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};
