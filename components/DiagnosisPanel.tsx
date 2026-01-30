import React, { useState, useEffect } from 'react';
import { Patient } from '../types';
import { Stethoscope, Syringe, CheckCircle, XCircle, Sparkles, ArrowRight, ExternalLink, BookOpen } from 'lucide-react';

interface DiagnosisPanelProps {
  patient: Patient;
  onDiagnose: (success: boolean) => void;
  onTreat: () => void;
  phase: 'IDLE' | 'DIAGNOSING' | 'TREATING' | 'COMPLETED';
}

export const DiagnosisPanel: React.FC<DiagnosisPanelProps> = ({ patient, onDiagnose, onTreat, phase }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const isTreatmentPhase = phase === 'TREATING';

  // Reset state when phase changes (e.g. Diagnosis -> Treatment)
  useEffect(() => {
    setSelectedOption(null);
    setFeedback(null);
  }, [phase, patient.id]);

  const handleSelection = (idx: number) => {
    if (feedback) return; // Prevent clicking during feedback
    
    setSelectedOption(idx);
    
    const correctIndex = isTreatmentPhase ? patient.correctTreatmentIndex : patient.correctDiagnosisIndex;
    const isCorrect = idx === correctIndex;
    
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      // Auto-advance on correct answer
      setTimeout(() => {
        if (isTreatmentPhase) {
            onTreat();
        } else {
            onDiagnose(true);
        }
      }, 1500);
    } else {
      // Reset to allow retry on incorrect answer
      setTimeout(() => {
        setFeedback(null);
        setSelectedOption(null);
      }, 1500);
    }
  };

  // --- Completed View ---
  if (phase === 'COMPLETED') {
    return (
      <div className="bg-green-50 rounded-3xl p-5 shadow-md border border-green-100 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in h-auto min-h-[250px]">
        <div className="flex flex-col items-center gap-2">
             <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-inner flex-shrink-0">
               <Sparkles className="w-6 h-6" />
             </div>
             <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-widest opacity-80 mb-1">Treatment Successful</p>
                <h3 className="text-2xl font-black text-green-800 tracking-tight leading-none px-4">{patient.ailment}</h3>
             </div>
        </div>

        <div className="bg-white/60 p-4 rounded-xl border border-green-100 shadow-sm w-full">
            <p className="text-green-800/90 font-medium leading-relaxed text-sm sm:text-base">
                {patient.treatmentDescription}
            </p>
        </div>
        
        {/* Learn More Link */}
        <div className="pt-1">
            <a 
              href={`https://www.google.com/search?q=${encodeURIComponent(patient.ailment + " medical condition")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-green-700 bg-white px-4 py-1.5 rounded-full shadow-sm border border-green-200 hover:border-green-300 hover:bg-green-50 transition-all font-bold group text-xs sm:text-sm"
            >
              <BookOpen className="w-4 h-4 text-green-500" />
              <span>Learn about {patient.ailment}</span>
              <ExternalLink className="w-3 h-3 opacity-50 ml-0.5" />
            </a>
        </div>
      </div>
    );
  }

  // --- Active View (Diagnose or Treat) ---
  const options = isTreatmentPhase ? patient.treatmentOptions : patient.diagnosisOptions;
  const themeColor = isTreatmentPhase ? 'teal' : 'purple';
  const Icon = isTreatmentPhase ? Syringe : Stethoscope;
  const title = isTreatmentPhase ? 'Choose the best treatment' : 'Choose the best diagnosis';

  // Dynamic Styles
  const containerBorder = isTreatmentPhase ? 'border-teal-100' : 'border-purple-100';
  const iconBg = isTreatmentPhase ? 'bg-teal-100' : 'bg-purple-100';
  const iconColor = isTreatmentPhase ? 'text-teal-600' : 'text-purple-600';
  const titleColor = isTreatmentPhase ? 'text-teal-900' : 'text-purple-900';
  const selectionColor = isTreatmentPhase ? 'bg-teal-50 border-teal-400 text-teal-900' : 'bg-purple-50 border-purple-400 text-purple-900';
  const hoverColor = isTreatmentPhase ? 'hover:border-teal-200 hover:bg-teal-50/50' : 'hover:border-purple-200 hover:bg-purple-50/50';

  return (
    <div className={`relative bg-white rounded-3xl p-5 shadow-md border ${containerBorder} flex flex-col h-full transition-colors duration-500 overflow-hidden`}>
      
      {/* Success Overlay for Intermediate Steps */}
      {feedback === 'correct' && (
        <div className="absolute inset-0 z-20 bg-green-500/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in zoom-in duration-200">
           <div className="bg-white p-6 rounded-full shadow-2xl mb-6 animate-bounce">
             <CheckCircle className="w-20 h-20 text-green-500" />
           </div>
           <h2 className="text-5xl font-black text-white tracking-widest drop-shadow-lg mb-4">CORRECT!</h2>
           <p className="text-green-50 font-bold text-xl animate-pulse flex items-center gap-2">
             {isTreatmentPhase ? "Treatment effective!" : "Diagnosis confirmed!"}
           </p>
        </div>
      )}

      <div className="flex items-center space-x-3 mb-4">
        <div className={`${iconBg} p-2 rounded-lg ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className={`text-lg font-bold ${titleColor}`}>{title}</h3>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[400px]">
        {options.map((option, idx) => {
           let btnClass = "w-full text-left p-3.5 rounded-xl border-2 transition-all font-medium text-slate-700 text-sm sm:text-base ";
           
           if (feedback === 'correct' && idx === (isTreatmentPhase ? patient.correctTreatmentIndex : patient.correctDiagnosisIndex)) {
             btnClass += "bg-green-100 border-green-400 text-green-800 scale-[1.01] shadow-sm";
           } else if (feedback === 'incorrect' && idx === selectedOption) {
             btnClass += "bg-red-100 border-red-400 text-red-800 animate-shake";
           } else if (selectedOption === idx) {
             btnClass += `${selectionColor} shadow-sm`;
           } else {
             btnClass += `bg-white border-slate-100 ${hoverColor}`;
           }

           return (
             <button
              key={idx}
              onClick={() => !feedback && handleSelection(idx)}
              className={btnClass}
              disabled={!!feedback}
             >
               <div className="flex items-center justify-between">
                 <span>{option}</span>
                 {selectedOption === idx && !feedback && (
                    <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isTreatmentPhase ? 'bg-teal-400' : 'bg-purple-400'}`}/>
                 )}
                 {feedback === 'incorrect' && idx === selectedOption && <XCircle className="w-5 h-5 text-red-600 animate-scale-in" />}
               </div>
             </button>
           );
        })}
      </div>
      
      {/* Bottom Area Filler */}
       <div className="mt-4 text-center h-6">
          {feedback === 'incorrect' && (
              <span className="text-red-500 font-bold text-sm animate-fade-in">
                  Not quite right. Try again!
              </span>
          )}
      </div>
    </div>
  );
};