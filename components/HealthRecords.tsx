
import React, { useEffect, useState } from 'react';
import { Patient } from '../types';
import { StorageService } from '../services/storageService';
// Fix: Added CheckCircle and Loader2 to the lucide-react imports
import { Search, Calendar, User, FileText, ChevronRight, X, Clock, Activity, Briefcase, Hash, CheckCircle, Loader2 } from 'lucide-react';

interface HealthRecordsProps {
  userId?: string | null;
}

export const HealthRecords: React.FC<HealthRecordsProps> = ({ userId }) => {
  const [records, setRecords] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    setLoading(true);
    StorageService.getAllPatientRecords(userId).then((data) => {
      setRecords(data);
      setLoading(false);
    });
  }, [userId]);

  const filteredRecords = records.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ailment.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.occupation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-20">
      
      {/* Header & Search */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-pink-500" />
                    Health Records
                </h2>
                <p className="text-slate-500 text-sm">A complete log of all patient visits and treatments.</p>
            </div>
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Search records..." 
                    className="pl-10 pr-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-pink-300 focus:ring-4 focus:ring-pink-100 outline-none w-full md:w-64 text-sm font-medium transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
        </div>

        {/* List View */}
        {loading ? (
             <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
                <span>Loading records...</span>
             </div>
        ) : filteredRecords.length === 0 ? (
             <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <User className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>{searchTerm ? "No matching records found." : "No patient records yet. Start treating some patients!"}</p>
             </div>
        ) : (
            <div className="space-y-3">
                {filteredRecords.map((patient, idx) => (
                    <div 
                        key={patient.visitId || `${patient.id}-${patient.timestamp}`} 
                        onClick={() => setSelectedPatient(patient)}
                        className="group flex items-center p-3 rounded-2xl border border-slate-100 bg-white hover:border-pink-200 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute inset-y-0 left-0 w-1 bg-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Avatar */}
                        <img 
                            src={patient.imageUrl} 
                            alt={patient.name} 
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm bg-pink-50 mr-4"
                        />
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-bold text-slate-700 truncate">{patient.name}</h3>
                                {patient.visitReason && (
                                     <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${patient.visitReason === 'New Patient' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-700'}`}>
                                        {patient.visitReason}
                                     </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-xs">
                                    <Activity className="w-3 h-3 text-green-400" />
                                    {patient.ailment}
                                </span>
                            </div>
                        </div>

                        {/* Date & Arrow */}
                        <div className="flex items-center gap-4 pl-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Visit Date</p>
                                <p className="text-xs font-medium text-slate-600 whitespace-nowrap">{formatDate(patient.timestamp)}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-pink-50 group-hover:text-pink-500 transition-colors shrink-0">
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                
                {/* Modal Header */}
                <div className="relative bg-gradient-to-r from-pink-500 to-purple-500 p-6 text-white shrink-0">
                    <button 
                        onClick={() => setSelectedPatient(null)}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <img 
                            src={selectedPatient.imageUrl} 
                            alt={selectedPatient.name} 
                            className="w-16 h-16 rounded-full border-4 border-white/30 shadow-lg bg-white"
                        />
                        <div>
                            <h2 className="text-2xl font-bold">{selectedPatient.name}</h2>
                            <p className="text-pink-100 text-sm font-medium flex items-center gap-2 opacity-90">
                                {selectedPatient.age} yrs • {selectedPatient.gender} • {selectedPatient.occupation}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Visit Details
                    </h3>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-slate-800 text-xl">{selectedPatient.ailment}</h4>
                                <p className="text-xs font-bold text-pink-500 uppercase tracking-wider">{selectedPatient.visitReason || 'General Visit'}</p>
                            </div>
                            <span className="text-xs font-bold bg-white px-2 py-1 rounded-md border border-slate-100 text-slate-500">
                                {formatDate(selectedPatient.timestamp)}
                            </span>
                        </div>
                        <div className="space-y-3 text-sm text-slate-600">
                            <div>
                                <p className="font-bold text-slate-400 text-[10px] uppercase mb-0.5 tracking-widest">Patient Complaint</p>
                                <p className="italic bg-white p-2 rounded-lg border border-slate-100">"{selectedPatient.description}"</p>
                            </div>
                            <div>
                                <p className="font-bold text-slate-400 text-[10px] uppercase mb-0.5 tracking-widest">Administered Treatment</p>
                                <p className="font-bold text-green-600 flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4" />
                                    {selectedPatient.treatmentOptions[selectedPatient.correctTreatmentIndex]}
                                </p>
                            </div>
                            <div className="pt-2 border-t border-slate-200">
                                <p className="text-xs leading-relaxed text-slate-500">{selectedPatient.treatmentDescription}</p>
                            </div>
                        </div>
                    </div>

                    {selectedPatient.pastHistory && selectedPatient.pastHistory.length > 0 && (
                        <>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Cumulative History
                            </h3>
                            <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[17px] before:w-0.5 before:bg-slate-100">
                                {[...selectedPatient.pastHistory].reverse().map((item, idx) => (
                                    <div key={idx} className="relative pl-10 opacity-70">
                                        <div className="absolute left-0 top-1 w-9 h-9 bg-white rounded-full border-4 border-slate-100 flex items-center justify-center z-10">
                                            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-slate-700 text-xs">{item.ailment}</h4>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(item.timestamp).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500">
                                                <span className="font-semibold">Tx:</span> {item.treatment}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
