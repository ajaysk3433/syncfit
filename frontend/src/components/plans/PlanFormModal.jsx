import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { plansApi } from "../../api/plansApi";
import { useToast } from "../../context/ToastContext";
import { CreditCard, Check } from "lucide-react";

export const PlanFormModal = ({ isOpen, plan, onClose, onSaved }) => {
  const toast = useToast();
  const isEditing = !!plan?.id;
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    tier: "STANDARD",
    price: 49.99,
    durationDays: 30,
    description: "",
    features: "Gym Floor Access, Locker Room, Free Wi-Fi",
    isActive: true,
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || "",
        tier: plan.tier || "STANDARD",
        price: plan.price ?? 49.99,
        durationDays: plan.durationDays ?? 30,
        description: plan.description || "",
        features: Array.isArray(plan.features) ? plan.features.join(", ") : "",
        isActive: plan.isActive ?? true,
      });
    } else {
      setFormData({
        name: "",
        tier: "STANDARD",
        price: 49.99,
        durationDays: 30,
        description: "",
        features: "Gym Floor Access, Locker Room, Free Wi-Fi",
        isActive: true,
      });
    }
  }, [plan, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const featuresArray = formData.features
        ? formData.features.split(",").map((f) => f.trim()).filter(Boolean)
        : [];

      const payload = {
        name: formData.name.trim(),
        tier: formData.tier,
        price: Number(formData.price),
        durationDays: Number(formData.durationDays),
        description: formData.description.trim() || undefined,
        features: featuresArray,
        isActive: formData.isActive,
      };

      if (isEditing) {
        await plansApi.updatePlan(plan.id, payload);
        toast.success(`Plan "${formData.name}" updated successfully!`);
      } else {
        await plansApi.createPlan(payload);
        toast.success(`Plan "${formData.name}" created successfully!`);
      }

      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || err.message || "Failed to save plan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Plan: ${plan.name}` : "Create Membership Plan"}
      icon={<CreditCard size={20} />}
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !formData.name || formData.price <= 0}
          >
            <Check size={15} />
            <span>{submitting ? "Saving..." : isEditing ? "Save Changes" : "Create Plan"}</span>
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Plan Name *</label>
          <input
            type="text"
            name="name"
            required
            className="input"
            placeholder="e.g. VIP Platinum Unlimited"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tier</label>
            <select
              name="tier"
              className="select"
              value={formData.tier}
              onChange={handleChange}
            >
              <option value="STANDARD">STANDARD</option>
              <option value="PREMIUM">PREMIUM</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Price ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              name="price"
              className="input"
              value={formData.price}
              onChange={handleChange}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Duration (Days) *</label>
            <input
              type="number"
              min="1"
              required
              name="durationDays"
              className="input"
              value={formData.durationDays}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Description</label>
          <textarea
            name="description"
            className="textarea"
            placeholder="Overview of privileges and access windows..."
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Features (comma separated)</label>
          <input
            type="text"
            name="features"
            className="input"
            placeholder="24/7 Access, Sauna, 2 PT Sessions"
            value={formData.features}
            onChange={handleChange}
          />
        </div>

        <div className="checkbox-label" style={{ marginTop: "4px" }}>
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
          />
          <span>Plan is active and open for member subscriptions</span>
        </div>
      </form>
    </Modal>
  );
};
