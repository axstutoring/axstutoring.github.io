import { useNavigate } from 'react-router';
import { ChevronLeft, Shield, Mail, Atom, TestTube, Dna } from 'lucide-react';
import coatOfArms from '../../imports/coat-of-arms.jpg';

export default function Policies() {
  const navigate = useNavigate();

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
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-primary text-primary-foreground shadow-xl py-8">
          <div className="max-w-4xl mx-auto px-4">
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
                <h1 className="text-3xl font-bold mb-1">Tutoring Policies</h1>
                <p className="text-sm opacity-90">Alpha Chi Sigma</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-3xl w-full">
            <div className="bg-card rounded-2xl shadow-2xl p-8 md:p-12 border-2 border-primary/20">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-full">
                  <Shield className="w-12 h-12 text-primary" />
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6 text-center">
                <h2 className="text-2xl font-semibold text-primary">
                  Booking Guidelines
                </h2>

                <div className="space-y-4 text-left bg-blue-50 rounded-xl p-6 border-2 border-primary/20">
                  <p className="leading-relaxed">
                    A maximum of <strong className="text-primary">two appointments per week</strong> or{' '}
                    <strong className="text-primary">four bookings per month</strong> (with each appointment 
                    being up to one hour) can be reserved.
                  </p>
                  
                  <p className="leading-relaxed">
                    Timeslots with tutors can be reserved up to{' '}
                    <strong className="text-primary">7 days in advance</strong> and close{' '}
                    <strong className="text-primary">2 days prior</strong> to the start of the session.
                  </p>
                </div>

                <div className="pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-4">
                    For other inquiries, please contact the Alpha Chi Sigma Tutoring Chairs
                  </p>
                  
                  <a
                    href="mailto:tutoring.axsbg@gmail.com"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
                  >
                    <Mail className="w-5 h-5" />
                    tutoring.axsbg@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
