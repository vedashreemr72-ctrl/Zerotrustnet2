import React, { useState, useEffect } from 'react';
import { Sun, Moon, Shield, Lock, Smartphone, Laptop, AlertTriangle, CheckCircle, RefreshCw, KeyRound, Globe, MapPin } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../supabaseClient';
import { fetchRealTimeLocation, setCustomLocation } from '../utils/geolocation';

const detectBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Microsoft Edge";
  if (ua.includes("Chrome")) return "Google Chrome 127";
  if (ua.includes("Firefox")) return "Mozilla Firefox";
  if (ua.includes("Safari")) return "Apple Safari";
  return "Google Chrome 127";
};

const detectOS = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Win")) return "Windows 11 Enterprise";
  if (ua.includes("Mac")) return "macOS Sequoia";
  if (ua.includes("Linux")) return "Linux Ubuntu 24.04";
  return "Windows 11 Enterprise";
};

const getDeviceId = () => {
  let devId = localStorage.getItem("ztn_device_id");
  if (!devId) {
    devId = "DEV-55357-WIN";
    localStorage.setItem("ztn_device_id", devId);
  }
  return devId;
};

export default function Login({ 
  onLoginSuccess,
  theme = 'dark',
  onToggleTheme,
  siteMode = 'desktop',
  onToggleSiteMode
}) {
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'employee'
  const [mode, setMode] = useState('login'); // 'login' or 'register'

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('admin');
  const [password, setPassword] = useState('admin123');
  
  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState('Engineering');
  const [regEmpType, setRegEmpType] = useState('Full-Time Employee');
  const [regDevice, setRegDevice] = useState('Corporate Laptop');
  const [regPhone, setRegPhone] = useState('');

  // Simulation & telemetry toggles
  const [simLocation, setSimLocation] = useState(() => {
    try {
      const custom = localStorage.getItem('ztn_user_custom_location');
      if (custom && custom.trim() && !custom.includes('Kasturba Road')) {
        return custom.trim();
      }
      const last = localStorage.getItem('ztn_last_location');
      if (last && !last.includes('Kasturba Road') && !last.includes('Offline')) {
        return last;
      }
      return 'Detecting location...';
    } catch {
      return 'Detecting location...';
    }
  });
  const [simDeviceId, setSimDeviceId] = useState(getDeviceId());
  const [isEditingLoc, setIsEditingLoc] = useState(false);
  const [locInputVal, setLocInputVal] = useState('');
  const [isLocLoading, setIsLocLoading] = useState(false);

  const refreshLocation = async (force = true) => {
    setIsLocLoading(true);
    try {
      const loc = await fetchRealTimeLocation(force);
      if (loc && (loc.address || loc.shortLocation)) {
        const resolved = loc.address || loc.shortLocation;
        setSimLocation(resolved);
        try { localStorage.setItem('ztn_last_location', resolved); } catch {}
      }
    } catch (err) {
      console.warn('Real-time location detection fallback:', err);
    } finally {
      setIsLocLoading(false);
    }
  };

  // Automatically fetch genuine real-time physical address on load
  useEffect(() => {
    refreshLocation(false);
  }, []);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const browserName = detectBrowser();
  const osName = detectOS();
  const supabaseActive = isSupabaseConfigured();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      let effectiveLocation = simLocation;
      if (!effectiveLocation || effectiveLocation === 'Detecting location...') {
        try {
          const loc = await fetchRealTimeLocation();
          effectiveLocation = loc.address || loc.shortLocation || 'Bengaluru, Karnataka, India';
          setSimLocation(effectiveLocation);
          try { localStorage.setItem('ztn_last_location', effectiveLocation); } catch {}
        } catch {
          effectiveLocation = 'Bengaluru, Karnataka, India';
        }
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginIdentifier,
          email: loginIdentifier.includes('@') ? loginIdentifier : '',
          password: password,
          role: activeTab,
          device_id: simDeviceId,
          browser: browserName,
          os: osName,
          location: effectiveLocation,
          login_time: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.pending_approval) {
          throw new Error(`⏳ Registration Pending Approval: ${data.error}`);
        }
        if (data.rejected) {
          throw new Error(`⛔ Registration Rejected: ${data.error}`);
        }
        throw new Error(data.error || 'Authentication failed');
      }

      // Direct login without OTP
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const effectiveLoc = (simLocation && simLocation !== 'Detecting location...') 
        ? simLocation 
        : (localStorage.getItem('ztn_last_location') || 'Bengaluru, Karnataka, India');

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail || `${regUsername}@zerotrustnet.io`,
          username: regUsername,
          password: regPassword,
          department: regDepartment,
          emp_type: regEmpType,
          device: regDevice,
          phone: regPhone,
          location: effectiveLoc
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.pending_approval) {
        setSuccessMsg(`⏳ ${data.message}`);
      } else {
        setSuccessMsg(`✅ ${data.message}`);
      }
      setLoginIdentifier(regUsername);
      setPassword(regPassword);
      setMode('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMode('login');
    setError('');
    setSuccessMsg('');
    if (tab === 'admin') {
      setLoginIdentifier('admin');
      setPassword('admin123');
      setSimDeviceId('DEV-CORP-ADMIN-01');
    } else {
      setLoginIdentifier('');
      setPassword('');
      setSimDeviceId('DEV-CORP-EMP-01');
    }
  };

  return (
    <div className="login-wrap">
      {/* Top Header Controls: Theme and Mode */}
      <div className="login-header-controls">
        {onToggleTheme && (
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
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        )}
      </div>

      <div className="zt-card login-card" style={{ maxWidth: '480px', width: '100%', backdropFilter: 'blur(16px)' }}>
        <div className="login-hero" style={{ textAlign: 'center' }}>
          <div className="logo" style={{ fontSize: '1.7rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            🛡️ ZeroTrustNet
          </div>
          <div className="tagline" style={{ fontSize: '0.84rem', color: '#00f5ff', fontWeight: 'bold', marginTop: '4px', lineHeight: '1.3' }}>
            Multi-algorithmic framework for Insider threat detection
          </div>
        </div>

        {/* Zero Trust Security Indicator */}
        <div style={{
          margin: '0.9rem 0',
          padding: '0.65rem 0.85rem',
          background: 'rgba(0, 245, 255, 0.05)',
          border: '1px solid rgba(0, 245, 255, 0.2)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.74rem'
        }}>
          <span style={{ fontSize: '1rem' }}>⚡</span>
          <div>
            <strong style={{ color: '#e2e8f0' }}>Zero Trust Security Engine: Active</strong>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Continuous Behavioral Verification · UEBA Risk Scoring</div>
          </div>
        </div>

        {/* Portal Role Tabs */}
        <div className="tabs-header">
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => handleTabChange('admin')}
          >
            🔐 Admin / SOC
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'employee' ? 'active' : ''}`}
            onClick={() => handleTabChange('employee')}
          >
            👤 Employee Portal
          </button>
        </div>

        {/* Register / Login Toggle for Employees */}
        {activeTab === 'employee' && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1rem',
            background: 'rgba(0, 245, 255, 0.04)',
            padding: '4px',
            borderRadius: '6px',
            border: '1px solid rgba(0, 245, 255, 0.1)'
          }}>
            <button
              type="button"
              className={`zt-btn ${mode === 'login' ? '' : 'zt-btn-sec'}`}
              style={{ flex: 1, padding: '0.35rem', fontSize: '0.78rem' }}
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            >
              🔑 Employee Login
            </button>
            <button
              type="button"
              className={`zt-btn ${mode === 'register' ? '' : 'zt-btn-sec'}`}
              style={{ flex: 1, padding: '0.35rem', fontSize: '0.78rem' }}
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            >
              📝 Register Account
            </button>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid #10b981',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1rem',
            color: '#10b981',
            fontSize: '0.82rem',
            fontWeight: '600'
          }}>
            {successMsg}
          </div>
        )}

        {error && (
          <div style={{
            background: error.includes('Pending') || error.includes('pending') ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${error.includes('Pending') || error.includes('pending') ? '#eab308' : '#ef4444'}`,
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1rem',
            color: error.includes('Pending') || error.includes('pending') ? '#fbbf24' : '#ef4444',
            fontSize: '0.82rem',
            fontWeight: '600',
            lineHeight: '1.45'
          }}>
            {error.startsWith('⏳') || error.startsWith('⛔') ? error : `❌ ${error}`}
          </div>
        )}

        {mode === 'login' || activeTab === 'admin' ? (
          /* STANDARD LOGIN FORM */
          <form onSubmit={handleLoginSubmit}>
            <div className="zt-input-group">
              <label>Email or Username</label>
              <input 
                type="text" 
                className="zt-input" 
                placeholder={activeTab === 'admin' ? 'e.g. admin or admin@zerotrustnet.io' : 'e.g. employee username or email'} 
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="zt-input-group">
              <label>Password</label>
              <input 
                type="password" 
                className="zt-input" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="zt-btn full-width" disabled={loading}>
              {loading ? 'Authenticating...' : `Login as ${activeTab === 'admin' ? 'Admin / SOC' : 'Employee'}`}
            </button>
          </form>
        ) : (
          /* EMPLOYEE REGISTRATION FORM */
          <form onSubmit={handleRegisterSubmit}>
            <div className="zt-input-group">
              <label>Full Name</label>
              <input 
                type="text" 
                className="zt-input" 
                placeholder="e.g. Jane Doe" 
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </div>

            <div className="zt-input-group">
              <label>Corporate Email</label>
              <input 
                type="email" 
                className="zt-input" 
                placeholder="e.g. jane.doe@zerotrustnet.io" 
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
            </div>

            <div className="zt-input-group">
              <label>Username</label>
              <input 
                type="text" 
                className="zt-input" 
                placeholder="e.g. janedoe" 
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
              />
            </div>

            <div className="zt-input-group">
              <label>Password</label>
              <input 
                type="password" 
                className="zt-input" 
                placeholder="••••••••" 
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>

            <div className="zt-input-group">
              <label>Department Scope</label>
              <select 
                className="zt-select"
                value={regDepartment}
                onChange={(e) => setRegDepartment(e.target.value)}
              >
                <option value="Engineering">Engineering</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Sales">Sales</option>
                <option value="IT Security">IT Security</option>
              </select>
            </div>

            <div className="zt-input-group">
              <label>Employment Role Type</label>
              <select 
                className="zt-select"
                value={regEmpType}
                onChange={(e) => setRegEmpType(e.target.value)}
              >
                <option value="Full-Time Employee">Full-Time Employee</option>
                <option value="Contractor">Contractor</option>
                <option value="Intern">Intern</option>
              </select>
            </div>

            <div className="zt-input-group">
              <label>Primary Corporate Device Name</label>
              <input 
                type="text" 
                className="zt-input" 
                placeholder="e.g. MacBook Pro 16 / Dell Workstation" 
                value={regDevice}
                onChange={(e) => setRegDevice(e.target.value)}
                required
              />
            </div>

            <div className="zt-input-group">
              <label>Contact Phone Number (Optional)</label>
              <input 
                type="tel" 
                className="zt-input" 
                placeholder="e.g. +91 98765 43210" 
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
              />
            </div>

            <button type="submit" className="zt-btn full-width" style={{ background: '#10b981' }} disabled={loading}>
              {loading ? 'Registering Account...' : '📝 Complete Employee Registration'}
            </button>
          </form>
        )}

        {/* Adaptive MFA Simulation & Telemetry Tester */}
        <div style={{
          marginTop: '1.2rem',
          padding: '0.75rem 0.85rem',
          background: 'rgba(0, 245, 255, 0.03)',
          border: '1px solid rgba(0, 245, 255, 0.15)',
          borderRadius: '8px',
          fontSize: '0.72rem'
        }}>
          <div style={{ color: '#00f5ff', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span>📡 Adaptive MFA & Insider Threat Context</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', color: '#88a0b8' }}>
            <div>• <strong>Device ID:</strong> <span style={{ color: '#00f5ff' }}>{simDeviceId}</span></div>
            <div>• <strong>Browser:</strong> <span style={{ color: '#10b981' }}>{browserName}</span></div>
            <div>• <strong>OS:</strong> <span style={{ color: '#10b981' }}>{osName}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
              <button
                type="button"
                onClick={() => refreshLocation(true)}
                disabled={isLocLoading}
                style={{
                  background: 'rgba(0, 245, 255, 0.1)',
                  border: '1px solid rgba(0, 245, 255, 0.3)',
                  color: '#00f5ff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  cursor: 'pointer'
                }}
                title="Detect GPS location from device"
              >
                📍 Detect GPS
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocInputVal(simLocation === 'Detecting location...' ? '' : simLocation);
                  setIsEditingLoc(!isEditingLoc);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#94a3b8',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  cursor: 'pointer'
                }}
                title="Manually set location"
              >
                ✏️ Edit
              </button>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              • <strong>Verified Live Location:</strong>{' '}
              <span style={{ color: '#10b981', fontWeight: '600' }}>{isLocLoading ? 'Detecting...' : simLocation}</span>
            </div>
          </div>

          {isEditingLoc && (
            <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', display: 'flex', gap: '4px' }}>
              <input
                type="text"
                className="zt-input"
                value={locInputVal}
                onChange={(e) => setLocInputVal(e.target.value)}
                placeholder="e.g. Bengaluru, Karnataka, India"
                style={{ flex: 1, padding: '3px 6px', fontSize: '0.72rem' }}
              />
              <button
                type="button"
                className="zt-btn"
                style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                onClick={() => {
                  if (locInputVal.trim()) {
                    setCustomLocation(locInputVal.trim());
                    setSimLocation(locInputVal.trim());
                    setIsEditingLoc(false);
                  }
                }}
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
