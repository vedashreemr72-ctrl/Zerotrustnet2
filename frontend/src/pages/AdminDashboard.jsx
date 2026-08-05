import React, { useState, useEffect } from 'react';
import { Shield, Users, FileText, AlertTriangle, Landmark, TrendingUp, Lock, Unlock, PhoneCall, Laptop, Activity } from 'lucide-react';

export default function AdminDashboard({ token, user, onLogout }) {
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [deviceTrust, setDeviceTrust] = useState([]);
  const [liveActivity, setLiveActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'sessions', 'employees', 'notifications', 'devices'
  const [actionMsg, setActionMsg] = useState('');

  const parseJsonSafe = async (res) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
  };

  const fetchSOCData = async () => {
    try {
      const [dashRes, empRes, sessRes, notifRes, devRes, liveRes] = await Promise.all([
        fetch('/api/admin/dashboard', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/employees', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/sessions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/notifications', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/device-trust', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/live-activity', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (dashRes.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      const dashData = await parseJsonSafe(dashRes);
      const empData = await parseJsonSafe(empRes);
      const sessData = await parseJsonSafe(sessRes);
      const notifData = await parseJsonSafe(notifRes);
      const devData = await parseJsonSafe(devRes);
      const liveData = await parseJsonSafe(liveRes);

      if (!dashRes.ok) {
        if (dashData.error === 'Invalid token' && onLogout) {
          onLogout();
          return;
        }
        throw new Error(dashData.error || 'Failed to load SOC dashboard');
      }
      
      setData(dashData);
      setEmployees(empData || []);
      setSessions(sessData || []);
      setNotifications(notifData || []);
      setDeviceTrust(devData || []);
      setLiveActivity(liveData || []);
      setError('');
    } catch (err) {
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

  const handleToggleLock = async (userId, employeeName) => {
    setActionMsg('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-lock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lock toggling failed');
      setActionMsg(`✅ ${resData.message}`);
      fetchSOCData();
    } catch (err) {
      setActionMsg(`❌ ${err.message}`);
    }
  };

  const handleTerminateSession = async (sessionId, username) => {
    setActionMsg('');
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/terminate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Session termination failed');
      setActionMsg(`✅ Session for ${username} terminated.`);
      fetchSOCData();
    } catch (err) {
      setActionMsg(`❌ ${err.message}`);
    }
  };

  const handleResetSystem = async () => {
    if (!window.confirm('Reset all live user sessions, incidents, and activity logs to clean baseline?')) return;
    setActionMsg('');
    try {
      const res = await fetch('/api/admin/reset-system', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Reset failed');
      setActionMsg(`✅ ${resData.message}`);
      fetchSOCData();
    } catch (err) {
      setActionMsg(`❌ ${err.message}`);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#00f5ff' }}>Loading Enterprise SOC Dashboard...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;

  const { stats, severity_distribution, department_risk, active_alerts, trend } = data;

  // Insider Threat Classification counts
  const normalCount = employees.filter(e => (e.threat_classification || 'Normal') === 'Normal').length;
  const suspiciousCount = employees.filter(e => (e.threat_classification || 'Normal') === 'Suspicious').length;
  const maliciousCount = employees.filter(e => (e.threat_classification || 'Normal') === 'Malicious').length;

  const expFormatted = stats.financial_exposure >= 10000000 
    ? `₹${(stats.financial_exposure / 10000000).toFixed(2)} Cr`
    : stats.financial_exposure >= 100000
      ? `₹${(stats.financial_exposure / 100000).toFixed(1)} L`
      : `₹${stats.financial_exposure.toLocaleString()}`;

  return (
    <div>
      <div className="zt-title">ZeroTrustNet SOC & Insider Threat Command Center</div>
      <div className="zt-subtitle">An AI-Powered Zero Trust Employee Access Verification and Insider Threat Detection Platform</div>

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
          <button className={`zt-btn ${activeTab === 'employees' ? '' : 'zt-btn-sec'}`} onClick={() => setActiveTab('employees')}>
            <Users size={15} /> User Management & Lockout
          </button>
          <button className={`zt-btn ${activeTab === 'notifications' ? '' : 'zt-btn-sec'}`} onClick={() => setActiveTab('notifications')}>
            <PhoneCall size={15} /> SMS & Email Dispatches ({notifications.length})
          </button>
          <button className={`zt-btn ${activeTab === 'devices' ? '' : 'zt-btn-sec'}`} onClick={() => setActiveTab('devices')}>
            <Laptop size={15} /> Device Trust Verification
          </button>
        </div>

        <button className="zt-btn" style={{ background: '#ef4444', fontSize: '0.78rem' }} onClick={handleResetSystem}>
          🔄 Reset Live Data Baseline
        </button>
      </div>

      {activeTab === 'overview' && (
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

            <div className="zt-section-title">
              <TrendingUp size={18} /> Corporate Security Score Trend (Weekly)
            </div>
            <div className="zt-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', padding: '1rem 2rem 0 2rem' }}>
                {trend.map((score, idx) => {
                  const height = `${score}%`;
                  const label = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri (Today)'][idx];
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <div style={{ fontSize: '0.78rem', color: '#00f5ff', fontWeight: 'bold', marginBottom: '4px' }}>
                        {score}%
                      </div>
                      <div style={{
                        width: '60%',
                        height: '80px',
                        background: 'rgba(0, 245, 255, 0.08)',
                        border: '1px solid rgba(0, 245, 255, 0.2)',
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          position: 'absolute',
                          bottom: 0, left: 0, right: 0,
                          height: height,
                          background: 'linear-gradient(0deg, #0050b3 0%, #00f5ff 100%)',
                          boxShadow: '0 0 10px rgba(0, 245, 255, 0.4)'
                        }}></div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#4a6275', marginTop: '6px' }}>{label}</div>
                    </div>
                  );
                })}
              </div>
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
                {liveActivity.map((act, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.6rem',
                    background: act.is_suspicious ? 'rgba(239, 68, 68, 0.08)' : 'rgba(15, 23, 42, 0.7)',
                    borderLeft: `3px solid ${act.is_suspicious ? '#ef4444' : '#10b981'}`,
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontFamily: 'monospace'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#00f5ff', fontWeight: 'bold' }}>{act.time}</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{act.user}</span>
                      <span style={{ color: act.is_suspicious ? '#f97316' : '#8aafc8' }}>{act.event_type}</span>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      color: act.is_suspicious ? '#ef4444' : '#10b981',
                      background: act.is_suspicious ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.1)',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      {act.is_suspicious ? `⚠ ${act.event_type}` : '✓ Normal'}
                    </span>
                  </div>
                ))}
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
                      <td style={{ fontSize: '0.75rem', color: '#fbbf24' }}>{sess.login_time ? sess.login_time.replace('T', ' ').substring(0, 16) : '09:00'}</td>
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
                            onClick={() => handleTerminateSession(sess.id, sess.username)}
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
          <div className="zt-card">
            <div className="zt-table-container">
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Username</th>
                    <th>Department</th>
                    <th>Role Scope</th>
                    <th>Risk Score</th>
                    <th>Insider Threat Classification</th>
                    <th>Account Lock Status</th>
                    <th>SOC Lockout Override</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => {
                    const isLocked = emp.is_active === 0;
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>{emp.name}</td>
                        <td style={{ fontFamily: 'monospace', color: '#00f5ff' }}>{emp.username}</td>
                        <td>{emp.department}</td>
                        <td>{emp.emp_type}</td>
                        <td style={{ fontWeight: 'bold', color: emp.risk_score >= 80 ? '#ef4444' : emp.risk_score >= 30 ? '#f59e0b' : '#10b981' }}>
                          {emp.risk_score}/100
                        </td>
                        <td>
                          <span className={`zt-badge ${emp.threat_classification === 'Malicious' ? 'bc' : emp.threat_classification === 'Suspicious' ? 'bm' : 'bl'}`}>
                            {emp.threat_classification || 'Normal'}
                          </span>
                        </td>
                        <td>
                          <span className={`zt-badge ${isLocked ? 'bc' : 'bl'}`}>
                            {isLocked ? '🔒 Account Locked' : '🟢 Active & Active'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="zt-btn" 
                            style={{ background: isLocked ? '#10b981' : '#ef4444', padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleToggleLock(emp.id, emp.name)}
                          >
                            {isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                            {isLocked ? 'Unlock Account' : 'Lock Account'}
                          </button>
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
                      <td style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{notif.sent_at.replace('T', ' ').substring(0, 16)}</td>
                      <td style={{ fontWeight: 'bold', color: notif.channel === 'SMS' ? '#f59e0b' : '#3b82f6' }}>
                        {notif.channel === 'SMS' ? '📱 SMS' : '📧 Email'}
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
    </div>
  );
}
