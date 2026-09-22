import React, { useState, useEffect } from "react";
import { authApi } from "../../api/authApi";
import { getApiBaseUrl } from "../../api/client";
import {
  FileCode2,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  Copy,
  Terminal,
} from "lucide-react";

export const SwaggerViewer = () => {
  const [swaggerDoc, setSwaggerDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("explorer"); // "explorer" | "iframe"
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEndpoints, setExpandedEndpoints] = useState({});
  const [copiedPath, setCopiedPath] = useState(null);
  const baseUrl = getApiBaseUrl();

  useEffect(() => {
    const loadSwagger = async () => {
      setLoading(true);
      try {
        const doc = await authApi.getSwaggerDoc();
        setSwaggerDoc(doc);
      } catch (err) {
        console.warn("Could not fetch live swagger from backend:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSwagger();
  }, []);

  const toggleEndpoint = (key) => {
    setExpandedEndpoints((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(key);
    setTimeout(() => setCopiedPath(null), 1800);
  };

  const getMethodBadgeClass = (method) => {
    switch (method.toUpperCase()) {
      case "GET":
        return { bg: "rgba(6, 182, 212, 0.15)", color: "#22d3ee", border: "rgba(6, 182, 212, 0.3)" };
      case "POST":
        return { bg: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "rgba(16, 185, 129, 0.3)" };
      case "PATCH":
      case "PUT":
        return { bg: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" };
      case "DELETE":
        return { bg: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "rgba(239, 68, 68, 0.3)" };
      default:
        return { bg: "rgba(100, 116, 139, 0.15)", color: "#cbd5e1", border: "rgba(100, 116, 139, 0.3)" };
    }
  };

  // Group paths
  const paths = swaggerDoc?.paths || {};
  const endpointList = [];
  Object.entries(paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, details]) => {
      endpointList.push({
        path,
        method: method.toUpperCase(),
        tag: details.tags?.[0] || "General",
        summary: details.summary || "",
        description: details.description || "",
        parameters: details.parameters || [],
        requestBody: details.requestBody,
        responses: details.responses || {},
      });
    });
  });

  const filteredEndpoints = endpointList.filter(
    (ep) =>
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Banner */}
      <div
        className="glass-card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileCode2 size={24} style={{ color: "var(--accent-cyan)" }} />
            <h2 style={{ fontSize: "22px", fontWeight: 800 }}>SyncFit Pro API Documentation</h2>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            OpenAPI 3.0.3 Interactive Specification for Auth, Members, Subscriptions, Access Control, and Analytics.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              padding: "4px",
              borderRadius: "var(--radius-md)",
              display: "flex",
              gap: "4px",
            }}
          >
            <button
              className={`btn btn-sm ${activeView === "explorer" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveView("explorer")}
            >
              Interactive Explorer
            </button>
            <button
              className={`btn btn-sm ${activeView === "iframe" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveView("iframe")}
            >
              Raw Swagger UI
            </button>
          </div>

          <a
            href={`${baseUrl}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <span>Open in New Tab</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {activeView === "iframe" ? (
        <div
          className="glass-card"
          style={{ padding: 0, overflow: "hidden", height: "75vh", minHeight: "500px" }}
        >
          <iframe
            src={`${baseUrl}/docs`}
            title="Swagger UI"
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Search bar */}
          <div className="search-bar-wrapper">
            <Search size={16} className="search-bar-icon" />
            <input
              type="text"
              className="input search-bar-input"
              placeholder="Search endpoints, tags (e.g. /v1/attendance, Members, check-in)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Endpoints List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredEndpoints.length === 0 ? (
              <div className="glass-card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                {loading ? "Loading OpenAPI Specifications..." : "No endpoints found matching query."}
              </div>
            ) : (
              filteredEndpoints.map((ep, idx) => {
                const epKey = `${ep.method}-${ep.path}`;
                const isExpanded = !!expandedEndpoints[epKey];
                const badge = getMethodBadgeClass(ep.method);

                return (
                  <div
                    key={idx}
                    className="glass-card"
                    style={{
                      padding: "16px 20px",
                      borderLeft: `4px solid ${badge.color}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onClick={() => toggleEndpoint(epKey)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "12px",
                            fontWeight: 800,
                            padding: "4px 10px",
                            borderRadius: "4px",
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            minWidth: "70px",
                            textAlign: "center",
                          }}
                        >
                          {ep.method}
                        </span>

                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {ep.path}
                        </span>

                        <span
                          style={{
                            fontSize: "12px",
                            background: "rgba(255, 255, 255, 0.05)",
                            color: "var(--text-muted)",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                          }}
                        >
                          {ep.tag}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                          {ep.summary}
                        </span>
                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(`${baseUrl}${ep.path}`, epKey);
                          }}
                          title="Copy Full URL"
                        >
                          {copiedPath === epKey ? <Check size={13} style={{ color: "var(--accent-emerald)" }} /> : <Copy size={13} />}
                        </button>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: "16px",
                          paddingTop: "16px",
                          borderTop: "1px solid var(--border-subtle)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "14px",
                        }}
                      >
                        {ep.description && (
                          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                            {ep.description}
                          </p>
                        )}

                        {ep.parameters.length > 0 && (
                          <div>
                            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--accent-cyan)", fontWeight: 700 }}>
                              Query / Path Parameters:
                            </span>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                              {ep.parameters.map((param, pIdx) => (
                                <div
                                  key={pIdx}
                                  style={{
                                    fontSize: "12px",
                                    fontFamily: "var(--font-mono)",
                                    background: "rgba(0, 0, 0, 0.3)",
                                    padding: "6px 12px",
                                    borderRadius: "var(--radius-sm)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <span>
                                    <strong style={{ color: "var(--text-primary)" }}>{param.name}</strong>{" "}
                                    <span style={{ color: "var(--text-muted)" }}>({param.in})</span>
                                  </span>
                                  <span style={{ color: "var(--accent-gold)" }}>
                                    {param.schema?.type || "string"}
                                    {param.required ? " (required)" : " (optional)"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Request Body Example */}
                        {ep.requestBody && (
                          <div>
                            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--accent-emerald)", fontWeight: 700 }}>
                              Request Body Payload (JSON):
                            </span>
                            <pre
                              style={{
                                background: "rgba(0, 0, 0, 0.4)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "var(--radius-md)",
                                padding: "12px",
                                fontSize: "12px",
                                fontFamily: "var(--font-mono)",
                                color: "#34d399",
                                overflowX: "auto",
                                marginTop: "6px",
                              }}
                            >
                              {JSON.stringify(
                                ep.requestBody?.content?.["application/json"]?.schema?.properties ||
                                  ep.requestBody,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        )}

                        {/* Curl snippet */}
                        <div>
                          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--accent-purple)", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                            <Terminal size={13} />
                            cURL Example:
                          </span>
                          <pre
                            style={{
                              background: "#090d16",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "var(--radius-md)",
                              padding: "10px 14px",
                              fontSize: "12px",
                              fontFamily: "var(--font-mono)",
                              color: "#cbd5e1",
                              overflowX: "auto",
                              marginTop: "6px",
                            }}
                          >
                            {`curl -X ${ep.method} "${baseUrl}${ep.path}" \\
  -H "Content-Type: application/json" \\
  -H "x-user-id: dev-admin-id"`}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
