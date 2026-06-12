"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const TESTIMONIALS = [
  {
    quote: '"Friendly, easy-to-use app that keeps me accountable."',
    author: "Dinah L."
  },
  {
    quote: '"Love this system. It keeps me instantly on track with my multi-domain personal metrics."',
    author: "Annette B."
  },
  {
    quote: '"Syntra completely changed how I plan my financial and career decisions scaling forward."',
    author: "Marcus K."
  }
];

const HEADLINES = [
  "See your future. Shape it smarter.",
  "Predict outcomes. Act with confidence.",
  "Your digital twin. Your edge.",
];

const FAQS = [
  {
    q: "What is Syntra and how does it work?",
    a: "Syntra is an AI-powered personal digital twin that analyzes your health, finances, and career data to provide personalized recommendations, predictions, and future simulations."
  },
  {
    q: "How does Syntra predict future outcomes?",
    a: 'Syntra uses your habits, goals, and historical data to simulate "what-if" scenarios and predict possible future results with AI-driven insights.'
  },
  {
    q: "Is my personal data secure on Syntra?",
    a: "Yes. Syntra uses encrypted storage, secure authentication, and privacy-first AI processing to protect sensitive health and financial data."
  }
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => {
  if (status === "authenticated") {
    router.replace("/dashboard");
  }
}, [status, router]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFading, setIsFading] = useState(false);

  // Handle Sticky Navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Continuous looping typewriter with fade
  useEffect(() => {
    const currentHeadline = HEADLINES[headlineIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && typedText.length < currentHeadline.length) {
      timeout = setTimeout(() => {
        setTypedText(currentHeadline.slice(0, typedText.length + 1));
      }, 72);
    } else if (!isDeleting && typedText.length === currentHeadline.length) {
      timeout = setTimeout(() => {
        setIsFading(true);
        setTimeout(() => {
          setIsDeleting(true);
          setIsFading(false);
        }, 600);
      }, 1800);
    } else if (isDeleting && typedText.length > 0) {
      timeout = setTimeout(() => {
        setTypedText(currentHeadline.slice(0, typedText.length - 1));
      }, 36);
    } else if (isDeleting && typedText.length === 0) {
      setIsDeleting(false);
      setHeadlineIndex((prev) => (prev + 1) % HEADLINES.length);
    }

    return () => clearTimeout(timeout);
  }, [typedText, isDeleting, headlineIndex]);

  // Auto-advance testimonial slider
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleUserIconClick = () => {
    if (status === "authenticated") {
      router.push("/dashboard");
    } else {
      router.push("/signup");
    }
  };



  return (
    <div style={{ background: "#ffffff", color: "#111111", fontFamily: '"Inter", "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowX: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .nav-wrapper {
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          z-index: 1000;
          transition: all 0.3s ease;
        }
        .nav-wrapper.sticky {
          position: fixed;
          background: #ffffff;
          box-shadow: 0 1px 24px rgba(0,0,0,0.07);
          border-bottom: 1px solid #eeeeee;
        }
        .nav-wrapper.sticky .logo { color: #0055EE; }
        .nav-wrapper.sticky .user-icon-placeholder { border-color: #0055EE; color: #0055EE; }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 72px;
          padding: 0 2rem;
        }

        .logo {
          font-family: 'DM Sans', sans-serif;
          font-size: 1.75rem;
          font-weight: 300;
          color: #ffffff;
          text-decoration: none;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          transition: color 0.3s ease;
        }
        .logo strong { font-weight: 800; letter-spacing: 0.1em; }

        .user-icon-placeholder {
          width: 38px; height: 38px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          display: flex; align-items: center; justify-content: center;
          color: #ffffff;
          font-weight: 600; font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.25s ease;
          background: transparent;
        }
        .user-icon-placeholder:hover { transform: scale(1.06); background: rgba(255,255,255,0.12); }

        /* HERO */
        .hero-section {
          background: linear-gradient(140deg, #0044DD 0%, #0066FF 55%, #3322EE 100%);
          color: #ffffff;
          padding: 140px 2rem 100px;
          position: relative;
        }
        .hero-body {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 48px;
          align-items: center;
        }
        .hero-eyebrow {
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          opacity: 0.8;
          margin-bottom: 20px;
        }
        .hero-title {
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(2.6rem, 4.5vw, 4.2rem);
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -0.03em;
          margin-bottom: 28px;
          min-height: 160px;
          transition: opacity 0.4s ease;
        }
        .hero-title.fading { opacity: 0; }

        .type-cursor {
          display: inline-block;
          width: 3px;
          height: 0.85em;
          background: #ffffff;
          margin-left: 3px;
          vertical-align: middle;
          animation: blink 0.75s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .hero-subtext {
          font-family: 'Inter', sans-serif;
          font-size: clamp(1rem, 1.4vw, 1.2rem);
          line-height: 1.65;
          opacity: 0.88;
          margin-bottom: 44px;
          max-width: 560px;
          font-weight: 400;
        }

        .btn-capsule {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          color: #0044DD;
          text-decoration: none;
          padding: 17px 40px;
          border-radius: 9999px;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 0.9rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow: 0 6px 20px rgba(0,0,0,0.12);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-capsule:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.16); }

        .mockphone-frame {
          width: 300px; height: 540px;
          background: #ffffff;
          border: 10px solid #0d0d0d;
          border-radius: 40px;
          box-shadow: 0 28px 56px rgba(0,0,0,0.22);
          color: #111;
          padding: 28px 22px;
          margin: 0 auto;
        }

        /* TESTIMONIAL SLIDER */
        .proof-section {
          background: #0f1520;
          color: #ffffff;
          text-align: center;
          padding: 80px 2rem;
        }
        .stars-row {
          color: #FFBB00;
          font-size: 1.3rem;
          margin-bottom: 16px;
          letter-spacing: 4px;
        }
        .proof-title {
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(1.8rem, 3vw, 2.6rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 28px;
        }
        .slider-window {
          max-width: 700px;
          margin: 0 auto;
          min-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .proof-quote {
          font-family: 'Inter', sans-serif;
          font-size: 1.2rem;
          line-height: 1.6;
          opacity: 0.94;
          margin-bottom: 14px;
          font-weight: 400;
          font-style: italic;
        }
        .proof-author {
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          opacity: 0.6;
          letter-spacing: 0.04em;
          font-weight: 500;
        }
        .dots-track {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 36px;
        }
        .dot {
          width: 8px; height: 8px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }
        .dot.active { background: #ffffff; transform: scale(1.3); }

        /* FEATURES */
        .features-section {
          max-width: 1100px;
          margin: 0 auto;
          padding: 110px 2rem;
        }
        .features-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: #0055EE;
          margin-bottom: 16px;
        }
        .features-section-title {
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(2rem, 3.5vw, 3rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 80px;
          max-width: 560px;
          line-height: 1.15;
        }
        .feature-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
          margin-bottom: 100px;
        }
        .feature-row.reverse { direction: rtl; }
        .feature-row.reverse > * { direction: ltr; }
        .feature-num {
          font-family: 'DM Sans', sans-serif;
          font-size: 5rem;
          font-weight: 800;
          color: #0055EE;
          margin-bottom: 4px;
          line-height: 1;
          opacity: 0.12;
        }
        .feature-heading {
          font-family: 'DM Sans', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.025em;
          margin-bottom: 18px;
          line-height: 1.2;
          margin-top: -20px;
        }
        .feature-desc {
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          line-height: 1.75;
          color: #5a5a6a;
          font-weight: 400;
        }
        .feature-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #eff4ff;
          color: #0044CC;
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 999px;
          margin-top: 24px;
          letter-spacing: 0.04em;
        }
       .feature-graphic-box {
         background: transparent;
         border: none;
         padding: 0;
         min-height: auto;
         display: flex;
         justify-content: center;
         align-items: center;
        }
        .graphic-inner {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .graphic-bar-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .graphic-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          color: #888;
          width: 60px;
          flex-shrink: 0;
          font-weight: 500;
        }
        .graphic-bar {
          height: 10px;
          border-radius: 99px;
          background: linear-gradient(90deg, #0055EE, #4499FF);
        }
        .graphic-val {
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          color: #0055EE;
          font-weight: 600;
          margin-left: 4px;
        }
        .graphic-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e8ebf4;
          box-shadow: 0 4px 16px rgba(0,68,220,0.06);
        }
        .graphic-card-title {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          color: #999;
          font-weight: 500;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .graphic-card-value {
          font-family: 'DM Sans', sans-serif;
          font-size: 1.9rem;
          font-weight: 800;
          color: #0044DD;
          letter-spacing: -0.03em;
        }
        .graphic-card-sub {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          color: #4CAF50;
          font-weight: 600;
          margin-top: 4px;
        }
        .graphic-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .graphic-mini-card {
          background: #fff;
          border-radius: 14px;
          padding: 16px;
          border: 1px solid #e8ebf4;
          text-align: center;
        }
        .graphic-mini-icon {
          font-size: 1.5rem;
          margin-bottom: 6px;
        }
        .graphic-mini-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          color: #888;
          font-weight: 500;
        }
        .graphic-mini-val {
          font-family: 'DM Sans', sans-serif;
          font-size: 1.1rem;
          font-weight: 800;
          color: #111;
          margin-top: 2px;
        }

        /* FAQ */
        .qa-section {
          background: #f7f8fc;
          padding: 96px 2rem;
        }
        .qa-container { max-width: 800px; margin: 0 auto; }
        .qa-main-title {
          font-family: 'DM Sans', sans-serif;
          font-size: 2.6rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 52px;
          letter-spacing: -0.03em;
        }
        .qa-item {
          background: #ffffff;
          border-radius: 14px;
          margin-bottom: 10px;
          border: 1px solid #ececf3;
          overflow: hidden;
        }
        .qa-button {
          width: 100%;
          background: transparent;
          border: none;
          padding: 22px 28px;
          text-align: left;
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          color: #111;
          letter-spacing: -0.01em;
        }
        .qa-chevron {
          font-size: 1.1rem;
          transition: transform 0.25s ease;
          color: #0055EE;
          font-weight: 700;
        }
        .qa-item.open .qa-chevron { transform: rotate(180deg); }
        .qa-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.25s ease-out;
          padding: 0 28px;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          line-height: 1.7;
          color: #5a5a6a;
        }
        .qa-item.open .qa-content {
          max-height: 160px;
          padding-bottom: 22px;
        }

        /* FOOTER */
        .footer-layer {
          background: #0a0e18;
          color: #ffffff;
          padding: 80px 2rem 40px;
        }
        .footer-top {
          max-width: 1100px;
          margin: 0 auto 60px;
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr;
          gap: 48px;
        }
        .footer-logo-area .logo {
          display: inline-block;
          margin-bottom: 20px;
          font-size: 1.6rem;
        }
        .footer-brand-tag {
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          opacity: 0.7;
          margin-bottom: 28px;
          line-height: 1.6;
          max-width: 280px;
        }
        .footer-layer .btn-capsule {
          background: #ffffff;
          color: #0044DD;
          padding: 13px 28px;
          font-size: 0.8rem;
        }
        .footer-col-title {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 22px;
          opacity: 0.5;
        }
        .footer-ul { list-style: none; }
        .footer-li { margin-bottom: 14px; }
        .footer-link {
          font-family: 'Inter', sans-serif;
          color: #ffffff;
          text-decoration: none;
          font-size: 0.92rem;
          opacity: 0.75;
          font-weight: 400;
          transition: opacity 0.2s;
        }
        .footer-link:hover { opacity: 1; }
        .footer-bottom {
          max-width: 1100px;
          margin: 0 auto;
          border-top: 1px solid rgba(255,255,255,0.07);
          padding-top: 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
        }
        .footer-legal-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-family: 'Inter', sans-serif;
          font-size: 0.82rem;
          opacity: 0.5;
          justify-content: center;
        }
        .footer-socials {
          display: flex;
          gap: 20px;
          align-items: center;
        }
        .social-btn {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          border: none;
          color: #fff;
          text-decoration: none;
        }
        .social-btn:hover { background: rgba(255,255,255,0.15); transform: translateY(-2px); }
        .social-btn svg { width: 17px; height: 17px; fill: #ffffff; }

        @media (max-width: 960px) {
          .hero-body { grid-template-columns: 1fr; text-align: center; }
          .feature-row { grid-template-columns: 1fr; gap: 40px; }
          .feature-row.reverse { direction: ltr; }
          .footer-top { grid-template-columns: 1fr; gap: 40px; }
        }
      ` }} />

      {/* NAVBAR */}
      <div className={`nav-wrapper ${scrolled ? "sticky" : ""}`}>
        <div className="nav-container">
          <Link href="/" className="logo">syn<strong>tra</strong></Link>
          <button onClick={handleUserIconClick} className="user-icon-placeholder" aria-label="Account Access">
            👤
          </button>
        </div>
      </div>

      {/* HERO */}
      <section className="hero-section">
        <div className="hero-body">
          <div>
            <div className="hero-eyebrow">#1 AI Digital Twin Platform</div>
            <h1 className={`hero-title ${isFading ? "fading" : ""}`}>
              {typedText}
              <span className="type-cursor" />
            </h1>
            <p className="hero-subtext">
              Syntra analyzes your health, finances, and career to deliver personalized insights, predictions, and what-if simulations — dynamically, in real time.
            </p>
            <Link href="/signup" className="btn-capsule">
              Start Today →
            </Link>
          </div>

          <div>
            <div className="mockphone-frame">
                <img
  src="/mockup.png"
  alt="Syntra Mobile UI"
  style={{
    width: "100%",
    height: "100%",
    objectFit: "contain",
    borderRadius: "28px",
  }}
/>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL SLIDER */}
      <section className="proof-section">
        <div className="stars-row">★★★★★</div>
        <h2 className="proof-title">3.5 Million 5-Star Ratings</h2>
        <div className="slider-window">
          <div>
            <p className="proof-quote">{TESTIMONIALS[activeSlide].quote}</p>
            <div className="proof-author">— {TESTIMONIALS[activeSlide].author}</div>
          </div>
        </div>
        <div className="dots-track">
          {TESTIMONIALS.map((_, i) => (
            <button key={i} onClick={() => setActiveSlide(i)} className={`dot ${activeSlide === i ? "active" : ""}`} aria-label={`Go to slide ${i + 1}`} />
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section">
        <div className="features-label">How it works</div>
        <h2 className="features-section-title">Everything you need to own your future</h2>

        {/* Feature 1 */}
        <div className="feature-row">
          <div>
            <div className="feature-num">01</div>
            <h3 className="feature-heading">Track health, finance &amp; life logs</h3>
            <p className="feature-desc">Log information securely to adjust parameters. View unified updates where variance in budget configurations alters sleep modeling — tracks metrics concurrently across all life domains.</p>
            <div className="feature-badge">
              <span>📊</span> Unified Dashboard
            </div>
          </div>
          <div className="feature-graphic-box">
            <div
              style={{
              background: "#ffffff",
              borderRadius: "24px",
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0, 85, 238, 0.15)",
              border: "1px solid rgba(0, 85, 238, 0.08)"
          }}
     >
      <img
      src="/dashboard-preview.jpg"
      alt="Ingestion Preview"
      style={{
        width: "100%",
        display: "block"
      }}
    />
  </div>
      </div>
        </div>

        {/* Feature 2 */}
        <div className="feature-row reverse">
          <div>
            <div className="feature-num">02</div>
            <h3 className="feature-heading">Simulate what-if scenarios instantly</h3>
            <p className="feature-desc">Ask Syntra "what if I invest $500 more per month?" or "what if I sleep 8 hours instead of 6?" — and get AI-powered simulations showing exact projected outcomes across time horizons.</p>
            <div className="feature-badge">
              <span>⚡</span> Real-Time Simulations
            </div>
          </div>
          <div className="feature-graphic-box">
           <div
            style={{
             background: "#ffffff",
             borderRadius: "24px",
             overflow: "hidden",
             boxShadow: "0 24px 60px rgba(0, 85, 238, 0.15)",
            border: "1px solid rgba(0, 85, 238, 0.08)"
       }}
     >
    <img
      src="/simulator-preview.jpg"
      alt="Simulator Preview"
      style={{
        width: "100%",
        display: "block"
      }}
    />
  </div>
        </div>
        </div>

        {/* Feature 3 */}
        <div className="feature-row">
          <div>
            <div className="feature-num">03</div>
            <h3 className="feature-heading">AI-driven career &amp; goal recommendations</h3>
            <p className="feature-desc">Syntra cross-references your career velocity, income trajectory, and skills gap with market data — then delivers concrete next steps, upskilling paths, and timing windows tailored to your goals.</p>
            <div className="feature-badge">
              <span>🎯</span> Personalized Roadmaps
            </div>
          </div>
          <div className="feature-graphic-box">
            <div
                style={{
                  background: "#ffffff",
                  borderRadius: "24px",
                  overflow: "hidden",
                  boxShadow: "0 24px 60px rgba(0, 85, 238, 0.15)",
                  border: "1px solid rgba(0, 85, 238, 0.08)"
           }}
      >
        <img
          src="/insights-preview.jpg"
          alt="Insights Preview"
          style={{
           width: "100%",
           display: "block"
        }}
      />
     </div>
        </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="qa-section">
        <div className="qa-container">
          <h2 className="qa-main-title">Common questions</h2>
          <div>
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div className={`qa-item ${isOpen ? "open" : ""}`} key={idx}>
                  <button className="qa-button" onClick={() => setOpenFaq(isOpen ? null : idx)}>
                    <span>{faq.q}</span>
                    <span className="qa-chevron">⌃</span>
                  </button>
                  <div className="qa-content">
                    <p>{faq.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer-layer">
        <div className="footer-top">
          <div className="footer-logo-area">
            <Link href="/" className="logo">syn<strong>tra</strong></Link>
            <div className="footer-brand-tag">Your AI-powered digital twin for health, finance, and career growth.</div>
            <Link href="/signup" className="btn-capsule">
              Start Today →
            </Link>
          </div>

          <div>
            <h4 className="footer-col-title">Resources</h4>
            <ul className="footer-ul">
              <li className="footer-li"><Link href="#" className="footer-link">Premium</Link></li>
              <li className="footer-li"><Link href="#" className="footer-link">Blog</Link></li>
              <li className="footer-li"><Link href="#" className="footer-link">Community</Link></li>
              <li className="footer-li"><Link href="#" className="footer-link">Contact Us</Link></li>
              <li className="footer-li"><Link href="#" className="footer-link">Support Center</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Company</h4>
            <ul className="footer-ul">
              <li className="footer-li"><Link href="#" className="footer-link">About Us</Link></li>
              <li className="footer-li"><Link href="#" className="footer-link">Careers</Link></li>
              <li className="footer-li"><Link href="#" className="footer-link">Press</Link></li>
              <li className="footer-li"><Link href="#" className="footer-link">Advertise With Us</Link></li>
              <li className="footer-li"><Link href="#" className="footer-link">For Employers</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-legal-row">
            <span>©2026 Syntra, Inc.</span>
            <Link href="#" className="footer-link">Community Guidelines</Link>
            <Link href="#" className="footer-link">Feedback</Link>
            <Link href="#" className="footer-link">Terms</Link>
            <Link href="#" className="footer-link">Privacy</Link>
            <Link href="#" className="footer-link">API</Link>
            <Link href="#" className="footer-link">Cookie Preferences</Link>
          </div>

          <div className="footer-socials">
            {/* Instagram */}
            <a href="#" className="social-btn" aria-label="Instagram">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.775.13 4.602.402 3.635 1.368 2.667 2.335 2.396 3.508 2.338 4.786 2.28 6.066 2.267 6.474 2.267 12c0 5.526.013 5.934.071 7.214.058 1.278.329 2.451 1.296 3.418.967.967 2.14 1.238 3.418 1.296C8.333 23.986 8.741 24 12 24s3.667-.014 4.947-.072c1.278-.058 2.451-.329 3.418-1.296.967-.967 1.238-2.14 1.296-3.418.058-1.28.071-1.688.071-7.214 0-5.526-.013-5.934-.071-7.214-.058-1.278-.329-2.451-1.296-3.418C19.398.402 18.225.13 16.947.072 15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
            </a>
            {/* Facebook */}
            <a href="#" className="social-btn" aria-label="Facebook">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
              </svg>
            </a>
            {/* YouTube */}
            <a href="#" className="social-btn" aria-label="YouTube">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            {/* LinkedIn */}
            <a href="#" className="social-btn" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            {/* X (Twitter) */}
            <a href="#" className="social-btn" aria-label="X / Twitter">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}