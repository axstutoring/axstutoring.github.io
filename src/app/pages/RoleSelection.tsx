import { useNavigate } from 'react-router';
import { User, GraduationCap, Atom, TestTube, Dna, ShieldCheck } from 'lucide-react';
import coatOfArms from '../../imports/coat-of-arms.jpg';

export default function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
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
        <h1 className="mb-4 text-center text-primary">
          Sign In As
        </h1>

        <p className="mb-12 text-center text-muted-foreground">
          Please select your role to continue
        </p>

        {/* Role Selection Buttons */}
        <div className="w-full space-y-4">
          <button
            onClick={() => navigate('/login/tutor')}
            className="group w-full px-8 py-6 bg-primary text-primary-foreground rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all text-lg shadow-md flex items-center justify-center gap-3"
          >
            <GraduationCap className="w-6 h-6 group-hover:scale-110 transition-transform" />
            Tutor
          </button>

          <button
            onClick={() => navigate('/login/student')}
            className="group w-full px-8 py-6 bg-card border-2 border-primary rounded-xl hover:shadow-lg hover:border-blue-600 transition-all text-lg flex items-center justify-center gap-3"
          >
            <User className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            Student
          </button>
        </div>

        {/* Back to Home */}
        <button
          onClick={() => navigate('/')}
          className="mt-8 text-sm text-muted-foreground hover:text-primary underline transition-colors"
        >
          Back to Home
        </button>

        {/* Admin link */}
        <button
          onClick={() => navigate('/login/admin')}
          className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <ShieldCheck className="w-3 h-3" />
          Administrator Login
        </button>
      </div>
    </div>
  );
}
