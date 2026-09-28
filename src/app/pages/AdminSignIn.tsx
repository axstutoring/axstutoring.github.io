import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ShieldCheck, Atom, FlaskConical, Dna, Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';
import coatOfArms from '../../imports/coat-of-arms.jpg';
import { adminSignin } from '../utils/api';

export default function AdminSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await adminSignin(email, password);
      toast.success('Signed in as Administrator', {
        description: 'Welcome to the admin dashboard!',
      });
      navigate('/admin');
    } catch (err: any) {
      toast.error('Invalid administrator credentials', {
        description: err?.message || 'Please check your email and password.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background Science Motifs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 opacity-5">
          <Atom className="w-48 h-48 text-primary" strokeWidth={1} />
        </div>
        <div className="absolute top-20 right-16 opacity-5">
          <FlaskConical className="w-32 h-32 text-secondary" strokeWidth={1} />
        </div>
        <div className="absolute bottom-32 left-20 opacity-5">
          <Dna className="w-40 h-40 text-primary" strokeWidth={1} />
        </div>
        <div className="absolute bottom-16 right-10 opacity-5">
          <Atom className="w-56 h-56 text-secondary" strokeWidth={1} />
        </div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 p-4 bg-white rounded-full shadow-lg">
          <img
            src={coatOfArms}
            alt="Alpha Chi Sigma"
            className="w-20 h-20 object-contain"
          />
        </div>

        {/* Admin badge */}
        <div className="mb-4 flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/30 rounded-full">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Administrator Access</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <Lock className="w-7 h-7 text-primary" />
          <h1 className="text-center text-primary">
            Admin Sign In
          </h1>
        </div>

        <p className="mb-8 text-center text-muted-foreground text-sm">
          Restricted to Alpha Chi Sigma tutoring administrators
        </p>

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">
              Administrator Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-lg focus:outline-none focus:border-primary transition-colors pr-12"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all text-lg shadow-md disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-muted-foreground hover:text-primary underline transition-colors"
          >
            Back to Role Selection
          </button>
        </div>
      </div>
    </div>
  );
}
