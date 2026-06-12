"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

type SyncState = "idle" | "uploading" | "classifying" | "parsing" | "success" | "error";

interface UploaderProps {
  onUploadSuccess?: (data: any) => void;
}

export default function Uploader({ onUploadSuccess }: UploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [docCategory, setDocCategory] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File) => {
    setErrorMsg("");
    setSuccessMsg("");
    setDocCategory("");
    
    // File validation
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type) && !/\.(pdf|png|jpe?g|webp)$/i.test(file.name)) {
      setErrorMsg("Invalid file type. Please upload a PDF or an image.");
      setSyncState("error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Step 1: Uploading
      setSyncState("uploading");
      
      // Step 2: Simulate classification and parsing updates for better user feedback
      setTimeout(() => setSyncState("classifying"), 1200);
      setTimeout(() => setSyncState("parsing"), 2500);

      const res = await fetch("/api/ingestion/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process document.");

      setDocCategory(data.category);
      setSuccessMsg(data.message);
      setSyncState("success");
      
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while uploading the document.");
      setSyncState("error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
      <style>{CSS}</style>
      
      <div 
        className={`dropzone ${dragActive ? "drag-active" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={syncState === "idle" || syncState === "success" || syncState === "error" ? onButtonClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="file-input"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={handleChange}
          disabled={syncState !== "idle" && syncState !== "success" && syncState !== "error"}
        />

        <div className="dropzone-content">
          {syncState === "idle" && (
            <>
              <div className="icon-wrap"><Upload size={22} color="#0055EE" /></div>
              <div className="drop-title">Drag & drop your document here</div>
              <div className="drop-subtitle">Accepts PDF or Images (Max 10MB)</div>
            </>
          )}

          {(syncState === "uploading" || syncState === "classifying" || syncState === "parsing") && (
            <>
              <div className="icon-wrap loading-spin"><Loader2 size={22} color="#0055EE" /></div>
              <div className="drop-title">
                {syncState === "uploading" && "Reading Document..."}
                {syncState === "classifying" && "Classifying Ingestion Stream..."}
                {syncState === "parsing" && "Extracting Structured Parameters..."}
              </div>
              <div className="drop-subtitle">Do not close this panel while Gemini parses biometrics</div>
            </>
          )}

          {syncState === "success" && (
            <>
              <div className="icon-wrap success-icon"><CheckCircle size={22} color="#10b981" /></div>
              <div className="drop-title">Sync Complete!</div>
              <div className="drop-category" style={{ background: "#f0fdf4", color: "#15803d" }}>
                Identified: {docCategory.toUpperCase().replace("_", " ")}
              </div>
              <div className="drop-subtitle" style={{ color: "#15803d", fontWeight: 600 }}>{successMsg}</div>
            </>
          )}

          {syncState === "error" && (
            <>
              <div className="icon-wrap error-icon"><AlertTriangle size={22} color="#ef4444" /></div>
              <div className="drop-title">Sync Failed</div>
              <div className="drop-subtitle" style={{ color: "#ef4444", fontWeight: 600 }}>{errorMsg}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .dropzone {
    border: 2px dashed #d0dfff;
    border-radius: 16px;
    background: #fcfdfe;
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    cursor: pointer;
    transition: all 0.22s ease-in-out;
    min-height: 180px;
    position: relative;
  }
  .dropzone:hover {
    border-color: #0055EE;
    background: #f5f8ff;
  }
  .drag-active {
    border-color: #0055EE;
    background: #eef3ff;
    transform: scale(1.01);
  }
  .file-input {
    display: none;
  }
  .dropzone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
  }
  .icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #f0f4ff;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
  }
  .loading-spin svg {
    animation: spin 1s linear infinite;
  }
  .success-icon {
    background: #e6fced;
  }
  .error-icon {
    background: #fdf2f2;
  }
  .drop-title {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.96rem;
    font-weight: 700;
    color: #111;
  }
  .drop-subtitle {
    font-family: 'Inter', sans-serif;
    font-size: 0.76rem;
    color: #7788aa;
  }
  .drop-category {
    font-family: 'Inter', sans-serif;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 9999px;
    letter-spacing: 0.05em;
    margin: 2px 0;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
