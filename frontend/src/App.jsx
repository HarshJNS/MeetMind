import { useState, useEffect } from "react";
import { PlusCircle, Search, History, Brain, Radio, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import NewMeeting from "./components/NewMeeting";
import MeetingAnalysis from "./components/MeetingAnalysis";
import AskMemory from "./components/AskMemory";
import MeetingHistory from "./components/MeetingHistory";
import { API_BASE_URL, apiUrl } from "./api";

export default function App() {
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

  return (
    <div className="app-container">

      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{
            background: "var(--accent-gradient)",
            borderRadius: "10px",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff"
          }}>
            <Brain size={20} />
          </div>
          <h1 style={{ fontSize: "1.45rem", margin: 0, fontWeight: 800 }}>MeetMind</h1>
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "32px", paddingLeft: "4px" }}>
          AI Accountability Partner
        </p>

        <nav className="nav-menu">
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

        {/* API connection status footer */}
        <div style={{
          marginTop: "auto",
          paddingTop: "20px",
          borderTop: "1px solid var(--border-translucent)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          {backendStatus === "connected" ? (
            <>
              <Wifi size={14} style={{ color: "var(--color-success)" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>API Connected</span>
            </>
          ) : backendStatus === "disconnected" ? (
            <>
              <WifiOff size={14} style={{ color: "var(--color-danger)" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--color-danger)", fontWeight: 600 }}>API Offline</span>
            </>
          ) : (
            <>
              <Radio size={14} style={{ color: "var(--text-muted)", animation: "spin 2s linear infinite" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Checking API...</span>
            </>
          )}
        </div>
      </aside>

      {/* Main View Area */}
      <main className="main-content">

        {/* Offline Warning Banner */}
        {backendStatus === "disconnected" && (
          <div className="glass-panel" style={{
            borderColor: "rgba(239, 68, 68, 0.2)",
            background: "rgba(239, 68, 68, 0.05)",
            padding: "12px 18px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "0.85rem",
            color: "var(--color-danger)"
          }}>
            <AlertTriangle size={16} />
            <span>FastAPI backend seems to be down at <code>{API_BASE_URL}</code>. Start the backend with <code>python scripts/start_backend.py</code>.</span>
          </div>
        )}

        {/* Screen Loader for Detailed view fetching */}
        {loadingDetails && (
          <div className="glass-panel" style={{
            padding: "60px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            minHeight: "400px"
          }}>
            <Radio size={36} style={{ color: "var(--accent-cyan)", animation: "spin 3s linear infinite" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Fetching complete meeting dossier...</p>
          </div>
        )}

        {/* Error State for Detailed view fetching */}
        {detailsError && !loadingDetails && (
          <div className="glass-panel" style={{
            padding: "40px",
            textAlign: "center",
            borderColor: "rgba(239, 68, 68, 0.3)",
            background: "rgba(239, 68, 68, 0.05)",
          }}>
            <p style={{ color: "var(--color-danger)", fontWeight: 600 }}>Failed to fetch meeting details</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "6px" }}>{detailsError}</p>
            <button className="btn btn-secondary" onClick={handleBackToHistory} style={{ marginTop: "20px" }}>
              Back to Archive
            </button>
          </div>
        )}

        {/* Screen rendering logic */}
        {!loadingDetails && !detailsError && (
          <>
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
          </>
        )}
      </main>

    </div>
  );
}
