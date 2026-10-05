import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Zap, RefreshCw, HardDrive, Globe, Key, Terminal, 
  CheckCircle, AlertTriangle, Play, Pause, ChevronRight, Activity,
  Server, Lock, ArrowRight, Clock, AlertOctagon, Check, ShieldAlert, Cpu
} from 'lucide-react';

const VECTORS = [
  {
    id: 'usb',
    num: 1,
    title: 'USB Exfiltration Vector',
    subtitle: 'Resignation Notice + Mass File Export',
    icon: HardDrive,
    badgeColor: '#ef4444',
    tag: 'T1052.001 Exfiltration over USB',
    threatDesc: 'Simulates an employee who submitted resignation notice inserting an unauthorized external USB flash drive to copy 280 sensitive confidential source code and customer files.',
    injectedParams: [
      { label: 'USB Usage', value: '1 (Active / Mounted)' },
      { label: 'Downloads Surge', value: '280 files (+275 from baseline)' },
      { label: 'Sensitive Docs', value: '14 Confidential files' },
      { label: 'Resignation Status', value: 'Submitted (30-day notice)' }
    ],
    zeroTrustPolicy: 'POL-003: Removable Storage Lockout & Token Revocation',
    automatedAction: 'Zero Trust Agent disables USB endpoint controller; invalidates active JWT/session tokens; quarantines workstation network access.',
    expectedScore: 92,
    impact: '₹11,00,000'
  },
  {
    id: 'phish',
    num: 2,
    title: 'Phishing & Credential Theft',
    subtitle: 'Unregistered Device + Off-Hours North Korea IP',
    icon: Globe,
    badgeColor: '#f97316',
    tag: 'T1078 Valid Accounts, T1110 Brute Force',
    threatDesc: 'Simulates compromised credentials being utilized from an untrusted Linux endpoint originating from Pyongyang, North Korea (175.45.176.88) at 03:00 AM with 6 consecutive MFA failures.',
    injectedParams: [
      { label: 'Device Status', value: '0 (Unregistered / Unknown Linux)' },
      { label: 'Failed Logins', value: '6 consecutive failures' },
      { label: 'Login Timestamp', value: '03:00 AM (Baseline: 09:00 AM)' },
      { label: 'Location Origin', value: 'Pyongyang, North Korea (175.45.176.88)' }
    ],
    zeroTrustPolicy: 'POL-001: High-Risk Geolocation & Brute Force Lockout',
    automatedAction: 'Account quarantined in Active Directory; FIDO2 hardware security key challenge enforced; North Korea IP range blocked.',
    expectedScore: 88,
    impact: '₹8,50,000'
  },
  {
    id: 'privilege',
    num: 3,
    title: 'Unauthorized Privilege Escalation',
    subtitle: 'Access AD/DC Logs + Role Elevation to Domain Admin',
    icon: Key,
    badgeColor: '#dc2626',
    tag: 'T1078 Valid Accounts, T1098 Account Manipulation',
    threatDesc: 'Simulates a standard employee account attempting to access Active Directory Domain Controller audit logs and tampering with role assignments from Employee to Domain Admin.',
    injectedParams: [
      { label: 'Privilege Escalation Flag', value: '1 (Active)' },
      { label: 'Role Transition', value: 'Yesterday: Employee → Today: Domain Admin' },
      { label: 'Target Resource', value: 'Active Directory DC Security Logs' },
      { label: 'Threat Severity', value: 'P1 - High Threat Level' }
    ],
    zeroTrustPolicy: 'POL-002: Real-time Privilege Tamper Guardrail',
    automatedAction: 'Elevated domain credentials stripped in real time; Active Directory session killed; P1 Critical Incident ticket generated for SOC dispatch.',
    expectedScore: 96,
    impact: '₹24,00,000'
  },
  {
    id: 'shadow',
    num: 4,
    title: 'Shadow IT & GenAI Leak',
    subtitle: 'Paste Code to ChatGPT + AnyDesk Remote Tunnel',
    icon: Terminal,
    badgeColor: '#eab308',
    tag: 'T1567.002 Exfiltration to Cloud Services',
    threatDesc: 'Simulates 112.5 MB of proprietary core algorithm files uploaded to public AI tools (ChatGPT/Gemini) and an unauthorized outbound AnyDesk remote tunnel initiated.',
    injectedParams: [
      { label: 'GenAI Data Upload', value: '112.5 MB (+112.5 MB surge)' },
      { label: 'Shadow IT Detection', value: 'AnyDesk (Blocked), Unknown VPN (Blocked)' },
      { label: 'AI Risk Driver', value: 'Proprietary source code pasted to ChatGPT' },
      { label: 'Data Classification', value: 'Restricted / Intellectual Property' }
    ],
    zeroTrustPolicy: 'POL-004: GenAI & Remote Tunnel DLP',
    automatedAction: 'Outbound generative AI domains blocked at DNS/Proxy layer; AnyDesk process killed; SOC DLP audit log created.',
    expectedScore: 90,
    impact: '₹16,00,000'
  },
  {
    id: 'travel',
    num: 5,
    title: 'Impossible Travel Event',
    subtitle: 'Concurrent Logins: Bengaluru vs Moscow Russia IP',
    icon: Shield,
    badgeColor: '#00f5ff',
    tag: 'T1133 External Remote Services',
    threatDesc: 'Simulates concurrent active sessions detected: legitimate login from Bengaluru Office (09:00 AM) and authenticated session from Moscow, Russia IP (09:08 AM) — 10 hours travel in 8 mins.',
    injectedParams: [
      { label: 'Impossible Travel Flag', value: '1 (Geo-velocity violation)' },
      { label: 'Speed / Velocity', value: '5,000+ km in 8 minutes (Impossible)' },
      { label: 'IP Origin', value: '185.220.101.5 (Moscow, Russia)' },
      { label: 'Device Known', value: '0 (Untrusted Windows 11 Desktop)' }
    ],
    zeroTrustPolicy: 'POL-005: Impossible Geo-Velocity Zero Trust Gate',
    automatedAction: 'All active user session tokens globally invalidated; Russian IP address blacklisted; mandatory password + hardware MFA reset.',
    expectedScore: 94,
    impact: '₹18,00,000'
  }
];

