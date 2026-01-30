import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserState, Patient, GameState, GameTab, XP_TO_LEVEL_UP, getLevelTitle } from './types';
import { StorageService } from './services/storageService';
import { GeminiService } from './services/geminiService';
import firebase, { auth, googleProvider } from './services/firebase';
import { PatientCard } from './components/PatientCard';
import { DiagnosisPanel } from './components/DiagnosisPanel';
import { Dashboard } from './components/Dashboard';
import { HealthRecords } from './components/HealthRecords';
import { AuthButton } from './components/AuthButton';
import { 
  Heart, 
  LayoutDashboard, 
  Stethoscope, 
  Sparkles, 
  Plus,
  Loader2,
  Trophy,
  Cloud,
  CloudOff,
  CheckCircle,
  Save,
  Lightbulb,
  Brain,
  Star,
  Activity,
  RotateCcw,
  Menu,
  X,
  ShoppingBag,
  Crown,
  Terminal,
  Zap,
  Info,
  FileText
} from 'lucide-react';

const CLINIC_LOAD_MESSAGES = [
  "Please be a patient patient while we find your next patient! 🏥",
  "Patience is a virtue, especially for a doctor with a slow elevator. 🩺",
  "Gemini 3 is currently roleplaying as a senior medical resident to draft your next case.",
  "Did you know? Gemini 3 Flash uses advanced reasoning to ensure symptoms align with real medical literature.",
  "Generating 'multimodal' magic: We're asking Gemini to simulate raw PCM audio for heart murmurs.",
  "Gemini 2.5 Flash Image is currently 'painting' a kawaii-style medical illustration for your chart.",
  "Our doctors are patient, but the patients are waiting! (Pun intended) 💉",
  "Don't have a heart attack! We're just verifying the pulse of our AI servers. ❤️",
  "Kawaii Clinic uses a custom system instruction to keep cases 'cozy' but medically accurate.",
  "Wait for it... we're synthesizing digital breath sounds through Gemini's native audio engine.",
  "Gemini is cross-referencing your patient's 'occupation' with their symptoms for that extra realism.",
  "A dose of patience is the best medicine for a loading screen! 💊",
  "Every patient is unique because Gemini 3 generates their entire life story from scratch.",
  "We are leveraging the massive context window of Gemini 3 to ensure clinical consistency.",
  "The sounds you'll hear aren't recordings; they are raw audio bytes hallucinated by Gemini's multimodal core.",
  "Waiting for Gemini is like waiting for a lab result—stressful, but worth it! 🧪"
];

const GENERATION_LOGS = [
  "Requesting Gemini 3 for a new medical case...",
  "Synthesizing patient demographics...",
  "Analyzing clinical pathology via LLM...",
  "Generating unique HPI history...",
  "Multimodal: Preparing native audio request...",
  "Imagen: Sketching clinical illustrations...",
  "Formatting vitals into medical records...",
  "Performing differential diagnosis cross-check...",
  "Finalizing kawaii patient file..."
];

