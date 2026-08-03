import React, { useState, useEffect } from 'react';
import { TrendingUp, Landmark, AlertCircle, DollarSign } from 'lucide-react';

export default function Forecast({ token }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to load forecast data');
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

  if (loading) return <div style={{ padding: '2rem' }}>Processing projections...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;

  // Filter high-stress burnout profiles
  const stressUsers = employees.filter(e => e.burnout_stress_score > 0).sort((a,b) => b.burnout_stress_score - a.burnout_stress_score);
  
  // Filter financial exposures
  const financialUsers = employees.filter(e => e.business_impact_rupees > 0).sort((a,b) => b.business_impact_rupees - a.business_impact_rupees);

  return (
    <div>
      <div className="zt-title">Forecast & Analytics</div>
      <div className="zt-subtitle">Insider Threat Projections · Stress Indicators · Financial Impact Analytics</div>

      <div className="grid-2col">
        {/* Left Column: Projections & Stress */}
        <div>
          <div className="zt-section-title">
            <TrendingUp size={18} /> Threat Score Forecast (Next 30 Days)
          </div>
          <div className="zt-card">
            <p style={{ fontSize: '0.8rem', color: '#4a6275', marginBottom: '1rem' }}>
              Projected behavioral deviation threat trends based on baseline drift and anomalous exfiltration volumes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {employees.slice(0, 5).map((emp, idx) => {
                const isAnom = emp.risk_score >= 30;
                return (
                  <div key={idx} style={{ borderBottom: '1px solid rgba(0, 245, 255, 0.04)', paddingBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' }}>
                      <span style={{ fontWeight: '600' }}>{emp.name}</span>
                      <span style={{ color: isAnom ? '#ef4444' : '#22c55e', fontSize: '0.72rem' }}>
                        Today: {emp.forecast_today} → Next Month: {emp.forecast_next_month}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', fontSize: '0.7rem', color: '#4a6275', fontFamily: 'monospace' }}>
                      <span>Today: {emp.forecast_today}%</span>
                      <span>|</span>
                      <span>Week: {emp.forecast_next_week}%</span>
                      <span>|</span>
                      <span>Month: {emp.forecast_next_month}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="zt-section-title">
            <AlertCircle size={18} /> Burnout & Stress Indicators
          </div>
          <div className="zt-card">
            <div className="zt-table-container">
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Dept</th>
                    <th>Stress Score</th>
                    <th>Key Indicator Details</th>
                  </tr>
                </thead>
                <tbody>
                  {stressUsers.map((emp, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600' }}>{emp.name}</td>
                      <td>{emp.department}</td>
                      <td style={{ color: emp.burnout_stress_score > 60 ? '#ef4444' : '#eab308', fontWeight: 'bold' }}>
                        {emp.burnout_stress_score}%
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#8aafc8' }}>
                        {emp.burnout_details || 'Weekend activity, late night logins.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Exposure & Vectors */}
        <div>
          <div className="zt-section-title">
            <DollarSign size={18} /> Potential Loss / Financial Exposure
          </div>
          <div className="zt-card">
            <p style={{ fontSize: '0.8rem', color: '#4a6275', marginBottom: '1rem' }}>
              Calculated business impact based on exposure of IP resources matching employee credentials.
            </p>
            <div className="zt-table-container">
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Dept</th>
                    <th>Potential Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {financialUsers.map((emp, idx) => {
                    const rupees = emp.business_impact_rupees;
                    const formatted = rupees >= 10000000 
                      ? `₹${(rupees / 10000000).toFixed(2)} Cr`
                      : rupees >= 100000
                        ? `₹${(rupees / 100000).toFixed(1)} L`
                        : `₹${rupees.toLocaleString()}`;
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600' }}>{emp.name}</td>
                        <td>{emp.department}</td>
                        <td style={{ fontWeight: 'bold', color: '#f97316', fontFamily: 'monospace' }}>{formatted}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="zt-section-title">
            <Landmark size={18} /> Downloads vs. GenAI Upload Analytics
          </div>
          <div className="zt-card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: '0.78rem', color: '#4a6275', marginBottom: '0.8rem' }}>
              Scatter comparison of document downloads relative to ChatGPT/Gemini upload volumes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {employees.slice(0, 6).map((emp, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <span style={{ color: '#8aafc8' }}>{emp.name}</span>
                  <span style={{ fontFamily: 'monospace', color: emp.genai_upload_mb > 20 ? '#ef4444' : '#22c55e' }}>
                    Downloads: {emp.downloads} | GenAI: {emp.genai_upload_mb.toFixed(1)} MB
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
