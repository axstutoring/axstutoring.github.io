import { ChevronLeft, Clock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { timeToMinutes } from '../utils/api';

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

interface SelectTimeProps {
  tutor: string;
  availableSlots: TimeSlot[];
  onBack: () => void;
  onConfirm: (startTime: string, endTime: string, duration: number, date: string) => void;
}

export default function SelectTime({ tutor, availableSlots, onBack, onConfirm }: SelectTimeProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(60); // in minutes, default 1 hour
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);

  const uniqueDates = Array.from(new Set(availableSlots.map(slot => slot.date)));

  // Sorted chronologically — a tutor can have more than one availability
  // window on the same day, and slots aren't guaranteed to already be in
  // time order once filtered down to one date.
  const availableTimes = selectedDate
    ? availableSlots
        .filter(slot => slot.date === selectedDate && slot.available)
        .slice()
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    : [];

  // Only allow 30 min or 60 min (1 hour) durations
  const durationOptions = [30, 60];

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  // Find available start times for the selected duration
  const getAvailableStartTimes = (durationMinutes: number) => {
    const slotsNeeded = durationMinutes / 30; // Each slot is 30 minutes
    const availableStarts: { startTime: string; endTime: string; startIndex: number }[] = [];

    for (let i = 0; i <= availableTimes.length - slotsNeeded; i++) {
      // Check if we have consecutive available slots — each 30-minute slot
      // must pick up exactly where the previous one ends. Being next to
      // each other in the array isn't enough on its own, since two separate
      // availability windows on the same day would otherwise look
      // "consecutive" across the gap between them.
      let hasConsecutiveSlots = true;
      for (let j = 1; j < slotsNeeded; j++) {
        if (timeToMinutes(availableTimes[i + j].startTime) !== timeToMinutes(availableTimes[i + j - 1].startTime) + 30) {
          hasConsecutiveSlots = false;
          break;
        }
      }

      if (hasConsecutiveSlots) {
        availableStarts.push({
          startTime: availableTimes[i].startTime,
          endTime: availableTimes[i + slotsNeeded - 1].endTime,
          startIndex: i,
        });
      }
    }

    return availableStarts;
  };

  // Check if any start times are available for the current duration
  const hasAvailableSlots = selectedDate && getAvailableStartTimes(selectedDuration).length > 0;

  const availableStartTimes = selectedDate ? getAvailableStartTimes(selectedDuration) : [];

  const handleConfirm = () => {
    if (!selectedDate || !selectedStartTime) {
      toast.error('Please select date and start time');
      return;
    }

    const selectedSlot = availableStartTimes.find(slot => slot.startTime === selectedStartTime);
    if (!selectedSlot) {
      toast.error('Invalid time selection');
      return;
    }

    onConfirm(selectedSlot.startTime, selectedSlot.endTime, selectedDuration, selectedDate);
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

        <h1 className="text-center mb-8">Choose a Date and Time</h1>

        <div className="space-y-6">
          {/* Date Selection */}
          <div>
            <label className="block mb-3">Select Date</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {uniqueDates.map((date) => (
                <button
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedStartTime(null);
                  }}
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
          </div>

          {/* Duration Selection */}
          {selectedDate && (
            <div>
              <label className="block mb-3">
                Select Session Duration
              </label>
              <div className="bg-card border-2 border-border rounded-xl p-6">
                <div className="flex gap-3 justify-center">
                  {durationOptions.map((duration) => (
                    <button
                      key={duration}
                      onClick={() => {
                        setSelectedDuration(duration);
                        setSelectedStartTime(null);
                      }}
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
                    No available time slots for {formatDuration(selectedDuration)} on this date. Try a different duration.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Available Start Times */}
          {selectedDate && hasAvailableSlots && (
            <div>
              <label className="block mb-3">Select Start Time</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableStartTimes.map((slot) => (
                  <button
                    key={slot.startTime}
                    onClick={() => setSelectedStartTime(slot.startTime)}
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

          {/* Confirm Button */}
          {selectedDate && selectedDuration && selectedStartTime && (
            <div className="pt-4">
              <div className="bg-blue-50 border-2 border-primary/20 rounded-xl p-4 mb-4">
                <p className="text-center">
                  <strong>Booking Summary:</strong><br />
                  {selectedDate} from {selectedStartTime} to{' '}
                  {availableStartTimes.find(s => s.startTime === selectedStartTime)?.endTime}
                  <br />
                  ({formatDuration(selectedDuration)})
                </p>
              </div>
              <button
                onClick={handleConfirm}
                className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl hover:shadow-xl transition-all"
              >
                Confirm Booking
              </button>
            </div>
          )}

          {selectedDate && availableTimes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No available times for this date
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
