import React, { useState, useEffect } from 'react';
import { Shield, Clock, AlertTriangle, Activity, FileText, Upload, Download, Key, Cpu, ExternalLink, Lock, CheckCircle2 } from 'lucide-react';

export default function EmployeeDashboard({ token, user, onPageChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionAlert, setActionAlert] = useState({ type: '', msg: '' });

  // File Access & Step-Up MFA Modal State
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState('Q3_Strategic_Roadmap.pdf');
  const [fileClassification, setFileClassification] = useState('Confidential');
  const [fileOp, setFileOp] = useState('Download');
  const [fileLogs, setFileLogs] = useState([]);

  const [showStepUpModal, setShowStepUpModal] = useState(false);
  const [stepUpOtp, setStepUpOtp] = useState('123456');

  const fetchDashboardData = async () => {
    try {
      const [dashRes, fileRes] = await Promise.all([
        fetch('/api/employee/dashboard', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/employee/file-access/history', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const resData = await dashRes.json();
      const fileData = await fileRes.json();

      if (!dashRes.ok) throw new Error(resData.error || 'Failed to load dashboard data');
      setData(resData);
      setFileLogs(fileData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const handleQuickAction = async (actionType) => {
    setActionLoading(true);
    setActionAlert({ type: '', msg: '' });
    try {
      const response = await fetch('/api/employee/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: actionType })
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Action failed');

      if (res.warning) {
        setActionAlert({ type: 'warning', msg: res.warning });
      } else {
        setActionAlert({ type: 'success', msg: 'Action performed and logged successfully to immutable audit trail.' });
      }
      
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileAccessSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionAlert({ type: '', msg: '' });

    try {
      const res = await fetch('/api/employee/file-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filename: selectedFile,
          classification: fileClassification,
          operation: fileOp,
          file_size_mb: fileClassification === 'Secret' ? 12.4 : 2.5
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'File operation failed');

      if (resData.is_flagged) {
        setShowStepUpModal(true);
      }

      setActionAlert({ type: resData.is_flagged ? 'warning' : 'success', msg: resData.message });
      setShowFileModal(false);
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyStepUp = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/stepup-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp_code: stepUpOtp })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Step-Up Verification failed');

      setActionAlert({ type: 'success', msg: '✅ Step-Up MFA Verified! File access authorized.' });
      setShowStepUpModal(false);
      fetchDashboardData();
    } catch (err) {
      alert(`Verification Error: ${err.message}`);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: '#00f5ff' }}>Loading Continuous Portal Session...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;
  }

  const { risk_score, severity, exfil_probability, timeline, reasons, recommendations, stats, recent_audit, baseline } = data;
  const riskColor = risk_score >= 80 ? '#ef4444' : risk_score >= 60 ? '#f97316' : risk_score >= 30 ? '#eab308' : '#22c55e';
  const badgeClass = risk_score >= 80 ? 'bc' : risk_score >= 60 ? 'bh' : risk_score >= 30 ? 'bm' : 'bl';

  return (
    <div>
      <div className="zt-title">Employee Zero Trust Portal: {user.name}</div>
      <div className="zt-subtitle">{user.department} · {user.emp_type} · Continuous Session Authentication Active</div>

      {/* Continuous Auth & Device Trust Banner */}
      <div className="zt-card" style={{
        padding: '0.85rem 1.2rem',
        marginBottom: '1rem',
        background: 'rgba(59, 130, 246, 0.06)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.8rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CheckCircle2 size={20} color="#3b82f6" />
          <div>
            <div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.88rem' }}>
              Continuous User Authentication & Session Health
            </div>
            <div style={{ fontSize: '0.75rem', color: '#93c5fd' }}>
              Session ID: {user.session_id ? user.session_id.substring(0, 12) : 'active'}... · Device Trust: <strong>Trusted (BitLocker Encrypted)</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="zt-btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }} onClick={() => setShowFileModal(true)}>
            📂 File Access Monitor
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="metrics-grid">
        <div className="zt-metric-tile">
          <div className={`val ${risk_score >= 80 ? 'critical' : risk_score >= 60 ? 'high' : risk_score >= 30 ? 'medium' : 'safe'}`}>
            {risk_score}/100
          </div>
          <div className="lbl">Risk Score</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val">{stats.total_events}</div>
          <div className="lbl">My Audit Events</div>
        </div>
        <div className="zt-metric-tile">
          <div className={`val ${stats.suspicious_events > 0 ? 'critical' : 'safe'}`}>
            {stats.suspicious_events}
          </div>
          <div className="lbl">Suspicious Flags</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val">{stats.active_sessions}</div>
          <div className="lbl">Active Sessions</div>
        </div>
      </div>

      {/* Action alerts */}
      {actionAlert.msg && (
        <div className={`zt-card ${actionAlert.type === 'error' ? 'critical' : actionAlert.type === 'warning' ? 'high' : 'low'}`} style={{ marginBottom: '1.2rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            {actionAlert.type === 'error' ? '❌ Action Error' : actionAlert.type === 'warning' ? '⚠ Policy Warning' : '✅ Success'}
          </div>
          <div style={{ fontSize: '0.84rem', marginTop: '4px' }}>{actionAlert.msg}</div>
        </div>
      )}

      <div className="grid-2col">
        {/* Left column: Quick Actions */}
        <div>
          <div className="zt-section-title">
            <Activity size={18} /> Continuous Session Actions
          </div>
          <div className="zt-card">
            <p style={{ fontSize: '0.8rem', color: '#4a6275', marginBottom: '1.2rem' }}>
              Perform actions below. Every action is registered in real-time, checked against Zero Trust policy rules, and evaluated by the ML UEBA engine.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
              <button className="zt-btn" onClick={() => handleQuickAction('access_hr')} disabled={actionLoading}>
                <FileText size={15} /> Access HR Portal
              </button>
              <button className="zt-btn" onClick={() => handleQuickAction('access_payroll')} disabled={actionLoading}>
                <FileText size={15} /> Access Payroll System
              </button>
              <button className="zt-btn" onClick={() => handleQuickAction('access_finance')} disabled={actionLoading}>
                <FileText size={15} /> Access Finance Dashboard
              </button>
              <button className="zt-btn" onClick={() => handleQuickAction('download_report')} disabled={actionLoading}>
                <Download size={15} /> Download Q2 Report
              </button>
              <button className="zt-btn" onClick={() => handleQuickAction('upload_doc')} disabled={actionLoading}>
                <Upload size={15} /> Upload Project Document
              </button>
              <button className="zt-btn" onClick={() => handleQuickAction('use_ai')} disabled={actionLoading}>
                <Cpu size={15} /> Use GenAI Tool (ChatGPT)
              </button>
              <button className="zt-btn" onClick={() => handleQuickAction('insert_usb')} disabled={actionLoading}>
                <ExternalLink size={15} /> Connect External USB
              </button>
              <button className="zt-btn" onClick={() => handleQuickAction('export_data')} disabled={actionLoading}>
                <Download size={15} /> Export Client Records
              </button>
              <button className="zt-btn" onClick={() => handleQuickAction('change_pwd')} disabled={actionLoading}>
                <Key size={15} /> Change Account Password
              </button>
            </div>
          </div>

          <div className="zt-section-title">
            <Clock size={18} /> Recent File Operations & Audit Trail
          </div>
          <div className="zt-card">
            <div className="zt-table-container">
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Classification</th>
                    <th>Operation</th>
                    <th>Policy Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {fileLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ color: '#4a6275', textAlign: 'center' }}>No file operations logged yet. Use File Access Monitor to test.</td>
                    </tr>
                  ) : (
                    fileLogs.map((f, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold', fontSize: '0.82rem' }}>{f.filename}</td>
                        <td>
                          <span className={`zt-badge ${f.classification === 'Secret' || f.classification === 'Restricted' ? 'bc' : f.classification === 'Confidential' ? 'bm' : 'bl'}`}>
                            {f.classification}
                          </span>
                        </td>
                        <td>{f.operation}</td>
                        <td style={{ fontSize: '0.78rem', color: f.is_flagged ? '#ef4444' : '#22c55e' }}>{f.policy_action}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Security status */}
        <div>
          <div className="zt-section-title">
            <Shield size={18} /> Continuous Security Context & Baseline Comparison
          </div>
          <div className="zt-card" style={{ borderLeft: `4px solid ${riskColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#00f5ff', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                Real-Time Risk Profile
              </div>
              <span className={`zt-badge ${badgeClass}`}>{severity.replace(/[^\w\s]/g, '').trim()}</span>
            </div>

            <div className="rb-wrap" style={{ marginBottom: '1rem' }}>
              <div className="rb-label">
                <span>Dynamic Behavior Score</span>
                <span style={{ fontWeight: 'bold' }}>{risk_score}/100</span>
              </div>
              <div className="rb-track">
                <div className="rb-fill" style={{ width: `${risk_score}%`, backgroundColor: riskColor }}></div>
              </div>
            </div>

            {reasons.length > 0 && (
              <div>
                <div style={{ fontSize: '0.72rem', color: '#4a6275', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Risk Impact Factors:
                </div>
                {reasons.map((r, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: '#8aafc8', marginBottom: '4px' }}>
                    ▸ {r}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Access Modal */}
      {showFileModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="zt-card" style={{ maxWidth: '440px', width: '90%', padding: '1.5rem' }}>
            <div className="zt-section-title" style={{ marginTop: 0 }}>
              📂 File Access Monitor & Zero Trust Policy Test
            </div>
            
            <form onSubmit={handleFileAccessSubmit}>
              <div className="zt-input-group">
                <label>Select Document</label>
                <select 
                  className="zt-select" 
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                >
                  <option value="Q3_Strategic_Roadmap.pdf">Q3_Strategic_Roadmap.pdf</option>
                  <option value="Payroll_Master_Q2.xlsx">Payroll_Master_Q2.xlsx</option>
                  <option value="SourceCode_CoreAlgorithm.zip">SourceCode_CoreAlgorithm.zip</option>
                  <option value="Public_Press_Release.docx">Public_Press_Release.docx</option>
                </select>
              </div>

              <div className="zt-input-group">
                <label>Data Sensitivity Classification</label>
                <select 
                  className="zt-select" 
                  value={fileClassification}
                  onChange={(e) => setFileClassification(e.target.value)}
                >
                  <option value="Public">Public</option>
                  <option value="Internal">Internal</option>
                  <option value="Confidential">Confidential</option>
                  <option value="Secret">Secret (Restricted Scope)</option>
                </select>
              </div>

              <div className="zt-input-group">
                <label>Operation Action</label>
                <select 
                  className="zt-select" 
                  value={fileOp}
                  onChange={(e) => setFileOp(e.target.value)}
                >
                  <option value="View">View Document</option>
                  <option value="Download">Download File</option>
                  <option value="Upload">Upload File</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
                <button type="submit" className="zt-btn full-width" disabled={actionLoading}>
                  {actionLoading ? 'Processing...' : 'Execute File Operation'}
                </button>
                <button type="button" className="zt-btn zt-btn-sec" onClick={() => setShowFileModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step-Up MFA Challenge Modal */}
      {showStepUpModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1001
        }}>
          <div className="zt-card" style={{ maxWidth: '420px', width: '90%', padding: '1.5rem', border: '1px solid #f59e0b' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <Lock size={32} color="#f59e0b" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f59e0b' }}>
                Step-Up MFA Required
              </div>
              <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginTop: '4px' }}>
                Accessing <strong>{selectedFile} [{fileClassification}]</strong> requires step-up re-authentication under Zero Trust Policy.
              </div>
            </div>

            <form onSubmit={handleVerifyStepUp}>
              <div className="zt-input-group">
                <label>Input 6-Digit Step-Up Code</label>
                <input 
                  type="text" 
                  className="zt-input" 
                  value={stepUpOtp}
                  onChange={(e) => setStepUpOtp(e.target.value)}
                  style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '4px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" className="zt-btn full-width" style={{ background: '#f59e0b', color: '#000' }}>
                  Authorize Step-Up Access
                </button>
                <button type="button" className="zt-btn zt-btn-sec" onClick={() => setShowStepUpModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
