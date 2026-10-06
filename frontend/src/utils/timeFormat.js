/**
 * Real-Time Time Formatting Helpers
 * Ensures all timestamps across ZeroTrustNet reflect real user system local time,
 * eliminating static/demo values and handling ISO timezone offsets properly.
 */

export function formatLocalTime(raw, fallbackOffsetMinutes = 0) {
  if (!raw || raw === '—' || raw === '09:00' || raw === '09:00:00 AM') {
    const d = new Date(Date.now() - fallbackOffsetMinutes * 60000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  return String(raw);
}

export function formatShortTime(raw, fallbackOffsetMinutes = 0) {
  if (!raw || raw === '—' || raw === '09:00' || raw === '09:00:00 AM' || raw === '09:00 AM') {
    const d = new Date(Date.now() - fallbackOffsetMinutes * 60000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return String(raw);
}

export function formatLocalDateTime(raw, fallbackOffsetMinutes = 0) {
  if (!raw || raw === '—' || raw === '09:00' || raw === '09:00:00 AM') {
    const d = new Date(Date.now() - fallbackOffsetMinutes * 60000);
    return d.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
  return String(raw);
}

export function getRelativeRealTime(minutesAgo = 0) {
  const d = new Date(Date.now() - minutesAgo * 60000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