export default function App() {
  // --- State ---
  const [firebaseUser, setFirebaseUser] = useState<firebase.User | null>(null);
  const [user, setUser] = useState<UserState | null>(null);
  const [activeTab, setActiveTab] = useState<GameTab>(GameTab.CLINIC);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('offline');
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [currentLog, setCurrentLog] = useState<string>("");
  const [gameState, setGameState] = useState<GameState>({
    currentPatient: null,
    loading: false,
    error: null,
    gamePhase: 'IDLE'
  });
  
  // UI State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [coinAnim, setCoinAnim] = useState(false);

  // Preloading & Auto Advance State
  const nextPatientRef = useRef<Promise<Patient> | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [isNextPatientReady, setIsNextPatientReady] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);

  // --- Initialization ---
  
  useEffect(() => {
    if (!auth) {
      StorageService.getUserState(null).then(handleUserLoaded);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setSyncStatus('syncing');
      setFirebaseUser(currentUser);
      
      let loadedUser: UserState;
      if (currentUser) {
        loadedUser = (await StorageService.migrateLocalToCloud(currentUser.uid)) || await StorageService.getUserState(currentUser.uid);
        setSyncStatus('synced');
      } else {
        loadedUser = await StorageService.getUserState(null);
        setSyncStatus('offline');
      }
      handleUserLoaded(loadedUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (gameState.loading) {
      const msgInterval = setInterval(() => {
        setCurrentMessage(CLINIC_LOAD_MESSAGES[Math.floor(Math.random() * CLINIC_LOAD_MESSAGES.length)]);
      }, 4000);
      
      const logInterval = setInterval(() => {
        setCurrentLog(GENERATION_LOGS[Math.floor(Math.random() * GENERATION_LOGS.length)]);
      }, 1500);

      setCurrentMessage(CLINIC_LOAD_MESSAGES[Math.floor(Math.random() * CLINIC_LOAD_MESSAGES.length)]);
      setCurrentLog(GENERATION_LOGS[0]);

      return () => {
        clearInterval(msgInterval);
        clearInterval(logInterval);
      };
    }
  }, [gameState.loading]);

  const handleUserLoaded = (loadedUser: UserState) => {
    setUser(loadedUser);
    if (loadedUser.activePatient) {
        setGameState(prev => ({
            ...prev,
            currentPatient: loadedUser.activePatient || null,
            gamePhase: 'DIAGNOSING'
        }));
    }
  };

  useEffect(() => {
    if (user && activeTab === GameTab.CLINIC && gameState.gamePhase === 'IDLE' && !gameState.loading && !gameState.error) {
       handleNewPatient();
    }
  }, [user, activeTab, gameState.gamePhase, gameState.loading, gameState.error]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (gameState.gamePhase === 'COMPLETED' && isNextPatientReady) {
        setAutoAdvance(true);
        timer = setTimeout(() => {
            handleNextPatient();
        }, 3000); 
    }
    return () => clearTimeout(timer);
  }, [gameState.gamePhase, isNextPatientReady]);


  // --- Actions ---

  const handleLogin = async () => {
    if (!auth || !googleProvider) return;
    try {
      await auth.signInWithPopup(googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      alert("Cloud Sync Unavailable\n\nGoogle Login is not supported in this preview environment. Progress is saved locally.");
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const generateAssetsForPatient = async (patient: Patient) => {
    try {
        const [condUrl, audioResult, avatarUrl] = await Promise.all([
            GeminiService.generateConditionImage(patient),
            GeminiService.generateAuscultationAudio(patient),
            patient.imageUrl?.includes('dicebear') ? GeminiService.generatePatientAvatar(patient) : Promise.resolve(undefined)
        ]);

        if (condUrl || audioResult || avatarUrl) {
            setGameState(prev => {
                if (prev.currentPatient?.id !== patient.id) return prev;
                const updatedPatient = { 
                    ...prev.currentPatient, 
                    conditionImageUrl: condUrl || prev.currentPatient.conditionImageUrl,
                    audioData: audioResult?.data || prev.currentPatient.audioData,
                    audioType: audioResult?.type || prev.currentPatient.audioType,
                    imageUrl: avatarUrl || prev.currentPatient.imageUrl
                };
                if (user) {
                    const updatedUser = { ...user, activePatient: updatedPatient };
                    setUser(updatedUser);
                    StorageService.saveUserState(updatedUser, firebaseUser?.uid);
                }
                return { ...prev, currentPatient: updatedPatient };
            });
        }
    } catch (e) {
        console.error("Asset generation failed", e);
    }
  };

  const startPreloading = useCallback((existingPanel: Patient[]) => {
    if (!process.env.API_KEY) return;
    setIsPreloading(true);
    setIsNextPatientReady(false);

    let returningPatient: Patient | undefined = undefined;
    if (existingPanel.length > 0 && Math.random() > 0.6) {
        const randomIndex = Math.floor(Math.random() * existingPanel.length);
        returningPatient = existingPanel[randomIndex];
    }

    nextPatientRef.current = GeminiService.generatePatient(returningPatient)
      .then(p => {
         setIsNextPatientReady(true);
         return p;
      })
      .finally(() => setIsPreloading(false));
  }, []);

  const handleNewPatient = async () => {
    if (!process.env.API_KEY || !user) return;
    setGameState(prev => ({ ...prev, loading: true, error: null, gamePhase: 'IDLE' }));
    
    try {
      const panel = user.patientPanel || [];
      let returningPatient: Patient | undefined = undefined;

      if (panel.length > 0 && Math.random() > 0.6) {
         const randomIndex = Math.floor(Math.random() * panel.length);
         returningPatient = panel[randomIndex];
         setCurrentLog(`Contacting returning patient: ${returningPatient.name}...`);
      }

      const patient = await GeminiService.generatePatient(returningPatient);
      setGameState({
        currentPatient: patient,
        loading: false,
        error: null,
        gamePhase: 'DIAGNOSING'
      });
      const updatedUser = { ...user, activePatient: patient };
      setUser(updatedUser);
      StorageService.saveUserState(updatedUser, firebaseUser?.uid);
      generateAssetsForPatient(patient);
    } catch (err: any) {
      let errorMessage = "Failed to find a patient.";
      if (err.message?.includes("quota")) {
        errorMessage = "Daily clinic quota exceeded!";
      } else if (err.message?.includes("xhr error") || err.code === 500) {
        errorMessage = "Network Interference. Dr. Gemini is busy.";
      }
      setGameState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  };

  const handleNextPatient = async () => {
    if (!user) return;
    setAutoAdvance(false);
    setIsNextPatientReady(false);
    if (nextPatientRef.current) {
        setGameState(prev => ({ ...prev, loading: true, error: null, gamePhase: 'IDLE' }));
        try {
            const patient = await nextPatientRef.current;
            nextPatientRef.current = null;
            setGameState({
                currentPatient: patient,
                loading: false,
                error: null,
                gamePhase: 'DIAGNOSING'
            });
            const updatedUser = { ...user, activePatient: patient };
            setUser(updatedUser);
            StorageService.saveUserState(updatedUser, firebaseUser?.uid);
            generateAssetsForPatient(patient);
        } catch (e) {
            nextPatientRef.current = null;
            handleNewPatient();
        }
    } else {
        handleNewPatient();
    }
  };

  const handleDiagnose = (success: boolean) => {
    if (success) setGameState(prev => ({ ...prev, gamePhase: 'TREATING' }));
  };

  const handleTreat = async () => {
    if (!user || !gameState.currentPatient) return;
    setSyncStatus('syncing');
    const patient = gameState.currentPatient;
    const updatedPatient = { 
        ...patient, 
        isTreated: true,
        pastHistory: [
            ...(patient.pastHistory || []),
            { timestamp: Date.now(), ailment: patient.ailment, treatment: patient.treatmentOptions[patient.correctTreatmentIndex] }
        ]
    };

    const xpGain = 20;
    let newXp = user.experience + xpGain;
    let newLevel = user.level;
    const finalReward = Math.floor(updatedPatient.reward * (1 + (user.level - 1) * 0.1));
    let newCurrency = user.currency + finalReward;
    if (newXp >= XP_TO_LEVEL_UP) {
      newXp = newXp - XP_TO_LEVEL_UP;
      newLevel += 1;
      newCurrency += 100; 
    }

    let newPanel = [...(user.patientPanel || [])];
    const existingIndex = newPanel.findIndex(p => p.id === updatedPatient.id);
    if (existingIndex >= 0) {
        newPanel[existingIndex] = updatedPatient;
    } else {
        newPanel.push(updatedPatient);
    }

    const newUserState: UserState = { 
        ...user, 
        experience: newXp, 
        level: newLevel, 
        currency: newCurrency, 
        patientsTreated: user.patientsTreated + 1, 
        activePatient: null,
        patientPanel: newPanel 
    };

    setUser(newUserState);
    setGameState(prev => ({ ...prev, gamePhase: 'COMPLETED' }));
    setCoinAnim(true);
    setTimeout(() => setCoinAnim(false), 2000);
    
    startPreloading(newPanel);
    
    try {
      await Promise.all([ StorageService.saveUserState(newUserState, firebaseUser?.uid), StorageService.addPatientRecord(updatedPatient, firebaseUser?.uid) ]);
      setSyncStatus(firebaseUser ? 'synced' : 'offline');
    } catch (e) { setSyncStatus('offline'); }
  };

  if (!user) return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        <p className="text-pink-600 font-medium">Opening Clinic...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-pink-50 text-slate-800 font-sans selection:bg-pink-200 flex flex-col">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-pink-100 shadow-sm transition-all h-14">
        <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 hover:text-pink-500 rounded-full transition-colors relative">
                  {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <span className="font-bold text-slate-700 text-sm sm:text-base truncate max-w-[120px] sm:max-w-xs transition-opacity">
                   {activeTab === GameTab.CLINIC ? 'Current Case' : activeTab === GameTab.RECORDS ? 'Health Records' : 'Clinic Stats'}
              </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
             <div className="flex items-center bg-white/50 border border-slate-200 rounded-full px-3 py-1.5 text-xs font-bold gap-3 shadow-sm select-none">
                 <div className="flex items-center gap-1.5 text-slate-600">
                    <Trophy className="w-3.5 h-3.5 text-purple-500" />
                    <div className="flex flex-col -space-y-1">
                        <span>Lv. {user.level}</span>
                        <span className="text-[8px] opacity-60 uppercase whitespace-nowrap">{getLevelTitle(user.level)}</span>
                    </div>
                 </div>
                 <div className="w-px h-3 bg-slate-300"></div>
                 <div className={`flex items-center gap-1.5 transition-colors ${coinAnim ? 'text-yellow-600' : 'text-slate-600'}`}>
                    <Star className={`w-3.5 h-3.5 ${coinAnim ? 'fill-yellow-400 text-yellow-500' : 'text-yellow-500'}`} />
                    <span>{user.currency}</span>
                 </div>
             </div>
             <AuthButton user={firebaseUser} onLogin={handleLogin} onLogout={handleLogout} syncStatus={syncStatus} />
          </div>
        </div>
        {isMenuOpen && (
            <div className="absolute top-14 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-pink-100 shadow-lg z-30 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="max-w-5xl mx-auto p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button onClick={() => { setActiveTab(GameTab.CLINIC); setIsMenuOpen(false); }} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all group ${activeTab === GameTab.CLINIC ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-slate-100 bg-white hover:border-pink-200'}`}>
                        <Stethoscope className={`w-6 h-6 mb-1 ${activeTab === GameTab.CLINIC ? 'text-pink-600' : 'text-slate-400 group-hover:text-pink-400'}`} />
                        <span className="text-xs font-bold">Game</span>
                    </button>
                    <button onClick={() => { setActiveTab(GameTab.RECORDS); setIsMenuOpen(false); }} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all group ${activeTab === GameTab.RECORDS ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white hover:border-blue-200'}`}>
                        <FileText className={`w-6 h-6 mb-1 ${activeTab === GameTab.RECORDS ? 'text-blue-600' : 'text-slate-400 group-hover:text-pink-400'}`} />
                        <span className="text-xs font-bold">Records</span>
                    </button>
                    <button onClick={() => { setActiveTab(GameTab.DASHBOARD); setIsMenuOpen(false); }} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all group ${activeTab === GameTab.DASHBOARD ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-100 bg-white hover:border-purple-200'}`}>
                        <LayoutDashboard className={`w-6 h-6 mb-1 ${activeTab === GameTab.DASHBOARD ? 'text-purple-600' : 'text-slate-400 group-hover:text-pink-400'}`} />
                        <span className="text-xs font-bold">Stats</span>
                    </button>
                    <button disabled className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-slate-50 bg-slate-50 text-slate-300 opacity-60 cursor-not-allowed">
                        <ShoppingBag className="w-6 h-6 mb-1" />
                        <span className="text-xs font-bold">Store</span>
                    </button>
                </div>
            </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full relative z-0">
        {activeTab === GameTab.DASHBOARD && <Dashboard userState={user} userId={firebaseUser?.uid} />}
        {activeTab === GameTab.RECORDS && <HealthRecords userId={firebaseUser?.uid} />}

        {activeTab === GameTab.CLINIC && (
          <div className="space-y-6">
            {(gameState.loading || (gameState.gamePhase === 'IDLE' && !gameState.error)) && (
              <div className="flex flex-col items-center justify-center py-12 animate-fade-in max-w-xl mx-auto text-center h-[70vh]">
                <div className="relative mb-10">
                  <div className="absolute inset-0 bg-pink-200 rounded-full animate-ping opacity-20"></div>
                  <div className="w-24 h-24 bg-white rounded-full shadow-2xl border-4 border-pink-50 flex items-center justify-center relative z-10">
                    <Brain className="w-12 h-12 text-purple-500 animate-pulse" />
                    <div className="absolute -top-1 -right-1">
                      <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
                    </div>
                  </div>
                </div>
                <div className="mb-6 space-y-2">
                  <h3 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Gemini is preparing a case...</h3>
                  <div className="flex items-center justify-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[9px] bg-slate-100/50 py-1.5 px-4 rounded-full border border-slate-200/50">
                    <Terminal className="w-2.5 h-2.5" />
                    <span className="animate-pulse">{currentLog}</span>
                  </div>
                </div>
                <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white w-full relative group overflow-hidden">
                  <p className="text-slate-800 text-xl font-bold leading-relaxed italic">"{currentMessage}"</p>
                </div>
              </div>
            )}

            {gameState.currentPatient && !gameState.loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fade-in">
                <PatientCard patient={gameState.currentPatient} collapsed={gameState.gamePhase === 'COMPLETED'} />
                <div className="h-full">
                  <DiagnosisPanel key={gameState.gamePhase} patient={gameState.currentPatient} phase={gameState.gamePhase} onDiagnose={handleDiagnose} onTreat={handleTreat} />
                  {gameState.gamePhase === 'COMPLETED' && (
                    <div className="mt-4 w-full">
                        <button onClick={handleNextPatient} className="relative w-full py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all flex items-center justify-center space-x-2 overflow-hidden group">
                        <div className={`absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-[3000ms] ease-linear ${autoAdvance ? 'w-full' : 'w-0'}`} />
                        <span className="relative z-10 flex items-center gap-2">Next Patient <Plus className="w-5 h-5" /></span>
                        </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {gameState.error && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                 <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 max-w-md">
                   <h3 className="font-bold text-lg mb-1">Clinic Connection Error</h3>
                   <p className="text-sm">{gameState.error}</p>
                 </div>
                 <button onClick={() => handleNewPatient()} className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-full font-bold shadow-lg">Try Reconnecting</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}