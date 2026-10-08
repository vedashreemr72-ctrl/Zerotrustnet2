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
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.05) 70%)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 50px rgba(239, 68, 68, 0.6), inset 0 0 20px rgba(239, 68, 68, 0.4)',
              marginBottom: '1.75rem'
            }}
          >
            <CameraOff size={56} color="#ef4444" />
          </div>

          <div
            style={{
              color: '#ef4444',
              fontSize: '0.9rem',
              fontWeight: '800',
              letterSpacing: '3.5px',
              textTransform: 'uppercase',
              marginBottom: '0.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ShieldAlert size={18} /> ZERO TRUST DATA LOSS PREVENTION (DLP)
          </div>

          <h1
            style={{
              color: '#ffffff',
              fontSize: '2.2rem',
              fontWeight: '900',
              letterSpacing: '1px',
              margin: '0 0 1rem 0',
              textTransform: 'uppercase',
              textShadow: '0 0 30px rgba(239, 68, 68, 0.5)'
            }}
          >
            Screen Capture Restricted
          </h1>

          <p
            style={{
              maxWidth: '640px',
              color: '#94a3b8',
              fontSize: '1.05rem',
              lineHeight: '1.6',
              margin: '0 0 1.75rem 0'
            }}
          >
            Capturing screenshots, screen recordings, or printing sensitive assets is strictly prohibited by Zero Trust enterprise policy.
            The viewport has been obscured and system clipboard sanitized to prevent data exfiltration.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}
          >
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '0.86rem',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🚨 Intercepted:</span>
              <strong style={{ color: '#ffffff' }}>{blockReason}</strong>
            </div>

            <div
              style={{
                background: 'rgba(0, 245, 255, 0.08)',
                border: '1px solid rgba(0, 245, 255, 0.25)',
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                color: '#38bdf8',
                fontSize: '0.86rem',
                fontFamily: 'monospace'
              }}
            >
              Policy: <strong>POL-004 (Anti-Capture DLP)</strong>
            </div>

            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                color: '#fbbf24',
                fontSize: '0.86rem',
                fontFamily: 'monospace'
              }}
            >
              SOC Telemetry: <strong>Dispatched (+25 Risk Contrib)</strong>
            </div>
          </div>

          <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
            Screen will restore automatically in a few seconds once capture window terminates.
          </div>
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
