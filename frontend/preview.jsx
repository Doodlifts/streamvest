import { useState, useMemo } from "react";

// ── Mock data for visual preview ──
const MOCK_STREAMS = [
  { id: "0", totalAmount: "100.00000000", totalStreamed: "100.00000000", status: "COMPLETED", isActive: false, destinationAddress: "0x5ec90e3dcf0067c4" },
  { id: "1", totalAmount: "0.50000000", totalStreamed: "0.49999980", status: "COMPLETED", isActive: false, destinationAddress: "0x5ec90e3dcf0067c4" },
  { id: "3", totalAmount: "0.50000000", totalStreamed: "0.49999980", status: "COMPLETED", isActive: false, destinationAddress: "0x5ec90e3dcf0067c4" },
  { id: "4", totalAmount: "250.00000000", totalStreamed: "87.50000000", status: "STREAMING", isActive: true, destinationAddress: "0x1654653399040a61" },
  { id: "5", totalAmount: "1000.00000000", totalStreamed: "0.00000000", status: "PENDING", isActive: true, destinationAddress: "0xe467b9dd11fa00df" },
];

const MOCK_DETAIL = {
  id: "4", totalAmount: "250.00000000", totalStreamed: "87.50000000",
  remaining: "162.50000000", claimable: "12.34560000", streamRate: "0.00289351",
  startTime: "1770700000", endTime: "1773292000", lastStreamTime: "1770753024",
  destinationAddress: "0x1654653399040a61", status: "STREAMING",
  progressPercent: "35.00000000", isActive: true,
};

const DURATION_PRESETS = [
  { label: "1h" }, { label: "1d" }, { label: "1w" },
  { label: "1mo" }, { label: "3mo" }, { label: "1y" },
];
const INTERVAL_PRESETS = [
  { label: "1m" }, { label: "5m" }, { label: "15m" },
  { label: "1h" }, { label: "6h" }, { label: "1d" },
];

