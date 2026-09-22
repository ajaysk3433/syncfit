import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { membersApi } from "../../api/membersApi";
import { useToast } from "../../context/ToastContext";
import { Edit3, Check } from "lucide-react";

export const EditMemberModal = ({ isOpen, member, onClose, onUpdated }) => {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
    gender: "Male",
    dateOfBirth: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    healthNotes: "",
    fitnessGoals: "",
    barcode: "",
  });

  useEffect(() => {
    if (member) {
      const p = member.profile || {};
      setFormData({
        name: member.name || "",
        phone: member.phone || "",
        city: p.city || "",
        address: p.address || "",
        gender: p.gender || "Male",
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : "",
        emergencyContactName: p.emergencyContactName || "",
        emergencyContactPhone: p.emergencyContactPhone || "",
        emergencyContactRelation: p.emergencyContactRelation || "",
        healthNotes: p.healthNotes || "",
        fitnessGoals: Array.isArray(p.fitnessGoals) ? p.fitnessGoals.join(", ") : "",
        barcode: p.barcode || "",
      });
    }
  }, [member]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!member) return;
    setSubmitting(true);

    try {
      const goalsArray = formData.fitnessGoals
        ? formData.fitnessGoals.split(",").map((g) => g.trim()).filter(Boolean)
        : [];

      const payload = {
        name: formData.name.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        city: formData.city.trim() || undefined,
        address: formData.address.trim() || undefined,
        gender: formData.gender || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        emergencyContactName: formData.emergencyContactName.trim() || undefined,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
        emergencyContactRelation: formData.emergencyContactRelation.trim() || undefined,
        healthNotes: formData.healthNotes.trim() || undefined,
        fitnessGoals: goalsArray,
        barcode: formData.barcode.trim() || undefined,
      };

      await membersApi.updateMemberProfile(member.id, payload);
      toast.success("Member profile updated!");
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to update member profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Profile: ${member?.name || "Member"}`}
      icon={<Edit3 size={20} />}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            <Check size={15} />
            <span>{submitting ? "Saving Changes..." : "Save Profile"}</span>
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              className="input"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Phone Number</label>
            <input
              type="text"
              name="phone"
              className="input"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
        </div>

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
              value={formData.city}
              onChange={handleChange}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Emergency Contact</label>
            <input
              type="text"
              name="emergencyContactName"
              className="input"
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
              value={formData.emergencyContactRelation}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Health & Medical Notes</label>
          <textarea
            name="healthNotes"
            className="textarea"
            placeholder="Allergies, chronic conditions, injury recovery notes..."
            value={formData.healthNotes}
            onChange={handleChange}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fitness Goals (comma separated)</label>
            <input
              type="text"
              name="fitnessGoals"
              className="input"
              value={formData.fitnessGoals}
              onChange={handleChange}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Barcode ID</label>
            <input
              type="text"
              name="barcode"
              className="input"
              value={formData.barcode}
              onChange={handleChange}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
