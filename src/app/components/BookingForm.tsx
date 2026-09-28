import { X, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Tutor } from '../utils/api';

export interface BookingFormSubmitData {
  topics: string;
  sessionType: 'in-person' | 'online';
  location: string;
  attachment: { filename: string; mimeType: string; data: string } | null;
}

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: Tutor;
  bookingDetails: {
    subject: string;
    className: string;
    tutor: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
  };
  onSubmit: (studentData: BookingFormSubmitData) => void;
}

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8MB, matches backend cap
const OTHER_LOCATION = '__other__';

// Reads a PDF file and resolves to its base64 payload (without the
// "data:application/pdf;base64," prefix), matching what the backend expects.
function readFileAsBase64(file: File): Promise<string> {
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
}

export default function BookingForm({ isOpen, onClose, tutor, bookingDetails, onSubmit }: BookingFormProps) {
  const [topics, setTopics] = useState('');
  const [sessionType, setSessionType] = useState<'in-person' | 'online'>('in-person');
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const preferredLocations = tutor.preferredLocations || [];
  const hasZoom = !!tutor.zoomLink;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topics) {
      toast.error('Please fill in all required fields');
      return;
    }

    let finalLocation = '';
    if (sessionType === 'in-person') {
      finalLocation = location === OTHER_LOCATION ? customLocation.trim() : location;
      if (!finalLocation) {
        toast.error('Please choose a location for your in-person session');
        return;
      }
    } else if (!hasZoom) {
      toast.error("This tutor hasn't set up a Zoom link yet — please choose an in-person session instead.");
      return;
    }

    setIsSubmitting(true);
    try {
      let attachment: BookingFormSubmitData['attachment'] = null;
      if (attachmentFile) {
        const data = await readFileAsBase64(attachmentFile);
        attachment = { filename: attachmentFile.name, mimeType: attachmentFile.type, data };
      }

      onSubmit({ topics, sessionType, location: finalLocation, attachment });

      // Reset form
      setTopics('');
      setSessionType('in-person');
      setLocation('');
      setCustomLocation('');
      setAttachmentFile(null);
    } catch {
      toast.error('Could not read the attached file — please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="mb-4">Complete Your Booking</h2>

        {/* Booking Summary */}
        <div className="bg-blue-50 border-2 border-primary/20 rounded-lg p-4 mb-6">
          <p className="text-sm">
            <strong>Class:</strong> {bookingDetails.className}
          </p>
          <p className="text-sm">
            <strong>Tutor:</strong> {bookingDetails.tutor}
          </p>
          <p className="text-sm">
            <strong>When:</strong> {bookingDetails.date} from {bookingDetails.startTime} to {bookingDetails.endTime}
          </p>
          <p className="text-sm">
            <strong>Duration:</strong> {formatDuration(bookingDetails.duration)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                disabled={!hasZoom}
                title={hasZoom ? undefined : "This tutor hasn't set up a Zoom link yet"}
                className={`px-4 py-3 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
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
                The Zoom link will be sent to you once the tutor confirms the session.
              </p>
            )}
          </div>

          {sessionType === 'in-person' && (
            <div>
              <label htmlFor="location" className="block mb-1.5 text-sm">
                Location <span className="text-destructive">*</span>
              </label>
              {preferredLocations.length > 0 ? (
                <select
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
                  required
                >
                  <option value="">-- Choose a location --</option>
                  {preferredLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                  <option value={OTHER_LOCATION}>Other...</option>
                </select>
              ) : (
                <p className="text-sm text-muted-foreground mb-2">
                  This tutor hasn't set preferred locations yet — suggest one below.
                </p>
              )}
              {(preferredLocations.length === 0 || location === OTHER_LOCATION) && (
                <div className={preferredLocations.length > 0 ? 'mt-2' : ''}>
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="Suggest a location (e.g. Powell Library)"
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A custom location needs the tutor's approval — they'll confirm it when they accept the session.
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
              onChange={handleFileChange}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-md file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer hover:file:opacity-90"
            />
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Upload className="w-3 h-3" />
              e.g. a problem set you'd like to work on. PDF only, up to 8MB.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
