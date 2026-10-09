import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  User,
  LogOut,
  Calendar,
  Clock,
  BookOpen,
  Mail,
  MapPin,
  Atom,
  TestTube,
  Dna,
  Binary,
  Calculator,
  Trash2,
  Plus,
  UserX,
  CalendarPlus,
  GraduationCap,
  Users,
  X,
  Check,
  Video,
  Paperclip,
  Pencil,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { generateBookingICS, generateReviewSessionICS, downloadICS } from '../utils/icsUtils';
import coatOfArms from '../../imports/coat-of-arms.jpg';
import SelectSubarea from '../components/SelectSubarea';
import SelectClass from '../components/SelectClass';
import SelectTutorOrTime, { type TutorWithSlots } from '../components/SelectTutorOrTime';
import SelectTime from '../components/SelectTime';
import {
  getToken,
  clearToken,
  getMyStudentProfile,
  deleteMyStudentAccount,
  createBooking,
  cancelBooking,
  updateBookingTopics,
  getClasses,
  getAllTutors,
  getTutorBookedSlots,
  applyWeeklyHourCap,
  toLocalISODate,
  pacificNow,
  getReviewSessions,
  rsvpToReviewSession,
  UNGROUPED_SUBAREA,
  timeToMinutes,
  type Booking,
  type Tutor,
  type Classes as ClassesType,
  type ReviewSession,
} from '../utils/api';

type BookingScreen = 'select-subject' | 'select-subarea' | 'select-class' | 'select-tutor-time' | 'select-time' | 'booking-form';

const SUBJECT_ICONS: Record<string, any> = {
  Chemistry: TestTube,
  Biology: Dna,
  Math: Calculator,
  Physics: Atom,
  'Computer Science': Binary,
  'Comp Sci': Binary,
};
function getSubjectIcon(name: string) {
  return SUBJECT_ICONS[name] || BookOpen;
}

