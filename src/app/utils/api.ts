/**
 * API client for the redesigned AXS Tutoring backend.
 * Every function here maps 1:1 to a route in the new backend's index.js.
 *
 * Auth: student/tutor/admin sign-in return a JWT, stored under a
 * role-specific localStorage key so the three dashboards stay independent
 * (matches how the frontend already separates student/tutor/admin sessions).
 */

// Update this if the redeployed backend ends up at a different URL.
export const API_BASE = 'https://schedulebackend.vercel.app';

// "9:00 AM" / "1:30 PM" -> minutes since midnight. Display time strings like
// these do NOT sort or compare correctly as plain text — "9:30 AM" is
// lexicographically greater than "10:00 AM" because '9' > '1' — so anything
// that compares, sorts, or checks overlap between two clock times needs to
// go through this first rather than comparing the strings directly.
export function timeToMinutes(time: string): number {
  const match = time.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'AM' && hour === 12) hour = 0;
  if (period === 'PM' && hour !== 12) hour += 12;
  return hour * 60 + minute;
}

const TOKEN_KEYS = {
  student: 'studentAuthToken',
  tutor: 'tutorAuthToken',
  admin: 'adminAuthToken',
} as const;

type Role = keyof typeof TOKEN_KEYS;

export function getToken(role: Role): string | null {
  return localStorage.getItem(TOKEN_KEYS[role]);
}
export function setToken(role: Role, token: string): void {
  localStorage.setItem(TOKEN_KEYS[role], token);
}
export function clearToken(role: Role): void {
  localStorage.removeItem(TOKEN_KEYS[role]);
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, options: RequestInit = {}, role?: Role): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  if (role) {
    const token = getToken(role);
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Request to ${path} failed (${res.status})`);
  }
  return data as T;
}

// ============================================================
// Types
// ============================================================

export interface Booking {
  _id: string;
  subject: string;
  class: string;
  tutor: string;
  tutorEmail: string;
  studentName: string;
  studentEmail: string;
  date: string;
  dateISO: string;
  startTime: string;
  endTime: string;
  duration: number;
  sessionType: 'in-person' | 'online';
  location: string;
  // false only when the student typed a custom "Other" location that the
  // tutor hasn't approved yet (approving happens automatically when they
  // confirm the session). Always true for online sessions.
  locationApproved: boolean;
  // Only present once the tutor has confirmed the session — the backend
  // omits it from the student's view entirely until then.
  zoomLink?: string;
  topics: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentData?: string; // base64, only present when a booking was fetched with its attachment
  confirmed: boolean;
  createdAt: string;
}

export interface TimeRange {
  startTime: string;
  endTime: string;
}

export interface WeeklyAvailability {
  Sunday: TimeRange[];
  Monday: TimeRange[];
  Tuesday: TimeRange[];
  Wednesday: TimeRange[];
  Thursday: TimeRange[];
  Friday: TimeRange[];
  Saturday: TimeRange[];
}

export interface Tutor {
  _id: string;
  name: string;
  email: string;
  subjects: string[];
  classesITeach: string[];
  weeklyAvailability: WeeklyAvailability;
  unavailableDates: string[];
  preferredLocations: string[];
  zoomLink: string;
  isAdmin: boolean;
  isApproved: boolean;
  cancelCount: number;
  onHold: boolean;
  holdReason: 'self' | 'admin' | 'strikes' | null;
}

// Subject -> subarea -> class names, e.g.
// { Chemistry: { "Organic Chemistry": ["CHEM 153A"], "General Chemistry": ["CHEM 20A"] } }
export interface Classes {
  [subject: string]: {
    [subarea: string]: string[];
  };
}

// Reserved subarea key meaning "no subarea" — a class filed directly under
// a subject, with no subsection chosen. Subareas are optional: a subject
// can mix named subareas with classes that just sit under this key.
export const UNGROUPED_SUBAREA = '__none__';

export interface ReviewSessionAttendee {
  name: string;
  subject: string;
  email?: string;
}

export interface ReviewSession {
  _id: string;
  className: string;
  date: string;
  dateISO: string;
  time: string;
  location: string;
  attendees: (ReviewSessionAttendee | string)[];
}

// ============================================================
// Auth
// ============================================================

export async function studentSignup(name: string, email: string, password: string) {
  const result = await req<{ success: boolean; token: string; user: { name: string; email: string } }>(
    '/api/auth/student/signup',
    { method: 'POST', body: JSON.stringify({ name, email, password }) },
  );
  setToken('student', result.token);
  return result.user;
}

export async function studentSignin(email: string, password: string) {
  const result = await req<{ success: boolean; token: string; user: { name: string; email: string } }>(
    '/api/auth/student/signin',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  );
  setToken('student', result.token);
  return result.user;
}

export async function tutorSignup(name: string, email: string, password: string) {
  // No token is issued here anymore — new tutor accounts are pending until
  // an admin approves them, so there's nothing to log in with yet.
  return req<{ success: boolean; pendingApproval: boolean; message: string }>(
    '/api/auth/tutor/signup',
    { method: 'POST', body: JSON.stringify({ name, email, password }) },
  );
}

export async function tutorSignin(email: string, password: string) {
  const result = await req<{ success: boolean; token: string; tutor: Tutor }>(
    '/api/auth/tutor/signin',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  );
  setToken('tutor', result.token);
  return result.tutor;
}

export async function adminSignin(email: string, password: string) {
  const result = await req<{ success: boolean; token: string; isAdmin: boolean }>(
    '/api/auth/admin/signin',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  );
  setToken('admin', result.token);
  return result;
}

export async function requestPasswordReset(email: string) {
  return req<{ success: boolean }>('/api/auth/student/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyResetCode(email: string, code: string) {
  return req<{ success: boolean; resetToken: string }>('/api/auth/student/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export async function resetPassword(resetToken: string, password: string) {
  return req<{ success: boolean }>('/api/auth/student/reset-password', {
    method: 'POST',
    body: JSON.stringify({ resetToken, password }),
  });
}

export async function tutorRequestPasswordReset(email: string) {
  return req<{ success: boolean }>('/api/auth/tutor/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function tutorVerifyResetCode(email: string, code: string) {
  return req<{ success: boolean; resetToken: string }>('/api/auth/tutor/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export async function tutorResetPassword(resetToken: string, password: string) {
  return req<{ success: boolean }>('/api/auth/tutor/reset-password', {
    method: 'POST',
    body: JSON.stringify({ resetToken, password }),
  });
}

// ============================================================
// Students
// ============================================================

export async function getMyStudentProfile() {
  return req<{ name: string; email: string; bookings: Booking[]; onHold: boolean; cancelCount: number }>('/api/students/me', {}, 'student');
}

export async function deleteMyStudentAccount() {
  const result = await req<{ success: boolean }>('/api/students/me', { method: 'DELETE' }, 'student');
  clearToken('student');
  return result;
}

// ============================================================
// Bookings
// ============================================================

export async function getMyBookings() {
  return req<Booking[]>('/api/bookings/me', {}, 'student');
}

export interface CreateBookingInput {
  subject: string;
  class: string;
  tutor: string;
  tutorEmail: string;
  date: string;
  dateISO: string;
  startTime: string;
  endTime: string;
  duration: number;
  sessionType: 'in-person' | 'online';
  // Required for in-person sessions (either one of the tutor's
  // preferredLocations, or a custom "Other" location the tutor will need to
  // approve). Ignored for online sessions — the backend fills in the Zoom
  // link from the tutor's profile instead.
  location: string;
  topics: string;
  // Optional single PDF attachment, base64-encoded client-side.
  attachment?: { filename: string; mimeType: string; data: string } | null;
}

export async function createBooking(input: CreateBookingInput) {
  const result = await req<{ success: boolean; booking: Booking }>(
    '/api/bookings',
    { method: 'POST', body: JSON.stringify(input) },
    'student',
  );
  return result.booking;
}

export async function cancelBooking(bookingId: string) {
  return req<{ success: boolean }>(`/api/bookings/${bookingId}`, { method: 'DELETE' }, 'student');
}

// Tutor confirms a pending booking request.
export async function confirmBooking(bookingId: string) {
  return req<Booking>(`/api/tutors/me/bookings/${bookingId}/confirm`, { method: 'PUT' }, 'tutor');
}

// Tutor cancels one of their own sessions.
export async function tutorCancelBooking(bookingId: string) {
  return req<{ success: boolean }>(`/api/tutors/me/bookings/${bookingId}`, { method: 'DELETE' }, 'tutor');
}

// Student edits the "topics discussed" note on their own booking.
export async function updateBookingTopics(bookingId: string, topics: string) {
  return req<Booking>(
    `/api/bookings/${bookingId}/topics`,
    { method: 'PUT', body: JSON.stringify({ topics }) },
    'student',
  );
}

// Tutor edits the "topics discussed" note on one of their own bookings.
export async function updateTutorBookingTopics(bookingId: string, topics: string) {
  return req<Booking>(
    `/api/tutors/me/bookings/${bookingId}/topics`,
    { method: 'PUT', body: JSON.stringify({ topics }) },
    'tutor',
  );
}

export interface AdminStudent {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  bookingCount: number;
  latestBooking: { class: string; date: string } | null;
  cancelCount: number;
  onHold: boolean;
  holdReason: 'admin' | 'strikes' | null;
}

export async function adminGetStudents() {
  return req<AdminStudent[]>('/api/admin/students', {}, 'admin');
}

export async function adminDeleteStudent(studentId: string) {
  return req<{ success: boolean }>(`/api/admin/students/${studentId}`, { method: 'DELETE' }, 'admin');
}

// Clears (or sets) a student's on-hold status — e.g. after they've
// messaged the tutoring chairs and the situation is resolved.
export async function adminSetStudentHold(studentId: string, onHold: boolean) {
  return req<{ success: boolean; onHold: boolean; holdReason: 'admin' | null; cancelCount: number }>(
    `/api/admin/students/${studentId}/hold`,
    { method: 'PUT', body: JSON.stringify({ onHold }) },
    'admin',
  );
}

export async function adminDeleteBooking(bookingId: string) {
  return req<{ success: boolean }>(`/api/admin/bookings/${bookingId}`, { method: 'DELETE' }, 'admin');
}

export interface TutoringReportRow {
  tutor: string;
  sessionsCompleted: number;
}

// Sessions "tutored" = the date has passed and the booking wasn't cancelled
// (cancelling deletes the record, so anything still here and in the past
// counts).
export async function adminGetTutoringReport(startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });
  return req<{ startDate: string; endDate: string; rows: TutoringReportRow[] }>(
    `/api/admin/tutoring-report?${params.toString()}`,
    {},
    'admin',
  );
}

export async function adminGetAllBookings() {
  return req<Booking[]>('/api/admin/bookings', {}, 'admin');
}

// ============================================================
// Tutors
// ============================================================

export async function getAllTutors() {
  return req<Tutor[]>('/api/tutors');
}

// Admin-only: includes tutors still awaiting approval, unlike getAllTutors().
export async function adminGetTutors() {
  return req<Tutor[]>('/api/admin/tutors', {}, 'admin');
}

export async function adminApproveTutor(tutorId: string) {
  return adminUpdateTutor(tutorId, { isApproved: true } as Partial<Tutor>);
}

export async function getTutorBookedSlots(tutorId: string) {
  return req<{ date: string; startTime: string; endTime: string }[]>(`/api/tutors/${tutorId}/booked-slots`);
}

export async function getMyTutorBookings() {
  return req<Booking[]>('/api/tutors/me/bookings', {}, 'tutor');
}

export async function getMyTutorProfile() {
  return req<Tutor>('/api/tutors/me', {}, 'tutor');
}

export async function updateMyAvailability(weeklyAvailability: WeeklyAvailability) {
  return req<Tutor>('/api/tutors/me/availability', { method: 'PUT', body: JSON.stringify({ weeklyAvailability }) }, 'tutor');
}

export async function updateMyUnavailableDates(unavailableDates: string[]) {
  return req<Tutor>('/api/tutors/me/unavailable-dates', { method: 'PUT', body: JSON.stringify({ unavailableDates }) }, 'tutor');
}

export async function updateMyClasses(classesITeach: string[]) {
  return req<Tutor>('/api/tutors/me/classes', { method: 'PUT', body: JSON.stringify({ classesITeach }) }, 'tutor');
}

// Tutor's own list of in-person locations they're willing to meet at — a mix
// of picks from the admin's master list and their own free-typed "Other"
// entries.
export async function updateMyLocations(preferredLocations: string[]) {
  return req<Tutor>(
    '/api/tutors/me/locations',
    { method: 'PUT', body: JSON.stringify({ preferredLocations }) },
    'tutor',
  );
}

// Must be the tutor's UCLA-account Zoom room link.
export async function updateMyZoomLink(zoomLink: string) {
  return req<Tutor>('/api/tutors/me/zoom', { method: 'PUT', body: JSON.stringify({ zoomLink }) }, 'tutor');
}

// Tutor puts themself on/off hold (e.g. going on vacation) — while on hold
// they're excluded from the public bookable-tutor list, but the account
// stays fully intact.
export async function setMyHoldStatus(onHold: boolean) {
  return req<Tutor>('/api/tutors/me/hold', { method: 'PUT', body: JSON.stringify({ onHold }) }, 'tutor');
}

// ============================================================
// Admin: tutors
// ============================================================

export interface CreateTutorInput {
  name: string;
  email: string;
  password: string;
  subjects: string[];
  classesITeach: string[];
}

export async function adminCreateTutor(input: CreateTutorInput) {
  return req<Tutor>('/api/admin/tutors', { method: 'POST', body: JSON.stringify(input) }, 'admin');
}

export async function adminUpdateTutor(tutorId: string, updates: Partial<Tutor>) {
  return req<Tutor>(`/api/admin/tutors/${tutorId}`, { method: 'PUT', body: JSON.stringify(updates) }, 'admin');
}

export async function adminDeleteTutor(tutorId: string) {
  return req<{ success: boolean }>(`/api/admin/tutors/${tutorId}`, { method: 'DELETE' }, 'admin');
}

// Admin manually holds/releases a tutor. Always succeeds regardless of
// whether the tutor is currently on hold themselves, on strikes, or free —
// unlike the tutor's own self-toggle, which can't release an admin/strikes hold.
export async function adminSetTutorHold(tutorId: string, onHold: boolean) {
  return req<Tutor>(
    `/api/admin/tutors/${tutorId}/hold`,
    { method: 'PUT', body: JSON.stringify({ onHold }) },
    'admin',
  );
}

// ============================================================
// Announcement (homepage banner)
// ============================================================

export async function getAnnouncement() {
  const result = await req<{ html: string }>('/api/announcement');
  return result.html;
}

export async function adminGetAnnouncement() {
  const result = await req<{ html: string }>('/api/admin/announcement', {}, 'admin');
  return result.html;
}

export async function adminSetAnnouncement(html: string) {
  return req<{ success: boolean }>('/api/admin/announcement', { method: 'PUT', body: JSON.stringify({ html }) }, 'admin');
}

// ============================================================
// Classes
// ============================================================

// Backward-compat: older data (or a subject an admin hasn't reorganized yet)
// may still map a subject straight to an array of class names instead of a
// subarea -> class names map. Fold any such subject into a single "General"
// subarea so the rest of the app never has to guard against two shapes.
export function normalizeClasses(raw: any): Classes {
  const result: Classes = {};
  if (!raw || typeof raw !== 'object') return result;
  Object.entries(raw).forEach(([subject, value]) => {
    if (Array.isArray(value)) {
      result[subject] = { General: value as string[] };
    } else if (value && typeof value === 'object') {
      result[subject] = value as { [subarea: string]: string[] };
    }
  });
  return result;
}

export async function getClasses() {
  const raw = await req<any>('/api/classes');
  return normalizeClasses(raw);
}

export async function adminSetClasses(classes: Classes) {
  const raw = await req<any>('/api/admin/classes', { method: 'PUT', body: JSON.stringify(classes) }, 'admin');
  return normalizeClasses(raw);
}

// ============================================================
// Locations (admin-managed master list, for in-person sessions)
// ============================================================

export async function getLocations() {
  return req<string[]>('/api/locations');
}

export async function adminSetLocations(locations: string[]) {
  return req<string[]>('/api/admin/locations', { method: 'PUT', body: JSON.stringify({ locations }) }, 'admin');
}

// ============================================================
// Review Sessions
// ============================================================

export async function getReviewSessions() {
  return req<ReviewSession[]>('/api/review-sessions');
}

export interface CreateReviewSessionInput {
  className: string;
  date: string;
  dateISO: string;
  time: string;
  location: string;
}

export async function adminCreateReviewSession(input: CreateReviewSessionInput) {
  return req<ReviewSession>('/api/admin/review-sessions', { method: 'POST', body: JSON.stringify(input) }, 'admin');
}

export async function adminUpdateReviewSession(id: string, updates: Partial<CreateReviewSessionInput>) {
  return req<ReviewSession>(`/api/admin/review-sessions/${id}`, { method: 'PUT', body: JSON.stringify(updates) }, 'admin');
}

export async function adminDeleteReviewSession(id: string) {
  return req<{ success: boolean }>(`/api/admin/review-sessions/${id}`, { method: 'DELETE' }, 'admin');
}

// RSVPing requires a signed-in student account — the backend derives the
// attendee's name/email from the auth token, so there's nothing to pass but
// which subject they're RSVPing for.
export async function rsvpToReviewSession(id: string, subject: string) {
  return req<ReviewSession>(`/api/review-sessions/${id}/rsvp`, {
    method: 'POST',
    body: JSON.stringify({ subject }),
  }, 'student');
}

// ============================================================
// Admin: email templates
// ============================================================

export type EmailTemplateKey =
  | 'bookingCreatedStudent'
  | 'bookingCreatedTutor'
  | 'bookingConfirmed'
  | 'bookingCancelledByStudent'
  | 'bookingCancelledByTutor'
  | 'newTutorApplication'
  | 'tutorApproved';

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateKey, string> = {
  bookingCreatedStudent: 'Booking Created — to Student',
  bookingCreatedTutor: 'Booking Created — to Tutor',
  bookingConfirmed: 'Tutor Confirmed — to Student',
  bookingCancelledByStudent: 'Cancelled by Student — to Tutor',
  bookingCancelledByTutor: 'Cancelled by Tutor — to Student',
  newTutorApplication: 'New Tutor Application — to Admin',
  tutorApproved: 'Tutor Approved — to Tutor',
};

export async function adminGetEmailTemplates() {
  return req<Record<EmailTemplateKey, string>>('/api/admin/email-templates', {}, 'admin');
}

export async function adminSetEmailTemplate(key: EmailTemplateKey, template: string) {
  return req<{ success: boolean }>(
    '/api/admin/email-templates',
    { method: 'PUT', body: JSON.stringify({ key, template }) },
    'admin',
  );
}
