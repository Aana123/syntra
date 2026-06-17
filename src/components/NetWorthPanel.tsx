// src/components/NetWorthPanel.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import {
  Plus, Trash2, Save, RefreshCw, ShieldCheck, AlertTriangle, Info
} from "lucide-react";

type ActiveTab = "overview" | "assets" | "liabilities" | "protection" | "outflows";

const GOLD_RATES: Record<string, number> = { "24K": 7200, "22K": 6600, "18K": 5400 };
const SILVER_RATE = 90;

export function NetWorthPanel() {
  const { data: portfolioRes, mutate: mutatePortfolio } = useSWR<any>("/api/assets-liabilities", fetcher);
  const { data: profileRes } = useSWR<any>("/api/profile", fetcher);

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [portfolio, setPortfolio] = useState<any>(null);

  // Raw string input state — fixes the 0-value input bug.
  // Maps "fieldKey" → raw string so users can clear and retype freely.
  const [raw, setRaw] = useState<Record<string, string>>({});

  useEffect(() => {
    if (portfolioRes?.success && portfolioRes?.portfolio) {
      const p = JSON.parse(JSON.stringify(portfolioRes.portfolio));
      if (!p.familyOutflows) {
        p.familyOutflows = {
          children: [],
          caregiving: {
            parentHealthcareMonthly: 0,
            parentInsuranceAnnualPremium: 0,
            parentInsuranceCoverAmount: 0,
            monthlyRemittance: 0,
            householdHelpMonthly: 0
          }
        };
      } else if (!p.familyOutflows.caregiving) {
        p.familyOutflows.caregiving = {
          parentHealthcareMonthly: 0,
          parentInsuranceAnnualPremium: 0,
          parentInsuranceCoverAmount: 0,
          monthlyRemittance: 0,
          householdHelpMonthly: 0
        };
      }
      setPortfolio(p);
      setRaw({}); // reset raw overrides when db data arrives
    }
  }, [portfolioRes]);

  // r(key, fallback): returns raw string override if present, else String(fallback)
  const r = useCallback((key: string, fallback: number) =>
    key in raw ? raw[key] : String(fallback ?? 0), [raw]);

  // setNum: update raw display + parsed numeric value in portfolio
  const setNum = (key: string, rawVal: string, portfolioUpdater: (parsed: number) => void) => {
    setRaw(prev => ({ ...prev, [key]: rawVal }));
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed)) portfolioUpdater(parsed);
  };

  // clearRaw: on blur, remove the raw override so the field normalises
  const clearRaw = (key: string) => setRaw(prev => { const n = { ...prev }; delete n[key]; return n; });

  if (!portfolio) {
    return (
      <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#7788aa" }}>
        <RefreshCw size={20} className="nwp-spin" />
        <span style={{ fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Connecting wealth ledger…</span>
        <style>{`.nwp-spin { animation: nwp-spin 1s linear infinite; } @keyframes nwp-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const monthlyIncome = profileRes?.user?.profile?.monthlyIncome || 60000;

  const setNestedField = (path: string[], value: any) => {
    setPortfolio((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = value;
      return next;
    });
  };

  /* ─── CALCULATIONS ──────────────────────────────────────────────── */
  const liquid = portfolio.assets?.liquid || {};
  const investments = portfolio.assets?.investments || {};
  const physical = portfolio.assets?.physical || {};
  const otherAssets = portfolio.assets?.other || {};
  const shortTerm = portfolio.liabilities?.shortTerm || {};
  const longTerm = portfolio.liabilities?.longTerm || {};

  const savingsTotal = (liquid.savingsAccounts || []).reduce((s: number, a: any) => s + (Number(a.balance) || 0), 0);
  const fdTotal = (liquid.fixedDeposits || []).reduce((s: number, fd: any) => s + (Number(fd.principal) || 0), 0);
  const rdTotal = (liquid.recurringDeposits || []).reduce((s: number, rd: any) => s + (Number(rd.investedSoFar) || 0), 0);
  const cashInHand = Number(liquid.cashInHand) || 0;
  const digitalWallets = Number(liquid.digitalWallets) || 0;
  const totalLiquid = savingsTotal + fdTotal + rdTotal + cashInHand + digitalWallets;

  const stocksCurrent = Number(investments.stocks?.currentValue) || 0;
  const stocksInvested = Number(investments.stocks?.investedAmount) || 0;
  const stocksPnL = stocksCurrent - stocksInvested;
  const mfCurrent = (investments.mutualFunds || []).reduce((s: number, m: any) => s + (Number(m.currentValue) || 0), 0);
  const mfInvested = (investments.mutualFunds || []).reduce((s: number, m: any) => s + (Number(m.investedAmount) || 0), 0);
  const ppf = Number(investments.ppf?.corpus) || 0;
  const epf = Number(investments.epf?.corpus) || 0;
  const nps = Number(investments.nps?.corpus) || 0;
  const sgb = (investments.sgbBonds || []).reduce((s: number, b: any) => s + (Number(b.currentValue) || 0), 0);
  const usStocksUSD = Number(investments.usStocks?.currentValueUSD) || 0;
  const usRate = Number(investments.usStocks?.exchangeRate) || 83.5;
  const usTotal = usStocksUSD * usRate;
  const totalInvest = stocksCurrent + mfCurrent + ppf + epf + nps + sgb + usTotal;

  const propsTotal = (physical.properties || []).reduce((s: number, p: any) => s + (Number(p.estimatedValue) || 0), 0);
  const vehiclesTotal = (physical.vehicles || []).reduce((s: number, v: any) => s + (Number(v.estimatedValue) || 0), 0);
  const goldWeight = Number(physical.goldJewellery?.weightGrams) || 0;
  const goldPurity = (physical.goldJewellery?.purity || "22K") as string;
  const goldRate = GOLD_RATES[goldPurity] || 6600;
  const goldVal = goldWeight * goldRate;
  const silverWeight = Number(physical.silverMetals?.weightGrams) || 0;
  const silverVal = silverWeight * SILVER_RATE;
  const collectibles = (physical.collectibles || []).reduce((s: number, c: any) => s + (Number(c.estimatedValue) || 0), 0);
  const totalPhysical = propsTotal + vehiclesTotal + goldVal + silverVal + collectibles;

  const businessTotal = (otherAssets.businessOwnership || []).reduce((s: number, b: any) => s + (Number(b.estimatedValue) || 0), 0);
  const loansGivenTotal = (otherAssets.loansGiven || []).reduce((s: number, l: any) => s + (Number(l.amountLent) || 0), 0);
  const gratuity = Number(otherAssets.previousGratuity) || 0;
  const endowSurrender = (portfolio.protection?.endowmentPolicies || []).reduce((s: number, p: any) => s + (Number(p.surrenderValue) || 0), 0);
  const totalOther = businessTotal + loansGivenTotal + gratuity + endowSurrender;

  const totalAssets = totalLiquid + totalInvest + totalPhysical + totalOther;

  const ccTotal = (shortTerm.creditCards || []).reduce((s: number, c: any) => s + (Number(c.outstanding) || 0), 0);
  const bnplTotal = (shortTerm.bnpl || []).reduce((s: number, b: any) => s + (Number(b.outstanding) || 0), 0);
  const plTotal = (shortTerm.personalLoans || []).reduce((s: number, p: any) => s + (Number(p.outstanding) || 0), 0);
  const informalTotal = (shortTerm.informalLoans || []).reduce((s: number, i: any) => s + (Number(i.outstanding) || 0), 0);
  const totalShort = ccTotal + bnplTotal + plTotal + informalTotal;

  const hlTotal = (longTerm.homeLoans || []).reduce((s: number, h: any) => s + (Number(h.outstanding) || 0), 0);
  const carLoanTotal = (longTerm.carLoans || []).reduce((s: number, c: any) => s + (Number(c.outstanding) || 0), 0);
  const eduTotal = (longTerm.educationLoans || []).reduce((s: number, e: any) => s + (Number(e.outstanding) || 0), 0);
  const bizLoanTotal = (longTerm.businessLoans || []).reduce((s: number, b: any) => s + (Number(b.outstanding) || 0), 0);
  const lapTotal = (longTerm.loansAgainstProperty || []).reduce((s: number, l: any) => s + (Number(l.outstanding) || 0), 0);
  const goldLoanTotal = (longTerm.goldLoans || []).reduce((s: number, g: any) => s + (Number(g.outstanding) || 0), 0);
  const totalLong = hlTotal + carLoanTotal + eduTotal + bizLoanTotal + lapTotal + goldLoanTotal;

  const pendingTax = Number(portfolio.liabilities?.pendingTaxDues) || 0;
  const totalLiabilities = totalShort + totalLong + pendingTax;

  const netWorth = totalAssets - totalLiabilities;
  const liquidNW = totalLiquid - totalShort;
  const dtr = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  const familyOutflows = portfolio.familyOutflows || { children: [], caregiving: {} };
  const children = familyOutflows.children || [];
  const caregiving = familyOutflows.caregiving || {};

  const childrenMonthly = children.reduce((s: number, c: any) => {
    return s + (Number(c.schoolFeesAnnual) || 0) / 12 +
               (Number(c.tuitionMonthly) || 0) +
               (Number(c.extracurricularMonthly) || 0) +
               (Number(c.childcareMonthly) || 0);
  }, 0);

  const caregivingMonthly = (Number(caregiving.parentHealthcareMonthly) || 0) +
                            (Number(caregiving.parentInsuranceAnnualPremium) || 0) / 12 +
                            (Number(caregiving.monthlyRemittance) || 0) +
                            (Number(caregiving.householdHelpMonthly) || 0);

  const totalFamilyOutflowMonthly = childrenMonthly + caregivingMonthly;

  const totalEMI =
    (shortTerm.personalLoans || []).reduce((s: number, p: any) => s + (Number(p.emi) || 0), 0) +
    (longTerm.homeLoans || []).reduce((s: number, h: any) => s + (Number(h.emi) || 0), 0) +
    (longTerm.carLoans || []).reduce((s: number, c: any) => s + (Number(c.emi) || 0), 0) +
    (longTerm.educationLoans || []).reduce((s: number, e: any) => s + (Number(e.emi) || 0), 0) +
    (longTerm.businessLoans || []).reduce((s: number, b: any) => s + (Number(b.emi) || 0), 0) +
    (longTerm.loansAgainstProperty || []).reduce((s: number, l: any) => s + (Number(l.emi) || 0), 0);
  const emiBurden = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 0;

  const contingentTotal = (portfolio.liabilities?.contingent || []).reduce((s: number, c: any) => s + (Number(c.exposureAmount) || 0), 0);
  const legalTotal = (portfolio.liabilities?.legalDisputes || []).reduce((s: number, l: any) => s + (Number(l.exposureAmount) || 0), 0);

  const liquidPct = totalAssets > 0 ? (totalLiquid / totalAssets) * 100 : 0;
  const investPct = totalAssets > 0 ? (totalInvest / totalAssets) * 100 : 0;
  const physPct = totalAssets > 0 ? (totalPhysical / totalAssets) * 100 : 0;
  const otherPct = totalAssets > 0 ? (totalOther / totalAssets) * 100 : 0;

  const getPropEquity = (id: string, val: number) => {
    const debt =
      (longTerm.homeLoans || []).filter((h: any) => h.linkedAssetId === id).reduce((s: number, h: any) => s + (Number(h.outstanding) || 0), 0) +
      (longTerm.loansAgainstProperty || []).filter((l: any) => l.linkedAssetId === id).reduce((s: number, l: any) => s + (Number(l.outstanding) || 0), 0);
    return { debt, equity: val - debt, pct: val > 0 ? ((val - debt) / val) * 100 : 0 };
  };
  const getVehEquity = (id: string, val: number) => {
    const debt = (longTerm.carLoans || []).filter((c: any) => c.linkedAssetId === id).reduce((s: number, c: any) => s + (Number(c.outstanding) || 0), 0);
    return { debt, equity: val - debt, pct: val > 0 ? ((val - debt) / val) * 100 : 0 };
  };

  /* ─── SAVE ──────────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updatedPortfolio = {
        ...portfolio,
        assets: {
          ...portfolio.assets,
          physical: {
            ...portfolio.assets.physical,
            goldJewellery: { ...portfolio.assets.physical.goldJewellery, estimatedValue: goldVal },
            silverMetals: { ...portfolio.assets.physical.silverMetals, estimatedValue: silverVal },
          },
        },
      };
      const res = await fetch("/api/assets-liabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolio: updatedPortfolio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save portfolio.");
      mutatePortfolio(data);
      setMessage({ text: "Wealth ledger synced successfully!", type: "success" });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  /* ─── RENDER ────────────────────────────────────────────────────── */
  return (
    <div className="nwp-root">
      <style>{NWP_CSS}</style>

      {/* Summary Cards */}
      <div className="nwp-summaries">
        <div className="nwp-sc nwp-sc-blue">
          <div className="nwp-sc-lbl">Net Worth</div>
          <div className="nwp-sc-val">₹{netWorth.toLocaleString("en-IN")}</div>
          <div className="nwp-sc-foot">Assets minus Liabilities</div>
        </div>
        <div className="nwp-sc">
          <div className="nwp-sc-lbl">Liquid Net Worth</div>
          <div className="nwp-sc-val" style={{ color: liquidNW >= 0 ? "#10b981" : "#ef4444" }}>₹{liquidNW.toLocaleString("en-IN")}</div>
          <div className="nwp-sc-foot">Cash/Investments minus Short-term Debt</div>
        </div>
        <div className="nwp-sc">
          <div className="nwp-sc-lbl">Monthly EMI Burden</div>
          <div className="nwp-sc-val" style={{ color: emiBurden > 40 ? "#d97706" : "#0055EE" }}>₹{Math.round(totalEMI).toLocaleString("en-IN")}</div>
          <div className="nwp-sc-foot"><span className={`nwp-badge ${emiBurden > 40 ? "warn" : "info"}`}>{emiBurden.toFixed(1)}% of Income</span></div>
        </div>
        <div className="nwp-sc">
          <div className="nwp-sc-lbl">Debt-to-Asset Ratio</div>
          <div className="nwp-sc-val">{dtr.toFixed(1)}%</div>
          <div className="nwp-sc-foot"><span className={`nwp-badge ${dtr > 50 ? "danger" : "success"}`}>{dtr > 50 ? "High Leverage" : "Healthy"}</span></div>
        </div>
        <div className="nwp-sc">
          <div className="nwp-sc-lbl">Fixed Family Outflows</div>
          <div className="nwp-sc-val" style={{ color: totalFamilyOutflowMonthly > 0 ? "#ef4444" : "#52637a" }}>₹{Math.round(totalFamilyOutflowMonthly).toLocaleString("en-IN")}/mo</div>
          <div className="nwp-sc-foot">Child costs + Caregiving</div>
        </div>
      </div>

      {/* Tabs + Save */}
      <div className="nwp-tabs">
        {(["overview", "assets", "liabilities", "protection", "outflows"] as ActiveTab[]).map(t => (
          <button key={t} className={`nwp-tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
        <button className="nwp-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? <RefreshCw size={13} className="nwp-spin" /> : <Save size={13} />}
          {saving ? "Syncing…" : "Sync Portfolio"}
        </button>
      </div>

      {message && (
        <div className={`nwp-msg ${message.type}`}>
          {message.type === "success" ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}
          {message.text}
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="nwp-tab-body">
          <div className="nwp-two-col">
            <div className="nwp-card">
              <div className="nwp-card-stripe" style={{ background: "#0055EE" }} />
              <div className="nwp-cb">
                <div className="nwp-ct" style={{ marginBottom: 18 }}>Asset Allocation Breakdown</div>
                {[
                  { label: "Liquid Assets", val: totalLiquid, pct: liquidPct, color: "#3b82f6", sub: "Immediate Liquidity" },
                  { label: "Investments", val: totalInvest, pct: investPct, color: "#059669", sub: "Wealth Multipliers" },
                  { label: "Physical Assets", val: totalPhysical, pct: physPct, color: "#d97706", sub: "Real Estate, Gold & Vehicles" },
                  { label: "Other Receivables", val: totalOther, pct: otherPct, color: "#7c3aed", sub: "Business, Surrenders" },
                ].map(row => (
                  <div key={row.label} className="nwp-alloc-row">
                    <div className="nwp-alloc-head"><strong>{row.label}</strong><span>₹{row.val.toLocaleString("en-IN")}</span></div>
                    <div className="nwp-progress"><div className="nwp-fill" style={{ width: `${row.pct}%`, background: row.color }} /></div>
                    <div className="nwp-alloc-sub">{row.pct.toFixed(1)}% — {row.sub}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="nwp-card">
              <div className="nwp-card-stripe" style={{ background: "#10b981" }} />
              <div className="nwp-cb">
                <div className="nwp-ct" style={{ marginBottom: 10 }}>Real Net Equity in Properties & Vehicles</div>
                <p className="nwp-csub" style={{ marginBottom: 16 }}>Linked loans are deducted to show actual owner equity.</p>
                {physical.properties?.length === 0 && physical.vehicles?.length === 0
                  ? <div className="nwp-empty"><Info size={22} color="#7788aa" /><span>Add properties or vehicles on the Assets tab and link loans to see equity.</span></div>
                  : null}
                {physical.properties?.map((p: any) => { const eq = getPropEquity(p.id, p.estimatedValue); return (
                  <div key={p.id} className="nwp-eq-item">
                    <div className="nwp-eq-head"><span>{p.name} ({p.city})</span><span>₹{p.estimatedValue.toLocaleString("en-IN")}</span></div>
                    <div className="nwp-eq-meter"><div className="nwp-eq-fill" style={{ width: `${Math.max(0, eq.pct)}%`, background: "#10b981" }} /><span>{eq.pct.toFixed(0)}%</span></div>
                    <div className="nwp-eq-foot"><span>Debt: ₹{eq.debt.toLocaleString("en-IN")}</span><strong>Equity: ₹{eq.equity.toLocaleString("en-IN")}</strong></div>
                  </div>
                ); })}
                {physical.vehicles?.map((v: any) => { const eq = getVehEquity(v.id, v.estimatedValue); return (
                  <div key={v.id} className="nwp-eq-item">
                    <div className="nwp-eq-head"><span>{v.name}</span><span>₹{v.estimatedValue.toLocaleString("en-IN")}</span></div>
                    <div className="nwp-eq-meter"><div className="nwp-eq-fill" style={{ width: `${Math.max(0, eq.pct)}%`, background: "#3b82f6" }} /><span>{eq.pct.toFixed(0)}%</span></div>
                    <div className="nwp-eq-foot"><span>Debt: ₹{eq.debt.toLocaleString("en-IN")}</span><strong>Equity: ₹{eq.equity.toLocaleString("en-IN")}</strong></div>
                  </div>
                ); })}
              </div>
            </div>
          </div>
          <div className="nwp-card" style={{ marginTop: 20 }}>
            <div className="nwp-card-stripe" style={{ background: "#ef4444" }} />
            <div className="nwp-cb">
              <div className="nwp-ct" style={{ marginBottom: 12 }}>Contingent Liabilities & Risk Obligations</div>
              <div className="nwp-risk-grid">
                {[
                  { label: "Total Contingent Exposure", val: contingentTotal },
                  { label: "Pending Tax Dues", val: pendingTax, warn: pendingTax > 0 },
                  { label: "Legal Disputes Exposure", val: legalTotal },
                ].map(m => (
                  <div key={m.label} className="nwp-risk-box">
                    <span className="nwp-risk-lbl">{m.label}</span>
                    <span className="nwp-risk-val" style={{ color: m.warn ? "#ef4444" : undefined }}>₹{m.val.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSETS ── */}
      {activeTab === "assets" && (
        <div className="nwp-tab-body">
          {/* Liquid */}
          <div className="nwp-card">
            <div className="nwp-cb">
              <div className="nwp-sec-head">
                <div className="nwp-ct">Liquid Assets — ₹{totalLiquid.toLocaleString("en-IN")}</div>
                <button className="nwp-add-btn" onClick={() => { const a = [...(portfolio.assets.liquid.savingsAccounts || [])]; a.push({ id: String(Math.random()), bankName: "New Bank", accountType: "savings", balance: 0 }); setNestedField(["assets", "liquid", "savingsAccounts"], a); }}><Plus size={11} /> Add Account</button>
              </div>

              <div className="nwp-sub-title">Savings & Salary Accounts</div>
              {liquid.savingsAccounts?.map((acc: any, i: number) => (
                <div key={acc.id} className="nwp-row">
                  <div className="nwp-fc" style={{ flex: 1.5 }}><label>Bank Name</label><input type="text" value={acc.bankName} onChange={e => { const a = [...portfolio.assets.liquid.savingsAccounts]; a[i].bankName = e.target.value; setNestedField(["assets", "liquid", "savingsAccounts"], a); }} /></div>
                  <div className="nwp-fc"><label>Type</label><select value={acc.accountType} onChange={e => { const a = [...portfolio.assets.liquid.savingsAccounts]; a[i].accountType = e.target.value; setNestedField(["assets", "liquid", "savingsAccounts"], a); }}><option value="savings">Savings</option><option value="current">Current</option><option value="salary">Salary</option></select></div>
                  <div className="nwp-fc"><label>Balance (₹)</label><input type="number" value={r(`sa_${acc.id}_bal`, acc.balance)} onChange={e => setNum(`sa_${acc.id}_bal`, e.target.value, v => { const a = [...portfolio.assets.liquid.savingsAccounts]; a[i].balance = v; setNestedField(["assets", "liquid", "savingsAccounts"], a); })} onBlur={() => clearRaw(`sa_${acc.id}_bal`)} /></div>
                  <button className="nwp-del" onClick={() => setNestedField(["assets", "liquid", "savingsAccounts"], portfolio.assets.liquid.savingsAccounts.filter((a: any) => a.id !== acc.id))}><Trash2 size={13} /></button>
                </div>
              ))}

              <div className="nwp-sub-head" style={{ marginTop: 20 }}>
                <div className="nwp-sub-title" style={{ margin: 0 }}>Fixed Deposits (FD)</div>
                <button className="nwp-add-btn" onClick={() => { const a = [...(portfolio.assets.liquid.fixedDeposits || [])]; a.push({ id: String(Math.random()), bankName: "New Bank", principal: 0, interestRate: 7, isCumulative: true }); setNestedField(["assets", "liquid", "fixedDeposits"], a); }}><Plus size={11} /> Add FD</button>
              </div>
              {liquid.fixedDeposits?.map((fd: any, i: number) => (
                <div key={fd.id} className="nwp-row">
                  <div className="nwp-fc" style={{ flex: 1.2 }}><label>Bank</label><input type="text" value={fd.bankName} onChange={e => { const a = [...portfolio.assets.liquid.fixedDeposits]; a[i].bankName = e.target.value; setNestedField(["assets", "liquid", "fixedDeposits"], a); }} /></div>
                  <div className="nwp-fc"><label>Principal (₹)</label><input type="number" value={r(`fd_${fd.id}_p`, fd.principal)} onChange={e => setNum(`fd_${fd.id}_p`, e.target.value, v => { const a = [...portfolio.assets.liquid.fixedDeposits]; a[i].principal = v; setNestedField(["assets", "liquid", "fixedDeposits"], a); })} onBlur={() => clearRaw(`fd_${fd.id}_p`)} /></div>
                  <div className="nwp-fc" style={{ flex: 0.7 }}><label>Rate (%)</label><input type="number" value={r(`fd_${fd.id}_r`, fd.interestRate)} step={0.1} onChange={e => setNum(`fd_${fd.id}_r`, e.target.value, v => { const a = [...portfolio.assets.liquid.fixedDeposits]; a[i].interestRate = v; setNestedField(["assets", "liquid", "fixedDeposits"], a); })} onBlur={() => clearRaw(`fd_${fd.id}_r`)} /></div>
                  <div className="nwp-fc" style={{ flex: 0.8 }}><label>Type</label><select value={fd.isCumulative ? "yes" : "no"} onChange={e => { const a = [...portfolio.assets.liquid.fixedDeposits]; a[i].isCumulative = e.target.value === "yes"; setNestedField(["assets", "liquid", "fixedDeposits"], a); }}><option value="yes">Cumulative</option><option value="no">Monthly Payout</option></select></div>
                  <button className="nwp-del" onClick={() => setNestedField(["assets", "liquid", "fixedDeposits"], portfolio.assets.liquid.fixedDeposits.filter((f: any) => f.id !== fd.id))}><Trash2 size={13} /></button>
                </div>
              ))}

              <div className="nwp-sub-head" style={{ marginTop: 20 }}>
                <div className="nwp-sub-title" style={{ margin: 0 }}>Recurring Deposits (RD)</div>
                <button className="nwp-add-btn" onClick={() => { const a = [...(portfolio.assets.liquid.recurringDeposits || [])]; a.push({ id: String(Math.random()), bankName: "New Bank", monthlyInstallment: 0, interestRate: 7, investedSoFar: 0 }); setNestedField(["assets", "liquid", "recurringDeposits"], a); }}><Plus size={11} /> Add RD</button>
              </div>
              {liquid.recurringDeposits?.map((rd: any, i: number) => (
                <div key={rd.id} className="nwp-row">
                  <div className="nwp-fc" style={{ flex: 1.2 }}><label>Bank</label><input type="text" value={rd.bankName} onChange={e => { const a = [...portfolio.assets.liquid.recurringDeposits]; a[i].bankName = e.target.value; setNestedField(["assets", "liquid", "recurringDeposits"], a); }} /></div>
                  <div className="nwp-fc"><label>Monthly (₹)</label><input type="number" value={r(`rd_${rd.id}_m`, rd.monthlyInstallment)} onChange={e => setNum(`rd_${rd.id}_m`, e.target.value, v => { const a = [...portfolio.assets.liquid.recurringDeposits]; a[i].monthlyInstallment = v; setNestedField(["assets", "liquid", "recurringDeposits"], a); })} onBlur={() => clearRaw(`rd_${rd.id}_m`)} /></div>
                  <div className="nwp-fc"><label>Invested So Far (₹)</label><input type="number" value={r(`rd_${rd.id}_inv`, rd.investedSoFar)} onChange={e => setNum(`rd_${rd.id}_inv`, e.target.value, v => { const a = [...portfolio.assets.liquid.recurringDeposits]; a[i].investedSoFar = v; setNestedField(["assets", "liquid", "recurringDeposits"], a); })} onBlur={() => clearRaw(`rd_${rd.id}_inv`)} /></div>
                  <button className="nwp-del" onClick={() => setNestedField(["assets", "liquid", "recurringDeposits"], portfolio.assets.liquid.recurringDeposits.filter((x: any) => x.id !== rd.id))}><Trash2 size={13} /></button>
                </div>
              ))}

              <div className="nwp-sub-title" style={{ marginTop: 20 }}>Cash & Digital Wallets</div>
              <div className="nwp-row">
                <div className="nwp-fc"><label>Cash in Hand (₹)</label><input type="number" value={r("cashInHand", liquid.cashInHand)} onChange={e => setNum("cashInHand", e.target.value, v => setNestedField(["assets", "liquid", "cashInHand"], v))} onBlur={() => clearRaw("cashInHand")} /></div>
                <div className="nwp-fc"><label>Digital Wallets (Paytm/GPay) (₹)</label><input type="number" value={r("digitalWallets", liquid.digitalWallets)} onChange={e => setNum("digitalWallets", e.target.value, v => setNestedField(["assets", "liquid", "digitalWallets"], v))} onBlur={() => clearRaw("digitalWallets")} /></div>
              </div>
            </div>
          </div>

          {/* Investments */}
          <div className="nwp-card" style={{ marginTop: 20 }}>
            <div className="nwp-cb">
              <div className="nwp-ct" style={{ marginBottom: 16 }}>Investments — ₹{totalInvest.toLocaleString("en-IN")}</div>

              <div className="nwp-sub-title">Stocks / Direct Equity</div>
              <div className="nwp-row">
                <div className="nwp-fc" style={{ flex: 1.5 }}><label>Broker (Zerodha, Groww…)</label><input type="text" value={investments.stocks?.brokerName} onChange={e => setNestedField(["assets", "investments", "stocks", "brokerName"], e.target.value)} /></div>
                <div className="nwp-fc"><label>Invested (₹)</label><input type="number" value={r("st_inv", investments.stocks?.investedAmount)} onChange={e => setNum("st_inv", e.target.value, v => setNestedField(["assets", "investments", "stocks", "investedAmount"], v))} onBlur={() => clearRaw("st_inv")} /></div>
                <div className="nwp-fc"><label>Current Value (₹)</label><input type="number" value={r("st_cur", investments.stocks?.currentValue)} onChange={e => setNum("st_cur", e.target.value, v => setNestedField(["assets", "investments", "stocks", "currentValue"], v))} onBlur={() => clearRaw("st_cur")} /></div>
                <div className="nwp-fc" style={{ justifyContent: "flex-end", paddingBottom: 6 }}><span style={{ fontSize: "0.8rem", fontWeight: 700, color: stocksPnL >= 0 ? "#10b981" : "#ef4444" }}>P&L: ₹{stocksPnL.toLocaleString("en-IN")}</span></div>
              </div>

              <div className="nwp-sub-head" style={{ marginTop: 20 }}>
                <div className="nwp-sub-title" style={{ margin: 0 }}>Mutual Funds</div>
                <button className="nwp-add-btn" onClick={() => { const a = [...(portfolio.assets.investments.mutualFunds || [])]; a.push({ id: String(Math.random()), fundName: "New Fund", type: "equity", currentValue: 0, investedAmount: 0 }); setNestedField(["assets", "investments", "mutualFunds"], a); }}><Plus size={11} /> Add Fund</button>
              </div>
              {investments.mutualFunds?.map((mf: any, i: number) => (
                <div key={mf.id} className="nwp-row">
                  <div className="nwp-fc" style={{ flex: 1.5 }}><label>Fund Name</label><input type="text" value={mf.fundName} onChange={e => { const a = [...portfolio.assets.investments.mutualFunds]; a[i].fundName = e.target.value; setNestedField(["assets", "investments", "mutualFunds"], a); }} /></div>
                  <div className="nwp-fc" style={{ flex: 0.8 }}><label>Type</label><select value={mf.type} onChange={e => { const a = [...portfolio.assets.investments.mutualFunds]; a[i].type = e.target.value; setNestedField(["assets", "investments", "mutualFunds"], a); }}><option value="equity">Equity</option><option value="debt">Debt</option><option value="hybrid">Hybrid</option><option value="ELSS">ELSS</option></select></div>
                  <div className="nwp-fc"><label>Invested (₹)</label><input type="number" value={r(`mf_${mf.id}_inv`, mf.investedAmount)} onChange={e => setNum(`mf_${mf.id}_inv`, e.target.value, v => { const a = [...portfolio.assets.investments.mutualFunds]; a[i].investedAmount = v; setNestedField(["assets", "investments", "mutualFunds"], a); })} onBlur={() => clearRaw(`mf_${mf.id}_inv`)} /></div>
                  <div className="nwp-fc"><label>Current Value (₹)</label><input type="number" value={r(`mf_${mf.id}_cur`, mf.currentValue)} onChange={e => setNum(`mf_${mf.id}_cur`, e.target.value, v => { const a = [...portfolio.assets.investments.mutualFunds]; a[i].currentValue = v; setNestedField(["assets", "investments", "mutualFunds"], a); })} onBlur={() => clearRaw(`mf_${mf.id}_cur`)} /></div>
                  <button className="nwp-del" onClick={() => setNestedField(["assets", "investments", "mutualFunds"], portfolio.assets.investments.mutualFunds.filter((m: any) => m.id !== mf.id))}><Trash2 size={13} /></button>
                </div>
              ))}

              <div className="nwp-sub-title" style={{ marginTop: 20 }}>Retirement & Provident Funds</div>
              <div className="nwp-sub-grid">
                <div className="nwp-sub-card">
                  <div className="nwp-sub-card-title">PPF</div>
                  <div className="nwp-fc"><label>Current Balance (₹)</label><input type="number" value={r("ppf_c", investments.ppf?.corpus)} onChange={e => setNum("ppf_c", e.target.value, v => setNestedField(["assets", "investments", "ppf", "corpus"], v))} onBlur={() => clearRaw("ppf_c")} /></div>
                  <div className="nwp-fc" style={{ marginTop: 8 }}><label>Annual Contribution (₹)</label><input type="number" value={r("ppf_a", investments.ppf?.annualContribution)} onChange={e => setNum("ppf_a", e.target.value, v => setNestedField(["assets", "investments", "ppf", "annualContribution"], v))} onBlur={() => clearRaw("ppf_a")} /></div>
                </div>
                <div className="nwp-sub-card">
                  <div className="nwp-sub-card-title">EPF</div>
                  <div className="nwp-fc"><label>Current Balance (₹)</label><input type="number" value={r("epf_c", investments.epf?.corpus)} onChange={e => setNum("epf_c", e.target.value, v => setNestedField(["assets", "investments", "epf", "corpus"], v))} onBlur={() => clearRaw("epf_c")} /></div>
                  <div className="nwp-fc" style={{ marginTop: 8 }}><label>Monthly Contribution (₹)</label><input type="number" value={r("epf_m", investments.epf?.employeeMonthlyContribution)} onChange={e => setNum("epf_m", e.target.value, v => setNestedField(["assets", "investments", "epf", "employeeMonthlyContribution"], v))} onBlur={() => clearRaw("epf_m")} /></div>
                </div>
                <div className="nwp-sub-card">
                  <div className="nwp-sub-card-title">NPS</div>
                  <div className="nwp-fc"><label>Current Corpus (₹)</label><input type="number" value={r("nps_c", investments.nps?.corpus)} onChange={e => setNum("nps_c", e.target.value, v => setNestedField(["assets", "investments", "nps", "corpus"], v))} onBlur={() => clearRaw("nps_c")} /></div>
                  <div className="nwp-fc" style={{ marginTop: 8 }}><label>Tier</label><select value={investments.nps?.tier} onChange={e => setNestedField(["assets", "investments", "nps", "tier"], e.target.value)}><option value="tier1">Tier 1 (Tax Saved)</option><option value="tier2">Tier 2 (Withdrawable)</option></select></div>
                </div>
              </div>
            </div>
          </div>

          {/* Physical */}
          <div className="nwp-card" style={{ marginTop: 20 }}>
            <div className="nwp-cb">
              <div className="nwp-sec-head">
                <div className="nwp-ct">Physical Assets — ₹{totalPhysical.toLocaleString("en-IN")}</div>
                <button className="nwp-add-btn" onClick={() => { const a = [...(portfolio.assets.physical.properties || [])]; a.push({ id: String(Math.random()), name: "My House", type: "house", city: "Bangalore", estimatedValue: 0, isSelfOccupied: true }); setNestedField(["assets", "physical", "properties"], a); }}><Plus size={11} /> Add Property</button>
              </div>
              <div className="nwp-sub-title">Real Estate Properties</div>
              {physical.properties?.map((p: any, i: number) => (
                <div key={p.id} className="nwp-row">
                  <div className="nwp-fc" style={{ flex: 1.2 }}><label>Property Name</label><input type="text" value={p.name} onChange={e => { const a = [...portfolio.assets.physical.properties]; a[i].name = e.target.value; setNestedField(["assets", "physical", "properties"], a); }} /></div>
                  <div className="nwp-fc"><label>Type</label><select value={p.type} onChange={e => { const a = [...portfolio.assets.physical.properties]; a[i].type = e.target.value; setNestedField(["assets", "physical", "properties"], a); }}><option value="flat">Apartment / Flat</option><option value="house">House</option><option value="plot">Plot</option></select></div>
                  <div className="nwp-fc"><label>City</label><input type="text" value={p.city} onChange={e => { const a = [...portfolio.assets.physical.properties]; a[i].city = e.target.value; setNestedField(["assets", "physical", "properties"], a); }} /></div>
                  <div className="nwp-fc"><label>Estimated Value (₹)</label><input type="number" value={r(`pr_${p.id}_v`, p.estimatedValue)} onChange={e => setNum(`pr_${p.id}_v`, e.target.value, v => { const a = [...portfolio.assets.physical.properties]; a[i].estimatedValue = v; setNestedField(["assets", "physical", "properties"], a); })} onBlur={() => clearRaw(`pr_${p.id}_v`)} /></div>
                  <button className="nwp-del" onClick={() => setNestedField(["assets", "physical", "properties"], portfolio.assets.physical.properties.filter((x: any) => x.id !== p.id))}><Trash2 size={13} /></button>
                </div>
              ))}

              <div className="nwp-sub-head" style={{ marginTop: 20 }}>
                <div className="nwp-sub-title" style={{ margin: 0 }}>Vehicles</div>
                <button className="nwp-add-btn" onClick={() => { const a = [...(portfolio.assets.physical.vehicles || [])]; a.push({ id: String(Math.random()), name: "My Car", type: "car", estimatedValue: 0 }); setNestedField(["assets", "physical", "vehicles"], a); }}><Plus size={11} /> Add Vehicle</button>
              </div>
              {physical.vehicles?.map((v: any, i: number) => (
                <div key={v.id} className="nwp-row">
                  <div className="nwp-fc" style={{ flex: 1.5 }}><label>Make & Model</label><input type="text" value={v.name} onChange={e => { const a = [...portfolio.assets.physical.vehicles]; a[i].name = e.target.value; setNestedField(["assets", "physical", "vehicles"], a); }} /></div>
                  <div className="nwp-fc"><label>Type</label><select value={v.type} onChange={e => { const a = [...portfolio.assets.physical.vehicles]; a[i].type = e.target.value; setNestedField(["assets", "physical", "vehicles"], a); }}><option value="car">Car / SUV</option><option value="bike">Bike</option><option value="commercial">Commercial</option></select></div>
                  <div className="nwp-fc"><label>Estimated Value (₹)</label><input type="number" value={r(`veh_${v.id}_v`, v.estimatedValue)} onChange={e => setNum(`veh_${v.id}_v`, e.target.value, v2 => { const a = [...portfolio.assets.physical.vehicles]; a[i].estimatedValue = v2; setNestedField(["assets", "physical", "vehicles"], a); })} onBlur={() => clearRaw(`veh_${v.id}_v`)} /></div>
                  <button className="nwp-del" onClick={() => setNestedField(["assets", "physical", "vehicles"], portfolio.assets.physical.vehicles.filter((x: any) => x.id !== v.id))}><Trash2 size={13} /></button>
                </div>
              ))}

              <div className="nwp-sub-title" style={{ marginTop: 20 }}>Precious Metals</div>
              <div className="nwp-sub-grid">
                <div className="nwp-sub-card">
                  <div className="nwp-sub-card-title">Gold & Jewellery</div>
                  <div className="nwp-fc"><label>Weight (grams)</label><input type="number" value={r("gold_w", physical.goldJewellery?.weightGrams)} onChange={e => setNum("gold_w", e.target.value, v => setNestedField(["assets", "physical", "goldJewellery", "weightGrams"], v))} onBlur={() => clearRaw("gold_w")} /></div>
                  <div className="nwp-fc" style={{ marginTop: 8 }}><label>Purity</label><select value={physical.goldJewellery?.purity} onChange={e => setNestedField(["assets", "physical", "goldJewellery", "purity"], e.target.value)}><option value="24K">24K (Pure)</option><option value="22K">22K (Standard)</option><option value="18K">18K</option></select></div>
                  <div className="nwp-rate-hint">Rate: ₹{goldRate}/g · <strong>Value: ₹{Math.round(goldVal).toLocaleString("en-IN")}</strong></div>
                </div>
                <div className="nwp-sub-card">
                  <div className="nwp-sub-card-title">Silver</div>
                  <div className="nwp-fc"><label>Weight (grams)</label><input type="number" value={r("silver_w", physical.silverMetals?.weightGrams)} onChange={e => setNum("silver_w", e.target.value, v => setNestedField(["assets", "physical", "silverMetals", "weightGrams"], v))} onBlur={() => clearRaw("silver_w")} /></div>
                  <div className="nwp-rate-hint">Rate: ₹{SILVER_RATE}/g · <strong>Value: ₹{Math.round(silverVal).toLocaleString("en-IN")}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIABILITIES ── */}
      {activeTab === "liabilities" && (
        <div className="nwp-tab-body">
          <div className="nwp-card">
            <div className="nwp-cb">
              <div className="nwp-ct" style={{ marginBottom: 16 }}>Short-Term Liabilities — ₹{totalShort.toLocaleString("en-IN")}</div>

              <div className="nwp-sub-head">
                <div className="nwp-sub-title" style={{ margin: 0 }}>Credit Cards</div>
                <button className="nwp-add-btn" onClick={() => { const a = [...(portfolio.liabilities.shortTerm.creditCards || [])]; a.push({ id: String(Math.random()), cardName: "HDFC Card", outstanding: 0, minimumDue: 0 }); setNestedField(["liabilities", "shortTerm", "creditCards"], a); }}><Plus size={11} /> Add Card</button>
              </div>
              {shortTerm.creditCards?.map((cc: any, i: number) => (
                <div key={cc.id} className="nwp-row">
                  <div className="nwp-fc" style={{ flex: 1.5 }}><label>Card / Issuer</label><input type="text" value={cc.cardName} onChange={e => { const a = [...portfolio.liabilities.shortTerm.creditCards]; a[i].cardName = e.target.value; setNestedField(["liabilities", "shortTerm", "creditCards"], a); }} /></div>
                  <div className="nwp-fc"><label>Outstanding (₹)</label><input type="number" value={r(`cc_${cc.id}_o`, cc.outstanding)} onChange={e => setNum(`cc_${cc.id}_o`, e.target.value, v => { const a = [...portfolio.liabilities.shortTerm.creditCards]; a[i].outstanding = v; setNestedField(["liabilities", "shortTerm", "creditCards"], a); })} onBlur={() => clearRaw(`cc_${cc.id}_o`)} /></div>
                  <div className="nwp-fc"><label>Minimum Due (₹)</label><input type="number" value={r(`cc_${cc.id}_md`, cc.minimumDue)} onChange={e => setNum(`cc_${cc.id}_md`, e.target.value, v => { const a = [...portfolio.liabilities.shortTerm.creditCards]; a[i].minimumDue = v; setNestedField(["liabilities", "shortTerm", "creditCards"], a); })} onBlur={() => clearRaw(`cc_${cc.id}_md`)} /></div>
                  <button className="nwp-del" onClick={() => setNestedField(["liabilities", "shortTerm", "creditCards"], portfolio.liabilities.shortTerm.creditCards.filter((x: any) => x.id !== cc.id))}><Trash2 size={13} /></button>
                </div>
              ))}

              <div className="nwp-sub-head" style={{ marginTop: 20 }}>
                <div className="nwp-sub-title" style={{ margin: 0 }}>Personal Loans</div>
                <button className="nwp-add-btn" onClick={() => { const a = [...(portfolio.liabilities.shortTerm.personalLoans || [])]; a.push({ id: String(Math.random()), lender: "ICICI Bank", outstanding: 0, emi: 0, interestRate: 11, remainingTenureMonths: 12 }); setNestedField(["liabilities", "shortTerm", "personalLoans"], a); }}><Plus size={11} /> Add Loan</button>
              </div>
              {shortTerm.personalLoans?.map((loan: any, i: number) => (
                <div key={loan.id} className="nwp-row">
                  <div className="nwp-fc" style={{ flex: 1.2 }}><label>Lender</label><input type="text" value={loan.lender} onChange={e => { const a = [...portfolio.liabilities.shortTerm.personalLoans]; a[i].lender = e.target.value; setNestedField(["liabilities", "shortTerm", "personalLoans"], a); }} /></div>
                  <div className="nwp-fc"><label>Outstanding (₹)</label><input type="number" value={r(`pl_${loan.id}_o`, loan.outstanding)} onChange={e => setNum(`pl_${loan.id}_o`, e.target.value, v => { const a = [...portfolio.liabilities.shortTerm.personalLoans]; a[i].outstanding = v; setNestedField(["liabilities", "shortTerm", "personalLoans"], a); })} onBlur={() => clearRaw(`pl_${loan.id}_o`)} /></div>
                  <div className="nwp-fc"><label>EMI (₹/mo)</label><input type="number" value={r(`pl_${loan.id}_e`, loan.emi)} onChange={e => setNum(`pl_${loan.id}_e`, e.target.value, v => { const a = [...portfolio.liabilities.shortTerm.personalLoans]; a[i].emi = v; setNestedField(["liabilities", "shortTerm", "personalLoans"], a); })} onBlur={() => clearRaw(`pl_${loan.id}_e`)} /></div>
                  <div className="nwp-fc" style={{ flex: 0.6 }}><label>Rate (%)</label><input type="number" value={r(`pl_${loan.id}_r`, loan.interestRate)} step={0.1} onChange={e => setNum(`pl_${loan.id}_r`, e.target.value, v => { const a = [...portfolio.liabilities.shortTerm.personalLoans]; a[i].interestRate = v; setNestedField(["liabilities", "shortTerm", "personalLoans"], a); })} onBlur={() => clearRaw(`pl_${loan.id}_r`)} /></div>
                  <button className="nwp-del" onClick={() => setNestedField(["liabilities", "shortTerm", "personalLoans"], portfolio.liabilities.shortTerm.personalLoans.filter((x: any) => x.id !== loan.id))}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="nwp-card" style={{ marginTop: 20 }}>
            <div className="nwp-cb">
              <div className="nwp-ct" style={{ marginBottom: 16 }}>Long-Term Liabilities — ₹{totalLong.toLocaleString("en-IN")}</div>

              <div className="nwp-sub-head">
                <div className="nwp-sub-title" style={{ margin: 0 }}>Home Loans & Mortgages</div>
                <button className="nwp-add-btn" onClick={() => { const a = [...(portfolio.liabilities.longTerm.homeLoans || [])]; a.push({ id: String(Math.random()), lender: "SBI", outstanding: 0, emi: 0, interestRate: 8.5, loanType: "floating", remainingTenureMonths: 180 }); setNestedField(["liabilities", "longTerm", "homeLoans"], a); }}><Plus size={11} /> Add Home Loan</button>
              </div>
              {longTerm.homeLoans?.map((loan: any, i: number) => (
                <div key={loan.id} className="nwp-row">
                  <div className="nwp-fc"><label>Lender</label><input type="text" value={loan.lender} onChange={e => { const a = [...portfolio.liabilities.longTerm.homeLoans]; a[i].lender = e.target.value; setNestedField(["liabilities", "longTerm", "homeLoans"], a); }} /></div>
                  <div className="nwp-fc"><label>Outstanding (₹)</label><input type="number" value={r(`hl_${loan.id}_o`, loan.outstanding)} onChange={e => setNum(`hl_${loan.id}_o`, e.target.value, v => { const a = [...portfolio.liabilities.longTerm.homeLoans]; a[i].outstanding = v; setNestedField(["liabilities", "longTerm", "homeLoans"], a); })} onBlur={() => clearRaw(`hl_${loan.id}_o`)} /></div>
                  <div className="nwp-fc"><label>EMI (₹/mo)</label><input type="number" value={r(`hl_${loan.id}_e`, loan.emi)} onChange={e => setNum(`hl_${loan.id}_e`, e.target.value, v => { const a = [...portfolio.liabilities.longTerm.homeLoans]; a[i].emi = v; setNestedField(["liabilities", "longTerm", "homeLoans"], a); })} onBlur={() => clearRaw(`hl_${loan.id}_e`)} /></div>
                  <div className="nwp-fc" style={{ flex: 0.6 }}><label>Rate (%)</label><input type="number" value={r(`hl_${loan.id}_r`, loan.interestRate)} step={0.1} onChange={e => setNum(`hl_${loan.id}_r`, e.target.value, v => { const a = [...portfolio.liabilities.longTerm.homeLoans]; a[i].interestRate = v; setNestedField(["liabilities", "longTerm", "homeLoans"], a); })} onBlur={() => clearRaw(`hl_${loan.id}_r`)} /></div>
                  <div className="nwp-fc"><label>Link Property</label><select value={loan.linkedAssetId || ""} onChange={e => { const a = [...portfolio.liabilities.longTerm.homeLoans]; a[i].linkedAssetId = e.target.value; setNestedField(["liabilities", "longTerm", "homeLoans"], a); }}><option value="">-- Unlinked --</option>{physical.properties?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <button className="nwp-del" onClick={() => setNestedField(["liabilities", "longTerm", "homeLoans"], portfolio.liabilities.longTerm.homeLoans.filter((x: any) => x.id !== loan.id))}><Trash2 size={13} /></button>
                </div>
              ))}

              <div className="nwp-sub-head" style={{ marginTop: 20 }}>
                <div className="nwp-sub-title" style={{ margin: 0 }}>Car & Vehicle Loans</div>
                <button className="nwp-add-btn" onClick={() => { const a = [...(portfolio.liabilities.longTerm.carLoans || [])]; a.push({ id: String(Math.random()), lender: "HDFC", outstanding: 0, emi: 0, interestRate: 9.5, remainingTenureMonths: 36 }); setNestedField(["liabilities", "longTerm", "carLoans"], a); }}><Plus size={11} /> Add Car Loan</button>
              </div>
              {longTerm.carLoans?.map((loan: any, i: number) => (
                <div key={loan.id} className="nwp-row">
                  <div className="nwp-fc"><label>Lender</label><input type="text" value={loan.lender} onChange={e => { const a = [...portfolio.liabilities.longTerm.carLoans]; a[i].lender = e.target.value; setNestedField(["liabilities", "longTerm", "carLoans"], a); }} /></div>
                  <div className="nwp-fc"><label>Outstanding (₹)</label><input type="number" value={r(`cl_${loan.id}_o`, loan.outstanding)} onChange={e => setNum(`cl_${loan.id}_o`, e.target.value, v => { const a = [...portfolio.liabilities.longTerm.carLoans]; a[i].outstanding = v; setNestedField(["liabilities", "longTerm", "carLoans"], a); })} onBlur={() => clearRaw(`cl_${loan.id}_o`)} /></div>
                  <div className="nwp-fc"><label>EMI (₹/mo)</label><input type="number" value={r(`cl_${loan.id}_e`, loan.emi)} onChange={e => setNum(`cl_${loan.id}_e`, e.target.value, v => { const a = [...portfolio.liabilities.longTerm.carLoans]; a[i].emi = v; setNestedField(["liabilities", "longTerm", "carLoans"], a); })} onBlur={() => clearRaw(`cl_${loan.id}_e`)} /></div>
                  <div className="nwp-fc"><label>Link Vehicle</label><select value={loan.linkedAssetId || ""} onChange={e => { const a = [...portfolio.liabilities.longTerm.carLoans]; a[i].linkedAssetId = e.target.value; setNestedField(["liabilities", "longTerm", "carLoans"], a); }}><option value="">-- Unlinked --</option>{physical.vehicles?.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                  <button className="nwp-del" onClick={() => setNestedField(["liabilities", "longTerm", "carLoans"], portfolio.liabilities.longTerm.carLoans.filter((x: any) => x.id !== loan.id))}><Trash2 size={13} /></button>
                </div>
              ))}

              <div className="nwp-sub-title" style={{ marginTop: 20 }}>Pending Tax Dues</div>
              <div className="nwp-row" style={{ maxWidth: 340 }}>
                <div className="nwp-fc"><label>Estimated Unpaid Tax / TDS Shortfall (₹)</label><input type="number" value={r("pendingTax", portfolio.liabilities?.pendingTaxDues)} onChange={e => setNum("pendingTax", e.target.value, v => setNestedField(["liabilities", "pendingTaxDues"], v))} onBlur={() => clearRaw("pendingTax")} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PROTECTION ── */}
      {activeTab === "protection" && (
        <div className="nwp-tab-body">
          <div className="nwp-card" style={{ borderColor: "#e9e3ff", background: "#faf8ff" }}>
            <div className="nwp-card-stripe" style={{ background: "linear-gradient(90deg,#7c3aed,#a855f7)" }} />
            <div className="nwp-cb">
              <div className="nwp-ct">Security & Protection Layer</div>
              <p className="nwp-csub" style={{ marginTop: 6 }}>Term insurance provides pure risk cover. Endowment / LIC policies hold surrender values that count as assets.</p>
            </div>
          </div>

          <div className="nwp-card" style={{ marginTop: 20 }}>
            <div className="nwp-cb">
              <div className="nwp-sec-head">
                <div className="nwp-ct">Term Insurance Policies</div>
                <button className="nwp-add-btn" onClick={() => { const a = [...(portfolio.protection.termInsurance || [])]; a.push({ id: String(Math.random()), policyName: "HDFC Life Click 2 Protect", sumAssured: 10000000, annualPremium: 12000 }); setNestedField(["protection", "termInsurance"], a); }}><Plus size={11} /> Add Term Cover</button>
              </div>
              {portfolio.protection.termInsurance?.map((p: any, i: number) => (
                <div key={p.id} className="nwp-row">
                  <div className="nwp-fc" style={{ flex: 1.5 }}><label>Policy / Insurer</label><input type="text" value={p.policyName} onChange={e => { const a = [...portfolio.protection.termInsurance]; a[i].policyName = e.target.value; setNestedField(["protection", "termInsurance"], a); }} /></div>
                  <div className="nwp-fc"><label>Sum Assured (₹)</label><input type="number" value={r(`ti_${p.id}_sa`, p.sumAssured)} onChange={e => setNum(`ti_${p.id}_sa`, e.target.value, v => { const a = [...portfolio.protection.termInsurance]; a[i].sumAssured = v; setNestedField(["protection", "termInsurance"], a); })} onBlur={() => clearRaw(`ti_${p.id}_sa`)} /></div>
                  <div className="nwp-fc"><label>Annual Premium (₹)</label><input type="number" value={r(`ti_${p.id}_ap`, p.annualPremium)} onChange={e => setNum(`ti_${p.id}_ap`, e.target.value, v => { const a = [...portfolio.protection.termInsurance]; a[i].annualPremium = v; setNestedField(["protection", "termInsurance"], a); })} onBlur={() => clearRaw(`ti_${p.id}_ap`)} /></div>
                  <button className="nwp-del" onClick={() => setNestedField(["protection", "termInsurance"], portfolio.protection.termInsurance.filter((x: any) => x.id !== p.id))}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="nwp-card" style={{ marginTop: 20 }}>
            <div className="nwp-cb">
              <div className="nwp-sec-head">
                <div className="nwp-ct">Endowment / LIC Policies (with Surrender Value)</div>
                <button className="nwp-add-btn" onClick={() => { const a = [...(portfolio.protection.endowmentPolicies || [])]; a.push({ id: String(Math.random()), policyName: "LIC Jeevan Anand", sumAssured: 500000, surrenderValue: 80000, annualPremium: 22000 }); setNestedField(["protection", "endowmentPolicies"], a); }}><Plus size={11} /> Add Policy</button>
              </div>
              {portfolio.protection.endowmentPolicies?.map((p: any, i: number) => (
                <div key={p.id} className="nwp-row">
                  <div className="nwp-fc" style={{ flex: 1.5 }}><label>Policy Name</label><input type="text" value={p.policyName} onChange={e => { const a = [...portfolio.protection.endowmentPolicies]; a[i].policyName = e.target.value; setNestedField(["protection", "endowmentPolicies"], a); }} /></div>
                  <div className="nwp-fc"><label>Sum Assured (₹)</label><input type="number" value={r(`ep_${p.id}_sa`, p.sumAssured)} onChange={e => setNum(`ep_${p.id}_sa`, e.target.value, v => { const a = [...portfolio.protection.endowmentPolicies]; a[i].sumAssured = v; setNestedField(["protection", "endowmentPolicies"], a); })} onBlur={() => clearRaw(`ep_${p.id}_sa`)} /></div>
                  <div className="nwp-fc"><label>Surrender Value (₹)</label><input type="number" value={r(`ep_${p.id}_sv`, p.surrenderValue)} onChange={e => setNum(`ep_${p.id}_sv`, e.target.value, v => { const a = [...portfolio.protection.endowmentPolicies]; a[i].surrenderValue = v; setNestedField(["protection", "endowmentPolicies"], a); })} onBlur={() => clearRaw(`ep_${p.id}_sv`)} /></div>
                  <div className="nwp-fc"><label>Annual Premium (₹)</label><input type="number" value={r(`ep_${p.id}_ap`, p.annualPremium)} onChange={e => setNum(`ep_${p.id}_ap`, e.target.value, v => { const a = [...portfolio.protection.endowmentPolicies]; a[i].annualPremium = v; setNestedField(["protection", "endowmentPolicies"], a); })} onBlur={() => clearRaw(`ep_${p.id}_ap`)} /></div>
                  <button className="nwp-del" onClick={() => setNestedField(["protection", "endowmentPolicies"], portfolio.protection.endowmentPolicies.filter((x: any) => x.id !== p.id))}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── OUTFLOWS ── */}
      {activeTab === "outflows" && (
        <div className="nwp-tab-body">
          <div className="nwp-card" style={{ borderColor: "#fee2e2", background: "#fff5f5" }}>
            <div className="nwp-card-stripe" style={{ background: "linear-gradient(90deg,#ef4444,#f43f5e)" }} />
            <div className="nwp-cb">
              <div className="nwp-ct">Fixed Family Outflows (Fixed Monthly Cash Drains)</div>
              <p className="nwp-csub" style={{ marginTop: 6 }}>Track child expenses and caregiving obligations to evaluate true monthly cash flow commitments.</p>
            </div>
          </div>

          <div className="nwp-card" style={{ marginTop: 20 }}>
            <div className="nwp-cb">
              <div className="nwp-sec-head">
                <div className="nwp-ct">Child Costs</div>
                <button className="nwp-add-btn" onClick={() => {
                  const c = [...(portfolio.familyOutflows?.children || [])];
                  c.push({
                    id: String(Math.random()),
                    yearOfBirth: new Date().getFullYear() - 5,
                    schoolFeesAnnual: 0,
                    schoolType: "private",
                    tuitionMonthly: 0,
                    extracurricularMonthly: 0,
                    childcareMonthly: 0
                  });
                  setNestedField(["familyOutflows", "children"], c);
                }}><Plus size={11} /> Add Child</button>
              </div>

              {children.length === 0 ? (
                <div className="nwp-empty">
                  <Info size={22} color="#7788aa" />
                  <span>No child costs logged yet. Click "Add Child" to log annual/monthly child expenses.</span>
                </div>
              ) : null}

              {children.map((child: any, i: number) => (
                <div key={child.id} className="nwp-row" style={{ flexWrap: "wrap" }}>
                  <div className="nwp-fc" style={{ minWidth: 90, flex: 0.8 }}><label>Birth Year</label><input type="number" value={r(`ch_${child.id}_yob`, child.yearOfBirth)} onChange={e => setNum(`ch_${child.id}_yob`, e.target.value, v => { const c = [...portfolio.familyOutflows.children]; c[i].yearOfBirth = v; setNestedField(["familyOutflows", "children"], c); })} onBlur={() => clearRaw(`ch_${child.id}_yob`)} /></div>
                  <div className="nwp-fc" style={{ minWidth: 100 }}><label>School Type</label><select value={child.schoolType} onChange={e => { const c = [...portfolio.familyOutflows.children]; c[i].schoolType = e.target.value; setNestedField(["familyOutflows", "children"], c); }}><option value="government">Government</option><option value="private">Private</option><option value="international">International</option></select></div>
                  <div className="nwp-fc" style={{ minWidth: 120 }}><label>School Fees (Annual ₹)</label><input type="number" value={r(`ch_${child.id}_sf`, child.schoolFeesAnnual)} onChange={e => setNum(`ch_${child.id}_sf`, e.target.value, v => { const c = [...portfolio.familyOutflows.children]; c[i].schoolFeesAnnual = v; setNestedField(["familyOutflows", "children"], c); })} onBlur={() => clearRaw(`ch_${child.id}_sf`)} /></div>
                  <div className="nwp-fc" style={{ minWidth: 110 }}><label>Tuition (Monthly ₹)</label><input type="number" value={r(`ch_${child.id}_t`, child.tuitionMonthly)} onChange={e => setNum(`ch_${child.id}_t`, e.target.value, v => { const c = [...portfolio.familyOutflows.children]; c[i].tuitionMonthly = v; setNestedField(["familyOutflows", "children"], c); })} onBlur={() => clearRaw(`ch_${child.id}_t`)} /></div>
                  <div className="nwp-fc" style={{ minWidth: 110 }}><label>Extracurricular (₹/mo)</label><input type="number" value={r(`ch_${child.id}_ex`, child.extracurricularMonthly)} onChange={e => setNum(`ch_${child.id}_ex`, e.target.value, v => { const c = [...portfolio.familyOutflows.children]; c[i].extracurricularMonthly = v; setNestedField(["familyOutflows", "children"], c); })} onBlur={() => clearRaw(`ch_${child.id}_ex`)} /></div>
                  <div className="nwp-fc" style={{ minWidth: 110 }}><label>Daycare (₹/mo)</label><input type="number" value={r(`ch_${child.id}_cc`, child.childcareMonthly)} onChange={e => setNum(`ch_${child.id}_cc`, e.target.value, v => { const c = [...portfolio.familyOutflows.children]; c[i].childcareMonthly = v; setNestedField(["familyOutflows", "children"], c); })} onBlur={() => clearRaw(`ch_${child.id}_cc`)} /></div>
                  <button className="nwp-del" onClick={() => setNestedField(["familyOutflows", "children"], portfolio.familyOutflows.children.filter((x: any) => x.id !== child.id))}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="nwp-card" style={{ marginTop: 20 }}>
            <div className="nwp-cb">
              <div className="nwp-ct" style={{ marginBottom: 16 }}>Caregiving & Remittances</div>
              <div className="nwp-row" style={{ flexWrap: "wrap" }}>
                <div className="nwp-fc" style={{ minWidth: 160 }}><label>Parent Healthcare (Monthly ₹)</label><input type="number" value={r("parentHealthcareMonthly", caregiving.parentHealthcareMonthly)} onChange={e => setNum("parentHealthcareMonthly", e.target.value, v => setNestedField(["familyOutflows", "caregiving", "parentHealthcareMonthly"], v))} onBlur={() => clearRaw("parentHealthcareMonthly")} /></div>
                <div className="nwp-fc" style={{ minWidth: 160 }}><label>Parent Insurance Premium (Annual ₹)</label><input type="number" value={r("parentInsuranceAnnualPremium", caregiving.parentInsuranceAnnualPremium)} onChange={e => setNum("parentInsuranceAnnualPremium", e.target.value, v => setNestedField(["familyOutflows", "caregiving", "parentInsuranceAnnualPremium"], v))} onBlur={() => clearRaw("parentInsuranceAnnualPremium")} /></div>
                <div className="nwp-fc" style={{ minWidth: 160 }}><label>Parent Insurance Cover (₹)</label><input type="number" value={r("parentInsuranceCoverAmount", caregiving.parentInsuranceCoverAmount)} onChange={e => setNum("parentInsuranceCoverAmount", e.target.value, v => setNestedField(["familyOutflows", "caregiving", "parentInsuranceCoverAmount"], v))} onBlur={() => clearRaw("parentInsuranceCoverAmount")} /></div>
              </div>
              <div className="nwp-row" style={{ flexWrap: "wrap", marginTop: 12 }}>
                <div className="nwp-fc" style={{ minWidth: 200 }}><label>Monthly Family Remittance / Support (₹)</label><input type="number" value={r("monthlyRemittance", caregiving.monthlyRemittance)} onChange={e => setNum("monthlyRemittance", e.target.value, v => setNestedField(["familyOutflows", "caregiving", "monthlyRemittance"], v))} onBlur={() => clearRaw("monthlyRemittance")} /></div>
                <div className="nwp-fc" style={{ minWidth: 200 }}><label>Helper Salaries (Maids, Cooks, Drivers) (₹/mo)</label><input type="number" value={r("householdHelpMonthly", caregiving.householdHelpMonthly)} onChange={e => setNum("householdHelpMonthly", e.target.value, v => setNestedField(["familyOutflows", "caregiving", "householdHelpMonthly"], v))} onBlur={() => clearRaw("householdHelpMonthly")} /></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SCOPED CSS (nwp- prefix to avoid conflicts with ingestion styles) ─ */
const NWP_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,800;9..40,900&family=Inter:wght@400;500;600;700;800&display=swap');

  .nwp-root { font-family: "Inter", sans-serif; color: #0d1117; }

  /* Summaries */
  .nwp-summaries { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .nwp-sc { background: #fff; border: 1px solid #e4e9f4; border-radius: 18px; padding: 18px 20px; display: flex; flex-direction: column; gap: 5px; box-shadow: 0 2px 8px rgba(0,68,220,0.04); }
  .nwp-sc-blue { background: linear-gradient(135deg, #0055EE, #1e40af); border: none; color: #fff; }
  .nwp-sc-lbl { font-size: 0.69rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.8; }
  .nwp-sc-val { font-family: "DM Sans", sans-serif; font-size: 1.7rem; font-weight: 800; letter-spacing: -0.03em; }
  .nwp-sc-foot { font-size: 0.72rem; color: #52637a; }
  .nwp-sc-blue .nwp-sc-foot { color: rgba(255,255,255,0.75); }
  .nwp-badge { display: inline-block; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; }
  .nwp-badge.info { background: #eff6ff; color: #1e40af; }
  .nwp-badge.warn { background: #fffbeb; color: #b45309; }
  .nwp-badge.success { background: #ecfdf5; color: #047857; }
  .nwp-badge.danger { background: #fef2f2; color: #b91c1c; }

  /* Tabs */
  .nwp-tabs { display: flex; gap: 6px; border-bottom: 1.5px solid #e4e9f4; padding-bottom: 1px; margin-bottom: 24px; align-items: center; flex-wrap: wrap; }
  .nwp-tab { padding: 9px 18px; font-size: 0.73rem; font-weight: 700; color: #52637a; background: transparent; border: none; border-bottom: 3px solid transparent; cursor: pointer; transition: all 0.18s; letter-spacing: 0.05em; }
  .nwp-tab:hover { color: #0055EE; border-bottom-color: #c7d7fa; }
  .nwp-tab.active { color: #0055EE; border-bottom-color: #0055EE; }
  .nwp-save-btn { margin-left: auto; display: inline-flex; align-items: center; gap: 7px; font-size: 0.78rem; font-weight: 800; color: #fff; background: #0055EE; border: none; border-radius: 10px; padding: 9px 18px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,85,238,0.22); transition: all 0.18s; }
  .nwp-save-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.07); }
  .nwp-save-btn:disabled { background: #94a3b8; box-shadow: none; cursor: not-allowed; }
  .nwp-spin { animation: nwp-spin 1s linear infinite; }
  @keyframes nwp-spin { to { transform: rotate(360deg); } }

  /* Message */
  .nwp-msg { display: flex; align-items: center; gap: 9px; padding: 12px 16px; border-radius: 10px; font-size: 0.82rem; font-weight: 600; margin-bottom: 20px; }
  .nwp-msg.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; }
  .nwp-msg.error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }

  /* Cards */
  .nwp-tab-body { display: flex; flex-direction: column; gap: 0; }
  .nwp-card { background: #fff; border: 1px solid #e4e9f4; border-radius: 18px; box-shadow: 0 2px 6px rgba(0,68,220,0.03); overflow: hidden; }
  .nwp-card-stripe { height: 4px; width: 100%; }
  .nwp-cb { padding: 22px; }
  .nwp-ct { font-family: "DM Sans", sans-serif; font-size: 1.05rem; font-weight: 800; color: #0d1117; }
  .nwp-csub { font-size: 0.8rem; color: #52637a; line-height: 1.6; }
  .nwp-sec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .nwp-sub-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .nwp-sub-title { font-family: "DM Sans", sans-serif; font-size: 0.9rem; font-weight: 800; color: #1a1f26; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; margin-bottom: 12px; }

  /* Add button */
  .nwp-add-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 0.71rem; font-weight: 700; color: #0055EE; background: #f0f4ff; border: 1px solid #c7d7fa; border-radius: 7px; padding: 5px 11px; cursor: pointer; transition: all 0.18s; }
  .nwp-add-btn:hover { background: #0055EE; color: #fff; border-color: #0055EE; }

  /* Form rows */
  .nwp-row { display: flex; gap: 10px; align-items: flex-end; background: #fff; border: 1px solid #f0f2f8; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
  .nwp-fc { display: flex; flex-direction: column; gap: 3px; flex: 1; }
  .nwp-fc label { font-size: 0.69rem; font-weight: 700; color: #7788aa; }
  .nwp-fc input, .nwp-fc select { height: 36px; border: 1px solid #e2e8f0; border-radius: 7px; padding: 0 9px; font-size: 0.8rem; color: #111; background: #fff; outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box; }
  .nwp-fc input:focus, .nwp-fc select:focus { border-color: #0055EE; }
  .nwp-del { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 7px; background: #fee2e2; border: 1px solid #fecaca; color: #ef4444; cursor: pointer; transition: all 0.18s; flex-shrink: 0; }
  .nwp-del:hover { background: #ef4444; color: #fff; border-color: #ef4444; }

  /* Sub cards (PPF/EPF/NPS grid) */
  .nwp-sub-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
  .nwp-sub-card { background: #fafbfe; border: 1px solid #e4e9f4; border-radius: 14px; padding: 14px; }
  .nwp-sub-card-title { font-family: "DM Sans", sans-serif; font-size: 0.85rem; font-weight: 800; color: #111; margin-bottom: 10px; }
  .nwp-rate-hint { margin-top: 10px; font-size: 0.73rem; color: #52637a; background: #f8fafc; border-radius: 6px; padding: 6px 9px; }
  .nwp-rate-hint strong { color: #10b981; }

  /* Overview */
  .nwp-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px; }
  @media (max-width: 860px) { .nwp-two-col { grid-template-columns: 1fr; } }
  .nwp-alloc-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
  .nwp-alloc-head { display: flex; justify-content: space-between; font-size: 0.82rem; }
  .nwp-alloc-head strong { color: #111; }
  .nwp-alloc-head span { font-weight: 700; color: #333; }
  .nwp-progress { height: 7px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
  .nwp-fill { height: 100%; border-radius: 9999px; transition: width 0.7s ease-in-out; }
  .nwp-alloc-sub { font-size: 0.7rem; color: #7788aa; font-weight: 600; }
  .nwp-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 26px; color: #7788aa; font-size: 0.8rem; border: 1px dashed #e4e9f4; border-radius: 12px; }
  .nwp-eq-item { border: 1px solid #f0f2f8; background: #fafbfe; border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 7px; margin-bottom: 10px; }
  .nwp-eq-head { display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: #111; }
  .nwp-eq-meter { display: flex; align-items: center; gap: 10px; }
  .nwp-eq-meter > div { flex: 1; height: 5px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; }
  .nwp-eq-fill { height: 100%; border-radius: 9999px; }
  .nwp-eq-meter > span { font-size: 0.69rem; font-weight: 700; color: #52637a; white-space: nowrap; }
  .nwp-eq-foot { display: flex; justify-content: space-between; font-size: 0.74rem; border-top: 1px solid #f1f5f9; padding-top: 5px; color: #7788aa; }
  .nwp-eq-foot strong { color: #10b981; }
  .nwp-risk-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-top: 14px; }
  .nwp-risk-box { background: #fafbfe; border: 1px solid #e4e9f4; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
  .nwp-risk-lbl { font-size: 0.67rem; font-weight: 700; color: #7788aa; text-transform: uppercase; }
  .nwp-risk-val { font-family: "DM Sans", sans-serif; font-size: 1.1rem; font-weight: 800; }

  @media (max-width: 700px) {
    .nwp-row { flex-direction: column; align-items: stretch; }
    .nwp-del { width: 100%; }
    .nwp-tabs { flex-direction: column; align-items: stretch; }
    .nwp-save-btn { width: 100%; justify-content: center; margin-top: 8px; }
  }
`;