// Generates open (date, startTime, endTime) slots for a tutor over the next
// 14 days from their weekly availability, minus unavailable dates and minus
// already-booked slots (fetched from the backend).
function generateTimeSlotsForTutor(
  tutor: Tutor,
  bookedSlots: { date: string; startTime: string; endTime: string }[],
): { date: string; dateISO: string; startTime: string; endTime: string; available: boolean }[] {
  const slots: { date: string; dateISO: string; startTime: string; endTime: string; available: boolean }[] = [];
  const today = pacificNow();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

  // Sessions can only be booked 2–7 days out (closes 2 days before the
  // session starts, and can't be booked more than 7 days in advance).
  const now = pacificNow();
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < 9; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayName = daysOfWeek[date.getDay()];
    const dateString = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const dateISO = toLocalISODate(date);
    if (tutor.unavailableDates?.includes(dateISO)) continue;

    const dayAvailability = tutor.weeklyAvailability?.[dayName];
    if (!dayAvailability || dayAvailability.length === 0) continue;

    dayAvailability.forEach((window) => {
      const [startHour, startMin] = window.startTime.split(':').map(Number);
      const [endHour, endMin] = window.endTime.split(':').map(Number);

      let currentHour = startHour;
      let currentMin = startMin;

      if (currentMin > 0 && currentMin < 30) {
        currentMin = 30;
      } else if (currentMin > 30) {
        currentMin = 0;
        currentHour += 1;
      }

      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const nextMin = currentMin + 30;
        const nextHour = currentHour + Math.floor(nextMin / 60);
        const adjustedNextMin = nextMin % 60;

        if (nextHour > endHour || (nextHour === endHour && adjustedNextMin > endMin)) break;

        // Skip slots outside the 2–7 day bookable window entirely, rather
        // than showing them and letting the backend reject them later.
        const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), currentHour, currentMin);
        const msUntilSlot = slotStart.getTime() - now.getTime();
        if (msUntilSlot < TWO_DAYS_MS || msUntilSlot > SEVEN_DAYS_MS) {
          currentMin = adjustedNextMin;
          currentHour = nextHour;
          continue;
        }

        const startTimeStr = `${currentHour % 12 || 12}:${currentMin.toString().padStart(2, '0')} ${currentHour >= 12 ? 'PM' : 'AM'}`;
        const endTimeStr = `${nextHour % 12 || 12}:${adjustedNextMin.toString().padStart(2, '0')} ${nextHour >= 12 ? 'PM' : 'AM'}`;

        // Compare as minutes-since-midnight, not as strings — "9:30 AM"
        // is lexicographically greater than "10:00 AM", so a plain string
        // comparison silently fails to detect a conflict whenever one side
        // has a single-digit hour and the other has a 10/11/12 hour.
        const startMinutes = timeToMinutes(startTimeStr);
        const endMinutes = timeToMinutes(endTimeStr);
        const isBooked = bookedSlots.some((booked) => {
          if (booked.date !== dateString) return false;
          const bookedStartMinutes = timeToMinutes(booked.startTime);
          const bookedEndMinutes = timeToMinutes(booked.endTime);
          return (
            (startMinutes >= bookedStartMinutes && startMinutes < bookedEndMinutes) ||
            (endMinutes > bookedStartMinutes && endMinutes <= bookedEndMinutes) ||
            (startMinutes <= bookedStartMinutes && endMinutes >= bookedEndMinutes)
          );
        });

        slots.push({ date: dateString, dateISO, startTime: startTimeStr, endTime: endTimeStr, available: !isBooked });

        currentMin = adjustedNextMin;
        currentHour = nextHour;
      }
    });
  }

  return slots;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'reviews' | 'book'>('upcoming');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentOnHold, setStudentOnHold] = useState(false);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);

  // Editing the "topics discussed" note on an existing booking
  const [editingTopicsId, setEditingTopicsId] = useState<string | null>(null);
  const [topicsDraft, setTopicsDraft] = useState('');
  const [isSavingTopics, setIsSavingTopics] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Review sessions state
  const [reviewSessions, setReviewSessions] = useState<ReviewSession[]>([]);
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [selectedReviewSessionId, setSelectedReviewSessionId] = useState<string>('');
  const [rsvpSubject, setRsvpSubject] = useState('');
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
  const [rsvpdSession, setRsvpdSession] = useState<ReviewSession | null>(null);

  // Booking flow state
  const [bookingScreen, setBookingScreen] = useState<BookingScreen>('select-subject');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSubarea, setSelectedSubarea] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [bookingTutors, setBookingTutors] = useState<Tutor[]>([]);
  const [bookingTutorSlots, setBookingTutorSlots] = useState<TutorWithSlots[]>([]);
  const [selectedBookingTutor, setSelectedBookingTutor] = useState<Tutor | null>(null);
  const [bookingTimeSlots, setBookingTimeSlots] = useState<{ date: string; dateISO: string; startTime: string; endTime: string; available: boolean }[]>([]);
  const [pendingBooking, setPendingBooking] = useState<{ startTime: string; endTime: string; duration: number; date: string; dateISO: string } | null>(null);
  const [availableClasses, setAvailableClasses] = useState<ClassesType>({});
  const [topics, setTopics] = useState('');
  const [sessionType, setSessionType] = useState<'in-person' | 'online'>('in-person');
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  const OTHER_LOCATION = '__other__';
  const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8MB, matches backend cap

  // Reads a PDF file and resolves to its base64 payload (without the
  // "data:application/pdf;base64," prefix), matching what the backend expects.
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const commaIndex = result.indexOf(',');
        resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setAttachmentFile(null);
      return;
    }
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files can be attached');
      e.target.value = '';
      setAttachmentFile(null);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error('That file is too large — attachments must be 8MB or smaller');
      e.target.value = '';
      setAttachmentFile(null);
      return;
    }
    setAttachmentFile(file);
  };

  const splitBookings = (bookings: Booking[]) => {
    const now = pacificNow();
    const currentYear = now.getFullYear();
    const upcoming: Booking[] = [];
    const past: Booking[] = [];

    bookings.forEach((booking) => {
      try {
        const dateTimeString = `${booking.date} ${currentYear} ${booking.endTime}`;
        const sessionDateTime = new Date(dateTimeString);
        if (isNaN(sessionDateTime.getTime())) {
          upcoming.push(booking);
          return;
        }
        if (sessionDateTime >= now) upcoming.push(booking);
        else past.push(booking);
      } catch {
        upcoming.push(booking);
      }
    });

    upcoming.sort((a, b) => new Date(`${a.date} ${currentYear} ${a.startTime}`).getTime() - new Date(`${b.date} ${currentYear} ${b.startTime}`).getTime());
    past.sort((a, b) => new Date(`${b.date} ${currentYear} ${b.startTime}`).getTime() - new Date(`${a.date} ${currentYear} ${a.startTime}`).getTime());

    return { upcoming, past };
  };

  useEffect(() => {
    if (!getToken('student')) {
      toast.error('Please log in as a student');
      navigate('/login/student');
      return;
    }

    (async () => {
      try {
        const profile = await getMyStudentProfile();
        setStudentName(profile.name);
        setStudentEmail(profile.email);
        setStudentOnHold(profile.onHold);
        const { upcoming, past } = splitBookings(profile.bookings || []);
        setUpcomingBookings(upcoming);
        setPastBookings(past);

        const [classes, sessions] = await Promise.all([getClasses(), getReviewSessions()]);
        setAvailableClasses(classes);
        setReviewSessions(sessions);
      } catch {
        toast.error('Your session has expired — please log in again');
        clearToken('student');
        navigate('/login/student');
      } finally {
        setIsLoaded(true);
      }
    })();
  }, [navigate]);

  const handleLogout = () => {
    clearToken('student');
    toast.success('Logged out successfully');
    navigate('/');
  };

  // ---- Review Sessions / RSVP helpers ----
  const getSessionCourses = (session: ReviewSession | undefined) =>
    session
      ? session.className.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

  const hasRsvpd = (session: ReviewSession, subject: string) => {
    return (session.attendees || []).some((a) => {
      if (typeof a === 'string') return a === studentName;
      return a.email === studentEmail && a.subject === subject;
    });
  };

  const handleRsvpClick = (sessionId: string) => {
    setSelectedReviewSessionId(sessionId);
    const session = reviewSessions.find((s) => s._id === sessionId);
    const courses = getSessionCourses(session);
    setRsvpSubject(courses.length === 1 ? courses[0] : '');
    setShowRsvpModal(true);
  };

  const handleConfirmRsvp = async () => {
    const session = reviewSessions.find((s) => s._id === selectedReviewSessionId);
    const courses = getSessionCourses(session);
    const needsSubjectChoice = courses.length > 1;

    if (needsSubjectChoice && !rsvpSubject) {
      toast.error("Please select which subject you're RSVPing for");
      return;
    }

    const finalSubject = rsvpSubject || courses[0] || '';

    setIsSubmittingRsvp(true);
    try {
      const updatedSession = await rsvpToReviewSession(selectedReviewSessionId, finalSubject);
      setReviewSessions((prev) => prev.map((s) => (s._id === selectedReviewSessionId ? updatedSession : s)));
      setRsvpdSession(updatedSession);
      setShowRsvpModal(false);
      setShowThankYouModal(true);
      setRsvpSubject('');
    } catch (err: any) {
      toast.error(err?.message || "Could not RSVP — please try again.");
    } finally {
      setIsSubmittingRsvp(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmMessage = `Are you sure you want to delete your account?\n\nThis will:\n- Delete your account permanently\n- Cancel all upcoming sessions\n- Keep your past session records for tutoring analytics\n\nThis action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    try {
      await deleteMyStudentAccount();
      toast.success('Account deleted successfully', {
        description: 'Your upcoming sessions have been cancelled.'
      });
      navigate('/');
    } catch (err: any) {
      toast.error('Could not delete account', { description: err?.message });
    }
  };

  const handleCancelSession = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this session?')) return;

    try {
      await cancelBooking(bookingId);
      setUpcomingBookings((prev) => prev.filter((b) => b._id !== bookingId));
      toast.success('Session cancelled successfully', {
        description: 'The time slot is now available again.'
      });
    } catch (err: any) {
      toast.error('Could not cancel session', { description: err?.message });
    }
  };

  const startEditingTopics = (booking: Booking) => {
    setEditingTopicsId(booking._id);
    setTopicsDraft(booking.topics || '');
  };

  const cancelEditingTopics = () => {
    setEditingTopicsId(null);
    setTopicsDraft('');
  };

  const saveEditingTopics = async (bookingId: string) => {
    setIsSavingTopics(true);
    try {
      const updated = await updateBookingTopics(bookingId, topicsDraft);
      setUpcomingBookings((prev) => prev.map((b) => (b._id === bookingId ? updated : b)));
      setPastBookings((prev) => prev.map((b) => (b._id === bookingId ? updated : b)));
      toast.success('Topics updated');
      setEditingTopicsId(null);
      setTopicsDraft('');
    } catch (err: any) {
      toast.error('Could not update topics', { description: err?.message });
    } finally {
      setIsSavingTopics(false);
    }
  };

  const handleSubjectClick = (subject: string) => {
    setSelectedSubject(subject);
    // Subareas are optional — if this subject has none set up, skip
    // straight to the class list instead of showing a pointless screen.
    const realSubareas = Object.keys(availableClasses[subject] || {}).filter((s) => s !== UNGROUPED_SUBAREA);
    if (realSubareas.length === 0) {
      setSelectedSubarea(UNGROUPED_SUBAREA);
      setBookingScreen('select-class');
    } else {
      setSelectedSubarea('');
      setBookingScreen('select-subarea');
    }
  };

  const handleSubareaSelect = (subarea: string) => {
    setSelectedSubarea(subarea);
    setBookingScreen('select-class');
  };

  const handleClassSelect = async (className: string) => {
    setSelectedClass(className);
    try {
      const allTutors = await getAllTutors();
      const available = allTutors.filter((t) => t.classesITeach?.includes(className));

      if (available.length === 0) {
        navigate('/no-tutors-available', { state: { className, subject: selectedSubject } });
        return;
      }

      // Pre-fetch every eligible tutor's booked slots up front so both the
      // "by time" (aggregated) and "by tutor" (single-tutor, reused here)
      // views work without a second round trip. A tutor who has hit their
      // weekly hour cap is dropped here, same as a tutor on hold.
      const fetched = await Promise.all(
        available.map(async (tutor) => {
          try {
            const bookedSlots = await getTutorBookedSlots(tutor._id);
            const { slots, fullByCap } = applyWeeklyHourCap(tutor, bookedSlots, generateTimeSlotsForTutor(tutor, bookedSlots));
            return { tutor, slots, fullByCap };
          } catch {
            return { tutor, slots: [], fullByCap: false };
          }
        }),
      );
      const withSlots = fetched.filter((t) => !t.fullByCap).map(({ tutor, slots }) => ({ tutor, slots }));

      if (withSlots.length === 0) {
        navigate('/no-tutors-available', { state: { className, subject: selectedSubject } });
        return;
      }

      setBookingTutors(withSlots.map((t) => t.tutor));
      setBookingTutorSlots(withSlots);
      setBookingScreen('select-tutor-time');
    } catch {
      toast.error('Could not load tutors — please try again.');
    }
  };

  // "By tutor" path: reuse the already-fetched slots for the chosen tutor.
  const handleTutorSelect = (tutor: Tutor) => {
    setSelectedBookingTutor(tutor);
    const cached = bookingTutorSlots.find((ts) => ts.tutor._id === tutor._id);
    setBookingTimeSlots(cached?.slots || []);
    setBookingScreen('select-time');
  };

  const handleTimeConfirm = (startTime: string, endTime: string, duration: number, date: string) => {
    const matchingSlot = bookingTimeSlots.find((s) => s.date === date && s.startTime === startTime);
    setPendingBooking({ startTime, endTime, duration, date, dateISO: matchingSlot?.dateISO || '' });
    setBookingScreen('booking-form');
  };

  // "By time" path: date/time (and tutor, if more than one matched) are
  // already resolved on the SelectTutorOrTime screen itself.
  const handleByTimeConfirm = (
    tutor: Tutor,
    startTime: string,
    endTime: string,
    duration: number,
    date: string,
    dateISO: string,
  ) => {
    setSelectedBookingTutor(tutor);
    setPendingBooking({ startTime, endTime, duration, date, dateISO });
    setBookingScreen('booking-form');
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topics) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!pendingBooking || !selectedBookingTutor) {
      toast.error('Booking information missing');
      return;
    }

    // A tutor with no preferred locations can still be booked in person — the
    // location is left blank and the tutor supplies it when they confirm.
    const tutorLocations = selectedBookingTutor.preferredLocations || [];
    let finalLocation = '';
    if (sessionType === 'in-person') {
      finalLocation = tutorLocations.length === 0
        ? customLocation.trim()
        : location === OTHER_LOCATION ? customLocation.trim() : location;
      if (!finalLocation && tutorLocations.length > 0) {
        toast.error('Please choose a location for your in-person session');
        return;
      }
    }

    setIsSubmittingBooking(true);
    try {
      let attachment: { filename: string; mimeType: string; data: string } | null = null;
      if (attachmentFile) {
        const data = await readFileAsBase64(attachmentFile);
        attachment = { filename: attachmentFile.name, mimeType: attachmentFile.type, data };
      }

      const booking = await createBooking({
        subject: selectedSubject,
        class: selectedClass,
        tutor: selectedBookingTutor.name,
        tutorEmail: selectedBookingTutor.email,
        date: pendingBooking.date,
        dateISO: pendingBooking.dateISO,
        startTime: pendingBooking.startTime,
        endTime: pendingBooking.endTime,
        duration: pendingBooking.duration,
        sessionType,
        location: finalLocation,
        topics,
        attachment,
      });

      setUpcomingBookings((prev) => [...prev, booking]);

      const awaitingTutorDetail =
        sessionType === 'online'
          ? !selectedBookingTutor.zoomLink && 'the Zoom link'
          : !finalLocation && 'the meeting location';
      toast.success('Booking confirmed!', {
        description: awaitingTutorDetail
          ? `Confirmation emails will be sent. ${selectedBookingTutor.name} will send you ${awaitingTutorDetail} when they confirm your session.`
          : 'Confirmation emails will be sent to you and your tutor',
      });

      // Reset booking flow
      setBookingScreen('select-subject');
      setSelectedSubject('');
      setSelectedSubarea('');
      setSelectedClass('');
      setBookingTutors([]);
      setBookingTutorSlots([]);
      setSelectedBookingTutor(null);
      setBookingTimeSlots([]);
      setTopics('');
      setSessionType('in-person');
      setLocation('');
      setCustomLocation('');
      setAttachmentFile(null);
      setPendingBooking(null);
      setActiveTab('upcoming');
    } catch (err: any) {
      toast.error('Could not complete booking', { description: err?.message });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Science Motifs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 opacity-5">
          <Atom className="w-48 h-48 text-primary" strokeWidth={1} />
        </div>
        <div className="absolute top-20 right-16 opacity-5">
          <TestTube className="w-32 h-32 text-secondary" strokeWidth={1} />
        </div>
        <div className="absolute bottom-32 left-20 opacity-5">
          <Dna className="w-40 h-40 text-primary" strokeWidth={1} />
        </div>
        <div className="absolute bottom-16 right-10 opacity-5">
          <Atom className="w-56 h-56 text-secondary" strokeWidth={1} />
        </div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-primary text-primary-foreground shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-full">
                <img
                  src={coatOfArms}
                  alt="Alpha Chi Sigma"
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6" />
                  <h1 className="text-2xl font-bold">Student Dashboard</h1>
                </div>
                <p className="text-sm opacity-90">Welcome, {studentName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteAccount}
                className="flex items-center gap-2 px-4 py-2 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-lg transition-colors"
                title="Delete Account"
              >
                <UserX className="w-4 h-4" />
                <span className="hidden sm:inline">Delete Account</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {studentOnHold && (
          <div className="mb-6 p-4 bg-destructive/10 border-2 border-destructive/40 rounded-lg flex items-start gap-3">
            <UserX className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Your account is on hold</p>
              <p className="text-sm text-muted-foreground mt-1">
                This happens after repeated session cancellations. You can still view your sessions, but you won't be able to book new ones until this is resolved. Please message the tutoring chairs to sort this out.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 bg-card rounded-lg p-2 shadow-md">
          <button
            onClick={() => {
              setActiveTab('upcoming');
              setBookingScreen('select-subject');
            }}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'upcoming'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'hover:bg-accent'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="hidden sm:inline">Upcoming Sessions</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('past');
              setBookingScreen('select-subject');
            }}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'past'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'hover:bg-accent'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="hidden sm:inline">Past Sessions</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('reviews');
              setBookingScreen('select-subject');
            }}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'reviews'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'hover:bg-accent'
            }`}
          >
            <GraduationCap className="w-5 h-5" />
            <span className="hidden sm:inline">Review Sessions</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('book');
              setBookingScreen('select-subject');
            }}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'book'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'hover:bg-accent'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Book a Session</span>
          </button>
        </div>

        {/* Upcoming Sessions Tab */}
        {activeTab === 'upcoming' && (
          <div className="space-y-6">
            <h2>My Upcoming Sessions</h2>

            <div className="grid gap-4">
              {upcomingBookings.length === 0 ? (
                <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-border">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No upcoming sessions.</p>
                  <button
                    onClick={() => setActiveTab('book')}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
                  >
                    Book a Session
                  </button>
                </div>
              ) : (
                upcomingBookings.map((booking) => (
                  <div
                    key={booking._id}
                    className="bg-card rounded-lg p-6 shadow-md border-2 border-primary/20 hover:border-primary/50 transition-all"
                  >
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <h3 className="font-semibold text-lg text-primary">
                            {booking.class}
                          </h3>
                          {booking.confirmed ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              <Check className="w-3 h-3" /> Confirmed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                              Pending Tutor Confirmation
                            </span>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Tutor:</strong> {booking.tutor}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <a
                              href={`mailto:${booking.tutorEmail}`}
                              className="text-primary hover:underline"
                            >
                              {booking.tutorEmail}
                            </a>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Date:</strong> {booking.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Time:</strong> {booking.startTime} - {booking.endTime}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Duration:</strong> {formatDuration(booking.duration)}</span>
                          </div>
                          {booking.sessionType === 'online' ? (
                            <div className="flex items-start gap-2">
                              <Video className="w-4 h-4 text-muted-foreground mt-0.5" />
                              {booking.zoomLink ? (
                                <span>
                                  <strong>Zoom:</strong>{' '}
                                  <a
                                    href={booking.zoomLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {booking.zoomLink}
                                  </a>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Zoom link will appear here once the tutor confirms
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span>
                                <strong>Location:</strong>{' '}
                                {booking.location || (
                                  <span className="text-muted-foreground">
                                    The tutor will send the location once they confirm
                                  </span>
                                )}
                              </span>
                              {booking.location && !booking.locationApproved && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                  Pending tutor approval
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      {editingTopicsId === booking._id ? (
                        <div className="mb-3">
                          <label className="block mb-1.5 text-sm font-medium">Topics</label>
                          <textarea
                            value={topicsDraft}
                            onChange={(e) => setTopicsDraft(e.target.value)}
                            className="w-full px-3 py-2 bg-input-background border border-border rounded-md min-h-[80px] text-sm"
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => saveEditingTopics(booking._id)}
                              disabled={isSavingTopics}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:shadow-md transition-all disabled:opacity-50"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {isSavingTopics ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEditingTopics}
                              className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm mb-3 flex items-start gap-2">
                          <span><strong>Topics:</strong> {booking.topics}</span>
                          <button
                            onClick={() => startEditingTopics(booking)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Edit topics"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </p>
                      )}
                      {booking.attachmentName && booking.attachmentData && (
                        <a
                          href={`data:${booking.attachmentType || 'application/pdf'};base64,${booking.attachmentData}`}
                          download={booking.attachmentName}
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline mb-3 w-fit"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          {booking.attachmentName}
                        </a>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            const ics = generateBookingICS(booking);
                            if (ics) {
                              downloadICS(`tutoring-${booking.class.replace(/\s+/g, '-')}.ics`, ics);
                            } else {
                              toast.error('Could not generate calendar file');
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors text-sm"
                        >
                          <CalendarPlus className="w-4 h-4" />
                          Add to Calendar
                        </button>
                        <button
                          onClick={() => handleCancelSession(booking._id)}
                          className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-destructive text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Past Sessions Tab */}
        {activeTab === 'past' && (
          <div className="space-y-6">
            <h2>Past Sessions</h2>

            <div className="grid gap-4">
              {pastBookings.length === 0 ? (
                <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-border">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No past sessions yet.</p>
                </div>
              ) : (
                pastBookings.map((booking) => (
                  <div
                    key={booking._id}
                    className="bg-card rounded-lg p-6 shadow-md border-2 border-border opacity-75"
                  >
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-3 text-primary">
                          {booking.class}
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Tutor:</strong> {booking.tutor}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{booking.tutorEmail}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Date:</strong> {booking.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Time:</strong> {booking.startTime} - {booking.endTime}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Duration:</strong> {formatDuration(booking.duration)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {booking.sessionType === 'online' ? <Video className="w-4 h-4 text-muted-foreground" /> : <MapPin className="w-4 h-4 text-muted-foreground" />}
                            <span><strong>{booking.sessionType === 'online' ? 'Session:' : 'Location:'}</strong> {booking.sessionType === 'online' ? 'Online (Zoom)' : booking.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      {editingTopicsId === booking._id ? (
                        <div className="mb-1">
                          <label className="block mb-1.5 text-sm font-medium">Topics Discussed</label>
                          <textarea
                            value={topicsDraft}
                            onChange={(e) => setTopicsDraft(e.target.value)}
                            className="w-full px-3 py-2 bg-input-background border border-border rounded-md min-h-[80px] text-sm"
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => saveEditingTopics(booking._id)}
                              disabled={isSavingTopics}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:shadow-md transition-all disabled:opacity-50"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {isSavingTopics ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEditingTopics}
                              className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm flex items-start gap-2">
                          <span><strong>Topics Discussed:</strong> {booking.topics}</span>
                          <button
                            onClick={() => startEditingTopics(booking)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Edit topics"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </p>
                      )}
                      {booking.attachmentName && booking.attachmentData && (
                        <a
                          href={`data:${booking.attachmentType || 'application/pdf'};base64,${booking.attachmentData}`}
                          download={booking.attachmentName}
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-2 w-fit"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          {booking.attachmentName}
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Review Sessions Tab */}
        {activeTab === 'reviews' && (() => {
          const isPast = (session: ReviewSession) => {
            try {
              let dateBase: Date | null = null;
              if (session.dateISO) {
                const [y, m, d] = session.dateISO.split('-').map(Number);
                dateBase = new Date(y, m - 1, d);
              } else {
                const cleaned = session.date.replace(/^[^,]+,\s*/, '');
                const currentYear = pacificNow().getFullYear();
                for (const year of [currentYear, currentYear + 1]) {
                  const d = new Date(`${cleaned} ${year}`);
                  if (!isNaN(d.getTime())) { dateBase = d; break; }
                }
              }
              if (!dateBase) return false;
              const endTimeStr = session.time.split(' - ')[1] || session.time.split(' - ')[0];
              const match = (endTimeStr || '').trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
              if (match) {
                let hour = parseInt(match[1]);
                const minute = parseInt(match[2]);
                const period = match[3].toUpperCase();
                if (period === 'AM' && hour === 12) hour = 0;
                if (period === 'PM' && hour !== 12) hour += 12;
                dateBase.setHours(hour, minute, 0, 0);
              }
              return dateBase < pacificNow();
            } catch {
              return false;
            }
          };

          const upcomingReviewSessions = reviewSessions.filter((s) => !isPast(s));

          return (
            <div className="space-y-6">
              <h2>Upcoming Review Sessions</h2>

              <div className="grid gap-4">
                {upcomingReviewSessions.length === 0 ? (
                  <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-border">
                    <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      No upcoming review sessions. Check back soon!
                    </p>
                  </div>
                ) : (
                  upcomingReviewSessions.map((session) => {
                    const courses = getSessionCourses(session);
                    const rsvpdSubjects = courses.filter((c) => hasRsvpd(session, c));
                    const fullyRsvpd = courses.length > 0 && rsvpdSubjects.length === courses.length;

                    return (
                      <div
                        key={session._id}
                        className="bg-card rounded-lg p-6 shadow-md border-2 border-primary/20 hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-lg">
                            <GraduationCap className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-primary mb-3">
                              {session.className}
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span><strong>Date:</strong> {session.date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span><strong>Time:</strong> {session.time}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span><strong>Location:</strong> {session.location}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {session.attendees?.length || 0} RSVP{(session.attendees?.length || 0) !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between flex-wrap gap-2">
                              {rsvpdSubjects.length > 0 && (
                                <span className="text-sm text-green-700 flex items-center gap-1.5">
                                  <Check className="w-4 h-4" />
                                  RSVP'd for {rsvpdSubjects.join(', ')}
                                </span>
                              )}
                              <button
                                onClick={() => handleRsvpClick(session._id)}
                                disabled={fullyRsvpd}
                                className={`ml-auto px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                  fullyRsvpd
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                    : 'bg-primary text-primary-foreground hover:shadow-lg'
                                }`}
                              >
                                {fullyRsvpd ? "RSVP'd" : courses.length > 1 ? 'RSVP for a subject' : 'RSVP'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

        {/* RSVP Modal */}
        {showRsvpModal && (() => {
          const session = reviewSessions.find((s) => s._id === selectedReviewSessionId);
          if (!session) return null;
          const courses = getSessionCourses(session).filter((c) => !hasRsvpd(session, c));

          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card rounded-xl max-w-md w-full p-6 relative">
                <button
                  onClick={() => {
                    setShowRsvpModal(false);
                    setRsvpSubject('');
                  }}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="mb-6">RSVP for Review Session</h2>

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    RSVPing as <strong className="text-foreground">{studentName}</strong>
                  </p>

                  {courses.length > 1 ? (
                    <div>
                      <label htmlFor="rsvpSubject" className="block mb-1.5 text-sm">
                        Which subject are you RSVPing for? <span className="text-destructive">*</span>
                      </label>
                      <select
                        id="rsvpSubject"
                        value={rsvpSubject}
                        onChange={(e) => setRsvpSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                      >
                        <option value="">Select a subject...</option>
                        {courses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  ) : courses.length === 1 ? (
                    <p className="text-sm text-muted-foreground">
                      Subject: <strong className="text-foreground">{courses[0]}</strong>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You've already RSVP'd for every subject in this session.
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowRsvpModal(false);
                        setRsvpSubject('');
                      }}
                      className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmRsvp}
                      disabled={courses.length === 0}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirm RSVP
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Thank You Modal */}
        {showThankYouModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl max-w-md w-full p-6 relative text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>

              <h2 className="mb-2">Thank You for RSVP-ing!</h2>
              <p className="text-muted-foreground mb-4">
                We look forward to seeing you at the review session!
              </p>

              {rsvpdSession && (
                <button
                  onClick={() => {
                    const ics = generateReviewSessionICS(rsvpdSession);
                    if (ics) {
                      downloadICS(`review-session-${rsvpdSession.className.replace(/\s+/g, '-')}.ics`, ics);
                    } else {
                      toast.error('Could not generate calendar file');
                    }
                  }}
                  className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary/10 transition-all font-medium"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Add to Calendar (.ics)
                </button>
              )}

              <button
                onClick={() => setShowThankYouModal(false)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Book a Session Tab */}
        {activeTab === 'book' && (
          <div className="space-y-6">
            {studentOnHold ? (
              <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-destructive/40">
                <UserX className="w-12 h-12 text-destructive mx-auto mb-3" />
                <p className="font-semibold text-destructive mb-1">Booking is unavailable</p>
                <p className="text-muted-foreground">
                  Your account is on hold due to repeated cancellations. Please message the tutoring chairs to resolve this before booking again.
                </p>
              </div>
            ) : (
              <>
            {bookingScreen === 'select-subject' && (
              <>
                <h2>Select a Subject</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(availableClasses).map((name) => {
                    const Icon = getSubjectIcon(name);
                    return (
                      <button
                        key={name}
                        onClick={() => handleSubjectClick(name)}
                        className="group px-8 py-6 bg-card border-2 border-border rounded-xl hover:border-primary hover:shadow-lg transition-all text-lg flex items-center justify-center gap-3"
                      >
                        <Icon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                        {name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {bookingScreen === 'select-subarea' && (
              <SelectSubarea
                subject={selectedSubject}
                subareas={Object.keys(availableClasses[selectedSubject] || {}).filter((s) => s !== UNGROUPED_SUBAREA)}
                hasUngrouped={(availableClasses[selectedSubject]?.[UNGROUPED_SUBAREA]?.length || 0) > 0}
                onBack={() => setBookingScreen('select-subject')}
                onSelectSubarea={handleSubareaSelect}
              />
            )}

            {bookingScreen === 'select-class' && (
              <SelectClass
                subject={selectedSubarea === UNGROUPED_SUBAREA ? selectedSubject : `${selectedSubject} → ${selectedSubarea}`}
                classes={availableClasses[selectedSubject]?.[selectedSubarea] || []}
                onBack={() =>
                  setBookingScreen(
                    Object.keys(availableClasses[selectedSubject] || {}).filter((s) => s !== UNGROUPED_SUBAREA).length > 0
                      ? 'select-subarea'
                      : 'select-subject',
                  )
                }
                onSelectClass={handleClassSelect}
              />
            )}

            {bookingScreen === 'select-tutor-time' && (
              <SelectTutorOrTime
                tutorSlots={bookingTutorSlots}
                onBack={() => setBookingScreen('select-class')}
                onSelectTutor={handleTutorSelect}
                onConfirmByTime={handleByTimeConfirm}
              />
            )}

            {bookingScreen === 'select-time' && (
              <SelectTime
                tutor={selectedBookingTutor?.name || ''}
                availableSlots={bookingTimeSlots}
                onBack={() => setBookingScreen('select-tutor-time')}
                onConfirm={handleTimeConfirm}
              />
            )}

            {bookingScreen === 'booking-form' && pendingBooking && (
              <div className="max-w-2xl mx-auto">
                <h2 className="mb-6">Complete Your Booking</h2>

                {/* Booking Summary */}
                <div className="bg-blue-50 border-2 border-primary/20 rounded-lg p-4 mb-6">
                  <p className="text-sm">
                    <strong>Class:</strong> {selectedClass}
                  </p>
                  <p className="text-sm">
                    <strong>Tutor:</strong> {selectedBookingTutor?.name}
                  </p>
                  <p className="text-sm">
                    <strong>When:</strong> {pendingBooking.date} from {pendingBooking.startTime} to {pendingBooking.endTime}
                  </p>
                  <p className="text-sm">
                    <strong>Duration:</strong> {formatDuration(pendingBooking.duration)}
                  </p>
                </div>

                <form onSubmit={handleBookingSubmit} className="space-y-4 bg-card rounded-xl p-6 shadow-md border-2 border-border">
                  <div>
                    <label htmlFor="topics" className="block mb-1.5 text-sm">
                      Topics to Cover <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      id="topics"
                      value={topics}
                      onChange={(e) => setTopics(e.target.value)}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-md min-h-[100px]"
                      placeholder="e.g., Chemical bonding, stoichiometry problems, exam review..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm">
                      Session Type <span className="text-destructive">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSessionType('in-person')}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          sessionType === 'in-person'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        In Person
                      </button>
                      <button
                        type="button"
                        onClick={() => setSessionType('online')}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          sessionType === 'online'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        Virtual (Zoom)
                      </button>
                    </div>
                    {sessionType === 'online' && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {selectedBookingTutor?.zoomLink
                          ? 'The Zoom link will be sent to you once the tutor confirms the session.'
                          : "This tutor hasn't set up a Zoom link yet — they'll send you the Zoom link when they confirm the session."}
                      </p>
                    )}
                  </div>

                  {sessionType === 'in-person' && (
                    <div>
                      <label htmlFor="location" className="block mb-1.5 text-sm">
                        Location {(selectedBookingTutor?.preferredLocations || []).length > 0 && <span className="text-destructive">*</span>}
                      </label>
                      {(selectedBookingTutor?.preferredLocations || []).length > 0 ? (
                        <select
                          id="location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
                          required
                        >
                          <option value="">-- Choose a location --</option>
                          {(selectedBookingTutor?.preferredLocations || []).map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                          <option value={OTHER_LOCATION}>Other...</option>
                        </select>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-2">
                          This tutor hasn't set preferred locations yet — they'll send you the meeting location when they
                          confirm the session. You can also suggest one below (optional).
                        </p>
                      )}
                      {((selectedBookingTutor?.preferredLocations || []).length === 0 || location === OTHER_LOCATION) && (
                        <div className={(selectedBookingTutor?.preferredLocations || []).length > 0 ? 'mt-2' : ''}>
                          <input
                            type="text"
                            value={customLocation}
                            onChange={(e) => setCustomLocation(e.target.value)}
                            placeholder="Suggest a location (e.g. Powell Library)"
                            className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            A suggested location needs the tutor's approval — they'll confirm it when they accept the session.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label htmlFor="attachment" className="block mb-1.5 text-sm">
                      Attach a PDF (Optional)
                    </label>
                    <input
                      id="attachment"
                      type="file"
                      accept="application/pdf"
                      onChange={handleAttachmentChange}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-md file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer hover:file:opacity-90"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      e.g. a problem set you'd like to work on. PDF only, up to 8MB.
                    </p>
                  </div>

                  {((sessionType === 'online' && !selectedBookingTutor?.zoomLink) ||
                    (sessionType === 'in-person' && (selectedBookingTutor?.preferredLocations || []).length === 0)) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                      {sessionType === 'online'
                        ? `${selectedBookingTutor?.name} will send you the Zoom link when they confirm your session.`
                        : `${selectedBookingTutor?.name} will send you the meeting location when they confirm your session.`}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setBookingScreen('select-time')}
                      className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingBooking}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmittingBooking ? 'Booking...' : 'Confirm Booking'}
                    </button>
                  </div>
                </form>
              </div>
            )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
