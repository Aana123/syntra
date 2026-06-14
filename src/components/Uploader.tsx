"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

type SyncState = "idle" | "uploading" | "classifying" | "parsing" | "success" | "error";

interface UploaderProps {
  onUploadSuccess?: (data: any) => void;
}

function formatIngestionError(errorMsg: any): string {
  if (typeof errorMsg === "string" && errorMsg.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(errorMsg);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].code) {
        const formattedIssues = parsed.map((issue: any) => {
          const pathStr = issue.path ? issue.path.join(".") : "";
          const expected = issue.expected ? ` (expected ${issue.expected})` : "";
          const pathPart = pathStr ? `Field '${pathStr}': ` : "";
          return `${pathPart}${issue.message}${expected}`;
        });
        return `Validation Error: ${formattedIssues.join("; ")}`;
      }
    } catch (_) {
      // Fallback
    }
  } else if (typeof errorMsg === "object" && errorMsg !== null) {
    const arr = Array.isArray(errorMsg) ? errorMsg : [errorMsg];
    if (arr.length > 0 && arr[0].code) {
      const formattedIssues = arr.map((issue: any) => {
        const pathStr = issue.path ? issue.path.join(".") : "";
        const expected = issue.expected ? ` (expected ${issue.expected})` : "";
        const pathPart = pathStr ? `Field '${pathStr}': ` : "";
        return `${pathPart}${issue.message}${expected}`;
      });
      return `Validation Error: ${formattedIssues.join("; ")}`;
    }
  }
  return String(errorMsg);
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

    let cTimer: any = null;
    let pTimer: any = null;

    try {
      // Step 1: Uploading
      setSyncState("uploading");
      
      // Step 2: Simulate classification and parsing updates for better user feedback
      cTimer = setTimeout(() => setSyncState("classifying"), 1200);
      pTimer = setTimeout(() => setSyncState("parsing"), 2500);

      const res = await fetch("/api/ingestion/upload", {
        method: "POST",
        body: formData,
      });

      // Clear timers immediately once request finishes
      if (cTimer) clearTimeout(cTimer);
      if (pTimer) clearTimeout(pTimer);

      let data: any = null;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch (_) {}
      }

      if (!res.ok) {
        if (data && data.error) {
          throw new Error(formatIngestionError(data.error));
        }
        if (res.status === 404) {
          throw new Error("Upload failed: The upload service returned a 404 Not Found error.");
        }
        throw new Error(`Upload failed with status code ${res.status}.`);
      }

      setDocCategory(data.category);
      setSuccessMsg(data.message);
      setSyncState("success");
      
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
    } catch (err: any) {
      if (cTimer) clearTimeout(cTimer);
      if (pTimer) clearTimeout(pTimer);
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
    white-space: pre-wrap;
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
