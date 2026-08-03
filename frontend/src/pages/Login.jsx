import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
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
          role: activeTab
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
      <div className="zt-card login-card" style={{ maxWidth: '460px', width: '100%' }}>
        <div className="login-hero">
          <div className="logo" style={{ fontSize: '1.6rem', fontWeight: '800' }}>🛡️ ZeroTrustNet</div>
          <div className="tagline">Enterprise Insider Threat Detection Platform</div>
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

        <div style={{ marginTop: '1.5rem', background: 'rgba(0, 245, 255, 0.04)', border: '1px solid rgba(0, 245, 255, 0.09)', borderRadius: '8px', padding: '0.8rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#3d5470', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>
            Demo Credentials & Self-Registration
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4a6275', fontFamily: 'monospace', lineHeight: '1.8' }}>
            Admin &nbsp;&nbsp;→ admin / admin123<br />
            Employee → ravi / emp123<br />
            Or click <strong>"Register Account"</strong> above to register any new employee!
          </div>
        </div>
      </div>
    </div>
  );
}
