import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (msg, duration) => showToast(msg, "success", duration),
      error: (msg, duration) => showToast(msg, "error", duration || 5000),
      info: (msg, duration) => showToast(msg, "info", duration),
      warning: (msg, duration) => showToast(msg, "warning", duration),
    }),
    [showToast]
  );

  const getToastIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="toast-icon success" size={18} />;
      case "error":
        return <AlertCircle className="toast-icon error" size={18} />;
      case "warning":
        return <AlertTriangle className="toast-icon warning" size={18} />;
      default:
        return <Info className="toast-icon info" size={18} />;
    }
  };

  return (
    <ToastContext.Provider value={{ toast, showToast, removeToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`toast-item toast-${item.type} animate-slide-in`}>
            <div className="toast-content">
              {getToastIcon(item.type)}
              <span className="toast-message">{item.message}</span>
            </div>
            <button
              className="toast-close"
              onClick={() => removeToast(item.id)}
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
};
