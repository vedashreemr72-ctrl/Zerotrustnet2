import React, { useState, useEffect } from 'react';
import { Shield, Zap, RefreshCw } from 'lucide-react';

export default function AttackSimulation({ token }) {
  const [employees, setEmployees] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to load employees for simulation');
      setEmployees(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  const handleSimulate = async (vector) => {
    setActionMsg({ text: '', type: '' });
    try {
      const currentEmp = employees[selectedIdx];
      const response = await fetch('/api/admin/sim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_name: currentEmp.name,
          vector: vector
        })
      });
      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.error || 'Simulate failed');
      }
      setActionMsg({ text: `🔥 Successfully injected ${vector.toUpperCase()} attack vector on ${currentEmp.name}. Risk engine recalculated score.`, type: 'success' });
      fetchEmployees();
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    }
  };

  const handleReset = async () => {
    setActionMsg({ text: '', type: '' });
    try {
      const currentEmp = employees[selectedIdx];
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
      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.error || 'Reset failed');
      }
      setActionMsg({ text: `✓ Successfully restored baseline behavior parameters for ${currentEmp.name}.`, type: 'success' });
      fetchEmployees();
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading target vectors...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;

  const currentEmp = employees[selectedIdx];
  const riskColor = currentEmp.risk_score >= 80 ? '#ef4444' : currentEmp.risk_score >= 60 ? '#f97316' : currentEmp.risk_score >= 30 ? '#eab308' : '#22c55e';

  return (
    <div>
      <div className="zt-title">Attack Simulation</div>
      <div className="zt-subtitle">Inject Incident Vectors · Validate Policy Alerts · Stress Test ML Engine</div>

      <div style={{ marginBottom: '1.2rem' }}>
        <label style={{ fontSize: '0.8rem', color: '#4a6275', display: 'block', marginBottom: '4px' }}>🎯 Select Target Employee for Vector Injection</label>
        <select 
          className="zt-select" 
          value={selectedIdx} 
          onChange={(e) => setSelectedIdx(Number(e.target.value))}
        >
          {employees.map((emp, idx) => (
            <option key={idx} value={idx}>{emp.name} ({emp.department} · Risk: {emp.risk_score})</option>
          ))}
        </select>
      </div>

      {actionMsg.text && (
        <div className={`zt-card ${actionMsg.type === 'success' ? 'low' : 'critical'}`} style={{ marginBottom: '1.2rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            {actionMsg.type === 'success' ? '✅ System Update' : '❌ Error Injected'}
          </div>
          <div style={{ fontSize: '0.84rem', marginTop: '4px' }}>{actionMsg.text}</div>
        </div>
      )}

      <div className="grid-2col">
        {/* Left Column: Attack Vectors */}
        <div>
          <div className="zt-section-title">
            <Zap size={18} color="#ef4444" /> Attack Injection Vectors
          </div>
          <div className="zt-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#4a6275' }}>
              Select a simulated cyber threat vector to inject on {currentEmp.name}. The system will immediately update behavior metrics and run the ML models.
            </p>

            <button className="zt-btn critical full-width" onClick={() => handleSimulate('usb')}>
              🔌 USB Exfiltration Vector (Resignation notice + mass file export)
            </button>
            <button className="zt-btn critical full-width" onClick={() => handleSimulate('phish')}>
              🎣 Phishing & Credential Theft (Unregistered device + off-hours North Korea IP)
            </button>
            <button className="zt-btn critical full-width" onClick={() => handleSimulate('privilege')}>
              🔑 Unauthorized Privilege Escalation (Access AD/DC logs + role change)
            </button>
            <button className="zt-btn critical full-width" onClick={() => handleSimulate('shadow')}>
              🌐 Shadow IT & GenAI Leak (Paste code to ChatGPT + AnyDesk block)
            </button>
            <button className="zt-btn critical full-width" onClick={() => handleSimulate('travel')}>
              🌍 Impossible Travel Event (Concurrent logins Russia vs Office IP)
            </button>

            <div style={{ borderTop: '1px solid rgba(0, 245, 255, 0.08)', paddingTop: '0.8rem', marginTop: '0.4rem' }}>
              <button className="zt-btn full-width" onClick={handleReset}>
                <RefreshCw size={15} /> Restore Baseline Parameters
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Target Details */}
        <div>
          <div className="zt-section-title">
            <Shield size={18} /> Target Context: {currentEmp.name}
          </div>
          <div className="zt-card" style={{ borderLeft: `3px solid ${riskColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#3d5470', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Live Risk Rating
              </span>
              <span className={`zt-badge ${currentEmp.severity.includes('Critical') ? 'bc' : currentEmp.severity.includes('High') ? 'bh' : currentEmp.severity.includes('Medium') ? 'bm' : 'bl'}`}>
                {currentEmp.severity.replace(/[^\w\s]/g, '').trim()}
              </span>
            </div>

            <div className="rb-wrap" style={{ marginBottom: '1rem' }}>
              <div className="rb-label">
                <span>Unified Score</span>
                <span style={{ color: riskColor, fontWeight: 'bold' }}>{currentEmp.risk_score}/100</span>
              </div>
              <div className="rb-track">
                <div className="rb-fill" style={{ width: `${currentEmp.risk_score}%`, backgroundColor: riskColor }}></div>
              </div>
            </div>

            <b style={{ color: '#8aafc8', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>Observable Threat Drivers:</b>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {currentEmp.reasons.map((r, idx) => (
                <div key={idx} style={{ fontSize: '0.78rem', color: '#c8d6e8' }}>
                  • {r}
                </div>
              ))}
            </div>

            {currentEmp.mitre_techniques && currentEmp.mitre_techniques !== 'None' && (
              <div style={{ marginTop: '0.8rem', padding: '8px 10px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.65rem', color: '#4a6275', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>
                  MITRE Mapping
                </div>
                <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '600' }}>
                  {currentEmp.mitre_techniques}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
