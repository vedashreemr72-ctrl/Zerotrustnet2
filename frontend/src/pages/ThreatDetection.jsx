import React, { useState, useEffect } from 'react';
import { Users, Shield, Cpu, Layers, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { formatShortTime } from '../utils/timeFormat';

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

  const getRiskColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 50) return '#f59e0b';
    return '#22c55e';
  };

  const getStatusBadge = (classification) => {
    const cls = classification || 'Normal';
    if (cls === 'Malicious') return <span className="zt-badge bc">MALICIOUS</span>;
    if (cls === 'Suspicious') return <span className="zt-badge bm">SUSPICIOUS</span>;
    return <span className="zt-badge bl">NORMAL</span>;
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="zt-title">Threat Detection & UEBA Analytics</div>
        <div className="zt-subtitle">Continuous user behavioral profiling, anomaly scoring, and insider threat classification</div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '270px minmax(0, 1fr)',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {/* Left Column: Monitored Employees Sidebar */}
        <div>
          <div className="zt-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} /> Monitored Employees
            </span>
            <span style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '10px',
              background: 'rgba(0, 245, 255, 0.1)',
              color: '#00f5ff',
              fontWeight: '600'
            }}>
              {employees.length} Active
            </span>
          </div>

          <div className="zt-card" style={{ padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {employees.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#4a6275', fontSize: '0.85rem' }}>
                No active employee telemetry found in database.
              </div>
            ) : (
              employees.map((emp, idx) => {
                const active = idx === selectedIdx;
                const threatClass = emp.threat_classification || 'Normal';
                const scoreColor = getRiskColor(emp.risk_score);

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedIdx(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      background: active ? 'rgba(0, 245, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: active ? '1px solid rgba(0, 245, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.04)',
                      borderLeft: `4px solid ${scoreColor}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: active ? 'rgba(0, 245, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: active ? '#00f5ff' : '#8aafc8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        border: `1px solid ${active ? '#00f5ff' : 'rgba(255, 255, 255, 0.1)'}`
                      }}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: active ? '#00f5ff' : 'var(--text-heading)', fontSize: '0.86rem' }}>
                          {emp.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#4a6275' }}>
                          {emp.department} • {threatClass}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        color: scoreColor,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: `${scoreColor}15`
                      }}>
                        {emp.risk_score}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Deep Drilldown Inspector */}
        {!currentEmp ? (
          <div className="zt-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <Shield size={36} style={{ margin: '0 auto 1rem', opacity: 0.5, color: '#00f5ff' }} />
            <div style={{ fontSize: '1rem', color: '#c8d6e8', fontWeight: 'bold' }}>No Monitored Employee Selected</div>
            <div style={{ fontSize: '0.85rem', color: '#4a6275', marginTop: '0.4rem' }}>
              Select an employee from the left panel to inspect real-time behavioral deviation and ML anomaly telemetry.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Unified Header Banner Card */}
            <div className="zt-card" style={{
              padding: '1.2rem 1.4rem',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              borderLeft: `4px solid ${getRiskColor(currentEmp.risk_score)}`,
              margin: 0
            }}>
              {/* Profile Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(0, 245, 255, 0.08)',
                  border: '1px solid rgba(0, 245, 255, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00f5ff'
                }}>
                  <Shield size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-heading)' }}>
                      {currentEmp.name}
                    </span>
                    {getStatusBadge(currentEmp.threat_classification)}
                    <span className={`zt-badge ${currentEmp.severity.includes('Critical') ? 'bc' : currentEmp.severity.includes('High') ? 'bh' : currentEmp.severity.includes('Medium') ? 'bm' : 'bl'}`}>
                      {currentEmp.severity.replace(/[^\w\s]/g, '').trim()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#8aafc8', marginTop: '3px' }}>
                    Department: <b style={{ color: 'var(--text-primary)' }}>{currentEmp.department}</b> &nbsp;|&nbsp; Behavioral Profile & Insider Threat Telemetry
                  </div>
                </div>
              </div>

              {/* Unified Risk Score Meter */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem',
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#4a6275', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Calculated Risk Rating
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: '800', color: getRiskColor(currentEmp.risk_score), fontFamily: 'monospace' }}>
                      {currentEmp.risk_score}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#4a6275' }}>/ 100</span>
                  </div>
                </div>
                <div style={{ width: '120px' }}>
                  <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${currentEmp.risk_score}%`,
                      backgroundColor: getRiskColor(currentEmp.risk_score),
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '0.68rem', color: getRiskColor(currentEmp.risk_score), fontWeight: '600', marginTop: '3px', textAlign: 'right' }}>
                    {currentEmp.risk_score >= 80 ? 'Critical Threat' : currentEmp.risk_score >= 50 ? 'Elevated Threat' : 'Normal State'}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Two-Column Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '1.25rem'
            }}>
              {/* Column 1: Baselines & ML Diagnostics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Digital Twin Baseline vs Observed Activity */}
                <div className="zt-card" style={{ padding: '1.2rem', margin: 0 }}>
                  <div className="zt-section-title" style={{ marginTop: 0, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={16} /> Digital Twin Baselines vs Observed Activity
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(0, 245, 255, 0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '6px 0', color: '#4a6275', fontWeight: '600' }}>Metric</th>
                        <th style={{ textAlign: 'center', padding: '6px 0', color: '#4a6275', fontWeight: '600' }}>Baseline</th>
                        <th style={{ textAlign: 'right', padding: '6px 0', color: '#00f5ff', fontWeight: '600' }}>Observed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '8px 0', color: '#8aafc8' }}>Login Time</td>
                        <td style={{ textAlign: 'center', color: '#4a6275' }}>{currentEmp.baseline_login_time}</td>
                        <td style={{
                          textAlign: 'right',
                          color: (currentEmp.login_time < 7 || currentEmp.login_time > 20) ? '#ef4444' : '#22c55e',
                          fontWeight: '600'
                        }}>
                          {currentEmp.login_time.toString().padStart(2, '0')}:00
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '8px 0', color: '#8aafc8' }}>Authorized Device</td>
                        <td style={{ textAlign: 'center', color: '#4a6275' }}>{currentEmp.baseline_device}</td>
                        <td style={{
                          textAlign: 'right',
                          color: currentEmp.device_known === 1 ? '#22c55e' : '#ef4444',
                          fontWeight: '600'
                        }}>
                          {currentEmp.device_known === 1 ? 'Registered Device' : 'Unregistered Device'}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '8px 0', color: '#8aafc8' }}>Usual Location</td>
                        <td style={{ textAlign: 'center', color: '#4a6275' }}>{currentEmp.baseline_location}</td>
                        <td style={{
                          textAlign: 'right',
                          color: currentEmp.impossible_travel_flag === 1 ? '#ef4444' : '#22c55e',
                          fontWeight: '600'
                        }}>
                          {currentEmp.current_login_location}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0', color: '#8aafc8' }}>Daily File Access</td>
                        <td style={{ textAlign: 'center', color: '#4a6275' }}>{currentEmp.baseline_file_access} files</td>
                        <td style={{
                          textAlign: 'right',
                          color: currentEmp.file_access_count > currentEmp.baseline_file_access * 2.5 ? '#ef4444' : '#22c55e',
                          fontWeight: '600'
                        }}>
                          {currentEmp.file_access_count} files
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Multi-Algorithm ML Anomaly Scoring */}
                <div className="zt-card" style={{ padding: '1.2rem', margin: 0 }}>
                  <div className="zt-section-title" style={{ marginTop: 0, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Cpu size={16} /> Multi-Algorithm ML Anomaly Scoring
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem' }}>
                    {Object.entries(currentEmp.algo_contrib).map(([algo, status], idx) => {
                      const isAnom = status.includes('ANOMALY') || status.includes('NOISE');
                      return (
                        <div key={idx} style={{
                          padding: '0.6rem 0.75rem',
                          background: isAnom ? 'rgba(239, 68, 68, 0.06)' : 'rgba(34, 197, 94, 0.06)',
                          border: `1px solid ${isAnom ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.2)'}`,
                          borderRadius: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <span style={{ fontSize: '0.74rem', color: '#8aafc8', fontWeight: '500' }}>{algo}</span>
                          <span style={{ fontSize: '0.78rem', color: isAnom ? '#ef4444' : '#22c55e', fontWeight: '700' }}>
                            {isAnom ? '⚠ Anomaly Flagged' : '✓ Normal Baseline'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Folder Privilege Scope */}
                  <div style={{ marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-heading)', fontWeight: '600', marginBottom: '6px' }}>
                      <Layers size={14} /> Folder Privilege Scope
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#4a6275', marginBottom: '6px' }}>
                      Permitted department scopes: <b style={{ color: '#8aafc8' }}>{currentEmp.expected_folders || 'None (Dormant)'}</b>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {currentEmp.accessed_folders ? currentEmp.accessed_folders.split(',').map((folder, fidx) => {
                        const cleanFolder = folder.trim();
                        const isOk = currentEmp.expected_folders && currentEmp.expected_folders.includes(cleanFolder);
                        return (
                          <span key={fidx} style={{
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: isOk ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            color: isOk ? '#22c55e' : '#ef4444',
                            border: `1px solid ${isOk ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                            fontWeight: '500'
                          }}>
                            {isOk ? '✓' : '✖'} {cleanFolder}
                          </span>
                        );
                      }) : <span style={{ fontSize: '0.72rem', color: '#4a6275', fontStyle: 'italic' }}>No folder accesses recorded in current session</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Explainable AI & Activity Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Explainable AI Evidence */}
                <div className="zt-card" style={{ padding: '1.2rem', margin: 0 }}>
                  <div className="zt-section-title" style={{ marginTop: 0, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} /> Explainable AI - Anomaly Evidence
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {currentEmp.reasons.map((reason, idx) => (
                      <div key={idx} style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-primary)',
                        padding: '6px 8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '4px',
                        borderLeft: '3px solid rgba(0, 245, 255, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ color: '#00f5ff' }}>•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* MITRE ATT&CK Mapping */}
                  {currentEmp.mitre_techniques && currentEmp.mitre_techniques !== 'None' && (
                    <div style={{
                      marginTop: '0.85rem',
                      padding: '8px 12px',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#8aafc8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          MITRE ATT&CK Mapping
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: '700' }}>
                          {currentEmp.mitre_techniques}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        fontWeight: '600',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                      }}>
                        Confidence: {currentEmp.mitre_confidence}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Runbook Recommendations */}
                <div className="zt-card" style={{ padding: '1.2rem', margin: 0 }}>
                  <div className="zt-section-title" style={{ marginTop: 0, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} /> Admin Runbook Recommendations
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {currentEmp.recommendations.map((rec, idx) => (
                      <div key={idx} style={{
                        fontSize: '0.78rem',
                        color: '#8aafc8',
                        padding: '6px 8px',
                        background: 'rgba(0, 245, 255, 0.03)',
                        borderRadius: '4px',
                        border: '1px solid rgba(0, 245, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ color: '#00f5ff' }}>▸</span> {rec}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sequential Behavioral Session Replay */}
                <div className="zt-card" style={{ padding: '1.2rem', margin: 0, maxHeight: '320px', overflowY: 'auto' }}>
                  <div className="zt-section-title" style={{ marginTop: 0, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} /> Behavioral Session Replay
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {currentEmp.timeline.map((event, idx) => (
                      <div key={idx} style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: event.flagged ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${event.flagged ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.76rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.9rem' }}>
                            {event.desc.toLowerCase().includes('login') ? '🔑' : event.desc.toLowerCase().includes('payroll') ? '💼' : event.desc.toLowerCase().includes('finance') ? '📁' : event.desc.toLowerCase().includes('download') ? '📄' : event.desc.toLowerCase().includes('usb') ? '🔌' : event.desc.toLowerCase().includes('logout') ? '🚪' : '⚡'}
                          </span>
                          <span style={{
                            color: event.flagged ? '#ef4444' : 'var(--text-primary)',
                            fontWeight: event.flagged ? '600' : 'normal'
                          }}>
                            {event.desc}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'monospace', color: '#00f5ff', fontSize: '0.76rem' }}>
                          {formatShortTime(event.time)}
                        </span>
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
