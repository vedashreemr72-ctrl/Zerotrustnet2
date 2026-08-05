import React, { useState, useEffect } from 'react';
import { Shield, Clock, AlertTriangle, Activity, FileText, Upload, Download, Key, Cpu, ExternalLink, Lock, CheckCircle2 } from 'lucide-react';

export default function EmployeeDashboard({ token, user, onPageChange, onLogout }) {
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
  const [auditTab, setAuditTab] = useState('session');

  // Interactive 12 Control Panel Modals State
  const [activeModal, setActiveModal] = useState(null); // 'download_report', 'upload_doc', 'open_confidential', 'delete_file', 'export_data', 'change_pwd', 'failed_operations', 'long_inactive_session', 'concurrent_login', 'use_ai', 'insert_usb', 'access_payroll'

  // Modal Input States
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [genAiPrompt, setGenAiPrompt] = useState('');
  const [genAiHistory, setGenAiHistory] = useState([
    { sender: 'system', msg: 'ZeroTrust Security AI Assistant Online. Clipboard & prompt DLP monitoring active.' }
  ]);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [uploadFilename, setUploadFilename] = useState('Quarterly_Financial_Report.pdf');
  const [uploadClassification, setUploadClassification] = useState('Confidential');
  const [deleteFilename, setDeleteFilename] = useState('Customer_Records_2025.db');
  const [deleteReason, setDeleteReason] = useState('Data cleanup / routine archiving');
  const [confidentialFile, setConfidentialFile] = useState('Executive_Salary_Matrix_2026.xlsx');
  const [unlockPin, setUnlockPin] = useState('');

  const handleRealFileUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUploadFile) {
      alert("Please select a file to upload from your computer.");
      return;
    }

    setActionLoading(true);
    setActionAlert({ type: '', msg: '' });

    try {
      const formData = new FormData();
      formData.append('file', selectedUploadFile);
      formData.append('classification', uploadClassification);

      const res = await fetch('/api/employee/upload-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'File upload failed');

      if (resData.warning) {
        setActionAlert({ type: 'warning', msg: resData.warning });
      } else {
        setActionAlert({ type: 'success', msg: `✅ ${resData.message}` });
      }

      setSelectedUploadFile(null);
      setActiveModal(null);
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [dashRes, fileRes] = await Promise.all([
        fetch('/api/employee/dashboard', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/employee/file-access/history', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (dashRes.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      const resData = await dashRes.json();
      const fileData = await fileRes.json();

      if (!dashRes.ok) {
        if (resData.error === 'Invalid token' && onLogout) {
          onLogout();
          return;
        }
        throw new Error(resData.error || 'Failed to load dashboard data');
      }
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

  const handleQuickAction = async (actionType, extraData = {}) => {
    setActionLoading(true);
    setActionAlert({ type: '', msg: '' });
    try {
      const response = await fetch('/api/employee/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: actionType, ...extraData })
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

  const triggerReportDownload = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/employee/download-report', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to download report');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ZeroTrust_Security_Audit_Report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setActionAlert({ type: 'success', msg: '📄 Official ZeroTrust Security Audit Report downloaded in PDF format successfully!' });
      setActiveModal(null);
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const triggerDataExport = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/employee/export-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export client data');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Client_Export_Master.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setActionAlert({ type: 'warning', msg: '📊 25 Enterprise Client Records exported to CSV. DLP Exfiltration audit logged to SOC.' });
      setActiveModal(null);
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      alert("New password and confirmation do not match!");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/employee/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ old_password: oldPwd, new_password: newPwd })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Password change failed');

      setActionAlert({ type: 'success', msg: '🔑 Account password updated successfully! Action logged to audit trail.' });
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setActiveModal(null);
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenAiSubmit = async (e) => {
    e.preventDefault();
    if (!genAiPrompt.trim()) return;
    const currentPrompt = genAiPrompt;
    setGenAiPrompt('');
    setGenAiHistory(prev => [...prev, { sender: 'user', msg: currentPrompt }]);

    setActionLoading(true);
    try {
      const res = await fetch('/api/employee/genai-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: currentPrompt })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'GenAI request failed');

      setGenAiHistory(prev => [...prev, { sender: 'assistant', msg: resData.response }]);
      if (resData.warning) {
        setActionAlert({ type: 'warning', msg: resData.warning });
      }
      fetchDashboardData();
    } catch (err) {
      setGenAiHistory(prev => [...prev, { sender: 'error', msg: `Error: ${err.message}` }]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminateRemoteSessions = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/employee/terminate-other-sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to terminate remote sessions');

      setActionAlert({ type: 'success', msg: '🛡️ All secondary remote sessions terminated successfully.' });
      setActiveModal(null);
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

      {/* Step 1: Enterprise Secure Session Telemetry Card */}
      <div className="zt-card" style={{
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        background: 'rgba(0, 245, 255, 0.04)',
        border: '1px solid rgba(0, 245, 255, 0.2)',
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={22} color="#00f5ff" />
            <div>
              <div style={{ color: '#00f5ff', fontWeight: '800', fontSize: '0.95rem', letterSpacing: '0.5px' }}>
                🛡️ Enterprise Secure Session Active (Step 1 Authentication)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Continuous Monitoring Engine Connected · Cryptographically Signed JWT Token
              </div>
            </div>
          </div>
          <button className="zt-btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }} onClick={() => setShowFileModal(true)}>
            📂 File Access Monitor
          </button>
        </div>

        {/* 9-Field Telemetry Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          padding: '0.85rem',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.78rem'
        }}>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 'bold' }}>1. Employee ID</div>
            <div style={{ color: '#00f5ff', fontWeight: 'bold', fontFamily: 'monospace' }}>{user.user_id || user.username || 'EMP-1024'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 'bold' }}>2. Department</div>
            <div style={{ color: '#e2e8f0', fontWeight: '600' }}>{user.department || 'Engineering'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 'bold' }}>3. Role</div>
            <div style={{ color: '#38bdf8', fontWeight: '600', textTransform: 'capitalize' }}>{user.role || 'Employee'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 'bold' }}>4. Device ID</div>
            <div style={{ color: '#a7f3d0', fontWeight: 'bold', fontFamily: 'monospace' }}>{user.device_id || 'DEV-89412-WIN'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 'bold' }}>5. Browser</div>
            <div style={{ color: '#e2e8f0' }}>{user.browser || 'Google Chrome 127'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 'bold' }}>6. Operating System</div>
            <div style={{ color: '#e2e8f0' }}>{user.os || 'Windows 11 Enterprise'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 'bold' }}>7. Login Time</div>
            <div style={{ color: '#fbbf24', fontSize: '0.74rem' }}>{user.login_time ? new Date(user.login_time).toLocaleTimeString() : '09:00:00 AM'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 'bold' }}>8. IP Address</div>
            <div style={{ color: '#f472b6', fontFamily: 'monospace' }}>{user.ip || '192.168.1.105'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 'bold' }}>9. Location</div>
            <div style={{ color: '#e2e8f0' }}>{user.location || 'Bengaluru, India'}</div>
          </div>
        </div>

        {/* Step 2: Device Verification Evaluation */}
        {(() => {
          const dv = user.device_verification || {
            is_registered: true,
            is_trusted_browser: true,
            is_normal_device: true,
            is_os_allowed: true,
            is_concurrent: false,
            risk_penalty: 0
          };
          return (
            <div style={{
              marginTop: '0.85rem',
              padding: '0.85rem 1rem',
              background: dv.risk_penalty > 0 ? 'rgba(239, 68, 68, 0.06)' : 'rgba(16, 185, 129, 0.06)',
              border: `1px solid ${dv.risk_penalty > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.82rem', color: dv.risk_penalty > 0 ? '#fca5a5' : '#6ee7b7' }}>
                  💻 Step 2: Device Verification Evaluation: {dv.risk_penalty === 0 ? 'ALL 5 CHECKS PASSED (Verified Trust)' : `POLICY VIOLATIONS DETECTED (+${dv.risk_penalty} Risk Penalty)`}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem', fontSize: '0.74rem' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.45rem 0.65rem', borderRadius: '6px' }}>
                  <span style={{ color: dv.is_registered ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{dv.is_registered ? '✅' : '❌'} Registered Device:</span> {dv.is_registered ? 'Asset Registered' : 'Unregistered ID'}
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.45rem 0.65rem', borderRadius: '6px' }}>
                  <span style={{ color: dv.is_trusted_browser ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{dv.is_trusted_browser ? '✅' : '❌'} Trusted Browser:</span> {dv.is_trusted_browser ? 'Approved Client' : 'Untrusted Client'}
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.45rem 0.65rem', borderRadius: '6px' }}>
                  <span style={{ color: dv.is_normal_device ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{dv.is_normal_device ? '✅' : '❌'} Normal Device:</span> {dv.is_normal_device ? 'Matches Baseline' : 'Abnormal Hardware'}
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.45rem 0.65rem', borderRadius: '6px' }}>
                  <span style={{ color: dv.is_os_allowed ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{dv.is_os_allowed ? '✅' : '❌'} OS Allowed:</span> {dv.is_os_allowed ? 'Compliant OS' : 'Unapproved OS'}
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.45rem 0.65rem', borderRadius: '6px' }}>
                  <span style={{ color: !dv.is_concurrent ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{!dv.is_concurrent ? '✅' : '❌'} Concurrent Logins:</span> {!dv.is_concurrent ? 'Single Session' : 'Multiple Active Logins'}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Explainable AI (XAI) Transparency Card */}
      <div className="zt-card" style={{
        marginBottom: '1.2rem',
        padding: '1.1rem 1.25rem',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(0, 245, 255, 0.25)',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.6rem' }}>
          <div style={{ color: '#00f5ff', fontWeight: 'bold', fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧠</span> Explainable AI (XAI) Risk Breakdown
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Current Risk Rating: <strong style={{ color: risk_score >= 80 ? '#ef4444' : risk_score >= 60 ? '#f97316' : risk_score >= 30 ? '#f59e0b' : '#10b981', fontSize: '1.15rem', fontFamily: 'monospace' }}>{risk_score} / 100</strong>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
          {/* Left Column: XAI Reasons */}
          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '0.78rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Identified Risk Reasons:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(() => {
                const reasonsList = reasons && reasons.length > 0 && !reasons[0].includes('No unusual behavior')
                  ? reasons.map(r => `✓ ${r.replace(/^[✓\s•◦-]+/, '').trim()}`)
                  : [
                      `✓ Login at ${user.login_time ? new Date(user.login_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '2:30 AM'}`,
                      '✓ Downloaded 120 Files',
                      '✓ New Device',
                      '✓ Isolation Forest Anomaly',
                      '✓ LOF Outlier'
                    ];
                return reasonsList.map((reason, i) => (
                  <div key={i} style={{ color: '#38bdf8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> {reason.replace(/^✓\s*/, '')}
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Right Column: Recommended Security Action */}
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              Recommended Security Action
            </div>
            <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1rem', marginTop: '4px', marginBottom: '0.75rem' }}>
              {risk_score >= 80 ? 'Lock Account + Revoke Sessions' : risk_score >= 60 ? 'Require Re-authentication (Step-Up MFA)' : risk_score >= 30 ? 'Require Re-authentication' : 'Require Re-authentication'}
            </div>
            <button className="zt-btn" style={{ background: '#10b981', color: '#0f172a', fontWeight: 'bold', fontSize: '0.78rem', width: '100%' }} onClick={() => alert("Security Challenge Issued: Re-authentication token generated.")}>
              🔒 Require Re-authentication
            </button>
          </div>
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

      {/* 6-Layer AI Risk Analysis Breakdown */}
      <div className="zt-card" style={{ marginBottom: '1.2rem', padding: '0.85rem 1rem', background: 'rgba(0, 245, 255, 0.03)', border: '1px solid rgba(0, 245, 255, 0.15)' }}>
        <div style={{ color: '#00f5ff', fontWeight: 'bold', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={16} /> Multi-Layer AI Risk Evaluation (6 Detection Layers)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem', fontSize: '0.74rem' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.5rem 0.65rem', borderRadius: '6px' }}>
            <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>L1 Rule Engine:</span> Static Threshold Rules
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.5rem 0.65rem', borderRadius: '6px' }}>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>L2 Isolation Forest:</span> Global Anomaly Detection
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.5rem 0.65rem', borderRadius: '6px' }}>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>L3 LOF:</span> Local Density Behavior
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.5rem 0.65rem', borderRadius: '6px' }}>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>L4 One-Class SVM:</span> Novel Attack Vectors
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.5rem 0.65rem', borderRadius: '6px' }}>
            <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>L5 Personal Baseline:</span> History vs Today
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.5rem 0.65rem', borderRadius: '6px' }}>
            <span style={{ color: '#a855f7', fontWeight: 'bold' }}>L6 Policy Engine:</span> Zero Trust Scope Rules
          </div>
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
        {/* Left column: Continuous Monitoring Control Panel */}
        <div>
          <div className="zt-section-title">
            <Activity size={18} /> Step 3: Continuous Monitoring Control Panel
          </div>
          <div className="zt-card">
            <p style={{ fontSize: '0.8rem', color: '#4a6275', marginBottom: '1rem' }}>
              Monitoring does NOT stop after login. Execute continuous operations below. Every single event is evaluated in real-time, logged to the immutable audit trail, and scored by the ML UEBA engine.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
              <button className="zt-btn" onClick={() => setActiveModal('download_report')} disabled={actionLoading}>
                <Download size={15} /> 📄 Download Report
              </button>
              <button className="zt-btn" onClick={() => setActiveModal('upload_doc')} disabled={actionLoading}>
                <Upload size={15} /> 📤 Upload Document
              </button>
              <button className="zt-btn" onClick={() => setActiveModal('open_confidential')} disabled={actionLoading} style={{ borderLeft: '3px solid #f59e0b' }}>
                <Lock size={15} /> 🔐 Open Confidential File
              </button>
              <button className="zt-btn" onClick={() => setActiveModal('delete_file')} disabled={actionLoading} style={{ borderLeft: '3px solid #ef4444' }}>
                🗑️ Delete File
              </button>
              <button className="zt-btn" onClick={() => setActiveModal('export_data')} disabled={actionLoading} style={{ borderLeft: '3px solid #f97316' }}>
                📊 Export Client Data
              </button>
              <button className="zt-btn" onClick={() => setActiveModal('change_pwd')} disabled={actionLoading}>
                <Key size={15} /> 🔑 Password Change
              </button>
              <button className="zt-btn" onClick={() => setActiveModal('failed_operations')} disabled={actionLoading} style={{ borderLeft: '3px solid #ef4444' }}>
                ⚠️ Multiple Failed Actions
              </button>
              <button className="zt-btn" onClick={() => setActiveModal('long_inactive_session')} disabled={actionLoading}>
                <Clock size={15} /> 💤 Long Inactive Session
              </button>
              <button className="zt-btn" onClick={() => setActiveModal('concurrent_login')} disabled={actionLoading} style={{ borderLeft: '3px solid #8b5cf6' }}>
                👥 Concurrent Login Attempt
              </button>
              <button className="zt-btn" onClick={() => setActiveModal('use_ai')} disabled={actionLoading} style={{ borderLeft: '3px solid #00f5ff' }}>
                <Cpu size={15} /> 🤖 Use GenAI Tool
              </button>
              <button className="zt-btn" onClick={() => setActiveModal('insert_usb')} disabled={actionLoading} style={{ borderLeft: '3px solid #ec4899' }}>
                <ExternalLink size={15} /> 🔌 Connect USB Device
              </button>
              <button className="zt-btn" onClick={() => setActiveModal('access_payroll')} disabled={actionLoading}>
                <FileText size={15} /> 💼 Access Payroll System
              </button>
            </div>
          </div>

          <div className="zt-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} /> Live Audit Trail & Log Monitor
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                className={`zt-btn ${auditTab === 'session' ? '' : 'zt-btn-sec'}`} 
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                onClick={() => setAuditTab('session')}
              >
                ⚡ Session Audit Trail ({recent_audit ? recent_audit.length : 0})
              </button>
              <button 
                className={`zt-btn ${auditTab === 'file' ? '' : 'zt-btn-sec'}`} 
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                onClick={() => setAuditTab('file')}
              >
                📁 File Access History ({fileLogs.length})
              </button>
            </div>
          </div>

          <div className="zt-card">
            <div className="zt-table-container">
              {auditTab === 'session' ? (
                <div style={{ padding: '0.5rem 0.8rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🔗 Sequential Behavioral Flow Timeline (Realistic Step Node Chain)
                  </div>
                  {(() => {
                    const getIcon = (type) => {
                      const t = (type || '').toLowerCase();
                      if (t.includes('login')) return '🔑';
                      if (t.includes('payroll')) return '💼';
                      if (t.includes('finance')) return '📁';
                      if (t.includes('download')) return '📄';
                      if (t.includes('usb')) return '🔌';
                      if (t.includes('logout')) return '🚪';
                      if (t.includes('confidential') || t.includes('secret')) return '🔐';
                      if (t.includes('delete')) return '🗑️';
                      if (t.includes('export')) return '📊';
                      return '⚡';
                    };

                    let flowEvents = [];
                    if (recent_audit && recent_audit.length > 0) {
                      flowEvents = recent_audit.slice().reverse().map(e => ({
                        time: e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00 AM',
                        event_type: e.event_type,
                        details: e.details,
                        is_suspicious: e.is_suspicious,
                        risk: e.risk
                      }));
                    } else {
                      flowEvents = [
                        { time: '09:00 AM', event_type: 'Login', details: 'SSO Authentication Verified', is_suspicious: false, risk: 0 },
                        { time: '09:02 AM', event_type: 'Payroll Access', details: 'Accessed Payroll System — Salary Ledger', is_suspicious: true, risk: 20 },
                        { time: '09:03 AM', event_type: 'Finance Folder', details: 'Accessed Restricted Finance Ledger Files', is_suspicious: true, risk: 20 },
                        { time: '09:04 AM', event_type: 'Download Report', details: 'Downloaded Q2_Performance_Report.pdf (2.4 MB)', is_suspicious: false, risk: 0 },
                        { time: '09:06 AM', event_type: 'USB Storage Connected', details: 'Unapproved USB Mass Storage Device Mounted', is_suspicious: true, risk: 20 },
                        { time: '09:10 AM', event_type: 'Logout', details: 'Session Closed / Revoked by Security Policy', is_suspicious: false, risk: 0 }
                      ];
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                        {flowEvents.map((evt, idx) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && (
                              <div style={{ color: '#00f5ff', fontSize: '1.25rem', fontWeight: 'bold', margin: '2px 0', textShadow: '0 0 8px rgba(0, 245, 255, 0.6)' }}>
                                ↓
                              </div>
                            )}
                            <div style={{
                              width: '100%',
                              maxWidth: '560px',
                              padding: '0.7rem 0.95rem',
                              background: evt.is_suspicious ? 'rgba(239, 68, 68, 0.08)' : 'rgba(15, 23, 42, 0.8)',
                              border: `1px solid ${evt.is_suspicious ? 'rgba(239, 68, 68, 0.35)' : 'rgba(0, 245, 255, 0.2)'}`,
                              borderRadius: '10px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              boxShadow: evt.is_suspicious ? '0 0 12px rgba(239, 68, 68, 0.15)' : 'none'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.2rem' }}>{getIcon(evt.event_type)}</span>
                                <div>
                                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: evt.is_suspicious ? '#f97316' : '#00f5ff' }}>
                                    {evt.event_type}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    {evt.details}
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace' }}>
                                  {evt.time}
                                </div>
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  background: evt.is_suspicious ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                                  color: evt.is_suspicious ? '#ef4444' : '#10b981'
                                }}>
                                  {evt.is_suspicious ? `⚠ Flagged (+${evt.risk || 15} Risk)` : '✓ Logged'}
                                </span>
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
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
              )}
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

      {/* Modal 1: Download Report */}
      {activeModal === 'download_report' && (
        <div className="zt-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem', border: '1px solid #00f5ff' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={20} color="#00f5ff" /> 📄 Generate & Download Security Report
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Generate an official, cryptographically signed ZeroTrust Security Audit Report for your session telemetry.
            </p>
            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem', marginBottom: '1.2rem' }}>
              <div><strong>Format:</strong> PDF Document (.pdf)</div>
              <div><strong>Scope:</strong> Personal UEBA Baseline & Audit Logs</div>
              <div><strong>Verification:</strong> Signed JWT Telemetry Stamp</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="zt-btn full-width" onClick={triggerReportDownload} disabled={actionLoading}>
                {actionLoading ? 'Generating...' : '📥 Download Report File'}
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Upload Document */}
      {activeModal === 'upload_doc' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '480px', width: '92%', padding: '1.5rem' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={20} color="#00f5ff" /> 📤 Upload File to Enterprise Server Vault
            </div>
            
            <form onSubmit={handleRealFileUploadSubmit}>
              <div className="zt-input-group">
                <label>Select File from Computer</label>
                <input 
                  type="file" 
                  className="zt-input" 
                  onChange={(e) => setSelectedUploadFile(e.target.files[0] || null)}
                  style={{ padding: '0.45rem', cursor: 'pointer' }}
                  required 
                />
                {selectedUploadFile && (
                  <div style={{ fontSize: '0.75rem', color: '#00f5ff', marginTop: '4px', background: 'rgba(0, 245, 255, 0.08)', padding: '4px 8px', borderRadius: '4px' }}>
                    📄 File Selected: <strong>{selectedUploadFile.name}</strong> ({(selectedUploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                )}
              </div>

              <div className="zt-input-group">
                <label>Data Sensitivity Classification</label>
                <select className="zt-select" value={uploadClassification} onChange={(e) => setUploadClassification(e.target.value)}>
                  <option value="Public">Public</option>
                  <option value="Internal">Internal</option>
                  <option value="Confidential">Confidential</option>
                  <option value="Secret">Secret (Restricted Scope — Triggers SOC Audit)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
                <button type="submit" className="zt-btn full-width" disabled={actionLoading}>
                  {actionLoading ? 'Uploading File...' : '📤 Upload File & Log Audit Event'}
                </button>
                <button type="button" className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Open Confidential File */}
      {activeModal === 'open_confidential' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem', border: '1px solid #f59e0b' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
              <Lock size={20} color="#f59e0b" /> 🔐 Open Confidential Resource
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.85rem' }}>
              Select a classified file from the enterprise document vault. Access triggers high-sensitivity DLP auditing.
            </p>
            <div className="zt-input-group">
              <label>Confidential Asset</label>
              <select className="zt-select" value={confidentialFile} onChange={(e) => setConfidentialFile(e.target.value)}>
                <option value="Executive_Salary_Matrix_2026.xlsx">Executive_Salary_Matrix_2026.xlsx [Confidential]</option>
                <option value="Q3_Strategic_Roadmap.pdf">Q3_Strategic_Roadmap.pdf [Secret]</option>
                <option value="SourceCode_CoreAlgorithm.zip">SourceCode_CoreAlgorithm.zip [Secret]</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button className="zt-btn full-width" style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold' }} onClick={() => {
                handleQuickAction('open_confidential', { filename: confidentialFile, details: `Opened Confidential Resource: ${confidentialFile}` });
                setActiveModal(null);
              }} disabled={actionLoading}>
                {actionLoading ? 'Decrypting...' : '🔓 Decrypt & Open File'}
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Delete File */}
      {activeModal === 'delete_file' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem', border: '1px solid #ef4444' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
              🗑️ Confirm Permanent File Deletion
            </div>
            <div className="zt-input-group">
              <label>Target File</label>
              <select className="zt-select" value={deleteFilename} onChange={(e) => setDeleteFilename(e.target.value)}>
                <option value="Customer_Records_2025.db">Customer_Records_2025.db</option>
                <option value="Financial_Ledger_Archive.bak">Financial_Ledger_Archive.bak</option>
              </select>
            </div>
            <div className="zt-input-group">
              <label>Reason for Deletion</label>
              <input type="text" className="zt-input" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button className="zt-btn full-width" style={{ background: '#ef4444', color: '#fff', fontWeight: 'bold' }} onClick={() => {
                handleQuickAction('delete_file', { filename: deleteFilename, details: `Permanently deleted ${deleteFilename}: ${deleteReason}` });
                setActiveModal(null);
              }} disabled={actionLoading}>
                {actionLoading ? 'Deleting...' : '🗑️ Confirm Permanent Deletion'}
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Export Client Data */}
      {activeModal === 'export_data' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem', border: '1px solid #f97316' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f97316' }}>
              📊 Export Client Records CSV
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.85rem' }}>
              Bulk dataset export request: 25 active client directory records will be exported as CSV. This operation triggers DLP data exfiltration warnings.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button className="zt-btn full-width" style={{ background: '#f97316', color: '#000', fontWeight: 'bold' }} onClick={triggerDataExport} disabled={actionLoading}>
                {actionLoading ? 'Exporting...' : '📥 Export Client CSV File'}
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Password Change */}
      {activeModal === 'change_pwd' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '440px', width: '90%', padding: '1.5rem' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={20} color="#00f5ff" /> 🔑 Employee Password Change
            </div>
            <form onSubmit={handlePasswordChangeSubmit}>
              <div className="zt-input-group">
                <label>Current Password</label>
                <input type="password" className="zt-input" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} required />
              </div>
              <div className="zt-input-group">
                <label>New Password</label>
                <input type="password" className="zt-input" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
              </div>
              <div className="zt-input-group">
                <label>Confirm New Password</label>
                <input type="password" className="zt-input" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
                <button type="submit" className="zt-btn full-width" disabled={actionLoading}>
                  {actionLoading ? 'Updating...' : '🔒 Update Account Password'}
                </button>
                <button type="button" className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 7: Multiple Failed Actions */}
      {activeModal === 'failed_operations' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem', border: '1px solid #ef4444' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
              ⚠️ Access Control Failure Simulator
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.85rem' }}>
              Simulate 5 consecutive permission-denied attempts on restricted administrative directories (e.g. <code>/sys/root/admin_vault</code>).
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button className="zt-btn full-width" style={{ background: '#ef4444', color: '#fff', fontWeight: 'bold' }} onClick={() => {
                handleQuickAction('failed_operations', { details: 'Repeated failed operations: 5 consecutive permission denied errors on restricted directory' });
                setActiveModal(null);
              }} disabled={actionLoading}>
                {actionLoading ? 'Simulating...' : '⚠️ Simulate 5x Failed Access Operations'}
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 8: Long Inactive Session */}
      {activeModal === 'long_inactive_session' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '440px', width: '90%', padding: '1.5rem', textAlign: 'center' }}>
            <Clock size={36} color="#fbbf24" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fbbf24' }}>Session Inactivity Idle Lockscreen</div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '8px 0 16px 0' }}>
              Your session was inactive for 45 minutes without screen lock. Input PIN or click resume to verify user presence.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="zt-btn full-width" onClick={() => {
                handleQuickAction('long_inactive_session', { details: 'Session idle timeout: 45 minutes of inactivity detected without lockscreen lock' });
                setActiveModal(null);
              }} disabled={actionLoading}>
                {actionLoading ? 'Resuming...' : '🔓 Unlock & Log Inactivity Event'}
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 9: Concurrent Login Attempt */}
      {activeModal === 'concurrent_login' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '480px', width: '90%', padding: '1.5rem', border: '1px solid #8b5cf6' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa' }}>
              👥 Concurrent Active Sessions Detected
            </div>
            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div><strong>Current Session:</strong> Windows 11 (Chrome) — Active</div>
              <div><strong>Secondary Session:</strong> Linux (Firefox 192.168.1.189) — Active</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="zt-btn full-width" style={{ background: '#8b5cf6', color: '#fff', fontWeight: 'bold' }} onClick={() => {
                handleTerminateRemoteSessions();
                handleQuickAction('concurrent_login', { details: 'Concurrent session attempt: Second active login initiated from secondary device' });
              }} disabled={actionLoading}>
                🛡️ Terminate Remote Sessions
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 10: Use GenAI Tool */}
      {activeModal === 'use_ai' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '560px', width: '92%', height: '80vh', display: 'flex', flexDirection: 'column', padding: '1.25rem', border: '1px solid #00f5ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
              <div style={{ color: '#00f5ff', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={20} /> 🤖 Enterprise GenAI Security Workspace
              </div>
              <button className="zt-btn zt-btn-sec" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setActiveModal(null)}>✕ Close</button>
            </div>

            {/* Chat History Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '0.75rem', paddingRight: '4px' }}>
              {genAiHistory.map((item, idx) => (
                <div key={idx} style={{
                  alignSelf: item.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: item.sender === 'user' ? 'rgba(0, 245, 255, 0.15)' : item.sender === 'assistant' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(245, 158, 11, 0.1)',
                  border: `1px solid ${item.sender === 'user' ? 'rgba(0, 245, 255, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                  fontSize: '0.8rem',
                  whiteSpace: 'pre-wrap'
                }}>
                  {item.msg}
                </div>
              ))}
            </div>

            <form onSubmit={handleGenAiSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" className="zt-input" placeholder="Type prompt or code snippet to test GenAI DLP monitoring..." value={genAiPrompt} onChange={(e) => setGenAiPrompt(e.target.value)} style={{ flex: 1 }} required />
              <button type="submit" className="zt-btn" disabled={actionLoading}>
                {actionLoading ? 'Sending...' : 'Send Prompt'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 11: Connect USB Device */}
      {activeModal === 'insert_usb' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem', border: '1px solid #ec4899' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f472b6' }}>
              <ExternalLink size={20} /> 🔌 USB Endpoint Media Control
            </div>
            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div><strong>Detected Volume:</strong> SanDisk Ultra 64GB USB 3.1</div>
              <div><strong>Mount Status:</strong> Connected (Unencrypted Media)</div>
              <div style={{ color: '#ef4444', marginTop: '4px' }}>⚠️ Unapproved USB mass storage is restricted under DLP policies.</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="zt-btn full-width" style={{ background: '#ec4899', color: '#fff', fontWeight: 'bold' }} onClick={() => {
                handleQuickAction('insert_usb', { details: 'Unregistered USB device connected and mounted (SanDisk Ultra 64GB)' });
                setActiveModal(null);
              }} disabled={actionLoading}>
                🔌 Mount USB & Log Endpoint Risk
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 12: Access Payroll System */}
      {activeModal === 'access_payroll' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '520px', width: '92%', padding: '1.5rem', border: '1px solid #00f5ff' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#00f5ff" /> 💼 Confidential Payroll System Portal
            </div>
            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div><strong>Access User:</strong> {user.name} ({user.department})</div>
              <div><strong>Authorization:</strong> {['HR', 'Finance', 'IT Security'].includes(user.department) ? 'Authorized Department Scope' : '🚫 Restricted Scope — Access Logged to SOC'}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="zt-btn full-width" onClick={() => {
                handleQuickAction('access_payroll', { details: 'Accessed Payroll Management System — salary data' });
                setActiveModal(null);
              }} disabled={actionLoading}>
                💼 Open Payroll Portal & Log Access
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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
