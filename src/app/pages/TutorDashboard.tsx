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
  Plus,
  Trash2,
  Save,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
  UserX,
  Check,
  Video,
  Paperclip,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import coatOfArms from '../../imports/coat-of-arms.jpg';
import { Slider } from '../components/ui/slider';
import {
  getToken,
  clearToken,
  getMyTutorProfile,
  getMyTutorBookings,
  confirmBooking,
  tutorCancelBooking,
  updateMyAvailability,
  updateMyUnavailableDates,
  updateMyClasses,
  updateMyLocations,
  updateMyZoomLink,
  updateMyMaxHours,
  formatISODate,
  pacificNow,
  updateTutorBookingTopics,
  setMyHoldStatus,
  getClasses,
  getLocations,
  UNGROUPED_SUBAREA,
  type Tutor,
  type WeeklyAvailability,
  type Booking,
  type Classes as ClassesType,
} from '../utils/api';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const SESSIONS_PAGE_SIZE = 6;

// Splits a tutor's bookings into upcoming vs. past based on the session's
// end time, and sorts each (soonest-first for upcoming, most-recent-first
// for past) — mirrors StudentDashboard's splitBookings for consistency.
function splitTutorBookings(bookings: Booking[]): { upcoming: Booking[]; past: Booking[] } {
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
}