// ── Utilities ──
function fmtFlow(a, d = 4) {
  const n = parseFloat(a);
  return isNaN(n) ? "0.0000" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtAddr(a) { return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : ""; }
function fmtDate(ts) {
  if (!ts || ts === "0.00000000") return "\u2014";
  return new Date(parseFloat(ts) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Styles ──
const css = {
  base: "#09090b", surface: "#111113", elevated: "#18181b", hover: "#1f1f23", input: "#0c0c0e",
  border: "#27272a", borderSubtle: "#1c1c20",
  text: "#fafafa", text2: "#a1a1aa", text3: "#52525b", textInv: "#09090b",
  accent: "#00ef8b", accentHover: "#00d67d", accentSubtle: "rgba(0,239,139,0.06)", accentBorder: "rgba(0,239,139,0.15)",
  streaming: "#00ef8b", pending: "#eab308", completed: "#818cf8",
  sans: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
  mono: "'JetBrains Mono','SF Mono',monospace",
  r: { sm: 6, md: 8, lg: 12 },
};

const s = {
  app: { minHeight: "100vh", display: "flex", flexDirection: "column", background: css.base, color: css.text, fontFamily: css.sans, fontSize: 14, lineHeight: 1.5, WebkitFontSmoothing: "antialiased" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56, borderBottom: `1px solid ${css.borderSubtle}`, background: css.base, position: "sticky", top: 0, zIndex: 100 },
  headerLeft: { display: "flex", alignItems: "center", gap: 32 },
  logo: { display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em", userSelect: "none" },
  logoMark: { width: 24, height: 24, borderRadius: 6, background: css.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  nav: { display: "flex", gap: 2 },
  navItem: (active) => ({ padding: "6px 12px", borderRadius: css.r.sm, fontSize: 13, color: active ? css.text : css.text2, cursor: "pointer", border: "none", background: active ? css.elevated : "none", fontFamily: "inherit", transition: "all 150ms" }),
  main: { flex: 1, maxWidth: 960, width: "100%", margin: "0 auto", padding: "40px 32px" },
  walletBtn: { display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: css.r.md, border: `1px solid ${css.border}`, background: css.surface, color: css.text, fontSize: 13, fontFamily: css.mono, cursor: "pointer" },
  walletDot: { width: 7, height: 7, borderRadius: "50%", background: css.accent, flexShrink: 0 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: css.borderSubtle, border: `1px solid ${css.borderSubtle}`, borderRadius: css.r.lg, overflow: "hidden", marginBottom: 40 },
  stat: { background: css.surface, padding: "20px 24px" },
  statLabel: { fontSize: 11, color: css.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 600, fontFamily: css.mono, letterSpacing: "-0.03em" },
  statSuffix: { fontSize: 13, color: css.text2, fontWeight: 400, marginLeft: 4 },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 500, color: css.text3, textTransform: "uppercase", letterSpacing: "0.06em" },
  streamList: { border: `1px solid ${css.borderSubtle}`, borderRadius: css.r.lg, overflow: "hidden" },
  streamRow: { display: "grid", gridTemplateColumns: "56px 1fr 140px 120px 100px", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${css.borderSubtle}`, cursor: "pointer", transition: "background 150ms" },
  streamId: { fontFamily: css.mono, fontSize: 13, color: css.text3 },
  streamDest: { fontFamily: css.mono, fontSize: 13, color: css.text2 },
  streamAmt: { fontFamily: css.mono, fontSize: 13, color: css.text, textAlign: "right" },
  progressCell: { display: "flex", alignItems: "center", gap: 8 },
  progressBar: { flex: 1, height: 3, background: css.elevated, borderRadius: 2, overflow: "hidden" },
  progressFill: (pct, status) => ({ height: "100%", borderRadius: 2, width: `${pct}%`, background: css[status] || css.streaming, transition: "width 500ms" }),
  streamStatus: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, justifyContent: "flex-end" },
  statusDot: (status) => ({ width: 6, height: 6, borderRadius: "50%", background: css[status] || css.streaming, flexShrink: 0 }),
  formCard: { border: `1px solid ${css.borderSubtle}`, borderRadius: css.r.lg, background: css.surface, padding: 32, maxWidth: 520 },
  formTitle: { fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 },
  formSub: { fontSize: 13, color: css.text3, marginBottom: 28 },
  field: { marginBottom: 20 },
  fieldLabel: { display: "block", fontSize: 11, fontWeight: 500, color: css.text2, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" },
  fieldInputWrap: { position: "relative" },
  fieldInput: { width: "100%", padding: "10px 14px", border: `1px solid ${css.border}`, borderRadius: css.r.md, background: css.input, color: css.text, fontSize: 14, fontFamily: css.mono, outline: "none", paddingRight: 60 },
  fieldSuffix: { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: css.text3, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", pointerEvents: "none" },
  presets: { display: "flex", gap: 6, flexWrap: "wrap" },
  presetBtn: (sel) => ({ padding: "7px 14px", border: `1px solid ${sel ? css.accentBorder : css.border}`, borderRadius: css.r.sm, background: sel ? css.accentSubtle : css.base, color: sel ? css.accent : css.text2, fontSize: 12, fontFamily: css.mono, cursor: "pointer" }),
  divider: { height: 1, background: css.borderSubtle, margin: "20px 0" },
  costRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" },
  costLabel: { fontSize: 13, color: css.text2 },
  costDetail: { fontSize: 11, color: css.text3, marginTop: 2 },
  costValue: { fontFamily: css.mono, fontSize: 13, color: css.text },
  costTotal: { fontWeight: 600, fontSize: 15 },
  submitBtn: (disabled) => ({ width: "100%", padding: 12, border: "none", borderRadius: css.r.md, background: css.accent, color: css.textInv, fontSize: 14, fontWeight: 600, fontFamily: css.sans, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, marginTop: 24 }),
  detailBack: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: css.text2, cursor: "pointer", marginBottom: 24, background: "none", border: "none", fontFamily: "inherit", padding: 0 },
  detailHeader: { display: "flex", alignItems: "center", gap: 16, marginBottom: 32 },
  detailTitle: { fontSize: 24, fontWeight: 600, fontFamily: css.mono, letterSpacing: "-0.03em" },
  detailProgress: { border: `1px solid ${css.borderSubtle}`, borderRadius: css.r.lg, background: css.surface, padding: 24, marginBottom: 24 },
  detailBar: { height: 6, background: css.elevated, borderRadius: 3, overflow: "hidden", marginBottom: 12 },
  detailBarFill: (pct, status) => ({ height: "100%", borderRadius: 3, width: `${pct}%`, background: css[status] || css.streaming, transition: "width 500ms" }),
  detailLabels: { display: "flex", justifyContent: "space-between", fontSize: 12, color: css.text2 },
  detailGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: css.borderSubtle, border: `1px solid ${css.borderSubtle}`, borderRadius: css.r.lg, overflow: "hidden" },
  detailCell: { background: css.surface, padding: "16px 20px" },
  cellLabel: { fontSize: 11, color: css.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 },
  cellValue: { fontFamily: css.mono, fontSize: 14 },
  landing: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 32px", minHeight: "calc(100vh - 56px)" },
  landingTitle: { fontSize: 52, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.05, marginBottom: 20 },
  landingSub: { fontSize: 16, color: css.text2, maxWidth: 440, lineHeight: 1.65, marginBottom: 40 },
  landingBtn: { padding: "12px 36px", border: "none", borderRadius: css.r.md, background: css.accent, color: css.textInv, fontSize: 15, fontWeight: 600, fontFamily: css.sans, cursor: "pointer", marginBottom: 80 },
  features: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 40, maxWidth: 700, textAlign: "left" },
  featureNum: { fontFamily: css.mono, fontSize: 11, color: css.accent, marginBottom: 10 },
  featureTitle: { fontSize: 14, fontWeight: 600, marginBottom: 6 },
  featureDesc: { fontSize: 13, color: css.text3, lineHeight: 1.55 },
};

function LogoMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="12" r="1.2" fill="#09090b" />
    </svg>
  );
}

function Header({ connected, view, setView }) {
  return (
    <header style={s.header}>
      <div style={s.headerLeft}>
        <div style={s.logo}><div style={s.logoMark}><LogoMark /></div>StreamVest</div>
        {connected && (
          <nav style={s.nav}>
            <button style={s.navItem(view === "dashboard")} onClick={() => setView("dashboard")}>Dashboard</button>
            <button style={s.navItem(view === "create")} onClick={() => setView("create")}>Create</button>
          </nav>
        )}
      </div>
      {connected ? (
        <button style={s.walletBtn}><span style={s.walletDot} />{fmtAddr("0x5ec90e3dcf0067c4")}</button>
      ) : (
        <button style={{ ...s.walletBtn, borderColor: css.accentBorder, background: css.accentSubtle, color: css.accent, fontFamily: css.sans, fontWeight: 500 }}>Connect Wallet</button>
      )}
    </header>
  );
}

function DashboardView({ setView, setSelected }) {
  const stats = useMemo(() => ({
    total: MOCK_STREAMS.length,
    locked: MOCK_STREAMS.reduce((a, st) => a + parseFloat(st.totalAmount), 0),
    active: MOCK_STREAMS.filter(st => st.status === "STREAMING").length,
  }), []);

  return (
    <>
      <div style={s.statsRow}>
        <div style={s.stat}><div style={s.statLabel}>Total Streams</div><div style={s.statValue}>{stats.total}</div></div>
        <div style={s.stat}><div style={s.statLabel}>Total Locked</div><div style={s.statValue}>{fmtFlow(stats.locked, 2)}<span style={s.statSuffix}>FLOW</span></div></div>
        <div style={s.stat}><div style={s.statLabel}>Active</div><div style={s.statValue}>{stats.active}</div></div>
      </div>
      <div style={s.sectionHeader}><span style={s.sectionTitle}>Streams</span></div>
      <div style={s.streamList}>
        {MOCK_STREAMS.map((st, i) => {
          const pct = parseFloat(st.totalAmount) > 0 ? (parseFloat(st.totalStreamed) / parseFloat(st.totalAmount)) * 100 : 0;
          const cls = st.status.toLowerCase();
          return (
            <div key={st.id} style={{ ...s.streamRow, borderBottom: i < MOCK_STREAMS.length - 1 ? `1px solid ${css.borderSubtle}` : "none" }} onClick={() => { setSelected(st.id); setView("detail"); }}>
              <span style={s.streamId}>#{st.id}</span>
              <span style={s.streamDest}>{fmtAddr(st.destinationAddress)}</span>
              <span style={s.streamAmt}>{fmtFlow(st.totalAmount)} FLOW</span>
              <div style={s.progressCell}><div style={s.progressBar}><div style={s.progressFill(pct, cls)} /></div></div>
              <div style={s.streamStatus}><span style={s.statusDot(cls)} /><span style={{ color: css[cls] }}>{st.status}</span></div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function DetailView({ onBack }) {
  const d = MOCK_DETAIL;
  const progress = parseFloat(d.progressPercent);
  const cls = d.status.toLowerCase();
  return (
    <>
      <button style={s.detailBack} onClick={onBack}>&larr; Back to streams</button>
      <div style={s.detailHeader}>
        <span style={s.detailTitle}>Stream #{d.id}</span>
        <div style={s.streamStatus}><span style={s.statusDot(cls)} /><span style={{ color: css[cls] }}>{d.status}</span></div>
      </div>
      <div style={s.detailProgress}>
        <div style={s.detailBar}><div style={s.detailBarFill(progress, cls)} /></div>
        <div style={s.detailLabels}><span>{progress.toFixed(1)}% complete</span><span style={{ color: css.text3 }}>{fmtFlow(d.totalStreamed)} / {fmtFlow(d.totalAmount)} FLOW</span></div>
      </div>
      <div style={s.detailGrid}>
        {[
          ["Total Amount", `${fmtFlow(d.totalAmount)} FLOW`],
          ["Streamed", `${fmtFlow(d.totalStreamed)} FLOW`],
          ["Remaining", `${fmtFlow(d.remaining)} FLOW`],
          ["Claimable Now", `${fmtFlow(d.claimable)} FLOW`],
          ["Stream Rate", "0.0029 FLOW/s"],
          ["Destination", d.destinationAddress],
          ["Start Time", fmtDate(d.startTime)],
          ["End Time", fmtDate(d.endTime)],
        ].map(([label, val], i) => (
          <div key={i} style={s.detailCell}>
            <div style={s.cellLabel}>{label}</div>
            <div style={{ ...s.cellValue, color: label === "Claimable Now" && parseFloat(d.claimable) > 0 ? css.accent : undefined, wordBreak: "break-all" }}>{val}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function CreateView() {
  const [durIdx, setDurIdx] = useState(3);
  const [intIdx, setIntIdx] = useState(3);
  return (
    <div style={s.formCard}>
      <div style={s.formTitle}>Create Stream</div>
      <div style={s.formSub}>Lock FLOW tokens with autonomous scheduled delivery</div>
      <div style={s.field}>
        <label style={s.fieldLabel}>Amount</label>
        <div style={s.fieldInputWrap}>
          <input style={s.fieldInput} defaultValue="500" placeholder="0.00" />
          <span style={s.fieldSuffix}>FLOW</span>
        </div>
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>Recipient</label>
        <input style={{ ...s.fieldInput, paddingRight: 14 }} defaultValue="0x1654653399040a61" placeholder="0x..." />
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>Duration</label>
        <div style={s.presets}>{DURATION_PRESETS.map((p, i) => <button key={i} style={s.presetBtn(durIdx === i)} onClick={() => setDurIdx(i)}>{p.label}</button>)}</div>
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>Delivery Interval</label>
        <div style={s.presets}>{INTERVAL_PRESETS.map((p, i) => <button key={i} style={s.presetBtn(intIdx === i)} onClick={() => setIntIdx(i)}>{p.label}</button>)}</div>
      </div>
      <div style={s.divider} />
      <div style={s.costRow}><span style={s.costLabel}>Stream amount</span><span style={s.costValue}>500.0000 FLOW</span></div>
      <div style={s.costRow}>
        <div><div style={s.costLabel}>Scheduling fees</div><div style={s.costDetail}>720 triggers &times; 0.04 FLOW</div></div>
        <span style={s.costValue}>28.8000 FLOW</span>
      </div>
      <div style={s.divider} />
      <div style={s.costRow}><span style={{ ...s.costLabel, fontWeight: 600, color: css.text }}>Total</span><span style={{ ...s.costValue, ...s.costTotal }}>528.8000 FLOW</span></div>
      <button style={s.submitBtn(false)}>Create Stream</button>
    </div>
  );
}

function LandingView({ onConnect }) {
  return (
    <div style={s.landing}>
      <h1 style={s.landingTitle}>Streaming vests<br /><span style={{ color: css.accent }}>on Flow</span></h1>
      <p style={s.landingSub}>Lock tokens into NFTs that automatically stream to any address. No intermediaries, no manual claims. Fully autonomous, fully on-chain.</p>
      <button style={s.landingBtn} onClick={onConnect}>Connect Wallet</button>
      <div style={s.features}>
        {[
          ["01", "Lock & Schedule", "Deposit FLOW with a vesting schedule. An NFT is minted as your proof of stream."],
          ["02", "Auto-Stream", "Tokens are delivered automatically at your chosen interval via Flow\u2019s native scheduler."],
          ["03", "Track On-Chain", "Monitor progress in real-time. Every delivery is transparent and verifiable."],
        ].map(([num, title, desc]) => (
          <div key={num}>
            <div style={s.featureNum}>{num}</div>
            <div style={s.featureTitle}>{title}</div>
            <div style={s.featureDesc}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState("dashboard");
  const [selected, setSelected] = useState(null);

  return (
    <div style={s.app}>
      <Header connected={connected} view={view} setView={(v) => { setView(v); setSelected(null); }} />
      <main style={s.main}>
        {!connected ? (
          <LandingView onConnect={() => setConnected(true)} />
        ) : view === "dashboard" ? (
          <DashboardView setView={setView} setSelected={setSelected} />
        ) : view === "create" ? (
          <CreateView />
        ) : view === "detail" ? (
          <DetailView onBack={() => { setView("dashboard"); setSelected(null); }} />
        ) : null}
      </main>
    </div>
  );
}
