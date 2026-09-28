import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Atom, TestTube, Dna, Binary, Calculator, LogIn, GraduationCap, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import SelectSubarea from '../components/SelectSubarea';
import SelectClass from '../components/SelectClass';
import SelectTutorOrTime, { type TutorWithSlots } from '../components/SelectTutorOrTime';
import SelectTime from '../components/SelectTime';
import BookingForm, { type BookingFormSubmitData } from '../components/BookingForm';
import coatOfArms from '../../imports/coat-of-arms.jpg';
import {
  getClasses,
  getAllTutors,
  getTutorBookedSlots,
  createBooking,
  getToken,
  getAnnouncement,
  normalizeClasses,
  UNGROUPED_SUBAREA,
  timeToMinutes,
  type Classes as ClassesType,
  type Tutor,
} from '../utils/api';

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
// 14 days from their weekly availability, minus their unavailable dates and
// minus their already-booked slots (fetched from the backend).
function generateTimeSlotsForTutor(
  tutor: Tutor,
  bookedSlots: { date: string; startTime: string; endTime: string }[],
): { date: string; dateISO: string; startTime: string; endTime: string; available: boolean }[] {
  const slots: { date: string; dateISO: string; startTime: string; endTime: string; available: boolean }[] = [];
  const today = new Date();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

  // Sessions can only be booked 2–7 days out (closes 2 days before the
  // session starts, and can't be booked more than 7 days in advance).
  const now = new Date();
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < 9; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayName = daysOfWeek[date.getDay()];
    const dateString = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const dateISO = date.toISOString().split('T')[0];
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

type Screen = 'home' | 'select-subarea' | 'select-class' | 'select-tutor-time' | 'select-time';

export default function Home() {
  const navigate = useNavigate();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSubarea, setSelectedSubarea] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<{
    startTime: string;
    endTime: string;
    duration: number;
    date: string;
    dateISO: string;
  } | null>(null);
  const [availableClasses, setAvailableClasses] = useState<ClassesType>(() => {
    // Hydrate instantly from the last successful fetch so returning
    // visitors don't see the subject buttons "pop in" after Review
    // Sessions — we still fetch fresh data in the background below.
    try {
      const cached = localStorage.getItem('cachedClasses');
      // Normalize in case this cache was written by an older version of the
      // app, back when a subject mapped straight to a flat class list
      // instead of subject -> subarea -> classes.
      return cached ? normalizeClasses(JSON.parse(cached)) : {};
    } catch {
      return {};
    }
  });
  const [classesLoaded, setClassesLoaded] = useState(() => {
    try {
      return !!localStorage.getItem('cachedClasses');
    } catch {
      return false;
    }
  });
  const [announcement, setAnnouncement] = useState('');
  const [classTutors, setClassTutors] = useState<Tutor[]>([]);
  const [classTutorSlots, setClassTutorSlots] = useState<TutorWithSlots[]>([]);
  const [timeSlots, setTimeSlots] = useState<{ date: string; dateISO: string; startTime: string; endTime: string; available: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getClasses()
      .then((classes) => {
        setAvailableClasses(classes);
        try {
          localStorage.setItem('cachedClasses', JSON.stringify(classes));
        } catch {
          // localStorage unavailable — not critical, just skip caching
        }
      })
      .catch(() => toast.error('Could not load subjects — please try refreshing.'))
      .finally(() => setClassesLoaded(true));
    getAnnouncement()
      .then(setAnnouncement)
      .catch(() => {}); // non-critical — just don't show a banner if it fails
  }, []);

  const handleSubjectClick = (subject: string) => {
    setSelectedSubject(subject);
    // Subareas are optional — if this subject has none set up, skip
    // straight to the class list instead of showing a pointless screen.
    const realSubareas = Object.keys(availableClasses[subject] || {}).filter((s) => s !== UNGROUPED_SUBAREA);
    if (realSubareas.length === 0) {
      setSelectedSubarea(UNGROUPED_SUBAREA);
      setCurrentScreen('select-class');
    } else {
      setSelectedSubarea('');
      setCurrentScreen('select-subarea');
    }
  };

  const handleSubareaSelect = (subarea: string) => {
    setSelectedSubarea(subarea);
    setCurrentScreen('select-class');
  };

  const handleClassSelect = async (className: string) => {
    setSelectedClass(className);
    setIsLoading(true);
    try {
      const allTutors = await getAllTutors();
      const availableTutors = allTutors.filter((t) => t.classesITeach?.includes(className));

      if (availableTutors.length === 0) {
        navigate('/no-tutors-available', { state: { className, subject: selectedSubject } });
        return;
      }

      setClassTutors(availableTutors);

      // Pre-fetch every eligible tutor's booked slots up front so the
      // "by time" view (aggregated across all of them) and the "by tutor"
      // view (one tutor's slots, reused from this same fetch) both work
      // without a second round trip.
      const withSlots = await Promise.all(
        availableTutors.map(async (tutor) => {
          try {
            const bookedSlots = await getTutorBookedSlots(tutor._id);
            return { tutor, slots: generateTimeSlotsForTutor(tutor, bookedSlots) };
          } catch {
            return { tutor, slots: [] };
          }
        }),
      );
      setClassTutorSlots(withSlots);
      setCurrentScreen('select-tutor-time');
    } catch {
      toast.error('Could not load tutors — please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // "By tutor" path: student picked a tutor directly — reuse their
  // already-fetched slots and move to the plain per-tutor time screen.
  const handleTutorSelect = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    const cached = classTutorSlots.find((ts) => ts.tutor._id === tutor._id);
    setTimeSlots(cached?.slots || []);
    setCurrentScreen('select-time');
  };

  const handleTimeConfirm = (startTime: string, endTime: string, duration: number, date: string) => {
    if (!getToken('student')) {
      toast.error('Please sign in to book a session', {
        description: 'You need to be logged in to complete your booking.',
      });
      navigate('/login/student');
      return;
    }
    const matchingSlot = timeSlots.find((s) => s.date === date && s.startTime === startTime);
    setPendingBooking({ startTime, endTime, duration, date, dateISO: matchingSlot?.dateISO || '' });
    setBookingFormOpen(true);
  };

  // "By time" path: date/time (and tutor, if there was more than one match)
  // are already resolved on the SelectTutorOrTime screen itself.
  const handleByTimeConfirm = (
    tutor: Tutor,
    startTime: string,
    endTime: string,
    duration: number,
    date: string,
    dateISO: string,
  ) => {
    if (!getToken('student')) {
      toast.error('Please sign in to book a session', {
        description: 'You need to be logged in to complete your booking.',
      });
      navigate('/login/student');
      return;
    }
    setSelectedTutor(tutor);
    setPendingBooking({ startTime, endTime, duration, date, dateISO });
    setBookingFormOpen(true);
  };

  const handleBookingSubmit = async (studentData: BookingFormSubmitData) => {
    if (!pendingBooking || !selectedTutor) return;
    try {
      await createBooking({
        subject: selectedSubject,
        class: selectedClass,
        tutor: selectedTutor.name,
        tutorEmail: selectedTutor.email,
        date: pendingBooking.date,
        dateISO: pendingBooking.dateISO,
        startTime: pendingBooking.startTime,
        endTime: pendingBooking.endTime,
        duration: pendingBooking.duration,
        sessionType: studentData.sessionType,
        location: studentData.location,
        topics: studentData.topics,
        attachment: studentData.attachment,
      });

      toast.success('Booking confirmed!', {
        description: 'Confirmation emails have been sent to you and your tutor.',
      });

      setBookingFormOpen(false);
      setPendingBooking(null);
      setCurrentScreen('home');
      setSelectedSubject('');
      setSelectedSubarea('');
      setSelectedClass('');
      setSelectedTutor(null);
      setClassTutorSlots([]);
    } catch (err: any) {
      toast.error('Could not complete booking', {
        description: err?.message || 'Please try again.',
      });
    }
  };

  const handleViewBookings = () => {
    if (getToken('student')) {
      navigate('/student');
    } else {
      navigate('/login/student');
    }
  };

  const handlePolicies = () => {
    navigate('/policies');
  };

  // Render appropriate screen
  if (currentScreen === 'select-subarea') {
    return (
      <SelectSubarea
        subject={selectedSubject}
        subareas={Object.keys(availableClasses[selectedSubject] || {}).filter((s) => s !== UNGROUPED_SUBAREA)}
        hasUngrouped={(availableClasses[selectedSubject]?.[UNGROUPED_SUBAREA]?.length || 0) > 0}
        onBack={() => setCurrentScreen('home')}
        onSelectSubarea={handleSubareaSelect}
      />
    );
  }

  if (currentScreen === 'select-class') {
    const hadSubareaScreen =
      Object.keys(availableClasses[selectedSubject] || {}).filter((s) => s !== UNGROUPED_SUBAREA).length > 0;
    return (
      <SelectClass
        subject={selectedSubarea === UNGROUPED_SUBAREA ? selectedSubject : `${selectedSubject} → ${selectedSubarea}`}
        classes={availableClasses[selectedSubject]?.[selectedSubarea] || []}
        onBack={() => setCurrentScreen(hadSubareaScreen ? 'select-subarea' : 'home')}
        onSelectClass={handleClassSelect}
      />
    );
  }

  if (currentScreen === 'select-tutor-time') {
    return (
      <>
        <SelectTutorOrTime
          tutorSlots={classTutorSlots}
          onBack={() => setCurrentScreen('select-class')}
          onSelectTutor={handleTutorSelect}
          onConfirmByTime={handleByTimeConfirm}
        />
        {/* Booking Form Modal — reachable directly from the "by time" path,
            which resolves date/time/tutor all on this same screen. */}
        {pendingBooking && selectedTutor && (
          <BookingForm
            isOpen={bookingFormOpen}
            onClose={() => {
              setBookingFormOpen(false);
              setPendingBooking(null);
            }}
            tutor={selectedTutor}
            bookingDetails={{
              subject: selectedSubject,
              className: selectedClass,
              tutor: selectedTutor.name,
              date: pendingBooking.date,
              startTime: pendingBooking.startTime,
              endTime: pendingBooking.endTime,
              duration: pendingBooking.duration,
            }}
            onSubmit={handleBookingSubmit}
          />
        )}
      </>
    );
  }

  if (currentScreen === 'select-time') {
    return (
      <>
        <SelectTime
          tutor={selectedTutor?.name || ''}
          availableSlots={timeSlots}
          onBack={() => setCurrentScreen('select-tutor-time')}
          onConfirm={handleTimeConfirm}
        />
        {/* Booking Form Modal */}
        {pendingBooking && selectedTutor && (
          <BookingForm
            isOpen={bookingFormOpen}
            onClose={() => {
              setBookingFormOpen(false);
              setPendingBooking(null);
            }}
            tutor={selectedTutor}
            bookingDetails={{
              subject: selectedSubject,
              className: selectedClass,
              tutor: selectedTutor.name,
              date: pendingBooking.date,
              startTime: pendingBooking.startTime,
              endTime: pendingBooking.endTime,
              duration: pendingBooking.duration,
            }}
            onSubmit={handleBookingSubmit}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4 relative overflow-hidden">
      {/* Background Science Motifs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top Left - Molecule */}
        <div className="absolute top-10 left-10 opacity-5">
          <Atom className="w-48 h-48 text-primary" strokeWidth={1} />
        </div>

        {/* Top Right - Test Tube */}
        <div className="absolute top-20 right-16 opacity-5">
          <TestTube className="w-32 h-32 text-secondary" strokeWidth={1} />
        </div>

        {/* Bottom Left - DNA */}
        <div className="absolute bottom-32 left-20 opacity-5">
          <Dna className="w-40 h-40 text-primary" strokeWidth={1} />
        </div>

        {/* Bottom Right - Atom */}
        <div className="absolute bottom-16 right-10 opacity-5">
          <Atom className="w-56 h-56 text-secondary" strokeWidth={1} />
        </div>

        {/* Center decorative circles */}
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-3xl"></div>
      </div>

      {/* Login Button - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          Login
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Logo */}
        <div className="mb-8 p-4 bg-white rounded-full shadow-lg">
          <img
            src={coatOfArms}
            alt="Alpha Chi Sigma"
            className="w-20 h-20 object-contain"
          />
        </div>

        {/* Welcome Header */}
        <h1 className="mb-12 text-center text-primary">
          Welcome to Alpha Chi Sigma Tutoring
        </h1>

        {/* Announcement Section */}
        {announcement && (
          <div className="w-full max-w-2xl mb-8 p-4 bg-blue-50 border-2 border-primary/20 rounded-xl shadow-sm">
            <p className="text-center whitespace-pre-line">{announcement}</p>
          </div>
        )}

        {/* Subject Buttons Grid */}
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {!classesLoaded &&
            Object.keys(availableClasses).length === 0 &&
            // First-ever visit, nothing cached yet — show skeleton
            // placeholders instead of leaving Review Sessions standing
            // alone while subjects fetch.
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`subject-skeleton-${i}`}
                className="px-8 py-6 bg-card border-2 border-border rounded-xl animate-pulse"
              >
                <div className="h-6 bg-muted rounded w-2/3 mx-auto" />
              </div>
            ))}
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
          <button
            onClick={() => navigate('/review-sessions')}
            className="group px-8 py-6 bg-card border-2 border-border rounded-xl hover:border-primary hover:shadow-lg transition-all text-lg flex items-center justify-center gap-3"
          >
            <GraduationCap className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            Review Sessions
          </button>
        </div>

        {/* View Bookings Button - Distinct Style */}
        <button
          onClick={handleViewBookings}
          className="w-full max-w-3xl px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all mb-6 text-lg shadow-md"
        >
          View Bookings
        </button>

        {/* Policies Link - Small */}
        <button
          onClick={handlePolicies}
          className="text-sm text-muted-foreground hover:text-primary underline transition-colors"
        >
          Policies
        </button>

        {/* Report a website issue - Small */}
        <p className="mt-2 text-xs text-muted-foreground">
          Report website issues to{' '}
          <a
            href="mailto:axsbg.cyberalchemist@gmail.com"
            className="underline hover:text-primary transition-colors"
          >
            axsbg.cyberalchemist@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}