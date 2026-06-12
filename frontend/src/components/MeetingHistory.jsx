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
        padding: "20px 24px",
        display: "flex",
        gap: "20px",
        flexWrap: "wrap",
        alignItems: "center",
        boxShadow: "0 4px 25px rgba(0, 0, 0, 0.2)"
      }}>
        {/* Search Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexGrow: 1, position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "14px", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            className="form-input"
            type="text"
            placeholder="Search keywords in summaries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", paddingLeft: "42px", background: "rgba(8,12,26,0.6)" }}
          />
        </div>

        {/* Sentiment Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em" }}>FILTER BY:</span>
          <select
            className="form-input"
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            style={{
              padding: "10px 32px 10px 16px",
              borderRadius: "12px",
              cursor: "pointer",
              background: "rgba(8,12,26,0.6)",
              fontSize: "0.88rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              border: "1px solid var(--border-translucent)",
              appearance: "none",
              backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 14px top 50%",
              backgroundSize: "10px auto"
            }}
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-panel" style={{ padding: "26px", height: "200px", display: "flex", flexDirection: "column", justifyContent: "space-between", opacity: 0.45 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: "35%", height: "14px", background: "rgba(255,255,255,0.08)", borderRadius: "4px" }}></div>
                <div style={{ width: "20%", height: "20px", background: "rgba(255,255,255,0.08)", borderRadius: "10px" }}></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "20px 0" }}>
                <div style={{ width: "95%", height: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}></div>
                <div style={{ width: "85%", height: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}></div>
              </div>
              <div style={{ width: "100%", height: "36px", background: "rgba(255,255,255,0.06)", borderRadius: "10px" }}></div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="glass-panel animate-fade-in" style={{
          borderColor: "rgba(239, 68, 68, 0.3)",
          background: "rgba(239, 68, 68, 0.03)",
          padding: "32px",
          textAlign: "center"
        }}>
          <AlertTriangle size={32} style={{ color: "var(--color-danger)", marginBottom: "12px" }} />
          <p style={{ color: "var(--color-danger)", fontWeight: 700, fontSize: "1.05rem" }}>Could not retrieve meeting history</p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "6px" }}>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredMeetings.length === 0 && (
        <div className="glass-panel animate-fade-in" style={{
          padding: "60px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
          textAlign: "center"
        }}>
          <div style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid var(--border-translucent)",
            color: "var(--text-muted)",
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 2px 5px rgba(0,0,0,0.2)"
          }}>
            <Inbox size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 650 }}>No meetings found</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginTop: "6px", maxWidth: "400px", lineHeight: 1.5 }}>
              {meetings.length === 0
                ? "You haven't analyzed any meetings yet. Head over to 'New Meeting' to get started."
                : "No meetings in our database match your active search terms or sentiment filters."}
            </p>
          </div>
        </div>
      )}

      {/* Grid List */}
      {!loading && !error && filteredMeetings.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "28px"
        }}>
          {filteredMeetings.map((meeting, index) => {
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
                  padding: "28px 24px 24px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "20px",
                  height: "230px",
                  animation: "slideUpFade 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                  animationDelay: `${index * 0.05}s`,
                  opacity: 0,
                  borderTop: "3px solid var(--accent-cyan)",
                  boxShadow: "0 4px 20px -5px rgba(0, 0, 0, 0.3)"
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 550 }}>
                      <Calendar size={13} />
                      <span>{dateStr}</span>
                    </div>
                    {getSentimentBadge(meeting.sentiment || "Neutral")}
                  </div>

                  {/* Summary preview */}
                  <p style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.55,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    fontWeight: 450
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
                    padding: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    borderColor: "var(--border-translucent)",
                    background: "rgba(255, 255, 255, 0.015)"
                  }}
                >
                  Inspect Insights <ChevronRight size={14} style={{ transition: "transform 0.2s" }} className="arrow-icon" />
                </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
