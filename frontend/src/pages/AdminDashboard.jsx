import React, { useState, useEffect } from 'react';
import { Shield, Users, FileText, AlertTriangle, Landmark, TrendingUp, Lock, Unlock, PhoneCall, Laptop, Activity } from 'lucide-react';

export default function AdminDashboard({ token, user }) {
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [deviceTrust, setDeviceTrust] = useState([]);
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
      const [dashRes, empRes, sessRes, notifRes, devRes] = await Promise.all([
        fetch('/api/admin/dashboard', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/employees', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/sessions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/notifications', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/device-trust', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const dashData = await parseJsonSafe(dashRes);
      const empData = await parseJsonSafe(empRes);
      const sessData = await parseJsonSafe(sessRes);
      const notifData = await parseJsonSafe(notifRes);
      const devData = await parseJsonSafe(devRes);

      if (!dashRes.ok) throw new Error(dashData.error || 'Failed to load SOC dashboard');
      
      setData(dashData);
      setEmployees(empData || []);
      setSessions(sessData || []);
      setNotifications(notifData || []);
      setDeviceTrust(devData || []);
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
      <div className="zt-title">Executive SOC & Insider Threat Dashboard</div>
      <div className="zt-subtitle">Continuous Zero Trust Monitoring · Automated Lockout · Session Management</div>

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

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="zt-metric-tile">
          <div className="val">{stats.total_monitored}</div>
          <div className="lbl">Users Monitored</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val" style={{ color: '#3b82f6' }}>{normalCount}</div>
          <div className="lbl">🟢 Normal Threat</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val" style={{ color: '#f59e0b' }}>{suspiciousCount}</div>
          <div className="lbl">🟡 Suspicious Threat</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val critical">{maliciousCount}</div>
          <div className="lbl">🔴 Malicious Threat</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val">{stats.active_sessions}</div>
          <div className="lbl">Active Sessions</div>
        </div>
        <div className="zt-metric-tile">
          <div className={`val ${stats.open_incidents > 0 ? 'critical' : 'safe'}`}>{stats.open_incidents}</div>
          <div className="lbl">Open Incidents</div>
        </div>
        <div className="zt-metric-tile">
          <div className={`val ${stats.security_score >= 70 ? 'safe' : stats.security_score >= 50 ? 'medium' : 'critical'}`}>
            {stats.security_score}%
          </div>
          <div className="lbl">Security Score</div>
        </div>
        <div className="zt-metric-tile">
          <div className={`val ${stats.financial_exposure > 500000 ? 'high' : 'safe'}`}>{expFormatted}</div>
          <div className="lbl">Financial Exposure</div>
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
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>Login Time</th>
                    <th>IP Address</th>
                    <th>Device</th>
                    <th>Risk Score</th>
                    <th>Threat Classification</th>
                    <th>Session Status</th>
                    <th>SOC Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((sess, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{sess.id.substring(0, 8)}...</td>
                      <td style={{ fontWeight: 'bold' }}>{sess.name} ({sess.username})</td>
                      <td>{sess.department}</td>
                      <td style={{ fontSize: '0.78rem', color: '#4a6275' }}>{sess.login_time.replace('T', ' ').substring(0, 16)}</td>
                      <td style={{ fontFamily: 'monospace', color: '#00f5ff' }}>{sess.ip_addr}</td>
                      <td style={{ fontSize: '0.8rem' }}>{sess.device}</td>
                      <td style={{ fontWeight: 'bold', color: sess.risk_score >= 80 ? '#ef4444' : sess.risk_score >= 30 ? '#f59e0b' : '#10b981' }}>
                        {sess.risk_score}/100
                      </td>
                      <td>
                        <span className={`zt-badge ${sess.threat_classification === 'Malicious' ? 'bc' : sess.threat_classification === 'Suspicious' ? 'bm' : 'bl'}`}>
                          {sess.threat_classification}
                        </span>
                      </td>
                      <td>
                        <span className={`zt-badge ${sess.is_active ? 'bl' : 'bc'}`}>
                          {sess.is_active ? 'Active Session' : 'Terminated / Expired'}
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
