import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";

const API = "https://bulkemail-9h87.onrender.com/api";

/* ─── Toast notification system ─────────────────────────────── */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  };
  return { toasts, toast: add };
}

function ToastContainer({ toasts }) {
  const colors = {
    success: { bg: "#052e16", border: "#16a34a", icon: "✅" },
    error:   { bg: "#450a0a", border: "#dc2626", icon: "❌" },
    info:    { bg: "#0c1a3a", border: "#3b82f6", icon: "📧" },
    warn:    { bg: "#422006", border: "#f59e0b", icon: "⚠️" },
  };
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 }}>
      {toasts.map((t) => {
        const c = colors[t.type] || colors.info;
        return (
          <div key={t.id} style={{
            background: c.bg, border: `1.5px solid ${c.border}`, color: "#fff",
            borderRadius: 10, padding: "14px 18px", fontSize: 14, fontWeight: 500,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            animation: "slideIn 0.25s ease",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{c.icon}</span>
            <span style={{ lineHeight: 1.5 }}>{t.msg}</span>
          </div>
        );
      })}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const S = {
  app: { minHeight: "100vh", background: "#0f1117", padding: "32px 16px", color: "#e5e7eb" },
  container: { maxWidth: 940, margin: "0 auto" },
  header: {
    display: "flex", alignItems: "center", gap: 16, marginBottom: 28,
    padding: "24px 32px", background: "#1a1a2e",
    borderRadius: 12, border: "1px solid #2d2d4e",
  },
  card: {
    background: "#16181f", border: "1px solid #2a2d3a",
    borderRadius: 12, padding: "24px 28px", marginBottom: 18,
  },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#94a3b8", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 18 },
  label: { display: "block", fontSize: 13, fontWeight: 500, color: "#9ca3af", marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1.5px solid #2a2d3a", background: "#0f1117",
    color: "#e5e7eb", fontSize: 14, outline: "none",
    fontFamily: "inherit", transition: "border-color .2s",
    boxSizing: "border-box",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  btnPrimary: {
    background: "#4f46e5", color: "#fff", border: "none",
    borderRadius: 8, padding: "11px 22px", fontSize: 14,
    fontWeight: 600, cursor: "pointer", transition: "background .2s",
  },
  btnGhost: {
    background: "transparent", color: "#94a3b8",
    border: "1.5px solid #2a2d3a", borderRadius: 8,
    padding: "10px 18px", fontSize: 14, cursor: "pointer",
  },
  btnDanger: {
    background: "transparent", color: "#f87171",
    border: "1px solid #3a1a1a", borderRadius: 6,
    padding: "5px 11px", fontSize: 13, cursor: "pointer",
  },
  th: { textAlign: "left", padding: "10px 12px", color: "#6b7280", fontSize: 12, fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid #2a2d3a" },
  td: { padding: "9px 12px", borderBottom: "1px solid #1e2028", verticalAlign: "middle" },
};

function badge(status) {
  const map = {
    sent:    { bg: "#052e16", color: "#4ade80", label: "Sent" },
    failed:  { bg: "#450a0a", color: "#f87171", label: "Failed" },
    skipped: { bg: "#422006", color: "#fb923c", label: "Skipped" },
  };
  const c = map[status] || { bg: "#1e293b", color: "#94a3b8", label: status };
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
      {c.label}
    </span>
  );
}

/* ─── Main App ───────────────────────────────────────────────── */
export default function App() {
  const { toasts, toast } = useToasts();

  const [gmail, setGmail] = useState({ user: "", pass: "", fromName: "" });
  const [connected, setConnected] = useState(null);
  const [recipients, setRecipients] = useState([{ email: "", name: "", company: "" }]);
  const [delayMs, setDelayMs] = useState(2000);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef();

  const testConnection = async () => {
    try {
      const res = await fetch(`${API}/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gmailUser: gmail.user, gmailPass: gmail.pass }),
      });
      const data = await res.json();
      setConnected(data.success);
      toast(data.message, data.success ? "success" : "error", 5000);
    } catch {
      setConnected(false);
      toast("Could not reach server. Is it running?", "error");
    }
  };

  const addRow = () => setRecipients([...recipients, { email: "", name: "", company: "" }]);
  const removeRow = (i) => setRecipients(recipients.filter((_, idx) => idx !== i));
  const updateRow = (i, f, v) => {
    const rows = [...recipients];
    rows[i][f] = v;
    setRecipients(rows);
  };

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const mapped = res.data.map((r) => ({
          email: r.email || r.Email || "",
          name: r.name || r.Name || "",
          company: r.company || r.Company || "",
        }));
        setRecipients(mapped);
        toast(`Imported ${mapped.length} recipients`, "success");
      },
    });
    e.target.value = "";
  };

  const previewEmail = async () => {
    const first = recipients.find((r) => r.name && r.company) || { name: "John Doe", company: "Acme Inc" };
    const res = await fetch(`${API}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(first),
    });
    const data = await res.json();
    setPreviewHtml(data.html);
    setShowPreview(true);
  };

  const sendBulk = async () => {
    const valid = recipients.filter((r) => r.email && r.name && r.company);
    if (!valid.length) return toast("Add at least one complete recipient", "warn");
    if (!gmail.user || !gmail.pass) return toast("Enter Gmail credentials first", "warn");

    setSending(true);
    setResults([]);
    setProgress({ done: 0, total: valid.length });

    try {
      const res = await fetch(`${API}/send-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: valid,
          delayMs,
          gmailUser: gmail.user,
          gmailPass: gmail.pass,
          fromName: gmail.fromName,
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "start") {
              toast(`Starting — sending to ${evt.total} recipient${evt.total !== 1 ? "s" : ""}`, "info");
            } else if (evt.type === "progress") {
              setProgress({ done: evt.index, total: evt.total });
              setResults((prev) => [...prev, evt.result]);
              if (evt.result.status === "sent") {
                toast(`✉️ Sent to ${evt.result.name} @ ${evt.result.company}`, "success", 3000);
              } else {
                toast(`Failed: ${evt.result.email} — ${evt.result.reason || "unknown"}`, "error", 5000);
              }
            } else if (evt.type === "done") {
              toast(`All done! ✅ ${evt.sent} sent · ❌ ${evt.failed} failed`, "success", 8000);
              setSending(false);
            } else if (evt.type === "error") {
              toast(evt.message, "error", 8000);
              setSending(false);
            }
          } catch {}
        }
      }
    } catch (err) {
      toast("Send failed: " + err.message, "error");
      setSending(false);
    }
  };

  const validCount = recipients.filter((r) => r.email && r.name && r.company).length;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={S.app}>
      <ToastContainer toasts={toasts} />
      <div style={S.container}>

        {/* Header */}
        <div style={S.header}>
          <div style={{ fontSize: 36 }}>✉️</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.5 }}>Bulk Email Sender</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>Gmail · Personalised outreach · Anti-spam optimised</div>
          </div>
          {connected === true && (
            <div style={{ marginLeft: "auto", background: "#052e16", border: "1px solid #16a34a", color: "#4ade80", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600 }}>
              ● Connected
            </div>
          )}
        </div>

        {/* Gmail Config */}
        <div style={S.card}>
          <div style={S.cardTitle}>🔐 Gmail Account</div>
          <div style={{ ...S.grid2, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Gmail Address</label>
              <input style={S.input} type="email" placeholder="you@gmail.com"
                value={gmail.user} onChange={(e) => setGmail({ ...gmail, user: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>App Password</label>
              <input style={S.input} type="password" placeholder="xxxx xxxx xxxx xxxx"
                value={gmail.pass} onChange={(e) => setGmail({ ...gmail, pass: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Display Name (From)</label>
              <input style={S.input} placeholder="John Smith"
                value={gmail.fromName} onChange={(e) => setGmail({ ...gmail, fromName: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button style={S.btnPrimary} onClick={testConnection}>Test Connection</button>
            <p style={{ fontSize: 12, color: "#4b5563", margin: 0 }}>
              Need an App Password? → Google Account → Security → 2-Step Verification → App Passwords
            </p>
          </div>
        </div>

        {/* Recipients */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ ...S.cardTitle, margin: 0 }}>
              👥 Recipients <span style={{ color: "#4b5563", fontWeight: 400, textTransform: "none", fontSize: 13 }}>({validCount} ready)</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={S.btnGhost} onClick={() => fileRef.current.click()}>📎 Import CSV</button>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCSV} />
              <button style={S.btnPrimary} onClick={addRow}>+ Add Row</button>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#4b5563", marginBottom: 14 }}>
            CSV columns: <code style={{ background: "#1e2028", padding: "2px 6px", borderRadius: 4, color: "#94a3b8" }}>email, name, company</code>
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  {["#", "Email", "Name", "Company", ""].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recipients.map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...S.td, color: "#4b5563", width: 36 }}>{i + 1}</td>
                    <td style={S.td}>
                      <input style={{ ...S.input, minWidth: 200 }} type="email" placeholder="email@company.com"
                        value={r.email} onChange={(e) => updateRow(i, "email", e.target.value)} />
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.input, minWidth: 140 }} placeholder="John Doe"
                        value={r.name} onChange={(e) => updateRow(i, "name", e.target.value)} />
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.input, minWidth: 160 }} placeholder="Acme Inc"
                        value={r.company} onChange={(e) => updateRow(i, "company", e.target.value)} />
                    </td>
                    <td style={S.td}>
                      {recipients.length > 1 && (
                        <button style={S.btnDanger} onClick={() => removeRow(i)}>✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Send */}
        <div style={S.card}>
          <div style={S.cardTitle}>🚀 Send</div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20 }}>
            <div>
              <label style={S.label}>Delay between emails (ms)</label>
              <input style={{ ...S.input, width: 150 }} type="number" min={500} max={30000}
                value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value))} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={S.btnGhost} onClick={previewEmail}>👁 Preview Email</button>
              <button
                style={{ ...S.btnPrimary, opacity: sending || validCount === 0 ? 0.5 : 1, background: sending ? "#374151" : "#4f46e5" }}
                onClick={sendBulk}
                disabled={sending || validCount === 0}
              >
                {sending ? `Sending… (${progress.done}/${progress.total})` : `Send to ${validCount} Recipient${validCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          {sending && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>
                <span>Progress</span><span>{pct}%</span>
              </div>
              <div style={{ height: 8, background: "#1e2028", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#4f46e5", borderRadius: 4, width: `${pct}%`, transition: "width 0.4s ease" }} />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={S.card}>
            <div style={S.cardTitle}>
              📊 Results &nbsp;
              <span style={{ color: "#4ade80" }}>✅ {results.filter(r => r.status === "sent").length} sent</span>
              {results.filter(r => r.status === "failed").length > 0 && (
                <span style={{ color: "#f87171" }}> · ❌ {results.filter(r => r.status === "failed").length} failed</span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr>{["Email", "Name", "Company", "Status", "Note"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td style={S.td}>{r.email}</td>
                      <td style={S.td}>{r.name}</td>
                      <td style={S.td}>{r.company}</td>
                      <td style={S.td}>{badge(r.status)}</td>
                      <td style={{ ...S.td, color: "#4b5563", fontSize: 13 }}>{r.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tips */}
        <div style={{ ...S.card, border: "1px solid #422006", background: "#1c1408" }}>
          <div style={{ ...S.cardTitle, color: "#fb923c" }}>💡 Tips to avoid spam</div>
          <ul style={{ paddingLeft: 20, color: "#a16207", fontSize: 13, lineHeight: "1.9" }}>
            <li>Use a <strong>Gmail App Password</strong>, not your real password</li>
            <li>Keep delay at <strong>2000ms+</strong> between sends</li>
            <li>Gmail free accounts: stay under <strong>500 emails/day</strong></li>
            <li>Personalised subject lines (already done ✅) reduce spam scoring</li>
            <li>Plain-text fallback is included automatically ✅</li>
            <li>For 500+ emails/day, switch to SendGrid or Mailgun</li>
          </ul>
        </div>

      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998, padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 12, maxWidth: 680, width: "100%", maxHeight: "85vh", overflow: "auto", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <strong style={{ color: "#111" }}>Email Preview</strong>
              <button style={{ ...S.btnGhost, color: "#374151", background: "#f3f4f6" }} onClick={() => setShowPreview(false)}>✕ Close</button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}
    </div>
  );
}
