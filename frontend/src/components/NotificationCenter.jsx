import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Volume2, VolumeX, CheckCheck, Trash2, X, AlertTriangle, ShieldAlert, Activity, Clock, ShieldCheck, Check } from 'lucide-react';

export default function NotificationCenter({ token, theme: propTheme }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'critical', 'unread'
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('ztn_sound_enabled') !== 'false';
  });
  const [toasts, setToasts] = useState([]);

  // Theme synchronization (responsive to prop, data-theme attribute on root, and localStorage)
  const [currentTheme, setCurrentTheme] = useState(() => {
    return propTheme || (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null) || localStorage.getItem('ztn_theme') || 'dark';
  });

  useEffect(() => {
    if (propTheme) {
      setCurrentTheme(propTheme);
    }
  }, [propTheme]);

  useEffect(() => {
    const updateTheme = () => {
      const active = (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null) || localStorage.getItem('ztn_theme') || 'dark';
      setCurrentTheme(active);
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('storage', updateTheme);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', updateTheme);
    };
  }, []);

  const isLight = propTheme === 'light' || 
                  currentTheme === 'light' || 
                  (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light') || 
                  (typeof localStorage !== 'undefined' && localStorage.getItem('ztn_theme') === 'light');

  const knownIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);
  const audioCtxRef = useRef(null);

  // Synthesize realistic subtle cyber telemetry notification chime
  const playCyberChime = (severity) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Cyber tone parameters based on severity
      if (severity === 'Critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.25);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(740, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.09);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch (err) {
      // Audio autoplay policy fallback
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('ztn_sound_enabled', String(next));
    if (next) playCyberChime('Low');
  };

  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx && !audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      } catch (e) {}
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;

      // Detect newly arrived notifications
      if (initialLoadDoneRef.current) {
        const fresh = data.filter(n => !knownIdsRef.current.has(n.id));
        if (fresh.length > 0) {
          // Play sound on newest event
          playCyberChime(fresh[0].severity);

          // Add toast for up to 3 most recent new events
          const newToasts = fresh.slice(0, 3).map(n => ({
            id: n.id,
            subject: n.subject || 'Security Event Detected',
            message: n.message,
            severity: n.severity || 'High',
            username: n.username,
            sent_at: n.sent_at,
            timestamp: Date.now()
          }));

          setToasts(prev => [...newToasts, ...prev].slice(0, 5));
        }
      } else {
        // On initial page load: if there is an unread Critical USB alert, pop up toast immediately
        const recentUsb = data.filter(n => 
          !n.is_read && 
          n.severity === 'Critical' && 
          ((n.subject && n.subject.toUpperCase().includes('USB')) || (n.message && n.message.toUpperCase().includes('USB')))
        );
        if (recentUsb.length > 0) {
          const initToasts = recentUsb.slice(0, 1).map(n => ({
            id: n.id,
            subject: n.subject,
            message: n.message,
            severity: 'Critical',
            username: n.username,
            sent_at: n.sent_at,
            timestamp: Date.now()
          }));
          setToasts(initToasts);
        }
      }

      // Update known ids
      data.forEach(n => knownIdsRef.current.add(n.id));
      initialLoadDoneRef.current = true;
      setNotifications(data);
    } catch (err) {
      // Silent error handling for continuous polling
    }
  };

  // Poll notifications every 3.5 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3500);
    return () => clearInterval(interval);
  }, [token]);

  // Auto-dismiss toasts after 6 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(0, prev.length - 1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const markAsRead = async (id = 'all') => {
    try {
      await fetch('/api/admin/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });
      setNotifications(prev => prev.map(n => (id === 'all' || n.id === id ? { ...n, is_read: 1 } : n)));
    } catch (err) {
      // Silent
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Clear all notification history from the feed?')) return;
    try {
      await fetch('/api/admin/notifications/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications([]);
      knownIdsRef.current.clear();
    } catch (err) {
      // Silent
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'critical') return n.severity === 'Critical' || n.severity === 'High';
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const getSeverityStyle = (sev, isLightTheme = isLight) => {
    if (isLightTheme) {
      switch (sev) {
        case 'Critical':
          return { color: '#dc2626', bg: 'rgba(254, 226, 226, 0.85)', border: '#fca5a5', icon: '🔴' };
        case 'High':
          return { color: '#ea580c', bg: 'rgba(255, 237, 213, 0.85)', border: '#fdba74', icon: '🟠' };
        case 'Medium':
          return { color: '#d97706', bg: 'rgba(254, 243, 199, 0.85)', border: '#fcd34d', icon: '🟡' };
        default:
          return { color: '#0284c7', bg: 'rgba(224, 242, 254, 0.85)', border: '#7dd3fc', icon: '🟢' };
      }
    }

    switch (sev) {
      case 'Critical':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', icon: '🔴' };
      case 'High':
        return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)', icon: '🟠' };
      case 'Medium':
        return { color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)', icon: '🟡' };
      default:
        return { color: '#00f5ff', bg: 'rgba(0, 245, 255, 0.12)', border: 'rgba(0, 245, 255, 0.3)', icon: '🟢' };
    }
  };

  const parseDate = (ts) => {
    if (!ts) return new Date();
    if (ts instanceof Date) return ts;
    if (typeof ts === 'number') return new Date(ts);

    let str = String(ts).trim();
    // Render/Flask backend outputs UTC timestamps. If string lacks timezone ('Z' or offset like +05:30 or -04:00),
    // append 'Z' so client parses it as UTC and correctly shows user's real local time.
    if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
      str += 'Z';
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const formatRealClockTime = (ts) => {
    try {
      const d = parseDate(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    try {
      const d = parseDate(ts);
      const now = Date.now();
      const diffSec = Math.floor((now - d.getTime()) / 1000);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

      // If created within the last 15 seconds (or slight server/client clock drift)
      if (diffSec < 15 && diffSec >= -30) {
        return `Just now (${timeStr})`;
      }
      if (diffSec < 60 && diffSec >= 15) {
        return `${diffSec}s ago • ${timeStr}`;
      }
      if (diffSec < 3600 && diffSec >= 60) {
        const mins = Math.floor(diffSec / 60);
        return `${mins}m ago • ${timeStr}`;
      }

      // Check if it's today
      const isToday = d.toDateString() === new Date().toDateString();
      if (isToday) {
        const hours = Math.floor(diffSec / 3600);
        return hours <= 6 ? `${hours}h ago • ${timeStr}` : `Today, ${timeStr}`;
      }

      // Check if it's yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${timeStr}`;
      }

      // Otherwise, show formatted month, day and time
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return String(ts);
    }
  };

  const formatToastTime = (ts) => {
    if (!ts) return 'Just now';
    try {
      const d = parseDate(ts);
      const now = Date.now();
      const diffSec = Math.floor((now - d.getTime()) / 1000);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      if (diffSec < 20 && diffSec >= -30) {
        return `Just now • ${timeStr}`;
      }
      if (diffSec < 60) {
        return `${diffSec}s ago • ${timeStr}`;
      }
      return timeStr;
    } catch {
      return 'Just now';
    }
  };

  return (
    <>
      {/* 🔔 TOP NOTIFICATION TRIGGER BUTTON */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setIsOpen(prev => !prev)}
          title="Real-Time Security Activity & Notifications"
          style={{
            background: isOpen
              ? (isLight ? 'rgba(2, 132, 199, 0.14)' : 'rgba(0, 245, 255, 0.2)')
              : (isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.85)'),
            border: `1px solid ${unreadCount > 0
              ? (isLight ? '#0284c7' : 'rgba(0, 245, 255, 0.5)')
              : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)')}`,
            borderRadius: '8px',
            padding: '7px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            color: isLight ? '#0f172a' : '#f1f5f9',
            fontSize: '0.82rem',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            boxShadow: unreadCount > 0
              ? (isLight ? '0 0 10px rgba(2, 132, 199, 0.2)' : '0 0 12px rgba(0, 245, 255, 0.25)')
              : (isLight ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none')
          }}
        >
          {unreadCount > 0 ? (
            <BellRing size={17} color={isLight ? '#0284c7' : '#00f5ff'} style={{ animation: 'bounce 2s infinite' }} />
          ) : (
            <Bell size={17} color={isLight ? '#64748b' : '#94a3b8'} />
          )}

          <span style={{ fontSize: '0.78rem' }}>Activities</span>

          {unreadCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '10px',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.7)'
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          <span style={{
            display: 'inline-block',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 6px #10b981'
          }}></span>
        </button>

        {/* 📋 SLIDEOUT / DROPDOWN NOTIFICATION DRAWER */}
        {isOpen && (
          <div 
            className="ztn-notification-drawer"
            style={{
            position: 'absolute',
            top: '42px',
            right: 0,
            width: '420px',
            maxWidth: '90vw',
            maxHeight: '620px',
            background: isLight ? '#ffffff' : 'linear-gradient(180deg, #09132b 0%, #030818 100%)',
            border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(0, 245, 255, 0.35)',
            borderRadius: '12px',
            boxShadow: isLight
              ? '0 20px 45px -10px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              : '0 15px 45px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 245, 255, 0.15)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '0.85rem 1rem',
              borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(0, 245, 255, 0.12)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.6)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color={isLight ? '#0284c7' : '#00f5ff'} />
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: isLight ? '#0f172a' : '#f1f5f9' }}>
                  Enterprise Activity Stream
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  color: isLight ? '#166534' : '#10b981',
                  background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.12)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  border: isLight ? '1px solid #86efac' : '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  LIVE
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={toggleSound}
                  title={soundEnabled ? 'Mute Alert Sound' : 'Enable Alert Sound'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: soundEnabled ? (isLight ? '#0284c7' : '#00f5ff') : (isLight ? '#94a3b8' : '#64748b'),
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px'
                  }}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isLight ? '#64748b' : '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Quick Actions */}
            <div style={{
              padding: '0.5rem 1rem',
              borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.06)',
              background: isLight ? '#f8fafc' : 'transparent',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.74rem'
            }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setFilter('all')}
                  style={{
                    background: filter === 'all'
                      ? (isLight ? 'rgba(2, 132, 199, 0.14)' : 'rgba(0, 245, 255, 0.18)')
                      : 'transparent',
                    color: filter === 'all'
                      ? (isLight ? '#0284c7' : '#00f5ff')
                      : (isLight ? '#64748b' : '#94a3b8'),
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setFilter('critical')}
                  style={{
                    background: filter === 'critical'
                      ? (isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.18)')
                      : 'transparent',
                    color: filter === 'critical'
                      ? (isLight ? '#dc2626' : '#ef4444')
                      : (isLight ? '#64748b' : '#94a3b8'),
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  High/Crit
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  style={{
                    background: filter === 'unread'
                      ? (isLight ? '#fef3c7' : 'rgba(234, 179, 8, 0.18)')
                      : 'transparent',
                    color: filter === 'unread'
                      ? (isLight ? '#d97706' : '#eab308')
                      : (isLight ? '#64748b' : '#94a3b8'),
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => markAsRead('all')}
                  title="Mark all notifications as read"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isLight ? '#0284c7' : '#38bdf8',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <CheckCheck size={13} /> Mark Read
                </button>
                <button
                  onClick={clearAll}
                  title="Clear all notifications"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isLight ? '#94a3b8' : '#64748b',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Notification Items List */}
            <div style={{
              overflowY: 'auto',
              maxHeight: '440px',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
              background: isLight ? '#ffffff' : 'transparent'
            }}>
              {filteredNotifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: isLight ? '#64748b' : '#64748b', fontSize: '0.8rem' }}>
                  No notifications match filter criteria.
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const style = getSeverityStyle(n.severity, isLight);
                  return (
                    <div
                      key={n.id}
                      className={`ztn-notification-item ${n.is_read ? 'is-read' : 'is-unread'}`}
                      onClick={() => !n.is_read && markAsRead(n.id)}
                      style={{
                        background: n.is_read
                          ? (isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.45)')
                          : (isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.85)'),
                        borderLeft: `3px solid ${style.color}`,
                        borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.04)',
                        borderRight: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.04)',
                        borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '6px',
                        boxShadow: isLight && !n.is_read ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none',
                        padding: '0.65rem 0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem' }}>{style.icon}</span>
                          <span style={{
                            fontWeight: n.is_read ? 600 : 700,
                            color: n.is_read
                              ? (isLight ? '#64748b' : '#cbd5e1')
                              : (isLight ? '#0f172a' : '#ffffff'),
                            fontSize: '0.82rem'
                          }}>
                            {n.subject || 'Security Event'}
                          </span>
                        </div>
                        <span 
                          title={formatRealClockTime(n.sent_at)} 
                          style={{ fontSize: '0.66rem', color: isLight ? '#64748b' : '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Clock size={11} /> {formatTime(n.sent_at)}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: isLight ? '#334155' : '#94a3b8', lineHeight: '1.35', marginBottom: '4px' }}>
                        {n.message}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: isLight ? '#64748b' : '#64748b' }}>
                        <span>
                          Channel: <b style={{ color: isLight ? '#0284c7' : '#38bdf8' }}>{n.channel || 'System'}</b>
                        </span>
                        {!n.is_read && (
                          <span style={{ color: isLight ? '#16a34a' : '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            ● Unread
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '0.5rem 1rem',
              borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(0, 245, 255, 0.1)',
              background: isLight ? '#f8fafc' : 'rgba(5, 10, 24, 0.8)',
              fontSize: '0.68rem',
              color: isLight ? '#64748b' : '#475569',
              textAlign: 'center'
            }}>
              ZeroTrustNet SIEM Event Dispatcher · Monitoring 11 Continuous Vectors
            </div>
          </div>
        )}
      </div>

      {/* 🚀 FLOATING CYBER TOAST NOTIFICATIONS (TOP RIGHT) */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none'
      }}>
        {toasts.map((toast) => {
          const docTheme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;
          const isToastLight = propTheme === 'light' || currentTheme === 'light' || docTheme === 'light' || (typeof localStorage !== 'undefined' && localStorage.getItem('ztn_theme') === 'light');
          const style = getSeverityStyle(toast.severity, isToastLight);
          const sevClass = (toast.severity || 'low').toLowerCase();

          return (
            <div
              key={toast.id}
              className="ztn-toast"
              style={{
                pointerEvents: 'auto',
                width: '360px',
                maxWidth: '90vw',
                background: isToastLight
                  ? '#ffffff'
                  : 'linear-gradient(135deg, rgba(13, 27, 62, 0.95), rgba(3, 9, 30, 0.98))',
                border: `1px solid ${isToastLight ? '#cbd5e1' : style.border}`,
                borderLeft: `4px solid ${style.color}`,
                boxShadow: isToastLight
                  ? '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)'
                  : `0 8px 30px rgba(0,0,0,0.6), 0 0 15px ${style.border}`,
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                color: isToastLight ? '#0f172a' : '#f1f5f9',
                display: 'flex',
                gap: '10px',
                animation: 'slideInRight 0.3s ease-out',
                position: 'relative',
                transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease'
              }}
            >
              <div style={{ fontSize: '1.2rem', marginTop: '2px' }}>
                {style.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <span className={`ztn-toast-title ${sevClass}`} style={{ fontWeight: 700, fontSize: '0.84rem', color: isToastLight ? (toast.severity === 'Low' ? '#0284c7' : style.color) : style.color, letterSpacing: '0.3px' }}>
                    {toast.severity.toUpperCase()} EVENT DETECTED
                  </span>
                  <button
                    onClick={() => dismissToast(toast.id)}
                    className="ztn-toast-dismiss"
                    title="Dismiss notification"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isToastLight ? '#64748b' : '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="ztn-toast-subject" style={{ fontWeight: 600, fontSize: '0.82rem', color: isToastLight ? '#0f172a' : '#e2e8f0', marginBottom: '3px' }}>
                  {toast.subject}
                </div>

                <div className="ztn-toast-msg" style={{ fontSize: '0.74rem', color: isToastLight ? '#334155' : '#94a3b8', lineHeight: '1.35' }}>
                  {toast.message}
                </div>

                <div className="ztn-toast-footer" style={{ marginTop: '6px', fontSize: '0.67rem', color: isToastLight ? '#64748b' : '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>User: <strong style={{ color: isToastLight ? '#1e293b' : '#cbd5e1' }}>{toast.username}</strong></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={10} /> {formatToastTime(toast.sent_at || toast.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
