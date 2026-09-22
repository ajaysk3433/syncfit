import React, { useEffect } from "react";
import { X } from "lucide-react";

export const Modal = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  size = "md", // sm, md, lg, xl, full
  zIndex,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      // Check if any other modal backdrop remains
      const openModals = document.querySelectorAll(".modal-backdrop");
      if (openModals.length <= 1) {
        document.body.style.overflow = "unset";
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop animate-fade-in"
      onClick={onClose}
      style={zIndex ? { zIndex } : undefined}
    >
      <div
        className={`modal-box ${size} animate-slide-bottom`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-title">
            {icon && <span style={{ color: "var(--accent-cyan)", display: "flex", alignItems: "center" }}>{icon}</span>}
            <span>{title}</span>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

