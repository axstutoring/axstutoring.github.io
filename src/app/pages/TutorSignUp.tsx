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
import { tutorSignup } from "../utils/api";

export default function TutorSignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await tutorSignup(name, email, password);
      toast.success("Application submitted!", {
        description: "An admin will review your application. You'll be able to sign in once it's approved.",
      });
      navigate("/login/tutor");
    } catch (err: any) {
      toast.error("Could not create account", {
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <div className="mb-8 p-4 bg-white rounded-full shadow-lg">
          <img
            src={coatOfArms}
            alt="Alpha Chi Sigma"
            className="w-20 h-20 object-contain"
          />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="w-8 h-8 text-primary" />
          <h1 className="text-center text-primary font-bold text-2xl">
            Tutor Registration
          </h1>
        </div>

        <p className="mb-8 text-center text-muted-foreground">
          Apply to become a tutor with Alpha Chi Sigma
        </p>

        <form
          onSubmit={handleSubmit}
          className="w-full space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-lg focus:outline-none focus:border-primary"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              pattern=".+@g\.ucla\.edu"
              title="Must be your @g.ucla.edu email address"
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-lg focus:outline-none focus:border-primary"
              placeholder="yourname@g.ucla.edu"
            />
            <p className="text-xs text-muted-foreground mt-1">
              You must use your <strong>@g.ucla.edu</strong> email address to sign up.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-lg focus:outline-none focus:border-primary pr-12"
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
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
            className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-xl transition-all text-lg shadow-md mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6">
          <button
            onClick={() => navigate("/login/tutor")}
            className="text-sm text-muted-foreground hover:text-primary underline"
          >
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </div>
  );
}