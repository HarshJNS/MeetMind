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
      minHeight: "550px",
      padding: "24px",
      overflow: "hidden"
    }}>
      {/* Tab Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--border-translucent)", paddingBottom: "16px", marginBottom: "20px" }}>
        <Search size={22} style={{ color: "var(--accent-cyan)" }} />
        <div>
          <h2>Ask Memory</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Ask questions across all saved meetings using vector embeddings</p>
        </div>
      </div>

      {/* Messages Window */}
      <div style={{
        flexGrow: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        paddingRight: "8px",
        marginBottom: "20px"
      }}>
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                gap: "12px",
                flexDirection: isUser ? "row-reverse" : "row",
                alignItems: "flex-start",
                maxWidth: "85%",
                alignSelf: isUser ? "flex-end" : "flex-start"
              }}
            >
              {/* Avatar */}
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: isUser ? "var(--accent-cyan-glow)" : "rgba(168, 85, 247, 0.1)",
                border: "1px solid",
                borderColor: isUser ? "var(--accent-cyan)" : "var(--accent-purple)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isUser ? "var(--text-primary)" : "var(--accent-purple)",
                flexShrink: 0
              }}>
                {isUser ? <User size={18} /> : <Bot size={18} />}
              </div>

              {/* Bubble */}
              <div style={{
                padding: "16px 20px",
                borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                background: isUser ? "rgba(6, 182, 212, 0.08)" : "rgba(255, 255, 255, 0.02)",
                border: "1px solid",
                borderColor: msg.isError
                  ? "rgba(239, 68, 68, 0.2)"
                  : isUser
                    ? "rgba(6, 182, 212, 0.15)"
                    : "var(--border-translucent)",
                color: msg.isError ? "var(--color-danger)" : "var(--text-primary)",
                fontSize: "0.95rem",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
              }}>
                {msg.content}

                {/* Visual quote/source reference highlighting if text has references */}
                {!isUser && msg.content.includes("Meeting ID:") && (
                  <div style={{
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop: "1px dashed var(--border-translucent)",
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <CornerDownRight size={12} style={{ color: "var(--accent-cyan)" }} />
                    <span>Cross-referenced from vector library</span>
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
            gap: "12px",
            alignItems: "flex-start",
            maxWidth: "85%",
            alignSelf: "flex-start"
          }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(168, 85, 247, 0.1)",
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
              borderRadius: "4px 18px 18px 18px",
              background: "rgba(255, 255, 255, 0.01)",
              border: "1px solid var(--border-translucent)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--text-secondary)",
              fontSize: "0.9rem"
            }}>
              <span>MeetMind is searching vector DB...</span>
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
          gap: "8px",
          marginBottom: "16px",
          animation: "fadeIn 0.5s ease"
        }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>SUGGESTIONS:</span>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "20px",
                  border: "1px solid var(--border-translucent)",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "var(--text-secondary)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
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
            borderRadius: "14px",
            minHeight: "50px",
            maxHeight: "100px",
            padding: "14px 50px 14px 16px",
            resize: "none",
            lineHeight: 1.4
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          style={{
            position: "absolute",
            right: "8px",
            top: "8px",
            width: "34px",
            height: "34px",
            padding: 0,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
