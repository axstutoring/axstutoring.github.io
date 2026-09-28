import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Shield, Atom, TestTube, Dna } from 'lucide-react';
import { toast } from 'sonner';
import coatOfArms from '../../imports/coat-of-arms.jpg';
import { verifyResetCode, requestPasswordReset } from '../utils/api';

export default function VerifyCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const email: string | undefined = (location.state as any)?.email;
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!email) {
    navigate('/login/student/forgot-password');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { resetToken } = await verifyResetCode(email, code);
      toast.success('Code verified!', {
        description: 'You can now reset your password.',
      });
      navigate('/login/student/reset-password', { state: { resetToken } });
    } catch (err: any) {
      toast.error('Invalid code', {
        description: err?.message || 'The verification code you entered is incorrect.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await requestPasswordReset(email);
      toast.success('New code sent!', {
        description: `A new verification code has been sent to ${email}.`,
      });
    } catch (err: any) {
      toast.error('Could not resend code', { description: err?.message });
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
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-center text-primary">
            Enter Verification Code
          </h1>
        </div>

        <p className="mb-8 text-center text-muted-foreground">
          We've sent a 6-digit verification code to your email
        </p>

        {/* Verification Code Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="space-y-2">
            <label htmlFor="code" className="block text-sm font-medium">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-center text-2xl tracking-widest"
              placeholder="000000"
            />
            <p className="text-xs text-muted-foreground text-center">
              Code expires in 10 minutes
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all text-lg shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSubmitting ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={handleResendCode}
            className="text-sm text-primary hover:underline"
          >
            Resend Code
          </button>
          <button
            onClick={() => navigate('/login/student')}
            className="text-sm text-muted-foreground hover:text-primary underline transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
