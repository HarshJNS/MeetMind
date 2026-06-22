import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  History,
  Mail,
  Mic,
  PlayCircle,
  PlusCircle,
  Radio,
  Search,
  SearchCheck,
  ShieldCheck,
  Zap,
  Activity,
} from "lucide-react";
import NewMeeting from "./components/NewMeeting";
import MeetingAnalysis from "./components/MeetingAnalysis";
import AskMemory from "./components/AskMemory";
import MeetingHistory from "./components/MeetingHistory";
import { API_BASE_URL, apiUrl } from "./api";

const LOGO_SRC = "/meetmind-mark.png";

export default function App() {
  const [showLanding, setShowLanding] = useState(() => {
    return localStorage.getItem("meetmind:enteredApp") !== "true";
  });
  const [activeTab, setActiveTab] = useState("new");
  const [latestResult, setLatestResult] = useState(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [selectedMeetingDetails, setSelectedMeetingDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [backendStatus, setBackendStatus] = useState("checking");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(apiUrl("/health"), { signal: AbortSignal.timeout(3000) });
        setBackendStatus(response.ok ? "connected" : "disconnected");
      } catch {
        setBackendStatus("disconnected");
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectMeeting = async (meetingId) => {
    setSelectedMeetingId(meetingId);
    setLoadingDetails(true);
    setDetailsError(null);
    try {
      const response = await fetch(apiUrl(`/meetings/${meetingId}`));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSelectedMeetingDetails({
        meeting_id: data.id,
        transcript: data.transcript,
        meeting_data: {
          decisions: data.decisions || [],
          action_items: data.action_items || [],
          unanswered_questions: data.unanswered_questions || [],
          sentiment: data.sentiment || "Neutral",
          summary: data.summary || [],
        },
        email_draft: data.email_draft,
        created_at: data.created_at,
      });
    } catch (err) {
      setDetailsError(err.message || "Could not retrieve meeting details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBackToHistory = () => {
    setSelectedMeetingId(null);
    setSelectedMeetingDetails(null);
    setDetailsError(null);
    setActiveTab("history");
  };

  const handleClearLatestResult = () => {
    setLatestResult(null);
    setActiveTab("new");
  };

  const enterApp = () => {
    localStorage.setItem("meetmind:enteredApp", "true");
    setShowLanding(false);
  };

  if (showLanding) return <LandingPage onEnterApp={enterApp} />;

  const navItems = [
    { id: "new", icon: <PlusCircle size={16} />, label: "New Meeting" },
    { id: "ask", icon: <Search size={16} />, label: "Ask Memory" },
    { id: "history", icon: <History size={16} />, label: "Archive" },
  ];

  const isHistoryActive = activeTab === "history" || !!selectedMeetingId;

  return (
    <div className="mm-shell">
      {/* ── Sidebar ── */}
      <aside className="mm-sidebar">
        {/* Brand */}
        <div className="mm-brand">
          <div className="mm-brand-icon">
            <img src={LOGO_SRC} alt="" />
          </div>
          <div>
            <span className="mm-brand-name">MeetMind</span>
            <span className="mm-brand-sub">AI Intelligence</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="mm-nav">
          {/* Landing shortcut */}
          <button
            className="mm-nav-item mm-nav-ghost"
            onClick={() => { localStorage.removeItem("meetmind:enteredApp"); setShowLanding(true); }}
            type="button"
          >
            <PlayCircle size={16} />
            <span>Landing</span>
          </button>

          {navItems.map(({ id, icon, label }) => {
            const active =
              id === "history"
                ? isHistoryActive
                : activeTab === id && !selectedMeetingId && !latestResult;
            return (
              <button
                key={id}
                className={`mm-nav-item${active ? " mm-nav-item--active" : ""}`}
                onClick={() => {
                  setLatestResult(null);
                  setSelectedMeetingId(null);
                  setSelectedMeetingDetails(null);
                  setActiveTab(id);
                }}
                type="button"
              >
                {icon}
                <span>{label}</span>
                {active && <span className="mm-nav-pip" />}
              </button>
            );
          })}
        </nav>

        <div className="mm-sidebar-spacer" />

        {/* Owner card */}
        <div className="mm-owner-card">
          <div className="mm-avatar">HR</div>
          <div className="mm-owner-info">
            <span className="mm-owner-name">Harsh Raj</span>
            <a
              href="https://github.com/HarshJNS"
              target="_blank"
              rel="noopener noreferrer"
              className="mm-owner-link"
            >
              @HarshJNS
            </a>
          </div>
        </div>

        {/* Status */}
        <div className="mm-status-row">
          {backendStatus === "connected" && (
            <div className="mm-status mm-status--online">
              <span className="mm-status-dot mm-status-dot--pulse" />
              <span>System online</span>
            </div>
          )}
          {backendStatus === "disconnected" && (
            <div className="mm-status mm-status--offline">
              <span className="mm-status-dot" />
              <span>System offline</span>
            </div>
          )}
          {backendStatus === "checking" && (
            <div className="mm-status mm-status--checking">
              <Radio size={11} className="mm-spin" />
              <span>Connecting…</span>
            </div>
          )}
        </div>

        <p className="mm-copyright">© 2026 Harsh Raj</p>
      </aside>

      {/* ── Main ── */}
      <main className="mm-main">
        {/* Offline banner */}
        {backendStatus === "disconnected" && (
          <div className="mm-banner mm-banner--error animate-up">
            <AlertTriangle size={16} />
            <span>
              Backend offline at <code>{API_BASE_URL}</code> — run{" "}
              <code>python scripts/start_backend.py</code>
            </span>
          </div>
        )}

        {/* Loading state */}
        {loadingDetails && (
          <div className="mm-loader-wrap animate-up">
            <div className="mm-spinner" />
            <p>Retrieving meeting dossier…</p>
          </div>
        )}

        {/* Error state */}
        {detailsError && !loadingDetails && (
          <div className="mm-error-wrap animate-up">
            <AlertTriangle size={32} />
            <h3>Couldn't load this meeting</h3>
            <p>{detailsError}</p>
            <button className="mm-btn mm-btn--ghost" onClick={handleBackToHistory}>
              Back to Archive
            </button>
          </div>
        )}

        {/* Content */}
        {!loadingDetails && !detailsError && (
          <div
            className="animate-up"
            key={selectedMeetingId || (latestResult ? latestResult.meeting_id : activeTab)}
          >
            {selectedMeetingDetails && (
              <MeetingAnalysis result={selectedMeetingDetails} onBack={handleBackToHistory} />
            )}
            {latestResult && !selectedMeetingDetails && (
              <MeetingAnalysis result={latestResult} onBack={handleClearLatestResult} />
            )}
            {!latestResult && !selectedMeetingDetails && (
              <>
                {activeTab === "new" && (
                  <NewMeeting onAnalysisComplete={(res) => setLatestResult(res)} />
                )}
                {activeTab === "ask" && <AskMemory />}
                {activeTab === "history" && (
                  <MeetingHistory onSelectMeeting={handleSelectMeeting} />
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LANDING PAGE
───────────────────────────────────────────── */
function LandingPage({ onEnterApp }) {
  const features = [
    {
      icon: <Mic size={18} />,
      title: "Record or upload",
      body: "Capture live audio, drop a file, or paste a transcript. MeetMind handles all three without switching tools.",
    },
    {
      icon: <CheckCircle2 size={18} />,
      title: "Decisions & owners",
      body: "Every meeting produces a structured list of what was decided, who owns each item, and what's still unresolved.",
    },
    {
      icon: <Database size={18} />,
      title: "Searchable memory",
      body: "ChromaDB + Gemini embeddings turn months of meetings into a queryable knowledge base your team can ask anything.",
    },
    {
      icon: <Mail size={18} />,
      title: "Follow-up drafts",
      body: "A concise, ready-to-send email generated the moment analysis finishes — no manual write-up required.",
    },
  ];

  const steps = [
    { n: "01", text: "Capture meeting audio or paste a transcript" },
    { n: "02", text: "AI extracts decisions, owners, and open questions" },
    { n: "03", text: "Meeting is saved to searchable vector memory" },
    { n: "04", text: "Ask plain-English questions across all past meetings" },
  ];

  const stats = [
    { value: "3", label: "Input modes" },
    { value: "RAG", label: "Vector memory" },
    { value: "JSON", label: "Structured output" },
    { value: "Email", label: "Auto follow-up" },
  ];

  return (
    <div className="lp">
      {/* ── Background ── */}
      <div className="lp-bg" aria-hidden="true" />

      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <div className="lp-logo-mark"><img src={LOGO_SRC} alt="" /></div>
            <span>MeetMind</span>
          </div>
          <button className="lp-nav-btn" onClick={onEnterApp} type="button">
            Open dashboard <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-eyebrow">
            <Zap size={12} />
            AI meeting accountability layer
          </div>

          <h1 className="lp-headline">
            Every meeting.<br />
            <span className="lp-headline-accent">Decisions. Owners.<br />Memory.</span>
          </h1>

          <p className="lp-hero-copy">
            MeetMind turns audio and transcripts into structured accountability:
            decisions, action items, follow-up drafts, and a searchable knowledge base
            your team can query weeks later.
          </p>

          <div className="lp-actions">
            <button className="lp-cta-primary" onClick={onEnterApp} type="button">
              Launch MeetMind <ArrowRight size={16} />
            </button>
            <button className="lp-cta-ghost" onClick={onEnterApp} type="button">
              <PlayCircle size={16} /> Try demo
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="lp-stats">
          {stats.map((s) => (
            <div key={s.label} className="lp-stat">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Product preview ── */}
      <section className="lp-section lp-product">
        <div className="lp-product-copy">
          <p className="lp-label">Product</p>
          <h2>The dashboard that starts where transcribers stop.</h2>
          <p>
            Transcripts are useful. Accountability is the business value.
            MeetMind keeps the transcript and adds decisions, ownership,
            unanswered questions, and instant recall.
          </p>
        </div>

        <div className="lp-mock" aria-label="MeetMind dashboard preview">
          <div className="lp-mock-sidebar">
            <span className="lp-mock-nav lp-mock-nav--active">Analyze</span>
            <span className="lp-mock-nav">Memory</span>
            <span className="lp-mock-nav">Archive</span>
          </div>
          <div className="lp-mock-body">
            <div className="lp-mock-topbar">
              <span>Weekly Ops Sync</span>
              <span className="lp-mock-badge">Positive</span>
            </div>
            <div className="lp-mock-metrics">
              {[["4", "Decisions"], ["7", "Actions"], ["2", "Open"]].map(([v, l]) => (
                <div key={l} className="lp-mock-metric">
                  <strong>{v}</strong><span>{l}</span>
                </div>
              ))}
            </div>
            <div className="lp-mock-feed">
              <div className="lp-mock-row lp-mock-row--decision">
                <CheckCircle2 size={13} />
                <span>Move vendor pricing review to Friday.</span>
              </div>
              <div className="lp-mock-row lp-mock-row--task">
                <span className="lp-mock-owner">Priya</span>
                <span>Send revised onboarding plan by tomorrow.</span>
              </div>
              <div className="lp-mock-row lp-mock-row--query">
                <SearchCheck size={13} />
                <span>Ask: What did we decide about Q3 budget?</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-section lp-features">
        {features.map((f) => (
          <article key={f.title} className="lp-feature-card">
            <div className="lp-feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </article>
        ))}
      </section>

      {/* ── Workflow ── */}
      <section className="lp-section lp-workflow">
        <div className="lp-workflow-copy">
          <p className="lp-label">Workflow</p>
          <h2>From meeting chaos to accountable memory in one pass.</h2>
        </div>
        <div className="lp-steps">
          {steps.map((s) => (
            <div key={s.n} className="lp-step">
              <span className="lp-step-num">{s.n}</span>
              <span className="lp-step-text">{s.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="lp-section">
        <div className="lp-cta-banner">
          <div className="lp-cta-banner-copy">
            <Activity size={28} className="lp-cta-banner-icon" />
            <h2>Ready to demo the memory layer?</h2>
            <p>
              Analyze a meeting, then ask what was decided three weeks ago.
              That's the moment MeetMind stops feeling like a summarizer.
            </p>
          </div>
          <button className="lp-cta-primary" onClick={onEnterApp} type="button">
            Open dashboard <ShieldCheck size={16} />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span>© 2026 Harsh Raj. All rights reserved.</span>
          <a href="https://github.com/HarshJNS" target="_blank" rel="noopener noreferrer">
            GitHub: @HarshJNS
          </a>
        </div>
      </footer>
    </div>
  );
}
