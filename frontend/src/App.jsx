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
import EmployeeDashboard from './pages/EmployeeDashboard';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import NotificationCenter from './components/NotificationCenter';
import GlobalHeader from './components/GlobalHeader';
import SecurityTelemetry from './components/SecurityTelemetry';
import DLPProtection from './components/DLPProtection';
import { formatLocalDateTime, formatShortTime } from './utils/timeFormat';

import { 
  LayoutDashboard, Users, AlertTriangle, ShieldAlert, Cpu, Zap, 
  TrendingUp, FileText, HelpCircle, LogOut, Clock, ShieldCheck,
  Sun, Moon, Monitor, Smartphone, Menu, X, User, Briefcase,
  ChevronLeft, ChevronRight, GripVertical, RotateCcw
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

  // Theme (Dark / Light) State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ztn_theme') || 'dark';
  });

  // Site Mode (Desktop Site / Mobile Site) State
  const [siteMode, setSiteMode] = useState(() => {
    return localStorage.getItem('ztn_site_mode') || 'desktop';
  });

  // Mobile Drawer Navigation State
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Adjustable Sidebar State & Persistence
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('ztn_sidebar_width');
    const parsed = parseInt(saved, 10);
    return !isNaN(parsed) && parsed >= 190 && parsed <= 500 ? parsed : 295;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('ztn_sidebar_collapsed') === 'true';
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleResetWidth = () => {
    setSidebarWidth(295);
    setIsSidebarCollapsed(false);
    localStorage.setItem('ztn_sidebar_width', '295');
    localStorage.setItem('ztn_sidebar_collapsed', 'false');
  };

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('ztn_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const currentX = e.clientX;
      if (currentX < 140) {
        setIsSidebarCollapsed(true);
        localStorage.setItem('ztn_sidebar_collapsed', 'true');
      } else {
        const clamped = Math.min(Math.max(currentX, 190), 500);
        setSidebarWidth(clamped);
        setIsSidebarCollapsed(false);
        localStorage.setItem('ztn_sidebar_width', String(clamped));
        localStorage.setItem('ztn_sidebar_collapsed', 'false');
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('resizing-sidebar');
    } else {
      document.body.classList.remove('resizing-sidebar');
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing-sidebar');
    };
  }, [isResizing]);

  // Sync theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ztn_theme', theme);
  }, [theme]);

  // Sync site mode to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-site-mode', siteMode);
    localStorage.setItem('ztn_site_mode', siteMode);
  }, [siteMode]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleSiteMode = () => {
    setSiteMode(prev => (prev === 'desktop' ? 'mobile' : 'desktop'));
  };

  const handleToggleMobileNav = () => {
    setMobileNavOpen(prev => !prev);
  };

  const handlePageSelect = (targetPage) => {
    setPage(targetPage);
    setMobileNavOpen(false);
  };

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
    return (
      <>
        <DLPProtection user={null} token={null} />
        <Login 
          onLoginSuccess={handleLoginSuccess} 
          theme={theme}
          onToggleTheme={handleToggleTheme}
          siteMode={siteMode}
          onToggleSiteMode={handleToggleSiteMode}
        />
      </>
    );
  }

  // Render Page Content
  const renderContent = () => {
    if (page === 'profile') {
      return (
        <Profile 
          token={token} 
          user={user} 
          onBack={() => setPage(user.role === 'admin' ? 'dashboard' : 'emp_dashboard')} 
        />
      );
    }

    if (user.role === 'admin') {
      const validAdminPages = ['dashboard', 'ueba', 'incidents', 'policies', 'copilot', 'simulation', 'forecast', 'audit', 'reports'];
      const activePage = validAdminPages.includes(page) ? page : 'dashboard';

      return (
        <>
          <div style={{ display: activePage === 'dashboard' ? 'block' : 'none' }}>
            <AdminDashboard token={token} user={user} onLogout={handleLogout} isActive={activePage === 'dashboard'} />
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
                            <div className="tl-t">{formatShortTime(event.time)}</div>
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
                                  {formatLocalDateTime(log.timestamp)}
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
            <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
              <SecurityTelemetry token={token} user={user} initialData={empData} />
            </div>
          );

        default:
          return <EmployeeDashboard token={token} user={user} onPageChange={setPage} />;
      }
    }
  };

  return (
    <div 
      className={`zt-container ${siteMode === 'mobile' ? 'site-mode-mobile' : 'site-mode-desktop'}`}
      style={{
        '--sidebar-width': isSidebarCollapsed ? '72px' : `${sidebarWidth}px`
      }}
    >
      {/* Mobile Drawer Backdrop */}
      {mobileNavOpen && (
        <div 
          className="mobile-drawer-backdrop" 
          onClick={() => setMobileNavOpen(false)} 
        />
      )}

      {/* Navigation Sidebar */}
      <div 
        className={`zt-sidebar ${mobileNavOpen ? 'mobile-open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''} ${isResizing ? 'is-resizing' : ''}`}
        style={{
          width: isSidebarCollapsed ? '72px' : `${sidebarWidth}px`,
          minWidth: isSidebarCollapsed ? '72px' : `${sidebarWidth}px`
        }}
      >
        {/* Sidebar Header: Brand & Collapse Toggle */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isSidebarCollapsed ? 'center' : 'space-between', 
          marginBottom: isSidebarCollapsed ? '0.85rem' : '0.4rem', 
          width: '100%',
          position: 'relative' 
        }}>
          {!isSidebarCollapsed ? (
            <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <span style={{ fontSize: '1.35rem', flexShrink: 0 }}>🛡️</span>
              <span style={{ fontSize: '1.25rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>ZeroTrustNet</span>
            </div>
          ) : (
            <div 
              onClick={handleToggleCollapse}
              title="ZeroTrustNet · Click to expand sidebar"
              style={{ fontSize: '1.5rem', cursor: 'pointer', textAlign: 'center' }}
            >
              🛡️
            </div>
          )}
          <button 
            type="button"
            className="sidebar-toggle-btn"
            onClick={handleToggleCollapse}
            title={isSidebarCollapsed ? "Expand sidebar (or drag border)" : "Collapse sidebar"}
            style={{
              background: 'rgba(0, 245, 255, 0.08)',
              border: '1px solid rgba(0, 245, 255, 0.2)',
              borderRadius: '6px',
              color: 'var(--accent-cyan)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              padding: 0,
              flexShrink: 0,
              transition: 'all 0.2s ease'
            }}
          >
            {isSidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {!isSidebarCollapsed && (
          <div className="sb-logo" style={{ marginTop: '0.1rem', paddingTop: '0.2rem', paddingBottom: '0.8rem' }}>
            <div className="tagline" style={{ fontSize: '0.66rem', lineHeight: '1.25', color: '#38bdf8', marginTop: '1px', whiteSpace: 'normal' }}>
              Multi-algorithmic framework for Insider threat detection
            </div>
            <div className="status" style={{ marginTop: '6px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 5px #22c55e' }}></span>
              {user.role === 'admin' ? 'SOC Engine Active' : 'Session Verified'}
            </div>
          </div>
        )}

        {/* User Card */}
        {!isSidebarCollapsed ? (
          <div 
            onClick={() => handlePageSelect('profile')}
            title="Click to view Zero Trust Profile"
            className={`sidebar-user-badge ${page === 'profile' ? 'active-page' : ''}`}
          >
            <div>
              Logged in as <strong className="sidebar-user-name">{user.name}</strong>
            </div>
            <div className="sidebar-user-role">
              {user.role === 'admin' ? 'Admin / SOC Analyst' : `${user.department} Department`}
            </div>
          </div>
        ) : (
          <div
            onClick={() => handlePageSelect('profile')}
            title={`Logged in as ${user.name} (${user.role === 'admin' ? 'Admin' : user.department})`}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: page === 'profile' ? 'rgba(0, 245, 255, 0.25)' : 'rgba(0, 245, 255, 0.08)',
              border: '1px solid rgba(0, 245, 255, 0.3)',
              color: 'var(--accent-cyan)',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.8rem',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
        )}

        {/* Navigation Menu */}
        <div className="nav-menu" style={{ width: '100%' }}>
          {user.role === 'admin' ? (
            <>
              <button className={`nav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => handlePageSelect('dashboard')} title="SOC Dashboard">
                <LayoutDashboard size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>SOC Dashboard</span>}
              </button>
              <button className={`nav-item ${page === 'profile' ? 'active' : ''}`} onClick={() => handlePageSelect('profile')} title="Identity Profile">
                <User size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Identity Profile</span>}
              </button>
              <button className={`nav-item ${page === 'ueba' ? 'active' : ''}`} onClick={() => handlePageSelect('ueba')} title="Threat Detection & UEBA">
                <Users size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Threat Detection & UEBA</span>}
              </button>
              <button className={`nav-item ${page === 'incidents' ? 'active' : ''}`} onClick={() => handlePageSelect('incidents')} title="Incident Cases">
                <AlertTriangle size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Incident Cases</span>}
              </button>
              <button className={`nav-item ${page === 'policies' ? 'active' : ''}`} onClick={() => handlePageSelect('policies')} title="Trust Policies">
                <ShieldAlert size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Trust Policies</span>}
              </button>
              <button className={`nav-item ${page === 'copilot' ? 'active' : ''}`} onClick={() => handlePageSelect('copilot')} title="AI Security Copilot">
                <Cpu size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>AI Security Copilot</span>}
              </button>
              <button className={`nav-item ${page === 'simulation' ? 'active' : ''}`} onClick={() => handlePageSelect('simulation')} title="Attack Simulation">
                <Zap size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Attack Simulation</span>}
              </button>
              <button className={`nav-item ${page === 'forecast' ? 'active' : ''}`} onClick={() => handlePageSelect('forecast')} title="Projections & Forecast">
                <TrendingUp size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Projections & Forecast</span>}
              </button>
              <button className={`nav-item ${page === 'audit' ? 'active' : ''}`} onClick={() => handlePageSelect('audit')} title="Immutable Audits">
                <FileText size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Immutable Audits</span>}
              </button>
              <button className={`nav-item ${page === 'reports' ? 'active' : ''}`} onClick={() => handlePageSelect('reports')} title="Reports & PDF Exporter">
                <FileText size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Reports & PDF Exporter</span>}
              </button>
            </>
          ) : (
            <>
              <button className={`nav-item ${page === 'emp_dashboard' ? 'active' : ''}`} onClick={() => handlePageSelect('emp_dashboard')} title="My Workspace">
                <Briefcase size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>My Workspace</span>}
              </button>
              <button className={`nav-item ${page === 'profile' ? 'active' : ''}`} onClick={() => handlePageSelect('profile')} title="My Security Profile">
                <User size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>My Security Profile</span>}
              </button>
              <button className={`nav-item ${page === 'emp_timeline' ? 'active' : ''}`} onClick={() => handlePageSelect('emp_timeline')} title="My Session Timeline">
                <Clock size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>My Session Timeline</span>}
              </button>
              <button className={`nav-item ${page === 'emp_security' ? 'active' : ''}`} onClick={() => handlePageSelect('emp_security')} title="My Security Standing">
                <ShieldCheck size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>My Security Standing</span>}
              </button>
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer" style={{ width: '100%' }}>
          <button 
            className="nav-item critical" 
            onClick={handleLogout} 
            title="Log Out Session" 
            style={{ 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' 
            }}
          >
            <LogOut size={16} /> {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Log Out Session</span>}
          </button>
          {!isSidebarCollapsed && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem', letterSpacing: '0.5px', lineHeight: '1.4' }}>
              ZeroTrustNet v5.0<br />Never Trust · Always Verify
            </div>
          )}
        </div>

        {/* 📏 Adjustable Resizer Border Handle */}
        <div 
          className="sidebar-resizer"
          onMouseDown={startResizing}
          onDoubleClick={handleResetWidth}
          title="Drag left/right to adjust sidebar width · Double-click to reset (295px)"
        >
          <div className="resizer-handle-pill">
            <GripVertical size={11} />
          </div>
        </div>
      </div>

      {/* Main Content Dispatcher */}
      <div className="zt-main-content">
        {/* Global Zero Trust DLP Anti-Screenshot Protection */}
        <DLPProtection user={user} token={token} />
        {/* Global Top Header Bar with Theme & Site Mode Icons on Every Page */}
        <GlobalHeader 
          user={user}
          token={token}
          page={page}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          siteMode={siteMode}
          onToggleSiteMode={handleToggleSiteMode}
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={handleToggleMobileNav}
          onLogout={handleLogout}
          onNavigatePage={handlePageSelect}
        />

        {renderContent()}
      </div>
    </div>
  );
}