export default function AttackSimulation({ token }) {
  const [employees, setEmployees] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [simulatingId, setSimulatingId] = useState(null);
  const [activeVectorData, setActiveVectorData] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAutoTourRunning, setIsAutoTourRunning] = useState(false);
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('vectors'); // 'vectors' or 'forensics'

  const autoTourTimerRef = useRef(null);

  const fetchEmployees = async (preferredName = null) => {
    try {
      const response = await fetch('/api/admin/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to load employees for simulation');
      setEmployees(res);

      if (preferredName) {
        const foundIdx = res.findIndex(e => e.name.toLowerCase() === preferredName.toLowerCase());
        if (foundIdx !== -1) setSelectedIdx(foundIdx);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    return () => {
      if (autoTourTimerRef.current) clearInterval(autoTourTimerRef.current);
    };
  }, [token]);

  const handleSimulate = async (vectorId, stepIdx = null) => {
    setActionMsg({ text: '', type: '' });
    setSimulatingId(vectorId);
    if (stepIdx !== null) setCurrentStepIndex(stepIdx);

    try {
      const currentEmp = employees[selectedIdx] || { name: 'Ravi Sharma' };
      const response = await fetch('/api/admin/sim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_name: currentEmp.name,
          vector: vectorId
        })
      });

      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Simulation vector injection failed');

      const matchingVectorDef = VECTORS.find(v => v.id === vectorId) || VECTORS[0];
      const vectorData = {
        ...matchingVectorDef,
        ...(res.vector_meta || {}),
        newRiskScore: res.new_risk_score || matchingVectorDef.expectedScore,
        newSeverity: res.new_severity || '🔴 Critical',
        newReasons: res.new_reasons || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      };

      setActiveVectorData(vectorData);
      setActionMsg({
        text: `🔥 INJECTED: [${vectorData.title.toUpperCase()}] on ${currentEmp.name}. Risk surged to ${vectorData.newRiskScore}/100. Zero Trust policy triggered and incident dispatched.`,
        type: 'success'
      });

      await fetchEmployees(currentEmp.name);
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    } finally {
      setSimulatingId(null);
    }
  };

  const handleReset = async () => {
    setActionMsg({ text: '', type: '' });
    setSimulatingId('reset');
    stopAutoTour();

    try {
      const currentEmp = employees[selectedIdx] || { name: 'Ravi Sharma' };
      const response = await fetch('/api/admin/sim/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_name: currentEmp.name
        })
      });

      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Reset failed');

      setActiveVectorData(null);
      setCurrentStepIndex(0);
      setActionMsg({
        text: `✓ RESTORED: Clean baseline behavior restored for ${currentEmp.name}. Risk normalized to ${res.new_risk_score || 12}/100 (${res.new_severity || '🟢 Low'}). All anomalies cleared.`,
        type: 'success'
      });

      await fetchEmployees(currentEmp.name);
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    } finally {
      setSimulatingId(null);
    }
  };

  // Step-by-step runner: executes the next vector
  const handleNextStep = () => {
    const nextIdx = (currentStepIndex + 1) % VECTORS.length;
    handleSimulate(VECTORS[nextIdx].id, nextIdx);
  };

  // Auto-tour runner
  const startAutoTour = () => {
    setIsAutoTourRunning(true);
    let step = 0;
    handleSimulate(VECTORS[0].id, 0);

    autoTourTimerRef.current = setInterval(() => {
      step = (step + 1) % VECTORS.length;
      handleSimulate(VECTORS[step].id, step);
    }, 4500);
  };

  const stopAutoTour = () => {
    setIsAutoTourRunning(false);
    if (autoTourTimerRef.current) {
      clearInterval(autoTourTimerRef.current);
      autoTourTimerRef.current = null;
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading target vectors...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;

  const currentEmp = employees[selectedIdx] || {
    name: 'Ravi Sharma',
    department: 'Engineering',
    risk_score: activeVectorData ? activeVectorData.newRiskScore : 12,
    severity: activeVectorData ? activeVectorData.newSeverity : '🟢 Low',
    reasons: []
  };

  const riskScore = activeVectorData ? activeVectorData.newRiskScore : (currentEmp.risk_score || 0);
  const riskColor = riskScore >= 80 ? '#ef4444' : riskScore >= 60 ? '#f97316' : riskScore >= 30 ? '#eab308' : '#22c55e';

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
        <div>
          <div className="zt-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={24} color="#ef4444" /> Breach & Attack Simulation (BAS)
          </div>
          <div className="zt-subtitle">
            Inject Realistic Threat Vectors · Observe Machine Learning Anomaly Detection · Validate Zero Trust Policy Enforcement
          </div>
        </div>

        {/* Quick Restore Baseline Button */}
        <button 
          className="zt-btn" 
          onClick={handleReset}
          disabled={simulatingId === 'reset'}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'rgba(2, 132, 199, 0.1)', 
            border: '1px solid #0284c7', 
            color: '#0284c7',
            padding: '8px 16px',
            fontSize: '0.84rem'
          }}
        >
          <RefreshCw size={16} className={simulatingId === 'reset' ? 'spin' : ''} />
          {simulatingId === 'reset' ? 'Restoring Baseline...' : 'Restore Baseline Parameters'}
        </button>
      </div>

      {/* Target Selector & Guided Tour Stepper Bar */}
      <div className="zt-card" style={{ marginBottom: '1.5rem', padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ minWidth: '280px', flex: '1' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
              🎯 TARGET EMPLOYEE FOR SIMULATION
            </label>
            <select 
              className="zt-select" 
              value={selectedIdx} 
              onChange={(e) => {
                setSelectedIdx(Number(e.target.value));
                setActiveVectorData(null);
              }}
              style={{ width: '100%', padding: '9px 12px', fontSize: '0.88rem' }}
            >
              {employees.map((emp, idx) => (
                <option key={idx} value={idx}>
                  {emp.name} ({emp.department} · Current Risk: {emp.risk_score}/100 · {emp.severity})
                </option>
              ))}
            </select>
          </div>

          {/* Stepper Tour Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="zt-btn"
              onClick={handleNextStep}
              disabled={simulatingId !== null}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                fontWeight: 600
              }}
            >
              <Play size={15} /> Run Next Vector ({currentStepIndex + 1}/5)
            </button>

            <button
              className="zt-btn"
              onClick={isAutoTourRunning ? stopAutoTour : startAutoTour}
              style={{
                background: isAutoTourRunning ? '#ef4444' : 'rgba(16, 185, 129, 0.15)',
                color: isAutoTourRunning ? '#ffffff' : '#10b981',
                border: `1px solid ${isAutoTourRunning ? '#ef4444' : '#10b981'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 14px'
              }}
            >
              {isAutoTourRunning ? <Pause size={15} /> : <Activity size={15} />}
              {isAutoTourRunning ? 'Stop Auto-Tour' : 'Auto-Play All (4s loop)'}
            </button>
          </div>
        </div>

        {/* Step-by-Step Progress Bar (One by One) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sequential Attack Vectors Progress:
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
              Vector {currentStepIndex + 1} of 5: {VECTORS[currentStepIndex].title}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {VECTORS.map((v, i) => {
              const isActive = activeVectorData?.id === v.id;
              const isCurrentStep = currentStepIndex === i;
              return (
                <button
                  key={v.id}
                  onClick={() => handleSimulate(v.id, i)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${isActive ? v.badgeColor : isCurrentStep ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                    background: isActive ? `${v.badgeColor}22` : isCurrentStep ? 'rgba(2, 132, 199, 0.1)' : 'var(--bg-tile)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isActive ? v.badgeColor : 'var(--text-muted)' }}>
                      STEP {v.num}
                    </span>
                    {isActive && <span style={{ fontSize: '0.65rem', color: v.badgeColor, fontWeight: 700 }}>● LIVE</span>}
                  </div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: isActive ? 'var(--text-heading)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {v.title.split(' ')[0]} {v.title.split(' ')[1]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-Time Action Feedback Alert */}
      {actionMsg.text && (
        <div 
          className="zt-card" 
          style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem 1.2rem',
            borderLeft: `4px solid ${actionMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
            background: actionMsg.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.88rem', color: actionMsg.type === 'success' ? '#10b981' : '#ef4444' }}>
            {actionMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{actionMsg.type === 'success' ? 'Simulation Engine Verified' : 'Injection Error'}</span>
          </div>
          <div style={{ fontSize: '0.82rem', marginTop: '4px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
            {actionMsg.text}
          </div>
        </div>
      )}

      {/* Main 2-Column Workspace: Left = Threat Injection Buttons, Right = Live Telemetry & Forensics */}
      <div className="grid-2col" style={{ alignItems: 'start', gap: '1.5rem' }}>
        
        {/* Left Column: Interactive Threat Vector Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="zt-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#ef4444" /> Click Any Vector to Execute
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Clicking injects live telemetry to ML Engine
            </span>
          </div>

          {VECTORS.map((vec, idx) => {
            const Icon = vec.icon;
            const isInjecting = simulatingId === vec.id;
            const isActive = activeVectorData?.id === vec.id;

            return (
              <div 
                key={vec.id}
                className="zt-card"
                style={{
                  padding: '1.2rem',
                  border: `1px solid ${isActive ? vec.badgeColor : 'var(--border-subtle)'}`,
                  borderLeft: `5px solid ${vec.badgeColor}`,
                  boxShadow: isActive ? `0 4px 20px ${vec.badgeColor}25` : 'none',
                  transition: 'all 0.25s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: `${vec.badgeColor}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: vec.badgeColor
                    }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-heading)' }}>
                          {vec.num}. {vec.title}
                        </span>
                        {isActive && (
                          <span style={{ 
                            background: '#ef4444', 
                            color: '#ffffff', 
                            fontSize: '0.64rem', 
                            fontWeight: 800, 
                            padding: '1px 6px', 
                            borderRadius: '10px' 
                          }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {vec.subtitle}
                      </span>
                    </div>
                  </div>

                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    color: vec.badgeColor,
                    background: `${vec.badgeColor}15`,
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    Target Risk: {vec.expectedScore}/100
                  </span>
                </div>

                <p style={{ fontSize: '0.79rem', color: 'var(--text-secondary)', lineHeight: '1.45', margin: '8px 0' }}>
                  {vec.threatDesc}
                </p>

                {/* MITRE and Impact Details */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  fontSize: '0.72rem', 
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '8px',
                  marginBottom: '10px'
                }}>
                  <span><b>MITRE:</b> {vec.tag.split(',')[0]}</span>
                  <span><b>Loss Exposure:</b> <strong style={{ color: '#ef4444' }}>{vec.impact}</strong></span>
                </div>

                {/* Execute Button */}
                <button
                  className="zt-btn full-width"
                  onClick={() => handleSimulate(vec.id, idx)}
                  disabled={isInjecting}
                  style={{
                    background: isActive ? vec.badgeColor : 'var(--bg-topbar)',
                    color: '#ffffff',
                    border: `1px solid ${vec.badgeColor}`,
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: isActive ? `0 0 10px ${vec.badgeColor}40` : 'none'
                  }}
                >
                  {isInjecting ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Injecting Exploit Payload on {currentEmp.name}...
                    </>
                  ) : isActive ? (
                    <>
                      <CheckCircle size={15} /> Threat Injected & Evaluated (Click to Re-test)
                    </>
                  ) : (
                    <>
                      <Zap size={15} /> Inject Threat Vector #{vec.num}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Column: Live Target Evaluation & Forensic Defense Terminal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Target Risk Profile Card */}
          <div className="zt-card" style={{ borderLeft: `4px solid ${riskColor}`, padding: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                  Target Subject Live Status
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  {currentEmp.name} ({currentEmp.department})
                </div>
              </div>

              <span className={`zt-badge ${riskScore >= 80 ? 'bc' : riskScore >= 60 ? 'bh' : riskScore >= 30 ? 'bm' : 'bl'}`} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                {riskScore >= 80 ? 'CRITICAL RISK' : riskScore >= 60 ? 'HIGH RISK' : riskScore >= 30 ? 'MEDIUM RISK' : 'LOW RISK / NORMAL'}
              </span>
            </div>

            {/* Score Bar */}
            <div className="rb-wrap" style={{ marginBottom: '1.2rem' }}>
              <div className="rb-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Zero Trust Unified Risk Index</span>
                <span style={{ color: riskColor, fontWeight: 800, fontSize: '0.94rem' }}>{riskScore} / 100</span>
              </div>
              <div className="rb-track" style={{ height: '10px', borderRadius: '5px', background: 'var(--border-subtle)', overflow: 'hidden' }}>
                <div 
                  className="rb-fill" 
                  style={{ 
                    width: `${riskScore}%`, 
                    backgroundColor: riskColor, 
                    height: '100%', 
                    transition: 'width 0.4s ease, background-color 0.4s ease' 
                  }}
                ></div>
              </div>
            </div>

            {/* Observable Threat Drivers */}
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Active Telemetry & Threat Drivers:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {currentEmp.reasons && currentEmp.reasons.length > 0 ? (
                  currentEmp.reasons.map((r, idx) => (
                    <div key={idx} style={{ fontSize: '0.78rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: riskColor }}>•</span> {r}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} /> Normal behavioral baseline. Zero active telemetry anomalies detected.
                  </div>
                )}
              </div>
            </div>

            {/* MITRE Tag */}
            {currentEmp.mitre_techniques && currentEmp.mitre_techniques !== 'None' && (
              <div style={{ marginTop: '0.8rem', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.66rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '3px' }}>
                  MITRE ATT&CK Matrix Mapping
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-heading)', fontWeight: 600 }}>
                  {currentEmp.mitre_techniques}
                </div>
              </div>
            )}
          </div>

          {/* Live Forensic Terminal & Zero Trust Defense Console */}
          <div className="zt-card" style={{ padding: '1.2rem', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={18} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-heading)' }}>
                  Interactive Threat & Defense Forensic Pipeline
                </span>
              </div>

              {activeVectorData ? (
                <span style={{ 
                  fontSize: '0.68rem', 
                  color: '#ef4444', 
                  background: 'rgba(239, 68, 68, 0.12)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '2px 8px', 
                  borderRadius: '10px',
                  fontWeight: 700
                }}>
                  EXPLOIT ACTIVE
                </span>
              ) : (
                <span style={{ 
                  fontSize: '0.68rem', 
                  color: '#10b981', 
                  background: 'rgba(16, 185, 129, 0.12)', 
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '2px 8px', 
                  borderRadius: '10px',
                  fontWeight: 700
                }}>
                  CLEAN BASELINE
                </span>
              )}
            </div>

            {activeVectorData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Stage 1: Attack Payload */}
                <div style={{ padding: '10px', borderRadius: '6px', background: 'var(--bg-tile)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 700, fontSize: '0.78rem', marginBottom: '4px' }}>
                    <AlertOctagon size={14} /> STAGE 1: INJECTED ATTACK PAYLOAD
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    {activeVectorData.threat_summary || activeVectorData.threatDesc}
                  </div>
                </div>

                {/* Stage 2: Telemetry Injected Grid */}
                <div style={{ padding: '10px', borderRadius: '6px', background: 'var(--bg-tile)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00f5ff', fontWeight: 700, fontSize: '0.78rem', marginBottom: '6px' }}>
                    <Activity size={14} /> STAGE 2: LIVE TELEMETRY PARAMETER SURGE
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {activeVectorData.injectedParams.map((param, pidx) => (
                      <div key={pidx} style={{ fontSize: '0.72rem', padding: '4px 6px', background: 'var(--bg-app)', borderRadius: '4px' }}>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>{param.label}:</span>
                        <span style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{param.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stage 3: Zero Trust Guardrail Policy */}
                <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284c7', fontWeight: 700, fontSize: '0.78rem', marginBottom: '4px' }}>
                    <ShieldAlert size={14} /> STAGE 3: ZERO TRUST GUARDRAIL TRIGGERED
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '3px' }}>
                    {activeVectorData.policy || activeVectorData.zeroTrustPolicy}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    <b>Automated SOC Defense:</b> {activeVectorData.defense || activeVectorData.automatedAction}
                  </div>
                </div>

                {/* Stage 4: Incident Case & Alert */}
                <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 700, fontSize: '0.78rem', marginBottom: '4px' }}>
                    <CheckCircle size={14} /> STAGE 4: SIEM INCIDENT DISPATCHED
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-primary)' }}>
                    Incident ticket registered in SOC Queue. Real-time SIEM alerts dispatched to analyst notification center at <b>{activeVectorData.timestamp}</b>.
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <Activity size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>No active attack vector injected.</div>
                <div style={{ fontSize: '0.76rem', marginTop: '4px' }}>
                  Click any of the 5 threat vector buttons on the left or click <b>"Run Next Vector"</b> to view real-time forensic detection and defense.
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
