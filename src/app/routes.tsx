import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";

// Every page except Home (the landing page most visitors hit first) is
// code-split into its own chunk and only downloaded when actually
// navigated to — the student/tutor/admin dashboards are by far the
// largest pages, and most visitors never open more than one of them.
const RoleSelection = lazy(() => import("./pages/RoleSelection"));
const TutorSignIn = lazy(() => import("./pages/TutorSignIn"));
const TutorSignUp = lazy(() => import("./pages/TutorSignUp"));
const TutorDashboard = lazy(() => import("./pages/TutorDashboard"));
const StudentSignIn = lazy(() => import("./pages/StudentSignIn"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const StudentSignUp = lazy(() => import("./pages/StudentSignUp"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const VerifyCode = lazy(() => import("./pages/VerifyCode"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TutorForgotPassword = lazy(() => import("./pages/TutorForgotPassword"));
const TutorVerifyCode = lazy(() => import("./pages/TutorVerifyCode"));
const TutorResetPassword = lazy(() => import("./pages/TutorResetPassword"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminSignIn = lazy(() => import("./pages/AdminSignIn"));
const Policies = lazy(() => import("./pages/Policies"));
const ReviewSessions = lazy(() => import("./pages/ReviewSessions"));
const NoTutorsAvailable = lazy(() => import("./pages/NoTutorsAvailable"));

// Small, dependency-free loading state shown only for the brief moment a
// lazy page's chunk is downloading (typically well under a second).
function PageFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

// Wraps a lazy-loaded page component with the Suspense boundary it needs.
function lazyPage(Component: ComponentType) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/login",
    element: lazyPage(RoleSelection),
  },
  {
    path: "/login/tutor",
    element: lazyPage(TutorSignIn),
  },
  {
    path: "/login/tutor/signup",
    element: lazyPage(TutorSignUp),
  },
  {
    path: "/login/tutor/forgot-password",
    element: lazyPage(TutorForgotPassword),
  },
  {
    path: "/login/tutor/verify-code",
    element: lazyPage(TutorVerifyCode),
  },
  {
    path: "/login/tutor/reset-password",
    element: lazyPage(TutorResetPassword),
  },
  {
    path: "/tutor",
    element: lazyPage(TutorDashboard),
  },
  {
    path: "/login/student",
    element: lazyPage(StudentSignIn),
  },
  {
    path: "/student",
    element: lazyPage(StudentDashboard),
  },
  {
    path: "/login/student/signup",
    element: lazyPage(StudentSignUp),
  },
  {
    path: "/login/student/forgot-password",
    element: lazyPage(ForgotPassword),
  },
  {
    path: "/login/student/verify-code",
    element: lazyPage(VerifyCode),
  },
  {
    path: "/login/student/reset-password",
    element: lazyPage(ResetPassword),
  },
  {
    path: "/login/admin",
    element: lazyPage(AdminSignIn),
  },
  {
    path: "/admin",
    element: lazyPage(AdminDashboard),
  },
  {
    path: "/policies",
    element: lazyPage(Policies),
  },
  {
    path: "/review-sessions",
    element: lazyPage(ReviewSessions),
  },
  {
    path: "/no-tutors-available",
    element: lazyPage(NoTutorsAvailable),
  },
], {
  // Must match vite.config.ts's `base` — Vite serves the app under this
  // prefix, but React Router has no way to know that on its own. "/" since
  // this is the axstutoring.github.io root site, not a /tutoring/ subpath.
  basename: "/",
});
