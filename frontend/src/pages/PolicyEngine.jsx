import React, { useState, useEffect } from 'react';
import { Shield, Plus, ToggleLeft, ToggleRight, Info } from 'lucide-react';

export default function PolicyEngine({ token }) {
  const [policies, setPolicies] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [action, setAction] = useState('Require Step-Up Authentication');
  const [conditions, setConditions] = useState('{\n  "off_hours": true,\n  "device_known": 0\n}');
  const [formMsg, setFormMsg] = useState({ text: '', type: '' });

  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/admin/policies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to load policy engine data');
      setPolicies(res.policies);
      setViolations(res.violations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [token]);

  const handleToggle = async (id) => {
    try {
      const response = await fetch(`/api/admin/policies/${id}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.error || 'Toggle failed');
      }
      fetchPolicies();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    setFormMsg({ text: '', type: '' });

    try {
      // Validate JSON
      JSON.parse(conditions);

      const response = await fetch('/api/admin/policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, description, action, conditions })
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Create policy failed');

      setFormMsg({ text: '✓ Policy created successfully!', type: 'success' });
      setName('');
      setDescription('');
      fetchPolicies();
    } catch (err) {
      setFormMsg({ text: `Error: ${err.message}`, type: 'error' });
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading policy rules...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;

  return (
    <div>
      <div className="zt-title">Zero Trust Policy Engine</div>
      <div className="zt-subtitle">Dynamic Security Controls · IF / AND / THEN Policies · Real-Time Assessment</div>

      {/* Policy Violations */}
      <div className="zt-section-title">
        <Shield size={18} color="#ef4444" /> Live Policy Violations (Real-Time triggers)
      </div>
      <div className="zt-card">
        {violations.length === 0 ? (
          <div style={{ color: '#22c55e', padding: '0.5rem', textAlign: 'center', fontWeight: 'bold' }}>
            ✓ No policy violations detected. All continuous monitoring sessions are compliant.
          </div>
        ) : (
          <div className="zt-table-container">
            <table className="zt-table">
              <thead>
                <tr>
                  <th>Policy Triggered</th>
                  <th>Violating User</th>
                  <th>Action Triggered</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((v, idx) => (
                  <tr key={idx}>
                    <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{v.Policy}</td>
                    <td style={{ fontWeight: '600' }}>{v.User}</td>
                    <td style={{ color: '#f97316', fontWeight: '500' }}>{v.Action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid-2col">
        {/* Configured Policies */}
        <div>
          <div className="zt-section-title">
            <Shield size={18} /> Configured Policies
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {policies.map((pol) => {
              const isActive = pol.is_active === 1;
              return (
                <div key={pol.id} className="zt-card" style={{ borderLeft: `3px solid ${isActive ? '#00f5ff' : '#3d5470'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem' }}>{isActive ? '🟢' : '⭕'}</span>
                        <b style={{ color: isActive ? '#00f5ff' : '#4e6b8c', fontSize: '0.9rem' }}>{pol.name}</b>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#8aafc8', marginTop: '4px' }}>{pol.description}</div>
                    </div>
                    <button 
                      onClick={() => handleToggle(pol.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isActive ? '#22c55e' : '#3d5470' }}
                    >
                      {isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>

                  <div style={{ marginTop: '0.8rem', fontSize: '0.78rem' }}>
                    <b style={{ color: '#4a6275' }}>IF Conditions:</b>
                    <pre style={{
                      margin: '4px 0 0 0',
                      background: 'rgba(3, 9, 30, 0.5)',
                      border: '1px solid rgba(0, 245, 255, 0.05)',
                      padding: '8px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      color: '#8aafc8',
                      fontSize: '0.72rem'
                    }}>
                      {JSON.stringify(pol.conditions, null, 2)}
                    </pre>
                  </div>

                  <div style={{ marginTop: '0.6rem', fontSize: '0.78rem' }}>
                    <span style={{ color: '#4a6275' }}>THEN Security Action:</span> <b style={{ color: '#f97316' }}>{pol.action}</b>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#3d5470', marginTop: '6px' }}>
                    Created by {pol.created_by} on {pol.created_at.substring(0, 10)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Policy Form */}
        <div>
          <div className="zt-section-title">
            <Plus size={18} /> Add Custom Policy
          </div>
          <div className="zt-card">
            <form onSubmit={handleCreatePolicy}>
              <div className="zt-input-group">
                <label>Policy Name</label>
                <input 
                  type="text" 
                  className="zt-input" 
                  placeholder="e.g. Off-Hours Sensitive Data Upload" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="zt-input-group">
                <label>Description</label>
                <input 
                  type="text" 
                  className="zt-input" 
                  placeholder="Enter details about what this triggers" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="zt-input-group">
                <label>THEN Security Action</label>
                <select 
                  className="zt-select" 
                  value={action} 
                  onChange={(e) => setAction(e.target.value)}
                >
                  <option value="Require Step-Up Authentication">Require Step-Up Authentication</option>
                  <option value="Temporarily Restrict Access">Temporarily Restrict Access</option>
                  <option value="Lock Account + Alert SOC">Lock Account + Alert SOC</option>
                  <option value="Force Password Reset">Force Password Reset</option>
                  <option value="Block AI Tool Access">Block AI Tool Access</option>
                  <option value="Temporary Account Lockout">Temporary Account Lockout</option>
                  <option value="Revoke Elevated Privileges + Alert">Revoke Elevated Privileges + Alert</option>
                </select>
              </div>

              <div className="zt-input-group">
                <label>IF Conditions (JSON Structure)</label>
                <textarea 
                  className="zt-input"
                  style={{ fontFamily: 'monospace', fontSize: '0.75rem', height: '100px', resize: 'vertical' }}
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  required
                />
              </div>

              {formMsg.text && (
                <div style={{ color: formMsg.type === 'success' ? '#22c55e' : '#ef4444', fontSize: '0.78rem', marginBottom: '0.8rem' }}>
                  {formMsg.text}
                </div>
              )}

              <button type="submit" className="zt-btn full-width">
                ✅ Save Policy
              </button>
            </form>
          </div>

          <div className="zt-section-title" style={{ marginTop: '1.2rem' }}>
            <Info size={15} /> Dynamic Rules Reference
          </div>
          <div className="zt-card" style={{ padding: '1rem', fontSize: '0.75rem', color: '#4a6275', lineHeight: '1.8' }}>
            <div style={{ fontWeight: 'bold', color: '#8aafc8', marginBottom: '4px' }}>Available JSON Keys:</div>
            • <code style={{ color: '#00f5ff' }}>"device_known": 0</code> (unregistered device)<br />
            • <code style={{ color: '#00f5ff' }}>"off_hours": true</code> (outside 07:00-20:00)<br />
            • <code style={{ color: '#00f5ff' }}>"downloads_gt": 100</code> (downloads &gt; 100)<br />
            • <code style={{ color: '#00f5ff' }}>"failed_logins_gt": 5</code> (failed logins &gt; 5)<br />
            • <code style={{ color: '#00f5ff' }}>"impossible_travel_flag": 1</code> (impossible travel)<br />
            • <code style={{ color: '#00f5ff' }}>"privilege_escalation_flag": 1</code> (privilege changes)<br />
            • <code style={{ color: '#00f5ff' }}>"genai_upload_mb_gt": 20</code> (GenAI paste mb &gt; 20)<br />
            • <code style={{ color: '#00f5ff' }}>"last_login_days_ago_gt": 90</code> (dormant account)<br />
            • <code style={{ color: '#00f5ff' }}>"sensitive_access": true</code> (privilege access misuse)
          </div>
        </div>
      </div>
    </div>
  );
}
