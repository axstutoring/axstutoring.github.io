import { ChevronLeft } from 'lucide-react';

interface SelectClassProps {
  subject: string;
  classes: string[];
  onBack: () => void;
  onSelectClass: (className: string) => void;
}

export default function SelectClass({ subject, classes, onBack, onSelectClass }: SelectClassProps) {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1 mb-8 text-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <h1 className="text-center mb-8">Select a Class</h1>

        <div className="space-y-3">
          {classes.map((className) => (
            <button
              key={className}
              onClick={() => onSelectClass(className)}
              className="w-full px-6 py-4 bg-card border border-border rounded-lg hover:border-primary hover:shadow-md transition-all text-lg"
            >
              {className}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
