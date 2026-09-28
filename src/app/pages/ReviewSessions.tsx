import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Calendar, Clock, MapPin, GraduationCap, Atom, TestTube, Dna, Users, X, Check, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import coatOfArms from '../../imports/coat-of-arms.jpg';
import { generateReviewSessionICS, downloadICS } from '../utils/icsUtils';
import {
  getReviewSessions,
  rsvpToReviewSession,
  getMyStudentProfile,
  getToken,
  type ReviewSession,
} from '../utils/api';

export default function ReviewSessions() {
  const navigate = useNavigate();
  const [reviewSessions, setReviewSessions] = useState<ReviewSession[]>([]);
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [rsvpSubject, setRsvpSubject] = useState('');
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
  const [rsvpdSession, setRsvpdSession] = useState<ReviewSession | null>(null);
  const [currentStudentName, setCurrentStudentName] = useState<string | null>(null);

  useEffect(() => {
    getReviewSessions()
      .then(setReviewSessions)
      .catch(() => toast.error('Could not load review sessions — please try refreshing.'));

    // RSVPing requires a student account — load the signed-in student's
    // name (if any) so we know whether to gate the RSVP button.
    if (getToken('student')) {
      getMyStudentProfile()
        .then((profile) => setCurrentStudentName(profile.name))
        .catch(() => {});
    }
  }, []);

  const getSessionCourses = (session: ReviewSession | undefined) =>
    session
      ? session.className.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

  const handleRsvpClick = (sessionId: string) => {
    // RSVPing requires a student account now — no more "just type your
    // name" path. Send anyone who isn't signed in to log in first.
    if (!getToken('student') || !currentStudentName) {
      toast.error('Please sign in to RSVP', {
        description: 'You need a student account to RSVP for a review session.',
      });
      navigate('/login/student');
      return;
    }
    setSelectedSessionId(sessionId);
    const session = reviewSessions.find((s) => s._id === sessionId);
    const courses = getSessionCourses(session);
    // If there's only one subject for this session, no need to ask
    setRsvpSubject(courses.length === 1 ? courses[0] : '');
    setShowRsvpModal(true);
  };

  const handleConfirmRsvp = async () => {
    const session = reviewSessions.find((s) => s._id === selectedSessionId);
    const courses = getSessionCourses(session);
    const needsSubjectChoice = courses.length > 1;

    if (needsSubjectChoice && !rsvpSubject) {
      toast.error("Please select which subject you're RSVPing for");
      return;
    }

    const finalSubject = rsvpSubject || courses[0] || '';

    setIsSubmittingRsvp(true);
    try {
      const updatedSession = await rsvpToReviewSession(selectedSessionId, finalSubject);
      setReviewSessions((prev) => prev.map((s) => (s._id === selectedSessionId ? updatedSession : s)));
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

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="bg-primary text-primary-foreground shadow-xl py-8">
          <div className="max-w-6xl mx-auto px-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 mb-4 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Home
            </button>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-full">
                <img
                  src={coatOfArms}
                  alt="Alpha Chi Sigma"
                  className="w-16 h-16 object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-8 h-8" />
                  <h1 className="text-3xl font-bold">Review Sessions</h1>
                </div>
                <p className="text-sm opacity-90 mt-1">
                  Join us for group study and exam preparation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          {reviewSessions.length === 0 ? (
            <div className="bg-card rounded-2xl shadow-xl p-12 text-center border-2 border-dashed border-border">
              <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Review Sessions Scheduled</h2>
              <p className="text-muted-foreground">
                Check back soon for upcoming review sessions! Our tutoring chairs will post new sessions as exams approach.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {reviewSessions.map((session) => (
                <div
                  key={session._id}
                  className="bg-card rounded-xl shadow-xl p-6 border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-2xl"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-lg">
                      <GraduationCap className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-primary mb-4">
                        {session.className}
                      </h3>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="font-medium">{session.date}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Clock className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Time</p>
                            <p className="font-medium">{session.time}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <MapPin className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="font-medium">{session.location}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">
                            {session.attendees?.length || 0} RSVP{(session.attendees?.length || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRsvpClick(session._id)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                        >
                          {currentStudentName ? 'RSVP' : 'Sign In to RSVP'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 rounded-xl p-6 border-2 border-primary/20">
            <h3 className="font-semibold text-primary mb-2">About Review Sessions</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Review sessions are free, drop-in study sessions led by Alpha Chi Sigma members.
              Bring your questions, study materials, and friends! RSVP to let us know you're coming!
            </p>
          </div>
        </div>
      </div>

      {/* RSVP Modal */}
      {showRsvpModal && (() => {
        const session = reviewSessions.find((s) => s._id === selectedSessionId);
        const courses = getSessionCourses(session);

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
                RSVPing as <strong className="text-foreground">{currentStudentName}</strong>
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
              ) : null}

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
                  disabled={isSubmittingRsvp}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingRsvp ? 'Submitting...' : 'Confirm RSVP'}
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
    </div>
  );
}
