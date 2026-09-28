import { X } from 'lucide-react';
import { useState } from 'react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutorName: string;
  slotInfo: string;
  onConfirm: (studentInfo: { name: string; email: string; notes: string }) => void;
}

export default function BookingModal({ isOpen, onClose, tutorName, slotInfo, onConfirm }: BookingModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({ name, email, notes });
    setName('');
    setEmail('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="mb-4">Book Tutoring Session</h2>

        <div className="mb-4 p-3 bg-accent rounded-md">
          <p className="text-sm">
            <span className="font-medium">Tutor:</span> {tutorName}
          </p>
          <p className="text-sm">
            <span className="font-medium">Time:</span> {slotInfo}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block mb-1.5 text-sm">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block mb-1.5 text-sm">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
              required
            />
          </div>

          <div>
            <label htmlFor="notes" className="block mb-1.5 text-sm">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-md min-h-[80px]"
              placeholder="What would you like help with?"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              Confirm Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
