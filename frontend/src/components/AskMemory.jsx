import { useState, useRef, useEffect } from "react";
import { Send, Loader, Bot, User, Search, CornerDownRight } from "lucide-react";
import { apiUrl } from "../api";

export default function AskMemory() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I am the MeetMind memory retrieval assistant. I search across all your saved meetings using embeddings and Gemini. Ask me anything about past decisions, deadlines, or discussions!",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messageIdRef = useRef(0);

  const nextMessageId = () => {
    messageIdRef.current += 1;
    return `message-${messageIdRef.current}`;
  };

  const suggestionChips = [
    "What did we decide about the API timeline?",
    "What are the action items from the last meeting?",
    "Were there any unanswered questions about the budget?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    if (!textToSend) {
      setInput("");
    }

    const userMessage = {
      id: nextMessageId(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch(apiUrl("/ask-memory"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: query }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errData.detail || "Server error query memory");
      }

      const result = await response.json();

      const assistantMessage = {
        id: nextMessageId(),
        role: "assistant",
        content: result.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = {
        id: nextMessageId(),
        role: "assistant",
        content: `Error retrieving memory: ${err.message}. Please make sure you have initialized your database and have added valid API keys to your backend environment.`,
        isError: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 120px)",
      minHeight: "560px",
      padding: "28px 24px",
      overflow: "hidden"
    }}>
      {/* Tab Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", borderBottom: "1px solid var(--border-translucent)", paddingBottom: "18px", marginBottom: "22px" }}>
        <div style={{
          background: "rgba(6, 182, 212, 0.08)",
          borderRadius: "10px",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent-cyan)",
          border: "1px solid rgba(6, 182, 212, 0.15)"
        }}>
          <Search size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 750 }}>Ask Memory</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Ask questions across all saved meetings using vector embeddings</p>
        </div>
      </div>

      {/* Messages Window */}
      <div style={{
        flexGrow: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        paddingRight: "8px",
        marginBottom: "24px"
      }}>
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                gap: "14px",
                flexDirection: isUser ? "row-reverse" : "row",
                alignItems: "flex-start",
                maxWidth: "85%",
                alignSelf: isUser ? "flex-end" : "flex-start",
                animation: "slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              }}
            >
              {/* Avatar */}
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: isUser ? "var(--accent-cyan-glow)" : "rgba(139, 92, 246, 0.08)",
                border: "1px solid",
                borderColor: isUser ? "var(--accent-cyan)" : "var(--accent-purple)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isUser ? "var(--text-cyan)" : "var(--text-purple)",
                flexShrink: 0,
                boxShadow: isUser ? "0 0 10px rgba(6, 182, 212, 0.1)" : "0 0 10px rgba(139, 92, 246, 0.1)"
              }}>
                {isUser ? <User size={18} /> : <Bot size={18} />}
              </div>

              {/* Bubble */}
              <div style={{
                padding: "16px 22px",
                borderRadius: isUser ? "20px 4px 20px 20px" : "4px 20px 20px 20px",
                background: isUser ? "rgba(6, 182, 212, 0.05)" : "rgba(255, 255, 255, 0.015)",
                border: "1px solid",
                borderColor: msg.isError
                  ? "rgba(239, 68, 68, 0.25)"
                  : isUser
                    ? "rgba(6, 182, 212, 0.18)"
                    : "var(--border-translucent)",
                color: msg.isError ? "var(--color-danger)" : "var(--text-primary)",
                fontSize: "0.95rem",
                lineHeight: 1.65,
                whiteSpace: "pre-wrap",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.25)"
              }}>
                {msg.content}

                {/* Visual quote/source reference highlighting if text has references */}
                {!isUser && msg.content.includes("Meeting ID:") && (
                  <div style={{
                    marginTop: "14px",
                    paddingTop: "12px",
                    borderTop: "1px dashed var(--border-translucent)",
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: 500
                  }}>
                    <CornerDownRight size={13} style={{ color: "var(--accent-cyan)" }} />
                    <span style={{ color: "var(--text-cyan)", letterSpacing: "0.02em" }}>Cross-referenced from vector library</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {loading && (
          <div style={{
            display: "flex",
            gap: "14px",
            alignItems: "flex-start",
            maxWidth: "85%",
            alignSelf: "flex-start"
          }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(139, 92, 246, 0.08)",
              border: "1px solid var(--accent-purple)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-purple)",
              flexShrink: 0
            }}>
              <Loader size={18} style={{ animation: "spin 2s linear infinite" }} />
            </div>

            <div style={{
              padding: "16px 24px",
              borderRadius: "4px 20px 20px 20px",
              background: "rgba(255, 255, 255, 0.01)",
              border: "1px solid var(--border-translucent)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "var(--text-secondary)",
              fontSize: "0.92rem",
              fontWeight: 500
            }}>
              <span style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--accent-cyan)",
                display: "inline-block",
                boxShadow: "0 0 6px var(--accent-cyan)",
                animation: "pulseGlowPurple 1s infinite"
              }} />
              <span>MeetMind is searching vector database...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && !loading && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "20px",
          animation: "slideUpFade 0.5s ease"
        }}>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em" }}>SUGGESTED RETRIEVALS:</span>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "24px",
                  border: "1px solid var(--border-translucent)",
                  background: "rgba(255, 255, 255, 0.015)",
                  color: "var(--text-secondary)",
                  fontSize: "0.86rem",
                  fontWeight: 550,
                  cursor: "pointer",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  textAlign: "left"
                }}
                className="glass-panel-hover"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input */}
      <div style={{
        display: "flex",
        gap: "12px",
        position: "relative"
      }}>
        <textarea
          className="form-input"
          placeholder="Ask a question about past meetings..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={loading}
          style={{
            flexGrow: 1,
            borderRadius: "16px",
            minHeight: "56px",
            maxHeight: "120px",
            padding: "16px 60px 16px 18px",
            resize: "none",
            lineHeight: 1.5,
            fontSize: "0.96rem",
            background: "rgba(8, 12, 26, 0.95)",
            boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.4)",
            border: "1px solid var(--border-translucent)"
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          style={{
            position: "absolute",
            right: "10px",
            top: "10px",
            width: "36px",
            height: "36px",
            padding: 0,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 10px var(--accent-cyan-glow)"
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
