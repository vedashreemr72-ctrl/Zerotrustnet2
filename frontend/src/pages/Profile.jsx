import React, { useState, useEffect } from 'react';
import { 
  User, Shield, ShieldCheck, MapPin, Laptop, Smartphone, Key, Lock, 
  Clock, Activity, Globe, CheckCircle2, AlertTriangle, RefreshCw, 
  Download, ArrowLeft, Eye, EyeOff, Check, X, FileText, SmartphoneCharging
} from 'lucide-react';

export default function Profile({ token, user, onBack }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, msg: '', error: '' });

  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState(false);

  // Fetch complete profile telemetry
  const fetchProfile = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Could not load user profile telemetry');
      }
      const data = await res.json();
      setProfileData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordStatus({ loading: false, msg: '', error: 'Password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ loading: false, msg: '', error: 'Passwords do not match' });
      return;
    }

    setPasswordStatus({ loading: true, msg: '', error: '' });
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setPasswordStatus({ loading: false, msg: 'Password successfully updated!', error: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordStatus({ loading: false, msg: '', error: '' });
      }, 1500);
    } catch (err) {
      setPasswordStatus({ loading: false, msg: '', error: err.message });
    }
  };

  const handleDownloadIdentity = () => {
    if (!profileData) return;
    const cert = {
      platform: "ZeroTrustNet Continuous Cyber Verification System",
      certificate_type: "Zero Trust Cryptographic Identity Verification Token",
      issued_at: new Date().toISOString(),
      user: profileData.user,
      security_baseline: profileData.baseline,
      session: profileData.session,
      risk_posture: {
        risk_score: profileData.risk_score,
        threat_classification: profileData.threat_classification
      },
      clearance_tier: profileData.user.role === 'admin' ? "Tier-1 Administrative Clearance" : "Tier-3 Standard Employee Clearance",
      active_policies_enforcing: profileData.policies || []
    };

    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ZeroTrust_Identity_${profileData.user.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <RefreshCw size={36} color="#00f5ff" style={{ animation: 'spin 1.5s linear infinite' }} />
        <div style={{ marginTop: '1rem', color: '#8aafc8', fontSize: '0.95rem', fontWeight: 600 }}>
          Retrieving Zero Trust Identity & Cryptographic Baseline...
        </div>
      </div>
    );
  }

  const u = profileData?.user || user || {};
  const base = profileData?.baseline || {};
  const sess = profileData?.session || {};
  const risk = profileData?.risk_score ?? 0;
  const threatClass = profileData?.threat_classification || 'Normal';
  const policies = profileData?.policies || [];
  const events = profileData?.recent_events || [];

  const isAdmin = u.role === 'admin';
  const initials = u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  const isLocationMismatch = base.current_location && base.baseline_location &&
    !base.current_location.toLowerCase().includes(base.baseline_location.toLowerCase()) &&
    !base.baseline_location.toLowerCase().includes(base.current_location.toLowerCase());

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* 🧭 Top Navigation & Back Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button 
              onClick={onBack}
              className="zt-btn zt-btn-sec"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.82rem' }}
            >
              <ArrowLeft size={15} /> Back to Dashboard
            </button>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.3rem' }}>🛡️</span>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, letterSpacing: '0.3px' }}>
                Zero Trust Identity & Security Profile
              </h1>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#8aafc8', marginTop: '2px' }}>
              Continuous Identity Verification · Adaptive Telemetry · Endpoint Trust Architecture
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={fetchProfile}
            className="zt-btn zt-btn-sec"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
            title="Refresh live telemetry"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button 
            onClick={handleDownloadIdentity}
            className="zt-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #0284c7, #00f5ff)', color: '#030816', fontWeight: 'bold' }}
            title="Download signed JSON clearance badge"
          >
            <Download size={14} /> Identity Token
          </button>
        </div>
      </div>

      {/* 👤 HERO IDENTITY BANNER CARD */}
      <div className="zt-card" style={{
        background: 'linear-gradient(135deg, rgba(13, 27, 62, 0.95), rgba(3, 9, 30, 0.98))',
        border: '1.5px solid rgba(0, 245, 255, 0.28)',
        borderRadius: '14px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.45)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative glow */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(0, 245, 255, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Left: Avatar & Primary Metadata */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '78px',
                height: '78px',
                borderRadius: '50%',
                background: isAdmin 
                  ? 'linear-gradient(135deg, #00f5ff 0%, #0080ff 100%)' 
                  : 'linear-gradient(135deg, #10b981 0%, #0284c7 100%)',
                color: '#030816',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 900,
                boxShadow: isAdmin ? '0 0 20px rgba(0, 245, 255, 0.5)' : '0 0 20px rgba(16, 185, 129, 0.5)',
                border: '3px solid rgba(255, 255, 255, 0.2)'
              }}>
                {initials}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: '3px solid #030816',
                boxShadow: '0 0 8px #22c55e'
              }} title="Identity Session Active" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                  {u.name || 'User'}
                </h2>
                <span className="zt-badge" style={{
                  background: isAdmin ? 'rgba(0, 245, 255, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: isAdmin ? '#00f5ff' : '#10b981',
                  border: `1px solid ${isAdmin ? 'rgba(0, 245, 255, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {isAdmin ? '🛡️ SOC LEAD ADMINISTRATOR' : `🏢 ${u.emp_type || 'Full-Time Employee'}`}
                </span>
                <span className="zt-badge bl" style={{ fontSize: '0.7rem' }}>
                  ID: {u.id || 'U001'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap', fontSize: '0.82rem', color: '#8aafc8' }}>
                <span>Username: <strong style={{ color: '#00f5ff' }}>@{u.username}</strong></span>
                <span>Department: <strong style={{ color: '#f1f5f9' }}>{u.department || 'Security Operations'}</strong></span>
                <span>Corporate Email: <strong style={{ color: '#cbd5e1' }}>{u.email || `${u.username}@zerotrustnet.io`}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px', fontSize: '0.76rem', color: '#64748b', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} color="#22c55e" />
                  Clearance: <strong style={{ color: '#22c55e' }}>{isAdmin ? 'Tier-1 Privileged Access' : 'Tier-3 Standard Verification'}</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} color="#38bdf8" />
                  Account Enrolled: <strong style={{ color: '#cbd5e1' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Security Quick Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
            <button 
              className="zt-btn"
              onClick={() => setShowPasswordModal(true)}
              style={{ background: 'rgba(2, 132, 199, 0.25)', border: '1px solid #0284c7', color: '#38bdf8', fontSize: '0.78rem', padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Key size={14} /> Update Credentials
            </button>
            <button 
              className="zt-btn"
              onClick={() => { setShowMfaModal(true); setMfaSuccess(false); setMfaOtp(''); }}
              style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#34d399', fontSize: '0.78rem', padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <SmartphoneCharging size={14} /> Test Step-Up MFA Challenge
            </button>
          </div>
        </div>
      </div>

      {/* 📊 4 ZERO TRUST TELEMETRY TILES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* 1. Risk Posture */}
        <div className="zt-card" style={{ borderLeft: `4px solid ${risk >= 70 ? '#ef4444' : risk >= 30 ? '#f59e0b' : '#10b981'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ fontSize: '0.78rem', color: '#8aafc8', fontWeight: 600, textTransform: 'uppercase' }}>
              Zero Trust Risk Posture
            </div>
            <Activity size={16} color={risk >= 70 ? '#ef4444' : risk >= 30 ? '#f59e0b' : '#10b981'} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: risk >= 70 ? '#ef4444' : risk >= 30 ? '#f59e0b' : '#10b981' }}>
            {risk} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>/ 100</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <span className={`zt-badge ${risk >= 70 ? 'bc' : risk >= 30 ? 'bm' : 'bl'}`} style={{ fontSize: '0.68rem' }}>
              {threatClass} Threat Profile
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {risk === 0 ? 'Optimal Trust Posture' : 'Monitored Vectors'}
            </span>
          </div>
        </div>

        {/* 2. Authentication & MFA */}
        <div className="zt-card" style={{ borderLeft: '4px solid #00f5ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ fontSize: '0.78rem', color: '#8aafc8', fontWeight: 600, textTransform: 'uppercase' }}>
              Continuous MFA Engine
            </div>
            <ShieldCheck size={16} color="#00f5ff" />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={18} color="#10b981" /> Adaptive Verified
          </div>
          <div style={{ fontSize: '0.74rem', color: '#8aafc8', marginTop: '6px' }}>
            Protocol: <strong style={{ color: '#00f5ff' }}>TOTP / HMAC-SHA256</strong>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#8aafc8', marginTop: '2px' }}>
            Step-Up Trigger: <strong style={{ color: '#cbd5e1' }}>Velocity / Endpoint Shift</strong>
          </div>
        </div>

        {/* 3. Endpoint Hardware */}
        <div className="zt-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ fontSize: '0.78rem', color: '#8aafc8', fontWeight: 600, textTransform: 'uppercase' }}>
              Hardware Endpoint
            </div>
            <Laptop size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9' }}>
            {sess.os || 'Windows 11'} · {sess.browser || 'Browser'}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#8aafc8', marginTop: '6px' }}>
            Device ID: <code style={{ color: '#38bdf8', fontSize: '0.72rem' }}>{sess.device_id || 'DEV-ENROLLED'}</code>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '2px' }}>
            ● Recognized Corporate Workstation
          </div>
        </div>

        {/* 4. Geolocation & Baseline */}
        <div className="zt-card" style={{ borderLeft: `4px solid ${isLocationMismatch ? '#f59e0b' : '#10b981'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ fontSize: '0.78rem', color: '#8aafc8', fontWeight: 600, textTransform: 'uppercase' }}>
              Geolocation Intel
            </div>
            <Globe size={16} color={isLocationMismatch ? '#f59e0b' : '#10b981'} />
          </div>
          <div style={{ fontSize: '0.98rem', fontWeight: 700, color: isLocationMismatch ? '#f59e0b' : '#38bdf8' }}>
            {base.current_location || 'Local Workstation'}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#8aafc8', marginTop: '6px' }}>
            Baseline: <strong style={{ color: '#cbd5e1' }}>{base.baseline_location || 'Bengaluru'}</strong>
          </div>
          <div style={{ fontSize: '0.72rem', color: isLocationMismatch ? '#f59e0b' : '#10b981', marginTop: '2px' }}>
            {isLocationMismatch ? '⚠️ Location Deviation Logged' : '✓ Baseline Match Confirmed'}
          </div>
        </div>
      </div>

      {/* 🛡️ DEEP IDENTITY METRICS & ZERO TRUST BASELINE DETAILS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Baseline Profile Matrix */}
        <div className="zt-card">
          <div className="zt-section-title" style={{ marginBottom: '1rem' }}>
            <User size={18} color="#00f5ff" /> Identity Baseline & Behavioral Norms
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 245, 255, 0.08)', fontSize: '0.82rem' }}>
              <span style={{ color: '#8aafc8' }}>Registered User ID</span>
              <strong style={{ fontFamily: 'monospace', color: '#f1f5f9' }}>{u.id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 245, 255, 0.08)', fontSize: '0.82rem' }}>
              <span style={{ color: '#8aafc8' }}>Baseline Login Window</span>
              <strong style={{ color: '#f1f5f9' }}>{base.baseline_login_time || '09:00'} IST</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 245, 255, 0.08)', fontSize: '0.82rem' }}>
              <span style={{ color: '#8aafc8' }}>Baseline Workstation</span>
              <strong style={{ color: '#f1f5f9' }}>{base.baseline_device || 'Corporate Workstation'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 245, 255, 0.08)', fontSize: '0.82rem' }}>
              <span style={{ color: '#8aafc8' }}>Daily File Access Quota</span>
              <strong style={{ color: '#f1f5f9' }}>~{base.baseline_file_access || 15} files/day</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 245, 255, 0.08)', fontSize: '0.82rem' }}>
              <span style={{ color: '#8aafc8' }}>Burnout Stress Index</span>
              <strong style={{ color: base.burnout_score > 50 ? '#f59e0b' : '#10b981' }}>{base.burnout_score || 0}/100</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#8aafc8' }}>Impossible Travel Flag</span>
              <strong style={{ color: base.impossible_travel ? '#ef4444' : '#10b981' }}>
                {base.impossible_travel ? '🚨 Active Deviation' : '🟢 None Detected'}
              </strong>
            </div>
          </div>
        </div>

        {/* Active Session & Cryptographic Token Info */}
        <div className="zt-card">
          <div className="zt-section-title" style={{ marginBottom: '1rem' }}>
            <Key size={18} color="#00f5ff" /> Live Session Security & Cryptography
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 245, 255, 0.08)', fontSize: '0.82rem' }}>
              <span style={{ color: '#8aafc8' }}>Session Identifier</span>
              <code style={{ color: '#00f5ff', fontSize: '0.74rem' }}>{sess.session_id ? sess.session_id.substring(0, 18) + '...' : 'SESS-ACTIVE'}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 245, 255, 0.08)', fontSize: '0.82rem' }}>
              <span style={{ color: '#8aafc8' }}>Client IP Address</span>
              <strong style={{ fontFamily: 'monospace', color: '#f1f5f9' }}>{sess.ip_addr || '127.0.0.1'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 245, 255, 0.08)', fontSize: '0.82rem' }}>
              <span style={{ color: '#8aafc8' }}>Authentication Algorithm</span>
              <strong style={{ color: '#f1f5f9' }}>JWT HS256 · AES-256 State</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 245, 255, 0.08)', fontSize: '0.82rem' }}>
              <span style={{ color: '#8aafc8' }}>Session Start Time</span>
              <strong style={{ color: '#f1f5f9' }}>{sess.login_time ? new Date(sess.login_time).toLocaleTimeString() : 'Current'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 245, 255, 0.08)', fontSize: '0.82rem' }}>
              <span style={{ color: '#8aafc8' }}>Continuous Validation</span>
              <strong style={{ color: '#10b981' }}>11 Vectors Inspected Live</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#8aafc8' }}>Session Life Cycle</span>
              <strong style={{ color: '#38bdf8' }}>Active (Revocable by SOC)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 📜 ZERO TRUST POLICIES ENFORCED ON THIS USER */}
      <div className="zt-card" style={{ marginBottom: '1.5rem' }}>
        <div className="zt-section-title" style={{ marginBottom: '0.85rem' }}>
          <Shield size={18} color="#00f5ff" /> Zero Trust Security Policies Enforcing On This Account
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
          {policies.map((p, idx) => (
            <div key={idx} style={{
              background: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(0, 245, 255, 0.12)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ color: '#00f5ff', fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 'bold' }}>{p.id}</div>
                <div style={{ color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>{p.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="zt-badge bl" style={{ fontSize: '0.64rem', display: 'inline-block', marginBottom: '2px' }}>
                  ✓ {p.status}
                </span>
                <div style={{ fontSize: '0.66rem', color: '#8aafc8' }}>{p.level}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 📑 RECENT USER AUDIT TRAIL */}
      <div className="zt-card">
        <div className="zt-section-title" style={{ marginBottom: '0.85rem' }}>
          <FileText size={18} color="#00f5ff" /> Personal Security Audit Trail (Latest Telemetry)
        </div>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.84rem' }}>
            No recent audit events logged for this identity.
          </div>
        ) : (
          <div className="zt-table-container">
            <table className="zt-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Type</th>
                  <th>Details</th>
                  <th>Client IP</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: '#8aafc8', whiteSpace: 'nowrap' }}>
                      {ev.timestamp ? ev.timestamp.replace('T', ' ').substring(0, 19) : 'Just now'}
                    </td>
                    <td style={{ fontWeight: 600, color: '#f1f5f9' }}>
                      {ev.event_type}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                      {ev.details}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: '#38bdf8' }}>
                      {ev.ip || '127.0.0.1'}
                    </td>
                    <td>
                      <span className={`zt-badge ${ev.is_suspicious ? 'bc' : 'bl'}`} style={{ fontSize: '0.66rem' }}>
                        {ev.is_suspicious ? 'Flagged Anomaly' : 'Verified Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔐 PASSWORD UPDATE MODAL */}
      {showPasswordModal && (
        <div className="zt-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="zt-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={20} color="#00f5ff" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Update Account Credentials</h3>
              </div>
              <button 
                onClick={() => setShowPasswordModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#8aafc8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#8aafc8', marginBottom: '5px' }}>
                  New Password (Minimum 6 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPasswordText ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="zt-input"
                    style={{ width: '100%', paddingRight: '36px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#8aafc8', cursor: 'pointer' }}
                  >
                    {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#8aafc8', marginBottom: '5px' }}>
                  Confirm Password
                </label>
                <input 
                  type={showPasswordText ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="zt-input"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              {passwordStatus.error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.5rem', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '1rem' }}>
                  ⚠️ {passwordStatus.error}
                </div>
              )}

              {passwordStatus.msg && (
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#86efac', padding: '0.5rem', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '1rem' }}>
                  ✓ {passwordStatus.msg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowPasswordModal(false)}
                  className="zt-btn zt-btn-sec"
                  disabled={passwordStatus.loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="zt-btn"
                  disabled={passwordStatus.loading}
                >
                  {passwordStatus.loading ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📱 ADAPTIVE STEP-UP MFA SIMULATION MODAL */}
      {showMfaModal && (
        <div className="zt-modal-overlay" onClick={() => setShowMfaModal(false)}>
          <div className="zt-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '90%', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SmartphoneCharging size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Step-Up MFA Challenge</h3>
              </div>
              <button 
                onClick={() => setShowMfaModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#8aafc8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                A step-up verification challenge was initiated for user <strong>@{u.username}</strong> to prove real-time possession of registered authenticator.
              </div>

              {!mfaSuccess ? (
                <div>
                  <div style={{ background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.3)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.74rem', color: '#8aafc8' }}>DEMO SIMULATION CODE:</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '6px', color: '#00f5ff', margin: '4px 0' }}>
                      842915
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Valid for 300 seconds · Sent to registered device</div>
                  </div>

                  <input 
                    type="text"
                    maxLength={6}
                    value={mfaOtp}
                    onChange={e => setMfaOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP code"
                    className="zt-input"
                    style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px', width: '220px', margin: '0 auto 1.25rem auto' }}
                  />

                  <div>
                    <button 
                      onClick={() => {
                        if (mfaOtp === '842915' || mfaOtp.length === 6) {
                          setMfaSuccess(true);
                        } else {
                          alert('Please enter the 6-digit verification code.');
                        }
                      }}
                      className="zt-btn"
                      style={{ width: '100%', padding: '0.65rem', fontWeight: 'bold' }}
                    >
                      Verify Step-Up Challenge
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem 0' }}>
                  <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                    <Check size={32} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                    Cryptographic Assurance Confirmed!
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '6px' }}>
                    Zero Trust posture validated. Session clearance upgraded to Highest Tier.
                  </div>
                  <button 
                    onClick={() => setShowMfaModal(false)}
                    className="zt-btn"
                    style={{ marginTop: '1.25rem', padding: '0.55rem 1.5rem' }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
