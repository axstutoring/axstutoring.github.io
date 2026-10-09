import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Shield,
  Users,
  Calendar,
  Mail,
  LogOut,
  Plus,
  Trash2,
  Clock,
  MapPin,
  User,
  Save,
  X,
  Atom,
  TestTube,
  Dna,
  BookOpen,
  GraduationCap,
  ChevronDown,
  Pencil,
  Download,
  Megaphone,
  Check,
  ArrowRightLeft,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import coatOfArms from "../../imports/coat-of-arms.jpg";
import {
  getToken,
  clearToken,
  adminGetTutors,
  adminCreateTutor,
  adminApproveTutor,
  adminSetTutorHold,
  adminDeleteTutor,
  adminGetStudents,
  adminDeleteStudent,
  adminGetAllBookings,
  adminDeleteBooking,
  adminGetTutoringReport,
  adminGetAnnouncement,
  adminSetAnnouncement,
  getClasses,
  adminSetClasses,
  UNGROUPED_SUBAREA,
  getLocations,
  adminSetLocations,
  getReviewSessions,
  adminCreateReviewSession,
  adminUpdateReviewSession,
  adminDeleteReviewSession,
  adminGetEmailTemplates,
  adminSetEmailTemplate,
  adminSetStudentHold,
  EMAIL_TEMPLATE_LABELS,
  type Tutor,
  type Booking,
  type Classes as ClassesType,
  type ReviewSession,
  type AdminStudent,
  type EmailTemplateKey,
  toLocalISODate,
  pacificNow,
} from "../utils/api";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    | "tutors"
    | "sessions"
    | "email"
    | "classes"
    | "locations"
    | "reviews"
    | "students"
    | "announcement"
  >("tutors");
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  // Sessions page sub-tabs: confirmed upcoming, requests still awaiting the tutor, and past.
  const [sessionsView, setSessionsView] = useState<"upcoming" | "requested" | "past">("upcoming");
  const [emailTemplates, setEmailTemplates] = useState<Record<EmailTemplateKey, string>>({} as Record<EmailTemplateKey, string>);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<EmailTemplateKey>('bookingCreatedStudent');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showCreateTutor, setShowCreateTutor] = useState(false);
  const [classes, setClasses] = useState<ClassesType>({});
  const [reviewSessions, setReviewSessions] = useState<ReviewSession[]>([]);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Classes tab state
  const [newClassSubject, setNewClassSubject] = useState("");
  const [newClassCustomSubject, setNewClassCustomSubject] = useState("");
  const [newClassSubarea, setNewClassSubarea] = useState("");
  const [newClassCustomSubarea, setNewClassCustomSubarea] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [expandedClasses, setExpandedClasses] = useState<
    Record<string, boolean>
  >({});
  const [expandedSubareas, setExpandedSubareas] = useState<
    Record<string, boolean>
  >({});

  // "Move class to a different subarea" inline form state
  const [movingClassKey, setMovingClassKey] = useState<string | null>(null);
  const [moveTargetSubject, setMoveTargetSubject] = useState("");
  const [moveTargetCustomSubject, setMoveTargetCustomSubject] = useState("");
  const [moveTargetSubarea, setMoveTargetSubarea] = useState("");
  const [moveTargetCustomSubarea, setMoveTargetCustomSubarea] = useState("");

  // Locations tab state (master list of in-person meeting spots)
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocationName, setNewLocationName] = useState("");

  // Review Sessions tab state
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionStartTime, setNewSessionStartTime] = useState("");
  const [newSessionEndTime, setNewSessionEndTime] = useState("");
  const [newSessionLocation, setNewSessionLocation] = useState("");
  const [newSessionCourses, setNewSessionCourses] = useState<string[]>([]);
  const [showPastReviewSessions, setShowPastReviewSessions] =
    useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(
    null,
  );
  const [editSessionDraft, setEditSessionDraft] = useState<{
    dateISO: string;
    startTime: string;
    endTime: string;
    location: string;
    courses: string[];
  } | null>(null);

  // New tutor form state
  const [newTutorName, setNewTutorName] = useState("");
  const [newTutorEmail, setNewTutorEmail] = useState("");
  const [newTutorPassword, setNewTutorPassword] = useState("");
  const [newTutorSubjects, setNewTutorSubjects] = useState("");
  const [isCreatingTutor, setIsCreatingTutor] = useState(false);

  // Tutoring report (CSV export) state
  const today = toLocalISODate(pacificNow());
  const [reportStartDate, setReportStartDate] = useState(today);
  const [reportEndDate, setReportEndDate] = useState(today);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  // Announcement (homepage banner) state
  const [announcement, setAnnouncement] = useState('');
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  useEffect(() => {
    if (!getToken('admin')) {
      toast.error("Unauthorized access");
      navigate("/login/admin");
      return;
    }

    (async () => {
      try {
        const [allTutors, allStudents, allBookings, allClasses, allLocations, allSessions, templates, currentAnnouncement] = await Promise.all([
          adminGetTutors(),
          adminGetStudents(),
          adminGetAllBookings(),
          getClasses(),
          getLocations().catch(() => [] as string[]),
          getReviewSessions(),
          adminGetEmailTemplates().catch(() => ({} as Record<EmailTemplateKey, string>)),
          adminGetAnnouncement().catch(() => ''),
        ]);
        setTutors(allTutors);
        setStudents(allStudents);
        setBookings(allBookings);
        setClasses(allClasses);
        setLocations(allLocations);
        setReviewSessions(allSessions);
        setEmailTemplates(templates);
        setAnnouncement(currentAnnouncement);
      } catch {
        toast.error("Your session has expired — please log in again");
        clearToken('admin');
        navigate("/login/admin");
      } finally {
        setIsLoaded(true);
      }
    })();
  }, [navigate]);

  const handleLogout = () => {
    clearToken('admin');
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleCreateTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTutor(true);
    try {
      const tutor = await adminCreateTutor({
        name: newTutorName,
        email: newTutorEmail,
        password: newTutorPassword,
        subjects: newTutorSubjects.split(",").map((s) => s.trim()).filter(Boolean),
        classesITeach: [],
      });
      setTutors((prev) => [...prev, tutor]);
      toast.success("Tutor account created");
      setNewTutorName("");
      setNewTutorEmail("");
      setNewTutorPassword("");
      setNewTutorSubjects("");
      setShowCreateTutor(false);
    } catch (err: any) {
      toast.error("Could not create tutor", { description: err?.message });
    } finally {
      setIsCreatingTutor(false);
    }
  };

  const handleDeleteTutor = async (tutorId: string) => {
    try {
      await adminDeleteTutor(tutorId);
      setTutors((prev) => prev.filter((t) => t._id !== tutorId));
      toast.success("Tutor removed");
    } catch (err: any) {
      toast.error("Could not remove tutor", { description: err?.message });
    }
  };

  const handleApproveTutor = async (tutorId: string) => {
    try {
      const updated = await adminApproveTutor(tutorId);
      setTutors((prev) => prev.map((t) => (t._id === tutorId ? updated : t)));
      toast.success("Tutor approved — they can now sign in");
    } catch (err: any) {
      toast.error("Could not approve tutor", { description: err?.message });
    }
  };

  const handleToggleTutorHold = async (tutorId: string, currentlyOnHold: boolean) => {
    try {
      const updated = await adminSetTutorHold(tutorId, !currentlyOnHold);
      setTutors((prev) => prev.map((t) => (t._id === tutorId ? updated : t)));
      toast.success(
        currentlyOnHold
          ? "Hold cleared — they're bookable again"
          : 'Tutor put on hold — hidden from the bookable list',
      );
    } catch (err: any) {
      toast.error('Could not update hold status', { description: err?.message });
    }
  };

  const handleDownloadTutoringReport = async () => {
    if (!reportStartDate || !reportEndDate) {
      toast.error("Please select both a start and end date");
      return;
    }
    if (reportStartDate > reportEndDate) {
      toast.error("Start date must be before end date");
      return;
    }

    setIsDownloadingReport(true);
    try {
      const { rows } = await adminGetTutoringReport(reportStartDate, reportEndDate);

      if (rows.length === 0) {
        toast.error("No completed sessions found in that date range");
        return;
      }

      const csvRows = [
        ["Tutor Name", "Sessions Tutored"],
        ...rows.map((r) => [r.tutor, String(r.sessionsCompleted)]),
      ];
      const csvContent = csvRows
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tutoring-report-${reportStartDate}-to-${reportEndDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Report downloaded");
    } catch (err: any) {
      toast.error("Could not generate report", { description: err?.message });
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const pendingTutors = tutors.filter((t) => !t.isApproved);
  const approvedTutors = tutors.filter((t) => t.isApproved);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  const isSessionPast = (booking: Booking) => {
    try {
      const currentYear = pacificNow().getFullYear();
      const dateTimeString = `${booking.date} ${currentYear} ${booking.endTime}`;
      const sessionDateTime = new Date(dateTimeString);

      if (isNaN(sessionDateTime.getTime())) {
        console.warn("Could not parse date:", dateTimeString);
        return false;
      }

      const now = pacificNow();
      return sessionDateTime < now;
    } catch (error) {
      console.warn("Error checking if session is past:", error);
      return false;
    }
  };

  const upcomingBookings = bookings.filter((b) => !isSessionPast(b));
  const confirmedUpcoming = upcomingBookings.filter((b) => b.confirmed);
  const pendingRequests = upcomingBookings.filter((b) => !b.confirmed);

  const pastBookings = bookings.filter((b) => isSessionPast(b));

  // One booking as a card — shared by the Sessions and Requested tabs.
  const renderSessionCard = (booking: Booking) => (
        <div
          key={booking._id}
          className="bg-card rounded-lg p-6 shadow-md border-2 border-border"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <h3 className="font-semibold text-lg text-primary">
                  {booking.class}
                </h3>
                {booking.confirmed ? (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    Confirmed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                    Awaiting tutor
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>
                    <strong>Student:</strong>{" "}
                    {booking.studentName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>
                    <strong>Email:</strong>{" "}
                    {booking.studentEmail}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>
                    <strong>Tutor:</strong>{" "}
                    {booking.tutor}
                  </span>
                </div>
                {booking.tutorEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>
                      <strong>Tutor Email:</strong>{" "}
                      {booking.tutorEmail}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    <strong>Date:</strong>{" "}
                    {booking.date}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>
                    <strong>Time:</strong>{" "}
                    {booking.startTime} -{" "}
                    {booking.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>
                    <strong>Duration:</strong>{" "}
                    {formatDuration(booking.duration)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>
                    <strong>Location:</strong>{" "}
                    {booking.location || "Not set yet — tutor will add it when confirming"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm">
              <strong>Topics:</strong>{" "}
              {booking.topics}
            </p>
          </div>
        </div>
  );


  const handleDeletePastSession = async (bookingId: string) => {
    try {
      await adminDeleteBooking(bookingId);
      setBookings((prev) => prev.filter((b) => b._id !== bookingId));
      toast.success("Past session deleted");
    } catch (err: any) {
      toast.error("Could not delete session", { description: err?.message });
    }
  };

  const handleDeleteStudent = async (studentId: string, name: string) => {
    try {
      await adminDeleteStudent(studentId);
      setStudents((prev) => prev.filter((s) => s._id !== studentId));
      toast.success(`Deleted account for ${name}`);
    } catch (err: any) {
      toast.error("Could not delete account", { description: err?.message });
    }
  };

  const handleToggleStudentHold = async (studentId: string, currentlyOnHold: boolean) => {
    try {
      const result = await adminSetStudentHold(studentId, !currentlyOnHold);
      setStudents((prev) => prev.map((s) => (
        s._id === studentId
          ? { ...s, onHold: result.onHold, holdReason: result.holdReason, cancelCount: result.cancelCount }
          : s
      )));
      toast.success(
        currentlyOnHold
          ? 'Hold cleared — they can book sessions again'
          : 'Student put on hold — booking is blocked until released',
      );
    } catch (err: any) {
      toast.error('Could not update hold status', { description: err?.message });
    }
  };

  // ---- Classes tab helpers ----
  // classes is Subject -> Subarea -> class names.
  const allCourses = Object.values(classes).flatMap((subareas) => Object.values(subareas).flat());
  const subareasForNewSubject =
    newClassSubject && newClassSubject !== "__new__"
      ? Object.keys(classes[newClassSubject] || {}).filter((s) => s !== UNGROUPED_SUBAREA)
      : [];

  const toggleClassExpand = (key: string) => {
    setExpandedClasses((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSubareaExpand = (key: string) => {
    setExpandedSubareas((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddClass = async () => {
    const subject = (
      newClassSubject === "__new__" ? newClassCustomSubject : newClassSubject
    ).trim();
    const subarea = (
      newClassSubarea === "__new__" ? newClassCustomSubarea : newClassSubarea
    ).trim();
    const className = newClassName.trim();

    if (!subject || !subarea || !className) {
      toast.error("Please provide a subject, a subarea, and a class name");
      return;
    }

    const existingSubject = classes[subject] || {};
    const existingSubarea = existingSubject[subarea] || [];
    if (existingSubarea.includes(className)) {
      toast.error("That class already exists under this subarea");
      return;
    }

    const updated = {
      ...classes,
      [subject]: {
        ...existingSubject,
        [subarea]: [...existingSubarea, className],
      },
    };
    try {
      const saved = await adminSetClasses(updated);
      setClasses(saved);
      toast.success(
        subarea === UNGROUPED_SUBAREA
          ? `Added ${className} to ${subject}`
          : `Added ${className} to ${subject} → ${subarea}`,
      );
      setNewClassName("");
      setNewClassCustomSubarea("");
    } catch (err: any) {
      toast.error("Could not add class", { description: err?.message });
    }
  };

  const handleDeleteClass = async (subject: string, subarea: string, className: string) => {
    const updated = {
      ...classes,
      [subject]: {
        ...classes[subject],
        [subarea]: classes[subject][subarea].filter((c) => c !== className),
      },
    };
    try {
      const saved = await adminSetClasses(updated);
      setClasses(saved);
      toast.success(`Removed ${className}`);
    } catch (err: any) {
      toast.error("Could not remove class", { description: err?.message });
    }
  };

  const handleDeleteSubarea = async (subject: string, subarea: string) => {
    const updatedSubject = { ...classes[subject] };
    delete updatedSubject[subarea];
    const updated = { ...classes, [subject]: updatedSubject };
    try {
      const saved = await adminSetClasses(updated);
      setClasses(saved);
      toast.success(`Removed the "${subarea}" subarea`);
    } catch (err: any) {
      toast.error("Could not remove subarea", { description: err?.message });
    }
  };

  const openMoveClass = (subject: string, subarea: string, className: string) => {
    const key = `${subject}__${subarea}__${className}`;
    if (movingClassKey === key) {
      setMovingClassKey(null);
      return;
    }
    setMovingClassKey(key);
    setMoveTargetSubject(subject);
    setMoveTargetCustomSubject("");
    setMoveTargetSubarea(subarea);
    setMoveTargetCustomSubarea("");
  };

  const handleMoveClass = async (fromSubject: string, fromSubarea: string, className: string) => {
    const targetSubject = (
      moveTargetSubject === "__new__" ? moveTargetCustomSubject : moveTargetSubject
    ).trim();
    const targetSubarea = (
      moveTargetSubarea === "__new__" ? moveTargetCustomSubarea : moveTargetSubarea
    ).trim();

    if (!targetSubject || !targetSubarea) {
      toast.error("Please choose a destination subject and subarea");
      return;
    }
    if (targetSubject === fromSubject && targetSubarea === fromSubarea) {
      toast.error("That's already where this class is");
      return;
    }

    // Remove from its current subarea first, since the target might be a
    // different subarea within the *same* subject.
    const updatedFromSubject = { ...classes[fromSubject] };
    updatedFromSubject[fromSubarea] = updatedFromSubject[fromSubarea].filter((c) => c !== className);

    const targetSubjectClasses = targetSubject === fromSubject ? updatedFromSubject : classes[targetSubject] || {};
    const existingTargetSubarea = targetSubjectClasses[targetSubarea] || [];
    if (existingTargetSubarea.includes(className)) {
      toast.error("That class already exists at the destination");
      return;
    }

    const updated =
      targetSubject === fromSubject
        ? {
            ...classes,
            [fromSubject]: {
              ...updatedFromSubject,
              [targetSubarea]: [...existingTargetSubarea, className],
            },
          }
        : {
            ...classes,
            [fromSubject]: updatedFromSubject,
            [targetSubject]: {
              ...targetSubjectClasses,
              [targetSubarea]: [...existingTargetSubarea, className],
            },
          };

    try {
      const saved = await adminSetClasses(updated);
      setClasses(saved);
      toast.success(
        targetSubarea === UNGROUPED_SUBAREA
          ? `Moved ${className} to ${targetSubject}`
          : `Moved ${className} to ${targetSubject} → ${targetSubarea}`,
      );
      setMovingClassKey(null);
    } catch (err: any) {
      toast.error("Could not move class", { description: err?.message });
    }
  };

  // ---- Locations tab helpers ----
  const handleAddLocation = async () => {
    const name = newLocationName.trim();
    if (!name) {
      toast.error("Please enter a location name");
      return;
    }
    if (locations.includes(name)) {
      toast.error("That location is already on the list");
      return;
    }
    const updated = [...locations, name];
    try {
      const saved = await adminSetLocations(updated);
      setLocations(saved);
      toast.success(`Added ${name}`);
      setNewLocationName("");
    } catch (err: any) {
      toast.error("Could not add location", { description: err?.message });
    }
  };

  const handleDeleteLocation = async (name: string) => {
    const updated = locations.filter((l) => l !== name);
    try {
      const saved = await adminSetLocations(updated);
      setLocations(saved);
      toast.success(`Removed ${name}`);
    } catch (err: any) {
      toast.error("Could not remove location", { description: err?.message });
    }
  };

  // ---- Review Sessions tab helpers ----
  const formatTimeDisplay = (time24: string): string => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  const parseTimeTo24 = (time12: string): string => {
    const match = (time12 || "")
      .trim()
      .match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!match) return "";
    let hour = parseInt(match[1]);
    const minute = match[2];
    const period = match[3].toUpperCase();
    if (period === "AM" && hour === 12) hour = 0;
    if (period === "PM" && hour !== 12) hour += 12;
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  };

  const formatDateDisplay = (dateISO: string): string => {
    if (!dateISO) return "";
    const [y, m, d] = dateISO.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isReviewSessionPast = (session: ReviewSession) => {
    try {
      let dateBase: Date | null = null;
      if (session.dateISO) {
        const [y, m, d] = session.dateISO.split("-").map(Number);
        dateBase = new Date(y, m - 1, d);
      } else {
        const cleaned = session.date.replace(/^[^,]+,\s*/, "");
        const currentYear = pacificNow().getFullYear();
        for (const year of [currentYear, currentYear + 1]) {
          const d = new Date(`${cleaned} ${year}`);
          if (!isNaN(d.getTime())) {
            dateBase = d;
            break;
          }
        }
      }
      if (!dateBase) return false;

      const endTimeStr =
        session.time.split(" - ")[1] || session.time.split(" - ")[0];
      const match = (endTimeStr || "")
        .trim()
        .match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (match) {
        let hour = parseInt(match[1]);
        const minute = parseInt(match[2]);
        const period = match[3].toUpperCase();
        if (period === "AM" && hour === 12) hour = 0;
        if (period === "PM" && hour !== 12) hour += 12;
        dateBase.setHours(hour, minute, 0, 0);
      }
      return dateBase < pacificNow();
    } catch {
      return false;
    }
  };

  const upcomingReviewSessions = reviewSessions
    .filter((s) => !isReviewSessionPast(s))
    .sort((a, b) => {
      const da = a.dateISO ? new Date(a.dateISO).getTime() : 0;
      const db = b.dateISO ? new Date(b.dateISO).getTime() : 0;
      return da - db;
    });
  const pastReviewSessions = reviewSessions
    .filter((s) => isReviewSessionPast(s))
    .sort((a, b) => {
      const da = a.dateISO ? new Date(a.dateISO).getTime() : 0;
      const db = b.dateISO ? new Date(b.dateISO).getTime() : 0;
      return db - da;
    });

  const toggleNewSessionCourse = (course: string) => {
    setNewSessionCourses((prev) =>
      prev.includes(course)
        ? prev.filter((c) => c !== course)
        : [...prev, course],
    );
  };

  const toggleEditDraftCourse = (course: string) => {
    if (!editSessionDraft) return;
    setEditSessionDraft({
      ...editSessionDraft,
      courses: editSessionDraft.courses.includes(course)
        ? editSessionDraft.courses.filter((c) => c !== course)
        : [...editSessionDraft.courses, course],
    });
  };

  const handleCreateReviewSession = async () => {
    if (
      !newSessionDate ||
      !newSessionStartTime ||
      !newSessionEndTime ||
      !newSessionLocation.trim() ||
      newSessionCourses.length === 0
    ) {
      toast.error(
        "Please fill in date, start/end time, location, and select at least one course",
      );
      return;
    }

    try {
      const newSession = await adminCreateReviewSession({
        className: newSessionCourses.join(", "),
        date: formatDateDisplay(newSessionDate),
        dateISO: newSessionDate,
        time: `${formatTimeDisplay(newSessionStartTime)} - ${formatTimeDisplay(newSessionEndTime)}`,
        location: newSessionLocation.trim(),
      });

      setReviewSessions((prev) => [...prev, newSession]);
      toast.success("Review session created");

      setShowCreateSession(false);
      setNewSessionDate("");
      setNewSessionStartTime("");
      setNewSessionEndTime("");
      setNewSessionLocation("");
      setNewSessionCourses([]);
    } catch (err: any) {
      toast.error("Could not create session", { description: err?.message });
    }
  };

  const handleDeleteReviewSession = async (id: string) => {
    try {
      await adminDeleteReviewSession(id);
      setReviewSessions((prev) => prev.filter((s) => s._id !== id));
      toast.success("Review session deleted");
    } catch (err: any) {
      toast.error("Could not delete session", { description: err?.message });
    }
  };

  const handleStartEditSession = (session: ReviewSession) => {
    const [startDisp, endDisp] = session.time.split(" - ");
    setEditingSessionId(session._id);
    setEditSessionDraft({
      dateISO: session.dateISO || "",
      startTime: parseTimeTo24(startDisp || ""),
      endTime: parseTimeTo24(endDisp || ""),
      location: session.location,
      courses: session.className
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    });
  };

  const handleCancelEditSession = () => {
    setEditingSessionId(null);
    setEditSessionDraft(null);
  };

  const handleSaveEditSession = async (id: string) => {
    if (!editSessionDraft) return;
    if (
      !editSessionDraft.dateISO ||
      !editSessionDraft.startTime ||
      !editSessionDraft.endTime ||
      !editSessionDraft.location.trim() ||
      editSessionDraft.courses.length === 0
    ) {
      toast.error(
        "Please fill in date, start/end time, location, and select at least one course",
      );
      return;
    }

    try {
      const updated = await adminUpdateReviewSession(id, {
        dateISO: editSessionDraft.dateISO,
        date: formatDateDisplay(editSessionDraft.dateISO),
        time: `${formatTimeDisplay(editSessionDraft.startTime)} - ${formatTimeDisplay(editSessionDraft.endTime)}`,
        location: editSessionDraft.location.trim(),
        className: editSessionDraft.courses.join(", "),
      });
      setReviewSessions((prev) => prev.map((s) => (s._id === id ? updated : s)));
      toast.success("Review session updated");
      setEditingSessionId(null);
      setEditSessionDraft(null);
    } catch (err: any) {
      toast.error("Could not update session", { description: err?.message });
    }
  };

  const handleSaveEmailTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      await adminSetEmailTemplate(selectedTemplateKey, emailTemplates[selectedTemplateKey] || '');
      toast.success("Email template saved");
    } catch (err: any) {
      toast.error("Could not save template", { description: err?.message });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    setIsSavingAnnouncement(true);
    try {
      await adminSetAnnouncement(announcement);
      toast.success("Announcement saved");
    } catch (err: any) {
      toast.error("Could not save announcement", { description: err?.message });
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Science Motifs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 opacity-5">
          <Atom
            className="w-48 h-48 text-primary"
            strokeWidth={1}
          />
        </div>
        <div className="absolute top-20 right-16 opacity-5">
          <TestTube
            className="w-32 h-32 text-secondary"
            strokeWidth={1}
          />
        </div>
        <div className="absolute bottom-32 left-20 opacity-5">
          <Dna
            className="w-40 h-40 text-primary"
            strokeWidth={1}
          />
        </div>
        <div className="absolute bottom-16 right-10 opacity-5">
          <Atom
            className="w-56 h-56 text-secondary"
            strokeWidth={1}
          />
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
                  <Shield className="w-6 h-6" />
                  <h1 className="text-2xl font-bold">
                    Administrator Dashboard
                  </h1>
                </div>
                <p className="text-sm opacity-90">
                  Alpha Chi Sigma Tutoring Chairs
                </p>
              </div>
            </div>
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

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 bg-card rounded-lg p-2 shadow-md">
          <button
            onClick={() => setActiveTab("tutors")}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === "tutors"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">Tutors</span>
            {pendingTutors.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
                {pendingTutors.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === "sessions"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="hidden sm:inline">Sessions</span>
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("classes")}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === "classes"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="hidden sm:inline">Classes</span>
          </button>
          <button
            onClick={() => setActiveTab("locations")}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === "locations"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent"
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span className="hidden sm:inline">Locations</span>
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === "reviews"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent"
            }`}
          >
            <GraduationCap className="w-5 h-5" />
            <span className="hidden sm:inline">
              Review Sessions
            </span>
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === "students"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="hidden sm:inline">Students</span>
            <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary rounded-full hidden sm:inline">
              {students.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("email")}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === "email"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent"
            }`}
          >
            <Mail className="w-5 h-5" />
            <span className="hidden sm:inline">Email</span>
          </button>
          <button
            onClick={() => setActiveTab("announcement")}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              activeTab === "announcement"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent"
            }`}
          >
            <Megaphone className="w-5 h-5" />
            <span className="hidden sm:inline">Announcement</span>
          </button>
        </div>

        {/* Tutors Tab */}
        {activeTab === "tutors" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2>Manage Tutors</h2>
              <button
                onClick={() => setShowCreateTutor(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                Create New Tutor
              </button>
            </div>

            {/* Tutoring Report / CSV Export */}
            <div className="bg-card rounded-lg p-5 shadow-md border-2 border-border">
              <h3 className="font-semibold mb-1">Tutoring Report</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Download a CSV with how many sessions each tutor completed in a date range. A session counts once its date has passed and it wasn't cancelled.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block mb-1.5 text-sm text-muted-foreground">Start Date</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm text-muted-foreground">End Date</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={handleDownloadTutoringReport}
                  disabled={isDownloadingReport}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  {isDownloadingReport ? "Preparing..." : "Download CSV"}
                </button>
              </div>
            </div>

            {/* Create Tutor Modal */}
            {showCreateTutor && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-card rounded-xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
                  <button
                    onClick={() => setShowCreateTutor(false)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h2 className="mb-6">
                    Create New Tutor Account
                  </h2>

                  <form
                    onSubmit={handleCreateTutor}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="tutorName"
                        className="block mb-1.5 text-sm"
                      >
                        Tutor Name{" "}
                        <span className="text-destructive">
                          *
                        </span>
                      </label>
                      <input
                        id="tutorName"
                        type="text"
                        value={newTutorName}
                        onChange={(e) =>
                          setNewTutorName(e.target.value)
                        }
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
                        placeholder="John Smith"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="tutorEmail"
                        className="block mb-1.5 text-sm"
                      >
                        Email{" "}
                        <span className="text-destructive">
                          *
                        </span>
                      </label>
                      <input
                        id="tutorEmail"
                        type="email"
                        value={newTutorEmail}
                        onChange={(e) =>
                          setNewTutorEmail(e.target.value)
                        }
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
                        placeholder="tutor@example.com"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="tutorPassword"
                        className="block mb-1.5 text-sm"
                      >
                        Password{" "}
                        <span className="text-destructive">
                          *
                        </span>
                      </label>
                      <input
                        id="tutorPassword"
                        type="text"
                        value={newTutorPassword}
                        onChange={(e) =>
                          setNewTutorPassword(e.target.value)
                        }
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
                        placeholder="Create a password for the tutor"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="tutorSubjects"
                        className="block mb-1.5 text-sm"
                      >
                        Subjects (comma-separated)
                      </label>
                      <input
                        id="tutorSubjects"
                        type="text"
                        value={newTutorSubjects}
                        onChange={(e) =>
                          setNewTutorSubjects(e.target.value)
                        }
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-md"
                        placeholder="Chemistry, Organic Chemistry, Physics"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setShowCreateTutor(false)
                        }
                        className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
                      >
                        Create Account
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Pending Approval Section */}
            {pendingTutors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Users className="w-5 h-5" />
                  <h3>
                    Pending Approval ({pendingTutors.length})
                  </h3>
                </div>
                <div className="grid gap-4">
                  {pendingTutors.map((tutor) => (
                    <div
                      key={tutor._id}
                      className="bg-blue-50/50 border-2 border-primary/30 rounded-lg p-6 shadow-sm flex items-start justify-between flex-wrap gap-3"
                    >
                      <div>
                        <h4 className="font-semibold text-lg">
                          {tutor.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Email: {tutor.email}
                        </p>
                        {tutor.subjects.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {tutor.subjects.map((subj, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
                              >
                                {subj}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveTutor(tutor._id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDeleteTutor(tutor._id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tutors List */}
            <div className="grid gap-4">
              <h3 className="font-semibold text-lg">
                Active Tutors
              </h3>
              {approvedTutors.length === 0 ? (
                <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-border">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No active tutors yet.
                  </p>
                </div>
              ) : (
                approvedTutors.map((tutor) => (
                  <div
                    key={tutor._id}
                    className="bg-card rounded-lg p-6 shadow-md border-2 border-border hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <User className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold">
                            {tutor.name}
                          </h3>
                          {tutor.onHold && (
                            <span
                              className="px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full"
                              title={
                                tutor.holdReason === 'strikes'
                                  ? 'Automatic hold — 3 cancelled sessions'
                                  : tutor.holdReason === 'self'
                                  ? 'Tutor put themself on hold'
                                  : 'Set by an admin'
                              }
                            >
                              On Hold
                              {tutor.holdReason === 'strikes' && ' · 3 cancellations'}
                              {tutor.holdReason === 'self' && ' · tutor requested'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          <strong>Email:</strong> {tutor.email}
                        </p>
                        {tutor.cancelCount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {tutor.cancelCount} cancellation{tutor.cancelCount !== 1 ? 's' : ''} on record
                          </p>
                        )}
                        {tutor.subjects.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {tutor.subjects.map(
                              (subject, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                                >
                                  {subject}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground select-none">
                            {tutor.onHold ? 'On hold' : 'Active'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={tutor.onHold}
                            onClick={() => handleToggleTutorHold(tutor._id, tutor.onHold)}
                            title={tutor.onHold ? 'Click to release hold' : 'Click to put on hold'}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                              tutor.onHold ? 'bg-destructive' : 'bg-muted-foreground/30'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                tutor.onHold ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            handleDeleteTutor(tutor._id)
                          }
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Sessions Page — Upcoming / Requested / Past sub-tabs */}
        {activeTab === "sessions" && (() => {
          const views: { key: "upcoming" | "requested" | "past"; label: string; count: number }[] = [
            { key: "upcoming", label: "Upcoming", count: confirmedUpcoming.length },
            { key: "requested", label: "Requested", count: pendingRequests.length },
            { key: "past", label: "Past", count: pastBookings.length },
          ];
          const emptyState = (Icon: typeof Calendar, text: string) => (
            <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-border">
              <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{text}</p>
            </div>
          );
          return (
            <div className="space-y-6">
              <h2>Tutoring Sessions</h2>

              <div className="flex flex-wrap gap-2">
                {views.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setSessionsView(v.key)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                      sessionsView === v.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    {v.label} ({v.count})
                  </button>
                ))}
              </div>

              {sessionsView === "upcoming" && (
                <div className="grid gap-4">
                  {confirmedUpcoming.length === 0
                    ? emptyState(Calendar, "No confirmed upcoming sessions.")
                    : confirmedUpcoming.map((booking) => renderSessionCard(booking))}
                </div>
              )}

              {sessionsView === "requested" && (
                <>
                  <p className="text-sm text-muted-foreground -mt-3">
                    Sessions students have requested that the tutor hasn't confirmed yet, newest request first.
                  </p>
                  <div className="grid gap-4">
                    {pendingRequests.length === 0
                      ? emptyState(Inbox, "No requests waiting on a tutor.")
                      : pendingRequests.map((booking) => renderSessionCard(booking))}
                  </div>
                </>
              )}

              {sessionsView === "past" && (
                <div className="grid gap-4">
                  {pastBookings.length === 0 ? (
                    emptyState(Clock, "No past sessions yet.")
                  ) : (
                    pastBookings.map((booking) => (
                  <div
                    key={booking._id}
                    className="bg-card rounded-lg p-6 shadow-md border-2 border-border opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg text-primary">
                          {booking.class}
                        </h3>
                        {!booking.confirmed && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                            Never confirmed
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          handleDeletePastSession(booking._id)
                        }
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete past session record"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>Student:</strong>{" "}
                              {booking.studentName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>Email:</strong>{" "}
                              {booking.studentEmail}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>Tutor:</strong>{" "}
                              {booking.tutor}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>Date:</strong>{" "}
                              {booking.date}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>Time:</strong>{" "}
                              {booking.startTime} -{" "}
                              {booking.endTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>Location:</strong>{" "}
                              {booking.location || "Not set"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Classes Tab */}
        {activeTab === "classes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2>Manage Classes</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {allCourses.length} class
                  {allCourses.length !== 1 ? "es" : ""} across{" "}
                  {Object.keys(classes).length} subject
                  {Object.keys(classes).length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Add Class Form */}
            <div className="bg-card rounded-lg p-5 shadow-md border-2 border-border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Add a New Class
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block mb-1.5 text-sm text-muted-foreground">
                    Subject
                  </label>
                  <select
                    value={newClassSubject}
                    onChange={(e) => {
                      setNewClassSubject(e.target.value);
                      setNewClassSubarea("");
                      setNewClassCustomSubarea("");
                    }}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                  >
                    <option value="">Select subject...</option>
                    {Object.keys(classes).map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                    <option value="__new__">+ New subject...</option>
                  </select>
                </div>
                {newClassSubject === "__new__" && (
                  <div>
                    <label className="block mb-1.5 text-sm text-muted-foreground">
                      New Subject Name
                    </label>
                    <input
                      type="text"
                      value={newClassCustomSubject}
                      onChange={(e) =>
                        setNewClassCustomSubject(e.target.value)
                      }
                      placeholder="e.g. Statistics"
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
                {newClassSubject && (
                  <div>
                    <label className="block mb-1.5 text-sm text-muted-foreground">
                      Subarea
                    </label>
                    <select
                      value={newClassSubarea}
                      onChange={(e) => setNewClassSubarea(e.target.value)}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                    >
                      <option value="">Select subarea...</option>
                      <option value={UNGROUPED_SUBAREA}>No subarea (directly under subject)</option>
                      {subareasForNewSubject.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                      <option value="__new__">+ New subarea...</option>
                    </select>
                  </div>
                )}
                {newClassSubarea === "__new__" && (
                  <div>
                    <label className="block mb-1.5 text-sm text-muted-foreground">
                      New Subarea Name
                    </label>
                    <input
                      type="text"
                      value={newClassCustomSubarea}
                      onChange={(e) =>
                        setNewClassCustomSubarea(e.target.value)
                      }
                      placeholder="e.g. Organic Chemistry"
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
                <div>
                  <label className="block mb-1.5 text-sm text-muted-foreground">
                    Class Name
                  </label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g. CHEM 153A"
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddClass}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Class
                  </button>
                </div>
              </div>
            </div>

            {/* Classes grouped by subject, then subarea, tutors in a dropdown */}
            {Object.keys(classes).length === 0 ? (
              <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-border">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No classes yet. Add one above.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(classes).map(([subject, subareas]) => {
                  // Subareas are optional: classes filed directly under the
                  // subject live under UNGROUPED_SUBAREA. Show those first,
                  // with no subarea header, then any named subareas below.
                  const subareaEntries = Object.entries(subareas)
                    .filter(([sub, list]) => sub !== UNGROUPED_SUBAREA || list.length > 0)
                    .sort(([a], [b]) => (a === UNGROUPED_SUBAREA ? -1 : b === UNGROUPED_SUBAREA ? 1 : 0));
                  return (
                  <div
                    key={subject}
                    className="bg-card rounded-lg shadow-md border-2 border-border overflow-hidden"
                  >
                    <div className="px-5 py-3 bg-primary/5 border-b border-border">
                      <h3 className="font-semibold text-primary">
                        {subject}
                      </h3>
                    </div>
                    <div className="divide-y divide-border">
                      {subareaEntries.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-muted-foreground">
                          No classes yet under this subject.
                        </p>
                      ) : (
                        subareaEntries.map(([subarea, courseList]) => {
                          const isUngrouped = subarea === UNGROUPED_SUBAREA;
                          const subareaKey = `${subject}__${subarea}`;
                          const isSubareaOpen = isUngrouped || !!expandedSubareas[subareaKey];
                          return (
                            <div key={subareaKey}>
                              {!isUngrouped && (
                                <div className="px-5 py-3 flex items-center justify-between gap-3 bg-accent/30">
                                  <button
                                    onClick={() => toggleSubareaExpand(subareaKey)}
                                    className="flex items-center gap-2 flex-1 text-left hover:text-primary transition-colors"
                                  >
                                    <ChevronDown
                                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                                        isSubareaOpen ? "" : "-rotate-90"
                                      }`}
                                    />
                                    <span className="font-medium">{subarea}</span>
                                    <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                                      {courseList.length} class
                                      {courseList.length !== 1 ? "es" : ""}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubarea(subject, subarea)}
                                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                    title="Remove subarea"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              {isSubareaOpen && (
                                <div className={isUngrouped ? "divide-y divide-border" : "pl-6 divide-y divide-border"}>
                                  {courseList.length === 0 ? (
                                    <p className="px-5 py-4 text-sm text-muted-foreground">
                                      No classes under this subarea yet.
                                    </p>
                                  ) : (
                                    courseList.map((courseName) => {
                                      const key = `${subject}__${subarea}__${courseName}`;
                                      const courseTutors = tutors.filter((t) =>
                                        t.classesITeach?.includes(courseName),
                                      );
                                      const isOpen = !!expandedClasses[key];
                                      return (
                                        <div key={key}>
                                          <div className="px-5 py-3 flex items-center justify-between gap-3">
                                            <button
                                              onClick={() => toggleClassExpand(key)}
                                              className="flex items-center gap-2 flex-1 text-left hover:text-primary transition-colors"
                                            >
                                              <ChevronDown
                                                className={`w-4 h-4 text-muted-foreground transition-transform ${
                                                  isOpen ? "" : "-rotate-90"
                                                }`}
                                              />
                                              <span className="font-medium">
                                                {courseName}
                                              </span>
                                              <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                                                {courseTutors.length} tutor
                                                {courseTutors.length !== 1 ? "s" : ""}
                                              </span>
                                            </button>
                                            <button
                                              onClick={() => openMoveClass(subject, subarea, courseName)}
                                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                              title="Move to a different subarea"
                                            >
                                              <ArrowRightLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleDeleteClass(subject, subarea, courseName)
                                              }
                                              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                              title="Remove class"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                          {movingClassKey === key && (
                                            <div className="px-5 pb-4 pl-11">
                                              <div className="bg-accent/30 border border-border rounded-lg p-3 grid sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end">
                                                <div>
                                                  <label className="block mb-1 text-xs text-muted-foreground">
                                                    Move to subject
                                                  </label>
                                                  <select
                                                    value={moveTargetSubject}
                                                    onChange={(e) => {
                                                      setMoveTargetSubject(e.target.value);
                                                      setMoveTargetSubarea("");
                                                      setMoveTargetCustomSubarea("");
                                                    }}
                                                    className="w-full px-2 py-1.5 text-sm bg-input-background border border-border rounded-md"
                                                  >
                                                    {Object.keys(classes).map((subj) => (
                                                      <option key={subj} value={subj}>
                                                        {subj}
                                                      </option>
                                                    ))}
                                                    <option value="__new__">+ New subject...</option>
                                                  </select>
                                                </div>
                                                {moveTargetSubject === "__new__" && (
                                                  <div>
                                                    <label className="block mb-1 text-xs text-muted-foreground">
                                                      New subject name
                                                    </label>
                                                    <input
                                                      type="text"
                                                      value={moveTargetCustomSubject}
                                                      onChange={(e) => setMoveTargetCustomSubject(e.target.value)}
                                                      placeholder="e.g. Statistics"
                                                      className="w-full px-2 py-1.5 text-sm bg-input-background border border-border rounded-md"
                                                    />
                                                  </div>
                                                )}
                                                <div>
                                                  <label className="block mb-1 text-xs text-muted-foreground">
                                                    Move to subarea
                                                  </label>
                                                  <select
                                                    value={moveTargetSubarea}
                                                    onChange={(e) => setMoveTargetSubarea(e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm bg-input-background border border-border rounded-md"
                                                  >
                                                    <option value="">Select subarea...</option>
                                                    <option value={UNGROUPED_SUBAREA}>No subarea (directly under subject)</option>
                                                    {Object.keys(
                                                      (moveTargetSubject === "__new__" ? {} : classes[moveTargetSubject]) || {},
                                                    )
                                                      .filter((sub) => sub !== UNGROUPED_SUBAREA)
                                                      .map((sub) => (
                                                        <option key={sub} value={sub}>
                                                          {sub}
                                                        </option>
                                                      ))}
                                                    <option value="__new__">+ New subarea...</option>
                                                  </select>
                                                </div>
                                                {moveTargetSubarea === "__new__" && (
                                                  <div>
                                                    <label className="block mb-1 text-xs text-muted-foreground">
                                                      New subarea name
                                                    </label>
                                                    <input
                                                      type="text"
                                                      value={moveTargetCustomSubarea}
                                                      onChange={(e) => setMoveTargetCustomSubarea(e.target.value)}
                                                      placeholder="e.g. Organic Chemistry"
                                                      className="w-full px-2 py-1.5 text-sm bg-input-background border border-border rounded-md"
                                                    />
                                                  </div>
                                                )}
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={() => handleMoveClass(subject, subarea, courseName)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:shadow-md transition-all"
                                                  >
                                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                                    Move
                                                  </button>
                                                  <button
                                                    onClick={() => setMovingClassKey(null)}
                                                    className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                                                  >
                                                    Cancel
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                          {isOpen && (
                                            <div className="px-5 pb-4 pl-11">
                                              {courseTutors.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                  No tutors assigned to this class yet.
                                                </p>
                                              ) : (
                                                <div className="flex flex-wrap gap-2">
                                                  {courseTutors.map((t) => (
                                                    <span
                                                      key={t._id}
                                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent rounded-full text-sm"
                                                    >
                                                      <User className="w-3.5 h-3.5 text-primary" />
                                                      {t.name}
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Locations Tab */}
        {activeTab === "locations" && (
          <div className="space-y-6">
            <div>
              <h2>Manage In-Person Locations</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {locations.length} location{locations.length !== 1 ? "s" : ""} available for tutors to choose as meeting spots.
              </p>
            </div>

            {/* Add Location Form */}
            <div className="bg-card rounded-lg p-5 shadow-md border-2 border-border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Add a New Location
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddLocation();
                    }
                  }}
                  placeholder="e.g. Powell Library, Room 220"
                  className="flex-1 px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleAddLocation}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Location
                </button>
              </div>
            </div>

            {/* Location list */}
            {locations.length === 0 ? (
              <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-border">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No locations yet. Add one above — tutors will be able to pick from this list for in-person sessions.
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-lg shadow-md border-2 border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {locations.map((loc) => (
                    <div
                      key={loc}
                      className="px-5 py-3 flex items-center justify-between gap-3"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        {loc}
                      </span>
                      <button
                        onClick={() => handleDeleteLocation(loc)}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Remove location"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review Sessions Tab */}
        {activeTab === "reviews" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2>Manage Review Sessions</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {upcomingReviewSessions.length} upcoming ·{" "}
                  {pastReviewSessions.length} past
                </p>
              </div>
              <button
                onClick={() => setShowCreateSession(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                Create New Session
              </button>
            </div>

            {/* Upcoming Sessions */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Upcoming Sessions
              </h3>
              <div className="grid gap-4">
                {upcomingReviewSessions.length === 0 ? (
                  <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-border">
                    <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      No upcoming review sessions.
                    </p>
                  </div>
                ) : (
                  upcomingReviewSessions.map((session) => (
                    <div
                      key={session._id}
                      className="bg-card rounded-lg p-6 shadow-md border-2 border-border"
                    >
                      {editingSessionId === session._id &&
                      editSessionDraft ? (
                        <div className="space-y-4">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block mb-1.5 text-sm text-muted-foreground">
                                Date
                              </label>
                              <input
                                type="date"
                                value={editSessionDraft.dateISO}
                                onChange={(e) =>
                                  setEditSessionDraft({
                                    ...editSessionDraft,
                                    dateISO: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="block mb-1.5 text-sm text-muted-foreground">
                                Location
                              </label>
                              <input
                                type="text"
                                value={editSessionDraft.location}
                                onChange={(e) =>
                                  setEditSessionDraft({
                                    ...editSessionDraft,
                                    location: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="block mb-1.5 text-sm text-muted-foreground">
                                Start Time
                              </label>
                              <input
                                type="time"
                                value={editSessionDraft.startTime}
                                onChange={(e) =>
                                  setEditSessionDraft({
                                    ...editSessionDraft,
                                    startTime: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="block mb-1.5 text-sm text-muted-foreground">
                                End Time
                              </label>
                              <input
                                type="time"
                                value={editSessionDraft.endTime}
                                onChange={(e) =>
                                  setEditSessionDraft({
                                    ...editSessionDraft,
                                    endTime: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block mb-1.5 text-sm text-muted-foreground">
                              Courses
                            </label>
                            <div className="flex flex-wrap gap-2 p-3 bg-input-background border border-border rounded-md max-h-40 overflow-y-auto">
                              {allCourses.map((course) => (
                                <button
                                  key={course}
                                  type="button"
                                  onClick={() =>
                                    toggleEditDraftCourse(course)
                                  }
                                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                    editSessionDraft.courses.includes(
                                      course,
                                    )
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-card border-border hover:border-primary/50"
                                  }`}
                                >
                                  {course}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={handleCancelEditSession}
                              className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() =>
                                handleSaveEditSession(session._id)
                              }
                              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
                            >
                              <Save className="w-4 h-4" /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <h4 className="font-semibold text-lg text-primary">
                              {session.className}
                            </h4>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() =>
                                  handleStartEditSession(session)
                                }
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Edit session"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteReviewSession(session._id)
                                }
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                title="Delete session"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>
                                <strong>Date:</strong> {session.date}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>
                                <strong>Time:</strong> {session.time}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span>
                                <strong>Location:</strong>{" "}
                                {session.location}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span>
                                <strong>RSVPs:</strong>{" "}
                                {session.attendees?.length || 0}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Past Sessions (collapsed, read-only) */}
            <div className="space-y-3">
              <button
                onClick={() =>
                  setShowPastReviewSessions(!showPastReviewSessions)
                }
                className="w-full flex items-center justify-between gap-2 px-5 py-3 bg-card rounded-lg shadow-md border-2 border-border hover:border-primary/40 transition-colors"
              >
                <span className="font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  Past Sessions ({pastReviewSessions.length})
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    showPastReviewSessions ? "" : "-rotate-90"
                  }`}
                />
              </button>

              {showPastReviewSessions && (
                <div className="grid gap-4">
                  {pastReviewSessions.length === 0 ? (
                    <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-border">
                      <p className="text-muted-foreground">
                        No past review sessions.
                      </p>
                    </div>
                  ) : (
                    pastReviewSessions.map((session) => (
                      <div
                        key={session._id}
                        className="bg-card rounded-lg p-6 shadow-md border-2 border-border opacity-75"
                      >
                        <h4 className="font-semibold text-lg text-primary mb-3">
                          {session.className}
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>Date:</strong> {session.date}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>Time:</strong> {session.time}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>Location:</strong> {session.location}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>RSVPs:</strong>{" "}
                              {session.attendees?.length || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Create Session Modal */}
            {showCreateSession && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-card rounded-xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
                  <button
                    onClick={() => setShowCreateSession(false)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h2 className="mb-6">Create New Review Session</h2>
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1.5 text-sm">
                          Date <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="date"
                          value={newSessionDate}
                          onChange={(e) =>
                            setNewSessionDate(e.target.value)
                          }
                          className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm">
                          Location{" "}
                          <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={newSessionLocation}
                          onChange={(e) =>
                            setNewSessionLocation(e.target.value)
                          }
                          placeholder="e.g. Young Hall 3069"
                          className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm">
                          Start Time{" "}
                          <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="time"
                          value={newSessionStartTime}
                          onChange={(e) =>
                            setNewSessionStartTime(e.target.value)
                          }
                          className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm">
                          End Time{" "}
                          <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="time"
                          value={newSessionEndTime}
                          onChange={(e) =>
                            setNewSessionEndTime(e.target.value)
                          }
                          className="w-full px-3 py-2 bg-input-background border border-border rounded-md focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm">
                        Courses <span className="text-destructive">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2 p-3 bg-input-background border border-border rounded-md max-h-40 overflow-y-auto">
                        {allCourses.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No classes exist yet — add some in the Classes
                            tab first.
                          </p>
                        ) : (
                          allCourses.map((course) => (
                            <button
                              key={course}
                              type="button"
                              onClick={() =>
                                toggleNewSessionCourse(course)
                              }
                              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                newSessionCourses.includes(course)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card border-border hover:border-primary/50"
                              }`}
                            >
                              {course}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowCreateSession(false)}
                        className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateReviewSession}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
                      >
                        Create Session
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2>Student Accounts</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {students.length} registered student{students.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {students.length === 0 ? (
              <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-border">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No student accounts registered yet.</p>
              </div>
            ) : (() => {
              const filtered = students.filter(s =>
                s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                s.email?.toLowerCase().includes(studentSearch.toLowerCase())
              );
              if (filtered.length === 0) {
                return (
                  <div className="bg-card rounded-lg p-8 text-center border-2 border-dashed border-border">
                    <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No students match your search.</p>
                  </div>
                );
              }
              return (
                <div className="grid gap-4">
                  {filtered.map((student) => (
                    <div
                      key={student._id}
                      className="bg-card rounded-lg p-5 shadow-md border-2 border-border hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-base">{student.name}</p>
                              {student.onHold && (
                                <span
                                  className="px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full"
                                  title={
                                    student.holdReason === 'strikes'
                                      ? 'Automatic hold — 3 cancelled sessions'
                                      : 'Set by an admin'
                                  }
                                >
                                  On Hold
                                  {student.holdReason === 'strikes' && ' · 3 cancellations'}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {student.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>
                            <strong className="text-foreground">{student.bookingCount}</strong> booking{student.bookingCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {student.cancelCount > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {student.cancelCount} cancellation{student.cancelCount !== 1 ? 's' : ''} on record
                        </p>
                      )}

                      {student.latestBooking && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Latest Booking</p>
                          <p className="text-sm">
                            <span className="font-medium">{student.latestBooking.class}</span>
                            <span className="text-muted-foreground"> · {student.latestBooking.date}</span>
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-3 flex items-center justify-end gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground select-none">
                            {student.onHold ? 'On hold' : 'Active'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={student.onHold}
                            onClick={() => handleToggleStudentHold(student._id, student.onHold)}
                            title={student.onHold ? 'Click to release hold' : 'Click to put on hold'}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                              student.onHold ? 'bg-destructive' : 'bg-muted-foreground/30'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                student.onHold ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <button
                          onClick={() => handleDeleteStudent(student._id, student.name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-destructive border border-destructive/40 rounded-lg hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Account
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Email Template Tab */}
        {activeTab === "email" && (
          <div className="space-y-6">
            <div>
              <h2>Email Templates</h2>
              <p className="text-sm text-muted-foreground mt-1">
                These 5 templates cover the whole booking lifecycle — sent automatically at the right moment. Use the placeholders below — they'll be filled in automatically for each booking.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.keys(EMAIL_TEMPLATE_LABELS) as EmailTemplateKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedTemplateKey(key)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedTemplateKey === key
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card border border-border hover:border-primary/50"
                  }`}
                >
                  {EMAIL_TEMPLATE_LABELS[key]}
                </button>
              ))}
            </div>

            <div className="bg-card rounded-lg p-6 shadow-md border-2 border-border space-y-4">
              <div>
                <label htmlFor="emailTemplate" className="block mb-1.5 text-sm font-medium">
                  {EMAIL_TEMPLATE_LABELS[selectedTemplateKey]}
                </label>
                <textarea
                  id="emailTemplate"
                  value={emailTemplates[selectedTemplateKey] || ''}
                  onChange={(e) =>
                    setEmailTemplates((prev) => ({ ...prev, [selectedTemplateKey]: e.target.value }))
                  }
                  rows={16}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-md font-mono text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {["{{studentName}}", "{{class}}", "{{tutor}}", "{{tutorEmail}}", "{{date}}", "{{startTime}}", "{{endTime}}", "{{duration}}", "{{location}}", "{{topics}}"].map((ph) => (
                  <code key={ph} className="px-2 py-1 bg-muted rounded">{ph}</code>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveEmailTemplate}
                  disabled={isSavingTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSavingTemplate ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Announcement Tab */}
        {activeTab === "announcement" && (
          <div className="space-y-6">
            <div>
              <h2>Homepage Announcement</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Shown in a banner at the top of the homepage, right below "Welcome to Alpha Chi Sigma Tutoring." Leave it empty to hide the banner entirely. Just plain text — no need to type any code.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-md border-2 border-border space-y-4">
              <div>
                <label htmlFor="announcement" className="block mb-1.5 text-sm font-medium">
                  Announcement
                </label>
                <textarea
                  id="announcement"
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  rows={6}
                  placeholder="Important: Spring tutoring hours begin next week. Check back for updated schedules!"
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-md text-sm"
                />
              </div>

              {announcement && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Preview</p>
                  <div className="p-4 bg-blue-50 border-2 border-primary/20 rounded-xl">
                    <p className="text-center whitespace-pre-line">{announcement}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSaveAnnouncement}
                  disabled={isSavingAnnouncement}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSavingAnnouncement ? "Saving..." : "Save Announcement"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}