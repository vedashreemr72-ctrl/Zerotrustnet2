import React, { useState, useEffect } from 'react';
import { Users, Shield, Cpu, RefreshCw, Layers } from 'lucide-react';

export default function ThreatDetection({ token }) {
  const [employees, setEmployees] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to fetch employee list');
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

  if (loading) return <div style={{ padding: '2rem', color: '#00f5ff' }}>Loading behavioral profiles...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;

  const currentEmp = employees[selectedIdx];

  return (
    <div>
      <div className="zt-title">Threat Detection & UEBA Analytics</div>
      <div className="zt-subtitle">User Behaviour Analytics · Digital Twin Baseline · Multi-Algorithm ML · Threat Classification</div>

      <div className="grid-2col" style={{ gridTemplateColumns: '1fr 2.2fr' }}>
        {/* Left Column: List of Employees */}
        <div>
          <div className="zt-section-title">
            <Users size={18} /> Monitored Employees
          </div>
          <div className="zt-card" style={{ padding: '0.8rem', maxHeight: '550px', overflowY: 'auto' }}>
            {employees.map((emp, idx) => {
              const active = idx === selectedIdx;
              const threatClass = emp.threat_classification || 'Normal';
              const sevColor = threatClass === 'Malicious' ? '#ef4444' : threatClass === 'Suspicious' ? '#f59e0b' : '#10b981';

              return (
                <button
                  key={idx}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => setSelectedIdx(idx)}
                  style={{
                    marginBottom: '0.4rem',
                    borderLeft: `4px solid ${sevColor}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0.8rem',
                    width: '100%'
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', color: active ? '#00f5ff' : '#c8d6e8', fontSize: '0.85rem' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#4a6275' }}>{emp.department} • {threatClass}</div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', fontFamily: 'monospace', color: sevColor }}>{emp.risk_score}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Drilldown */}
        {currentEmp && (
          <div>
            <div className="zt-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><Shield size={18} /> Behavioral Profile & Insider Threat Analysis: {currentEmp.name}</span>
              <span className={`zt-badge ${currentEmp.threat_classification === 'Malicious' ? 'bc' : currentEmp.threat_classification === 'Suspicious' ? 'bm' : 'bl'}`}>
                Classification: {currentEmp.threat_classification || 'Normal'}
              </span>
            </div>

            <div className="grid-2col">
              {/* Baseline vs Actual */}
              <div>
                <div className="zt-card info" style={{ padding: '1.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#00f5ff' }}>Digital Twin Baselines vs Observed Activity</span>
                    <span className={`zt-badge ${currentEmp.severity.includes('Critical') ? 'bc' : currentEmp.severity.includes('High') ? 'bh' : currentEmp.severity.includes('Medium') ? 'bm' : 'bl'}`}>
                      {currentEmp.severity.replace(/[^\w\s]/g, '').trim()}
                    </span>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(0, 245, 255, 0.08)' }}>
                        <th style={{ textAlign: 'left', padding: '6px 0', color: '#4a6275' }}>Metric</th>
                        <th style={{ textAlign: 'center', padding: '6px 0', color: '#4a6275' }}>Baseline</th>
                        <th style={{ textAlign: 'center', padding: '6px 0', color: '#00f5ff' }}>Current</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(0, 245, 255, 0.04)' }}>
                        <td style={{ padding: '8px 0', color: '#8aafc8' }}>Login Time</td>
                        <td style={{ textAlign: 'center', color: '#4a6275' }}>{currentEmp.baseline_login_time}</td>
                        <td style={{ textAlign: 'center', color: (currentEmp.login_time < 7 || currentEmp.login_time > 20) ? '#ef4444' : '#22c55e', fontWeight: '500' }}>
                          {currentEmp.login_time.toString().padStart(2, '0')}:00
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(0, 245, 255, 0.04)' }}>
                        <td style={{ padding: '8px 0', color: '#8aafc8' }}>Authorized Device</td>
                        <td style={{ textAlign: 'center', color: '#4a6275' }}>{currentEmp.baseline_device}</td>
                        <td style={{ textAlign: 'center', color: currentEmp.device_known === 1 ? '#22c55e' : '#ef4444', fontWeight: '500' }}>
                          {currentEmp.device_known === 1 ? 'Registered Device' : 'Unregistered Device'}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(0, 245, 255, 0.04)' }}>
                        <td style={{ padding: '8px 0', color: '#8aafc8' }}>Usual Location</td>
                        <td style={{ textAlign: 'center', color: '#4a6275' }}>{currentEmp.baseline_location}</td>
                        <td style={{ textAlign: 'center', color: currentEmp.impossible_travel_flag === 1 ? '#ef4444' : '#22c55e', fontWeight: '500' }}>
                          {currentEmp.current_login_location}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0', color: '#8aafc8' }}>File Access / Day</td>
                        <td style={{ textAlign: 'center', color: '#4a6275' }}>{currentEmp.baseline_file_access} files</td>
                        <td style={{ textAlign: 'center', color: currentEmp.file_access_count > currentEmp.baseline_file_access * 2.5 ? '#ef4444' : '#22c55e', fontWeight: '500' }}>
                          {currentEmp.file_access_count} files
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="zt-card" style={{ padding: '1rem' }}>
                  <div className="rb-wrap">
                    <div className="rb-label">
                      <span>Calculated Unified Risk Rating</span>
                      <span style={{ fontWeight: 'bold' }}>{currentEmp.risk_score}/100</span>
                    </div>
                    <div className="rb-track">
                      <div className="rb-fill" style={{
                        width: `${currentEmp.risk_score}%`,
                        backgroundColor: currentEmp.risk_score >= 80 ? '#ef4444' : currentEmp.risk_score >= 60 ? '#f97316' : currentEmp.risk_score >= 30 ? '#eab308' : '#22c55e'
                      }}></div>
                    </div>
                  </div>
                </div>

                {/* ML algorithm output breakdown */}
                <div className="zt-section-title" style={{ marginTop: '1rem' }}>
                  <Cpu size={15} /> Multi-Algorithm ML Anomaly Scoring
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {Object.entries(currentEmp.algo_contrib).map(([algo, status], idx) => {
                    const isAnom = status.includes('ANOMALY') || status.includes('NOISE');
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(6, 14, 42, 0.5)', border: '1px solid rgba(0, 245, 255, 0.04)', borderRadius: '6px', fontSize: '0.78rem' }}>
                        <span style={{ color: '#8aafc8' }}>{algo}</span>
                        <span style={{ color: isAnom ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
                          {isAnom ? '⚠ Anomaly Flagged' : '✓ Normal Baseline'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Folder Permissions */}
                <div className="zt-section-title" style={{ marginTop: '1rem' }}>
                  <Layers size={15} /> Folder Privilege Scope
                </div>
                <div className="zt-card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#4a6275' }}>
                      Permitted department scopes: <b>{currentEmp.expected_folders || 'None (Dormant)'}</b>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {currentEmp.accessed_folders ? currentEmp.accessed_folders.split(',').map((folder, fidx) => {
                        const cleanFolder = folder.trim();
                        const isOk = currentEmp.expected_folders && currentEmp.expected_folders.includes(cleanFolder);
                        return (
                          <span key={fidx} style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isOk ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            color: isOk ? '#22c55e' : '#ef4444',
                            border: `1px solid ${isOk ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                          }}>
                            {isOk ? '✓' : '✖'} {cleanFolder}
                          </span>
                        );
                      }) : <span style={{ fontSize: '0.72rem', color: '#4a6275', fontStyle: 'italic' }}>No folder accesses recorded in current session</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Explanations and timeline */}
              <div>
                <div className="zt-card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#3d5470', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    Explainable AI - Anomaly Evidence
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {currentEmp.reasons.map((reason, idx) => (
                      <div key={idx} style={{ fontSize: '0.8rem', color: '#c8d6e8', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        ◦ {reason}
                      </div>
                    ))}
                  </div>

                  {currentEmp.mitre_techniques && currentEmp.mitre_techniques !== 'None' && (
                    <div style={{ marginTop: '0.8rem', padding: '8px 10px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.65rem', color: '#4a6275', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>
                        MITRE ATT&CK Mapping
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '600' }}>
                        {currentEmp.mitre_techniques}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#8aafc8', marginTop: '2px' }}>
                        Engine Confidence: {currentEmp.mitre_confidence}%
                      </div>
                    </div>
                  )}
                </div>

                <div className="zt-card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#3d5470', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    Admin Runbook Recommendations
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {currentEmp.recommendations.map((rec, idx) => (
                      <div key={idx} style={{ fontSize: '0.8rem', color: '#8aafc8' }}>
                        ▸ {rec}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="zt-card" style={{ padding: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.72rem', color: '#3d5470', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    Session Replay
                  </div>
                  <div className="tl-wrap">
                    {currentEmp.timeline.map((event, idx) => (
                      <div key={idx} className={`tl-item ${event.flagged ? 'fl' : ''}`}>
                        <div className="tl-t">{event.time}</div>
                        <div className={`tl-d ${event.flagged ? 'fl-d' : ''}`}>{event.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
