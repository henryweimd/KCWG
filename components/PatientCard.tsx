
import React, { useState, useRef, useEffect } from 'react';
import { Patient, MedicalTerm } from '../types';
import { ClipboardList, User, Sparkles, Briefcase, Calendar, Image as ImageIcon, Loader2, Stethoscope, Play, Square, ChevronDown, ChevronUp, CheckCircle, Activity, Quote, Repeat, History, Info } from 'lucide-react';

interface PatientCardProps {
  patient: Patient;
  hidden?: boolean;
  collapsed?: boolean;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, hidden = false, collapsed = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const [hoveredTerm, setHoveredTerm] = useState<MedicalTerm | null>(null);
  // Fix: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout to resolve "Cannot find namespace 'NodeJS'" error.
  const [tooltipTimer, setTooltipTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Sync internal state if prop changes, but allow user override if they interact
  useEffect(() => {
    setIsExpanded(!collapsed);
  }, [collapsed, patient.id]);

  // Stop audio if patient changes
  useEffect(() => {
    stopAudio();
  }, [patient.id]);

  if (hidden) return null;

  // Fallbacks for legacy data
  const displayAge = patient.age || 25;
  const displayGender = patient.gender || patient.species || "Unknown";
  const displayOccupation = patient.occupation || "Villager";
  const visitCount = patient.visitCount || 1;
  const visitReason = patient.visitReason || "New Patient";

  // --- Audio Helpers ---
  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async function playAudio() {
    if (!patient.audioData) return;
    
    try {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        }

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const arrayBuffer = decode(patient.audioData).buffer;
        
        const int16Data = new Int16Array(arrayBuffer);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
            float32Data[i] = int16Data[i] / 32768.0;
        }

        const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
        audioBuffer.copyToChannel(float32Data, 0);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.loop = true; 
        
        source.onended = () => setIsPlaying(false);
        source.start();
        
        sourceRef.current = source;
        setIsPlaying(true);

    } catch (e) {
        console.error("Error playing audio", e);
        setIsPlaying(false);
    }
  }

  function stopAudio() {
    if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
    }
    setIsPlaying(false);
  }

  const toggleAudio = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPlaying) {
          stopAudio();
      } else {
          playAudio();
      }
  };

  const getAudioLabel = (type?: string) => {
      switch(type) {
          case 'Heart': return 'Heart';
          case 'Lungs': return 'Lungs';
          case 'Abdomen': return 'Bowel';
          default: return 'Listen';
      }
  };

  // --- Glossary & Tooltip Helpers ---
  const handleTermHover = (term: MedicalTerm) => {
    if (tooltipTimer) clearTimeout(tooltipTimer);
    setHoveredTerm(term);
    
    // Auto fade after 5 seconds of being shown
    const timer = setTimeout(() => {
        setHoveredTerm(null);
    }, 5000);
    setTooltipTimer(timer);
  };

  const renderTextWithGlossary = (text: string) => {
    if (!patient.glossary || patient.glossary.length === 0) return text;

    // Fix: Use React.ReactNode instead of JSX.Element to resolve "Cannot find namespace 'JSX'" error.
    let parts: React.ReactNode[] = [text];
    
    patient.glossary.forEach((item) => {
        const termRegex = new RegExp(`(${item.term})`, 'gi');
        // Fix: Use React.ReactNode instead of JSX.Element to resolve "Cannot find namespace 'JSX'" error.
        const nextParts: React.ReactNode[] = [];
        
        parts.forEach((part) => {
            if (typeof part !== 'string') {
                nextParts.push(part);
                return;
            }
            
            const split = part.split(termRegex);
            split.forEach((subPart, i) => {
                if (subPart.toLowerCase() === item.term.toLowerCase()) {
                    nextParts.push(
                        <span 
                            key={`${item.term}-${i}`}
                            onMouseEnter={() => handleTermHover(item)}
                            className="relative inline-block cursor-help font-bold text-purple-600 underline decoration-dotted decoration-purple-300 decoration-2 underline-offset-2 hover:text-pink-600 hover:decoration-pink-400 transition-all"
                        >
                            {subPart}
                        </span>
                    );
                } else if (subPart !== '') {
                    nextParts.push(subPart);
                }
            });
        });
        parts = nextParts;
    });
    
    return parts;
  };

  // Organize findings
  const vitals: string[] = [];
  // Fix: Use React.ReactNode instead of JSX.Element[] to resolve "Cannot find namespace 'JSX'" error.
  const otherFindings: React.ReactNode[] = [];
  
  (patient.symptoms || []).forEach(s => {
      if (s.match(/\b(bp|hr|rr|temp|t|sat|spo2|bpm|mmhg|°c|°f)\b/i) || s.match(/\d+\/\d+/)) {
          vitals.push(s);
      } else {
          otherFindings.push(renderTextWithGlossary(s) as any);
      }
  });

  return (
    <div className="relative max-w-md w-full mx-auto group perspective-1000 transition-all duration-500">
      
      {/* Lay-friendly Tooltip Overlay */}
      {hoveredTerm && (
          <div 
            className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 w-64 bg-white rounded-2xl shadow-xl border border-pink-100 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
            onMouseLeave={() => setHoveredTerm(null)}
          >
              <div className="flex items-start gap-3">
                  <div className="bg-pink-100 p-1.5 rounded-full text-pink-500 shrink-0">
                      <Info className="w-4 h-4" />
                  </div>
                  <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                          What is <span className="text-pink-600">{hoveredTerm.term}</span>?
                      </h4>
                      <p className="text-[11px] leading-relaxed text-slate-600 font-medium italic">
                          "{hoveredTerm.definition}"
                      </p>
                  </div>
              </div>
              {/* Arrow */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-pink-100 rotate-45"></div>
          </div>
      )}

      {/* Abstract Background Blobs */}
      {isExpanded && (
        <>
          <div className="absolute -top-4 -left-4 w-20 h-20 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        </>
      )}

      {/* Main Card */}
      <div className={`relative bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden border border-white/50 transform transition-all duration-500 ${isExpanded ? 'rounded-[1.5rem]' : 'rounded-2xl scale-[0.98] opacity-90 hover:opacity-100 hover:scale-100'}`}>
        
        {/* Decorative Sparkle */}
        <div className="absolute top-2 right-2 animate-pulse z-20 opacity-50 pointer-events-none">
          <Sparkles className="w-4 h-4 text-purple-400" />
        </div>

        <div className="p-3">
            {/* Header */}
            <div 
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Avatar Left */}
                <div className="flex-shrink-0 relative">
                    <div className={`rounded-full shadow-md border-2 border-white/80 overflow-hidden bg-white/30 backdrop-blur-md transition-all duration-500 ${isExpanded ? 'w-12 h-12' : 'w-10 h-10'}`}>
                        <img 
                        src={patient.imageUrl} 
                        alt={patient.name} 
                        className="w-full h-full object-cover"
                        />
                    </div>
                    {visitCount > 1 && (
                         <div className="absolute -top-1 -right-1 bg-amber-400 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white shadow-sm" title={`Visit #${visitCount}`}>
                            {visitCount}
                         </div>
                    )}
                </div>

                {/* Identity Right */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                     <div className="flex items-baseline gap-2">
                        <h2 className={`font-bold bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent leading-tight truncate transition-all ${isExpanded ? 'text-base' : 'text-sm'}`}>
                            {patient.name}
                        </h2>
                        {isExpanded && (
                            <span className="text-[10px] text-slate-400 font-medium truncate">
                                {displayAge} • {displayGender}
                            </span>
                        )}
                     </div>
                     
                     <div className="mt-0.5 flex items-center gap-2">
                        {!isExpanded ? (
                             <span className="flex items-center text-green-700 text-xs font-bold animate-fade-in">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                <span className="truncate max-w-[150px]">{renderTextWithGlossary(patient.ailment)}</span>
                            </span>
                        ) : (
                             <div className="flex items-center gap-2">
                                 <span className="flex items-center text-slate-500 text-[11px] font-medium leading-none">
                                    <Briefcase className="w-2.5 h-2.5 mr-1 text-slate-400" />
                                    {displayOccupation}
                                 </span>
                                 {visitCount > 1 ? (
                                     <span className="flex items-center gap-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                        <Repeat className="w-2 h-2" />
                                        {visitReason === 'New Issue' ? 'New Issue' : 'Follow-Up'}
                                     </span>
                                 ) : (
                                     <span className="flex items-center gap-0.5 text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                        New Patient
                                     </span>
                                 )}
                             </div>
                        )}
                     </div>
                </div>

                {/* Collapse Toggle Icon */}
                <div className="text-slate-400 hover:text-pink-500 transition-colors p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </div>

            {/* EXPANDABLE CONTENT */}
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[800px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                
                {/* HPI Bubble */}
                <div className="relative bg-purple-50/50 p-2.5 rounded-lg border border-purple-100 text-left mb-2 flex gap-2">
                    <Quote className="w-4 h-4 text-purple-300 flex-shrink-0 fill-current rotate-180" />
                    <p className="text-slate-600 text-xs sm:text-sm italic leading-snug font-medium">
                        "{renderTextWithGlossary(patient.description)}"
                    </p>
                </div>
                
                {visitCount > 1 && patient.pastHistory && patient.pastHistory.length > 0 && (
                     <div className="mb-2 px-2 py-1.5 bg-amber-50 rounded-md border border-amber-100 flex items-center gap-2 text-[10px] text-amber-800/80">
                        <History className="w-3 h-3 text-amber-500" />
                        <span className="font-semibold">Last Visit:</span> 
                        <span className="truncate">{renderTextWithGlossary(patient.pastHistory[patient.pastHistory.length - 1].ailment)}</span>
                     </div>
                )}

                {/* Clinical Findings Section */}
                <div className="bg-white/40 rounded-xl p-2.5 border border-white/60 shadow-sm text-left mb-2.5">
                    
                    {/* Header Row */}
                    <div className="flex items-center justify-between text-slate-700 font-bold mb-2 pb-1 border-b border-purple-100/50">
                        <div className="flex items-center space-x-1.5">
                                <ClipboardList className="w-3 h-3 text-purple-500" />
                                <span className="text-[10px] uppercase tracking-wider">Findings</span>
                        </div>
                        
                        {patient.requiresAudio && (
                            <div className="relative">
                                    {!patient.audioData ? (
                                        <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 rounded-full opacity-50">
                                            <Loader2 className="w-2.5 h-2.5 text-slate-400 animate-spin" />
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={toggleAudio}
                                            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-all shadow-sm border ${
                                                isPlaying 
                                                ? 'bg-red-50 text-red-500 border-red-200 animate-pulse' 
                                                : 'bg-white text-pink-500 border-pink-200 hover:bg-pink-50'
                                            }`}
                                        >
                                            <Stethoscope className={`w-2.5 h-2.5 ${isPlaying ? 'animate-bounce' : ''}`} />
                                            <span>{isPlaying ? 'Stop' : getAudioLabel(patient.audioType)}</span>
                                        </button>
                                    )}
                            </div>
                        )}
                    </div>
                    
                    {vitals.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mb-2">
                            {vitals.map((v, i) => (
                                <div key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-purple-100 shadow-sm text-[10px] font-bold text-purple-700 whitespace-nowrap">
                                    <Activity className="w-2.5 h-2.5 mr-1 text-purple-400" />
                                    {v.replace(/^(Vital Signs:?|Vitals:?)\s*/i, '')}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1">
                        {otherFindings.map((symptom, idx) => (
                            <div key={idx} className="flex items-start space-x-1.5 text-slate-600 text-[11px] leading-tight">
                                <div className="w-1 h-1 rounded-full bg-purple-400 mt-1.5 shrink-0 opacity-60"></div>
                                <span className="opacity-90">{symptom}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Condition Image Section */}
                <div className="w-full bg-white/40 rounded-lg overflow-hidden border border-white/60 relative aspect-[21/9] flex items-center justify-center mt-auto">
                    {patient.conditionImageUrl ? (
                        <img 
                        src={patient.conditionImageUrl} 
                        alt="Condition Visualization" 
                        className="w-full h-full object-cover animate-fade-in"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-slate-400 space-y-1">
                            <div className="relative">
                            <ImageIcon className="w-5 h-5 opacity-20" />
                            <div className="absolute -bottom-1 -right-1">
                                <Loader2 className="w-2.5 h-2.5 text-purple-400 animate-spin" />
                            </div>
                            </div>
                            <span className="text-[9px] font-medium animate-pulse text-purple-400/80">Generating Scan...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
