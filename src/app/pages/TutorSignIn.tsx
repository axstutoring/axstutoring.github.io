import { useState } from "react";
import { useNavigate } from "react-router";
import {
  GraduationCap,
  Atom,
  TestTube,
  Dna,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import coatOfArms from "../../imports/coat-of-arms.jpg";
import { tutorSignin } from "../utils/api";

export default function TutorSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const tutor = await tutorSignin(email, password);
      toast.success("Signed in as Tutor", {
        description: `Welcome back, ${tutor.name}!`,
      });
      navigate("/tutor");
    } catch (err: any) {
      toast.error("Sign in failed", {
        description: err?.message || "Invalid email or password.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
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

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 p-4 bg-white rounded-full shadow-lg">
          <img
            src={coatOfArms}
            alt="Alpha Chi Sigma"
            className="w-20 h-20 object-contain"
          />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="w-8 h-8 text-primary" />
          <h1 className="text-center text-primary font-bold text-2xl">
            Tutor Sign In
          </h1>
        </div>

        <p className="mb-8 text-center text-muted-foreground">
          Sign in to manage your tutoring sessions
        </p>

        {/* Sign In Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full space-y-6"
        >
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
              placeholder="tutor@example.com"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-lg focus:outline-none focus:border-primary transition-colors pr-12"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all text-lg shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>

          {/* Create Account Button */}
          <button
            type="button"
            onClick={() => navigate("/login/tutor/signup")}
            className="w-full px-8 py-4 bg-card border-2 border-primary text-primary font-semibold rounded-xl hover:shadow-lg hover:border-blue-600 transition-all text-lg"
          >
            Create Account
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={() => navigate("/login/tutor/forgot-password")}
            className="text-sm text-muted-foreground hover:text-primary underline transition-colors"
          >
            Forgot Password?
          </button>
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-muted-foreground hover:text-primary underline transition-colors"
          >
            Back to Role Selection
          </button>
        </div>
      </div>
    </div>
  );
}