export default function TutorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'availability' | 'classes' | 'sessions' | 'profile'>('sessions');
  const [currentTutor, setCurrentTutor] = useState<Tutor | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassesType>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Profile tab state (in-person locations + Zoom link)
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [newCustomLocation, setNewCustomLocation] = useState('');
  const [zoomLinkDraft, setZoomLinkDraft] = useState('');
  const [isSavingZoomLink, setIsSavingZoomLink] = useState(false);
  // Weekly tutoring-hours cap (1-10, half-hour steps); the draft follows the
  // slider while dragging and is only sent to the server on release.
  const [maxHoursDraft, setMaxHoursDraft] = useState(10);

  // Zoom link / location the tutor types in when confirming a session that
  // doesn't have one yet, keyed by booking id.
  const [confirmDrafts, setConfirmDrafts] = useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Editing the "topics to cover" note on an existing booking
  const [editingTopicsId, setEditingTopicsId] = useState<string | null>(null);
  const [topicsDraft, setTopicsDraft] = useState('');
  const [isSavingTopics, setIsSavingTopics] = useState(false);

  // My Sessions tab: upcoming/past sub-view + pagination
  const [sessionsView, setSessionsView] = useState<'upcoming' | 'past'>('upcoming');
  const [sessionsPage, setSessionsPage] = useState(1);

  // Availability state
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newUnavailableDate, setNewUnavailableDate] = useState('');

  // Classes state
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSubarea, setSelectedSubarea] = useState<string>('');
  const [selectedClassToAdd, setSelectedClassToAdd] = useState<string>('');

  // Week navigation state
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0); // 0 = this week, 1 = next week, -1 = last week

  useEffect(() => {
    if (!getToken('tutor')) {
      toast.error('Please log in as a tutor');
      navigate('/login/tutor');
      return;
    }

    (async () => {
      try {
        const [tutor, bookings, classes, locations] = await Promise.all([
          getMyTutorProfile(),
          getMyTutorBookings(),
          getClasses(),
          getLocations().catch(() => [] as string[]),
        ]);
        setCurrentTutor(tutor);
        setMyBookings(bookings);
        setAvailableClasses(classes);
        setAvailableLocations(locations);
        setZoomLinkDraft(tutor.zoomLink || '');
        setMaxHoursDraft(tutor.maxHoursPerWeek ?? 10);
      } catch {
        toast.error('Your session has expired — please log in again');
        clearToken('tutor');
        navigate('/login/tutor');
      } finally {
        setIsLoaded(true);
      }
    })();
  }, [navigate]);

  const handleLogout = () => {
    clearToken('tutor');
    toast.success('Logged out successfully');
    navigate('/');
  };

  // A booking made before the tutor had a Zoom link (online) or a meeting
  // location (in person) set has none yet — the tutor has to type one in to
  // confirm it. For Zoom, a link already saved on the tutor's profile counts.
  const missingConfirmDetail = (booking: Booking): 'zoom' | 'location' | null => {
    if (booking.sessionType === 'online') {
      return booking.zoomLink || currentTutor?.zoomLink ? null : 'zoom';
    }
    return booking.location?.trim() ? null : 'location';
  };

  const handleConfirmBooking = async (booking: Booking) => {
    const missing = missingConfirmDetail(booking);
    const typed = (confirmDrafts[booking._id] || '').trim();
    if (missing && !typed) {
      toast.error(missing === 'zoom' ? 'Enter your Zoom link to confirm this session' : 'Enter the meeting location to confirm this session');
      return;
    }
    setConfirmingId(booking._id);
    try {
      const updated = await confirmBooking(
        booking._id,
        missing === 'zoom' ? { zoomLink: typed } : missing === 'location' ? { location: typed } : {},
      );
      setMyBookings((prev) => prev.map((b) => (b._id === booking._id ? updated : b)));
      setConfirmDrafts((prev) => {
        const { [booking._id]: _removed, ...rest } = prev;
        return rest;
      });
      toast.success('Session confirmed — the student has been notified');
    } catch (err: any) {
      toast.error('Could not confirm session', { description: err?.message });
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this session? Repeated cancellations may put your account on hold.')) return;
    try {
      await tutorCancelBooking(bookingId);
      setMyBookings((prev) => prev.filter((b) => b._id !== bookingId));
      toast.success('Session cancelled — the student has been notified');
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
      const updated = await updateTutorBookingTopics(bookingId, topicsDraft);
      setMyBookings((prev) => prev.map((b) => (b._id === bookingId ? updated : b)));
      toast.success('Topics updated');
      setEditingTopicsId(null);
      setTopicsDraft('');
    } catch (err: any) {
      toast.error('Could not update topics', { description: err?.message });
    } finally {
      setIsSavingTopics(false);
    }
  };

  const saveAvailability = async (weeklyAvailability: WeeklyAvailability) => {
    try {
      const updated = await updateMyAvailability(weeklyAvailability);
      setCurrentTutor(updated);
    } catch (err: any) {
      toast.error('Could not save availability', { description: err?.message });
    }
  };

  const saveUnavailableDates = async (unavailableDates: string[]) => {
    try {
      const updated = await updateMyUnavailableDates(unavailableDates);
      setCurrentTutor(updated);
    } catch (err: any) {
      toast.error('Could not save date', { description: err?.message });
    }
  };

  const saveClasses = async (classesITeach: string[]) => {
    try {
      const updated = await updateMyClasses(classesITeach);
      setCurrentTutor(updated);
    } catch (err: any) {
      toast.error('Could not save classes', { description: err?.message });
    }
  };

  const roundToHalfHour = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    let roundedMinutes = 0;
    if (minutes >= 45) {
      return `${(hours + 1).toString().padStart(2, '0')}:00`;
    } else if (minutes >= 15) {
      roundedMinutes = 30;
    }
    return `${hours.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
  };

  const handleAddTimeSlot = () => {
    if (!currentTutor || !selectedDay) return;

    if (newStartTime >= newEndTime) {
      toast.error('End time must be after start time');
      return;
    }

    const roundedStartTime = roundToHalfHour(newStartTime);
    const roundedEndTime = roundToHalfHour(newEndTime);

    if (roundedStartTime >= roundedEndTime) {
      toast.error('End time must be after start time');
      return;
    }

    const dayKey = selectedDay as keyof WeeklyAvailability;
    const updatedAvailability: WeeklyAvailability = {
      ...currentTutor.weeklyAvailability,
      [dayKey]: [...(currentTutor.weeklyAvailability[dayKey] || []), { startTime: roundedStartTime, endTime: roundedEndTime }],
    };

    saveAvailability(updatedAvailability);
    toast.success(`Time slot added: ${roundedStartTime} - ${roundedEndTime}`);
  };

  const handleRemoveTimeSlot = (day: string, index: number) => {
    if (!currentTutor) return;

    const dayKey = day as keyof WeeklyAvailability;
    const updatedDaySlots = [...(currentTutor.weeklyAvailability[dayKey] || [])];
    updatedDaySlots.splice(index, 1);

    const updatedAvailability: WeeklyAvailability = {
      ...currentTutor.weeklyAvailability,
      [dayKey]: updatedDaySlots,
    };

    saveAvailability(updatedAvailability);
    toast.success('Time slot removed');
  };

  const handleAddUnavailableDate = () => {
    if (!currentTutor || !newUnavailableDate) return;

    if (currentTutor.unavailableDates?.includes(newUnavailableDate)) {
      toast.error('This date is already marked as unavailable');
      return;
    }

    saveUnavailableDates([...(currentTutor.unavailableDates || []), newUnavailableDate]);
    setNewUnavailableDate('');
    toast.success('Unavailable date added');
  };

  const handleRemoveUnavailableDate = (date: string) => {
    if (!currentTutor) return;
    saveUnavailableDates((currentTutor.unavailableDates || []).filter((d) => d !== date));
    toast.success('Date removed');
  };

  // Classes tab: subject -> subarea -> class names. A subarea is optional —
  // classes filed directly under a subject live under UNGROUPED_SUBAREA and
  // are offered as a "No subarea" choice instead of a named subarea button.
  const subareasForSelectedSubject = selectedSubject
    ? Object.keys(availableClasses[selectedSubject] || {}).filter((s) => s !== UNGROUPED_SUBAREA)
    : [];
  const hasUngroupedForSelectedSubject =
    !!selectedSubject && (availableClasses[selectedSubject]?.[UNGROUPED_SUBAREA]?.length || 0) > 0;

  const handleAddClass = () => {
    if (!currentTutor || !selectedClassToAdd) return;

    if (currentTutor.classesITeach?.includes(selectedClassToAdd)) {
      toast.error('You are already tutoring this class');
      return;
    }

    saveClasses([...(currentTutor.classesITeach || []), selectedClassToAdd]);
    setSelectedClassToAdd('');
    toast.success('Class added to your tutoring list');
  };

  const handleRemoveClass = (className: string) => {
    if (!currentTutor) return;
    saveClasses((currentTutor.classesITeach || []).filter((c) => c !== className));
    toast.success('Class removed');
  };

  // ---- Profile tab: locations & Zoom link ----
  const saveLocations = async (preferredLocations: string[]) => {
    try {
      const updated = await updateMyLocations(preferredLocations);
      setCurrentTutor(updated);
    } catch (err: any) {
      toast.error('Could not save locations', { description: err?.message });
    }
  };

  const handleToggleLocation = (location: string) => {
    if (!currentTutor) return;
    const current = currentTutor.preferredLocations || [];
    const updated = current.includes(location)
      ? current.filter((l) => l !== location)
      : [...current, location];
    saveLocations(updated);
  };

  const handleAddCustomLocation = () => {
    if (!currentTutor) return;
    const name = newCustomLocation.trim();
    if (!name) return;
    const current = currentTutor.preferredLocations || [];
    if (current.includes(name)) {
      toast.error('That location is already on your list');
      return;
    }
    saveLocations([...current, name]);
    setNewCustomLocation('');
    toast.success('Location added');
  };

  const handleRemoveCustomLocation = (location: string) => {
    if (!currentTutor) return;
    saveLocations((currentTutor.preferredLocations || []).filter((l) => l !== location));
  };

  const handleSaveZoomLink = async () => {
    setIsSavingZoomLink(true);
    try {
      const updated = await updateMyZoomLink(zoomLinkDraft.trim());
      setCurrentTutor(updated);
      setZoomLinkDraft(updated.zoomLink || '');
      toast.success('Zoom link saved');
    } catch (err: any) {
      toast.error('Could not save Zoom link', { description: err?.message });
    } finally {
      setIsSavingZoomLink(false);
    }
  };

  const handleSaveMaxHours = async (hours: number) => {
    try {
      const updated = await updateMyMaxHours(hours);
      setCurrentTutor(updated);
      setMaxHoursDraft(updated.maxHoursPerWeek ?? hours);
      toast.success('Weekly hour limit saved');
    } catch (err: any) {
      toast.error('Could not save weekly hour limit', { description: err?.message });
      setMaxHoursDraft(currentTutor?.maxHoursPerWeek ?? 10);
    }
  };

  const handleToggleHold = async () => {
    if (!currentTutor) return;
    try {
      const updated = await setMyHoldStatus(!currentTutor.onHold);
      setCurrentTutor(updated);
      toast.success(
        updated.onHold
          ? "You're now on hold — you won't show up as bookable until you turn this off"
          : "You're active again — students can book you"
      );
    } catch (err: any) {
      toast.error('Could not update hold status', { description: err?.message });
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  // Get the dates for the current week being viewed
  const getWeekDates = (weekOffset: number) => {
    const today = pacificNow();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = currentDay === 0 ? -6 : 1 - currentDay; // Get to Monday

    const monday = new Date(today);
    monday.setDate(today.getDate() + diff + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);

    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date);
    }

    return weekDates;
  };

  const weekDates = getWeekDates(currentWeekOffset);

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  if (!isLoaded || !currentTutor) {
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
                  <h1 className="text-2xl font-bold">Tutor Dashboard</h1>
                </div>
                <p className="text-sm opacity-90">Welcome, {currentTutor.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentTutor.onHold && currentTutor.holdReason && currentTutor.holdReason !== 'self' ? (
                <span
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 text-amber-800 cursor-default"
                  title="Only an admin can release this hold — message the tutoring chairs"
                >
                  {currentTutor.holdReason === 'strikes'
                    ? 'On Hold — 3 cancellations, contact an admin'
                    : 'On Hold — set by an admin'}
                </span>
              ) : (
                <button
                  onClick={handleToggleHold}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentTutor.onHold
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  {currentTutor.onHold ? 'On Hold — Click to Reactivate' : 'Put Myself On Hold'}
                </button>
              )}
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
        {currentTutor.onHold && (
          <div className="mb-6 p-4 bg-destructive/10 border-2 border-destructive/40 rounded-lg flex items-start gap-3">
            <UserX className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Your account is on hold</p>
              <p className="text-sm text-muted-foreground mt-1">
                {currentTutor.holdReason === 'strikes'
                  ? 'This happens automatically after 3 cancelled sessions — only an admin can release it.'
                  : currentTutor.holdReason === 'admin'
                  ? 'An admin put your account on hold — only an admin can release it.'
                  : 'You put yourself on hold.'}{' '}
                You're no longer bookable by students until this is resolved.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 bg-card rounded-lg p-2 shadow-md">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'sessions'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'hover:bg-accent'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">My Sessions</span>
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'availability'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'hover:bg-accent'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="hidden sm:inline">Set Availability</span>
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'classes'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'hover:bg-accent'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="hidden sm:inline">Set Classes</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'profile'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'hover:bg-accent'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span className="hidden sm:inline">Locations &amp; Zoom</span>
          </button>
        </div>

        {/* Availability Tab */}
        {activeTab === 'availability' && (
          <div className="space-y-6">
            <h2>Set Your Weekly Availability</h2>

            {/* Day Selection */}
            <div className="bg-card rounded-lg p-6 shadow-md border-2 border-border">
              <h3 className="font-semibold mb-4">Select Day</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                      selectedDay === day
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Add Time Slot */}
              <div className="space-y-4">
                <h4 className="font-medium">Add Time Slot for {selectedDay}</h4>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1.5 text-sm">Start Time</label>
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      step="1800"
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm">End Time</label>
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      step="1800"
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddTimeSlot}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add Slot
                    </button>
                  </div>
                </div>

                {/* Current Time Slots for Selected Day */}
                {currentTutor.weeklyAvailability && currentTutor.weeklyAvailability[selectedDay as keyof typeof currentTutor.weeklyAvailability].length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2">Current Slots for {selectedDay}</h5>
                    <div className="space-y-2">
                      {currentTutor.weeklyAvailability[selectedDay as keyof typeof currentTutor.weeklyAvailability].map((slot, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-accent/50 px-4 py-2 rounded-lg"
                        >
                          <span className="text-sm">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <button
                            onClick={() => handleRemoveTimeSlot(selectedDay, index)}
                            className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Unavailable Dates */}
            <div className="bg-card rounded-lg p-6 shadow-md border-2 border-border">
              <h3 className="font-semibold mb-4">Mark Specific Dates as Unavailable</h3>
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block mb-1.5 text-sm">Select Date</label>
                  <input
                    type="date"
                    value={newUnavailableDate}
                    onChange={(e) => setNewUnavailableDate(e.target.value)}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddUnavailableDate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Mark as Unavailable
                  </button>
                </div>
              </div>

              {/* List of Unavailable Dates */}
              {currentTutor.unavailableDates && currentTutor.unavailableDates.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-2">Unavailable Dates</h5>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {currentTutor.unavailableDates.map((date, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-accent/50 px-3 py-2 rounded-lg"
                      >
                        <span className="text-sm">{formatISODate(date)}</span>
                        <button
                          onClick={() => handleRemoveUnavailableDate(date)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Classes I Tutor Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-6">
            <h2>Classes I Tutor</h2>

            {/* Add Class */}
            <div className="bg-card rounded-lg p-6 shadow-md border-2 border-border">
              <h3 className="font-semibold mb-4">Add a Class to Tutor</h3>

              {/* Subject Selection */}
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">Select Subject</label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Object.keys(availableClasses).map((subject) => (
                    <button
                      key={subject}
                      onClick={() => {
                        setSelectedSubject(subject);
                        // Subareas are optional — if this subject has none
                        // set up, skip straight to picking a class.
                        const realSubareas = Object.keys(availableClasses[subject] || {}).filter(
                          (s) => s !== UNGROUPED_SUBAREA,
                        );
                        setSelectedSubarea(realSubareas.length === 0 ? UNGROUPED_SUBAREA : '');
                        setSelectedClassToAdd('');
                      }}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        selectedSubject === subject
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subarea Selection — only shown when this subject actually has
                  named subareas to choose between; subareas are optional. */}
              {selectedSubject && subareasForSelectedSubject.length > 0 && (
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium">Select Subarea in {selectedSubject}</label>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {subareasForSelectedSubject.map((subarea) => (
                      <button
                        key={subarea}
                        onClick={() => {
                          setSelectedSubarea(subarea);
                          setSelectedClassToAdd('');
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          selectedSubarea === subarea
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        {subarea}
                      </button>
                    ))}
                    {hasUngroupedForSelectedSubject && (
                      <button
                        onClick={() => {
                          setSelectedSubarea(UNGROUPED_SUBAREA);
                          setSelectedClassToAdd('');
                        }}
                        className={`px-4 py-2 rounded-lg border-2 border-dashed transition-all ${
                          selectedSubarea === UNGROUPED_SUBAREA
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        No subarea
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Class Selection */}
              {selectedSubject && selectedSubarea && availableClasses[selectedSubject]?.[selectedSubarea] && (
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1.5 text-sm">
                      Select Class in {selectedSubarea === UNGROUPED_SUBAREA ? selectedSubject : `${selectedSubject} → ${selectedSubarea}`}
                    </label>
                    <select
                      value={selectedClassToAdd}
                      onChange={(e) => setSelectedClassToAdd(e.target.value)}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
                    >
                      <option value="">-- Choose a class --</option>
                      {availableClasses[selectedSubject][selectedSubarea].map((className) => (
                        <option key={className} value={className}>
                          {className}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddClass}
                      disabled={!selectedClassToAdd}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      Add Class
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Classes I'm Tutoring */}
            <div className="bg-card rounded-lg p-6 shadow-md border-2 border-border">
              <h3 className="font-semibold mb-4">My Classes</h3>
              {currentTutor.classesITeach && currentTutor.classesITeach.length > 0 ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {currentTutor.classesITeach.map((className, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-primary/5 border-2 border-primary/20 px-4 py-3 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="font-medium">{className}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveClass(className)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>You haven't added any classes yet. Select a subject above to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab: Locations & Zoom */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2>In-Person Locations &amp; Zoom</h2>

            {/* Preferred Locations */}
            <div className="bg-card rounded-lg p-6 shadow-md border-2 border-border">
              <h3 className="font-semibold mb-2">Preferred In-Person Locations</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select every location you're willing to meet students at. Students booking an in-person session with you will choose from this list.
              </p>

              {availableLocations.length > 0 ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                  {availableLocations.map((location) => {
                    const isSelected = (currentTutor.preferredLocations || []).includes(location);
                    return (
                      <button
                        key={location}
                        onClick={() => handleToggleLocation(location)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>{location}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-5">
                  The admin hasn't added any locations yet — you can still add your own below.
                </p>
              )}

              {/* Custom "Other" locations */}
              <h4 className="font-medium mb-2 text-sm">Add Your Own Location</h4>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  value={newCustomLocation}
                  onChange={(e) => setNewCustomLocation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomLocation();
                    }
                  }}
                  placeholder="e.g. Local coffee shop"
                  className="flex-1 px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleAddCustomLocation}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {/* Custom locations not on the admin list, shown removable */}
              {(currentTutor.preferredLocations || []).filter((l) => !availableLocations.includes(l)).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(currentTutor.preferredLocations || [])
                    .filter((l) => !availableLocations.includes(l))
                    .map((location) => (
                      <span
                        key={location}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-full text-sm"
                      >
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {location}
                        <button
                          onClick={() => handleRemoveCustomLocation(location)}
                          className="ml-1 text-destructive hover:opacity-70 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Weekly hour limit */}
            <div className="bg-card rounded-lg p-6 shadow-md border-2 border-border">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Max Tutoring Hours Per Week
              </h3>
              <p className="text-sm text-muted-foreground mb-5">
                The most hours of sessions you want to take on in a single week. Once pending and confirmed sessions
                add up to this, students can't book more time with you that week.
              </p>
              <div className="flex items-center gap-4">
                <Slider
                  min={1}
                  max={10}
                  step={0.5}
                  value={[maxHoursDraft]}
                  onValueChange={(v) => setMaxHoursDraft(v[0])}
                  onValueCommit={(v) => {
                    if (v[0] !== (currentTutor.maxHoursPerWeek ?? 10)) handleSaveMaxHours(v[0]);
                  }}
                  aria-label="Max tutoring hours per week"
                />
                <span className="w-24 text-right font-semibold text-primary tabular-nums">
                  {maxHoursDraft} {maxHoursDraft === 1 ? 'hr' : 'hrs'} / wk
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2 pr-28">
                <span>1 hr</span>
                <span>10 hrs</span>
              </div>
            </div>

            {/* Zoom Link */}
            <div className="bg-card rounded-lg p-6 shadow-md border-2 border-border">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Zoom Room Link
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                Set the Zoom link students will use for online sessions with you.
              </p>
              <p className="text-sm font-medium text-primary mb-4">
                The zoom room you add must be the one associated with your UCLA account.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={zoomLinkDraft}
                  onChange={(e) => setZoomLinkDraft(e.target.value)}
                  placeholder="https://ucla.zoom.us/j/..."
                  className="flex-1 px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleSaveZoomLink}
                  disabled={isSavingZoomLink}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingZoomLink ? 'Saving...' : 'Save'}
                </button>
              </div>
              {!currentTutor.zoomLink && (
                <p className="text-xs text-muted-foreground mt-2">
                  Until you add a link, students can still book online sessions with you, but you'll have to enter a Zoom link each time you confirm one.
                </p>
              )}
            </div>
          </div>
        )}

        {/* My Sessions Tab */}
        {activeTab === 'sessions' && (() => {
          const { upcoming, past } = splitTutorBookings(myBookings);
          const activeList = sessionsView === 'upcoming' ? upcoming : past;
          const totalPages = Math.max(1, Math.ceil(activeList.length / SESSIONS_PAGE_SIZE));
          const safePage = Math.min(sessionsPage, totalPages);
          const pageItems = activeList.slice((safePage - 1) * SESSIONS_PAGE_SIZE, safePage * SESSIONS_PAGE_SIZE);

          const switchSessionsView = (view: 'upcoming' | 'past') => {
            setSessionsView(view);
            setSessionsPage(1);
          };

          return (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2>My Sessions</h2>
              <div className="flex gap-2 bg-accent/50 rounded-lg p-1">
                <button
                  onClick={() => switchSessionsView('upcoming')}
                  className={`px-4 py-2 rounded-md text-sm transition-all ${
                    sessionsView === 'upcoming'
                      ? 'bg-card shadow-sm font-medium text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Upcoming ({upcoming.length})
                </button>
                <button
                  onClick={() => switchSessionsView('past')}
                  className={`px-4 py-2 rounded-md text-sm transition-all ${
                    sessionsView === 'past'
                      ? 'bg-card shadow-sm font-medium text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Past Sessions ({past.length})
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {activeList.length === 0 ? (
                <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-border">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {sessionsView === 'upcoming' ? 'No upcoming sessions.' : 'No past sessions yet.'}
                  </p>
                </div>
              ) : (
                pageItems.map((booking) => (
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
                              Awaiting Your Confirmation
                            </span>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Student:</strong> {booking.studentName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <a
                              href={`mailto:${booking.studentEmail}`}
                              className="text-primary hover:underline"
                            >
                              {booking.studentEmail}
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
                              <span>
                                <strong>Zoom:</strong>{' '}
                                {booking.zoomLink ? (
                                  <a
                                    href={booking.zoomLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {booking.zoomLink}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">Not set</span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span><strong>Location:</strong> {booking.location || <span className="text-muted-foreground">Not set yet</span>}</span>
                              {booking.location && !booking.locationApproved && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                  Custom — confirming approves it
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
                          <label className="block mb-1.5 text-sm font-medium">Topics to Cover</label>
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
                          <span><strong>Topics to Cover:</strong> {booking.topics}</span>
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
                      {!booking.confirmed && missingConfirmDetail(booking) && (
                        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <label htmlFor={`confirm-${booking._id}`} className="block mb-1.5 text-sm font-medium text-amber-900">
                            {missingConfirmDetail(booking) === 'zoom'
                              ? 'Add your Zoom link to confirm'
                              : 'Add the meeting location to confirm'}
                          </label>
                          <input
                            id={`confirm-${booking._id}`}
                            type={missingConfirmDetail(booking) === 'zoom' ? 'url' : 'text'}
                            value={confirmDrafts[booking._id] || ''}
                            onChange={(e) => setConfirmDrafts((prev) => ({ ...prev, [booking._id]: e.target.value }))}
                            placeholder={missingConfirmDetail(booking) === 'zoom' ? 'https://ucla.zoom.us/j/...' : 'e.g. Powell Library, front steps'}
                            className="w-full px-3 py-2 bg-input-background border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                          />
                          <p className="text-xs text-amber-800 mt-1.5">
                            {missingConfirmDetail(booking) === 'zoom'
                              ? "The student booked before you'd set a Zoom link. It will be sent to them when you confirm."
                              : "The student booked before you'd set any meeting locations. It will be sent to them when you confirm."}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {!booking.confirmed && (
                          <button
                            onClick={() => handleConfirmBooking(booking)}
                            disabled={confirmingId === booking._id}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            {confirmingId === booking._id ? 'Confirming...' : 'Confirm Session'}
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelBooking(booking._id)}
                          className="flex items-center gap-2 px-4 py-2 text-destructive border border-destructive/40 rounded-lg hover:bg-destructive/10 transition-colors text-sm"
                        >
                          <X className="w-4 h-4" />
                          Cancel Session
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setSessionsPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-2 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setSessionsPage(page)}
                    className={`w-9 h-9 rounded-lg text-sm transition-all ${
                      page === safePage
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'border border-border hover:bg-accent'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setSessionsPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-2 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
