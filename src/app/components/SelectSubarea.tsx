import { ChevronLeft } from 'lucide-react';
import { UNGROUPED_SUBAREA } from '../utils/api';

interface SelectSubareaProps {
  subject: string;
  subareas: string[];
  // Whether this subject also has classes filed with no subarea at all —
  // subareas are optional, so those are offered as one extra choice here
  // rather than forcing every class into a named subsection.
  hasUngrouped?: boolean;
  onBack: () => void;
  onSelectSubarea: (subarea: string) => void;
}

export default function SelectSubarea({ subject, subareas, hasUngrouped, onBack, onSelectSubarea }: SelectSubareaProps) {
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

        <h1 className="text-center mb-2">Select an Area of {subject}</h1>
        <p className="text-center text-muted-foreground mb-8">Choose the area your class falls under</p>

        <div className="space-y-3">
          {subareas.map((subarea) => (
            <button
              key={subarea}
              onClick={() => onSelectSubarea(subarea)}
              className="w-full px-6 py-4 bg-card border border-border rounded-lg hover:border-primary hover:shadow-md transition-all text-lg"
            >
              {subarea}
            </button>
          ))}
          {hasUngrouped && (
            <button
              onClick={() => onSelectSubarea(UNGROUPED_SUBAREA)}
              className="w-full px-6 py-4 bg-card border border-dashed border-border rounded-lg hover:border-primary hover:shadow-md transition-all text-lg text-muted-foreground"
            >
              Other {subject} classes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
