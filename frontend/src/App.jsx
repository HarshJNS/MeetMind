import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
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
} from "lucide-react";
import NewMeeting from "./components/NewMeeting";
import MeetingAnalysis from "./components/MeetingAnalysis";
import AskMemory from "./components/AskMemory";
import MeetingHistory from "./components/MeetingHistory";
import { API_BASE_URL, apiUrl } from "./api";

export default function App() {
  const [showLanding, setShowLanding] = useState(() => {
    return localStorage.getItem("meetmind:enteredApp") !== "true";
  });
  const [activeTab, setActiveTab] = useState("new"); // 'new', 'ask', 'history'
  const [latestResult, setLatestResult] = useState(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [selectedMeetingDetails, setSelectedMeetingDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [backendStatus, setBackendStatus] = useState("checking"); // 'checking', 'connected', 'disconnected'

  // Check backend status on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(apiUrl("/health"), { signal: AbortSignal.timeout(3000) });
        if (response.ok) {
          setBackendStatus("connected");
        } else {
          setBackendStatus("disconnected");
        }
      } catch {
        setBackendStatus("disconnected");
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  // Fetch full details of a past meeting
  const handleSelectMeeting = async (meetingId) => {
    setSelectedMeetingId(meetingId);
    setLoadingDetails(true);
    setDetailsError(null);

    try {
      const response = await fetch(apiUrl(`/meetings/${meetingId}`));
      if (!response.ok) {
        throw new Error(`Failed to fetch details (HTTP ${response.status})`);
      }
      const data = await response.json();

      // The API returns the meeting record directly. Convert it to match results schema
      const formattedResult = {
        meeting_id: data.id,
        transcript: data.transcript,
        meeting_data: {
          decisions: data.decisions || [],
          action_items: data.action_items || [],
          unanswered_questions: data.unanswered_questions || [],
          sentiment: data.sentiment || "Neutral",
          summary: data.summary || []
        },
        email_draft: data.email_draft,
        created_at: data.created_at
      };

      setSelectedMeetingDetails(formattedResult);
    } catch (err) {
      setDetailsError(err.message || "Could not retrieve details for this meeting.");
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

  if (showLanding) {
    return <LandingPage onEnterApp={enterApp} />;
  }

  return (
    <div className="app-container">

      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          marginBottom: "6px",
          background: "rgba(255, 255, 255, 0.02)",
          padding: "12px 16px",
          borderRadius: "16px",
          border: "1px solid var(--border-translucent)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)"
        }}>
          <div style={{
            background: "var(--accent-gradient)",
            borderRadius: "12px",
            width: "38px",
            height: "38px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            boxShadow: "0 0 15px var(--accent-cyan-glow)"
          }}>
            <Brain size={22} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.35rem", margin: 0, fontWeight: 900, letterSpacing: "-0.03em" }}>MeetMind</h1>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              AI Intelligence
            </p>
          </div>
        </div>

        <nav className="nav-menu">
          <button
            className="nav-item"
            onClick={() => {
              localStorage.removeItem("meetmind:enteredApp");
              setShowLanding(true);
            }}
            type="button"
          >
            <PlayCircle size={18} />
            <span>Landing Page</span>
          </button>
          <div
            className={`nav-item ${activeTab === "new" && !selectedMeetingId && !latestResult ? "active" : ""}`}
            onClick={() => {
              setLatestResult(null);
              setSelectedMeetingId(null);
              setSelectedMeetingDetails(null);
              setActiveTab("new");
            }}
          >
            <PlusCircle size={18} />
            <span>New Meeting</span>
          </div>

          <div
            className={`nav-item ${activeTab === "ask" ? "active" : ""}`}
            onClick={() => {
              setLatestResult(null);
              setSelectedMeetingId(null);
              setSelectedMeetingDetails(null);
              setActiveTab("ask");
            }}
          >
            <Search size={18} />
            <span>Ask Memory</span>
          </div>

          <div
            className={`nav-item ${activeTab === "history" || selectedMeetingId ? "active" : ""}`}
            onClick={() => {
              setLatestResult(null);
              setSelectedMeetingId(null);
              setSelectedMeetingDetails(null);
              setActiveTab("history");
            }}
          >
            <History size={18} />
            <span>Meeting Archive</span>
          </div>
        </nav>

        {/* User profile section widget (adds premium look) */}
        <div style={{
          background: "linear-gradient(to bottom, rgba(255,255,255,0.01), rgba(255,255,255,0.03))",
          border: "1px solid var(--border-translucent)",
          borderRadius: "14px",
          padding: "12px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "var(--accent-gradient)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.8rem",
            fontWeight: "bold",
            color: "#fff"
          }}>
            DW
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>Demo Workspace</div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>meetmind@demo</div>
          </div>
        </div>

        {/* API connection status footer */}
        <div style={{
          paddingTop: "20px",
          borderTop: "1px solid var(--border-translucent)",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
          {backendStatus === "connected" ? (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(16, 185, 129, 0.05)",
              border: "1px solid rgba(16, 185, 129, 0.15)",
              padding: "6px 12px",
              borderRadius: "20px",
              width: "100%"
            }}>
              <span style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--color-success)",
                display: "inline-block",
                boxShadow: "0 0 8px var(--color-success)",
                animation: "pulse 2s infinite"
              }} />
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600, letterSpacing: "0.02em" }}>SYSTEM ONLINE</span>
            </div>
          ) : backendStatus === "disconnected" ? (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              padding: "6px 12px",
              borderRadius: "20px",
              width: "100%"
            }}>
              <span style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--color-danger)",
                display: "inline-block",
                boxShadow: "0 0 8px var(--color-danger)"
              }} />
              <span style={{ fontSize: "0.72rem", color: "var(--color-danger)", fontWeight: 650, letterSpacing: "0.02em" }}>SYSTEM OFFLINE</span>
            </div>
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border-translucent)",
              padding: "6px 12px",
              borderRadius: "20px",
              width: "100%"
            }}>
              <Radio size={12} style={{ color: "var(--text-muted)", animation: "spin 2s linear infinite" }} />
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>DIAGNOSTIC CHECK...</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main View Area */}
      <main className="main-content">

        {/* Offline Warning Banner */}
        {backendStatus === "disconnected" && (
          <div className="glass-panel animate-fade-in" style={{
            borderColor: "rgba(239, 68, 68, 0.25)",
            background: "rgba(239, 68, 68, 0.03)",
            padding: "14px 20px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "0.85rem",
            color: "var(--color-danger)",
            boxShadow: "0 4px 15px rgba(239, 68, 68, 0.05)"
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>FastAPI backend seems to be down at <code>{API_BASE_URL}</code>. Start the backend with <code>python scripts/start_backend.py</code>.</span>
          </div>
        )}

        {/* Screen Loader for Detailed view fetching */}
        {loadingDetails && (
          <div className="glass-panel animate-fade-in" style={{
            padding: "60px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            minHeight: "400px"
          }}>
            <div style={{
              position: "relative",
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              border: "2px solid rgba(6, 182, 212, 0.1)",
              borderTopColor: "var(--accent-cyan)",
              animation: "spin 1.2s linear infinite"
            }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", fontWeight: 500, letterSpacing: "0.01em" }}>
              Retrieving detailed meeting dossier...
            </p>
          </div>
        )}

        {/* Error State for Detailed view fetching */}
        {detailsError && !loadingDetails && (
          <div className="glass-panel animate-fade-in" style={{
            padding: "48px",
            textAlign: "center",
            borderColor: "rgba(239, 68, 68, 0.3)",
            background: "rgba(239, 68, 68, 0.03)",
          }}>
            <AlertTriangle size={36} style={{ color: "var(--color-danger)", marginBottom: "16px" }} />
            <p style={{ color: "var(--color-danger)", fontWeight: 700, fontSize: "1.1rem" }}>Failed to retrieve meeting details</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "8px", maxWidth: "480px", marginInline: "auto" }}>{detailsError}</p>
            <button className="btn btn-secondary" onClick={handleBackToHistory} style={{ marginTop: "24px" }}>
              Back to Archive
            </button>
          </div>
        )}

        {/* Screen rendering logic */}
        {!loadingDetails && !detailsError && (
          <div className="animate-fade-in" key={selectedMeetingId || (latestResult ? latestResult.meeting_id : activeTab)}>
            {/* Show Selected History Meeting Detail */}
            {selectedMeetingDetails && (
              <MeetingAnalysis result={selectedMeetingDetails} onBack={handleBackToHistory} />
            )}

            {/* Show Newly Analyzed Meeting Detail */}
            {latestResult && !selectedMeetingDetails && (
              <MeetingAnalysis result={latestResult} onBack={handleClearLatestResult} />
            )}

            {/* Default Tab Rendering */}
            {!latestResult && !selectedMeetingDetails && (
              <>
                {activeTab === "new" && (
                  <NewMeeting onAnalysisComplete={(res) => setLatestResult(res)} />
                )}
                {activeTab === "ask" && (
                  <AskMemory />
                )}
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

function LandingPage({ onEnterApp }) {
  const features = [
    {
      icon: <Mic size={20} />,
      title: "Record or Upload",
      body: "Capture a live meeting, upload audio, or paste an existing transcript without leaving the workspace.",
    },
    {
      icon: <CheckCircle2 size={20} />,
      title: "Accountability Extraction",
      body: "MeetMind turns messy conversation into decisions, owners, deadlines, and unresolved questions.",
    },
    {
      icon: <Database size={20} />,
      title: "Searchable Memory",
      body: "Every meeting becomes searchable memory, so teams can ask what was decided weeks later.",
    },
    {
      icon: <Mail size={20} />,
      title: "Follow-up Drafts",
      body: "Generate a concise follow-up email so action items do not disappear after the call ends.",
    },
  ];

  const workflow = [
    "Capture meeting audio or transcript",
    "Extract decisions and accountable action items",
    "Save structured history and vector memory",
    "Ask questions across every saved meeting",
  ];

  return (
    <div className="landing-shell">
      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true" />
        <div className="landing-hero-overlay" aria-hidden="true" />

        <header className="landing-nav">
          <div className="landing-brand">
            <span className="landing-brand-mark">
              <Brain size={22} />
            </span>
            <span>MeetMind</span>
          </div>
          <button className="landing-nav-cta" onClick={onEnterApp} type="button">
            Open Dashboard
          </button>
        </header>

        <div className="landing-hero-content">
          <p className="landing-eyebrow">AI meeting accountability layer</p>
          <h1>Turn every meeting into decisions, owners, and searchable memory.</h1>
          <p className="landing-hero-copy">
            MeetMind records or analyzes meetings, extracts what matters, drafts follow-ups,
            and lets your team ask plain-English questions across the full meeting history.
          </p>
          <div className="landing-actions">
            <button className="landing-primary" onClick={onEnterApp} type="button">
              Launch MeetMind <ArrowRight size={18} />
            </button>
            <button className="landing-secondary" onClick={onEnterApp} type="button">
              <PlayCircle size={18} /> Try Demo Flow
            </button>
          </div>
        </div>

        <div className="landing-hero-strip">
          <div>
            <strong>3</strong>
            <span>Input modes</span>
          </div>
          <div>
            <strong>RAG</strong>
            <span>Meeting memory</span>
          </div>
          <div>
            <strong>JSON</strong>
            <span>Structured extraction</span>
          </div>
          <div>
            <strong>Email</strong>
            <span>Drafted follow-ups</span>
          </div>
        </div>
      </section>

      <section className="landing-section landing-product-section">
        <div className="landing-section-copy">
          <p className="landing-eyebrow">Built for operators</p>
          <h2>The dashboard starts where normal transcribers stop.</h2>
          <p>
            Transcripts are useful, but accountability is the real business value. MeetMind
            keeps the transcript, then adds decisions, ownership, unanswered questions, and recall.
          </p>
        </div>
        <div className="landing-preview" aria-label="MeetMind product preview">
          <div className="preview-sidebar">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-main">
            <div className="preview-topline" />
            <div className="preview-cards">
              <div />
              <div />
              <div />
            </div>
            <div className="preview-panel">
              <div className="preview-row long" />
              <div className="preview-row" />
              <div className="preview-row short" />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-feature-grid">
        {features.map((feature) => (
          <article className="landing-feature-card" key={feature.title}>
            <span>{feature.icon}</span>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="landing-section landing-workflow">
        <div>
          <p className="landing-eyebrow">Workflow</p>
          <h2>From meeting chaos to accountable memory in one pass.</h2>
        </div>
        <div className="workflow-list">
          {workflow.map((step, index) => (
            <div className="workflow-step" key={step}>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-final">
        <div>
          <SearchCheck size={34} />
          <h2>Ready to demo the memory layer?</h2>
          <p>
            Open the dashboard, analyze a meeting, then ask what was decided. That is the moment
            MeetMind stops feeling like a summarizer and starts feeling like company memory.
          </p>
        </div>
        <button className="landing-primary" onClick={onEnterApp} type="button">
          Open Dashboard <ShieldCheck size={18} />
        </button>
      </section>
    </div>
  );
}
