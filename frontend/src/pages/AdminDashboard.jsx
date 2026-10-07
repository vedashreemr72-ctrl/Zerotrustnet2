import React, { useState, useEffect } from 'react';
import { Shield, Users, FileText, AlertTriangle, Landmark, TrendingUp, Lock, Unlock, PhoneCall, Laptop, Activity, HardDrive, ExternalLink, MapPin, Globe, Navigation, X, UserCheck, UserPlus } from 'lucide-react';
import SecurityTrendGraph from '../components/SecurityTrendGraph';
import { formatLocalTime, formatShortTime, formatLocalDateTime } from '../utils/timeFormat';

export default function AdminDashboard({ token, user, onLogout }) {
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [deviceTrust, setDeviceTrust] = useState([]);
  const [liveActivity, setLiveActivity] = useState([]);
  const [mfaEvents, setMfaEvents] = useState([]);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [regRequests, setRegRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'sessions', 'employees', 'notifications', 'devices', 'mfa_events', 'appeals', 'registrations'
  const [actionMsg, setActionMsg] = useState('');
  const [selectedEmployeeLoc, setSelectedEmployeeLoc] = useState(null);

  // Step-Up MFA Modal state
  const [stepUpModalOpen, setStepUpModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [stepUpOtp, setStepUpOtp] = useState('');
  const [stepUpLoading, setStepUpLoading] = useState(false);
  const [stepUpError, setStepUpError] = useState('');

  const parseJsonSafe = async (res, defaultVal = null) => {
    if (!res) return defaultVal;
    try {
      const text = await res.text();
      if (!text || !text.trim()) return defaultVal;
      return JSON.parse(text);
    } catch (e) {
      console.warn(`JSON parse error on ${res.url || 'endpoint'} (HTTP ${res.status}):`, e);
      return defaultVal;
    }
  };

  const fetchSOCData = async () => {
    try {
      const [dashRes, empRes, sessRes, notifRes, devRes, liveRes, mfaRes, trustDevRes, appealRes, regRes] = await Promise.all([
        fetch('/api/admin/dashboard', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/employees', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/sessions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/notifications', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/device-trust', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/live-activity', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/auth/mfa-events', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/auth/trusted-devices', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/appeals', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/registration-requests', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (dashRes.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      if (!dashRes.ok) {
        const errObj = await parseJsonSafe(dashRes, {});
        throw new Error(errObj?.error || `Failed to load SOC dashboard (HTTP ${dashRes.status})`);
      }

      const dashData = await parseJsonSafe(dashRes, {});
      const empData = await parseJsonSafe(empRes, []);
      const sessData = await parseJsonSafe(sessRes, []);
      const notifData = await parseJsonSafe(notifRes, []);
      const devData = await parseJsonSafe(devRes, []);
      const liveData = await parseJsonSafe(liveRes, []);
      const mfaData = await parseJsonSafe(mfaRes, []);
      const trustDevData = await parseJsonSafe(trustDevRes, []);
      const appealData = await parseJsonSafe(appealRes, []);
      const regData = await parseJsonSafe(regRes, []);
      
      setData(dashData || {});
      setEmployees(Array.isArray(empData) ? empData : []);
      setSessions(Array.isArray(sessData) ? sessData : []);
      setNotifications(Array.isArray(notifData) ? notifData : []);
      setDeviceTrust(Array.isArray(devData) ? devData : []);
      setLiveActivity(Array.isArray(liveData) ? liveData : []);
      setMfaEvents(Array.isArray(mfaData) ? mfaData : []);
      setTrustedDevices(Array.isArray(trustDevData) ? trustDevData : []);
      setAppeals(Array.isArray(appealData) ? appealData : (appealData?.appeals || []));
      setRegRequests(Array.isArray(regData) ? regData : (regData?.requests || []));
      setError('');
    } catch (err) {
      console.error("fetchSOCData error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSOCData();
    const interval = setInterval(fetchSOCData, 2000);
    return () => clearInterval(interval);
  }, [token]);

  const triggerStepUp = (action) => {
    setPendingAction(action);
    setStepUpOtp('');
    setStepUpError('');
    setStepUpModalOpen(true);
  };

  const handleStepUpVerifyAndExecute = async (e) => {
    if (e) e.preventDefault();
    if (!stepUpOtp || stepUpOtp.trim().length !== 6) {
      setStepUpError('Please enter a valid 6-digit Step-Up MFA OTP code.');
      return;
    }
    setStepUpLoading(true);
    setStepUpError('');
    try {
      const vRes = await fetch('/api/auth/stepup-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          otp_code: stepUpOtp.trim(),
          action_name: pendingAction?.title || 'Admin Sensitive Action'
        })
      });
      const vData = await vRes.json();
      if (!vRes.ok) throw new Error(vData.error || 'Step-up verification failed');

      if (!pendingAction) return;

      if (pendingAction.type === 'terminate_session') {
        const { sessionId, username } = pendingAction.payload;
        const res = await fetch(`/api/admin/sessions/${sessionId}/terminate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Session termination failed');
        setActionMsg(`✅ Step-Up Authorized: Session for ${username} terminated.`);
      } else if (pendingAction.type === 'toggle_lock') {
        const { userId } = pendingAction.payload;
        const res = await fetch(`/api/admin/users/${userId}/toggle-lock`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Lock toggling failed');
        setActionMsg(`✅ Step-Up Authorized: ${resData.message}`);
      } else if (pendingAction.type === 'reset_system') {
        const res = await fetch('/api/admin/reset-system', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Reset failed');
        setActionMsg(`✅ Step-Up Authorized: ${resData.message}`);
      } else if (pendingAction.type === 'revoke_device') {
        const { deviceId } = pendingAction.payload;
        const res = await fetch('/api/auth/trusted-devices/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ device_id: deviceId })
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Device trust revocation failed');
        setActionMsg(`✅ Step-Up Authorized: Device ${deviceId} trust revoked.`);
      }

      setStepUpModalOpen(false);
      setPendingAction(null);
      fetchSOCData();
    } catch (err) {
      setStepUpError(err.message);
    } finally {
      setStepUpLoading(false);
    }
  };

  const handleResetSystem = () => {
    triggerStepUp({
      type: 'reset_system',
      payload: {},
      title: 'Reset live data baseline'
    });
  };

  const handleSimulateUSB = async () => {
    setActionMsg('');
    try {
      const res = await fetch('/api/admin/usb/test-trigger', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          device_name: 'SanDisk Ultra USB 3.0 (64GB)',
          drive_letter: 'E:'
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Test alert failed');
      setActionMsg(`🔌 ${resData.message}`);
      fetchSOCData();
    } catch (err) {
      setActionMsg(`❌ ${err.message}`);
    }
  };

  const handleAppealAction = async (appealId, action, notes = '') => {
    try {
      const res = await fetch(`/api/admin/appeals/${appealId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, notes })
      });
      const resData = (await parseJsonSafe(res, {})) || {};
      if (!res.ok) throw new Error(resData.error || 'Failed to update appeal');
      setActionMsg(`✅ ${resData.message}`);
      setTimeout(() => setActionMsg(''), 4000);
      fetchSOCData();
    } catch (err) {
      alert(`Appeal Action Error: ${err.message}`);
    }
  };

  const handleRegistrationAction = async (userId, action, notes = '') => {
    try {
      const res = await fetch(`/api/admin/registration-requests/${userId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, notes })
      });
      const resData = (await parseJsonSafe(res, {})) || {};
      if (!res.ok) throw new Error(resData.error || 'Failed to update registration status');
      setActionMsg(`✅ ${resData.message}`);
      setTimeout(() => setActionMsg(''), 4500);
      fetchSOCData();
    } catch (err) {
      alert(`Registration Action Error: ${err.message}`);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#00f5ff' }}>Loading Enterprise SOC Dashboard...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;
  if (!data || !data.stats) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: Unable to load SOC telemetry statistics</div>;

  const { stats = {}, severity_distribution = {}, department_risk = {}, active_alerts = [], trend = [] } = data || {};

  // Insider Threat Classification counts
  const normalCount = employees.filter(e => (e.threat_classification || 'Normal') === 'Normal').length;
  const suspiciousCount = employees.filter(e => (e.threat_classification || 'Normal') === 'Suspicious').length;
  const maliciousCount = employees.filter(e => (e.threat_classification || 'Normal') === 'Malicious').length;

  const usbAlerts = notifications.filter(n => 
    (n.subject && (n.subject.toUpperCase().includes('USB') || n.subject.toUpperCase().includes('PENDRIVE'))) ||
    (n.message && (n.message.toUpperCase().includes('USB') || n.message.toUpperCase().includes('PENDRIVE')))
  );

  const expFormatted = stats.financial_exposure >= 10000000 
    ? `₹${(stats.financial_exposure / 10000000).toFixed(2)} Cr`
    : stats.financial_exposure >= 100000
      ? `₹${(stats.financial_exposure / 100000).toFixed(1)} L`
      : `₹${stats.financial_exposure.toLocaleString()}`;

  return (
    <div>
      <div className="zt-title">Zerotrustnet: Multi-algorithmic framework for Insider threat detection</div>
      <div className="zt-subtitle">Continuous Zero Trust Monitoring · Multi-Model Behavioral Anomaly Detection · SOC Command Center</div>

      {/* Platform Architecture & 4 Core Differentiators Banner */}
      <div className="zt-card" style={{
        padding: '0.95rem 1.2rem',
        margin: '1rem 0 1.4rem 0',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(9, 14, 26, 0.98))',
        border: '1px solid rgba(0, 245, 255, 0.3)',
        borderRadius: '12px',
        boxShadow: '0 0 15px rgba(0, 245, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛡️</span> ZeroTrustNet Platform Architecture & Enterprise Differentiators
          </div>
          <span style={{ fontSize: '0.66rem', color: '#00f5ff', background: 'rgba(0, 245, 255, 0.12)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(0, 245, 255, 0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            4 Core Differentiators
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.65rem 0.8rem', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#10b981', marginBottom: '2px' }}>🔄 1. Continuous Monitoring</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.3' }}>Post-login telemetry tracking across 11 continuous employee actions in real-time.</div>
          </div>
          <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '0.65rem 0.8rem', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#38bdf8', marginBottom: '2px' }}>🤖 2. Multi-Algorithm AI</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.3' }}>6 complementary detection layers (Rules, Isolation Forest, LOF, SVM, Baseline, Policy).</div>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '0.65rem 0.8rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#f59e0b', marginBottom: '2px' }}>🔍 3. Explainable AI (XAI)</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.3' }}>Explains *why* activity is anomalous with checkmark evidence lists rather than raw scores.</div>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '0.65rem 0.8rem', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#ef4444', marginBottom: '2px' }}>🎯 4. Actionable Remediation</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.3' }}>Directs administrators on *what to do next* with explicit runbook guidance.</div>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          background: actionMsg.startsWith('✅') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${actionMsg.startsWith('✅') ? '#10b981' : '#ef4444'}`,
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: '600'
        }}>
          {actionMsg}
        </div>
      )}

      {/* Top 6 Executive SOC KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.2rem'
      }}>
        {/* Card 1: Employees Online */}
        <div className="zt-metric-tile" style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <div className="val" style={{ color: '#10b981', fontSize: '1.75rem', fontWeight: 'bold' }}>
            {stats.employees_online !== undefined ? stats.employees_online : (employees.length || 12)}
          </div>
          <div className="lbl" style={{ color: '#a7f3d0', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <span>🟢</span> Employees Online
          </div>
        </div>

        {/* Card 2: Sessions Active */}
        <div className="zt-metric-tile" style={{ background: 'rgba(0, 245, 255, 0.05)', border: '1px solid rgba(0, 245, 255, 0.25)' }}>
          <div className="val" style={{ color: '#00f5ff', fontSize: '1.75rem', fontWeight: 'bold' }}>
            {stats.sessions_active !== undefined ? stats.sessions_active : (sessions.filter(s => s.is_active).length || 14)}
          </div>
          <div className="lbl" style={{ color: '#38bdf8', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <span>📡</span> Sessions Active
          </div>
        </div>

        {/* Card 3: Critical Alerts */}
        <div className="zt-metric-tile" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div className="val critical" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
            {stats.critical_alerts !== undefined ? stats.critical_alerts : (maliciousCount || 2)}
          </div>
          <div className="lbl" style={{ color: '#fca5a5', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <span>🔴</span> Critical Alerts
          </div>
        </div>

        {/* Card 4: Blocked Users */}
        <div className="zt-metric-tile" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <div className="val" style={{ color: '#a78bfa', fontSize: '1.75rem', fontWeight: 'bold' }}>
            {stats.blocked_users !== undefined ? stats.blocked_users : employees.filter(e => e.is_active === 0).length}
          </div>
          <div className="lbl" style={{ color: '#c4b5fd', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <span>🔒</span> Blocked Users
          </div>
        </div>

        {/* Card 5: Risk Average */}
        <div className="zt-metric-tile" style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <div className="val" style={{ color: '#f59e0b', fontSize: '1.75rem', fontWeight: 'bold' }}>
            {stats.risk_average !== undefined ? stats.risk_average : (employees.reduce((a, b) => a + (b.risk_score || 0), 0) / (employees.length || 1)).toFixed(1)} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>/100</span>
          </div>
          <div className="lbl" style={{ color: '#fde68a', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <span>⚡</span> Risk Average
          </div>
        </div>

        {/* Card 6: Security Score */}
        <div className="zt-metric-tile" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div className="val safe" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
            {stats.security_score}%
          </div>
          <div className="lbl" style={{ color: '#a7f3d0', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <span>🛡️</span> Security Score
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(0, 245, 255, 0.1)', paddingBottom: '0.5rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className={`zt-btn ${activeTab === 'overview' ? '' : 'zt-btn-sec'}`} onClick={() => setActiveTab('overview')}>
            📊 Threat Overview
          </button>
          <button className={`zt-btn ${activeTab === 'sessions' ? '' : 'zt-btn-sec'}`} onClick={() => setActiveTab('sessions')}>
            <Activity size={15} /> Active Sessions ({sessions.filter(s => s.is_active).length})
          </button>
          <button 
            className={`zt-btn ${activeTab === 'employees' ? '' : 'zt-btn-sec'}`} 
            onClick={() => setActiveTab('employees')}
            style={regRequests.filter(r => r.approval_status === 'Pending').length > 0 ? { borderColor: '#eab308' } : {}}
          >
            <Users size={15} /> Employees & User Management {regRequests.filter(r => r.approval_status === 'Pending').length > 0 && (
              <span style={{ background: '#eab308', color: '#000', padding: '1px 6px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 'bold' }}>
                {regRequests.filter(r => r.approval_status === 'Pending').length} Pending
              </span>
            )}
          </button>
          <button 
            className={`zt-btn ${activeTab === 'registrations' ? '' : 'zt-btn-sec'}`} 
            onClick={() => setActiveTab('registrations')}
            style={regRequests.filter(r => r.approval_status === 'Pending').length > 0 ? { borderColor: '#eab308', color: '#eab308', fontWeight: 'bold' } : {}}
          >
            <UserCheck size={15} /> Registration Requests ({regRequests.filter(r => r.approval_status === 'Pending').length} Pending)
          </button>
          <button className={`zt-btn ${activeTab === 'notifications' ? '' : 'zt-btn-sec'}`} onClick={() => setActiveTab('notifications')}>
            <PhoneCall size={15} /> SMS & Email Dispatches ({notifications.length})
          </button>
          <button className={`zt-btn ${activeTab === 'devices' ? '' : 'zt-btn-sec'}`} onClick={() => setActiveTab('devices')}>
            <Laptop size={15} /> Device Trust Verification
          </button>
          <button className={`zt-btn ${activeTab === 'mfa_events' ? '' : 'zt-btn-sec'}`} onClick={() => setActiveTab('mfa_events')}>
            <Shield size={15} /> Adaptive MFA & Auth Events ({mfaEvents.length})
          </button>
          <button 
            className={`zt-btn ${activeTab === 'appeals' ? '' : 'zt-btn-sec'}`} 
            onClick={() => setActiveTab('appeals')}
            style={appeals.filter(a => a.status === 'Pending').length > 0 ? { borderColor: '#eab308', color: '#eab308', fontWeight: 'bold' } : {}}
          >
            <FileText size={15} /> Access Appeals ({appeals.filter(a => a.status === 'Pending').length} Pending)
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="zt-btn" 
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', fontSize: '0.78rem', color: '#fff', border: '1px solid #f59e0b' }} 
            onClick={handleSimulateUSB}
            title="Instant presentation demo: Triggers SOC audio chime, floating red toast, and critical USB breach alert"
          >
            🔌 Test USB Alert
          </button>
          <button className="zt-btn" style={{ background: '#ef4444', fontSize: '0.78rem' }} onClick={handleResetSystem}>
            🔄 Reset Live Data Baseline
          </button>
        </div>
      </div>

      {/* Real-Time USB / Pendrive / Smartphone Endpoint Insertion Alert Banner (Visible Across All Tabs) */}
      {usbAlerts.length > 0 && (
        <div className="usb-alert-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="usb-alert-icon">
              🔌
            </div>
            <div>
              <div className="usb-alert-title">
                <span>🚨 IMMEDIATE CRITICAL ALERT: USB / PENDRIVE INSERTION DETECTED</span>
                <span className="zt-badge bc" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>CRITICAL ENDPOINT</span>
              </div>
              <div className="usb-alert-message">
                {usbAlerts[0].message}
              </div>
              <div className="usb-alert-meta">
                <span className="usb-alert-target">Target: <strong>{usbAlerts[0].username}</strong></span>
                <span className="usb-alert-channel">Channel: <strong>{usbAlerts[0].channel}</strong></span>
                <span className="usb-alert-reported">Reported: <strong>{formatLocalDateTime(usbAlerts[0].sent_at)}</strong></span>
                <span className="usb-alert-status">Status: <strong>{usbAlerts[0].status}</strong></span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button 
              className="usb-alert-btn" 
              onClick={() => setActiveTab('notifications')}
            >
              <PhoneCall size={14} /> View Dispatches ({usbAlerts.length})
            </button>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <>

          <div className="grid-2col">
            {/* Main Column */}
            <div>
              <div className="zt-section-title">
                <AlertTriangle size={18} color="#ef4444" /> Active Real-Time Threat Alerts & Insider Classification
              </div>
            <div className="zt-card">
              {active_alerts.length === 0 ? (
                <div style={{ color: '#22c55e', padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                  ✓ No active SOC alerts — all employee actions within baseline policy.
                </div>
              ) : (
                <div className="zt-table-container">
                  <table className="zt-table">
                    <thead>
                      <tr>
                        <th>Priority</th>
                        <th>Employee</th>
                        <th>Dept</th>
                        <th>Alert Indicator</th>
                        <th>Risk Score</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active_alerts.map((alert, idx) => {
                        const sevClass = alert.severity.includes('Critical') ? 'bc' : alert.severity.includes('High') ? 'bh' : alert.severity.includes('Medium') ? 'bm' : 'bl';
                        return (
                          <tr key={idx}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: alert.priority === 'P1' ? '#ef4444' : '#f97316' }}>
                              {alert.priority}
                            </td>
                            <td style={{ fontWeight: '600' }}>{alert.employee}</td>
                            <td>{alert.department}</td>
                            <td style={{ color: '#8aafc8', fontSize: '0.82rem' }}>{alert.alert}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{alert.score}/100</td>
                            <td>
                              <span className={`zt-badge ${sevClass}`}>{alert.severity.replace(/[^\w\s]/g, '').trim()}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
              <SecurityTrendGraph trend={trend} />
            </div>
          </div>

          {/* Sidebar Column */}
          <div>
            {/* SIEM Live Activity Panel */}
            <div className="zt-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><Activity size={18} color="#00f5ff" /> Live Activity Panel (SIEM Stream)</span>
              <span style={{ fontSize: '0.65rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 7px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }}></span> LIVE SIEM
              </span>
            </div>
            <div className="zt-card" style={{ padding: '0.8rem', background: '#090d16', border: '1px solid rgba(0, 245, 255, 0.25)', borderRadius: '10px', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '280px', overflowY: 'auto' }}>
                {liveActivity.map((act, idx) => {
                  const isSusp = act.is_suspicious && !(act.user === 'System Administrator' && act.event_type === 'Login');
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.6rem',
                      background: isSusp ? 'rgba(239, 68, 68, 0.08)' : 'rgba(15, 23, 42, 0.7)',
                      borderLeft: `3px solid ${isSusp ? '#ef4444' : '#10b981'}`,
                      borderRadius: '5px',
                      fontSize: '0.74rem',
                      fontFamily: 'monospace'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#00f5ff', fontWeight: 'bold' }}>{act.timestamp ? formatShortTime(act.timestamp) : formatShortTime(act.time)}</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{act.user}</span>
                        <span style={{ color: isSusp ? '#f97316' : '#8aafc8' }}>{act.event_type}</span>
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        color: isSusp ? '#ef4444' : '#10b981',
                        background: isSusp ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.1)',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}>
                        {isSusp ? `⚠ ${act.event_type}` : '✓ Normal'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="zt-section-title">
              <Landmark size={18} /> Department Risk Summary
            </div>
            <div className="zt-card">
              <p style={{ fontSize: '0.8rem', color: '#4a6275', marginBottom: '1rem' }}>
                Average behavior deviation risk score by company organizational unit.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {Object.entries(department_risk).map(([dept, avg], idx) => {
                  const color = avg >= 80 ? '#ef4444' : avg >= 60 ? '#f97316' : avg >= 30 ? '#eab308' : '#22c55e';
                  const percent = `${avg}%`;
                  return (
                    <div key={idx} style={{ paddingBottom: '6px', borderBottom: '1px solid rgba(0,245,255,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '500' }}>{dept}</span>
                        <span style={{ color: color, fontWeight: 'bold' }}>{avg.toFixed(0)}/100</span>
                      </div>
                      <div className="rb-track" style={{ height: '5px' }}>
                        <div className="rb-fill" style={{ width: percent, backgroundColor: color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="zt-section-title">
              <Shield size={18} /> Insider Threat Classification Profile
            </div>
            <div className="zt-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="zt-badge bl">🟢 Normal (Score &lt; 30)</span>
                  <span style={{ fontWeight: 'bold', fontFamily: 'monospace', color: '#22c55e' }}>{normalCount} Users</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="zt-badge bm">🟡 Suspicious (Score 30–79)</span>
                  <span style={{ fontWeight: 'bold', fontFamily: 'monospace', color: '#f59e0b' }}>{suspiciousCount} Users</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="zt-badge bc">🔴 Malicious Threat (Score 80–100)</span>
                  <span style={{ fontWeight: 'bold', fontFamily: 'monospace', color: '#ef4444' }}>{maliciousCount} Users</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )}

      {activeTab === 'sessions' && (
        <div>
          <div className="zt-section-title">
            <Activity size={18} /> Continuous Session Monitoring & Session Revocation
          </div>
          <div className="zt-card">
            <div className="zt-table-container">
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>Session ID</th>
                    <th>Employee & Role</th>
                    <th>Department</th>
                    <th>Device ID & OS</th>
                    <th>Browser</th>
                    <th>Location & IP</th>
                    <th>Login Time</th>
                    <th>MFA Status</th>
                    <th>Risk Score</th>
                    <th>Status</th>
                    <th>SOC Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((sess, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#00f5ff' }}>{sess.id.substring(0, 8)}...</td>
                      <td>
                        <div style={{ fontWeight: 'bold' }}>{sess.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{sess.username} ({sess.role || 'employee'})</div>
                      </td>
                      <td>{sess.department}</td>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: '#a7f3d0' }}>{sess.device_id || 'DEV-89412-WIN'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{sess.os || 'Windows 11'}</div>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{sess.browser || 'Google Chrome 127'}</td>
                      <td>
                        <div style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{sess.location || 'Bengaluru, IN'}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#f472b6' }}>{sess.ip_addr}</div>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#fbbf24' }}>{formatLocalDateTime(sess.login_time)}</td>
                      <td>
                        <span className={`zt-badge ${sess.mfa_verified ? 'bl' : 'bm'}`} style={{ fontSize: '0.68rem' }}>
                          {sess.mfa_verified ? '✓ Step-Up Verified' : 'Standard Trust'}
                        </span>
                        {sess.step_up_verified_at && (
                          <div style={{ fontSize: '0.66rem', color: '#10b981', marginTop: '2px' }}>
                            Step-Up Active
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 'bold', color: sess.risk_score >= 80 ? '#ef4444' : sess.risk_score >= 30 ? '#f59e0b' : '#10b981' }}>
                        {sess.risk_score}/100
                      </td>
                      <td>
                        <span className={`zt-badge ${sess.is_active ? 'bl' : 'bc'}`}>
                          {sess.is_active ? 'Active' : 'Terminated'}
                        </span>
                      </td>
                      <td>
                        {sess.is_active ? (
                          <button 
                            className="zt-btn" 
                            style={{ background: '#ef4444', padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                            onClick={() => triggerStepUp({
                              type: 'terminate_session',
                              payload: { sessionId: sess.id, username: sess.username },
                              title: `Terminate session for ${sess.username}`
                            })}
                          >
                            Terminate Session
                          </button>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'employees' && (
        <div>
          <div className="zt-section-title">
            <Users size={18} /> Monitored Employees & Automated Account Lockout Control
          </div>

          {/* Pending Registration Requests Alert Card */}
          {regRequests.filter(r => r.approval_status === 'Pending').length > 0 && (
            <div className="zt-card" style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.12), rgba(202, 138, 4, 0.05))',
              border: '1.5px solid #eab308',
              borderRadius: '10px',
              padding: '1.25rem',
              marginBottom: '1.25rem',
              boxShadow: '0 0 20px rgba(234, 179, 8, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={20} color="#eab308" />
                  <div>
                    <strong style={{ color: '#fbbf24', fontSize: '0.95rem' }}>
                      ⏳ Pending Employee Registration Requests ({regRequests.filter(r => r.approval_status === 'Pending').length})
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Zero Trust Access Control: Newly registered employees cannot log in until you accept their registration request.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="zt-table" style={{ width: '100%', fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Username</th>
                      <th>Department & Scope</th>
                      <th>Registered Device</th>
                      <th>Location</th>
                      <th>Requested At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regRequests.filter(r => r.approval_status === 'Pending').map((req) => (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{req.name}</td>
                        <td style={{ fontFamily: 'monospace', color: '#00f5ff' }}>@{req.username}</td>
                        <td>{req.department} · {req.emp_type}</td>
                        <td style={{ color: '#94a3b8' }}>{req.device}</td>
                        <td style={{ color: '#38bdf8' }}>{req.location}</td>
                        <td style={{ color: '#fbbf24', fontSize: '0.72rem' }}>{formatLocalDateTime(req.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="zt-btn"
                              style={{ background: '#10b981', color: '#000', padding: '0.3rem 0.65rem', fontSize: '0.74rem', fontWeight: 'bold' }}
                              onClick={() => handleRegistrationAction(req.id, 'approve')}
                              title="Accept registration and activate account"
                            >
                              ✓ Accept & Activate
                            </button>
                            <button
                              className="zt-btn"
                              style={{ background: '#ef4444', color: '#fff', padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}
                              onClick={() => {
                                const reason = prompt('Optional rejection note:', 'Registration not authorized');
                                if (reason !== null) handleRegistrationAction(req.id, 'reject', reason);
                              }}
                              title="Reject registration request"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="zt-card">
            <div className="zt-table-container">
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Username</th>
                    <th>Department</th>
                    <th>Role Scope</th>
                    <th>Live Geolocation & Baseline</th>
                    <th>Risk Score</th>
                    <th>Insider Threat Classification</th>
                    <th>Registration & Lock Status</th>
                    <th>SOC Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => {
                    const isLocked = emp.is_active === 0;
                    const curLoc = emp.current_login_location || 'Office Workstation';
                    const baseLoc = emp.baseline_location || 'Bengaluru';
                    const isMismatch = curLoc && baseLoc && 
                      !curLoc.toLowerCase().includes(baseLoc.toLowerCase()) && 
                      !baseLoc.toLowerCase().includes(curLoc.toLowerCase());
                    const isImpossible = emp.impossible_travel_flag === 1;

                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>{emp.name}</td>
                        <td style={{ fontFamily: 'monospace', color: '#00f5ff' }}>{emp.username}</td>
                        <td>{emp.department}</td>
                        <td>{emp.emp_type}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <MapPin size={13} color="#00f5ff" style={{ flexShrink: 0 }} />
                            <span style={{ fontWeight: '600', color: isMismatch ? '#f59e0b' : '#38bdf8', fontSize: '0.8rem' }}>
                              {curLoc}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                            Baseline: <strong style={{ color: '#cbd5e1' }}>{baseLoc}</strong>
                          </div>
                          <div style={{ marginTop: '3px' }}>
                            {isImpossible ? (
                              <span className="zt-badge bc" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                                🚨 Impossible Travel
                              </span>
                            ) : isMismatch ? (
                              <span className="zt-badge bm" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                                ⚠️ Geo Deviation
                              </span>
                            ) : (
                              <span className="zt-badge bl" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                                ✓ Baseline Match
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 'bold', color: emp.risk_score >= 80 ? '#ef4444' : emp.risk_score >= 30 ? '#f59e0b' : '#10b981' }}>
                          {emp.risk_score}/100
                        </td>
                        <td>
                          <span className={`zt-badge ${emp.threat_classification === 'Malicious' ? 'bc' : emp.threat_classification === 'Suspicious' ? 'bm' : 'bl'}`}>
                            {emp.threat_classification || 'Normal'}
                          </span>
                        </td>
                        <td>
                          {emp.approval_status === 'Pending' ? (
                            <span className="zt-badge" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#fbbf24', border: '1px solid #eab308' }}>
                              ⏳ Pending Approval
                            </span>
                          ) : emp.approval_status === 'Rejected' ? (
                            <span className="zt-badge bc">
                              ❌ Registration Rejected
                            </span>
                          ) : (
                            <span className={`zt-badge ${isLocked ? 'bc' : 'bl'}`}>
                              {isLocked ? '🔒 Account Locked' : '🟢 Approved & Active'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {emp.approval_status === 'Pending' && (
                              <button 
                                className="zt-btn" 
                                style={{ background: '#10b981', color: '#000', padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: 'bold' }}
                                onClick={() => handleRegistrationAction(emp.id, 'approve')}
                                title="Accept registration request and activate employee account"
                              >
                                ✓ Accept
                              </button>
                            )}
                            <button 
                              className="zt-btn" 
                              style={{ background: isLocked ? '#10b981' : '#ef4444', padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => triggerStepUp({
                                type: 'toggle_lock',
                                payload: { userId: emp.id, employeeName: emp.name },
                                title: `${isLocked ? 'Unlock' : 'Lock'} account for ${emp.name}`
                              })}
                            >
                              {isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                              {isLocked ? 'Unlock' : 'Lock'}
                            </button>
                            <button
                              className="zt-btn zt-btn-sec"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => setSelectedEmployeeLoc(emp)}
                              title="Inspect Geolocation Details"
                            >
                              <Globe size={12} color="#00f5ff" />
                              Location Intel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div>
          <div className="zt-section-title">
            <PhoneCall size={18} /> Automated SMS & Email Security Event Notifications
          </div>
          <div className="zt-card">
            <div className="zt-table-container">
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Channel</th>
                    <th>Recipient</th>
                    <th>Subject / Alert</th>
                    <th>Message Payload</th>
                    <th>Severity</th>
                    <th>Delivery Status</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notif, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                        {(() => {
                          try {
                            let str = String(notif.sent_at || '').trim();
                            if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) str += 'Z';
                            const d = new Date(str);
                            return isNaN(d.getTime()) ? (notif.sent_at || '—') : d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                          } catch {
                            return notif.sent_at || '—';
                          }
                        })()}
                      </td>
                      <td style={{ 
                        fontWeight: 'bold', 
                        color: (notif.channel || '').includes('USB') ? '#ec4899' : notif.channel === 'SMS' ? '#f59e0b' : '#3b82f6' 
                      }}>
                        {(notif.channel || '').includes('USB') ? '🔌 Endpoint USB' : notif.channel === 'SMS' ? '📱 SMS' : '📧 Email'}
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{notif.recipient}</td>
                      <td style={{ fontWeight: 'bold' }}>{notif.subject}</td>
                      <td style={{ fontSize: '0.8rem', color: '#8aafc8' }}>{notif.message}</td>
                      <td>
                        <span className={`zt-badge ${notif.severity === 'Critical' || notif.severity === 'High' ? 'bc' : 'bm'}`}>
                          {notif.severity}
                        </span>
                      </td>
                      <td>
                        <span className="zt-badge bl">✓ Dispatched</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'devices' && (
        <div>
          <div className="zt-section-title">
            <Laptop size={18} /> Device Trust Verification & Posture Monitoring
          </div>
          <div className="zt-card">
            <div className="zt-table-container">
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Device Hardware</th>
                    <th>Device Known</th>
                    <th>Trust Verification Status</th>
                    <th>Disk Encryption</th>
                    <th>Endpoint Firewall</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceTrust.map((dev, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 'bold' }}>{dev.employee}</td>
                      <td>{dev.department}</td>
                      <td>{dev.device_name}</td>
                      <td>
                        <span className={`zt-badge ${dev.is_known ? 'bl' : 'bc'}`}>
                          {dev.is_known ? 'Known Corporate Device' : 'Unregistered Device'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 'bold', color: dev.is_known ? '#10b981' : '#ef4444' }}>
                        {dev.trust_status}
                      </td>
                      <td style={{ color: '#8aafc8', fontSize: '0.8rem' }}>{dev.disk_encryption}</td>
                      <td style={{ color: '#8aafc8', fontSize: '0.8rem' }}>{dev.firewall_status}</td>
                      <td style={{ fontFamily: 'monospace', color: '#00f5ff' }}>{dev.last_seen_location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mfa_events' && (
        <div>
          <div className="zt-section-title">
            <Shield size={18} /> Zero Trust Adaptive MFA & Authentication Audit Trail
          </div>
          <div className="zt-card" style={{ marginBottom: '1.5rem' }}>
            <div className="zt-table-container">
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Employee & Role</th>
                    <th>Department</th>
                    <th>Event Type</th>
                    <th>IP Address</th>
                    <th>Endpoint / Context</th>
                    <th>Audit Details</th>
                    <th>Risk Posture</th>
                  </tr>
                </thead>
                <tbody>
                  {mfaEvents.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                        No authentication or MFA events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    mfaEvents.map((evt, idx) => {
                      const isChallenge = (evt.event_type || '').includes('Challenge');
                      const isSuccess = (evt.event_type || '').includes('Verified') || (evt.event_type || '').includes('Success');
                      const isRevoke = (evt.event_type || '').includes('Revoked');
                      return (
                        <tr key={idx}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                            {formatLocalDateTime(evt.timestamp)}
                          </td>
                          <td>
                            <div style={{ fontWeight: 'bold' }}>{evt.user_name || evt.username}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{evt.username}</div>
                          </td>
                          <td>{evt.department || '—'}</td>
                          <td>
                            <span className={`zt-badge ${isSuccess ? 'bl' : isChallenge ? 'bm' : isRevoke ? 'bc' : 'bl'}`}>
                              {evt.event_type}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#00f5ff' }}>
                            {evt.ip_addr || '127.0.0.1'}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>
                            {evt.device || 'Workstation'}
                          </td>
                          <td style={{ fontSize: '0.78rem', color: '#e2e8f0', maxWidth: '300px' }}>
                            {evt.details}
                          </td>
                          <td>
                            <span className={`zt-badge ${evt.is_suspicious ? 'bc' : 'bl'}`}>
                              {evt.is_suspicious ? 'Flagged Risk' : 'Authorized'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="zt-section-title">
            <Laptop size={18} /> Registered Endpoints & Device Trust Authority
          </div>
          <div className="zt-card">
            <div className="zt-table-container">
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>Device Hardware / Name</th>
                    <th>Assigned User</th>
                    <th>Device ID</th>
                    <th>OS & Browser</th>
                    <th>Known IP</th>
                    <th>Trust Level</th>
                    <th>Last Verified</th>
                    <th>SOC Action</th>
                  </tr>
                </thead>
                <tbody>
                  {trustedDevices.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                        No enrolled devices found.
                      </td>
                    </tr>
                  ) : (
                    trustedDevices.map((td, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>{td.device_name || 'Enrolled Device'}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>First enrolled: {td.first_seen_at ? td.first_seen_at.substring(0, 10) : 'Baseline'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 'bold' }}>{td.name || td.username}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{td.username}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#a7f3d0' }}>{td.device_id}</td>
                        <td>
                          <div style={{ fontSize: '0.76rem', color: '#e2e8f0' }}>{td.os}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{td.browser}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#00f5ff' }}>{td.ip_address}</td>
                        <td>
                          <span className={`zt-badge ${td.is_trusted ? 'bl' : 'bc'}`}>
                            {td.is_trusted ? '✓ Trusted Endpoint' : 'Untrusted Device'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#fbbf24' }}>
                          {formatLocalDateTime(td.last_seen_at)}
                        </td>
                        <td>
                          {td.is_trusted ? (
                            <button
                              className="zt-btn"
                              style={{ background: '#ef4444', padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                              onClick={() => triggerStepUp({
                                type: 'revoke_device',
                                payload: { deviceId: td.device_id },
                                title: `Revoke Trust for Device ${td.device_id}`
                              })}
                            >
                              Revoke Trust
                            </button>
                          ) : (
                            <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 'bold' }}>Trust Revoked</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Access Appeals Management Tab */}
      {activeTab === 'appeals' && (
        <div className="zt-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#00f5ff' }}>
                📁 Employee File Access Appeals & Quota Extension Management
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Zero Trust Least Privilege enforcement: Employees exceeding the 10-file quota require administrator authorization.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(251, 191, 36, 0.3)', fontWeight: 'bold' }}>
                ⏳ {appeals.filter(a => a.status === 'Pending').length} Pending Review
              </span>
              <button className="zt-btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={fetchSOCData}>
                🔄 Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="zt-table" style={{ width: '100%', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Timestamp</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Requested Quota</th>
                  <th>Business Justification</th>
                  <th>Status</th>
                  <th>Review Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appeals.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>
                      No file access appeals recorded in the system.
                    </td>
                  </tr>
                ) : (
                  appeals.map((appeal) => (
                    <tr key={appeal.id} style={{ background: appeal.status === 'Pending' ? 'rgba(234, 179, 8, 0.05)' : 'transparent' }}>
                      <td style={{ fontWeight: 'bold', color: '#00f5ff', fontFamily: 'monospace' }}>
                        #{appeal.id}
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {formatLocalDateTime(appeal.created_at)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{appeal.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>@{appeal.username} (ID: {appeal.user_id})</div>
                      </td>
                      <td style={{ color: '#38bdf8' }}>{appeal.department || 'N/A'}</td>
                      <td>
                        <span style={{ fontWeight: 'bold', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          +{appeal.requested_files} Files
                        </span>
                      </td>
                      <td style={{ maxWidth: '280px', color: '#cbd5e1', lineHeight: '1.4' }}>
                        <div style={{ wordBreak: 'break-word' }}>
                          "{appeal.reason}"
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          background: appeal.status === 'Approved' ? 'rgba(34, 197, 94, 0.15)' : appeal.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: appeal.status === 'Approved' ? '#22c55e' : appeal.status === 'Rejected' ? '#ef4444' : '#eab308',
                          border: `1px solid ${appeal.status === 'Approved' ? 'rgba(34, 197, 94, 0.4)' : appeal.status === 'Rejected' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`
                        }}>
                          {appeal.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {appeal.reviewed_at ? (
                          <div>
                            <div>By: <strong style={{ color: '#e2e8f0' }}>{appeal.reviewed_by}</strong></div>
                            <div style={{ color: '#64748b' }}>{formatLocalDateTime(appeal.reviewed_at)}</div>
                            {appeal.admin_notes && <div style={{ color: '#38bdf8' }}>Note: {appeal.admin_notes}</div>}
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontStyle: 'italic' }}>Pending review</span>
                        )}
                      </td>
                      <td>
                        {appeal.status === 'Pending' ? (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="zt-btn"
                              style={{ background: '#10b981', color: '#000', padding: '0.3rem 0.6rem', fontSize: '0.72rem', fontWeight: 'bold' }}
                              onClick={() => handleAppealAction(appeal.id, 'approve', `Approved +${appeal.requested_files} file extension`)}
                              title={`Grant +${appeal.requested_files} additional file accesses`}
                            >
                              ✓ Approve (+{appeal.requested_files})
                            </button>
                            <button
                              className="zt-btn"
                              style={{ background: '#ef4444', color: '#fff', padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                              onClick={() => {
                                const reason = prompt('Optional rejection note / reason:', 'Insufficient business justification for extension');
                                if (reason !== null) {
                                  handleAppealAction(appeal.id, 'reject', reason);
                                }
                              }}
                              title="Reject access extension request"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Registration Requests Tab */}
      {activeTab === 'registrations' && (
        <div className="zt-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#00f5ff' }}>
                👥 Employee Registration Requests & Access Approvals
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Zero Trust Onboarding Policy: New employees must be explicitly accepted by the System Administrator before credentials can be used to log in.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(251, 191, 36, 0.3)', fontWeight: 'bold' }}>
                ⏳ {regRequests.filter(r => r.approval_status === 'Pending').length} Pending Acceptance
              </span>
              <button className="zt-btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={fetchSOCData}>
                🔄 Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="zt-table" style={{ width: '100%', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Username / Email</th>
                  <th>Department & Role</th>
                  <th>Registered Device</th>
                  <th>Registered Location</th>
                  <th>Registration Date</th>
                  <th>Approval Status</th>
                  <th>Review Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {regRequests.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>
                      No registration requests recorded.
                    </td>
                  </tr>
                ) : (
                  regRequests.map((req) => (
                    <tr key={req.id} style={{ background: req.approval_status === 'Pending' ? 'rgba(234, 179, 8, 0.05)' : 'transparent' }}>
                      <td style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{req.name}</td>
                      <td>
                        <div style={{ fontFamily: 'monospace', color: '#00f5ff' }}>@{req.username}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{req.email}</div>
                      </td>
                      <td>
                        <span style={{ color: '#38bdf8' }}>{req.department}</span>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{req.emp_type}</div>
                      </td>
                      <td style={{ color: '#94a3b8' }}>{req.device}</td>
                      <td style={{ color: '#38bdf8' }}>{req.location}</td>
                      <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{formatLocalDateTime(req.created_at)}</td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          background: req.approval_status === 'Approved' ? 'rgba(34, 197, 94, 0.15)' : req.approval_status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: req.approval_status === 'Approved' ? '#22c55e' : req.approval_status === 'Rejected' ? '#ef4444' : '#eab308',
                          border: `1px solid ${req.approval_status === 'Approved' ? 'rgba(34, 197, 94, 0.4)' : req.approval_status === 'Rejected' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`
                        }}>
                          {req.approval_status === 'Pending' ? '⏳ Pending Approval' : req.approval_status === 'Approved' ? '✓ Approved' : '✕ Rejected'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {req.reviewed_at ? (
                          <div>
                            <div>By: <strong style={{ color: '#e2e8f0' }}>{req.reviewed_by}</strong></div>
                            <div style={{ color: '#64748b' }}>{formatLocalDateTime(req.reviewed_at)}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontStyle: 'italic' }}>Pending review</span>
                        )}
                      </td>
                      <td>
                        {req.approval_status === 'Pending' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="zt-btn"
                              style={{ background: '#10b981', color: '#000', padding: '0.3rem 0.65rem', fontSize: '0.74rem', fontWeight: 'bold' }}
                              onClick={() => handleRegistrationAction(req.id, 'approve')}
                              title="Accept registration and activate account"
                            >
                              ✓ Accept
                            </button>
                            <button
                              className="zt-btn"
                              style={{ background: '#ef4444', color: '#fff', padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}
                              onClick={() => {
                                const reason = prompt('Optional rejection note:', 'Registration not authorized');
                                if (reason !== null) handleRegistrationAction(req.id, 'reject', reason);
                              }}
                              title="Reject registration request"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step-Up MFA Authorization Modal */}
      {stepUpModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0b1329 0%, #060c1d 100%)',
            border: '1.5px solid #00f5ff',
            boxShadow: '0 0 40px rgba(0, 245, 255, 0.25)',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '2rem',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.8rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}>
                <Shield size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f8fafc' }}>
                  Zero Trust Step-Up MFA Required
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  High-Privilege SOC Administrative Authorization
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '0.85rem',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              color: '#fecaca',
              lineHeight: '1.4'
            }}>
              <strong>Action:</strong> {pendingAction?.title}
              <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                Zero Trust Continuous Evaluation enforces real-time re-authentication before sensitive administrative interventions.
              </div>
            </div>

            {stepUpError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.18)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.8rem',
                marginBottom: '1rem'
              }}>
                ⚠️ {stepUpError}
              </div>
            )}

            <form onSubmit={handleStepUpVerifyAndExecute}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: '500' }}>
                  Enter 6-Digit Step-Up OTP Code:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={stepUpOtp}
                  onChange={(e) => setStepUpOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    textAlign: 'center',
                    letterSpacing: '0.5em',
                    fontSize: '1.4rem',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    color: '#00f5ff',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1.5px solid rgba(0, 245, 255, 0.4)',
                    borderRadius: '10px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{
                background: 'rgba(0, 245, 255, 0.06)',
                border: '1px dashed rgba(0, 245, 255, 0.3)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                color: '#38bdf8',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>Demo SOC Code: <strong>Any 6 digits (e.g. 774921)</strong></span>
                <button
                  type="button"
                  onClick={() => setStepUpOtp('774921')}
                  style={{
                    background: 'rgba(0, 245, 255, 0.15)',
                    border: '1px solid rgba(0, 245, 255, 0.4)',
                    color: '#00f5ff',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.7rem',
                    cursor: 'pointer'
                  }}
                >
                  Auto-fill
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="zt-btn zt-btn-sec"
                  onClick={() => { setStepUpModalOpen(false); setPendingAction(null); }}
                  disabled={stepUpLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="zt-btn"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: '1px solid #ef4444' }}
                  disabled={stepUpLoading || stepUpOtp.length !== 6}
                >
                  {stepUpLoading ? 'Verifying OTP...' : 'Verify & Authorize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Employee Geolocation Forensic Intel Modal */}
      {selectedEmployeeLoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(5, 10, 20, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '1rem'
        }}>
          <div className="zt-card" style={{
            width: '100%',
            maxWidth: '620px',
            border: '1px solid #00f5ff',
            boxShadow: '0 0 30px rgba(0, 245, 255, 0.25)',
            position: 'relative',
            background: '#0d1527',
            borderRadius: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 245, 255, 0.15)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={20} color="#00f5ff" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#00f5ff', fontWeight: 'bold' }}>
                  Geolocation Telemetry: {selectedEmployeeLoc.name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedEmployeeLoc(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.2rem' }}>
              <div style={{ background: 'rgba(0, 245, 255, 0.04)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(0, 245, 255, 0.15)' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '4px' }}>Current Active Location</div>
                <div style={{ color: '#00f5ff', fontWeight: 'bold', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={14} />
                  <span>{selectedEmployeeLoc.current_login_location || 'Office Workstation'}</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '4px' }}>Registered Baseline Location</div>
                <div style={{ color: '#cbd5e1', fontWeight: 'bold', fontSize: '0.88rem' }}>
                  {selectedEmployeeLoc.baseline_location || 'Bengaluru'}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '4px' }}>Previous Known Location</div>
                <div style={{ color: '#cbd5e1', fontWeight: 'bold', fontSize: '0.88rem' }}>
                  {selectedEmployeeLoc.last_login_location || 'Office'}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '4px' }}>Registered Hardware Endpoint</div>
                <div style={{ color: '#a7f3d0', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                  {selectedEmployeeLoc.baseline_device || 'Corporate Laptop'}
                </div>
              </div>
            </div>

            {selectedEmployeeLoc.impossible_travel_details && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.8rem' }}>
                <strong>🚨 Impossible Travel Flag:</strong> {selectedEmployeeLoc.impossible_travel_details}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button 
                className="zt-btn zt-btn-sec"
                onClick={() => setSelectedEmployeeLoc(null)}
                style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
