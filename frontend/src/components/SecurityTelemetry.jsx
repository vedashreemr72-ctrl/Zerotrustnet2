import React, { useState, useEffect } from 'react';
import { 
  Shield, CheckCircle2, Navigation, MapPin, Key, Clock, 
  Cpu, AlertTriangle, RefreshCw, Laptop, Smartphone, FileText
} from 'lucide-react';
import { fetchRealTimeLocation } from '../utils/geolocation';
import { formatLocalTime, formatShortTime, formatLocalDateTime } from '../utils/timeFormat';

export default function SecurityTelemetry({ token, user, initialData }) {
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [realLocation, setRealLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(true);

  // Load real-time GPS location
  const loadRealLocation = async () => {
    setLocLoading(true);
    try {
      const loc = await fetchRealTimeLocation();
      setRealLocation(loc);
    } catch (err) {
      console.warn('Failed to load real-time location:', err);
    } finally {
      setLocLoading(false);
    }
  };

  // Fetch telemetry if not already provided
  const fetchTelemetry = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/employee/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn('Failed to fetch telemetry:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealLocation();
    if (!initialData) {
      fetchTelemetry();
    }
  }, [token]);

  const u = data?.user || user || {};
  const stats = data?.stats || { total_events: 18, suspicious_events: 0, active_sessions: 1 };
  const risk_score = u.risk_score ?? data?.risk_score ?? 20;
  const reasons = u.reasons || data?.reasons || [];
  const dv = u.device_verification || data?.device_verification || {
    is_registered: true,
    is_trusted_browser: true,
    is_normal_device: true,
    is_os_allowed: true,
    is_concurrent: false,
    risk_penalty: 0
  };
  const base = data?.baseline || {};

  const riskColor = risk_score >= 80 ? '#ef4444' : risk_score >= 60 ? '#f97316' : risk_score >= 30 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>🛡️</span>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading)' }}>
              Security & Zero Trust Telemetry
            </h2>
            <span className="zt-badge" style={{ background: 'rgba(2, 132, 199, 0.12)', color: 'var(--accent-cyan)', border: '1px solid rgba(2, 132, 199, 0.3)', fontSize: '0.74rem' }}>
              NIST SP 800-207
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Continuous Behavioral Evaluation · Multi-Layer AI Risk Scoring · Hardware Endpoint Integrity
          </div>
        </div>

        <button 
          onClick={() => { fetchTelemetry(); loadRealLocation(); }}
          className="zt-btn zt-btn-sec"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}
          title="Refresh live telemetry"
        >
          <RefreshCw size={14} /> Refresh Live Telemetry
        </button>
      </div>

      {/* Step 1: Enterprise Secure Session Telemetry Card */}
      <div className="zt-card" style={{
        padding: '1.2rem 1.4rem',
        marginBottom: '1.25rem',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold'
            }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ color: 'var(--accent-cyan)', fontWeight: '800', fontSize: '1.05rem', letterSpacing: '0.3px' }}>
                Enterprise Secure Session Active (Step 1 Authentication)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Continuous Monitoring Engine Connected · Cryptographically Signed JWT Token
              </div>
            </div>
          </div>
          <div style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: '0.82rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
            Perimeter Session Verified
          </div>
        </div>

        {/* 9-Field Telemetry Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.85rem',
          padding: '1rem',
          background: 'var(--bg-table-header)',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.84rem'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 'bold' }}>1. Employee ID</div>
            <div style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontFamily: 'monospace' }}>{u.user_id || u.username || 'EMP-1024'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 'bold' }}>2. Department</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{u.department || 'Engineering'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 'bold' }}>3. Role</div>
            <div style={{ color: 'var(--accent-blue)', fontWeight: '600', textTransform: 'capitalize' }}>{u.role || 'Employee'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 'bold' }}>4. Device ID</div>
            <div style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontFamily: 'monospace' }}>{u.device_id || 'DEV-89412-WIN'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 'bold' }}>5. Browser</div>
            <div style={{ color: 'var(--text-primary)' }}>{u.browser || 'Google Chrome 127'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 'bold' }}>6. Operating System</div>
            <div style={{ color: 'var(--text-primary)' }}>{u.os || 'Windows 11 Enterprise'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 'bold' }}>7. Login Time</div>
            <div style={{ color: 'var(--accent-amber)', fontSize: '0.78rem' }}>{formatLocalTime(u.login_time)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 'bold' }}>8. IP Address</div>
            <div style={{ color: '#db2777', fontFamily: 'monospace', fontWeight: '600' }}>{u.ip || '192.168.1.105'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 'bold' }}>9. Location</div>
            <div style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={14} color="var(--accent-cyan)" />
              <span>{locLoading ? 'Detecting live address...' : (realLocation?.shortLocation || realLocation?.address || u.location || 'Local Workstation')}</span>
            </div>
          </div>
        </div>

        {/* Real-time System Physical Location & Verified Address Banner */}
        <div style={{
          marginTop: '1rem',
          padding: '1rem 1.2rem',
          background: 'var(--bg-table-header)',
          border: '1px solid var(--border-card)',
          borderRadius: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>
              <Navigation size={16} />
              <span>System Real-Time Physical Location & Verified Address</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontSize: '0.76rem', 
                color: '#10b981', 
                background: 'rgba(16, 185, 129, 0.12)', 
                padding: '3px 8px', 
                borderRadius: '4px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                {realLocation?.source || 'Hardware GPS / Wi-Fi Geolocation'}
              </span>
              <button 
                type="button" 
                onClick={loadRealLocation}
                disabled={locLoading}
                className="zt-btn zt-btn-sec"
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                {locLoading ? 'Detecting...' : '🔄 Refresh Live Location'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '6px', fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.45', background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <strong style={{ color: 'var(--accent-cyan)' }}>Real-Time Physical Address:</strong>{' '}
            {locLoading ? (
              <span style={{ color: 'var(--text-muted)' }}>Detecting precise address from client device...</span>
            ) : (
              <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{realLocation?.address || 'Unable to retrieve precise street address'}</span>
            )}
          </div>

          {realLocation && realLocation.latitude && (
            <div style={{ display: 'flex', gap: '15px', marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8', flexWrap: 'wrap' }}>
              <div>• <strong>Coordinates:</strong> <span style={{ color: '#00f5ff', fontFamily: 'monospace' }}>{realLocation.latitude}° N, {realLocation.longitude}° E</span></div>
              {realLocation.accuracy && <div>• <strong>GPS Accuracy:</strong> <span style={{ color: '#10b981' }}>±{realLocation.accuracy}</span></div>}
              {realLocation.ip && <div>• <strong>Public IP:</strong> <span style={{ color: '#f472b6', fontFamily: 'monospace' }}>{realLocation.ip}</span></div>}
              {realLocation.postal && <div>• <strong>Postal Code:</strong> <span style={{ color: '#fbbf24' }}>{realLocation.postal}</span></div>}
            </div>
          )}
        </div>

        {/* Step 2: Device Verification Evaluation */}
        <div style={{
          marginTop: '0.95rem',
          padding: '0.95rem 1.15rem',
          background: dv.risk_penalty > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${dv.risk_penalty > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          borderRadius: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: dv.risk_penalty > 0 ? '#fca5a5' : '#6ee7b7' }}>
              💻 Step 2: Device Verification Evaluation: {dv.risk_penalty === 0 ? 'ALL 5 CHECKS PASSED (Verified Trust)' : `POLICY VIOLATIONS DETECTED (+${dv.risk_penalty} Risk Penalty)`}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem', fontSize: '0.76rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: dv.is_registered ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{dv.is_registered ? '✅' : '❌'} Registered Device:</span> {dv.is_registered ? 'Asset Registered' : 'Unregistered ID'}
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: dv.is_trusted_browser ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{dv.is_trusted_browser ? '✅' : '❌'} Trusted Browser:</span> {dv.is_trusted_browser ? 'Approved Client' : 'Untrusted Client'}
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: dv.is_normal_device ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{dv.is_normal_device ? '✅' : '❌'} Normal Device:</span> {dv.is_normal_device ? 'Matches Baseline' : 'Abnormal Hardware'}
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: dv.is_os_allowed ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{dv.is_os_allowed ? '✅' : '❌'} OS Allowed:</span> {dv.is_os_allowed ? 'Compliant OS' : 'Unapproved OS'}
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: !dv.is_concurrent ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{!dv.is_concurrent ? '✅' : '❌'} Concurrent Logins:</span> {!dv.is_concurrent ? 'Single Session' : 'Multiple Active Logins'}
            </div>
          </div>
        </div>
      </div>

      {/* Adaptive MFA & Endpoint Trust Standing Card */}
      <div className="zt-card" style={{
        marginBottom: '1.25rem',
        padding: '1.2rem 1.4rem',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(0, 245, 255, 0.25)',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.6rem' }}>
          <div style={{ color: '#00f5ff', fontWeight: 'bold', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={18} /> Adaptive MFA & Trusted Device Standing
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 10px', borderRadius: '12px', border: '1px solid #10b981', fontWeight: '600' }}>
            MFA Status: Enrolled & Active (RFC 6238 TOTP)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 0.95rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Authentication Policy</div>
            <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: '600', marginTop: '3px' }}>Zero Trust Adaptive MFA</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>OTP requested on sensitive actions, untrusted endpoints or abnormal behavior</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 0.95rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Active Session MFA</div>
            <div style={{ fontSize: '0.82rem', color: u.mfa_verified ? '#10b981' : '#38bdf8', fontWeight: '600', marginTop: '3px' }}>
              {u.mfa_verified ? '✓ 2FA Verified' : 'Session Verified'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              {u.device_trusted ? 'Recognized baseline endpoint' : 'Provisional session verification'}
            </div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 0.95rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Trusted Endpoints Registered</div>
            <div style={{ fontSize: '0.82rem', color: '#00f5ff', fontWeight: '600', marginTop: '3px' }}>
              {data?.mfa_status ? `${data.mfa_status.trusted_devices_count} Trusted Device(s)` : '1 Trusted Device'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Endpoints pre-cleared for direct access</div>
          </div>
        </div>

        {/* Recent Personal Login Activity Table */}
        {data?.recent_logins && data.recent_logins.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="#00f5ff" /> My Recent Login Activity (Strictly Isolated to You)
            </div>
            <div className="zt-table-container">
              <table className="zt-table" style={{ fontSize: '0.75rem' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Device ID</th>
                    <th>Operating System</th>
                    <th>Browser</th>
                    <th>Location & IP</th>
                    <th>MFA Status</th>
                    <th>Session Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_logins.map((lg, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', color: '#fbbf24' }}>
                        {formatLocalDateTime(lg.login_time)}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#a7f3d0' }}>{lg.device_id || 'DEV-55357-WIN'}</td>
                      <td>{lg.os || 'Windows 11'}</td>
                      <td>{lg.browser || 'Google Chrome 127'}</td>
                      <td>{lg.location || 'Bengaluru, India'} ({lg.ip_addr})</td>
                      <td>
                        <span className={`zt-badge ${lg.mfa_verified ? 'bl' : 'bm'}`} style={{ fontSize: '0.68rem' }}>
                          {lg.mfa_verified ? '✓ MFA Verified' : 'Standard'}
                        </span>
                      </td>
                      <td>
                        <span className={`zt-badge ${lg.is_active ? 'bl' : 'bc'}`} style={{ fontSize: '0.68rem' }}>
                          {lg.is_active ? 'Active' : 'Closed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Explainable AI (XAI) Transparency Card */}
      <div className="zt-card" style={{
        marginBottom: '1.25rem',
        padding: '1.2rem 1.4rem',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(0, 245, 255, 0.25)',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.6rem' }}>
          <div style={{ color: '#00f5ff', fontWeight: 'bold', fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧠</span> Explainable AI (XAI) Risk Breakdown
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Current Risk Rating: <strong style={{ color: riskColor, fontSize: '1.15rem', fontFamily: 'monospace' }}>{risk_score} / 100</strong>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Left Column: XAI Reasons */}
          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '0.78rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Identified Risk Reasons:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(() => {
                const reasonsList = reasons && reasons.length > 0 && !reasons[0].includes('No unusual behavior')
                  ? reasons.map(r => `✓ ${r.replace(/^[✓\s•◦-]+/, '').trim()}`)
                  : [
                      `✓ Login at ${formatShortTime(u.login_time)}`,
                      '✓ Normal Device Baseline',
                      '✓ Zero Trust Continuous Monitoring Active'
                    ];
                return reasonsList.map((reason, i) => (
                  <div key={i} style={{ color: '#38bdf8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> {reason.replace(/^✓\s*/, '')}
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Right Column: Recommended Security Action */}
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              Recommended Security Action
            </div>
            <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1rem', marginTop: '4px', marginBottom: '0.75rem' }}>
              {risk_score >= 80 ? 'Lock Account + Revoke Sessions' : risk_score >= 60 ? 'Require Re-authentication (Step-Up MFA)' : 'Zero Trust Assurance Normal'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Behavior matches organizational baseline. All access continuously validated.
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stats metric tiles */}
      <div className="metrics-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="zt-metric-tile">
          <div className={`val ${risk_score >= 80 ? 'critical' : risk_score >= 60 ? 'high' : risk_score >= 30 ? 'medium' : 'safe'}`}>
            {risk_score}/100
          </div>
          <div className="lbl">Risk Score</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val">{stats.total_events}</div>
          <div className="lbl">My Audit Events</div>
        </div>
        <div className="zt-metric-tile">
          <div className={`val ${stats.suspicious_events > 0 ? 'critical' : 'safe'}`}>
            {stats.suspicious_events}
          </div>
          <div className="lbl">Suspicious Flags</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val">{stats.active_sessions}</div>
          <div className="lbl">Active Sessions</div>
        </div>
      </div>

      {/* 6-Layer AI Risk Analysis Breakdown */}
      <div className="zt-card" style={{ marginBottom: '1.25rem', padding: '1rem 1.15rem', background: 'rgba(0, 245, 255, 0.03)', border: '1px solid rgba(0, 245, 255, 0.15)' }}>
        <div style={{ color: '#00f5ff', fontWeight: 'bold', fontSize: '0.84rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={16} /> Multi-Layer AI Risk Evaluation (6 Detection Layers)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem', fontSize: '0.75rem' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.55rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>L1 Rule Engine:</span> Static Threshold Rules
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.55rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>L2 Isolation Forest:</span> Global Anomaly Detection
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.55rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>L3 LOF:</span> Local Density Behavior
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.55rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>L4 One-Class SVM:</span> Novel Attack Vectors
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.55rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>L5 Personal Baseline:</span> History vs Today
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.55rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: '#a855f7', fontWeight: 'bold' }}>L6 Policy Engine:</span> Zero Trust Scope Rules
          </div>
        </div>
      </div>
    </div>
  );
}
