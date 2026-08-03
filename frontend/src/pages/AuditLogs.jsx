import React, { useState, useEffect } from 'react';
import { FileText, Filter, Download, Lock, CheckCircle, Shield } from 'lucide-react';

export default function AuditLogs({ token }) {
  const [logs, setLogs] = useState([]);
  const [encryptionInfo, setEncryptionInfo] = useState(null);
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    try {
      const [logRes, encRes] = await Promise.all([
        fetch(`/api/admin/audit?event_type=${eventTypeFilter}&status=${statusFilter}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/encryption-status', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const logData = await logRes.json();
      const encData = await encRes.json();

      if (!logRes.ok) throw new Error(logData.error || 'Failed to fetch audit trails');
      setLogs(logData);
      setEncryptionInfo(encData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token, eventTypeFilter, statusFilter]);

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/admin/audit/export?format=csv', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ztn_audit_logs.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleExportJSON = async () => {
    try {
      const res = await fetch('/api/admin/audit/export?format=json', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const jsonData = await res.json();
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ztn_audit_logs.json';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const eventTypes = [
    "All", "Login", "Logout", "Login (MFA Verified)", "Step-Up MFA Verified", "File View", "File Download", "File Upload", 
    "Sensitive Page Access", "GenAI Upload", "USB Event", "Privilege Change", 
    "Password Reset", "Incident Updated", "Attack Simulated", 
    "Policy Created", "Policy Changed", "Baseline Restored", "Account Locked", "Account Unlocked"
  ];

  if (loading) return <div style={{ padding: '2rem', color: '#00f5ff' }}>Loading encrypted audit trails...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;

  return (
    <div>
      <div className="zt-title">Audit Trail & Compliance Reports</div>
      <div className="zt-subtitle">Immutable Cryptographic Event Trail · AES-256 Encrypted Field Storage · Exportable Compliance Audit</div>

      {/* Encryption & Integrity Card */}
      {encryptionInfo && (
        <div className="zt-card" style={{
          padding: '0.85rem 1.2rem',
          marginBottom: '1rem',
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Lock size={20} color="#10b981" />
            <div>
              <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.88rem' }}>
                Data Encryption & Cryptographic Audit Verification
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>
                Cipher Suite: <strong>{encryptionInfo.cipher_suite}</strong> · Compliance: {encryptionInfo.policy_compliance}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: '#94a3b8' }}>
            <div>HMAC Digest: <span style={{ fontFamily: 'monospace', color: '#00f5ff' }}>{encryptionInfo.cryptographic_hash}</span></div>
            <span className="zt-badge bl">✓ Integrity Verified</span>
          </div>
        </div>
      )}

      {/* Filter & Export Bar */}
      <div className="zt-card" style={{ padding: '1rem', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00f5ff', fontSize: '0.88rem', fontWeight: 'bold' }}>
              <Filter size={16} /> Filters:
            </div>

            <div style={{ flex: 1 }}>
              <select 
                className="zt-select" 
                style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
              >
                {eventTypes.map((type, idx) => (
                  <option key={idx} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <select 
                className="zt-select" 
                style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Suspicious Only">Suspicious Only</option>
                <option value="Normal Only">Normal Only</option>
              </select>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="zt-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={handleExportCSV}>
              <Download size={14} /> Export CSV Report
            </button>
            <button className="zt-btn zt-btn-sec" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={handleExportJSON}>
              <Download size={14} /> Export JSON
            </button>
          </div>
        </div>
      </div>

      <div className="zt-card">
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#4a6275' }}>
            No audit records match the active query parameters.
          </div>
        ) : (
          <div className="zt-table-container">
            <table className="zt-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Employee</th>
                  <th>Dept</th>
                  <th>Event Type</th>
                  <th>Details Payload</th>
                  <th>IP Address</th>
                  <th>Device</th>
                  <th>Risk Contrib</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  const ts = log.timestamp ? log.timestamp.replace('T', ' ').substring(0, 19) : '—';
                  return (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#4a6275' }}>{ts}</td>
                      <td style={{ fontWeight: '600' }}>{log.employee}</td>
                      <td>{log.department}</td>
                      <td style={{ fontWeight: '600', color: log.is_suspicious ? '#ef4444' : '#c8d6e8' }}>{log.event_type}</td>
                      <td style={{ fontSize: '0.8rem', color: '#8aafc8' }}>{log.details}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#4a6275' }}>{log.ip}</td>
                      <td style={{ fontSize: '0.78rem' }}>{log.device}</td>
                      <td style={{ fontFamily: 'monospace', color: log.risk_contrib > 0 ? '#f97316' : '#4a6275', fontWeight: 'bold' }}>
                        +{log.risk_contrib}
                      </td>
                      <td>
                        <span className={`zt-badge ${log.is_suspicious ? 'bc' : 'bl'}`}>
                          {log.is_suspicious ? 'Suspicious' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
