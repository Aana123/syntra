// src/app/assets-liabilities/page.tsx
// Net Worth is now embedded in the Ingestion page as a sidebar panel.
// This file redirects there seamlessly.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AssetsLiabilitiesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ingestion?panel=assets");
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", color: "#0055EE" }}>
      <div style={{ width: 280, height: 2, background: "#eef1f8", borderRadius: 2, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg,#0055EE,#4499FF)", width: "40%", borderRadius: 2, animation: "ldbar 1.6s infinite ease-in-out" }} />
      </div>
      <div style={{ fontSize: 11, letterSpacing: "0.4em", textTransform: "uppercase", color: "#7788aa", fontWeight: 700 }}>Opening Net Worth ledger…</div>
      <style>{`@keyframes ldbar{0%{margin-left:-40%}100%{margin-left:140%}}`}</style>
    </div>
  );
}