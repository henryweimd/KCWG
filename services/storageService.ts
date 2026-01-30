import { UserState, Patient } from '../types';
import firebase, { db } from './firebase';

const DB_KEY_USER = 'kawaii_clinic_user';
const DB_KEY_PATIENTS = 'kawaii_clinic_patients';

const DEFAULT_USER_STATE: UserState = {
  clinicName: "My Kawaii Clinic",
  level: 1,
  experience: 0,
  currency: 50,
  patientsTreated: 0,
  patientPanel: [], // Start with empty panel
  upgrades: {
    comfortLevel: 1,
    speedLevel: 1,
    charmLevel: 1,
  },
};

/**
 * Service handling data persistence.
 * Switches between LocalStorage (Guest) and Firestore (Logged In).
 */
export const StorageService = {
  /**
   * Initialize or retrieve the user state.
   * @param uid - Optional Firebase User ID. If present, fetches from Cloud.
   */
  async getUserState(uid?: string | null): Promise<UserState> {
    // 1. Cloud Path
    if (uid && db) {
      try {
        const docRef = db.collection('users').doc(uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
          const data = docSnap.data() as UserState;
          // Migration for existing users without panel
          if (!data.patientPanel) {
            data.patientPanel = [];
          }
          return data;
        } else {
          // New cloud user: Create default doc
          await docRef.set(DEFAULT_USER_STATE);
          return DEFAULT_USER_STATE;
        }
      } catch (e) {
        console.error("Firestore Error (getUserState):", e);
        // Fallback to local if network fails
      }
    }

    // 2. Local Storage Path (Guest or Fallback)
    return new Promise((resolve) => {
      try {
        const stored = localStorage.getItem(DB_KEY_USER);
        if (stored) {
          const data = JSON.parse(stored);
           // Migration for existing users without panel
           if (!data.patientPanel) {
            data.patientPanel = [];
          }
          resolve(data);
        } else {
          localStorage.setItem(DB_KEY_USER, JSON.stringify(DEFAULT_USER_STATE));
          resolve(DEFAULT_USER_STATE);
        }
      } catch (e) {
        console.error("Local Storage Error", e);
        resolve(DEFAULT_USER_STATE);
      }
    });
  },

  /**
   * Save the user state.
   */
  async saveUserState(state: UserState, uid?: string | null): Promise<void> {
    // 1. Cloud Path
    if (uid && db) {
      try {
        const docRef = db.collection('users').doc(uid);
        await docRef.set({ ...state, lastSynced: firebase.firestore.Timestamp.now() }, { merge: true });
      } catch (e) {
        console.error("Firestore Error (saveUserState):", e);
      }
    }

    // 2. Always save to Local Storage as cache/backup
    return new Promise((resolve) => {
      localStorage.setItem(DB_KEY_USER, JSON.stringify(state));
      resolve();
    });
  },

  /**
   * Retrieve patient history (recent 50).
   * Schema: users/{uid}/patients/{docId}
   */
  async getPatientHistory(uid?: string | null): Promise<Patient[]> {
    // 1. Cloud Path
    if (uid && db) {
      try {
        const q = db.collection('users').doc(uid).collection('patients')
          .orderBy('timestamp', 'desc')
          .limit(50);
        
        const querySnapshot = await q.get();
        const history: Patient[] = [];
        querySnapshot.forEach((doc) => {
          history.push(doc.data() as Patient);
        });
        return history;
      } catch (e) {
        console.error("Firestore Error (getPatientHistory):", e);
      }
    }

    // 2. Local Storage Path
    return new Promise((resolve) => {
      try {
        const stored = localStorage.getItem(DB_KEY_PATIENTS);
        resolve(stored ? JSON.parse(stored) : []);
      } catch (e) {
        resolve([]);
      }
    });
  },

  /**
   * Retrieve all patient records (up to 200) for the Records tab.
   */
  async getAllPatientRecords(uid?: string | null): Promise<Patient[]> {
     // 1. Cloud Path
    if (uid && db) {
      try {
        const q = db.collection('users').doc(uid).collection('patients')
          .orderBy('timestamp', 'desc')
          .limit(200);
        
        const querySnapshot = await q.get();
        const history: Patient[] = [];
        querySnapshot.forEach((doc) => {
          history.push(doc.data() as Patient);
        });
        return history;
      } catch (e) {
        console.error("Firestore Error (getAllPatientRecords):", e);
        return [];
      }
    }
    // 2. Local Storage Path (Reuse existing method for local)
    return this.getPatientHistory(null);
  },

  /**
   * Add a treated patient to history.
   */
  async addPatientRecord(patient: Patient, uid?: string | null): Promise<void> {
    // 1. Cloud Path
    if (uid && db) {
      try {
        await db.collection('users').doc(uid).collection('patients').add(patient);
      } catch (e) {
        console.error("Firestore Error (addPatientRecord):", e);
      }
    }

    // 2. Local Storage Path
    const history = await this.getPatientHistory(null); // Force local get
    history.unshift(patient);
    if (history.length > 50) history.pop();
    
    return new Promise((resolve) => {
      localStorage.setItem(DB_KEY_PATIENTS, JSON.stringify(history));
      resolve();
    });
  },

  /**
   * Migrates local data to cloud if cloud is empty.
   */
  async migrateLocalToCloud(uid: string): Promise<UserState | null> {
    if (!db) return null;
    
    try {
      const docRef = db.collection('users').doc(uid);
      const docSnap = await docRef.get();

      // Only migrate if cloud data does not exist
      if (!docSnap.exists) {
        const localState = await this.getUserState(null);
        await this.saveUserState(localState, uid);
        
        // Also migrate history
        const localHistory = await this.getPatientHistory(null);
        const patientsRef = db.collection('users').doc(uid).collection('patients');
        for (const p of localHistory.reverse()) { // Add oldest first to preserve timestamp order logic if we were strictly appending
           await patientsRef.add(p);
        }
        return localState;
      }
      return docSnap.data() as UserState;
    } catch (e) {
      console.error("Migration failed", e);
      return null;
    }
  }
};