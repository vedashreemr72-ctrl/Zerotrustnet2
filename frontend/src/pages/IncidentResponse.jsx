import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Shield, Archive, MessageSquare, Search, Zap, Check, Lock, UserCheck } from 'lucide-react';

export default function IncidentResponse({ token }) {
  const [incidents, setIncidents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [notesUpdates, setNotesUpdates] = useState({});   // { incId: notes }
  const [updateMsg, setUpdateMsg] = useState({ id: '', text: '', type: '' });

  const fetchIncidents = async () => {
    try {
      const response = await fetch(`/api/admin/incidents?status=${statusFilter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to fetch incidents');
      setIncidents(res);

      const initialNotes = {};
      res.forEach(inc => {
        initialNotes[inc.id] = inc.notes || inc.resolution || '';
      });
      setNotesUpdates(initialNotes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [token, statusFilter]);

  const handleAction = async (id, incId, actionVerb) => {
    setUpdatingId(id);
    setUpdateMsg({ id: '', text: '', type: '' });
    try {
      const response = await fetch(`/api/admin/incidents/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: actionVerb,
          notes: notesUpdates[id] || '',
          resolution: notesUpdates[id] || ''
        })
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to process action');

      setUpdateMsg({ id, text: `✓ Case ${incId}: ${actionVerb.toUpperCase()} executed successfully.`, type: 'success' });
      fetchIncidents();
    } catch (err) {
      setUpdateMsg({ id, text: err.message, type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const getIncCount = (status) => {
    if (status === 'All') return incidents.length;
    return incidents.filter(i => i.status === status).length;
  };

  if (loading) return <div style={{ padding: '2rem', color: '#00f5ff' }}>Loading Incident Management Engine...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;

  return (
    <div>
      <div className="zt-title">Incident Management & Case Response</div>
      <div className="zt-subtitle">Automated Anomaly Ingestion · Evidence Tracking · Analyst Actions (Investigate, Resolve, Escalate, Close)</div>

      {/* Overview Stats */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="zt-metric-tile">
          <div className="val">{getIncCount('All')}</div>
          <div className="lbl">Total Incidents</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val critical">{getIncCount('Open')}</div>
          <div className="lbl">Open Status</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val high">{getIncCount('Investigating')}</div>
          <div className="lbl">Investigating</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val critical">{getIncCount('Escalated')}</div>
          <div className="lbl">Escalated (P1)</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val safe">{getIncCount('Resolved')}</div>
          <div className="lbl">Resolved</div>
        </div>
        <div className="zt-metric-tile">
          <div className="val" style={{ color: '#94a3b8' }}>{getIncCount('Closed')}</div>
          <div className="lbl">Closed Cases</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        {['All', 'Open', 'Investigating', 'Escalated', 'Resolved', 'Closed'].map(status => (
          <button
            key={status}
            className={`zt-btn ${statusFilter === status ? '' : 'zt-btn-sec'}`}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
            onClick={() => setStatusFilter(status)}
          >
            {status} ({status === 'All' ? incidents.length : incidents.filter(i => i.status === status).length})
          </button>
        ))}
      </div>

      {incidents.length === 0 ? (
        <div className="zt-card low" style={{ textAlign: 'center', padding: '2rem' }}>
          <CheckCircle size={36} color="#22c55e" style={{ marginBottom: '8px' }} />
          <div style={{ color: '#22c55e', fontWeight: 'bold' }}>No active incidents match the selected filter</div>
          <div style={{ fontSize: '0.78rem', color: '#4a6275', marginTop: '4px' }}>All audited activity is within safe operational limits.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {incidents.map((inc) => {
            const isCritical = inc.severity.includes('Critical');
            const isHigh = inc.severity.includes('High');
            const color = isCritical ? '#ef4444' : isHigh ? '#f97316' : inc.severity.includes('Medium') ? '#f59e0b' : '#10b981';
            const cardClass = isCritical ? 'critical' : isHigh ? 'high' : inc.severity.includes('Medium') ? 'medium' : 'low';
            
            return (
              <div key={inc.id} className={`zt-card ${cardClass}`} style={{ padding: '1.1rem' }}>
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 245, 255, 0.1)', paddingBottom: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: '800', color: color, fontFamily: 'monospace' }}>🔴 {inc.incident_id}</span>
                    <span style={{ fontSize: '0.82rem', color: '#4a6275' }}>|</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#e2e8f0' }}>{inc.user_name} ({inc.department})</span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>• User ID: {inc.username}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className={`zt-badge ${cardClass}`}>{inc.severity.replace(/[^\w\s]/g, '').trim()}</span>
                    <span className="zt-badge" style={{ background: inc.status === 'Resolved' || inc.status === 'Closed' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.15)', color: inc.status === 'Resolved' || inc.status === 'Closed' ? '#10b981' : '#ef4444', border: `1px solid ${inc.status === 'Resolved' || inc.status === 'Closed' ? '#10b981' : '#ef4444'}` }}>
                      Status: {inc.status}
                    </span>
                  </div>
                </div>

                <div className="grid-2col" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
                  {/* Left Column: Metadata & Evidence */}
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.85rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '6px' }}>
                      <div><span style={{ color: '#64748b' }}>Triage Risk Score:</span> <b style={{ color: color }}>{inc.risk_score}/100</b></div>
                      <div><span style={{ color: '#64748b' }}>Incident Triggered:</span> <span style={{ color: '#e2e8f0' }}>{inc.created_at.replace('T', ' ').substring(0, 16)}</span></div>
                      <div><span style={{ color: '#64748b' }}>Assigned To:</span> <b style={{ color: '#00f5ff' }}>{inc.assigned_to || 'SOC Analyst L2'}</b></div>
                      <div><span style={{ color: '#64748b' }}>Resolved By:</span> <span style={{ color: '#a855f7' }}>{inc.resolved_by || 'Pending'}</span></div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: '#64748b' }}>Triggered Policies:</span> <span style={{ color: '#f59e0b', fontWeight: '500' }}>{inc.policies_triggered || 'Continuous Monitoring Policy Check'}</span>
                      </div>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <b style={{ color: '#00f5ff', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Threat Summary:</b>
                      <div style={{ fontSize: '0.82rem', color: '#c8d6e8', background: 'rgba(3, 9, 30, 0.5)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0, 245, 255, 0.08)', marginTop: '4px' }}>
                        {inc.summary}
                      </div>
                    </div>

                    {/* Evidence Checklist */}
                    <div>
                      <b style={{ color: '#00f5ff', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evidence Checklist & Telemetry Signals:</b>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', background: 'rgba(0, 0, 0, 0.25)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        {inc.evidence && inc.evidence.length > 0 ? inc.evidence.map((ev, idx) => (
                          <div key={idx} style={{ fontSize: '0.78rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> {ev.replace(/^✓\s*/, '')}
                          </div>
                        )) : <div style={{ fontSize: '0.76rem', color: '#64748b' }}>No evidence lines attached</div>}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Admin Actions (Investigate, Resolve, Escalate, Close) & Notes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <b style={{ color: '#00f5ff', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recommended Security Runbook:</b>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
                        {inc.recommendations && inc.recommendations.map((rec, idx) => (
                          <div key={idx} style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            ▸ {rec}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(0, 245, 255, 0.1)', paddingTop: '0.75rem' }}>
                      <div style={{ marginBottom: '0.6rem' }}>
                        <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>Resolution Notes / Case File Entry</label>
                        <input
                          type="text"
                          className="zt-input"
                          style={{ padding: '0.45rem', fontSize: '0.78rem' }}
                          placeholder="Enter investigation findings or resolution details..."
                          value={notesUpdates[inc.id] || ''}
                          onChange={(e) => setNotesUpdates({ ...notesUpdates, [inc.id]: e.target.value })}
                        />
                      </div>

                      {updateMsg.id === inc.id && (
                        <div style={{ color: updateMsg.type === 'success' ? '#10b981' : '#ef4444', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 'bold' }}>
                          {updateMsg.text}
                        </div>
                      )}

                      {/* 4 Interactive Admin Control Buttons: Investigate, Resolve, Escalate, Close */}
                      <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
                        Admin Incident Response Control:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <button
                          className="zt-btn"
                          style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '0.74rem', padding: '0.45rem' }}
                          disabled={updatingId === inc.id}
                          onClick={() => handleAction(inc.id, inc.incident_id, 'investigate')}
                        >
                          🔍 Investigate
                        </button>
                        <button
                          className="zt-btn"
                          style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', fontSize: '0.74rem', padding: '0.45rem' }}
                          disabled={updatingId === inc.id}
                          onClick={() => handleAction(inc.id, inc.incident_id, 'resolve')}
                        >
                          ✅ Resolve
                        </button>
                        <button
                          className="zt-btn"
                          style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.74rem', padding: '0.45rem' }}
                          disabled={updatingId === inc.id}
                          onClick={() => handleAction(inc.id, inc.incident_id, 'escalate')}
                        >
                          ⚡ Escalate (P1)
                        </button>
                        <button
                          className="zt-btn"
                          style={{ background: 'rgba(100, 116, 139, 0.2)', border: '1px solid #64748b', color: '#94a3b8', fontSize: '0.74rem', padding: '0.45rem' }}
                          disabled={updatingId === inc.id}
                          onClick={() => handleAction(inc.id, inc.incident_id, 'close')}
                        >
                          🔒 Close Case
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
