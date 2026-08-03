import React, { useState, useEffect } from 'react';
import { Cpu, Send, ShieldAlert, BookOpen, Clock } from 'lucide-react';

export default function AICopilot({ token }) {
  const [employees, setEmployees] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [query, setQuery] = useState('');
  const [chatLog, setChatLog] = useState([
    { role: 'copilot', text: 'Hello! I am the ZeroTrustNet Explainable AI Copilot. Select an employee above and ask me questions like:\n- "What is the business impact of this activity?"\n- "Explain the machine learning algorithm contributions."\n- "What is the recommended response runbook?"' }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to load employees for Copilot');
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim() || chatLoading) return;

    const userQuery = query;
    setQuery('');
    setChatLog(prev => [...prev, { role: 'user', text: userQuery }]);
    setChatLoading(true);

    try {
      const currentEmp = employees[selectedIdx];
      const response = await fetch('/api/admin/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_name: currentEmp.name,
          query: userQuery
        })
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Copilot failed to respond');

      setChatLog(prev => [...prev, { role: 'copilot', text: res.answer }]);
    } catch (err) {
      setChatLog(prev => [...prev, { role: 'copilot', text: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Initializing AI Copilot...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;

  const currentEmp = employees[selectedIdx];
  const riskColor = currentEmp.risk_score >= 80 ? '#ef4444' : currentEmp.risk_score >= 60 ? '#f97316' : currentEmp.risk_score >= 30 ? '#eab308' : '#22c55e';

  const algos = {
    'Isolation Forest': 'Isolates anomalies using random tree splits. Population baseline.',
    'Local Outlier Factor': 'Measures local density relative to neighbors. Outlier detection.',
    'One-Class SVM': 'Learns support boundary around historical normal behavior parameters.',
    'DBSCAN': 'Groups data points inside density clusters. Anomalies are noise points.'
  };

  return (
    <div>
      <div className="zt-title">AI Security Copilot</div>
      <div className="zt-subtitle">Explainable Artificial Intelligence · Incident Triage · Natural Language Explainer</div>

      <div style={{ marginBottom: '1.2rem' }}>
        <label style={{ fontSize: '0.8rem', color: '#4a6275', display: 'block', marginBottom: '4px' }}>Target Employee for Copilot Assessment</label>
        <select 
          className="zt-select" 
          value={selectedIdx} 
          onChange={(e) => {
            setSelectedIdx(Number(e.target.value));
            setChatLog([
              { role: 'copilot', text: `I have loaded the behavioral twin for ${employees[Number(e.target.value)].name}. What details would you like me to clarify regarding their risk score of ${employees[Number(e.target.value)].risk_score}/100?` }
            ]);
          }}
        >
          {employees.map((emp, idx) => (
            <option key={idx} value={idx}>{emp.name} ({emp.department} · Risk: {emp.risk_score})</option>
          ))}
        </select>
      </div>

      <div className="grid-2col">
        {/* Left Column: Copilot Q&A Console */}
        <div>
          <div className="zt-section-title">
            <Cpu size={18} /> Interactive Explainer Console
          </div>
          <div className="zt-card">
            <div className="chat-window" style={{ height: '360px' }}>
              {chatLog.map((chat, idx) => (
                <div key={idx} className={`chat-bubble ${chat.role}`}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{chat.text}</div>
                </div>
              ))}
              {chatLoading && (
                <div className="chat-bubble copilot" style={{ color: '#4a6275' }}>
                  Thinking... Analysing behavioral deviation metrics...
                </div>
              )}
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="zt-input" 
                style={{ flex: 1 }} 
                placeholder="Ask the Copilot: 'Explain the risk score', 'Show runbooks', or 'Is there MITRE mapping?'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={chatLoading}
              />
              <button type="submit" className="zt-btn" style={{ padding: '0.6rem' }} disabled={chatLoading}>
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: AI Metrics & Evidence */}
        <div>
          <div className="zt-section-title">
            <ShieldAlert size={18} /> Copilot Assessment Breakdown
          </div>
          <div className="zt-card" style={{ borderLeft: `3px solid ${riskColor}` }}>
            <div style={{ fontSize: '0.72rem', color: '#3d5470', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
              Explainable Metrics
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', marginBottom: '0.8rem' }}>
              <div className="zt-metric-tile" style={{ padding: '0.6rem' }}>
                <div style={{ fontSize: '1.25rem', color: riskColor, fontWeight: 'bold' }}>{currentEmp.risk_score}</div>
                <div className="lbl" style={{ fontSize: '0.55rem', marginTop: '2px' }}>Risk score</div>
              </div>
              <div className="zt-metric-tile" style={{ padding: '0.6rem' }}>
                <div style={{ fontSize: '1.25rem', color: '#f97316', fontWeight: 'bold' }}>{currentEmp.exfil_probability}%</div>
                <div className="lbl" style={{ fontSize: '0.55rem', marginTop: '2px' }}>Exfil Risk</div>
              </div>
            </div>

            <b style={{ color: '#8aafc8', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>Observable Evidence:</b>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {currentEmp.reasons.map((r, idx) => (
                <div key={idx} style={{ fontSize: '0.78rem', color: '#c8d6e8' }}>
                  • {r}
                </div>
              ))}
            </div>
          </div>

          <div className="zt-section-title">
            <BookOpen size={18} /> Algorithms Explainability
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(currentEmp.algo_contrib).map(([algo, status], idx) => {
              const isAnom = status.includes('ANOMALY') || status.includes('NOISE');
              return (
                <div key={idx} className="zt-card" style={{ padding: '0.8rem', margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <b style={{ fontSize: '0.82rem', color: '#c8d6e8' }}>{algo}</b>
                      <div style={{ fontSize: '0.7rem', color: '#4a6275', marginTop: '2px' }}>{algos[algo]}</div>
                    </div>
                    <span className={`zt-badge ${isAnom ? 'bc' : 'bl'}`} style={{ fontSize: '0.6rem' }}>
                      {isAnom ? 'Anomaly' : 'Normal'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
