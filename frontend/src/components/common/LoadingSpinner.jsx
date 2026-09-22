import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingSpinner = ({ size = 28, text = "Loading data..." }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        gap: "12px",
        color: "var(--text-secondary)",
      }}
    >
      <Loader2
        size={size}
        className="spinner"
        style={{ color: "var(--accent-cyan)" }}
      />
      {text && <span style={{ fontSize: "14px", fontWeight: 500 }}>{text}</span>}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: "16px",
            height: "36px",
            alignItems: "center",
          }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="skeleton"
              style={{
                height: "18px",
                width: c === 0 ? "80%" : "60%",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
