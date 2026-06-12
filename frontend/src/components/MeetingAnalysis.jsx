import { useState } from "react";
import { Check, Clipboard, ClipboardCheck, ArrowLeft, Calendar, MessageSquare, ShieldCheck, Heart, AlertTriangle, FileText, ChevronDown, ChevronUp, Download } from "lucide-react";

export default function MeetingAnalysis({ result, onBack }) {
  const [copied, setCopied] = useState(false);
  const [expandedTranscript, setExpandedTranscript] = useState(false);

  // Track checked state of action items to make it interactive for users
  const actionItems = result.meeting_data?.action_items || [];
  const [checkedItems, setCheckedItems] = useState(
    new Array(actionItems.length).fill(false)
  );

  const handleToggleCheck = (index) => {
    const nextChecked = [...checkedItems];
    nextChecked[index] = !nextChecked[index];
    setCheckedItems(nextChecked);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.email_draft || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const buildMeetingReport = () => {
    const summaryLines = Array.isArray(summary) ? summary : [String(summary || "")];
    const createdAt = result.created_at
      ? new Date(result.created_at).toLocaleString()
      : new Date().toLocaleString();

    const actionLines = actionItems.length
      ? actionItems.map((item, index) => {
          const owner = item.owner || "Not specified";
          const deadline = item.deadline || "Not specified";
          const task = item.task || "No task description";
          return `${index + 1}. ${task}\n   - Owner: ${owner}\n   - Deadline: ${deadline}`;
        }).join("\n")
      : "No action items identified.";

    return [
      "# MeetMind Meeting Report",
      "",
      `Generated: ${createdAt}`,
      `Meeting ID: ${result.meeting_id || "Not available"}`,
      `Sentiment: ${sentiment}`,
      "",
      "## Executive Summary",
      "",
      summaryLines.filter(Boolean).map((line) => `- ${line}`).join("\n") || "No summary available.",
      "",
      "## Decisions",
      "",
      decisions.length ? decisions.map((decision) => `- ${decision}`).join("\n") : "No explicit decisions identified.",
      "",
      "## Action Items",
      "",
      actionLines,
      "",
      "## Unanswered Questions",
      "",
      questions.length ? questions.map((question) => `- ${question}`).join("\n") : "No unanswered questions identified.",
      "",
      "## Follow-up Email Draft",
      "",
      result.email_draft || "No email draft available.",
      "",
      "## Raw Transcript",
      "",
      result.transcript || "No transcript available.",
      "",
    ].join("\n");
  };

  const handleDownloadReport = () => {
    const report = buildMeetingReport();
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `meetmind-report-${date}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const meetingData = result.meeting_data || {};
  const decisions = meetingData.decisions || [];
  const questions = meetingData.unanswered_questions || [];
  const summary = meetingData.summary || [];
  const sentiment = meetingData.sentiment || "Neutral";

  // Initials generator for owner badge
  const getInitials = (name) => {
    if (!name || name === "Not specified") return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Color code sentiment
  const getSentimentBadge = (sent) => {
    const lower = sent.toLowerCase();
    if (lower.includes("positive")) return <span className="badge badge-success"><Heart size={12} /> Positive</span>;
    if (lower.includes("negative")) return <span className="badge badge-danger"><AlertTriangle size={12} /> Negative</span>;
    if (lower.includes("mixed")) return <span className="badge badge-info"><MessageSquare size={12} /> Mixed</span>;
    return <span className="badge badge-warning"><ShieldCheck size={12} /> Neutral</span>;
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* Detail header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {onBack && (
            <button className="btn btn-secondary" onClick={onBack} style={{ padding: "8px 12px" }}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <div>
            <h2 style={{ fontSize: "1.8rem" }}>Meeting Analysis</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              ID: {result.meeting_id} {result.created_at && `• Analyzed on ${new Date(result.created_at).toLocaleString()}`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button className="btn btn-secondary" onClick={handleDownloadReport}>
            <Download size={16} /> Export Report
          </button>
          {getSentimentBadge(sentiment)}
        </div>
      </div>

      {/* Quick metrics grid */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card">
          <div style={{
            background: "rgba(16, 185, 129, 0.1)",
            color: "var(--color-success)",
            borderRadius: "12px",
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="metric-value" style={{ color: "var(--color-success)" }}>{decisions.length}</div>
            <div className="metric-label">Decisions Logged</div>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <div style={{
            background: "rgba(6, 182, 212, 0.1)",
            color: "var(--accent-cyan)",
            borderRadius: "12px",
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Check size={24} />
          </div>
          <div>
            <div className="metric-value" style={{ color: "var(--accent-cyan)" }}>
              {checkedItems.filter(Boolean).length} / {actionItems.length}
            </div>
            <div className="metric-label">Action Items Done</div>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <div style={{
            background: "rgba(245, 158, 11, 0.1)",
            color: "var(--color-warning)",
            borderRadius: "12px",
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="metric-value" style={{ color: "var(--color-warning)" }}>{questions.length}</div>
            <div className="metric-label">Unanswered Questions</div>
          </div>
        </div>
      </div>

      {/* Summary block */}
      <div className="glass-panel" style={{
        padding: "24px 32px",
        borderLeft: "4px solid var(--accent-cyan)",
        background: "rgba(6, 182, 212, 0.02)"
      }}>
        <h3 style={{ marginBottom: "12px", fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-cyan)" }}>
          Executive Summary
        </h3>
        <ul style={{ listStyleType: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
          {Array.isArray(summary) ? summary.map((line, idx) => (
            <li key={idx} style={{ position: "relative", paddingLeft: "20px", color: "var(--text-primary)", fontSize: "1.05rem" }}>
              <span style={{ position: "absolute", left: 0, color: "var(--accent-cyan)" }}>•</span>
              {line}
            </li>
          )) : (
            <li style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>{String(summary)}</li>
          )}
        </ul>
      </div>

      {/* Split details layout */}
      <div className="detail-grid">

        {/* Left column - Accountability Insights */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

          {/* Decisions section */}
          <div className="glass-panel" style={{ padding: "30px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <ShieldCheck size={20} style={{ color: "var(--color-success)" }} /> Decisions Made
            </h3>
            {decisions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {decisions.map((decision, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    gap: "12px",
                    background: "rgba(16, 185, 129, 0.03)",
                    border: "1px solid rgba(16, 185, 129, 0.1)",
                    borderRadius: "10px",
                    padding: "14px 18px",
                  }}>
                    <Check size={16} style={{ color: "var(--color-success)", flexShrink: 0, marginTop: "3px" }} />
                    <span style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>{decision}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No explicit decisions identified in the meeting.</p>
            )}
          </div>

          {/* Action items checklist */}
          <div className="glass-panel" style={{ padding: "30px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <Check size={20} style={{ color: "var(--accent-cyan)" }} /> Action Items
            </h3>
            {actionItems.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {actionItems.map((item, idx) => {
                  const isChecked = checkedItems[idx];
                  const owner = item.owner || "Not specified";
                  const deadline = item.deadline || "Not specified";

                  return (
                    <div key={idx}
                      onClick={() => handleToggleCheck(idx)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "16px",
                        background: isChecked ? "rgba(255, 255, 255, 0.01)" : "rgba(255, 255, 255, 0.02)",
                        border: "1px solid",
                        borderColor: isChecked ? "rgba(255, 255, 255, 0.03)" : "var(--border-translucent)",
                        borderRadius: "12px",
                        padding: "16px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        opacity: isChecked ? 0.6 : 1,
                      }}
                      className="glass-panel-hover"
                    >
                      {/* Interactive checkbox */}
                      <div style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "6px",
                        border: "2px solid",
                        borderColor: isChecked ? "var(--accent-cyan)" : "var(--text-muted)",
                        background: isChecked ? "var(--accent-cyan)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: "2px",
                        flexShrink: 0,
                        transition: "all 0.2s ease"
                      }}>
                        {isChecked && <Check size={14} style={{ color: "#000", strokeWidth: 3 }} />}
                      </div>

                      {/* Content */}
                      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
                        <span style={{
                          fontSize: "0.95rem",
                          lineHeight: 1.5,
                          textDecoration: isChecked ? "line-through" : "none",
                          color: isChecked ? "var(--text-muted)" : "var(--text-primary)",
                          fontWeight: 500
                        }}>
                          {item.task}
                        </span>

                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                          {/* Owner badge */}
                          <span className="badge badge-info" style={{ textTransform: "capitalize" }}>
                            <div style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "50%",
                              background: "rgba(59, 130, 246, 0.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "7px",
                              fontWeight: 800
                            }}>
                              {getInitials(owner)}
                            </div>
                            <span style={{ fontSize: "0.75rem" }}>{owner}</span>
                          </span>

                          {/* Deadline badge */}
                          {deadline !== "Not specified" && (
                            <span className="badge badge-warning">
                              <Calendar size={11} />
                              <span style={{ fontSize: "0.75rem" }}>{deadline}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No action items identified in the meeting.</p>
            )}
          </div>

          {/* Unanswered Questions */}
          <div className="glass-panel" style={{ padding: "30px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <AlertTriangle size={20} style={{ color: "var(--color-warning)" }} /> Unanswered Questions
            </h3>
            {questions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {questions.map((question, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    gap: "12px",
                    background: "rgba(245, 158, 11, 0.03)",
                    border: "1px solid rgba(245, 158, 11, 0.1)",
                    borderRadius: "10px",
                    padding: "14px 18px",
                  }}>
                    <span style={{ color: "var(--color-warning)", fontWeight: "bold" }}>?</span>
                    <span style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>{question}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>All questions identified were answered during the session.</p>
            )}
          </div>
        </div>

        {/* Right column - Deliverables & Transcripts */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

          {/* Follow-up email draft */}
          <div className="glass-panel" style={{ padding: "30px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={20} style={{ color: "var(--accent-purple)" }} /> Follow-up Email
              </h3>
              <button
                className="btn btn-secondary"
                onClick={handleCopy}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  borderRadius: "8px",
                  borderColor: copied ? "var(--color-success)" : "var(--border-translucent)",
                  background: copied ? "var(--color-success-bg)" : "rgba(255, 255, 255, 0.02)"
                }}
              >
                {copied ? (
                  <>
                    <ClipboardCheck size={14} style={{ color: "var(--color-success)" }} /> Copied!
                  </>
                ) : (
                  <>
                    <Clipboard size={14} /> Copy Email
                  </>
                )}
              </button>
            </div>

            <div style={{
              background: "rgba(15, 23, 42, 0.4)",
              border: "1px solid var(--border-translucent)",
              borderRadius: "10px",
              padding: "18px",
              fontFamily: "var(--font-body)",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
              maxHeight: "380px",
              overflowY: "auto"
            }}>
              {result.email_draft}
            </div>
          </div>

          {/* Raw transcript expander */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <button
              onClick={() => setExpandedTranscript(!expandedTranscript)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                color: "var(--text-primary)"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}>
                <FileText size={18} style={{ color: "var(--text-secondary)" }} /> Raw Transcript
              </span>
              {expandedTranscript ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {expandedTranscript && (
              <div
                className="animate-fade-in"
                style={{
                  marginTop: "20px",
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid var(--border-translucent)",
                  borderRadius: "10px",
                  padding: "16px",
                  fontSize: "0.85rem",
                  lineHeight: 1.7,
                  maxHeight: "320px",
                  overflowY: "auto",
                  fontFamily: "monospace",
                  color: "var(--text-secondary)"
                }}
              >
                {/* Parse speaker lines and color-code speaker tags */}
                {result.transcript ? (
                  result.transcript.split("\n").map((line, idx) => {
                    const speakerMatch = line.match(/^(Speaker\s+[\w\d]+):(.*)$/i);
                    if (speakerMatch) {
                      const speaker = speakerMatch[1];
                      const text = speakerMatch[2];
                      // Alternate speaker colors
                      const speakerColor = speaker.toLowerCase().includes("a") || speaker.includes("1")
                        ? "var(--text-cyan)"
                        : "var(--accent-purple)";
                      return (
                        <div key={idx} style={{ marginBottom: "10px" }}>
                          <span style={{ color: speakerColor, fontWeight: "bold" }}>{speaker}:</span>
                          <span style={{ color: "var(--text-primary)" }}>{text}</span>
                        </div>
                      );
                    }
                    return <div key={idx} style={{ marginBottom: "6px" }}>{line}</div>;
                  })
                ) : (
                  <p style={{ color: "var(--text-muted)" }}>No transcript text available.</p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
