import { useEffect, useState, useRef } from "react";
import { Upload, FileText, AlertCircle, Loader, Mic, Square, Trash2 } from "lucide-react";
import { apiUrl } from "../api";

export default function NewMeeting({ onAnalysisComplete }) {
  const [activeTab, setActiveTab] = useState("file"); // 'file', 'record', or 'text'
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSource, setRecordingSource] = useState("microphone");
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle', 'uploading', 'transcribing', 'analyzing', 'error'
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [recordedUrl]);

  const getRecordingMimeType = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];

    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  };

  const formatDuration = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const uploadAudioForAnalysis = async (audioFile) => {
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", audioFile);

    setStatus("transcribing");
    const response = await fetch(apiUrl("/analyze-audio"), {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errData.detail || "Server error analyzing audio");
    }

    setStatus("analyzing");
    return response.json();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validTypes = ["audio/mp3", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/m4a", "audio/x-m4a", "video/mp4", "video/quicktime", "video/webm"];
      // Also check by file extension since mime types can sometimes be empty on Mac
      const extension = droppedFile.name.split(".").pop().toLowerCase();
      const validExtensions = ["mp3", "wav", "m4a", "mp4", "mov", "webm"];

      if (validTypes.includes(droppedFile.type) || validExtensions.includes(extension)) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Invalid file type. Please upload audio (mp3, wav, m4a) or video (mp4, mov, webm).");
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const startRecording = async (source = recordingSource) => {
    setError(null);

    if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      setError("This browser does not support in-page recording. Open MeetMind in Chrome, Edge, or Safari and allow microphone/screen access.");
      return;
    }

    try {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedBlob(null);
      setRecordedUrl(null);
      setRecordingTime(0);
      recordingChunksRef.current = [];

      const stream = source === "tab"
        ? await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          })
        : await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

      if (source === "tab" && stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        setError("No meeting audio was shared. Choose a browser tab/window with the meeting and enable Share tab audio or Share system audio.");
        return;
      }

      const mimeType = getRecordingMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || (source === "tab" ? "video/webm" : "audio/webm");
        const blob = new Blob(recordingChunksRef.current, { type: blobType });
        const url = URL.createObjectURL(blob);

        setRecordedBlob(blob);
        setRecordedUrl(url);
        setIsRecording(false);
        clearInterval(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(1000);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingTime((seconds) => seconds + 1);
      }, 1000);
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? source === "tab"
            ? "Screen/tab capture permission was denied. Choose the meeting tab/window and allow audio sharing."
            : "Microphone permission was denied. Allow microphone access, or open this site in Chrome/Edge/Safari if the in-app browser blocks it."
          : err.message || "Could not start meeting recording."
      );
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const clearRecording = () => {
    if (isRecording) stopRecording();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    if (activeTab === "file") {
      if (!file) {
        setError("Please select or drop an audio/video file first.");
        return;
      }

      try {
        const result = await uploadAudioForAnalysis(file);
        setStatus("idle");
        setFile(null);
        onAnalysisComplete(result);
      } catch (err) {
        setStatus("error");
        setError(err.message || "An error occurred during processing.");
      }
    } else if (activeTab === "record") {
      if (isRecording) {
        setError("Stop the meeting recording before analyzing it.");
        return;
      }

      if (!recordedBlob) {
        setError("Record a meeting first, then analyze it.");
        return;
      }

      try {
        const extension = recordedBlob.type.includes("mp4") ? "mp4" : recordedBlob.type.includes("ogg") ? "ogg" : "webm";
        const recordedFile = new File([recordedBlob], `meetmind-recording-${Date.now()}.${extension}`, {
          type: recordedBlob.type || "audio/webm",
        });
        const result = await uploadAudioForAnalysis(recordedFile);
        setStatus("idle");
        clearRecording();
        onAnalysisComplete(result);
      } catch (err) {
        setStatus("error");
        setError(err.message || "An error occurred during recording analysis.");
      }
    } else {
      if (!transcript.trim()) {
        setError("Please paste a transcript first.");
        return;
      }

      setStatus("analyzing");

      try {
        const response = await fetch(apiUrl("/analyze-transcript"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transcript }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ detail: response.statusText }));
          throw new Error(errData.detail || "Server error analyzing transcript");
        }

        const result = await response.json();
        setStatus("idle");
        setTranscript("");
        onAnalysisComplete(result);
      } catch (err) {
        setStatus("error");
        setError(err.message || "An error occurred during processing.");
      }
    }
  };

  const clearSelection = () => {
    setFile(null);
    setError(null);
  };

  const renderProgressSteps = () => {
    const steps = [
      { id: "upload", label: "Media Ingestion", active: status === "uploading", done: status === "transcribing" || status === "analyzing" },
      { id: "transcribe", label: "Voice Transcription", active: status === "transcribing", done: status === "analyzing" },
      { id: "analyze", label: "Gemini Intelligence", active: status === "analyzing", done: false }
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", maxWidth: "520px", margin: "0 auto", padding: "20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative", marginBottom: "8px" }}>
          {/* Progress bar line background */}
          <div style={{ position: "absolute", top: "18px", left: "12%", right: "12%", height: "2px", background: "rgba(255,255,255,0.06)", zIndex: 1 }} />
          {/* Progress bar active fill */}
          <div style={{
            position: "absolute",
            top: "18px",
            left: "12%",
            width: status === "uploading" ? "0%" : status === "transcribing" ? "38%" : "76%",
            height: "2px",
            background: "var(--accent-gradient)",
            zIndex: 1,
            transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
          }} />

          {steps.map((step, idx) => {
            const isDone = step.done;
            const isActive = step.active;
            let bulletBg = "rgba(15, 23, 42, 0.9)";
            let bulletBorder = "1px solid var(--border-translucent)";
            let bulletColor = "var(--text-muted)";
            let glow = "none";

            if (isDone) {
              bulletBg = "var(--accent-gradient)";
              bulletBorder = "none";
              bulletColor = "#fff";
            } else if (isActive) {
              bulletBg = "rgba(6, 182, 212, 0.1)";
              bulletBorder = "2px solid var(--accent-cyan)";
              bulletColor = "var(--accent-cyan)";
              glow = "0 0 15px var(--accent-cyan-glow)";
            }

            return (
              <div key={step.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", flex: 1, zIndex: 2 }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: bulletBg,
                  border: bulletBorder,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: bulletColor,
                  fontWeight: "bold",
                  fontSize: "0.85rem",
                  boxShadow: glow,
                  transition: "all 0.3s ease"
                }}>
                  {isDone ? "✓" : idx + 1}
                </div>
                <span style={{
                  fontSize: "0.78rem",
                  fontWeight: isActive || isDone ? 650 : 500,
                  color: isActive ? "var(--text-cyan)" : isDone ? "var(--text-primary)" : "var(--text-muted)",
                  textAlign: "center"
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Dynamic status card */}
        <div className="glass-panel" style={{ padding: "24px", background: "rgba(255,255,255,0.01)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
          {status === "uploading" && (
            <>
              <div style={{ position: "relative", width: "40px", height: "40px" }}>
                <Loader style={{ animation: "spin 2s linear infinite", color: "var(--accent-cyan)" }} size={32} />
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>Uploading recording payload to MeetMind secure ingestion...</p>
            </>
          )}
          {status === "transcribing" && (
            <>
              <div className="wave-container">
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>Running speaker diarization and language indexing using Whisper...</p>
            </>
          )}
          {status === "analyzing" && (
            <>
              <div style={{
                position: "relative",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(139, 92, 246, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-purple)",
                animation: "pulseGlowPurple 2s infinite"
              }}>
                <FileText size={20} />
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>Gemini is extracting decisions, action accountability, sentiment, and templates...</p>
            </>
          )}
        </div>
      </div>
    );
  };

  const isProcessing = status !== "idle" && status !== "error";

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: "40px" }}>
      <h2 style={{ marginBottom: "8px" }}>Analyze a Meeting</h2>
      <p style={{ marginBottom: "32px", fontSize: "0.92rem", color: "var(--text-secondary)" }}>
        Record a live meeting, upload a saved recording, or paste a transcript to extract decisions, action items, unanswered questions, and generate a draft follow-up email.
      </p>

      {!isProcessing && (
        <div className="toggle-container">
          <button
            className={`toggle-btn ${activeTab === "file" ? "active" : ""}`}
            onClick={() => setActiveTab("file")}
          >
            <Upload size={14} /> Upload Audio/Video
          </button>
          <button
            className={`toggle-btn ${activeTab === "record" ? "active" : ""}`}
            onClick={() => setActiveTab("record")}
          >
            <Mic size={14} /> Record Meeting
          </button>
          <button
            className={`toggle-btn ${activeTab === "text" ? "active" : ""}`}
            onClick={() => setActiveTab("text")}
          >
            <FileText size={14} /> Paste Transcript
          </button>
        </div>
      )}

      {/* Upload File View */}
      {activeTab === "file" && !isProcessing && (
        <div className="form-group" style={{ marginBottom: "32px" }}>
          <div
            className={`drag-zone ${dragActive ? "active" : ""}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            style={{
              border: `2px dashed ${dragActive ? "var(--accent-cyan)" : "var(--border-translucent)"}`,
              borderRadius: "18px",
              padding: "54px 24px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)",
              background: dragActive ? "rgba(6, 182, 212, 0.04)" : "rgba(255, 255, 255, 0.005)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "18px",
              boxShadow: dragActive ? "0 0 20px var(--accent-cyan-glow)" : "none"
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".mp3,.wav,.m4a,.mp4,.mov,.webm"
              style={{ display: "none" }}
            />
            <div style={{
              background: "rgba(6, 182, 212, 0.08)",
              borderRadius: "50%",
              width: "60px",
              height: "60px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-cyan)",
              marginBottom: "4px",
              boxShadow: "0 0 10px rgba(6, 182, 212, 0.1)"
            }}>
              <Upload size={28} />
            </div>

            {file ? (
              <div>
                <p style={{ fontWeight: 650, color: "var(--text-primary)", fontSize: "1.02rem" }}>{file.name}</p>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px", fontWeight: 500 }}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--color-danger)",
                    fontSize: "0.82rem",
                    fontWeight: 650,
                    marginTop: "16px",
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px"
                  }}
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1.08rem" }}>
                  Drag & drop your recording here
                </p>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                  or click to browse from your computer
                </p>
                <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "18px", fontWeight: 500 }}>
                  Supports MP3, WAV, M4A, MP4, MOV, WEBM (Max 100MB)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Meeting View */}
      {activeTab === "record" && !isProcessing && (
        <div className="form-group" style={{ marginBottom: "32px" }}>
          <div
            style={{
              border: `1px solid ${isRecording ? "rgba(239, 68, 68, 0.25)" : "var(--border-translucent)"}`,
              borderRadius: "18px",
              padding: "36px 24px",
              background: isRecording ? "rgba(239, 68, 68, 0.02)" : "rgba(255, 255, 255, 0.005)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
              textAlign: "center",
              boxShadow: isRecording ? "0 0 25px rgba(239, 68, 68, 0.05)" : "none"
            }}
          >
            {/* Concentric pulsing recording circles */}
            <div style={{
              position: "relative",
              width: "100px",
              height: "100px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {isRecording && (
                <>
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--color-danger)", opacity: 0.15, animation: "ripple 1.8s infinite" }} />
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--color-danger)", opacity: 0.1, animation: "ripple 1.8s infinite 0.6s" }} />
                </>
              )}
              <div style={{
                position: "relative",
                background: isRecording ? "rgba(239, 68, 68, 0.12)" : "rgba(139, 92, 246, 0.08)",
                border: "1px solid",
                borderColor: isRecording ? "rgba(239, 68, 68, 0.3)" : "rgba(139, 92, 246, 0.2)",
                borderRadius: "50%",
                width: "72px",
                height: "72px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isRecording ? "var(--color-danger)" : "var(--accent-purple)",
                zIndex: 2,
                boxShadow: isRecording ? "0 0 15px rgba(239, 68, 68, 0.2)" : "none"
              }}>
                <Mic size={32} />
              </div>
            </div>

            <div>
              <h3 style={{ marginBottom: "6px" }}>
                {isRecording ? "Recording Meeting" : recordedBlob ? "Meeting Recording Ready" : "Record Live Meeting Audio"}
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
                Keep this page open while the meeting runs. Record from your microphone, or capture audio from a meeting tab/window when your browser supports screen audio sharing.
              </p>
            </div>

            {!isRecording && !recordedBlob && (
              <div style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                justifyContent: "center",
                background: "rgba(255, 255, 255, 0.015)",
                border: "1px solid var(--border-translucent)",
                borderRadius: "12px",
                padding: "4px",
              }}>
                <button
                  className={`toggle-btn ${recordingSource === "microphone" ? "active" : ""}`}
                  onClick={() => setRecordingSource("microphone")}
                  type="button"
                  style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                >
                  Microphone
                </button>
                <button
                  className={`toggle-btn ${recordingSource === "tab" ? "active" : ""}`}
                  onClick={() => setRecordingSource("tab")}
                  type="button"
                  style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                >
                  Meeting Tab/Screen Audio
                </button>
              </div>
            )}

            {!isRecording && !recordedBlob && (
              <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", maxWidth: "580px" }}>
                For Zoom/Meet/Teams in another tab, choose Meeting Tab/Screen Audio and enable audio sharing in the browser picker. Websites cannot silently record other apps in the background.
              </p>
            )}

            <div style={{
              fontFamily: "var(--font-heading)",
              fontSize: "2.2rem",
              fontWeight: 800,
              color: isRecording ? "var(--color-danger)" : "var(--text-primary)",
              letterSpacing: "0.02em",
              lineHeight: 1.1
            }}>
              {formatDuration(recordingTime)}
            </div>

            {isRecording && (
              <div className="wave-container" aria-hidden="true" style={{ marginTop: "4px" }}>
                <div className="wave-bar" style={{ backgroundColor: "var(--color-danger)" }}></div>
                <div className="wave-bar" style={{ backgroundColor: "var(--color-danger)" }}></div>
                <div className="wave-bar" style={{ backgroundColor: "var(--color-danger)" }}></div>
                <div className="wave-bar" style={{ backgroundColor: "var(--color-danger)" }}></div>
                <div className="wave-bar" style={{ backgroundColor: "var(--color-danger)" }}></div>
              </div>
            )}

            {recordedUrl && !isRecording && (
              <div style={{ width: "100%", maxWidth: "520px", marginTop: "6px" }}>
                <audio
                  controls
                  src={recordedUrl}
                  style={{ width: "100%" }}
                >
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
              {!isRecording ? (
                <button className="btn btn-primary" onClick={() => startRecording(recordingSource)} type="button">
                  <Mic size={16} /> {recordedBlob ? "Record Again" : "Start Recording"}
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={stopRecording} type="button" style={{ borderColor: "rgba(239, 68, 68, 0.25)", color: "var(--color-danger)", background: "rgba(239, 68, 68, 0.02)" }}>
                  <Square size={14} /> Stop Recording
                </button>
              )}

              {recordedBlob && !isRecording && (
                <button className="btn btn-secondary" onClick={clearRecording} type="button" style={{ borderColor: "rgba(239, 68, 68, 0.15)" }}>
                  <Trash2 size={14} /> Remove Recording
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Paste Transcript View */}
      {activeTab === "text" && !isProcessing && (
        <div className="form-group" style={{ marginBottom: "32px" }}>
          <label className="form-label">Paste Raw Transcript</label>
          <textarea
            className="form-textarea"
            placeholder="Speaker 1: Welcome everyone...\nSpeaker 2: Let's start with the API review..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            style={{ minHeight: "260px" }}
          />
        </div>
      )}

      {/* Processing State View */}
      {isProcessing && renderProgressSteps()}

      {/* Error state */}
      {error && (
        <div className="glass-panel" style={{
          borderColor: "rgba(239, 68, 68, 0.25)",
          background: "rgba(239, 68, 68, 0.03)",
          padding: "16px 20px",
          borderRadius: "14px",
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
          marginBottom: "24px"
        }}>
          <AlertCircle size={20} style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.96rem" }}>Failed to process meeting</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.5 }}>{error}</p>
          </div>
        </div>
      )}

      {/* Action button */}
      {!isProcessing && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            style={{ minWidth: "160px" }}
          >
            {activeTab === "file" && "Upload & Analyze"}
            {activeTab === "record" && "Transcribe & Analyze"}
            {activeTab === "text" && "Analyze Transcript"}
          </button>
        </div>
      )}
    </div>
  );
}
