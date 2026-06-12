/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { Search, RotateCw, Calendar, Heart, ShieldCheck, AlertTriangle, MessageSquare, ChevronRight, Inbox } from "lucide-react";
import { apiUrl } from "../api";

export default function MeetingHistory({ onSelectMeeting }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMeetings = async (showRefreshGlow = false) => {
    if (showRefreshGlow) setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/meetings"));
      if (!response.ok) {
        throw new Error(`Server returned error: ${response.statusText}`);
      }
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (err) {
      setError(err.message || "Could not retrieve meeting history.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleRefresh = () => {
    fetchMeetings(true);
  };

  // Color code sentiment
  const getSentimentBadge = (sent) => {
    const lower = sent.toLowerCase();
    if (lower.includes("positive")) return <span className="badge badge-success" style={{ padding: "2px 8px" }}><Heart size={10} /> Positive</span>;
    if (lower.includes("negative")) return <span className="badge badge-danger" style={{ padding: "2px 8px" }}><AlertTriangle size={10} /> Negative</span>;
    if (lower.includes("mixed")) return <span className="badge badge-info" style={{ padding: "2px 8px" }}><MessageSquare size={10} /> Mixed</span>;
    return <span className="badge badge-warning" style={{ padding: "2px 8px" }}><ShieldCheck size={10} /> Neutral</span>;
  };

  // Filter meetings by search term and sentiment
  const filteredMeetings = meetings.filter((meeting) => {
    const summaryList = meeting.summary || [];
    const summaryText = Array.isArray(summaryList) ? summaryList.join(" ") : String(summaryList);
    const matchesSearch = summaryText.toLowerCase().includes(searchTerm.toLowerCase());

    const sentiment = meeting.sentiment || "Neutral";
    const matchesSentiment = sentimentFilter === "all" || sentiment.toLowerCase().includes(sentimentFilter.toLowerCase());

    return matchesSearch && matchesSentiment;
  });

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Top Header Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2>Meeting History Archive</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Inspect and retrieve decisions, actions, and drafts from past sessions</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <RotateCw size={16} style={{ animation: isRefreshing ? "spin 1.5s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Box */}
      <div className="glass-panel" style={{
        padding: "18px 24px",
        display: "flex",
        gap: "16px",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        {/* Search Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexGrow: 1, position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "12px", color: "var(--text-muted)" }} />
          <input
            className="form-input"
            type="text"
            placeholder="Search keywords in summaries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", paddingLeft: "40px" }}
          />
        </div>

        {/* Sentiment Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>SENTIMENT:</span>
          <select
            className="form-input"
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "10px", cursor: "pointer" }}
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="mixed">Mixed</option>
            <option value="negative">Negative</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-panel" style={{ padding: "24px", height: "180px", display: "flex", flexDirection: "column", justifyContent: "space-between", opacity: 0.5 }}>
              <div style={{ width: "40%", height: "16px", background: "rgba(255,255,255,0.08)", borderRadius: "4px" }}></div>
              <div style={{ width: "90%", height: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}></div>
              <div style={{ width: "80%", height: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}></div>
              <div style={{ width: "25%", height: "28px", background: "rgba(255,255,255,0.08)", borderRadius: "8px" }}></div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="glass-panel" style={{
          borderColor: "rgba(239, 68, 68, 0.3)",
          background: "rgba(239, 68, 68, 0.05)",
          padding: "20px",
          textAlign: "center"
        }}>
          <p style={{ color: "var(--color-danger)", fontWeight: 600 }}>Could not load meeting history</p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "6px" }}>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredMeetings.length === 0 && (
        <div className="glass-panel" style={{
          padding: "60px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          textAlign: "center"
        }}>
          <div style={{
            background: "rgba(255,255,255,0.02)",
            color: "var(--text-muted)",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Inbox size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem" }}>No meetings found</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {meetings.length === 0
                ? "You haven't analyzed any meetings yet. Head to 'New Meeting' to get started."
                : "No meetings match your active search terms or sentiment filter."}
            </p>
          </div>
        </div>
      )}

      {/* Grid List */}
      {!loading && !error && filteredMeetings.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "24px"
        }}>
          {filteredMeetings.map((meeting) => {
            const dateStr = meeting.created_at
              ? new Date(meeting.created_at + "Z").toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
              : "Unknown Date";
            const summaryList = meeting.summary || [];
            const previewText = Array.isArray(summaryList) ? summaryList.join(" ") : String(summaryList);

            return (
              <div
                key={meeting.id}
                className="glass-panel glass-panel-hover"
                style={{
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "18px",
                  height: "220px"
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      <Calendar size={12} />
                      <span>{dateStr}</span>
                    </div>
                    {getSentimentBadge(meeting.sentiment || "Neutral")}
                  </div>

                  {/* Summary preview */}
                  <p style={{
                    fontSize: "0.88rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    fontWeight: 400
                  }}>
                    {previewText || "No summary available."}
                  </p>
                </div>

                {/* Card footer action */}
                <button
                  className="btn btn-secondary"
                  onClick={() => onSelectMeeting(meeting.id)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "0.8rem",
                    borderColor: "var(--border-translucent)",
                    background: "rgba(255, 255, 255, 0.01)"
                  }}
                >
                  Inspect Insights <ChevronRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
