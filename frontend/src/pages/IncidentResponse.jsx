import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Shield, Archive, MessageSquare } from 'lucide-react';

export default function IncidentResponse({ token }) {
  const [incidents, setIncidents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [statusUpdates, setStatusUpdates] = useState({}); // { incId: status }
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

      // Initialize update maps
      const initialStatus = {};
      const initialNotes = {};
      res.forEach(inc => {
        initialStatus[inc.id] = inc.status;
        initialNotes[inc.id] = inc.notes || '';
      });
      setStatusUpdates(initialStatus);
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

  const handleUpdateIncident = async (id, incId) => {
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
          status: statusUpdates[id],
          notes: notesUpdates[id]
        })
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to update case file');

      setUpdateMsg({ id, text: `✓ Case ${incId} updated successfully.`, type: 'success' });
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

  if (loading) return <div style={{ padding: '2rem' }}>Loading Case Management records...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;

  return (
    <div>
      <div className="zt-title">Incident Response Center</div>
      <div className="zt-subtitle">Active Security Incidents · Evidence Tracking · Analyst Runbooks</div>

      {/* Overview Stats */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="zt-metric-tile">
          <div className="val">{getIncCount('All')}</div>
          <div className="lbl">Total Cases</div>
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
          <div className="val safe">{getIncCount('Resolved')}</div>
          <div className="lbl">Resolved</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem' }}>
        {['All', 'Open', 'Investigating', 'Resolved'].map(status => (
          <button
            key={status}
            className={`zt-btn ${statusFilter === status ? '' : 'critical'}`}
            style={{ padding: '0.4rem 1rem', fontSize: '0.78rem' }}
            onClick={() => setStatusFilter(status)}
          >
            {status} ({status === 'All' ? incidents.length : incidents.filter(i => i.status === status).length})
          </button>
        ))}
      </div>

      {incidents.length === 0 ? (
        <div className="zt-card low" style={{ textAlign: 'center', padding: '2rem' }}>
          <CheckCircle size={36} color="#22c55e" style={{ marginBottom: '8px' }} />
          <div style={{ color: '#22c55e', fontWeight: 'bold' }}>No incidents match the active filters</div>
          <div style={{ fontSize: '0.78rem', color: '#4a6275', marginTop: '4px' }}>All audited activity falls within normal tolerances.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {incidents.map((inc) => {
            const isCritical = inc.severity.includes('Critical');
            const isHigh = inc.severity.includes('High');
            const color = isCritical ? '#ef4444' : isHigh ? '#f97316' : inc.severity.includes('Medium') ? '#eab308' : '#22c55e';
            const cardClass = isCritical ? 'critical' : isHigh ? 'high' : inc.severity.includes('Medium') ? 'medium' : 'low';
            
            return (
              <div key={inc.id} className={`zt-card ${cardClass}`} style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 245, 255, 0.08)', paddingBottom: '0.6rem', marginBottom: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: color }}>🔴 {inc.incident_id}</span>
                    <span style={{ fontSize: '0.82rem', color: '#4a6275' }}>—</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>{inc.user_name} ({inc.department})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className={`zt-badge ${cardClass}`}>{inc.severity.replace(/[^\w\s]/g, '').trim()}</span>
                    <span className="zt-badge bi" style={{ background: inc.status === 'Resolved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: inc.status === 'Resolved' ? '#22c55e' : '#ef4444' }}>
                      {inc.status}
                    </span>
                  </div>
                </div>

                <div className="grid-2col">
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem', fontSize: '0.82rem', marginBottom: '0.8rem' }}>
                      <div><span style={{ color: '#4a6275' }}>Triage Risk Score:</span> <b>{inc.risk_score}/100</b></div>
                      <div><span style={{ color: '#4a6275' }}>Incident Triggered:</span> <span>{inc.created_at.replace('T', ' ').substring(0, 16)}</span></div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: '#4a6275' }}>Triggered Policies:</span> <span style={{ color: '#eab308' }}>{inc.policies_triggered || 'Manual Investigation'}</span>
                      </div>
                    </div>

                    <div style={{ marginBottom: '0.6rem' }}>
                      <b style={{ color: '#8aafc8', fontSize: '0.82rem' }}>Threat Summary:</b>
                      <div style={{ fontSize: '0.82rem', color: '#c8d6e8', background: 'rgba(3, 9, 30, 0.4)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(0, 245, 255, 0.03)', marginTop: '4px' }}>
                        {inc.summary}
                      </div>
                    </div>

                    {/* Evidence Checklist */}
                    <div>
                      <b style={{ color: '#8aafc8', fontSize: '0.82rem' }}>Evidence Checklist:</b>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        {inc.evidence && inc.evidence.map((ev, idx) => (
                          <div key={idx} style={{ fontSize: '0.78rem', color: '#8aafc8' }}>
                            ◦ {ev}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Notes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div>
                      <b style={{ color: '#8aafc8', fontSize: '0.82rem' }}>Recommended Response:</b>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                        {inc.recommendations && inc.recommendations.map((rec, idx) => (
                          <div key={idx} style={{ fontSize: '0.78rem', color: '#8aafc8' }}>
                            ▸ {rec}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(0, 245, 255, 0.05)', paddingTop: '0.6rem', marginTop: '0.4rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.7rem', color: '#4a6275', display: 'block', marginBottom: '2px' }}>Case Status</label>
                          <select
                            className="zt-select"
                            style={{ padding: '0.35rem', fontSize: '0.78rem' }}
                            value={statusUpdates[inc.id] || 'Open'}
                            onChange={(e) => setStatusUpdates({ ...statusUpdates, [inc.id]: e.target.value })}
                          >
                            <option value="Open">Open</option>
                            <option value="Investigating">Investigating</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ marginBottom: '0.6rem' }}>
                        <label style={{ fontSize: '0.7rem', color: '#4a6275', display: 'block', marginBottom: '2px' }}>Analyst Investigation Notes</label>
                        <input
                          type="text"
                          className="zt-input"
                          style={{ padding: '0.35rem', fontSize: '0.78rem' }}
                          placeholder="e.g. User confirmed password reset and locked device"
                          value={notesUpdates[inc.id] || ''}
                          onChange={(e) => setNotesUpdates({ ...notesUpdates, [inc.id]: e.target.value })}
                        />
                      </div>

                      {updateMsg.id === inc.id && (
                        <div style={{ color: updateMsg.type === 'success' ? '#22c55e' : '#ef4444', fontSize: '0.75rem', marginBottom: '4px' }}>
                          {updateMsg.text}
                        </div>
                      )}

                      <button
                        className="zt-btn full-width"
                        style={{ padding: '0.4rem', fontSize: '0.78rem' }}
                        disabled={updatingId === inc.id}
                        onClick={() => handleUpdateIncident(inc.id, inc.incident_id)}
                      >
                        {updatingId === inc.id ? 'Saving...' : '💾 Update Case File'}
                      </button>
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
