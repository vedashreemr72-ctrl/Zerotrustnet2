import React, { useState, useEffect } from 'react';
import { Sun, Moon, Shield, Lock, Smartphone, Laptop, AlertTriangle, CheckCircle, RefreshCw, KeyRound, Globe, MapPin } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../supabaseClient';
import { fetchRealTimeLocation } from '../utils/geolocation';

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

  // Adaptive MFA Challenge State
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);

  // Simulation & telemetry toggles
  const [simLocation, setSimLocation] = useState(() => {
    try {
      return localStorage.getItem('ztn_last_location') || 'Detecting location...';
    } catch {
      return 'Detecting location...';
    }
  });
  const [simDeviceId, setSimDeviceId] = useState(getDeviceId());

  // Automatically fetch genuine real-time physical address on load
  useEffect(() => {
    fetchRealTimeLocation().then((loc) => {
      if (loc && (loc.address || loc.shortLocation)) {
        const resolved = loc.shortLocation || loc.address;
        setSimLocation(resolved);
        try { localStorage.setItem('ztn_last_location', resolved); } catch {}
      }
    }).catch((err) => {
      console.warn('Real-time location detection fallback:', err);
    });
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
          effectiveLocation = loc.shortLocation || loc.address || 'Local Workstation';
          setSimLocation(effectiveLocation);
          try { localStorage.setItem('ztn_last_location', effectiveLocation); } catch {}
        } catch {
          effectiveLocation = 'Local Workstation';
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
        throw new Error(data.error || 'Authentication failed');
      }

      // Check if Adaptive MFA is triggered
      if (data.mfa_required) {
        setMfaChallenge(data);
        if (data.sms_sent) {
          setOtpCode('');
          setSuccessMsg(`📲 Real-time Verification Code sent to ${data.masked_phone || 'your phone'} via Twilio SMS!`);
        } else {
          setOtpCode(data.otp_demo || '');
          setSuccessMsg(`🔐 Adaptive MFA Triggered: Please enter the 6-digit verification code.`);
        }
      } else {
        // Direct login without OTP because device is trusted & normal behavior
        onLoginSuccess(data.token, data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const effectiveLoc = (simLocation && simLocation !== 'Detecting location...') 
        ? simLocation 
        : (localStorage.getItem('ztn_last_location') || 'Local Workstation');

      const response = await fetch('/api/auth/mfa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: mfaChallenge.challenge_id,
          otp_code: otpCode,
          trust_this_device: trustDevice,
          device_info: {
            device_id: simDeviceId,
            device_name: `${osName} (${browserName})`,
            browser: browserName,
            os: osName,
            location: effectiveLoc
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'MFA verification failed');
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
      const effectiveLoc = (simLocation && simLocation !== 'Detecting location...') 
        ? simLocation 
        : (localStorage.getItem('ztn_last_location') || 'Local Workstation');

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

      setSuccessMsg(`✅ ${data.message}`);
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
    setMfaChallenge(null);
    setError('');
    setSuccessMsg('');
    if (tab === 'admin') {
      setLoginIdentifier('admin');
      setPassword('admin123');
      setSimDeviceId('DEV-CORP-ADMIN-01');
    } else {
      setLoginIdentifier('ravi');
      setPassword('emp123');
      setSimDeviceId('DEV-55357-WIN');
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
          <div className="tagline" style={{ fontSize: '0.82rem', color: '#00f5ff', fontWeight: 'bold', marginTop: '4px', lineHeight: '1.3' }}>
            Adaptive MFA & Continuous Insider Threat Detection Platform
          </div>
        </div>

        {/* Supabase & Zero Trust Security Indicator */}
        <div style={{
          margin: '0.9rem 0',
          padding: '0.65rem 0.85rem',
          background: 'rgba(0, 245, 255, 0.05)',
          border: '1px solid rgba(0, 245, 255, 0.2)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem' }}>⚡</span>
            <div>
              <strong style={{ color: '#e2e8f0' }}>Zero Trust Security Engine: Active</strong>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Row Level Security (RLS) · Adaptive MFA · UEBA Risk Scoring</div>
            </div>
          </div>
          <span style={{ 
            fontSize: '0.65rem', 
            color: supabaseActive ? '#10b981' : '#38bdf8', 
            background: supabaseActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: 'bold',
            border: supabaseActive ? '1px solid #10b981' : '1px solid #38bdf8'
          }}>
            {supabaseActive ? 'Supabase Cloud Connected' : 'Hybrid Auth Ready'}
          </span>
        </div>

        {/* Portal Role Tabs */}
        {!mfaChallenge && (
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
        )}

        {/* Register / Login Toggle for Employees */}
        {activeTab === 'employee' && !mfaChallenge && (
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

        {/* ADAPTIVE MFA CHALLENGE MODAL / VIEW */}
        {mfaChallenge ? (
          <form onSubmit={handleMfaVerifySubmit} style={{ marginTop: '0.5rem' }}>
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '0.85rem',
              marginBottom: '1rem'
            }}>
              <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={17} /> Adaptive Verification Required
              </div>
              <div style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '4px', lineHeight: '1.4' }}>
                {mfaChallenge.reasons && mfaChallenge.reasons.map((r, i) => (
                  <div key={i} style={{ marginTop: '3px' }}>• {r}</div>
                ))}
              </div>
              {mfaChallenge.sms_sent ? (
                <div style={{ 
                  marginTop: '8px', 
                  background: 'rgba(16, 185, 129, 0.12)', 
                  border: '1px solid #10b981', 
                  borderRadius: '6px', 
                  padding: '8px 10px', 
                  fontSize: '0.78rem' 
                }}>
                  <div style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📲</span> Live SMS Dispatched via Twilio
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: '0.74rem', marginTop: '3px' }}>
                    A 6-digit verification code has been sent to <strong>{mfaChallenge.masked_phone || 'your mobile phone'}</strong>. Check your SMS inbox!
                  </div>
                  {mfaChallenge.otp_demo && (
                    <details style={{ marginTop: '5px', fontSize: '0.68rem', color: '#64748b', cursor: 'pointer' }}>
                      <summary>Fallback Backup Code (Testing/Demo)</summary>
                      <div style={{ marginTop: '2px', color: '#38bdf8', fontFamily: 'monospace' }}>Code: {mfaChallenge.otp_demo}</div>
                    </details>
                  )}
                </div>
              ) : mfaChallenge.otp_demo ? (
                <div style={{ marginTop: '8px', background: 'rgba(0,0,0,0.3)', padding: '5px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#00f5ff' }}>
                  📲 <strong>Simulated SMS / Authenticator Code:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.9rem', color: '#22c55e' }}>{mfaChallenge.otp_demo}</span>
                </div>
              ) : null}

            </div>

            <div className="zt-input-group">
              <label>Enter 6-Digit OTP Code</label>
              <input 
                type="text" 
                className="zt-input" 
                placeholder="e.g. 123456" 
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                style={{ fontSize: '1.2rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0.8rem 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              <input 
                type="checkbox" 
                id="trustDeviceCheck" 
                checked={trustDevice} 
                onChange={(e) => setTrustDevice(e.target.checked)} 
                style={{ width: '16px', height: '16px', accentColor: '#00f5ff' }}
              />
              <label htmlFor="trustDeviceCheck" style={{ cursor: 'pointer' }}>
                Trust this device for 30 days (No OTP requested when behavior is normal)
              </label>
            </div>

            <button type="submit" className="zt-btn full-width" disabled={loading} style={{ background: 'linear-gradient(135deg, #0284c7, #06b6d4)' }}>
              {loading ? 'Verifying OTP...' : '🔐 Verify OTP & Access Portal'}
            </button>

            <button 
              type="button" 
              className="zt-btn zt-btn-sec full-width" 
              style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}
              onClick={() => { setMfaChallenge(null); setError(''); }}
            >
              ← Cancel & Back to Login
            </button>
          </form>
        ) : mode === 'login' || activeTab === 'admin' ? (
          /* STANDARD LOGIN FORM */
          <form onSubmit={handleLoginSubmit}>
            <div className="zt-input-group">
              <label>Email or Username</label>
              <input 
                type="text" 
                className="zt-input" 
                placeholder={activeTab === 'admin' ? 'e.g. admin or admin@zerotrustnet.io' : 'e.g. ravi or ravi@zerotrustnet.io'} 
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
              <label>Mobile Phone Number (For Real Twilio SMS OTP)</label>
              <input 
                type="tel" 
                className="zt-input" 
                placeholder="e.g. +919876543210 (International E.164)" 
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
          <div style={{ color: '#00f5ff', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📡 Adaptive MFA & Insider Threat Context</span>
            <span style={{ fontSize: '0.65rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Telemetry Active</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', color: '#88a0b8', marginBottom: '8px' }}>
            <div>• <strong>Device ID:</strong> <span style={{ color: '#00f5ff' }}>{simDeviceId}</span></div>
            <div>• <strong>Location:</strong> <span style={{ color: simLocation.includes('Bengaluru') ? '#10b981' : '#f59e0b' }}>{simLocation}</span></div>
            <div>• <strong>OS:</strong> <span style={{ color: '#10b981' }}>{osName}</span></div>
            <div>• <strong>Browser:</strong> <span style={{ color: '#10b981' }}>{browserName}</span></div>
          </div>

          {/* Quick Simulation Buttons to demonstrate Adaptive MFA */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px', marginTop: '6px' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '4px' }}>🔬 Quick Test Scenarios (Demonstrates Adaptive Behavior):</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="zt-btn zt-btn-sec" 
                style={{ fontSize: '0.66rem', padding: '2px 6px' }}
                onClick={() => {
                  setSimDeviceId(activeTab === 'admin' ? 'DEV-CORP-ADMIN-01' : 'DEV-55357-WIN');
                  setSimLocation('Bengaluru, India');
                  setError('');
                }}
              >
                ✓ Trusted Endpoint
              </button>
              <button 
                type="button" 
                className="zt-btn zt-btn-sec" 
                style={{ fontSize: '0.66rem', padding: '2px 6px', color: '#f59e0b' }}
                onClick={() => {
                  setSimDeviceId(`DEV-${Math.floor(10000 + Math.random() * 90000)}-UNKNOWN`);
                  setError('');
                }}
              >
                ⚠️ Untrusted Device (Triggers MFA)
              </button>
              <button 
                type="button" 
                className="zt-btn zt-btn-sec" 
                style={{ fontSize: '0.66rem', padding: '2px 6px', color: '#ec4899' }}
                onClick={() => {
                  setSimLocation(simLocation.includes('Bengaluru') ? 'Frankfurt, Germany' : 'Bengaluru, India');
                  setError('');
                }}
              >
                🌐 Unusual Location (Triggers MFA)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
