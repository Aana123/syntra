"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Loader2,
  ArrowRight,
  Bot,
  Activity,
  Sliders,
  HelpCircle
} from "lucide-react";

type Message = {
  id: string;
  sender: "user" | "aria";
  text: string;
  intent?: "DATA_ENTRY" | "QUERY_RESPONSE" | "SIMULATION";
  uiAction?: {
    shouldNavigate: boolean;
    targetRoute: string;
    queryParams: {
      domain: "health" | "finance" | "career" | null;
      variable: string | null;
      val: number | null;
    } | null;
  } | null;
};

const SUGGESTIONS = [
  { label: "Check my scores & stats", text: "How are my Digital Twin scores and streak doing today?" },
  { label: "What if I sleep 8 hours?", text: "What if my sleep goes to 8 hours?" },
  { label: "Simulate cutting spending", text: "Simulate savings rate going to 35%" },
  { label: "Run anomaly scan", text: "Run behavioral anomaly scan" }
];

export function ChatWidget() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    if (session?.user?.name && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "aria",
          text: `Greeting Operator ${session.user.name.split(" ")[0]}. I am ARIA (Adaptive Reasoning and Intelligence Assistant). I have loaded your Digital Twin telemetry logs.\n\nHow can I assist you with your scores, behavioral trends, or what-if projections today?`
        }
      ]);
    }
  }, [session, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!session) return null;

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsgId = Date.now().toString();
    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text: textToSend
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      if (!response.ok) {
        throw new Error("Neural link failure. Status: " + response.status);
      }

      const data = await response.json();
      
      const ariaMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "aria",
        text: data.message || "Apologies Operator, my neural circuits returned an empty response.",
        intent: data.intent,
        uiAction: data.uiAction
      };

      setMessages((prev) => [...prev, ariaMessage]);
    } catch (err: any) {
      console.error("ARIA link failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "aria",
          text: "[-] NEURAL CONNECTION INTERRUPTED: Unable to communicate with ARIA core engine. Please check your network linkage."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (uiAction: NonNullable<Message["uiAction"]>) => {
    if (!uiAction.shouldNavigate || !uiAction.targetRoute) return;

    let target = uiAction.targetRoute;
    if (uiAction.queryParams) {
      const { domain, variable, val } = uiAction.queryParams;
      const params = new URLSearchParams();
      if (domain) params.set("domain", domain);
      if (variable) params.set("variable", variable);
      if (val !== null && val !== undefined) params.set("val", val.toString());
      target += `?${params.toString()}`;
    }

    router.push(target);
    setIsOpen(false);
  };

  return (
    <>
      <style>{`
        /* --- ARIA WIDGET BUTTON --- */
        .aria-trigger {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0055EE 0%, #3322EE 100%);
          border: none;
          box-shadow: 0 8px 32px rgba(0, 85, 238, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .aria-trigger:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 12px 40px rgba(0, 85, 238, 0.45);
        }
        .aria-trigger-pulse {
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          border: 2px solid #0055EE;
          opacity: 0;
          animation: aria-pulse-anim 2.5s infinite;
        }
        @keyframes aria-pulse-anim {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.3); opacity: 0; }
        }

        /* --- ARIA PANEL CONTAINER --- */
        .aria-panel {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 380px;
          height: 580px;
          max-height: calc(100vh - 120px);
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(0, 85, 238, 0.15);
          border-radius: 24px;
          box-shadow: 0 16px 48px rgba(0, 50, 150, 0.16);
          z-index: 9998;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* --- HEADER --- */
        .aria-header {
          padding: 18px 20px;
          background: linear-gradient(90deg, rgba(0, 85, 238, 0.04) 0%, rgba(51, 34, 238, 0.04) 100%);
          border-bottom: 1px solid rgba(0, 85, 238, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .aria-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .aria-icon-wrap {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0055EE 0%, #3322EE 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 85, 238, 0.2);
        }
        .aria-name-block {}
        .aria-name {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.98rem;
          font-weight: 800;
          color: #0D1117;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .aria-version {
          font-size: 0.62rem;
          background: rgba(0, 85, 238, 0.08);
          color: #0055EE;
          padding: 2px 6px;
          border-radius: 9999px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .aria-status {
          font-size: 0.72rem;
          color: #52637A;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 2px;
          font-weight: 500;
        }
        .aria-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: aria-dot-blink 1.8s infinite;
        }
        @keyframes aria-dot-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .aria-close {
          border: none;
          background: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .aria-close:hover {
          background: rgba(0, 0, 0, 0.04);
          color: #0D1117;
        }

        /* --- MESSAGES BUFFER --- */
        .aria-messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .aria-msg {
          max-width: 82%;
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 0.86rem;
          line-height: 1.55;
          word-wrap: break-word;
          font-weight: 500;
        }
        .aria-msg-aria {
          align-self: flex-start;
          background: #ffffff;
          border: 1px solid rgba(0, 85, 238, 0.08);
          color: #1F2937;
          border-top-left-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 50, 150, 0.03);
          white-space: pre-wrap;
        }
        .aria-msg-user {
          align-self: flex-end;
          background: linear-gradient(135deg, #0055EE 0%, #3322EE 100%);
          color: #ffffff;
          border-top-right-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 85, 238, 0.15);
        }

        /* Action elements inside messages */
        .aria-action-box {
          margin-top: 10px;
          padding: 10px;
          background: rgba(0, 85, 238, 0.05);
          border: 1px solid rgba(0, 85, 238, 0.12);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .aria-action-text {
          font-size: 0.74rem;
          color: #0055EE;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .aria-action-btn {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          background: #0055EE;
          color: #ffffff;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .aria-action-btn:hover {
          background: #0044CC;
        }

        /* --- LOADER --- */
        .aria-loader-wrap {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 16px;
          border-top-left-radius: 4px;
        }
        .aria-loader-text {
          font-size: 0.76rem;
          color: #7788aa;
          font-weight: 600;
        }

        /* --- SUGGESTIONS LIST --- */
        .aria-suggestions-panel {
          padding: 0 20px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .aria-suggestions-head {
          font-size: 0.68rem;
          color: #94A3B8;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 2px;
        }
        .aria-suggestions-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .aria-suggestion-chip {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(0, 85, 238, 0.1);
          border-radius: 12px;
          font-size: 0.76rem;
          color: #0055EE;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .aria-suggestion-chip:hover {
          background: rgba(0, 85, 238, 0.06);
          border-color: rgba(0, 85, 238, 0.2);
          transform: translateY(-1px);
        }

        /* --- INPUT CONTROL BAR --- */
        .aria-input-bar {
          padding: 14px 20px 20px;
          border-top: 1px solid rgba(0, 85, 238, 0.08);
          background: rgba(255, 255, 255, 0.5);
          display: flex;
          gap: 10px;
        }
        .aria-input-field {
          flex: 1;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(0, 85, 238, 0.15);
          background: #ffffff;
          padding: 0 16px;
          font-size: 0.86rem;
          font-weight: 500;
          color: #0D1117;
          outline: none;
          transition: all 0.2s;
        }
        .aria-input-field:focus {
          border-color: #0055EE;
          box-shadow: 0 0 0 3px rgba(0, 85, 238, 0.08);
        }
        .aria-input-field::placeholder {
          color: #94A3B8;
        }
        .aria-send-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0055EE 0%, #3322EE 100%);
          border: none;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 85, 238, 0.2);
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .aria-send-btn:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 85, 238, 0.25);
        }
        .aria-send-btn:disabled {
          background: #E2E8F0;
          color: #94A3B8;
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }

        /* --- RESPONSIVE ADJUSTMENTS --- */
        @media (max-width: 440px) {
          .aria-panel {
            right: 12px;
            bottom: 84px;
            width: calc(100vw - 24px);
            height: calc(100vh - 100px);
          }
          .aria-trigger {
            bottom: 16px;
            right: 16px;
          }
        }
      `}</style>

      {/* Floating Trigger Bubble */}
      <button className="aria-trigger" onClick={() => setIsOpen(!isOpen)} aria-label="Open ARIA assistant">
        {isOpen ? <X size={24} /> : <Bot size={24} />}
        {!isOpen && <span className="aria-trigger-pulse" />}
      </button>

      {/* ARIA Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="aria-panel"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="aria-header">
              <div className="aria-header-title">
                <div className="aria-icon-wrap">
                  <Bot size={18} />
                </div>
                <div className="aria-name-block">
                  <div className="aria-name">
                    ARIA
                    <span className="aria-version">OS v1.5</span>
                  </div>
                  <div className="aria-status">
                    <span className="aria-status-dot" />
                    Adaptive Core Online
                  </div>
                </div>
              </div>
              <button className="aria-close" onClick={() => setIsOpen(false)} aria-label="Close panel">
                <X size={18} />
              </button>
            </div>

            {/* Messages Buffer */}
            <div className="aria-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`aria-msg ${msg.sender === "aria" ? "aria-msg-aria" : "aria-msg-user"}`}
                >
                  {msg.text}

                  {/* Rendering UI action card for simulations */}
                  {msg.sender === "aria" && msg.uiAction?.shouldNavigate && (
                    <div className="aria-action-box">
                      <div className="aria-action-text">Simulation Available</div>
                      <button
                        className="aria-action-btn"
                        onClick={() => handleAction(msg.uiAction!)}
                      >
                        <Sliders size={12} />
                        Run Simulation Model
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* API Load state */}
              {isLoading && (
                <div className="aria-loader-wrap">
                  <Loader2 size={13} className="spin" style={{ color: "#0055EE" }} />
                  <span className="aria-loader-text">Calibrating twin trajectory...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions list (only show when not loading & input is clean) */}
            {!isLoading && messages.length <= 2 && input.trim() === "" && (
              <div className="aria-suggestions-panel">
                <div className="aria-suggestions-head">Query Suggestions</div>
                <div className="aria-suggestions-grid">
                  {SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      className="aria-suggestion-chip"
                      onClick={() => handleSend(s.text)}
                    >
                      <Sparkles size={11} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <form
              className="aria-input-bar"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
            >
              <input
                type="text"
                className="aria-input-field"
                placeholder="Ask ARIA about scores, flags, or simulations..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="aria-send-btn"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
