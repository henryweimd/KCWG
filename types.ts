
export interface PatientHistoryItem {
  timestamp: number;
  ailment: string;
  treatment: string;
}

export interface MedicalTerm {
  term: string;
  definition: string;
}

export interface Patient {
  id: string; // Unique ID for the *individual* (persists across visits)
  visitId?: string; // Unique ID for the *specific visit*
  species: string; // Legacy/Fallback
  name: string;
  description: string;
  ailment: string;
  symptoms: string[];
  diagnosisOptions: string[];
  correctDiagnosisIndex: number;
  treatmentOptions: string[]; // Choices for the player
  correctTreatmentIndex: number; // Index of the correct treatment
  treatmentDescription: string; // Success Message
  imageUrl?: string; // Avatar
  conditionImageUrl?: string; // AI Generated Condition Image
  audioData?: string; // Base64 Raw PCM Audio Data
  audioType?: 'Heart' | 'Lungs' | 'Abdomen'; // Type of sound
  requiresAudio?: boolean; // Whether to expect/load audio for this case
  isTreated: boolean;
  timestamp: number;
  reward: number;
  // Detailed demographics
  age?: number;
  gender?: string;
  occupation?: string;
  
  // Glossary for medical terms
  glossary?: MedicalTerm[];

  // Panel & Persistence
  visitCount: number;
  visitReason?: 'New Patient' | 'Follow-up' | 'Recurrence' | 'New Issue';
  pastHistory?: PatientHistoryItem[];
}

export interface UserState {
  clinicName: string;
  level: number;
  experience: number;
  currency: number; // "Star Bits"
  patientsTreated: number;
  activePatient?: Patient | null; // Persist current session
  patientPanel: Patient[]; // The roster of patients attached to this clinic
  upgrades: {
    comfortLevel: number;
    speedLevel: number;
    charmLevel: number;
  };
}

export interface GameState {
  currentPatient: Patient | null;
  loading: boolean;
  error: string | null;
  gamePhase: 'IDLE' | 'DIAGNOSING' | 'TREATING' | 'COMPLETED';
}

export enum GameTab {
  CLINIC = 'CLINIC',
  DASHBOARD = 'DASHBOARD',
  UPGRADES = 'UPGRADES',
  RECORDS = 'RECORDS'
}

export const XP_TO_LEVEL_UP = 100;

export const getLevelTitle = (level: number): string => {
  if (level <= 2) return "Pre-Med";
  if (level <= 4) return "MS-1";
  if (level <= 6) return "MS-2";
  if (level <= 8) return "MS-3";
  if (level <= 10) return "MS-4";
  if (level <= 13) return "Intern";
  if (level <= 17) return "Resident";
  if (level <= 21) return "Fellow";
  if (level <= 26) return "Attending";
  if (level <= 32) return "Asst Prof";
  if (level <= 38) return "Assoc Prof";
  if (level <= 45) return "Professor";
  if (level <= 52) return "Dept Chair";
  if (level <= 60) return "Dean";
  return "Med Director";
};
