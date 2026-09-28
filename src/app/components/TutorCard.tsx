import { Calendar, GraduationCap } from 'lucide-react';

interface TimeSlot {
  id: string;
  day: string;
  time: string;
  available: boolean;
}

interface TutorCardProps {
  tutor: {
    id: string;
    name: string;
    photo: string;
    subjects: string[];
    bio: string;
    timeSlots: TimeSlot[];
  };
  onBookSlot: (tutorId: string, slotId: string) => void;
}

export default function TutorCard({ tutor, onBookSlot }: TutorCardProps) {
  const availableSlots = tutor.timeSlots.filter(slot => slot.available);

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4 mb-4">
        <img
          src={tutor.photo}
          alt={tutor.name}
          className="w-16 h-16 rounded-full object-cover border-2 border-primary/10"
        />
        <div className="flex-1">
          <h3 className="mb-1">{tutor.name}</h3>
          <div className="flex flex-wrap gap-1.5">
            {tutor.subjects.map((subject) => (
              <span
                key={subject}
                className="px-2 py-0.5 bg-accent text-accent-foreground rounded-full text-sm"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{tutor.bio}</p>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-medium">{availableSlots.length} slots available</span>
        </div>

        {availableSlots.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {availableSlots.slice(0, 4).map((slot) => (
              <button
                key={slot.id}
                onClick={() => onBookSlot(tutor.id, slot.id)}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
              >
                {slot.day} {slot.time}
              </button>
            ))}
          </div>
        )}

        {availableSlots.length > 4 && (
          <button className="w-full mt-2 px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors text-sm">
            View all {availableSlots.length} slots
          </button>
        )}

        {availableSlots.length === 0 && (
          <div className="text-sm text-muted-foreground mt-2 text-center py-2">
            No available slots
          </div>
        )}
      </div>
    </div>
  );
}
