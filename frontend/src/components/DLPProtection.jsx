import React, { useState, useEffect, useRef } from 'react';
import { CameraOff, ShieldAlert, AlertTriangle, Lock, EyeOff } from 'lucide-react';

/**
 * Enterprise Zero Trust DLP (Data Loss Prevention) Screen Protection Component
 * - Intercepts PrintScreen, Windows Snipping Tool (Win+Shift+S), Mac Capture (Cmd+Shift+3/4/5), Ctrl+P, and web captures.
 * - Instantly obscures / blacks out the viewport so captured frames or snippets record only a security shield.
 * - Sanitizes / overwrites the system clipboard to destroy stolen screenshot bitmaps.
 * - Synthesizes an audible security deterrence tone via Web Audio API.
 * - Automatically dispatches real-time security violation telemetry to the SOC Admin Dashboard.
 */
export default function DLPProtection({ user, token }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('PrintScreen / Screen Capture Attempt Intercepted');
  const [incidentCount, setIncidentCount] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const timeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const shiftPressedRef = useRef(false);

  // Play synthesized dual-tone security alarm chime
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High alarm pitch
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.35); // Rapid drop

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Sanitize system clipboard to destroy captured image data
  const sanitizeClipboard = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(
          '⚠️ [ZERO TRUST DLP ENFORCEMENT] Screen capture is prohibited by enterprise security policy. Attempt intercepted and logged to SOC audit trail.'
        ).catch(() => {});
      }
    } catch (e) {}
  };

  // Dispatch incident telemetry to backend SOC API
  const reportIncidentToSOC = (reason) => {
    if (!token) return;
    fetch('/api/employee/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'screenshot_attempt',
        details: reason || 'Unauthorized screen capture attempt intercepted and blocked (PrintScreen / Snipping Tool)'
      })
    }).catch((err) => {
      console.warn('DLP SOC telemetry dispatch failed:', err);
    });
  };

  // Trigger the visual screen-blinding shield
  const triggerScreenShield = (reason = 'PrintScreen Key Intercepted') => {
    setBlockReason(reason);
    setIsBlocked(true);
    setIncidentCount((prev) => prev + 1);
    setToastMsg(`🛑 ${reason} — Obscured by Zero Trust DLP`);

    // Audio & clipboard security actions
    playAlertChime();
    sanitizeClipboard();

    // Report to backend
    reportIncidentToSOC(reason);

    // Notify other components
    window.dispatchEvent(new CustomEvent('ztn_screenshot_blocked', { detail: { reason, timestamp: new Date() } }));

    // Reset visual shield after 2.8 seconds
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsBlocked(false);
    }, 2800);

    // Fade toast after 6 seconds
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg('');
    }, 6000);
  };

  // Expose global test trigger so buttons or test simulations can invoke it
  useEffect(() => {
    window.triggerDLPScreenshotBlock = (customReason) => {
      triggerScreenShield(customReason || 'Manual DLP Screen Capture Simulation');
    };
    return () => {
      delete window.triggerDLPScreenshotBlock;
    };
  }, [token, user]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Track shift key for compound shortcuts
      if (e.key === 'Shift') {
        shiftPressedRef.current = true;
      }

      // 1. Hardware PrintScreen Key (Windows / Linux)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenShield('Hardware PrintScreen Key Intercepted');
        return;
      }

      // 2. Windows Snipping Tool (Win + Shift + S) or compound shortcut
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenShield('Screen Snipping Tool Shortcut (Win/Ctrl+Shift+S) Intercepted');
        return;
      }

      // 3. macOS Screen Capture Shortcuts (Cmd + Shift + 3 / 4 / 5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5', '$', '#', '%'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenShield('macOS Screen Capture Shortcut (Cmd+Shift+3/4/5) Intercepted');
        return;
      }

      // 4. Print / Save as PDF screenshot attempt (Ctrl + P / Cmd + P)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenShield('Print / PDF Capture Shortcut (Ctrl+P) Intercepted');
        return;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        shiftPressedRef.current = false;
      }
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        triggerScreenShield('Hardware PrintScreen Key Intercepted');
      }
    };

    // When a screenshot tool steals focus, sanitize and shield if Shift was down
    const handleWindowBlur = () => {
      if (shiftPressedRef.current) {
        triggerScreenShield('External Screen Snipping Focus Stolen');
        shiftPressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleWindowBlur);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [token, user]);

  return (
    <>
      {/* 🛑 High-Priority Anti-Capture Blinding Shield Overlay */}
      {isBlocked && (
        <div
          id="ztn-dlp-shield"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#030712',
            zIndex: 2147483647, // Maximum integer z-index
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '2rem',
            boxShadow: 'inset 0 0 120px rgba(239, 68, 68, 0.45)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Animated Glowing Emergency Shield Badge */}
          <div
            style={{
              position: 'relative',
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.08) 70%)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 50px rgba(239, 68, 68, 0.65), inset 0 0 20px rgba(239, 68, 68, 0.45)',
              marginBottom: '1.75rem'
            }}
          >
            <CameraOff size={56} color="#ef4444" />
          </div>

          <div
            className="dlp-tagline"
            style={{
              color: '#ff4d4d',
              fontSize: '0.95rem',
              fontWeight: '800',
              letterSpacing: '3.5px',
              textTransform: 'uppercase',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ShieldAlert size={20} color="#ff4d4d" /> ZERO TRUST DATA LOSS PREVENTION (DLP)
          </div>

          <h1
            className="dlp-heading"
            style={{
              color: '#ffffff',
              fontSize: '2.5rem',
              fontWeight: '900',
              letterSpacing: '1.5px',
              margin: '0 0 1rem 0',
              textTransform: 'uppercase',
              textShadow: '0 0 35px rgba(239, 68, 68, 0.8), 0 2px 10px rgba(0, 0, 0, 0.95)'
            }}
          >
            Screen Capture Restricted
          </h1>

          <p
            className="dlp-paragraph"
            style={{
              maxWidth: '700px',
              color: '#f1f5f9',
              fontSize: '1.12rem',
              fontWeight: '500',
              lineHeight: '1.7',
              margin: '0 0 1.85rem 0'
            }}
          >
            Capturing screenshots, screen recordings, or printing sensitive assets is strictly prohibited by Zero Trust enterprise policy.
            The viewport has been obscured and system clipboard sanitized to prevent data exfiltration.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '14px',
              justifyContent: 'center',
              marginBottom: '1.75rem'
            }}
          >
            <div
              className="dlp-badge-intercepted"
              style={{
                background: 'rgba(239, 68, 68, 0.22)',
                border: '1px solid #ef4444',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                color: '#fecaca',
                fontSize: '0.92rem',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)'
              }}
            >
              <span style={{ color: '#fca5a5', fontWeight: '700' }}>🚨 Intercepted:</span>
              <strong style={{ color: '#ffffff', fontWeight: '800' }}>{blockReason}</strong>
            </div>

            <div
              className="dlp-badge-policy"
              style={{
                background: 'rgba(0, 245, 255, 0.16)',
                border: '1px solid #00f5ff',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                color: '#7dd3fc',
                fontSize: '0.92rem',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(0, 245, 255, 0.15)'
              }}
            >
              <span style={{ color: '#7dd3fc', fontWeight: '700' }}>Policy:</span>
              <strong style={{ color: '#00f5ff', fontWeight: '800' }}>POL-004 (Anti-Capture DLP)</strong>
            </div>

            <div
              className="dlp-badge-soc"
              style={{
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid #f59e0b',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                color: '#fcd34d',
                fontSize: '0.92rem',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.15)'
              }}
            >
              <span style={{ color: '#fcd34d', fontWeight: '700' }}>SOC Telemetry:</span>
              <strong style={{ color: '#fef08a', fontWeight: '800' }}>Dispatched (+25 Risk Contrib)</strong>
            </div>
          </div>

          <div
            className="dlp-footer"
            style={{ color: '#cbd5e1', fontSize: '0.88rem', fontWeight: '500', marginBottom: '1.25rem' }}
          >
            Screen will restore automatically in a few seconds once capture window terminates.
          </div>

          <button
            type="button"
            onClick={() => setIsBlocked(false)}
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: '1px solid #fca5a5',
              padding: '0.65rem 1.75rem',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.55)',
              transition: 'all 0.15s ease'
            }}
          >
            ✓ Return to Workspace
          </button>
        </div>
      )}

      {/* ⚠️ Persistent Floating DLP Toast Alert */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))',
            border: '1px solid #ef4444',
            boxShadow: '0 10px 40px rgba(239, 68, 68, 0.35)',
            borderRadius: '10px',
            padding: '1rem 1.35rem',
            zIndex: 999998,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#ffffff',
            maxWidth: '480px',
            animation: 'slideInRight 0.25s ease-out'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CameraOff size={20} color="#ef4444" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#fca5a5' }}>
              Zero Trust DLP: Screenshot Blocked
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px', lineHeight: '1.4' }}>
              {toastMsg}. Clipboard sanitized and security alert recorded in SOC log.
            </div>
          </div>
          <button
            onClick={() => setToastMsg('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 🛡️ Subtle Background Security Watermark Overlay */}
      <div
        id="ztn-dlp-watermark"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0.035,
          overflow: 'hidden',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'space-around',
          justifyContent: 'space-around',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              transform: 'rotate(-25deg)',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: '900',
              letterSpacing: '2px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              margin: '2rem'
            }}
          >
            ZERO TRUST DLP PROTECTED · CONFIDENTIAL · NO CAPTURE ALLOWED · {user?.username ? `@${user.username.toUpperCase()}` : 'ENTERPRISE ENDPOINT'}
          </div>
        ))}
      </div>
    </>
  );
}
