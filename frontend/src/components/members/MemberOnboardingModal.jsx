import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { membersApi } from "../../api/membersApi";
import { plansApi } from "../../api/plansApi";
import { useToast } from "../../context/ToastContext";
import { UserPlus, Sparkles } from "lucide-react";

export const MemberOnboardingModal = ({ isOpen, onClose, onCreated }) => {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    memberTier: "STANDARD",
    role: "MEMBER",
    planId: "",
    dateOfBirth: "",
    gender: "Male",
    address: "",
    city: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    healthNotes: "",
    fitnessGoals: "Weight Loss, Muscle Gain",
    preferences: "Morning Access",
    referralCodeUsed: "",
    barcode: "",
  });

  // Load plans for selection
  useEffect(() => {
    if (!isOpen) return;
    const fetchPlans = async () => {
      try {
        const res = await plansApi.listPlans({ isActive: "true" });
        setPlans(res?.plans || []);
      } catch (err) {
        console.error("Failed to load plans:", err);
      }
    };
    fetchPlans();
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const goalsArray = formData.fitnessGoals
        ? formData.fitnessGoals.split(",").map((g) => g.trim()).filter(Boolean)
        : [];

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
        memberTier: formData.memberTier,
        role: formData.role,
        planId: formData.planId || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        emergencyContactName: formData.emergencyContactName.trim() || undefined,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
        emergencyContactRelation: formData.emergencyContactRelation.trim() || undefined,
        healthNotes: formData.healthNotes.trim() || undefined,
        fitnessGoals: goalsArray,
        preferences: formData.preferences.trim() || undefined,
        referralCodeUsed: formData.referralCodeUsed.trim() || undefined,
        barcode: formData.barcode.trim() || undefined,
      };

      const result = await membersApi.createMember(payload);
      toast.success(`Member ${formData.name} onboarded successfully!`);
      onCreated(result);
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || err.message || "Failed to onboard member");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Onboard New Member"
      icon={<UserPlus size={20} />}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !formData.name || !formData.email || !formData.password}
          >
            <Sparkles size={15} />
            <span>{submitting ? "Registering & Syncing..." : "Complete Onboarding"}</span>
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Section 1: Account & Credentials */}
        <div>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            1. Account & Security
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                className="input"
                placeholder="e.g. Alex Henderson"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                name="email"
                required
                className="input"
                placeholder="alex@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginTop: "14px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password *</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className="input"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                name="phone"
                className="input"
                placeholder="+1 555-0199"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Member Tier</label>
              <select
                name="memberTier"
                className="select"
                value={formData.memberTier}
                onChange={handleChange}
              >
                <option value="STANDARD">STANDARD</option>
                <option value="PREMIUM">PREMIUM</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Membership Plan Assignment */}
        <div>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            2. Initial Membership Subscription
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Assign Plan</label>
              <select
                name="planId"
                className="select"
                value={formData.planId}
                onChange={handleChange}
              >
                <option value="">No Plan (Assign Later)</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ${p.price} ({p.durationDays} Days / {p.tier})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Barcode (Optional)</label>
              <input
                type="text"
                name="barcode"
                className="input"
                placeholder="BC-99081"
                value={formData.barcode}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Profile & Health Details */}
        <div>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-purple)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            3. Profile & Emergency Info
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                className="input"
                value={formData.dateOfBirth}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Gender</label>
              <select
                name="gender"
                className="select"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">City</label>
              <input
                type="text"
                name="city"
                className="input"
                placeholder="Metropolis"
                value={formData.city}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginTop: "14px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Emergency Contact Name</label>
              <input
                type="text"
                name="emergencyContactName"
                className="input"
                placeholder="Jane Henderson"
                value={formData.emergencyContactName}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Emergency Phone</label>
              <input
                type="text"
                name="emergencyContactPhone"
                className="input"
                placeholder="+1 555-9876"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Relation</label>
              <input
                type="text"
                name="emergencyContactRelation"
                className="input"
                placeholder="Spouse / Parent"
                value={formData.emergencyContactRelation}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "14px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Fitness Goals (comma separated)</label>
              <input
                type="text"
                name="fitnessGoals"
                className="input"
                placeholder="Strength, Cardio, HIIT"
                value={formData.fitnessGoals}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Referral Code Used (Optional)</label>
              <input
                type="text"
                name="referralCodeUsed"
                className="input"
                placeholder="SF-ABC123"
                value={formData.referralCodeUsed}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
