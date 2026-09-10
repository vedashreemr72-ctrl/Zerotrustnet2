import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ThreatDetection from './pages/ThreatDetection';
import IncidentResponse from './pages/IncidentResponse';
import PolicyEngine from './pages/PolicyEngine';
import AICopilot from './pages/AICopilot';
import AttackSimulation from './pages/AttackSimulation';
import Forecast from './pages/Forecast';
import AuditLogs from './pages/AuditLogs';
import Sandbox from './pages/Sandbox';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Reports from './pages/Reports';
import NotificationCenter from './components/NotificationCenter';

import { 
  LayoutDashboard, Users, AlertTriangle, ShieldAlert, Cpu, Zap, 
  TrendingUp, FileText, HelpCircle, LogOut, Clock, ShieldCheck 
} from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('ztn_token');
    return (t && t !== 'null' && t !== 'undefined') ? t : '';
  });
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ztn_user');
      if (!stored || stored === 'null' || stored === 'undefined') return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState('dashboard');
  const [empData, setEmpData] = useState(null);

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        console.warn("Logout request failed:", e);
      }
    }
    setToken('');
    setUser(null);
    localStorage.removeItem('ztn_token');
    localStorage.removeItem('ztn_user');
  };

  // Verify token validity with backend on app load
  useEffect(() => {
    if (token) {
      fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) {
          handleLogout();
        }
      })
      .catch(() => {
        // If network issue, allow component error handling
      });
    }
  }, []);

  // Sync token to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('ztn_token', token);
    } else {
      localStorage.removeItem('ztn_token');
    }
  }, [token]);

  // Sync user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('ztn_user', JSON.stringify(user));
      // Default page by role
      if (user.role === 'admin') {
        setPage('dashboard');
      } else {
        setPage('emp_dashboard');
      }
    } else {
      localStorage.removeItem('ztn_user');
      setPage('dashboard');
    }
  }, [user]);

  // Fetch employee specific detailed context (for timeline/security views)
  useEffect(() => {
    if (token && user && user.role === 'employee') {
      const fetchEmpDetails = async () => {
        try {
          const response = await fetch('/api/employee/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.status === 401) {
            handleLogout();
            return;
          }
          const res = await response.json();
          if (response.ok) {
            setEmpData(res);
          }
        } catch (err) {
          console.error("Failed to load employee timeline logs:", err);
        }
      };
      fetchEmpDetails();
    } else {
      setEmpData(null);
    }
  }, [token, user, page]);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render Page Content
  const renderContent = () => {
    if (user.role === 'admin') {
      const validAdminPages = ['dashboard', 'ueba', 'incidents', 'policies', 'copilot', 'simulation', 'forecast', 'audit', 'reports', 'sandbox'];
      const activePage = validAdminPages.includes(page) ? page : 'dashboard';

      return (
        <>
          <div style={{ display: activePage === 'dashboard' ? 'block' : 'none' }}>
            <AdminDashboard token={token} user={user} onLogout={handleLogout} />
          </div>
          <div style={{ display: activePage === 'ueba' ? 'block' : 'none' }}>
            <ThreatDetection token={token} />
          </div>
          <div style={{ display: activePage === 'incidents' ? 'block' : 'none' }}>
            <IncidentResponse token={token} />
          </div>
          <div style={{ display: activePage === 'policies' ? 'block' : 'none' }}>
            <PolicyEngine token={token} />
          </div>
          <div style={{ display: activePage === 'copilot' ? 'block' : 'none' }}>
            <AICopilot token={token} />
          </div>
          <div style={{ display: activePage === 'simulation' ? 'block' : 'none' }}>
            <AttackSimulation token={token} />
          </div>
          <div style={{ display: activePage === 'forecast' ? 'block' : 'none' }}>
            <Forecast token={token} />
          </div>
          <div style={{ display: activePage === 'audit' ? 'block' : 'none' }}>
            <AuditLogs token={token} />
          </div>
          <div style={{ display: activePage === 'reports' ? 'block' : 'none' }}>
            <Reports token={token} />
          </div>
          <div style={{ display: activePage === 'sandbox' ? 'block' : 'none' }}>
            <Sandbox token={token} />
          </div>
        </>
      );
    } else {
      // Employee portal switcher
      switch (page) {
        case 'emp_dashboard':
          return <EmployeeDashboard token={token} user={user} onPageChange={setPage} onLogout={handleLogout} />;
        
        case 'emp_timeline':
          return (
            <div>
              <div className="zt-title">My Session Timeline</div>
              <div className="zt-subtitle">Continuous Monitoring Audit Log · Immutable Event Log</div>
              
              <div className="grid-2col" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
                <div>
                  <div className="zt-section-title">
                    <Clock size={18} /> Continuous Behavioral Timeline
                  </div>
                  <div className="zt-card" style={{ minHeight: '300px' }}>
                    {empData && empData.timeline ? (
                      <div className="tl-wrap">
                        {empData.timeline.map((event, idx) => (
                          <div key={idx} className={`tl-item ${event.flagged ? 'fl' : ''}`}>
                            <div className="tl-t">{event.time}</div>
                            <div className={`tl-d ${event.flagged ? 'fl-d' : ''}`}>{event.desc}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#4a6275', fontSize: '0.82rem' }}>No session events registered yet.</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="zt-section-title">
                    <FileText size={18} /> My Portal Audit Records
                  </div>
                  <div className="zt-card">
                    {empData && empData.recent_audit ? (
                      <div className="zt-table-container">
                        <table className="zt-table">
                          <thead>
                            <tr>
                              <th>Timestamp</th>
                              <th>Event Type</th>
                              <th>Details</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {empData.recent_audit.map((log, idx) => (
                              <tr key={idx}>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#4a6275' }}>
                                  {log.timestamp.replace('T', ' ').substring(0, 16)}
                                </td>
                                <td style={{ fontWeight: '600', color: log.is_suspicious ? '#ef4444' : '#c8d6e8' }}>
                                  {log.event_type}
                                </td>
                                <td style={{ fontSize: '0.8rem', color: '#8aafc8' }}>{log.details}</td>
                                <td>
                                  <span className={`zt-badge ${log.is_suspicious ? 'bc' : 'bl'}`}>
                                    {log.is_suspicious ? 'Flagged' : 'Normal'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ color: '#4a6275', fontSize: '0.82rem' }}>No audit trails loaded.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );

        case 'emp_security':
          return (
            <div>
              <div className="zt-title">My Security Standing</div>
              <div className="zt-subtitle">Continuous Risk Profile · Dynamic Policies · Standards Check</div>

              <div className="grid-2col">
                <div>
                  <div className="zt-section-title">
                    <ShieldCheck size={18} /> Real-Time Policy Parameters
                  </div>
                  <div className="zt-card">
                    {empData && empData.baseline ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(0, 245, 255, 0.08)' }}>
                            <th style={{ textAlign: 'left', padding: '6px 0', color: '#4a6275' }}>Operational Metric</th>
                            <th style={{ textAlign: 'center', padding: '6px 0', color: '#4a6275' }}>Baseline Standard</th>
                            <th style={{ textAlign: 'center', padding: '6px 0', color: '#00f5ff' }}>Current Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid rgba(0, 245, 255, 0.04)' }}>
                            <td style={{ padding: '8px 0', color: '#8aafc8' }}>Daily Login window</td>
                            <td style={{ textAlign: 'center', color: '#4a6275' }}>{empData.baseline.login_time}</td>
                            <td style={{ textAlign: 'center', color: (empData.baseline.actual_login_hour < 7 || empData.baseline.actual_login_hour > 20) ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
                              {empData.baseline.actual_login_hour.toString().padStart(2, '0')}:00
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(0, 245, 255, 0.04)' }}>
                            <td style={{ padding: '8px 0', color: '#8aafc8' }}>Device registration</td>
                            <td style={{ textAlign: 'center', color: '#4a6275' }}>{empData.baseline.device}</td>
                            <td style={{ textAlign: 'center', color: empData.baseline.actual_device.includes('Unknown') ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
                              {empData.baseline.actual_device}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(0, 245, 255, 0.04)' }}>
                            <td style={{ padding: '8px 0', color: '#8aafc8' }}>Work location</td>
                            <td style={{ textAlign: 'center', color: '#4a6275' }}>{empData.baseline.location}</td>
                            <td style={{ textAlign: 'center', color: empData.baseline.actual_location !== empData.baseline.location ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
                              {empData.baseline.actual_location}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '8px 0', color: '#8aafc8' }}>File operations limits</td>
                            <td style={{ textAlign: 'center', color: '#4a6275' }}>{empData.baseline.file_access}/day</td>
                            <td style={{ textAlign: 'center', color: empData.baseline.actual_file_access > empData.baseline.file_access * 2.5 ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
                              {empData.baseline.actual_file_access}/day
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ color: '#4a6275', fontSize: '0.82rem' }}>Baseline parameters loading...</p>
                    )}
                  </div>

                  <div className="zt-section-title" style={{ marginTop: '1rem' }}>
                    <ShieldCheck size={18} /> Security Guardrails
                  </div>
                  <div className="zt-card" style={{ fontSize: '0.82rem', lineHeight: '1.8' }}>
                    <div style={{ color: '#00f5ff', fontWeight: 'bold', marginBottom: '4px' }}>Policies Checked:</div>
                    1. Unknown Device + Sensitive access outside business hours triggers MFA step-up.<br />
                    2. Downloads exceeding 100 files suspends accounts temporarily.<br />
                    3. Simultaneous logins from distinct locations lock sessions immediately.<br />
                    4. Pasting sensitive source code and data to public AI tools is blocked.
                  </div>
                </div>

                <div>
                  <div className="zt-section-title">
                    <ShieldCheck size={18} /> My Recommendations
                  </div>
                  <div className="zt-card">
                    {empData && empData.recommendations && empData.recommendations.length > 0 && empData.recommendations[0] !== 'No active recommendations — continue baseline monitoring' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '0.88rem' }}>⚠ Active Recommendations Pending:</div>
                        {empData.recommendations.map((rec, idx) => (
                          <div key={idx} style={{ color: '#c8d6e8', fontSize: '0.82rem' }}>
                            ▸ {rec}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '6px' }}>✓</div>
                        <div style={{ color: '#22c55e', fontWeight: 'bold' }}>Account in Good Standing</div>
                        <p style={{ fontSize: '0.78rem', color: '#4a6275', marginTop: '4px' }}>All actions align with organizational standards.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );

        default:
          return <EmployeeDashboard token={token} user={user} onPageChange={setPage} />;
      }
    }
  };

  return (
    <div className="zt-container">
      {/* Navigation Sidebar */}
      <div className="zt-sidebar">
        <div className="sb-logo">
          <div className="brand">🛡️ ZeroTrustNet</div>
          <div className="tagline" style={{ fontSize: '0.66rem', lineHeight: '1.25', color: '#38bdf8', marginTop: '3px' }}>
            AI Zero Trust Access Verification & Insider Threat Platform
          </div>
          <div className="status" style={{ marginTop: '6px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 5px #22c55e' }}></span>
            {user.role === 'admin' ? 'SOC Engine Active' : 'Session Verified'}
          </div>
        </div>

        <div style={{ fontSize: '0.72rem', color: '#3d5470', marginBottom: '0.8rem', padding: '0 6px' }}>
          Logged in as <b style={{ color: '#8aafc8' }}>{user.name}</b>
          <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px', color: '#4a6275' }}>
            {user.role === 'admin' ? 'Admin / SOC Analyst' : `${user.department} Department`}
          </div>
        </div>

        <div className="nav-menu">
          {user.role === 'admin' ? (
            <>
              <button className={`nav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>
                <LayoutDashboard size={16} /> SOC Dashboard
              </button>
              <button className={`nav-item ${page === 'ueba' ? 'active' : ''}`} onClick={() => setPage('ueba')}>
                <Users size={16} /> Threat Detection & UEBA
              </button>
              <button className={`nav-item ${page === 'incidents' ? 'active' : ''}`} onClick={() => setPage('incidents')}>
                <AlertTriangle size={16} /> Incident Cases
              </button>
              <button className={`nav-item ${page === 'policies' ? 'active' : ''}`} onClick={() => setPage('policies')}>
                <ShieldAlert size={16} /> Trust Policies
              </button>
              <button className={`nav-item ${page === 'copilot' ? 'active' : ''}`} onClick={() => setPage('copilot')}>
                <Cpu size={16} /> AI Security Copilot
              </button>
              <button className={`nav-item ${page === 'simulation' ? 'active' : ''}`} onClick={() => setPage('simulation')}>
                <Zap size={16} /> Attack Simulation
              </button>
              <button className={`nav-item ${page === 'forecast' ? 'active' : ''}`} onClick={() => setPage('forecast')}>
                <TrendingUp size={16} /> Projections & Forecast
              </button>
              <button className={`nav-item ${page === 'audit' ? 'active' : ''}`} onClick={() => setPage('audit')}>
                <FileText size={16} /> Immutable Audits
              </button>
              <button className={`nav-item ${page === 'reports' ? 'active' : ''}`} onClick={() => setPage('reports')}>
                <FileText size={16} /> Reports & PDF Exporter
              </button>
              <button className={`nav-item ${page === 'sandbox' ? 'active' : ''}`} onClick={() => setPage('sandbox')}>
                <HelpCircle size={16} /> Risk Sandbox
              </button>
            </>
          ) : (
            <>
              <button className={`nav-item ${page === 'emp_dashboard' ? 'active' : ''}`} onClick={() => setPage('emp_dashboard')}>
                <LayoutDashboard size={16} /> My Portal
              </button>
              <button className={`nav-item ${page === 'emp_timeline' ? 'active' : ''}`} onClick={() => setPage('emp_timeline')}>
                <Clock size={16} /> My Session Timeline
              </button>
              <button className={`nav-item ${page === 'emp_security' ? 'active' : ''}`} onClick={() => setPage('emp_security')}>
                <ShieldCheck size={16} /> My Security Standing
              </button>
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="nav-item critical" onClick={handleLogout} style={{ border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <LogOut size={16} /> Log Out Session
          </button>
          <div style={{ fontSize: '0.6rem', color: '#2d4060', textAlign: 'center', marginTop: '0.8rem', letterSpacing: '0.5px' }}>
            ZeroTrustNet v5.0<br />Never Trust · Always Verify
          </div>
        </div>
      </div>

      {/* Main Content Dispatcher */}
      <div className="zt-main-content">
        {user && user.role === 'admin' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.65rem 1.25rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(90deg, rgba(13, 27, 62, 0.65) 0%, rgba(3, 9, 30, 0.8) 100%)',
            border: '1px solid rgba(0, 245, 255, 0.2)',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '3px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: 600
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'pulse 1.8s infinite' }}></span>
                Continuous SOC Telemetry Active
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                • Auto-syncing enterprise employee activities & threat telemetry
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <NotificationCenter token={token} />
            </div>
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
}
