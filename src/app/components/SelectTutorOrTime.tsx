import { ChevronLeft, Clock, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { timeToMinutes, type Tutor } from '../utils/api';

interface TimeSlot {
  date: string;
  dateISO: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface TutorWithSlots {
  tutor: Tutor;
  slots: TimeSlot[];
}

interface SelectTutorOrTimeProps {
  tutorSlots: TutorWithSlots[];
  onBack: () => void;
  // "By Tutor" path — student picked a tutor first; parent transitions to a
  // plain per-tutor time-selection screen from here.
  onSelectTutor: (tutor: Tutor) => void;
  // "By Time" path — date/time (and, if needed, tutor) are all resolved on
  // this screen, so the parent can go straight to the booking form.
  onConfirmByTime: (
    tutor: Tutor,
    startTime: string,
    endTime: string,
    duration: number,
    date: string,
    dateISO: string,
  ) => void;
}

export default function SelectTutorOrTime({ tutorSlots, onBack, onSelectTutor, onConfirmByTime }: SelectTutorOrTimeProps) {
  const [mode, setMode] = useState<'by-time' | 'by-tutor'>('by-time');

  // "By time" state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);

  const durationOptions = [30, 60];

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  // Every date any eligible tutor has at least one open slot on, sorted
  // chronologically (dateISO sorts correctly as plain text; the display
  // date string doesn't).
  const dateMap = new Map<string, string>(); // dateISO -> display date
  tutorSlots.forEach((ts) => {
    ts.slots.forEach((s) => {
      if (s.available && !dateMap.has(s.dateISO)) dateMap.set(s.dateISO, s.date);
    });
  });
  const uniqueDates = Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateISO, date]) => ({ dateISO, date }));

  const getAvailableStartTimesForTutor = (ts: TutorWithSlots, date: string, durationMinutes: number) => {
    // Sorted chronologically — a tutor can have more than one availability
    // window on the same day (e.g. 9-11 AM and 2-5 PM), and slots aren't
    // guaranteed to already be in time order once filtered down to one date.
    const availableTimes = ts.slots
      .filter((s) => s.date === date && s.available)
      .slice()
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    const slotsNeeded = durationMinutes / 30;
    const starts: { startTime: string; endTime: string }[] = [];

    for (let i = 0; i <= availableTimes.length - slotsNeeded; i++) {
      let hasConsecutiveSlots = true;
      for (let j = 1; j < slotsNeeded; j++) {
        // Each 30-minute slot must pick up exactly where the previous one
        // ends — being next to each other in the (now-sorted) array isn't
        // enough on its own, since two different availability windows on
        // the same day would otherwise look "consecutive" across the gap
        // between them.
        if (timeToMinutes(availableTimes[i + j].startTime) !== timeToMinutes(availableTimes[i + j - 1].startTime) + 30) {
          hasConsecutiveSlots = false;
          break;
        }
      }
      if (hasConsecutiveSlots) {
        starts.push({ startTime: availableTimes[i].startTime, endTime: availableTimes[i + slotsNeeded - 1].endTime });
      }
    }
    return starts;
  };

  // Union of start times across every eligible tutor for the selected
  // date + duration, each tagged with which tutor(s) offer it.
  const aggregatedStarts = (() => {
    if (!selectedDate) return [];
    const map = new Map<string, { startTime: string; endTime: string; tutors: TutorWithSlots[] }>();
    tutorSlots.forEach((ts) => {
      getAvailableStartTimesForTutor(ts, selectedDate, selectedDuration).forEach((s) => {
        const existing = map.get(s.startTime);
        if (existing) existing.tutors.push(ts);
        else map.set(s.startTime, { startTime: s.startTime, endTime: s.endTime, tutors: [ts] });
      });
    });
    return Array.from(map.values()).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  })();

  const hasAvailableSlots = !!selectedDate && aggregatedStarts.length > 0;
  const selectedStartEntry = aggregatedStarts.find((s) => s.startTime === selectedStartTime) || null;
  const needsTutorChoice = !!selectedStartEntry && selectedStartEntry.tutors.length > 1;
  const resolvedTutor: Tutor | null = !selectedStartEntry
    ? null
    : selectedStartEntry.tutors.length === 1
      ? selectedStartEntry.tutors[0].tutor
      : selectedTutorId
        ? selectedStartEntry.tutors.find((t) => t.tutor._id === selectedTutorId)?.tutor || null
        : null;

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedStartTime(null);
    setSelectedTutorId(null);
  };

  const handleSelectDuration = (duration: number) => {
    setSelectedDuration(duration);
    setSelectedStartTime(null);
    setSelectedTutorId(null);
  };

  const handleSelectStartTime = (startTime: string) => {
    setSelectedStartTime(startTime);
    setSelectedTutorId(null);
  };

  const handleConfirmByTime = () => {
    if (!selectedDate || !selectedStartEntry) {
      toast.error('Please select a date and start time');
      return;
    }
    if (!resolvedTutor) {
      toast.error('Please choose a tutor for this time');
      return;
    }
    const dateEntry = uniqueDates.find((d) => d.date === selectedDate);
    onConfirmByTime(resolvedTutor, selectedStartEntry.startTime, selectedStartEntry.endTime, selectedDuration, selectedDate, dateEntry?.dateISO || '');
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1 mb-8 text-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <h1 className="text-center mb-4">Choose a Time or a Tutor</h1>

        {/* Mode toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-2 bg-accent/50 rounded-lg p-1">
            <button
              onClick={() => setMode('by-time')}
              className={`px-5 py-2.5 rounded-md text-sm transition-all ${
                mode === 'by-time'
                  ? 'bg-card shadow-sm font-medium text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              By Time
            </button>
            <button
              onClick={() => setMode('by-tutor')}
              className={`px-5 py-2.5 rounded-md text-sm transition-all ${
                mode === 'by-tutor'
                  ? 'bg-card shadow-sm font-medium text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              By Tutor
            </button>
          </div>
        </div>

        {mode === 'by-tutor' ? (
          <div className="space-y-3">
            {tutorSlots.map(({ tutor }) => (
              <button
                key={tutor._id}
                onClick={() => onSelectTutor(tutor)}
                className="w-full px-6 py-4 bg-card border border-border rounded-lg hover:border-primary hover:shadow-md transition-all text-lg"
              >
                {tutor.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Date Selection */}
            <div>
              <label className="block mb-3">Select Date</label>
              {uniqueDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming availability from any tutor for this class right now.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {uniqueDates.map(({ date }) => (
                    <button
                      key={date}
                      onClick={() => handleSelectDate(date)}
                      className={`px-4 py-3 border-2 rounded-lg transition-all ${
                        selectedDate === date
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:border-primary'
                      }`}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Duration Selection */}
            {selectedDate && (
              <div>
                <label className="block mb-3">Select Session Duration</label>
                <div className="bg-card border-2 border-border rounded-xl p-6">
                  <div className="flex gap-3 justify-center">
                    {durationOptions.map((duration) => (
                      <button
                        key={duration}
                        onClick={() => handleSelectDuration(duration)}
                        className={`flex-1 max-w-[200px] px-6 py-4 rounded-lg border-2 transition-all ${
                          selectedDuration === duration
                            ? 'border-primary bg-primary/10 text-primary shadow-md'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl font-bold">{formatDuration(duration)}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {duration === 30 ? 'Quick Session' : 'Standard Session'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {!hasAvailableSlots && (
                    <div className="mt-4 text-center text-sm text-destructive bg-destructive/10 py-2 px-3 rounded-lg">
                      No tutors have {formatDuration(selectedDuration)} open on this date. Try a different duration.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Available Start Times (aggregated across tutors) */}
            {selectedDate && hasAvailableSlots && (
              <div>
                <label className="block mb-3">Select Start Time</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {aggregatedStarts.map((slot) => (
                    <button
                      key={slot.startTime}
                      onClick={() => handleSelectStartTime(slot.startTime)}
                      className={`px-4 py-3 border-2 rounded-lg transition-all ${
                        selectedStartTime === slot.startTime
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:border-primary'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4" />
                        {slot.startTime}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tutor disambiguation — only shown when more than one tutor
                offers the selected date/time/duration combo. */}
            {needsTutorChoice && (
              <div>
                <label className="block mb-3">More than one tutor is free then — choose one</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedStartEntry!.tutors.map(({ tutor }) => (
                    <button
                      key={tutor._id}
                      onClick={() => setSelectedTutorId(tutor._id)}
                      className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                        selectedTutorId === tutor._id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:border-primary'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      {tutor.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Booking Summary + Confirm */}
            {selectedStartEntry && resolvedTutor && (
              <div className="pt-4">
                <div className="bg-blue-50 border-2 border-primary/20 rounded-xl p-4 mb-4">
                  <p className="text-center">
                    <strong>Tutor:</strong> {resolvedTutor.name}
                    <br />
                    {selectedDate} from {selectedStartEntry.startTime} to {selectedStartEntry.endTime}
                    <br />
                    ({formatDuration(selectedDuration)})
                  </p>
                </div>
                <button
                  onClick={handleConfirmByTime}
                  className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl hover:shadow-xl transition-all"
                >
                  Confirm Booking
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
