function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatICSDateTime(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function parseTimeStr(timeStr: string): { hour: number; minute: number } | null {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1]);
  const minute = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'AM' && hour === 12) hour = 0;
  if (period === 'PM' && hour !== 12) hour += 12;
  return { hour, minute };
}

// Parse "Mon, Apr 15" or "Tue, Apr 15" (no year) — finds the nearest future occurrence
function parseBookingDateStr(dateStr: string): Date | null {
  const parts = dateStr.split(', ');
  const monthDay = parts[parts.length - 1]; // e.g. "Apr 15"
  const currentYear = new Date().getFullYear();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  for (const year of [currentYear, currentYear + 1]) {
    const d = new Date(`${monthDay} ${year}`);
    if (!isNaN(d.getTime()) && d >= weekAgo) return d;
  }
  return null;
}

export function downloadICS(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateBookingICS(booking: {
  _id: string;
  class: string;
  tutor: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  topics: string;
}): string | null {
  const dateBase = parseBookingDateStr(booking.date);
  if (!dateBase) return null;

  const start = parseTimeStr(booking.startTime);
  const end = parseTimeStr(booking.endTime);
  if (!start || !end) return null;

  const startDate = new Date(dateBase);
  startDate.setHours(start.hour, start.minute, 0, 0);
  const endDate = new Date(dateBase);
  endDate.setHours(end.hour, end.minute, 0, 0);

  const stamp = formatICSDateTime(new Date());

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alpha Chi Sigma Tutoring//EN',
    'BEGIN:VEVENT',
    `UID:booking-${booking._id}@axsbg-tutoring`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatICSDateTime(startDate)}`,
    `DTEND:${formatICSDateTime(endDate)}`,
    `SUMMARY:Tutoring Session - ${booking.class}`,
    `DESCRIPTION:Tutor: ${booking.tutor}\\nTopics: ${booking.topics}`,
    `LOCATION:${booking.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function generateReviewSessionICS(session: {
  _id: string;
  className: string;
  date: string;
  time: string;
  location: string;
  dateISO?: string;
}): string | null {
  let dateBase: Date | null = null;

  if (session.dateISO) {
    // Parse as local date, not UTC
    const [y, m, d] = session.dateISO.split('-').map(Number);
    dateBase = new Date(y, m - 1, d);
  } else {
    // Strip weekday prefix and try to parse
    const cleaned = session.date.replace(/^[^,]+,\s*/, '');
    const currentYear = new Date().getFullYear();
    for (const year of [currentYear, currentYear + 1]) {
      const d = new Date(`${cleaned} ${year}`);
      if (!isNaN(d.getTime())) { dateBase = d; break; }
    }
  }

  if (!dateBase) return null;

  const timeParts = session.time.split(' - ');
  if (timeParts.length < 2) return null;

  const start = parseTimeStr(timeParts[0]);
  const end = parseTimeStr(timeParts[1]);
  if (!start || !end) return null;

  const startDate = new Date(dateBase);
  startDate.setHours(start.hour, start.minute, 0, 0);
  const endDate = new Date(dateBase);
  endDate.setHours(end.hour, end.minute, 0, 0);

  const stamp = formatICSDateTime(new Date());

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alpha Chi Sigma Tutoring//EN',
    'BEGIN:VEVENT',
    `UID:review-${session._id}@axsbg-tutoring`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatICSDateTime(startDate)}`,
    `DTEND:${formatICSDateTime(endDate)}`,
    `SUMMARY:AXS Review Session - ${session.className}`,
    `DESCRIPTION:Alpha Chi Sigma review session for ${session.className}`,
    `LOCATION:${session.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
