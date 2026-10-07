/**
 * Unified 12-Hour Time Formatting Helpers (RFC / SOC Standards)
 * Ensures consistent 12-hour (hh:mm[:ss] AM/PM) format across all modules,
 * converting ISO timestamps, legacy 24-hour timestamps, and relative offsets.
 */

function parseTimeTo12Hour(rawStr, includeSeconds = false) {
  if (typeof rawStr !== 'string') return null;
  const trimmed = rawStr.trim();
  if (!trimmed) return null;

  // Already 12-hour formatted with AM/PM
  if (/(AM|PM|am|pm)$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Matches "HH:MM" or "HH:MM:SS" (e.g., "15:09" or "15:09:34")
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const seconds = match[3] || '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = hours < 10 ? '0' + hours : String(hours);
    return includeSeconds
      ? `${strHours}:${minutes}:${seconds} ${ampm}`
      : `${strHours}:${minutes} ${ampm}`;
  }

  return null;
}

export function formatLocalTime(raw, fallbackOffsetMinutes = 0) {
  if (!raw || raw === '—' || raw === '09:00' || raw === '09:00:00 AM') {
    const d = new Date(Date.now() - fallbackOffsetMinutes * 60000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }

  const parsed12 = parseTimeTo12Hour(raw, true);
  if (parsed12) return parsed12;

  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }
  return String(raw);
}

export function formatShortTime(raw, fallbackOffsetMinutes = 0) {
  if (!raw || raw === '—' || raw === '09:00' || raw === '09:00:00 AM' || raw === '09:00 AM') {
    const d = new Date(Date.now() - fallbackOffsetMinutes * 60000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  const parsed12 = parseTimeTo12Hour(raw, false);
  if (parsed12) return parsed12;

  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
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
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}
