import React, { useState, useEffect } from 'react';
import { 
  Sun, Moon, Settings, Menu, X, 
  Shield, Check, LogOut, Sparkles, Sliders,
  Volume2, VolumeX, Clock, Activity, Monitor
} from 'lucide-react';
import NotificationCenter from './NotificationCenter';

export default function GlobalHeader({ 
  user, 
  token, 
  page, 
  theme, 
  onToggleTheme, 
  mobileNavOpen, 
  onToggleMobileNav,
  onLogout 
}) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Realistic Enterprise Preferences
  const [density, setDensity] = useState(() => localStorage.getItem('ztn_density') || 'comfortable');
  const [refreshRate, setRefreshRate] = useState(() => localStorage.getItem('ztn_refresh_rate') || '15');
  const [audioAlerts, setAudioAlerts] = useState(() => localStorage.getItem('ztn_audio_alerts') !== 'false');
  const [sessionLock, setSessionLock] = useState(() => localStorage.getItem('ztn_session_lock') || '30');

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    localStorage.setItem('ztn_density', density);
  }, [density]);

  const handleDensityChange = (val) => {
    setDensity(val);
  };

  const handleRefreshRateChange = (val) => {
    setRefreshRate(val);
    localStorage.setItem('ztn_refresh_rate', val);
  };

  const handleAudioToggle = () => {
    setAudioAlerts(prev => {
      const next = !prev;
      localStorage.setItem('ztn_audio_alerts', String(next));
      return next;
    });
  };

  const handleSessionLockChange = (val) => {
    setSessionLock(val);
    localStorage.setItem('ztn_session_lock', val);
  };

  const getPageTitle = () => {
    switch (page) {
      case 'dashboard': return 'SOC Command Center';
      case 'ueba': return 'Threat Detection & UEBA';
      case 'incidents': return 'Incident Response Cases';
      case 'policies': return 'Zero Trust Policies';
      case 'copilot': return 'AI Security Copilot';
      case 'simulation': return 'Breach Attack Simulation';
      case 'forecast': return 'Risk Projections & Forecast';
      case 'audit': return 'Immutable Audit Logs';
      case 'reports': return 'Compliance Reports & PDF';
      case 'sandbox': return 'Threat Sandbox';
      case 'emp_dashboard': return 'Employee Security Portal';
      case 'emp_timeline': return 'Session Activity Timeline';
      case 'emp_security': return 'Security Standing & Guardrails';
      default: return 'ZeroTrustNet Platform';
    }
  };

  return (
    <>
      <header className="zt-global-header">
        {/* Left Side: Mobile Menu Button & Breadcrumb */}
        <div className="hdr-left">
          {onToggleMobileNav && (
            <button 
              type="button" 
              className="hdr-icon-btn mobile-menu-btn"
              onClick={onToggleMobileNav}
              title={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}

          <div className="hdr-breadcrumb">
            <div className="hdr-page-title">
              <span className="hdr-shield-icon">🛡️</span>
              <span className="hdr-title-text">{getPageTitle()}</span>
            </div>
            <div className="hdr-telemetry-badge">
              <span className="live-dot"></span>
              <span className="telemetry-text">
                {user?.role === 'admin' ? 'Continuous SOC Telemetry Active' : 'Session Verified & Protected'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action Icons (Theme, Settings, Notifications, Profile) */}
        <div className="hdr-right">
          {/* Quick Theme Toggle */}
          <button 
            type="button" 
            className={`hdr-icon-btn theme-btn ${theme === 'dark' ? 'is-dark' : 'is-light'}`}
            onClick={onToggleTheme}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme mode"
          >
            {theme === 'dark' ? (
              <Sun size={18} className="theme-icon sun-icon" />
            ) : (
              <Moon size={18} className="theme-icon moon-icon" />
            )}
          </button>

          {/* Unified Realistic Settings Icon */}
          <button 
            type="button" 
            className="hdr-icon-btn settings-btn"
            onClick={() => setShowSettingsModal(true)}
            title="Platform & SOC Settings"
            aria-label="Open Settings"
          >
            <Settings size={18} />
          </button>

          {/* Notification Center */}
          {token && <NotificationCenter token={token} />}

          {/* User Profile Pill & Quick Logout */}
          {user && (
            <div className="hdr-user-pill">
              <div className="user-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role">{user.role === 'admin' ? 'SOC Analyst' : user.department || 'Employee'}</span>
              </div>
              {onLogout && (
                <button 
                  type="button" 
                  className="hdr-logout-btn" 
                  onClick={onLogout}
                  title="Log out session"
                >
                  <LogOut size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Realistic Enterprise Settings Modal */}
      {showSettingsModal && (
        <div className="zt-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="zt-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div className="settings-title">
                <Settings size={20} className="icon-cyan" />
                <span>Platform & SOC Settings</span>
              </div>
              <button 
                type="button" 
                className="close-btn"
                onClick={() => setShowSettingsModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="settings-modal-body">
              {/* 1. Theme Appearance */}
              <div className="settings-section">
                <div className="section-label">
                  <Sparkles size={16} className="icon-cyan" />
                  <span>Theme Appearance</span>
                </div>
                <div className="theme-options-grid">
                  <div 
                    className={`theme-card ${theme === 'dark' ? 'selected' : ''}`}
                    onClick={() => {
                      if (theme !== 'dark') onToggleTheme();
                    }}
                  >
                    <div className="theme-preview dark-preview">
                      <div className="preview-topbar"></div>
                      <div className="preview-content">
                        <div className="preview-card"></div>
                        <div className="preview-card"></div>
                      </div>
                    </div>
                    <div className="theme-card-info">
                      <div className="theme-name">
                        <Moon size={15} /> Dark Theme (SOC Cyber)
                      </div>
                      <div className="theme-desc">High-contrast cyber dark with neon accents for SOC monitoring</div>
                    </div>
                    {theme === 'dark' && <div className="selected-check"><Check size={14} /></div>}
                  </div>

                  <div 
                    className={`theme-card ${theme === 'light' ? 'selected' : ''}`}
                    onClick={() => {
                      if (theme !== 'light') onToggleTheme();
                    }}
                  >
                    <div className="theme-preview light-preview">
                      <div className="preview-topbar"></div>
                      <div className="preview-content">
                        <div className="preview-card"></div>
                        <div className="preview-card"></div>
                      </div>
                    </div>
                    <div className="theme-card-info">
                      <div className="theme-name">
                        <Sun size={15} /> Light Theme (Enterprise)
                      </div>
                      <div className="theme-desc">Clean, modern enterprise layout for reports and audit clarity</div>
                    </div>
                    {theme === 'light' && <div className="selected-check"><Check size={14} /></div>}
                  </div>
                </div>
              </div>

              {/* 2. Display Density */}
              <div className="settings-section">
                <div className="section-label">
                  <Sliders size={16} className="icon-cyan" />
                  <span>SOC Interface Density</span>
                </div>
                <div className="density-options-grid">
                  <div 
                    className={`density-card ${density === 'comfortable' ? 'selected' : ''}`}
                    onClick={() => handleDensityChange('comfortable')}
                  >
                    <div className="density-title">
                      <Monitor size={16} /> Comfortable (Standard)
                    </div>
                    <div className="density-desc">Spacious balanced card padding and relaxed table spacing</div>
                    {density === 'comfortable' && <div className="selected-check"><Check size={14} /></div>}
                  </div>

                  <div 
                    className={`density-card ${density === 'compact' ? 'selected' : ''}`}
                    onClick={() => handleDensityChange('compact')}
                  >
                    <div className="density-title">
                      <Sliders size={16} /> Compact (High-Density SOC)
                    </div>
                    <div className="density-desc">Tighter telemetry rows and metrics for multi-monitor desks</div>
                    {density === 'compact' && <div className="selected-check"><Check size={14} /></div>}
                  </div>
                </div>
              </div>

              {/* 3. Real-Time Telemetry Polling Rate */}
              <div className="settings-section">
                <div className="section-label">
                  <Activity size={16} className="icon-cyan" />
                  <span>Telemetry & SIEM Refresh Rate</span>
                </div>
                <div className="refresh-rate-pills">
                  {[
                    { val: '5', label: '5s (Real-Time SIEM)' },
                    { val: '15', label: '15s (Balanced)' },
                    { val: '30', label: '30s (Eco Mode)' }
                  ].map(r => (
                    <button
                      key={r.val}
                      type="button"
                      className={`refresh-pill ${refreshRate === r.val ? 'active' : ''}`}
                      onClick={() => handleRefreshRateChange(r.val)}
                    >
                      {refreshRate === r.val && <Check size={13} />}
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Threat Alert Audio & Session Timeout */}
              <div className="settings-section settings-toggles-row">
                <div className="setting-toggle-card" onClick={handleAudioToggle}>
                  <div className="toggle-info">
                    <div className="toggle-title">
                      {audioAlerts ? <Volume2 size={16} className="icon-cyan" /> : <VolumeX size={16} className="icon-muted" />}
                      <span>Critical (P1) Threat Audio Alert</span>
                    </div>
                    <div className="toggle-sub">Sound notification chime when critical threat triggers</div>
                  </div>
                  <div className={`switch-toggle ${audioAlerts ? 'on' : 'off'}`}>
                    <div className="switch-thumb"></div>
                  </div>
                </div>

                <div className="setting-select-card">
                  <div className="select-info">
                    <div className="select-title">
                      <Clock size={16} className="icon-cyan" />
                      <span>Security Session Inactivity Lock</span>
                    </div>
                    <div className="select-sub">Automatically lock console after idle period</div>
                  </div>
                  <select 
                    className="settings-select"
                    value={sessionLock}
                    onChange={(e) => handleSessionLockChange(e.target.value)}
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">60 Minutes</option>
                  </select>
                </div>
              </div>

              {/* 5. Zero Trust Architecture Status */}
              <div className="settings-section">
                <div className="telemetry-box">
                  <div className="telemetry-head">
                    <Shield size={16} className="icon-green" />
                    <span>NIST 800-207 Zero Trust Engine Active</span>
                  </div>
                  <p>
                    Continuous real-time verification of Identity, Device Posture, UEBA Multi-Algorithm Risk, and Dynamic Access Guardrails.
                  </p>
                </div>
              </div>
            </div>

            <div className="settings-modal-footer">
              <button 
                type="button" 
                className="zt-btn"
                style={{ width: '100%' }}
                onClick={() => setShowSettingsModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
