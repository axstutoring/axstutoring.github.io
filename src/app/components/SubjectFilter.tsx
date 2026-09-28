import { BookOpen, Atom, Calculator, FlaskConical, Globe, Microscope } from 'lucide-react';

const subjectIcons: Record<string, React.ReactNode> = {
  'General Chemistry': <Atom className="w-4 h-4" />,
  'Organic Chemistry': <FlaskConical className="w-4 h-4" />,
  'Physical Chemistry': <Calculator className="w-4 h-4" />,
  'Biochemistry': <Microscope className="w-4 h-4" />,
  'All Subjects': <BookOpen className="w-4 h-4" />,
};

interface SubjectFilterProps {
  subjects: string[];
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
}

export default function SubjectFilter({ subjects, selectedSubject, onSelectSubject }: SubjectFilterProps) {
  const allSubjects = ['All Subjects', ...subjects];

  return (
    <div className="flex flex-wrap gap-2">
      {allSubjects.map((subject) => (
        <button
          key={subject}
          onClick={() => onSelectSubject(subject)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            selectedSubject === subject
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border hover:bg-accent'
          }`}
        >
          {subjectIcons[subject] || <BookOpen className="w-4 h-4" />}
          <span>{subject}</span>
        </button>
      ))}
    </div>
  );
}
