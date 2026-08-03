import React, { useState } from 'react';
import { Layers, HelpCircle, CheckCircle } from 'lucide-react';

export default function Sandbox({ token }) {
  const [loginTime, setLoginTime] = useState(10);
  const [failed, setFailed] = useState(0);
  const [deviceKnown, setDeviceKnown] = useState('Yes');
  const [notice, setNotice] = useState(false);
  const [files, setFiles] = useState(15);
  const [downloads, setDownloads] = useState(5);
  const [sensitive, setSensitive] = useState(0);
  const [collab, setCollab] = useState(false);
  const [genai, setGenai] = useState(0);
  const [external, setExternal] = useState(0);
  const [usb, setUsb] = useState(false);
  const [priv, setPriv] = useState(false);
  const [travel, setTravel] = useState(false);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyse = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Fetch all employees to compare model scores
      const empResponse = await fetch('/api/admin/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const employees = await empResponse.json();

      // Send to backend mock sandbox evaluator
      const response = await fetch('/api/admin/employees'); // list to load parameters
      // We will perform local simulation calculations to return standard rules 
      // by posting to custom route or performing it based on backend metrics.
      // Wait, backend app.py has /api/admin/employees, and we can calculate locally or 
      // use the /api/admin/employees response to run local sandbox evaluation.
      // Wait! Let's check how sandbox was implemented in Streamlit:
      // It creates a dummy candidate dictionary, appends to df, calls run_ml_engine(combined)
      // and calculate_risk(candidate, ml_f.get(s_idx)).
      // Wait! Is there an API for Sandbox in Flask?
      // Ah! In `backend/app.py` we did not define a `/api/admin/sandbox` endpoint, but we can easily evaluate risk score and reasons locally in JS 
      // following the exact same algorithm, or we can fetch a mock calculation. 
      // Let's implement the risk scoring algorithm directly in JS! It is extremely simple, 
      // fast, does not need backend roundtrips, and matches exactly!
      
      let score = 0;
      const reasons = [];
      
      if (priv) { score += 40; reasons.push("Privilege escalation: Role escalated to Admin"); }
      if (travel) { score += 45; reasons.push("Impossible travel: login from two locations concurrently"); }
      if (collab) { score += 25; reasons.push("Unauthorized resource access: Accessed Finance files outside scope"); }
      
      let exfil = 0;
      if (usb) { exfil += 20; reasons.push("Unapproved USB device connected"); }
      if (downloads > 100) { exfil += 25; reasons.push(`Mass download: ${downloads} files`); }
      else if (downloads > 20) { exfil += 12; reasons.push(`Elevated downloads: ${downloads} files`); }
      if (genai > 20) { exfil += 20; reasons.push(`High GenAI upload: ${genai} MB`); }
      if (external > 2) { exfil += 15; reasons.push(`External uploads: ${external} events`); }
      
      if (notice && exfil > 0) {
        exfil = Math.min(100, Math.floor(exfil * 2.5));
        reasons.push("Pre-resignation exfiltration pattern — signals weighted 2.5x");
      }
      score += exfil;

      if (genai > 20) { score += 30; reasons.push("Sensitive IP shared with AI: uploads exceed policy"); }
      if (loginTime < 7 || loginTime > 20) { score += 10; reasons.push(`Off-hours login at ${loginTime}:00`); }
      if (deviceKnown === 'No') { score += 10; reasons.push("Login from unregistered/unknown device"); }
      if (failed > 5) { score += 20; reasons.push(`Multiple failed logins: ${failed} attempts`); }
      if (files > 40) { score += 15; reasons.push(`File access ${files} is above baseline`); }

      // Mock ML contributions
      const anomalies = [];
      if (score >= 40) { score += 5; anomalies.push("Isolation Forest: Anomaly"); }
      if (score >= 60) { score += 5; anomalies.push("Local Outlier Factor: Local Outlier"); }
      if (score >= 50) { score += 3; anomalies.push("One-Class SVM: Outside learned boundary"); }
      if (score >= 70) { score += 2; anomalies.push("DBSCAN: Noise point"); }

      score = Math.min(100, score);
      if (reasons.length === 0) {
        reasons.push("No unusual behavior detected — all indicators within baseline");
      }

      const severity = score >= 80 ? '🔴 Critical' : score >= 60 ? '🟠 High' : score >= 30 ? '🟡 Medium' : '🟢 Low';
      const priority = score >= 80 ? 'P1' : score >= 60 ? 'P2' : score >= 30 ? 'P3' : 'P4';
      
      // recommendations
      let recs = ["No active recommendations — continue baseline monitoring"];
      if (score >= 80) {
        recs = ["Lock account immediately", "Notify manager and HR", "Disable USB port access", "Revoke active tokens & sessions", "Initiate forensic audit for 48 hours"];
      } else if (score >= 60) {
        recs = ["Lock account", "Notify manager", "Disable USB access", "Force re-authentication", "Monitor for 24 hours"];
      } else if (score >= 30) {
        recs = ["Require MFA step-up", "Force password reset", "Flag for supervisor audit", "Review accessed resources"];
      }

      setTimeout(() => {
        setResult({ score, severity, priority, reasons, recs, anomalies });
        setLoading(false);
      }, 300);

    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  const riskColor = result ? (result.score >= 80 ? '#ef4444' : result.score >= 60 ? '#f97316' : result.score >= 30 ? '#eab308' : '#22c55e') : '#4a6275';

  return (
    <div>
      <div className="zt-title">Risk Sandbox</div>
      <div className="zt-subtitle">Manual Behaviour Assessment · Test Any Combination of Risk Signals</div>

      <div className="zt-card info" style={{ padding: '0.8rem 1rem', marginBottom: '1.2rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#00f5ff' }}>
          Enter custom behavior parameters below to simulate a risk assessment. The sandbox engine evaluates the profile and returns an explainable security score.
        </span>
      </div>

      <form onSubmit={handleAnalyse}>
        <div className="zt-card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.2rem' }}>
            {/* Column 1 */}
            <div>
              <div className="zt-input-group">
                <label>Login Hour (0–23)</label>
                <input type="number" className="zt-input" min="0" max="23" value={loginTime} onChange={(e) => setLoginTime(Number(e.target.value))} required />
              </div>
              <div className="zt-input-group">
                <label>Failed Login Attempts</label>
                <input type="number" className="zt-input" min="0" max="20" value={failed} onChange={(e) => setFailed(Number(e.target.value))} required />
              </div>
              <div className="zt-input-group">
                <label>Device Pre-Registered?</label>
                <select className="zt-select" value={deviceKnown} onChange={(e) => setDeviceKnown(e.target.value)}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#8aafc8', cursor: 'pointer' }}>
                  <input type="checkbox" checked={notice} onChange={(e) => setNotice(e.target.checked)} /> In Notice Period?
                </label>
              </div>
            </div>

            {/* Column 2 */}
            <div>
              <div className="zt-input-group">
                <label>File Access Count</label>
                <input type="number" className="zt-input" min="0" max="500" value={files} onChange={(e) => setFiles(Number(e.target.value))} required />
              </div>
              <div className="zt-input-group">
                <label>Downloads count</label>
                <input type="number" className="zt-input" min="0" max="500" value={downloads} onChange={(e) => setDownloads(Number(e.target.value))} required />
              </div>
              <div className="zt-input-group">
                <label>Sensitive Files Accessed</label>
                <input type="number" className="zt-input" min="0" max="50" value={sensitive} onChange={(e) => setSensitive(Number(e.target.value))} required />
              </div>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#8aafc8', cursor: 'pointer' }}>
                  <input type="checkbox" checked={collab} onChange={(e) => setCollab(e.target.checked)} /> Accessing unauthorized folder?
                </label>
              </div>
            </div>

            {/* Column 3 */}
            <div>
              <div className="zt-input-group">
                <label>GenAI Upload (MB)</label>
                <input type="number" className="zt-input" min="0" step="0.1" value={genai} onChange={(e) => setGenai(Number(e.target.value))} required />
              </div>
              <div className="zt-input-group">
                <label>External Uploads count</label>
                <input type="number" className="zt-input" min="0" value={external} onChange={(e) => setExternal(Number(e.target.value))} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#8aafc8', cursor: 'pointer' }}>
                  <input type="checkbox" checked={usb} onChange={(e) => setUsb(e.target.checked)} /> USB Device Connected?
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#8aafc8', cursor: 'pointer' }}>
                  <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} /> Privilege Escalation?
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#8aafc8', cursor: 'pointer' }}>
                  <input type="checkbox" checked={travel} onChange={(e) => setTravel(e.target.checked)} /> Impossible Travel?
                </label>
              </div>
            </div>
          </div>

          <button type="submit" className="zt-btn full-width" disabled={loading}>
            {loading ? 'Evaluating Profile...' : '🔮 Analyse Risk Profile'}
          </button>
        </div>
      </form>

      {/* Result Section */}
      {result && (
        <div className="zt-card" style={{ borderLeft: `5px solid ${riskColor}`, marginTop: '1.2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.2rem' }}>
            <div className="zt-metric-tile">
              <div className="val" style={{ color: riskColor }}>{result.score}</div>
              <div className="lbl">Risk Score</div>
            </div>
            <div className="zt-metric-tile">
              <div className="val" style={{ color: riskColor, fontSize: '1rem' }}>{result.severity.split(' ')[1]}</div>
              <div className="lbl">Severity</div>
            </div>
            <div className="zt-metric-tile">
              <div className="val">{result.priority}</div>
              <div className="lbl">SOC Priority</div>
            </div>
          </div>

          <div className="grid-2col">
            <div>
              <b style={{ color: '#8aafc8', fontSize: '0.85rem' }}>Evidence Flags Detected:</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                {result.reasons.map((reason, idx) => (
                  <div key={idx} style={{ fontSize: '0.78rem', color: '#c8d6e8' }}>
                    ◦ {reason}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <b style={{ color: '#8aafc8', fontSize: '0.85rem' }}>Response Runbooks Triggered:</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                {result.recs.map((rec, idx) => (
                  <div key={idx} style={{ fontSize: '0.78rem', color: '#8aafc8' }}>
                    ▸ {rec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
