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

  const isProcessing = status !== "idle" && status !== "error";

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: "40px" }}>
      <h2 style={{ marginBottom: "8px" }}>Analyze a Meeting</h2>
      <p style={{ marginBottom: "32px", fontSize: "0.95rem" }}>
        Record a live meeting, upload a saved recording, or paste a transcript to extract decisions, action items, unanswered questions, and generate a draft follow-up email.
      </p>

      {!isProcessing && (
        <div className="toggle-container">
          <button
            className={`toggle-btn ${activeTab === "file" ? "active" : ""}`}
            onClick={() => setActiveTab("file")}
          >
            Upload Audio/Video
          </button>
          <button
            className={`toggle-btn ${activeTab === "record" ? "active" : ""}`}
            onClick={() => setActiveTab("record")}
          >
            Record Meeting
          </button>
          <button
            className={`toggle-btn ${activeTab === "text" ? "active" : ""}`}
            onClick={() => setActiveTab("text")}
          >
            Paste Transcript
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
              borderRadius: "16px",
              padding: "48px 24px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              background: dragActive ? "rgba(6, 182, 212, 0.04)" : "rgba(255, 255, 255, 0.01)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
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
              background: "rgba(6, 182, 212, 0.1)",
              borderRadius: "50%",
              width: "64px",
              height: "64px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-cyan)",
              marginBottom: "8px"
            }}>
              <Upload size={32} />
            </div>

            {file ? (
              <div>
                <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>{file.name}</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Selected
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--color-danger)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    marginTop: "16px",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "1.1rem" }}>
                  Drag & drop your recording here
                </p>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                  or click to browse from your computer
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "16px" }}>
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
              border: `1px solid ${isRecording ? "rgba(239, 68, 68, 0.4)" : "var(--border-translucent)"}`,
              borderRadius: "16px",
              padding: "34px 24px",
              background: isRecording ? "rgba(239, 68, 68, 0.04)" : "rgba(255, 255, 255, 0.01)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "18px",
              textAlign: "center",
            }}
          >
            <div style={{
              background: isRecording ? "rgba(239, 68, 68, 0.12)" : "rgba(168, 85, 247, 0.1)",
              border: "1px solid",
              borderColor: isRecording ? "rgba(239, 68, 68, 0.35)" : "rgba(168, 85, 247, 0.22)",
              borderRadius: "50%",
              width: "72px",
              height: "72px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isRecording ? "var(--color-danger)" : "var(--accent-purple)",
              animation: isRecording ? "pulseGlowPurple 1.4s infinite" : "none",
            }}>
              <Mic size={34} />
            </div>

            <div>
              <h3 style={{ marginBottom: "6px" }}>
                {isRecording ? "Recording Meeting" : recordedBlob ? "Meeting Recording Ready" : "Record Live Meeting Audio"}
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "680px" }}>
                Keep this page open while the meeting runs. Record from your microphone, or capture audio from a meeting tab/window when your browser supports screen audio sharing.
              </p>
            </div>

            {!isRecording && !recordedBlob && (
              <div style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                justifyContent: "center",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-translucent)",
                borderRadius: "12px",
                padding: "5px",
              }}>
                <button
                  className={`toggle-btn ${recordingSource === "microphone" ? "active" : ""}`}
                  onClick={() => setRecordingSource("microphone")}
                  type="button"
                >
                  Microphone
                </button>
                <button
                  className={`toggle-btn ${recordingSource === "tab" ? "active" : ""}`}
                  onClick={() => setRecordingSource("tab")}
                  type="button"
                >
                  Meeting Tab/Screen Audio
                </button>
              </div>
            )}

            {!isRecording && !recordedBlob && (
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: "640px" }}>
                For Zoom/Meet/Teams in another tab, choose Meeting Tab/Screen Audio and enable audio sharing in the browser picker. Websites cannot silently record other apps in the background.
              </p>
            )}

            <div style={{
              fontFamily: "var(--font-heading)",
              fontSize: "2rem",
              fontWeight: 800,
              color: isRecording ? "var(--color-danger)" : "var(--text-primary)",
              letterSpacing: "0.04em",
            }}>
              {formatDuration(recordingTime)}
            </div>

            {isRecording && (
              <div className="wave-container" aria-hidden="true">
                <div className="wave-bar" style={{ backgroundColor: "var(--color-danger)" }}></div>
                <div className="wave-bar" style={{ backgroundColor: "var(--color-danger)" }}></div>
                <div className="wave-bar" style={{ backgroundColor: "var(--color-danger)" }}></div>
                <div className="wave-bar" style={{ backgroundColor: "var(--color-danger)" }}></div>
                <div className="wave-bar" style={{ backgroundColor: "var(--color-danger)" }}></div>
              </div>
            )}

            {recordedUrl && !isRecording && (
              <audio
                controls
                src={recordedUrl}
                style={{ width: "min(100%, 560px)", marginTop: "4px" }}
              >
                Your browser does not support audio playback.
              </audio>
            )}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
              {!isRecording ? (
                <button className="btn btn-primary" onClick={() => startRecording(recordingSource)} type="button">
                  <Mic size={16} /> {recordedBlob ? "Record Again" : "Start Recording"}
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={stopRecording} type="button" style={{ borderColor: "rgba(239, 68, 68, 0.35)", color: "var(--color-danger)" }}>
                  <Square size={16} /> Stop Recording
                </button>
              )}

              {recordedBlob && !isRecording && (
                <button className="btn btn-secondary" onClick={clearRecording} type="button">
                  <Trash2 size={16} /> Remove Recording
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
      {isProcessing && (
        <div style={{
          padding: "48px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          textAlign: "center"
        }}>
          {status === "uploading" && (
            <>
              <div className="wave-container">
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
              </div>
              <div>
                <h3 style={{ marginBottom: "6px" }}>Uploading Media File</h3>
                <p style={{ fontSize: "0.9rem" }}>Sending recording payload to MeetMind secure ingestion...</p>
              </div>
            </>
          )}

          {status === "transcribing" && (
            <>
              <div style={{ position: "relative" }}>
                <div className="wave-container" style={{ opacity: 0.5 }}>
                  <div className="wave-bar" style={{ animationDuration: "0.8s" }}></div>
                  <div className="wave-bar" style={{ animationDuration: "0.8s" }}></div>
                  <div className="wave-bar" style={{ animationDuration: "0.8s" }}></div>
                  <div className="wave-bar" style={{ animationDuration: "0.8s" }}></div>
                  <div className="wave-bar" style={{ animationDuration: "0.8s" }}></div>
                </div>
                <Loader style={{
                  position: "absolute",
                  top: "2px",
                  left: "calc(50% - 18px)",
                  animation: "spin 2s linear infinite",
                  color: "var(--accent-purple)"
                }} size={36} />
              </div>
              <div>
                <h3 style={{ marginBottom: "6px" }}>Transcribing Audio</h3>
                <p style={{ fontSize: "0.9rem" }}>Running speaker diarization and language indexing using Whisper / AssemblyAI...</p>
              </div>
            </>
          )}

          {status === "analyzing" && (
            <>
              <div style={{
                position: "relative",
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(168, 85, 247, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-purple)",
                animation: "pulseGlowPurple 2s infinite"
              }}>
                <FileText size={28} className="animate-pulse" />
                <Loader style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  animation: "spin 3s linear infinite",
                  color: "var(--accent-purple)",
                  opacity: 0.4
                }} size={64} />
              </div>
              <div>
                <h3 style={{ marginBottom: "6px" }}>Analyzing Insights</h3>
                <p style={{ fontSize: "0.9rem" }}>Gemini is extracting decisions, action accountability, sentiment, and follow-up templates...</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="glass-panel" style={{
          borderColor: "rgba(239, 68, 68, 0.3)",
          background: "rgba(239, 68, 68, 0.05)",
          padding: "16px 20px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "24px"
        }}>
          <AlertCircle size={20} style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.95rem" }}>Failed to process meeting</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>{error}</p>
          </div>
        </div>
      )}

      {/* Action button */}
      {!isProcessing && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            style={{ minWidth: "150px" }}
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
