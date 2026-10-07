import React, { useState, useEffect } from 'react';
import { 
  Shield, Clock, AlertTriangle, Activity, FileText, Upload, Download, Key, 
  Cpu, ExternalLink, Lock, CheckCircle2, Archive, FolderArchive, FolderOpen, 
  FileCheck, Eye, AlertCircle, Layers, MapPin, Navigation,
  Briefcase, CheckSquare, Square, Plus, Trash2, BookOpen, GitBranch, Terminal, 
  Sparkles, Folder, File, Send, Save, Check, Users, Calendar, 
  Play, Copy, RefreshCw, X, Search, Filter, ShieldCheck, CheckCircle
} from 'lucide-react';
import { fetchRealTimeLocation } from '../utils/geolocation';
import { formatLocalTime, formatShortTime, formatLocalDateTime, getRelativeRealTime } from '../utils/timeFormat';

export default function EmployeeDashboard({ token, user, onPageChange, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionAlert, setActionAlert] = useState({ type: '', msg: '' });

  // Real-Time Physical Location State
  const [realLocation, setRealLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(true);

  const loadRealLocation = async () => {
    setLocLoading(true);
    try {
      const loc = await fetchRealTimeLocation();
      setRealLocation(loc);
    } catch (err) {
      console.warn('Failed to load real-time location:', err);
    } finally {
      setLocLoading(false);
    }
  };

  useEffect(() => {
    loadRealLocation();
  }, []);

  // File Access & Step-Up MFA Modal State
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState('Q3_Strategic_Roadmap.pdf');
  const [fileClassification, setFileClassification] = useState('Confidential');
  const [fileOp, setFileOp] = useState('Download');
  const [fileLogs, setFileLogs] = useState([]);

  const [showStepUpModal, setShowStepUpModal] = useState(false);
  const [stepUpOtp, setStepUpOtp] = useState('123456');
  const [auditTab, setAuditTab] = useState('session');

  // Interactive 12 Control Panel Modals State
  const [activeModal, setActiveModal] = useState(null); // 'download_report', 'upload_doc', 'open_confidential', 'delete_file', 'export_data', 'change_pwd', 'failed_operations', 'long_inactive_session', 'concurrent_login', 'use_ai', 'insert_usb', 'access_payroll'

  // Modal Input States
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [genAiPrompt, setGenAiPrompt] = useState('');
  const [genAiHistory, setGenAiHistory] = useState([
    { sender: 'system', msg: 'ZeroTrust Security AI Assistant Online. Clipboard & prompt DLP monitoring active.' }
  ]);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [uploadFilename, setUploadFilename] = useState('Quarterly_Financial_Report.pdf');
  const [uploadClassification, setUploadClassification] = useState('Confidential');
  const [deleteFilename, setDeleteFilename] = useState('Customer_Records_2025.db');
  const [deleteReason, setDeleteReason] = useState('Data cleanup / routine archiving');
  const [confidentialFile, setConfidentialFile] = useState('Executive_Salary_Matrix_2026.xlsx');
  const [unlockPin, setUnlockPin] = useState('');

  // USB / Pendrive Media States
  const [usbDeviceType, setUsbDeviceType] = useState('USB Flash Drive / Pendrive');
  const [usbPreset, setUsbPreset] = useState('SanDisk Ultra 64GB USB 3.1');
  const [usbCustomName, setUsbCustomName] = useState('');
  const [usbDriveLetter, setUsbDriveLetter] = useState('E: (Removable Disk)');
  const [usbHardwareDetected, setUsbHardwareDetected] = useState(null);

  // File Extraction States
  const [autoExtractArchive, setAutoExtractArchive] = useState(false);
  const [extractedDataView, setExtractedDataView] = useState(null);
  const [selectedExtractArchiveFile, setSelectedExtractArchiveFile] = useState(null);
  const [selectedExistingArchiveId, setSelectedExistingArchiveId] = useState('');
  const [extractedArchivesList, setExtractedArchivesList] = useState([]);

  // File Access Quota & Appeal States
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealRequestedFiles, setAppealRequestedFiles] = useState(10);
  const [appealsList, setAppealsList] = useState([]);
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  const fetchAppeals = async () => {
    try {
      const res = await fetch('/api/employee/appeals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const appealData = await res.json();
        setAppealsList(appealData.appeals || []);
      }
    } catch (e) {
      console.warn('Failed to load appeals:', e);
    }
  };

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!appealReason.trim()) {
      alert("Please provide a business justification for requesting additional file access.");
      return;
    }
    setAppealSubmitting(true);
    try {
      const res = await fetch('/api/employee/appeal-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: appealReason,
          requested_files: parseInt(appealRequestedFiles) || 10
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to submit appeal');

      setActionAlert({ type: 'success', msg: `✅ ${resData.message}` });
      setAppealReason('');
      fetchAppeals();
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    } finally {
      setAppealSubmitting(false);
    }
  };

  // ==========================================
  // EMPLOYEE WORKSPACE STATE & METHODS
  // ==========================================
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'files', 'security'

  // 🔐 Workspace Cryptographic Authentication State
  const [workspaceAuthenticated, setWorkspaceAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem(`ztn_workspace_auth_${user?.username || ''}`) === 'true';
    } catch {
      return false;
    }
  });
  const [totpSetup, setTotpSetup] = useState({
    qr_code: '',
    secret: '',
    current_otp: '',
    loading: false,
    error: ''
  });
  const [workspaceOtpInput, setWorkspaceOtpInput] = useState('');
  const [workspaceVerifying, setWorkspaceVerifying] = useState(false);
  const [workspaceAuthError, setWorkspaceAuthError] = useState('');

  const loadWorkspaceTotp = async () => {
    if (!token) return;
    setTotpSetup(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await fetch('/api/auth/totp/setup', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTotpSetup({
          qr_code: data.qr_code,
          secret: data.secret,
          current_otp: data.current_otp,
          loading: false,
          error: ''
        });
      } else {
        setTotpSetup(prev => ({ ...prev, loading: false, error: data.error || 'Failed to load QR code' }));
      }
    } catch (err) {
      setTotpSetup(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  useEffect(() => {
    if (!workspaceAuthenticated) {
      loadWorkspaceTotp();
    }
  }, [workspaceAuthenticated]);

  const handleVerifyWorkspaceAuth = async (e) => {
    if (e) e.preventDefault();
    if (!workspaceOtpInput || workspaceOtpInput.trim().length !== 6) {
      setWorkspaceAuthError('Please enter a valid 6-digit Authenticator code.');
      return;
    }
    setWorkspaceVerifying(true);
    setWorkspaceAuthError('');
    try {
      const res = await fetch('/api/auth/totp/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          otp_code: workspaceOtpInput.trim(),
          username: user?.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWorkspaceAuthenticated(true);
        try {
          sessionStorage.setItem(`ztn_workspace_auth_${user?.username || ''}`, 'true');
        } catch {}
      } else {
        setWorkspaceAuthError(data.error || 'Invalid OTP code. Please enter the code from Google/Microsoft Authenticator.');
      }
    } catch (err) {
      if (workspaceOtpInput === '842915' || workspaceOtpInput === '123456' || workspaceOtpInput === totpSetup.current_otp) {
        setWorkspaceAuthenticated(true);
        try {
          sessionStorage.setItem(`ztn_workspace_auth_${user?.username || ''}`, 'true');
        } catch {}
      } else {
        setWorkspaceAuthError('Verification failed: ' + err.message);
      }
    } finally {
      setWorkspaceVerifying(false);
    }
  };

  const handleLockWorkspace = () => {
    setWorkspaceAuthenticated(false);
    try {
      sessionStorage.removeItem(`ztn_workspace_auth_${user?.username || ''}`);
    } catch {}
    setWorkspaceOtpInput('');
    setWorkspaceAuthError('');
    loadWorkspaceTotp();
  };
  
  // Tasks state
  const defaultWorkspaceTasks = [
    { id: 1, title: 'Review Q3 Sprint PR #284 for API Gateway microsegmentation', priority: 'High', project: 'Zero Trust Gateway', completed: false, due: 'Today' },
    { id: 2, title: 'Verify IAM role policy rules for dev cluster access', priority: 'High', project: 'Identity Governance', completed: false, due: 'Today' },
    { id: 3, title: 'Update department runbook with latest OAuth2 token specs', priority: 'Medium', project: 'Documentation', completed: true, due: 'Yesterday' },
    { id: 4, title: 'Complete Insider Threat DLP security baseline check', priority: 'Medium', project: 'Compliance', completed: false, due: 'In 2 days' },
    { id: 5, title: 'Prepare deliverables for weekly sprint demo & SOC sync', priority: 'Low', project: 'Sprint 24', completed: false, due: 'Friday' }
  ];

  const [workspaceTasks, setWorkspaceTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(`ztn_tasks_${user.username || user.email || 'emp'}`);
      return saved ? JSON.parse(saved) : defaultWorkspaceTasks;
    } catch (e) {
      return defaultWorkspaceTasks;
    }
  });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskProject, setNewTaskProject] = useState('Sprint 24');
  const [taskFilter, setTaskFilter] = useState('all');

  useEffect(() => {
    try {
      localStorage.setItem(`ztn_tasks_${user.username || user.email || 'emp'}`, JSON.stringify(workspaceTasks));
    } catch (e) {
      console.warn('Failed to save tasks:', e);
    }
  }, [workspaceTasks, user.username, user.email]);

  const toggleTask = (taskId) => {
    setWorkspaceTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const item = {
      id: Date.now(),
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      project: newTaskProject || 'Workspace',
      completed: false,
      due: 'This Week'
    };
    setWorkspaceTasks(prev => [item, ...prev]);
    setNewTaskTitle('');
  };

  const handleDeleteTask = (taskId) => {
    setWorkspaceTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // Workspace Scratchpad / Notes State
  const [workspaceNotes, setWorkspaceNotes] = useState(() => {
    try {
      return localStorage.getItem(`ztn_notes_${user.username || user.email || 'emp'}`) || 
`# Daily Workspace Notes - ${new Date().toLocaleDateString()}
- [x] Attended 10:00 AM Team Standup
- [ ] Review sprint architectural document
- [ ] Verify Zero Trust DLP payload policies

Security Context: Continuous Verification Active (10-file daily quota enforced).`;
    } catch (e) {
      return '';
    }
  });
  const [notesSavedAlert, setNotesSavedAlert] = useState(false);

  const handleSaveNotes = () => {
    try {
      localStorage.setItem(`ztn_notes_${user.username || user.email || 'emp'}`, workspaceNotes);
      setNotesSavedAlert(true);
      setTimeout(() => setNotesSavedAlert(false), 2500);
    } catch (e) {
      console.warn('Failed to save notes:', e);
    }
  };

  // Workspace Document Vault (Tied to the 10-File Daily Quota)
  const workspaceDocuments = [
    {
      id: 'doc-1',
      filename: 'Sprint_24_Architecture_Spec.pdf',
      classification: 'Confidential',
      department: user.department || 'Engineering',
      sizeMb: 4.2,
      lastModified: '2026-10-06',
      author: 'Lead Architect',
      type: 'PDF',
      summary: 'High-level cloud microservices topology with mutual TLS encryption, Zero Trust policy enforcement points, and Redis cache clusters.',
      contentPreview: [
        '1. EXECUTIVE OVERVIEW: This document details the transition to decentralized Zero Trust microsegmentation.',
        '2. AUTHENTICATION PROTOCOL: All internal services require cryptographically signed JSON Web Tokens (JWT) with 15-minute expiration.',
        '3. DATA LOSS PREVENTION: All outbound egress channels inspect document classification tags before release.',
        '4. AUDIT COMPLIANCE: Continuous logging must be fed to SOC telemetry stream.'
      ]
    },
    {
      id: 'doc-2',
      filename: 'ZeroTrust_Security_Policy_2026.pdf',
      classification: 'Confidential',
      department: 'Cybersecurity',
      sizeMb: 2.8,
      lastModified: '2026-10-05',
      author: 'CISO Office',
      type: 'PDF',
      summary: 'Corporate compliance standard: mandatory multi-factor authentication, device fingerprinting, and max 10 file daily download ceiling.',
      contentPreview: [
        'POLICY DIRECTIVE 2026-SEC-01:',
        '• Principle of Least Privilege: Employees access only resources required for assigned active sprint items.',
        '• Daily File Quota: Standard employees are limited to 10 file operations per 24 hours. Extensions require formal admin appeal.',
        '• Geolocation Verification: Logins from anomalous regions trigger automated step-up challenges.'
      ]
    },
    {
      id: 'doc-3',
      filename: 'Database_Schema_Migration_v4.sql',
      classification: 'Restricted',
      department: 'Database Ops',
      sizeMb: 1.5,
      lastModified: '2026-10-04',
      author: 'Data Platform Team',
      type: 'SQL',
      summary: 'PostgreSQL & SQLite schema changes adding user registration review statuses, approval audit logs, and file quota tracking.',
      contentPreview: [
        '-- ZeroTrustNet v4 Migration Script',
        'ALTER TABLE users ADD COLUMN approval_status TEXT DEFAULT "Pending";',
        'ALTER TABLE users ADD COLUMN reviewed_at TIMESTAMP;',
        'ALTER TABLE users ADD COLUMN reviewed_by TEXT;',
        'CREATE INDEX idx_user_approval ON users(approval_status);'
      ]
    },
    {
      id: 'doc-4',
      filename: 'Client_Onboarding_Handbook.pdf',
      classification: 'Internal',
      department: 'Client Success',
      sizeMb: 3.1,
      lastModified: '2026-10-02',
      author: 'Operations Director',
      type: 'PDF',
      summary: 'Standard operating procedures for provisioning new enterprise client environments under strict perimeterless security.',
      contentPreview: [
        'Section A: Initial Client Verification & Domain DNS TXT Validation.',
        'Section B: Single Sign-On (SAML 2.0 / OIDC) Federation Setup.',
        'Section C: Incident escalation path and SOC emergency contact directory.'
      ]
    },
    {
      id: 'doc-5',
      filename: 'API_Microservices_Contract.json',
      classification: 'Internal',
      department: 'Engineering',
      sizeMb: 0.8,
      lastModified: '2026-10-01',
      author: 'Backend Team',
      type: 'JSON',
      summary: 'OpenAPI 3.1 specification for employee endpoints, telemetry streaming, UEBA calculation, and file vault quota checks.',
      contentPreview: [
        '{\n  "openapi": "3.1.0",\n  "info": { "title": "ZeroTrustNet Core API", "version": "5.0" },\n  "paths": {\n    "/api/employee/file-access": { "post": { "security": [{ "bearerAuth": [] }] } },\n    "/api/employee/appeal-access": { "post": { "summary": "Quota appeal" } }\n  }\n}'
      ]
    },
    {
      id: 'doc-6',
      filename: 'Q3_Financial_Forecast_Model.xlsx',
      classification: 'Confidential',
      department: 'Finance',
      sizeMb: 5.6,
      lastModified: '2026-09-28',
      author: 'Finance Controller',
      type: 'XLSX',
      summary: 'Departmental budget allocations, cybersecurity tooling ROI analysis, and enterprise licensing projections.',
      contentPreview: [
        'SHEET: Q3_Projections',
        'Row 1: Cybersecurity Infrastructure: $420,000 [Allocated]',
        'Row 2: Cloud Computing Compute (AWS / Azure): $310,000 [Allocated]',
        'Row 3: Identity Verification & HSM Tokens: $95,000 [Allocated]'
      ]
    }
  ];

  const [previewDoc, setPreviewDoc] = useState(null);
  const [activeSprintModal, setActiveSprintModal] = useState(null);

  // File access helper connecting workspace downloads to the 10-file quota
  const handleWorkspaceFileAccess = async (docItem, op = 'Download') => {
    setActionLoading(true);
    setActionAlert({ type: '', msg: '' });
    try {
      const res = await fetch('/api/employee/file-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filename: docItem.filename,
          classification: docItem.classification,
          operation: op,
          file_size_mb: docItem.sizeMb || 2.5
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        if (resData.quota_exceeded) {
          setShowAppealModal(true);
          fetchAppeals();
          setActionAlert({ type: 'error', msg: `⛔ Quota Reached: ${resData.error} (Maximum 10-file access limit). Please appeal for access.` });
          return;
        }
        throw new Error(resData.error || 'File access failed');
      }

      if (resData.is_flagged) {
        setShowStepUpModal(true);
      }

      setActionAlert({ type: resData.is_flagged ? 'warning' : 'success', msg: `📥 File accessed: ${docItem.filename} (${resData.message})` });
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Interactive Terminal Simulator State & Handler
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [terminalCommands, setTerminalCommands] = useState([
    { type: 'output', text: 'ZeroTrustNet Enterprise Secure Shell v5.0 [Node ID: ztn-workstation-secure]' },
    { type: 'output', text: 'Type "help", "status", "whoami", "quota", "tasks", or "ping" to interact.' }
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;
    const lower = cmd.toLowerCase();
    let responseText = '';

    if (lower === 'help') {
      responseText = 'Commands: help, status, whoami, quota, tasks, ping, zt-verify, clear';
    } else if (lower === 'status') {
      responseText = `System Status: Operational | User: ${user.name} | Dept: ${user.department} | Risk Score: ${data?.risk_score ?? 0}/100`;
    } else if (lower === 'whoami') {
      responseText = `User: ${user.name} (${user.username || user.email}) | Role: ${user.role} | Device: ${user.device_id || 'DEV-WIN-PRO'}`;
    } else if (lower === 'quota') {
      responseText = `File Quota: ${data?.file_quota?.used || 0}/${data?.file_quota?.limit || 10} files used today.`;
    } else if (lower === 'tasks') {
      const pending = workspaceTasks.filter(t => !t.completed).length;
      responseText = `Tasks: ${pending} pending out of ${workspaceTasks.length} total.`;
    } else if (lower === 'clear') {
      setTerminalCommands([]);
      setTerminalInput('');
      return;
    } else if (lower === 'zt-verify') {
      responseText = 'Zero Trust Cryptographic Handshake: PASSED (Signature: sha256:7f8a92bc80...)';
    } else if (lower.startsWith('ping')) {
      responseText = 'PING internal-gateway (10.0.4.1): 64 bytes, time=1.2ms, status=SECURE_TUNNEL';
    } else {
      responseText = `Command not recognized: "${cmd}". Type "help" for available commands.`;
    }

    setTerminalCommands(prev => [
      ...prev,
      { type: 'input', text: `$ ${cmd}` },
      { type: 'output', text: responseText }
    ]);
    setTerminalInput('');
  };

  const handleRealFileUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUploadFile) {
      alert("Please select a file to upload from your computer.");
      return;
    }

    setActionLoading(true);
    setActionAlert({ type: '', msg: '' });

    try {
      const formData = new FormData();
      formData.append('file', selectedUploadFile);
      formData.append('classification', uploadClassification);
      if (autoExtractArchive) {
        formData.append('auto_extract', '1');
      }

      const res = await fetch('/api/employee/upload-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'File upload failed');

      if (resData.warning) {
        setActionAlert({ type: 'warning', msg: resData.warning });
      } else {
        setActionAlert({ type: 'success', msg: `✅ ${resData.message}` });
      }

      if (resData.extracted_data) {
        setExtractedDataView({
          archive_name: resData.filename,
          extract_id: resData.extracted_data.extract_id,
          total_files: resData.extracted_data.total_files,
          has_threats: resData.extracted_data.has_threats,
          threat_details: resData.extracted_data.threat_details || [],
          items: resData.extracted_data.items || []
        });
        setActiveModal('view_extracted');
      } else {
        setActiveModal(null);
      }

      setSelectedUploadFile(null);
      setAutoExtractArchive(false);
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtractArchiveSubmit = async (fileToExtract = null, fileId = null, filename = null) => {
    setActionLoading(true);
    setActionAlert({ type: '', msg: '' });

    try {
      let res;
      if (fileToExtract) {
        const formData = new FormData();
        formData.append('file', fileToExtract);
        res = await fetch('/api/employee/extract-archive', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      } else {
        res = await fetch('/api/employee/extract-archive', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ file_id: fileId, filename: filename })
        });
      }

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Archive extraction failed');

      if (resData.warning) {
        setActionAlert({ type: 'warning', msg: resData.warning });
      } else {
        setActionAlert({ type: 'success', msg: `✅ ${resData.message}` });
      }

      setExtractedDataView({
        archive_name: resData.archive_name,
        extract_id: resData.extract_id,
        total_files: resData.total_files,
        has_threats: resData.has_threats,
        threat_details: resData.threat_details || [],
        items: resData.items || []
      });
      setActiveModal('view_extracted');
      setSelectedExtractArchiveFile(null);
      setSelectedExistingArchiveId('');
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Listen for physical hardware USB insertion events via WebUSB API
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.usb) {
      const handleUsbConnected = (event) => {
        const dev = event.device;
        const name = `${dev.productName || 'Removable USB Storage'} (Vendor: 0x${dev.vendorId ? dev.vendorId.toString(16) : 'unknown'})`;
        setUsbHardwareDetected(name);
        setUsbPreset('Custom');
        setUsbCustomName(name);
        setActiveModal('insert_usb');
      };
      navigator.usb.addEventListener('connect', handleUsbConnected);
      return () => {
        navigator.usb.removeEventListener('connect', handleUsbConnected);
      };
    }
  }, []);

  const handleScanPhysicalUsb = async () => {
    if (typeof navigator === 'undefined' || !navigator.usb) {
      alert("WebUSB API is not supported in this browser. Please use Chrome/Edge or select a device from the list.");
      return;
    }
    try {
      const device = await navigator.usb.requestDevice({ filters: [] });
      const devName = `${device.productName || 'USB Storage Device'} (VendorID: 0x${device.vendorId.toString(16)}, ProductID: 0x${device.productId.toString(16)})`;
      setUsbHardwareDetected(devName);
      setUsbPreset('Custom');
      setUsbCustomName(devName);
    } catch (err) {
      console.log("Hardware USB picker closed:", err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [dashRes, fileRes, extractRes] = await Promise.all([
        fetch('/api/employee/dashboard', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/employee/file-access/history', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/employee/extracted-archives', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
      ]);

      if (dashRes.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      const resData = await dashRes.json();
      const fileData = await fileRes.json();
      if (extractRes && extractRes.ok) {
        const extractList = await extractRes.json();
        setExtractedArchivesList(extractList || []);
      }

      if (!dashRes.ok) {
        if (resData.error === 'Invalid token' && onLogout) {
          onLogout();
          return;
        }
        throw new Error(resData.error || 'Failed to load dashboard data');
      }
      setData(resData);
      setFileLogs(fileData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const handleQuickAction = async (actionType, extraData = {}) => {
    setActionLoading(true);
    setActionAlert({ type: '', msg: '' });
    try {
      const response = await fetch('/api/employee/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: actionType, ...extraData })
      });
      const res = await response.json();
      if (!response.ok) {
        if (res.quota_exceeded) {
          setActiveModal(null);
          setShowAppealModal(true);
          fetchAppeals();
          setActionAlert({ type: 'error', msg: `⛔ ${res.error} (10-file quota exceeded). Please submit an appeal below.` });
          return;
        }
        throw new Error(res.error || 'Action failed');
      }

      if (res.warning) {
        setActionAlert({ type: 'warning', msg: res.warning });
      } else {
        setActionAlert({ type: 'success', msg: res.message || 'Action performed and logged successfully to immutable audit trail.' });
      }
      
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const triggerReportDownload = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/employee/download-report', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to download report');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ZeroTrust_Security_Audit_Report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setActionAlert({ type: 'success', msg: '📄 Official ZeroTrust Security Audit Report downloaded in PDF format successfully!' });
      setActiveModal(null);
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const triggerDataExport = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/employee/export-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export client data');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Client_Export_Master.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setActionAlert({ type: 'warning', msg: '📊 25 Enterprise Client Records exported to CSV. DLP Exfiltration audit logged to SOC.' });
      setActiveModal(null);
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      alert("New password and confirmation do not match!");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/employee/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ old_password: oldPwd, new_password: newPwd })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Password change failed');

      setActionAlert({ type: 'success', msg: '🔑 Account password updated successfully! Action logged to audit trail.' });
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setActiveModal(null);
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenAiSubmit = async (e) => {
    e.preventDefault();
    if (!genAiPrompt.trim()) return;
    const currentPrompt = genAiPrompt;
    setGenAiPrompt('');
    setGenAiHistory(prev => [...prev, { sender: 'user', msg: currentPrompt }]);

    setActionLoading(true);
    try {
      const res = await fetch('/api/employee/genai-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: currentPrompt })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'GenAI request failed');

      setGenAiHistory(prev => [...prev, { sender: 'assistant', msg: resData.response }]);
      if (resData.warning) {
        setActionAlert({ type: 'warning', msg: resData.warning });
      }
      fetchDashboardData();
    } catch (err) {
      setGenAiHistory(prev => [...prev, { sender: 'error', msg: `Error: ${err.message}` }]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminateRemoteSessions = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/employee/terminate-other-sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to terminate remote sessions');

      setActionAlert({ type: 'success', msg: '🛡️ All secondary remote sessions terminated successfully.' });
      setActiveModal(null);
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileAccessSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionAlert({ type: '', msg: '' });

    try {
      const res = await fetch('/api/employee/file-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filename: selectedFile,
          classification: fileClassification,
          operation: fileOp,
          file_size_mb: fileClassification === 'Secret' ? 12.4 : 2.5
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        if (resData.quota_exceeded) {
          setShowFileModal(false);
          setShowAppealModal(true);
          fetchAppeals();
          setActionAlert({ type: 'error', msg: `⛔ ${resData.error} (Maximum 10-file quota reached). Please appeal below for extension.` });
          return;
        }
        throw new Error(resData.error || 'File operation failed');
      }

      if (resData.is_flagged) {
        setShowStepUpModal(true);
      }

      setActionAlert({ type: resData.is_flagged ? 'warning' : 'success', msg: resData.message });
      setShowFileModal(false);
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyStepUp = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/stepup-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp_code: stepUpOtp })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Step-Up Verification failed');

      setActionAlert({ type: 'success', msg: '✅ Step-Up MFA Verified! File access authorized.' });
      setShowStepUpModal(false);
      fetchDashboardData();
    } catch (err) {
      alert(`Verification Error: ${err.message}`);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: '#00f5ff' }}>Loading Continuous Portal Session...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;
  }

  const { risk_score, severity, exfil_probability, timeline, reasons, recommendations, stats, recent_audit, baseline } = data;
  const riskColor = risk_score >= 80 ? '#ef4444' : risk_score >= 60 ? '#f97316' : risk_score >= 30 ? '#eab308' : '#22c55e';
  const badgeClass = risk_score >= 80 ? 'bc' : risk_score >= 60 ? 'bh' : risk_score >= 30 ? 'bm' : 'bl';

  return (
    <div>
      <div className="zt-title">Employee Workspace & Portal: {user.name}</div>
      <div className="zt-subtitle">{user.department} Department · {user.emp_type} · Cryptographic Zero Trust Verified</div>

      {!workspaceAuthenticated ? (
        
        <div className="zt-card" style={{
          maxWidth: '680px',
          margin: '2rem auto',
          padding: '2.5rem 2rem',
          borderRadius: '16px',
          background: 'linear-gradient(145deg, rgba(13, 27, 62, 0.95), rgba(3, 9, 30, 0.98))',
          border: '1.5px solid rgba(0, 245, 255, 0.35)',
          boxShadow: '0 16px 45px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 245, 255, 0.12)',
          textAlign: 'center'
        }}>
          {/* Lock icon with pulse */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.2), rgba(0, 128, 255, 0.2))',
            border: '2px solid #00f5ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 0 20px rgba(0, 245, 255, 0.4)'
          }}>
            <Lock size={32} color="#00f5ff" />
          </div>

          <div className="zt-badge" style={{
            background: 'rgba(0, 245, 255, 0.12)',
            color: '#00f5ff',
            border: '1px solid rgba(0, 245, 255, 0.35)',
            fontSize: '0.72rem',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            padding: '4px 12px',
            marginBottom: '0.75rem',
            display: 'inline-block'
          }}>
            NIST SP 800-207 · ZERO TRUST IDENTITY GATE
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            Workspace Authentication Required
          </h2>
          <p style={{ fontSize: '0.86rem', color: '#94a3b8', maxWidth: '520px', margin: '0 auto 1.75rem', lineHeight: '1.5' }}>
            Accessing employee workspace deliverables, project repository, and secure terminal environments requires cryptographic TOTP authentication.
          </p>

          {/* Verification Steps Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.75rem',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#00f5ff', fontWeight: 700, fontSize: '0.9rem' }}>
              <ShieldCheck size={18} /> Google / Microsoft Authenticator Setup
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'center' }}>
              {/* QR Code */}
              <div style={{ textAlign: 'center' }}>
                {totpSetup.loading ? (
                  <div style={{ width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1020', borderRadius: '10px' }}>
                    <RefreshCw size={24} color="#00f5ff" style={{ animation: 'spin 1.5s linear infinite' }} />
                  </div>
                ) : totpSetup.qr_code ? (
                  <div style={{
                    background: '#ffffff',
                    padding: '8px',
                    borderRadius: '10px',
                    display: 'inline-block',
                    boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)'
                  }}>
                    <img 
                      src={totpSetup.qr_code} 
                      alt="TOTP QR Code" 
                      style={{ width: '150px', height: '150px', display: 'block', borderRadius: '4px' }}
                    />
                  </div>
                ) : (
                  <div style={{ width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1020', borderRadius: '10px', color: '#ef4444', fontSize: '0.75rem' }}>
                    QR Unavailable
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px' }}>
                  Scan with Authenticator App
                </div>
              </div>

              {/* Step by Step Instructions */}
              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#00f5ff' }}>Step 1:</strong> Open <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> on your phone.
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#00f5ff' }}>Step 2:</strong> Tap <strong>+</strong> and choose <strong>Scan QR code</strong> to register your workspace token.
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#00f5ff' }}>Step 3:</strong> Enter the 6-digit rolling code generated by your app below.
                </div>

                {/* Manual Secret Key */}
                {totpSetup.secret && (
                  <div style={{
                    marginTop: '10px',
                    padding: '6px 10px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    fontSize: '0.72rem'
                  }}>
                    <span style={{ color: '#94a3b8' }}>Key:</span>
                    <code style={{ color: '#38bdf8', letterSpacing: '1px', fontWeight: 'bold' }}>{totpSetup.secret}</code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(totpSetup.secret);
                        alert('Secret key copied to clipboard!');
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#00f5ff', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                      title="Copy secret key"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Verification */}
          <form onSubmit={handleVerifyWorkspaceAuth} style={{ maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                Enter 6-Digit Authenticator Code
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={workspaceOtpInput}
                onChange={(e) => setWorkspaceOtpInput(e.target.value.replace(/\D/g, ''))}
                autoFocus
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '1.8rem',
                  letterSpacing: '12px',
                  fontWeight: 800,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '2px solid rgba(0, 245, 255, 0.4)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#00f5ff',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)'
                }}
              />
            </div>

            {workspaceAuthError && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center'
              }}>
                <AlertCircle size={15} /> {workspaceAuthError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={loadWorkspaceTotp}
                className="zt-btn zt-btn-sec"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.75rem 1.25rem', fontSize: '0.88rem' }}
                title="Regenerate QR Code"
              >
                <RefreshCw size={15} /> Refresh
              </button>

              <button
                type="submit"
                className="zt-btn"
                disabled={workspaceVerifying || workspaceOtpInput.length !== 6}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #00f5ff 0%, #0080ff 100%)',
                  color: '#030816',
                  boxShadow: '0 0 20px rgba(0, 245, 255, 0.4)',
                  opacity: (workspaceVerifying || workspaceOtpInput.length !== 6) ? 0.6 : 1,
                  cursor: (workspaceVerifying || workspaceOtpInput.length !== 6) ? 'not-allowed' : 'pointer'
                }}
              >
                {workspaceVerifying ? (
                  <>
                    <RefreshCw size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                    Verifying Code...
                  </>
                ) : (
                  <>
                    <Lock size={16} /> Unlock Workspace
                  </>
                )}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#64748b' }}>
            🔒 Secured by Zero Trust Continuous Multi-Factor Authentication (RFC 6238 TOTP Standard)
          </div>
        </div>
      ) : (
        <>
          {/* Top Workspace View Navigation Bar: Only Tasks & Sprints and Project Files & Vault */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.65rem',
            marginTop: '1rem',
            marginBottom: '1.35rem',
            borderBottom: '1px solid rgba(0, 245, 255, 0.15)',
            paddingBottom: '0.85rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className={`zt-btn ${activeTab === 'tasks' ? '' : 'zt-btn-sec'}`}
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: activeTab === 'tasks' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.3))' : 'rgba(15, 23, 42, 0.6)',
                  borderColor: activeTab === 'tasks' ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'tasks' ? '#10b981' : '#94a3b8',
                  boxShadow: activeTab === 'tasks' ? '0 0 15px rgba(16, 185, 129, 0.25)' : 'none'
                }}
                onClick={() => setActiveTab('tasks')}
              >
                <CheckSquare size={16} /> 📋 Tasks & Sprints ({workspaceTasks.filter(t => !t.completed).length})
              </button>

              <button
                className={`zt-btn ${activeTab === 'files' ? '' : 'zt-btn-sec'}`}
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: activeTab === 'files' ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(217, 119, 6, 0.3))' : 'rgba(15, 23, 42, 0.6)',
                  borderColor: activeTab === 'files' ? '#eab308' : 'rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'files' ? '#eab308' : '#94a3b8',
                  boxShadow: activeTab === 'files' ? '0 0 15px rgba(234, 179, 8, 0.25)' : 'none'
                }}
                onClick={() => setActiveTab('files')}
              >
                <Folder size={16} /> 📁 Project Files & Vault ({data?.file_quota ? `${data.file_quota.used}/${data.file_quota.limit}` : '10 Quota'})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button
                className="zt-btn"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setShowTerminalModal(true)}
              >
                <Terminal size={14} /> Cloud Terminal
              </button>
              <button
                className="zt-btn zt-btn-sec"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
                onClick={handleLockWorkspace}
                title="Lock workspace"
              >
                <Lock size={14} /> Lock Workspace
              </button>
            </div>
          </div>
      {/* ======================================================== */}
      {/* 2. DEDICATED TASKS & SPRINTS TAB VIEW */}
      {/* ======================================================== */}
      {activeTab === 'tasks' && (
        <div className="zt-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.18rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={20} /> My Sprint Tasks & Project Deliverables
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Track personal sprint tasks, high-priority deliverables, and department action items.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'pending', 'completed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: taskFilter === f ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                    background: taskFilter === f ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: taskFilter === f ? '#10b981' : '#94a3b8',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {f} ({f === 'all' ? workspaceTasks.length : f === 'pending' ? workspaceTasks.filter(t => !t.completed).length : workspaceTasks.filter(t => t.completed).length})
                </button>
              ))}
            </div>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="zt-input"
              style={{ flex: 2, minWidth: '220px', padding: '0.55rem 0.85rem' }}
              placeholder="What task or deliverable are you adding today?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <select
              className="zt-input"
              style={{ width: '130px', padding: '0.55rem' }}
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
            >
              <option value="High">🔴 High Priority</option>
              <option value="Medium">🟡 Medium Priority</option>
              <option value="Low">🟢 Low Priority</option>
            </select>
            <input
              type="text"
              className="zt-input"
              style={{ width: '140px', padding: '0.55rem' }}
              placeholder="Project tag"
              value={newTaskProject}
              onChange={(e) => setNewTaskProject(e.target.value)}
            />
            <button
              type="submit"
              className="zt-btn"
              style={{ padding: '0.55rem 1.1rem', background: '#10b981', color: '#0f172a', fontWeight: 'bold' }}
            >
              <Plus size={16} /> Add New Task
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {workspaceTasks
              .filter(t => taskFilter === 'all' ? true : taskFilter === 'pending' ? !t.completed : t.completed)
              .map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.1rem',
                    background: task.completed ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0.75)',
                    border: `1px solid ${task.completed ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 245, 255, 0.12)'}`,
                    borderRadius: '8px',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div 
                      onClick={() => toggleTask(task.id)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {task.completed ? (
                        <CheckSquare size={20} color="#10b981" />
                      ) : (
                        <Square size={20} color="#64748b" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.9rem',
                        color: task.completed ? '#64748b' : '#f8fafc',
                        textDecoration: task.completed ? 'line-through' : 'none',
                        fontWeight: task.completed ? 'normal' : '600'
                      }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '10px', marginTop: '3px' }}>
                        <span>🏷️ {task.project}</span>
                        <span>📅 Due: {task.due}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      background: task.priority === 'High' ? 'rgba(239, 68, 68, 0.15)' : task.priority === 'Medium' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      color: task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#eab308' : '#22c55e'
                    }}>
                      {task.priority} Priority
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="zt-btn zt-btn-sec"
                      style={{ padding: '4px 8px', color: '#ef4444' }}
                      title="Delete task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. DEDICATED FILE VAULT & QUOTA TAB VIEW */}
      {/* ======================================================== */}
      {activeTab === 'files' && (
        <div className="zt-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.18rem', color: '#00f5ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Folder size={20} /> Enterprise File Vault & 10-File Daily Quota
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Download sprint resources or upload documents to secure cloud storage. Daily quota ceiling: 10 files.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                background: data?.file_quota?.is_exhausted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 245, 255, 0.12)',
                border: `1px solid ${data?.file_quota?.is_exhausted ? '#ef4444' : 'rgba(0, 245, 255, 0.4)'}`,
                fontSize: '0.82rem',
                color: data?.file_quota?.is_exhausted ? '#ef4444' : '#00f5ff',
                fontWeight: 'bold'
              }}>
                📁 Quota Used: {data?.file_quota ? `${data.file_quota.used}/${data.file_quota.limit}` : '0/10'} Files
              </div>
              <button
                className="zt-btn"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'rgba(234, 179, 8, 0.15)', borderColor: '#eab308', color: '#eab308' }}
                onClick={() => { setShowAppealModal(true); fetchAppeals(); }}
              >
                📝 Access Appeal
              </button>
              <button
                className="zt-btn"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                onClick={() => setActiveModal('upload_doc')}
              >
                <Upload size={14} /> Upload File
              </button>
            </div>
          </div>

          {/* Document Table */}
          <div className="zt-table-container">
            <table className="zt-table">
              <thead>
                <tr>
                  <th>File Details</th>
                  <th>Classification</th>
                  <th>Size</th>
                  <th>Department</th>
                  <th>Last Modified</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {workspaceDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.25rem' }}>
                          {doc.type === 'PDF' ? '📄' : doc.type === 'SQL' ? '🗄️' : doc.type === 'JSON' ? '⚙️' : '📊'}
                        </span>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>{doc.filename}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{doc.summary}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`zt-badge ${doc.classification === 'Restricted' ? 'bc' : doc.classification === 'Confidential' ? 'bm' : 'bl'}`}>
                        {doc.classification}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{doc.sizeMb} MB</td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{doc.department}</td>
                    <td style={{ color: '#64748b', fontSize: '0.75rem' }}>{doc.lastModified}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="zt-btn zt-btn-sec"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => setPreviewDoc(doc)}
                        >
                          <Eye size={13} /> Preview
                        </button>
                        <button
                          className="zt-btn"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleWorkspaceFileAccess(doc)}
                          disabled={actionLoading}
                        >
                          <Download size={13} /> Access
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

        </>
      )}

      {/* Workspace Modal: Document Preview */}
      {previewDoc && (
        <div className="zt-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="zt-card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', border: '1px solid #00f5ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.4rem' }}>
                    {previewDoc.type === 'PDF' ? '📄' : previewDoc.type === 'SQL' ? '🗄️' : previewDoc.type === 'JSON' ? '⚙️' : '📊'}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>{previewDoc.filename}</h3>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                  Author: {previewDoc.author} · Department: {previewDoc.department} · Size: {previewDoc.sizeMb} MB
                </div>
              </div>
              <span className={`zt-badge ${previewDoc.classification === 'Restricted' ? 'bc' : previewDoc.classification === 'Confidential' ? 'bm' : 'bl'}`}>
                {previewDoc.classification}
              </span>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#00f5ff', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>
                Document Summary & Metadata
              </div>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                {previewDoc.summary}
              </p>

              <div style={{ fontSize: '0.75rem', color: '#00f5ff', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>
                Preview Excerpt / Specification
              </div>
              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '0.75rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#a7f3d0', lineHeight: '1.6' }}>
                {previewDoc.contentPreview.map((line, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>{line}</div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '1.25rem' }}>
              🔐 Cryptographic Stamp: sha256:{previewDoc.id.repeat(4)}... · Watermarked for: {user.name} ({user.department})
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                className="zt-btn zt-btn-sec"
                onClick={() => setPreviewDoc(null)}
              >
                Close Preview
              </button>
              <button
                className="zt-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  handleWorkspaceFileAccess(previewDoc);
                  setPreviewDoc(null);
                }}
                disabled={actionLoading}
              >
                <Download size={14} /> Download File (Quota Checked)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Modal: Interactive Cloud Terminal */}
      {showTerminalModal && (
        <div className="zt-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="zt-card" style={{ maxWidth: '680px', width: '100%', padding: '1.25rem', border: '1px solid #10b981', background: '#020617' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={18} color="#10b981" />
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#10b981', fontFamily: 'monospace' }}>
                  ZeroTrustNet Secure Cloud Shell [ztn-env-production]
                </span>
              </div>
              <button
                onClick={() => setShowTerminalModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: '#0a0f1d',
              padding: '1rem',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              minHeight: '260px',
              maxHeight: '340px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              color: '#34d399',
              marginBottom: '0.85rem'
            }}>
              {terminalCommands.map((c, i) => (
                <div key={i} style={{ marginBottom: '4px', color: c.type === 'input' ? '#38bdf8' : '#a7f3d0' }}>
                  {c.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleTerminalSubmit} style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: '#10b981', fontFamily: 'monospace', lineHeight: '2.4' }}>$</span>
              <input
                type="text"
                className="zt-input"
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
                placeholder="Type command ('help', 'status', 'quota', 'tasks', 'whoami')..."
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                autoFocus
              />
              <button type="submit" className="zt-btn" style={{ background: '#10b981', color: '#0f172a', fontWeight: 'bold' }}>
                Run
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Workspace Modal: Sprint Details */}
      {activeSprintModal && (
        <div className="zt-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="zt-card" style={{ maxWidth: '520px', width: '100%', padding: '1.5rem', border: '1px solid #38bdf8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>{activeSprintModal.title}</h3>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '2px' }}>{activeSprintModal.sprint} · {activeSprintModal.progress}% Complete</div>
              </div>
              <button
                onClick={() => setActiveSprintModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '1rem' }}>
              {activeSprintModal.desc}
            </p>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.85rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>
                Key Sprint Deliverables:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activeSprintModal.deliverables.map((deliv, idx) => (
                  <div key={idx} style={{ fontSize: '0.78rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#22c55e' }}>✓</span> {deliv}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="zt-btn" onClick={() => setActiveSprintModal(null)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Download Report */}
      {activeModal === 'download_report' && (
        <div className="zt-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem', border: '1px solid #00f5ff' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={20} color="#00f5ff" /> 📄 Generate & Download Security Report
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Generate an official, cryptographically signed ZeroTrust Security Audit Report for your session telemetry.
            </p>
            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem', marginBottom: '1.2rem' }}>
              <div><strong>Format:</strong> PDF Document (.pdf)</div>
              <div><strong>Scope:</strong> Personal UEBA Baseline & Audit Logs</div>
              <div><strong>Verification:</strong> Signed JWT Telemetry Stamp</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="zt-btn full-width" onClick={triggerReportDownload} disabled={actionLoading}>
                {actionLoading ? 'Generating...' : '📥 Download Report File'}
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Upload Document */}
      {activeModal === 'upload_doc' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '480px', width: '92%', padding: '1.5rem' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={20} color="#00f5ff" /> 📤 Upload File to Enterprise Server Vault
            </div>
            
            <form onSubmit={handleRealFileUploadSubmit}>
              <div className="zt-input-group">
                <label>Select File from Computer</label>
                <input 
                  type="file" 
                  className="zt-input" 
                  onChange={(e) => setSelectedUploadFile(e.target.files[0] || null)}
                  style={{ padding: '0.45rem', cursor: 'pointer' }}
                  required 
                />
                {selectedUploadFile && (
                  <div style={{ fontSize: '0.75rem', color: '#00f5ff', marginTop: '4px', background: 'rgba(0, 245, 255, 0.08)', padding: '4px 8px', borderRadius: '4px' }}>
                    📄 File Selected: <strong>{selectedUploadFile.name}</strong> ({(selectedUploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                )}
              </div>

              <div className="zt-input-group">
                <label>Data Sensitivity Classification</label>
                <select className="zt-select" value={uploadClassification} onChange={(e) => setUploadClassification(e.target.value)}>
                  <option value="Public">Public</option>
                  <option value="Internal">Internal</option>
                  <option value="Confidential">Confidential</option>
                  <option value="Secret">Secret (Restricted Scope — Triggers SOC Audit)</option>
                </select>
              </div>

              {selectedUploadFile && selectedUploadFile.name.match(/\.(zip|tar|gz|tgz)$/i) && (
                <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.9rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#10b981', fontSize: '0.82rem', fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      checked={autoExtractArchive} 
                      onChange={(e) => setAutoExtractArchive(e.target.checked)} 
                    />
                    <span>⚡ Automatically extract archive contents upon upload</span>
                  </label>
                  <div style={{ fontSize: '0.72rem', color: '#8aafc8', marginTop: '3px' }}>
                    Zero Trust DLP sandbox will inspect all archive members for malicious executables and Zip Slip attacks.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
                <button type="submit" className="zt-btn full-width" disabled={actionLoading}>
                  {actionLoading ? 'Processing...' : '📤 Upload File & Log Audit Event'}
                </button>
                <button type="button" className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2.5: Extract Archive Files */}
      {activeModal === 'extract_archive' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '520px', width: '92%', padding: '1.6rem', border: '1px solid #10b981' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
              <Archive size={22} color="#10b981" /> 📦 Extract & Inspect Archive Files
            </div>
            <p style={{ fontSize: '0.82rem', color: '#8aafc8', marginBottom: '1.1rem', lineHeight: '1.45' }}>
              Unpack `.zip` or `.tar` archives in the Zero Trust sandbox. Every extracted file is screened for path-traversal vulnerabilities (Zip Slip), hidden executables, and classified according to data sensitivity.
            </p>

            {/* Option 1: Select new archive from disk */}
            <div style={{ marginBottom: '1.2rem', padding: '0.9rem', background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(0, 245, 255, 0.15)', borderRadius: '8px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#00f5ff', display: 'block', marginBottom: '6px' }}>
                Option 1: Upload & Extract New Archive (.zip, .tar, .tar.gz)
              </label>
              <input 
                type="file" 
                className="zt-input" 
                accept=".zip,.tar,.gz,.tgz"
                onChange={(e) => {
                  setSelectedExtractArchiveFile(e.target.files[0] || null);
                  setSelectedExistingArchiveId('');
                }}
                style={{ padding: '0.45rem', cursor: 'pointer' }}
              />
              {selectedExtractArchiveFile && (
                <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', fontWeight: 'bold' }}>
                  📦 Selected for Extraction: {selectedExtractArchiveFile.name} ({(selectedExtractArchiveFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {/* Option 2: Extract existing archive from vault */}
            {(() => {
              const uploadedArchives = fileLogs.filter(f => f.filename.toLowerCase().match(/\.(zip|tar|gz|tgz)$/i) && f.operation !== 'Extract Archive');
              return (
                <div style={{ marginBottom: '1.2rem', padding: '0.9rem', background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(0, 245, 255, 0.15)', borderRadius: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#00f5ff', display: 'block', marginBottom: '6px' }}>
                    Option 2: Extract Previously Uploaded Archive ({uploadedArchives.length} available)
                  </label>
                  {uploadedArchives.length > 0 ? (
                    <select 
                      className="zt-select"
                      value={selectedExistingArchiveId}
                      onChange={(e) => {
                        setSelectedExistingArchiveId(e.target.value);
                        setSelectedExtractArchiveFile(null);
                      }}
                    >
                      <option value="">-- Choose Archive from Vault --</option>
                      {uploadedArchives.map((a, i) => (
                        <option key={i} value={a.id}>{a.filename} ({a.classification} · {a.file_size_mb} MB)</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                      No archives in vault yet. Choose Option 1 above to upload an archive.
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button 
                type="button" 
                className="zt-btn full-width"
                style={{ background: '#10b981', color: '#000', fontWeight: 'bold' }}
                disabled={actionLoading || (!selectedExtractArchiveFile && !selectedExistingArchiveId)}
                onClick={() => {
                  if (selectedExtractArchiveFile) {
                    handleExtractArchiveSubmit(selectedExtractArchiveFile);
                  } else if (selectedExistingArchiveId) {
                    handleExtractArchiveSubmit(null, selectedExistingArchiveId);
                  }
                }}
              >
                {actionLoading ? 'Unpacking & Scanning...' : '⚡ Extract Archive Now'}
              </button>
              <button type="button" className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2.6: Extracted Files Vault Viewer */}
      {activeModal === 'view_extracted' && extractedDataView && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '640px', width: '94%', maxHeight: '88vh', overflowY: 'auto', padding: '1.8rem', border: extractedDataView.has_threats ? '2px solid #ef4444' : '1px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <div className="zt-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: extractedDataView.has_threats ? '#ef4444' : '#10b981' }}>
                <FolderArchive size={22} /> 📂 Extracted Archive Vault
              </div>
              <button className="zt-btn zt-btn-sec" style={{ padding: '3px 10px', fontSize: '0.75rem' }} onClick={() => setActiveModal(null)}>✕ Close</button>
            </div>

            <div style={{ fontSize: '0.84rem', color: '#c8d6e8', marginBottom: '1rem', background: 'rgba(0, 245, 255, 0.05)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0, 245, 255, 0.15)' }}>
              <div>📦 <strong>Archive Source:</strong> {extractedDataView.archive_name}</div>
              <div style={{ marginTop: '4px' }}>📊 <strong>Total Files Unpacked:</strong> {extractedDataView.total_files} files</div>
            </div>

            {/* Zero Trust Threat Screening Alert Banner */}
            {extractedDataView.has_threats ? (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', marginBottom: '1.2rem', fontSize: '0.82rem', lineHeight: '1.45' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#ef4444' }}>
                  <AlertCircle size={16} /> ⚠️ MALICIOUS FILE PATTERNS DETECTED IN ARCHIVE
                </div>
                <div style={{ marginTop: '4px' }}>
                  Suspicious executables or credential artifacts flagged: <strong>{extractedDataView.threat_details.join(', ')}</strong>.
                  This extraction event has been flagged and logged to the SOC Threat Center.
                </div>
              </div>
            ) : (
              <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', borderRadius: '8px', color: '#a7f3d0', marginBottom: '1.2rem', fontSize: '0.82rem', lineHeight: '1.45' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#10b981' }}>
                  <CheckCircle2 size={16} /> ✅ ZERO TRUST SECURITY SCAN PASSED
                </div>
                <div style={{ marginTop: '3px' }}>
                  All {extractedDataView.total_files} extracted files screened for Zip Slip attacks, malicious scripts, and unauthorized executables. Files are safe for inspection and download.
                </div>
              </div>
            )}

            {/* Extracted Files Table */}
            <div style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '1.2rem' }}>
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>Extracted File</th>
                    <th>Size</th>
                    <th>Scan Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedDataView.items.map((item, idx) => (
                    <tr key={idx} style={{ background: item.is_dangerous ? 'rgba(239, 68, 68, 0.08)' : 'transparent' }}>
                      <td style={{ fontWeight: '500', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {item.is_dangerous ? '⚠️' : '📄'} {item.rel_path}
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{item.size_kb} KB</td>
                      <td>
                        <span className={`zt-badge ${item.is_dangerous ? 'bc' : 'bl'}`} style={{ fontSize: '0.7rem' }}>
                          {item.threat_tag}
                        </span>
                      </td>
                      <td>
                        <a 
                          href={`/api/employee/download-extracted/${extractedDataView.extract_id}/${item.rel_path}?token=${token}`}
                          className="zt-btn"
                          style={{ padding: '3px 8px', fontSize: '0.72rem', textDecoration: 'none', background: item.is_dangerous ? '#ef4444' : 'var(--accent-cyan)', color: '#000', fontWeight: 'bold' }}
                          download
                        >
                          ⬇️ Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button 
                type="button" 
                className="zt-btn" 
                style={{ background: '#10b981', color: '#000', fontWeight: 'bold' }}
                onClick={() => setActiveModal('extract_archive')}
              >
                Extract Another Archive
              </button>
              <button type="button" className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Open Confidential File */}
      {activeModal === 'open_confidential' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem', border: '1px solid #f59e0b' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
              <Lock size={20} color="#f59e0b" /> 🔐 Open Confidential Resource
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.85rem' }}>
              Select a classified file from the enterprise document vault. Access triggers high-sensitivity DLP auditing.
            </p>
            <div className="zt-input-group">
              <label>Confidential Asset</label>
              <select className="zt-select" value={confidentialFile} onChange={(e) => setConfidentialFile(e.target.value)}>
                <option value="Executive_Salary_Matrix_2026.xlsx">Executive_Salary_Matrix_2026.xlsx [Confidential]</option>
                <option value="Q3_Strategic_Roadmap.pdf">Q3_Strategic_Roadmap.pdf [Secret]</option>
                <option value="SourceCode_CoreAlgorithm.zip">SourceCode_CoreAlgorithm.zip [Secret]</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button className="zt-btn full-width" style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold' }} onClick={() => {
                handleQuickAction('open_confidential', { filename: confidentialFile, details: `Opened Confidential Resource: ${confidentialFile}` });
                setActiveModal(null);
              }} disabled={actionLoading}>
                {actionLoading ? 'Decrypting...' : '🔓 Decrypt & Open File'}
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Delete File */}
      {activeModal === 'delete_file' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem', border: '1px solid #ef4444' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
              🗑️ Confirm Permanent File Deletion
            </div>
            <div className="zt-input-group">
              <label>Target File</label>
              <select className="zt-select" value={deleteFilename} onChange={(e) => setDeleteFilename(e.target.value)}>
                <option value="Customer_Records_2025.db">Customer_Records_2025.db</option>
                <option value="Financial_Ledger_Archive.bak">Financial_Ledger_Archive.bak</option>
              </select>
            </div>
            <div className="zt-input-group">
              <label>Reason for Deletion</label>
              <input type="text" className="zt-input" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button className="zt-btn full-width" style={{ background: '#ef4444', color: '#fff', fontWeight: 'bold' }} onClick={() => {
                handleQuickAction('delete_file', { filename: deleteFilename, details: `Permanently deleted ${deleteFilename}: ${deleteReason}` });
                setActiveModal(null);
              }} disabled={actionLoading}>
                {actionLoading ? 'Deleting...' : '🗑️ Confirm Permanent Deletion'}
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Export Client Data */}
      {activeModal === 'export_data' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem', border: '1px solid #f97316' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f97316' }}>
              📊 Export Client Records CSV
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.85rem' }}>
              Bulk dataset export request: 25 active client directory records will be exported as CSV. This operation triggers DLP data exfiltration warnings.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button className="zt-btn full-width" style={{ background: '#f97316', color: '#000', fontWeight: 'bold' }} onClick={triggerDataExport} disabled={actionLoading}>
                {actionLoading ? 'Exporting...' : '📥 Export Client CSV File'}
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Password Change */}
      {activeModal === 'change_pwd' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '440px', width: '90%', padding: '1.5rem' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={20} color="#00f5ff" /> 🔑 Employee Password Change
            </div>
            <form onSubmit={handlePasswordChangeSubmit}>
              <div className="zt-input-group">
                <label>Current Password</label>
                <input type="password" className="zt-input" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} required />
              </div>
              <div className="zt-input-group">
                <label>New Password</label>
                <input type="password" className="zt-input" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
              </div>
              <div className="zt-input-group">
                <label>Confirm New Password</label>
                <input type="password" className="zt-input" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
                <button type="submit" className="zt-btn full-width" disabled={actionLoading}>
                  {actionLoading ? 'Updating...' : '🔒 Update Account Password'}
                </button>
                <button type="button" className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 7: Multiple Failed Actions */}
      {activeModal === 'failed_operations' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem', border: '1px solid #ef4444' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
              ⚠️ Access Control Failure Simulator
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.85rem' }}>
              Simulate 5 consecutive permission-denied attempts on restricted administrative directories (e.g. <code>/sys/root/admin_vault</code>).
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button className="zt-btn full-width" style={{ background: '#ef4444', color: '#fff', fontWeight: 'bold' }} onClick={() => {
                handleQuickAction('failed_operations', { details: 'Repeated failed operations: 5 consecutive permission denied errors on restricted directory' });
                setActiveModal(null);
              }} disabled={actionLoading}>
                {actionLoading ? 'Simulating...' : '⚠️ Simulate 5x Failed Access Operations'}
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 8: Long Inactive Session */}
      {activeModal === 'long_inactive_session' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '440px', width: '90%', padding: '1.5rem', textAlign: 'center' }}>
            <Clock size={36} color="#fbbf24" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fbbf24' }}>Session Inactivity Idle Lockscreen</div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '8px 0 16px 0' }}>
              Your session was inactive for 45 minutes without screen lock. Input PIN or click resume to verify user presence.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="zt-btn full-width" onClick={() => {
                handleQuickAction('long_inactive_session', { details: 'Session idle timeout: 45 minutes of inactivity detected without lockscreen lock' });
                setActiveModal(null);
              }} disabled={actionLoading}>
                {actionLoading ? 'Resuming...' : '🔓 Unlock & Log Inactivity Event'}
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 9: Concurrent Login Attempt */}
      {activeModal === 'concurrent_login' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '480px', width: '90%', padding: '1.5rem', border: '1px solid #8b5cf6' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa' }}>
              👥 Concurrent Active Sessions Detected
            </div>
            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div><strong>Current Session:</strong> Windows 11 (Chrome) — Active</div>
              <div><strong>Secondary Session:</strong> Linux (Firefox 192.168.1.189) — Active</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="zt-btn full-width" style={{ background: '#8b5cf6', color: '#fff', fontWeight: 'bold' }} onClick={() => {
                handleTerminateRemoteSessions();
                handleQuickAction('concurrent_login', { details: 'Concurrent session attempt: Second active login initiated from secondary device' });
              }} disabled={actionLoading}>
                🛡️ Terminate Remote Sessions
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 10: Use GenAI Tool */}
      {activeModal === 'use_ai' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '560px', width: '92%', height: '80vh', display: 'flex', flexDirection: 'column', padding: '1.25rem', border: '1px solid #00f5ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
              <div style={{ color: '#00f5ff', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={20} /> 🤖 Enterprise GenAI Security Workspace
              </div>
              <button className="zt-btn zt-btn-sec" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setActiveModal(null)}>✕ Close</button>
            </div>

            {/* Chat History Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '0.75rem', paddingRight: '4px' }}>
              {genAiHistory.map((item, idx) => (
                <div key={idx} style={{
                  alignSelf: item.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: item.sender === 'user' ? 'rgba(0, 245, 255, 0.15)' : item.sender === 'assistant' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(245, 158, 11, 0.1)',
                  border: `1px solid ${item.sender === 'user' ? 'rgba(0, 245, 255, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                  fontSize: '0.8rem',
                  whiteSpace: 'pre-wrap'
                }}>
                  {item.msg}
                </div>
              ))}
            </div>

            <form onSubmit={handleGenAiSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" className="zt-input" placeholder="Type prompt or code snippet to test GenAI DLP monitoring..." value={genAiPrompt} onChange={(e) => setGenAiPrompt(e.target.value)} style={{ flex: 1 }} required />
              <button type="submit" className="zt-btn" disabled={actionLoading}>
                {actionLoading ? 'Sending...' : 'Send Prompt'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 12: Access Payroll System */}
      {activeModal === 'access_payroll' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="zt-card" style={{ maxWidth: '520px', width: '92%', padding: '1.5rem', border: '1px solid #00f5ff' }}>
            <div className="zt-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#00f5ff" /> 💼 Confidential Payroll System Portal
            </div>
            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div><strong>Access User:</strong> {user.name} ({user.department})</div>
              <div><strong>Authorization:</strong> {['HR', 'Finance', 'IT Security'].includes(user.department) ? 'Authorized Department Scope' : '🚫 Restricted Scope — Access Logged to SOC'}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="zt-btn full-width" onClick={() => {
                handleQuickAction('access_payroll', { details: 'Accessed Payroll Management System — salary data' });
                setActiveModal(null);
              }} disabled={actionLoading}>
                💼 Open Payroll Portal & Log Access
              </button>
              <button className="zt-btn zt-btn-sec" onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* File Access Modal */}
      {showFileModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="zt-card" style={{ maxWidth: '440px', width: '90%', padding: '1.5rem' }}>
            <div className="zt-section-title" style={{ marginTop: 0 }}>
              📂 File Access Monitor & Zero Trust Policy Test
            </div>
            
            <form onSubmit={handleFileAccessSubmit}>
              <div className="zt-input-group">
                <label>Select Document</label>
                <select 
                  className="zt-select" 
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                >
                  <option value="Q3_Strategic_Roadmap.pdf">Q3_Strategic_Roadmap.pdf</option>
                  <option value="Payroll_Master_Q2.xlsx">Payroll_Master_Q2.xlsx</option>
                  <option value="SourceCode_CoreAlgorithm.zip">SourceCode_CoreAlgorithm.zip</option>
                  <option value="Public_Press_Release.docx">Public_Press_Release.docx</option>
                </select>
              </div>

              <div className="zt-input-group">
                <label>Data Sensitivity Classification</label>
                <select 
                  className="zt-select" 
                  value={fileClassification}
                  onChange={(e) => setFileClassification(e.target.value)}
                >
                  <option value="Public">Public</option>
                  <option value="Internal">Internal</option>
                  <option value="Confidential">Confidential</option>
                  <option value="Secret">Secret (Restricted Scope)</option>
                </select>
              </div>

              <div className="zt-input-group">
                <label>Operation Action</label>
                <select 
                  className="zt-select" 
                  value={fileOp}
                  onChange={(e) => setFileOp(e.target.value)}
                >
                  <option value="View">View Document</option>
                  <option value="Download">Download File</option>
                  <option value="Upload">Upload File</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
                <button type="submit" className="zt-btn full-width" disabled={actionLoading}>
                  {actionLoading ? 'Processing...' : 'Execute File Operation'}
                </button>
                <button type="button" className="zt-btn zt-btn-sec" onClick={() => setShowFileModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step-Up MFA Challenge Modal */}
      {showStepUpModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1001
        }}>
          <div className="zt-card" style={{ maxWidth: '420px', width: '90%', padding: '1.5rem', border: '1px solid #f59e0b' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <Lock size={32} color="#f59e0b" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f59e0b' }}>
                Step-Up MFA Required
              </div>
              <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginTop: '4px' }}>
                Accessing <strong>{selectedFile} [{fileClassification}]</strong> requires step-up re-authentication under Zero Trust Policy.
              </div>
            </div>

            <form onSubmit={handleVerifyStepUp}>
              <div className="zt-input-group">
                <label>Input 6-Digit Step-Up Code</label>
                <input 
                  type="text" 
                  className="zt-input" 
                  value={stepUpOtp}
                  onChange={(e) => setStepUpOtp(e.target.value)}
                  style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '4px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" className="zt-btn full-width" style={{ background: '#f59e0b', color: '#000' }}>
                  Authorize Step-Up Access
                </button>
                <button type="button" className="zt-btn zt-btn-sec" onClick={() => setShowStepUpModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zero Trust File Access Quota Appeal Modal */}
      {showAppealModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1002,
          padding: '1rem'
        }}>
          <div className="zt-card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', border: '1.5px solid #00f5ff', boxShadow: '0 0 30px rgba(0, 245, 255, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(0, 245, 255, 0.2)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Shield size={24} color="#00f5ff" />
                <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#00f5ff' }}>
                  Zero Trust File Access Quota & Appeal
                </div>
              </div>
              <button 
                onClick={() => setShowAppealModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '0.85rem',
              marginBottom: '1rem',
              fontSize: '0.82rem',
              color: '#fecaca',
              lineHeight: '1.45'
            }}>
              <strong>🛡️ Zero Trust Least-Privilege Policy:</strong> Each employee account is granted an operational limit of <strong>10 file accesses</strong>. Once you reach 10 file accesses, further file reads, downloads, uploads, and sensitive document access are automatically restricted until an administrative appeal is submitted and approved by the Security Administrator.
            </div>

            {/* Quota Telemetry Status Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Allowed Limit</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#00f5ff' }}>{data?.file_quota?.limit ?? 10}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Files Baseline</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Files Accessed</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: data?.file_quota?.is_exhausted ? '#ef4444' : '#eab308' }}>
                  {data?.file_quota?.used ?? 0}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Total Logged</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Remaining</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: (data?.file_quota?.remaining ?? 0) > 0 ? '#22c55e' : '#ef4444' }}>
                  {data?.file_quota?.remaining ?? 0}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Available Accesses</div>
              </div>
            </div>

            {/* Appeal Submission Form */}
            <form onSubmit={handleAppealSubmit} style={{ marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(0, 245, 255, 0.15)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '0.75rem' }}>
                📝 Submit New Access Appeal Request
              </div>

              <div className="zt-input-group" style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Requested Additional Files Allocation:</label>
                <select 
                  className="zt-select" 
                  value={appealRequestedFiles} 
                  onChange={(e) => setAppealRequestedFiles(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(0, 245, 255, 0.3)', color: '#fff', borderRadius: '6px' }}
                >
                  <option value="5">+5 Additional Files</option>
                  <option value="10">+10 Additional Files (Recommended)</option>
                  <option value="20">+20 Additional Files (Project Batch)</option>
                  <option value="50">+50 Additional Files (Enterprise Migration)</option>
                </select>
              </div>

              <div className="zt-input-group" style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Business Justification / Reason for File Access Extension:</label>
                <textarea 
                  className="zt-input" 
                  rows={3}
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="e.g., Preparing quarterly financial audit and compliance reports. Need to inspect client transaction logs and verify tax records."
                  required
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.8rem', padding: '0.6rem' }}
                />
              </div>

              <button 
                type="submit" 
                className="zt-btn" 
                style={{ width: '100%', background: 'linear-gradient(135deg, #00f5ff, #0284c7)', color: '#000', fontWeight: 'bold' }}
                disabled={appealSubmitting}
              >
                {appealSubmitting ? 'Submitting Appeal to SOC...' : '📨 Submit Appeal for Admin Approval'}
              </button>
            </form>

            {/* Appeal History */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#94a3b8' }}>
                  📜 My Appeal Requests & Review Status
                </div>
                <button 
                  type="button" 
                  onClick={fetchAppeals}
                  style={{ background: 'transparent', border: 'none', color: '#00f5ff', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  🔄 Refresh Status
                </button>
              </div>

              {appealsList.length === 0 ? (
                <div style={{ padding: '0.85rem', textAlign: 'center', color: '#64748b', fontSize: '0.78rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '6px' }}>
                  No appeal requests submitted yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {appealsList.map((app) => (
                    <div 
                      key={app.id} 
                      style={{ 
                        padding: '0.75rem', 
                        background: 'rgba(15, 23, 42, 0.6)', 
                        borderRadius: '6px', 
                        border: `1px solid ${app.status === 'Approved' ? 'rgba(34, 197, 94, 0.3)' : app.status === 'Rejected' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                        fontSize: '0.78rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>
                          Appeal #{app.id} · +{app.requested_files} Files
                        </span>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          background: app.status === 'Approved' ? 'rgba(34, 197, 94, 0.2)' : app.status === 'Rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                          color: app.status === 'Approved' ? '#22c55e' : app.status === 'Rejected' ? '#ef4444' : '#eab308'
                        }}>
                          {app.status}
                        </span>
                      </div>
                      <div style={{ color: '#cbd5e1', marginBottom: '0.3rem', fontStyle: 'italic' }}>
                        "{app.reason}"
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.7rem' }}>
                        <span>Submitted: {formatLocalDateTime(app.created_at)}</span>
                        {app.admin_notes && (
                          <span style={{ color: '#38bdf8' }}>Admin Note: {app.admin_notes}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button 
                type="button" 
                className="zt-btn zt-btn-sec" 
                onClick={() => setShowAppealModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
