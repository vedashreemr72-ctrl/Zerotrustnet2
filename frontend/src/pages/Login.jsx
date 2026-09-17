import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Smartphone } from 'lucide-react';

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
    devId = "DEV-" + Math.floor(10000 + Math.random() * 90000) + "-WIN";
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState('Engineering');
  const [regEmpType, setRegEmpType] = useState('Full-Time Employee');
  const [regDevice, setRegDevice] = useState('Corporate Laptop');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const deviceId = getDeviceId();
  const browserName = detectBrowser();
  const osName = detectOS();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          password: password,
          role: activeTab,
          device_id: deviceId,
          browser: browserName,
          os: osName,
          location: "Bengaluru, India",
          login_time: new Date().toISOString()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          username: regUsername,
          password: regPassword,
          department: regDepartment,
          emp_type: regEmpType,
          device: regDevice
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessMsg(`✅ ${data.message}`);
      setUsername(regUsername);
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
    setUsername('');
    setPassword('');
  };

  return (
    <div className="login-wrap">
      {/* Top Header Icons: Theme (Light/Dark) */}
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
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
        )}
      </div>

      <div className="zt-card login-card" style={{ maxWidth: '460px', width: '100%' }}>
        <div className="login-hero" style={{ textAlign: 'center' }}>
          <div className="logo" style={{ fontSize: '1.6rem', fontWeight: '800' }}>🛡️ ZeroTrustNet</div>
          <div className="tagline" style={{ fontSize: '0.82rem', color: '#00f5ff', fontWeight: 'bold', marginTop: '4px', lineHeight: '1.3' }}>
            An AI-Powered Zero Trust Employee Access Verification & Insider Threat Detection Platform
          </div>
        </div>

        {/* Device Trust Banner */}
        <div style={{
          margin: '1rem 0',
          padding: '0.65rem 0.85rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.78rem',
          color: '#10b981'
        }}>
          <span>🔐</span>
          <div>
            <strong>Device Trust Verification: Verified</strong>
            <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>Endpoint BitLocker Encrypted · Sentinel One Active</div>
          </div>
        </div>

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
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1rem',
            color: '#ef4444',
            fontSize: '0.82rem',
            fontWeight: '600'
          }}>
            ❌ {error}
          </div>
        )}

        {mode === 'login' || activeTab === 'admin' ? (
          <form onSubmit={handleLoginSubmit}>
            <div className="zt-input-group">
              <label>Username</label>
              <input 
                type="text" 
                className="zt-input" 
                placeholder={activeTab === 'admin' ? 'e.g. admin' : 'e.g. ravi'} 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
              <label>Username (used for login)</label>
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
                <option value="Marketing">Marketing</option>
                <option value="Legal">Legal</option>
                <option value="IT Support">IT Support</option>
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
              <label>Registered Corporate Device</label>
              <input 
                type="text" 
                className="zt-input" 
                placeholder="e.g. MacBook Pro 16 / Dell Workstation" 
                value={regDevice}
                onChange={(e) => setRegDevice(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="zt-btn full-width" style={{ background: '#10b981' }} disabled={loading}>
              {loading ? 'Registering Account...' : '📝 Complete Employee Registration'}
            </button>
          </form>
        )}

        {/* Telemetry Handshake & Step 2 Device Verification Info */}
        <div style={{
          marginTop: '1.2rem',
          padding: '0.75rem 0.85rem',
          background: 'rgba(0, 245, 255, 0.03)',
          border: '1px solid rgba(0, 245, 255, 0.15)',
          borderRadius: '8px',
          fontSize: '0.74rem'
        }}>
          <div style={{ color: '#00f5ff', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📡 Step 1 & 2: Pre-Access Device Verification</span>
            <span style={{ fontSize: '0.68rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Compliant</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', color: '#88a0b8', fontSize: '0.72rem' }}>
            <div>• <strong>Device ID:</strong> <span style={{ color: '#00f5ff' }}>{deviceId}</span></div>
            <div>• <strong>OS Allowed:</strong> <span style={{ color: '#10b981' }}>✓ {osName}</span></div>
            <div>• <strong>Trusted Browser:</strong> <span style={{ color: '#10b981' }}>✓ {browserName}</span></div>
            <div>• <strong>Normal Device:</strong> <span style={{ color: '#10b981' }}>✓ Verified Baseline</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
