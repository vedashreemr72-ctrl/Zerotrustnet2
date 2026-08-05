import React, { useState } from 'react';
import { FileText, Download, Shield, AlertTriangle, Users, Building, Clock, CheckCircle } from 'lucide-react';

export default function Reports({ token }) {
  const [downloading, setDownloading] = useState('');
  const [msg, setMsg] = useState('');

  const handleDownload = async (type, label) => {
    setDownloading(type);
    setMsg('');
    try {
      const response = await fetch(`/api/admin/reports/download?type=${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setMsg(`✓ ${label} downloaded successfully.`);
    } catch (err) {
      setMsg(`❌ Failed to download ${label}: ${err.message}`);
    } finally {
      setDownloading('');
    }
  };

  const reportsList = [
    {
      id: 'incident',
      title: 'Incident Report',
      subtitle: 'Active & Historical Case Files',
      desc: 'Complete overview of all flagged P1 critical, high, medium, and low security incidents, evidence checklists, analyst assigned, and resolution statuses.',
      icon: AlertTriangle,
      color: '#ef4444'
    },
    {
      id: 'employee_risk',
      title: 'Employee Risk Report',
      subtitle: 'UEBA Behavioral Baseline Analysis',
      desc: 'Individual employee insider threat risk scores, 6-layer AI anomaly breakdown, baseline deviations, and automated remediation actions.',
      icon: Users,
      color: '#f97316'
    },
    {
      id: 'weekly_security',
      title: 'Weekly Security Report',
      subtitle: 'Executive Posture & Compliance',
      desc: 'Weekly security score trend, top SOC KPI cards overview, active telemetry sessions, financial risk exposure, and policy health rating.',
      icon: Shield,
      color: '#00f5ff'
    },
    {
      id: 'department_risk',
      title: 'Department Risk Report',
      subtitle: 'Organizational Risk Heatmap',
      desc: 'Departmental mean risk breakdown across Engineering, Finance, HR, Sales, and IT departments with high-risk employee counts.',
      icon: Building,
      color: '#f59e0b'
    },
    {
      id: 'audit',
      title: 'Audit Report',
      subtitle: 'Immutable Security Event Logs',
      desc: 'Complete audit log trail detailing continuous post-login employee actions, ISO timestamps, hardware device fingerprints, and IP addresses.',
      icon: Clock,
      color: '#10b981'
    }
  ];

  return (
    <div>
      <div className="zt-title">Executive Reports & PDF Exporter</div>
      <div className="zt-subtitle">Automated Security Intelligence Reports · Downloadable Executive PDFs · SOC Compliance</div>

      {msg && (
        <div className="zt-card" style={{ padding: '0.8rem 1rem', marginBottom: '1.2rem', color: msg.includes('✓') ? '#10b981' : '#ef4444', background: 'rgba(15, 23, 42, 0.8)', border: `1px solid ${msg.includes('✓') ? '#10b981' : '#ef4444'}`, fontWeight: 'bold', fontSize: '0.84rem' }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.2rem' }}>
        {reportsList.map((rep) => {
          const IconComp = rep.icon;
          const isDownloading = downloading === rep.id;

          return (
            <div key={rep.id} className="zt-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: `${rep.color}20`, border: `1px solid ${rep.color}` }}>
                    <IconComp size={22} color={rep.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#e2e8f0' }}>{rep.title}</div>
                    <div style={{ fontSize: '0.74rem', color: '#00f5ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{rep.subtitle}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4', marginBottom: '1.2rem' }}>
                  {rep.desc}
                </div>
              </div>

              <div>
                <button
                  className="zt-btn full-width"
                  style={{ padding: '0.55rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: `linear-gradient(135deg, ${rep.color}30, rgba(15,23,42,0.8))`, border: `1px solid ${rep.color}` }}
                  disabled={isDownloading}
                  onClick={() => handleDownload(rep.id, rep.title)}
                >
                  <Download size={16} color={rep.color} />
                  {isDownloading ? 'Generating PDF...' : `📥 Download ${rep.title} (PDF)`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
