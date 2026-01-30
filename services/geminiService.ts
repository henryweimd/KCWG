
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Patient } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, backoff = INITIAL_BACKOFF): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error.message?.includes("quota") || error.status === "RESOURCE_EXHAUSTED";
    const isServerError = error.code === 500 || error.message?.includes("500") || error.message?.includes("xhr error");

    if (retries > 0 && (isServerError || isQuotaError)) {
      console.warn(`Gemini API call failed. Retrying in ${backoff}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return withRetry(fn, retries - 1, backoff * 2);
    }
    throw error;
  }
}

export const GeminiService = {
  async generatePatient(existingPatient?: Patient): Promise<Patient> {
    return withRetry(async () => {
      const ai = getClient();
      
      let prompt = "";

      if (existingPatient) {
         prompt = `
           Generate a follow-up clinical case for an existing "cozy" game character.
           
           Existing Patient Profile:
           - Name: ${existingPatient.name}
           - Age: ${existingPatient.age}
           - Gender: ${existingPatient.gender}
           - Occupation: ${existingPatient.occupation}
           - Previous Ailment: ${existingPatient.ailment}

           Scenario Logic (Choose one randomly):
           1. Follow-up: The previous issue is healing but needs a check, or a minor complication arose.
           2. Recurrence: The issue came back.
           3. New Issue: A completely unrelated ailment.

           Required Output Fields (JSON):
           - description: The patient's NEW complaint in first-person (10-20 words). Mention it's a return visit if applicable.
           - ailment: The NEW or RECURRING medical diagnosis.
           - visitReason: One of "Follow-up", "Recurrence", or "New Issue".
           - symptoms: 5-7 findings (Vitals + Findings).
           - diagnosisOptions: 3 plausible differentials.
           - correctDiagnosisIndex: Index (0-2).
           - treatmentOptions: 3 treatment choices.
           - correctTreatmentIndex: Index (0-2).
           - treatmentDescription: Concise (30-40 words) success message.
           - glossary: A list of 2-4 complex medical terms used in the fields above, with simple, "kawaii" lay-friendly definitions.
         `;
      } else {
         prompt = `
          Generate a clinical case for a "cozy" medical simulation game.
          
          Tone Guidelines:
          - Medical Accuracy: Use real, accurate medical terms.
          - Language: Simple, lay-friendly.
          - Vibe: Friendly, positive, "kawaii".
          
          Required Fields:
          - name: A pleasant name.
          - age: Integer (18-90).
          - gender: "Male", "Female", or "Non-binary".
          - occupation: A normal or slightly quirky job.
          - description: The patient's complaint (HPI) spoken in first-person perspective. Keep it short (10-20 words). e.g. "My stomach hurts when I jump." (Do not add quotation marks).
          - ailment: The accurate medical diagnosis.
          - symptoms: 5-7 findings including:
              1. Vital Signs (e.g. "BP 110/70", "HR 88", "Temp 37.5°C").
              2. Key Physical Findings.
              3. Pertinent Negatives.
          - diagnosisOptions: 3 plausible differential diagnoses.
          - correctDiagnosisIndex: Index (0-2).
          - treatmentOptions: 3 treatment choices.
          - correctTreatmentIndex: Index (0-2).
          - treatmentDescription: A very concise (30-40 words) explanation of the diagnosis/treatment. Use simple metaphors. End cheerfully.
          - glossary: A list of 2-4 complex medical terms used in the fields above, with simple, "kawaii" lay-friendly definitions.
         `;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: existingPatient ? { type: Type.STRING, nullable: true } : { type: Type.STRING },
              age: { type: Type.INTEGER },
              gender: { type: Type.STRING },
              occupation: { type: Type.STRING },
              description: { type: Type.STRING },
              ailment: { type: Type.STRING },
              visitReason: { type: Type.STRING },
              symptoms: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              diagnosisOptions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctDiagnosisIndex: { type: Type.INTEGER },
              treatmentOptions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctTreatmentIndex: { type: Type.INTEGER },
              treatmentDescription: { type: Type.STRING },
              glossary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING }
                  },
                  required: ["term", "definition"]
                }
              }
            },
            required: [
               "description", "ailment", 
              "symptoms", "diagnosisOptions", "correctDiagnosisIndex", 
              "treatmentOptions", "correctTreatmentIndex", "treatmentDescription", "glossary"
            ]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("No text returned from Gemini");

      const data = JSON.parse(text);

      const conditionStr = (data.ailment + " " + (data.symptoms || []).join(" ")).toLowerCase();
      const requiresAudio = !!conditionStr.match(/murmur|stenosis|regurgitation|arrhythmia|fibrillation|tachycardia|gallop|heart failure|wheeze|asthma|copd|stridor|bronchospasm|obstructive|crackle|rales|pneumonia|edema|fibrosis|fluid in lung|bronchitis|gastroenteritis|obstruction|borborygmi|hyperactive/i);

      return {
        id: existingPatient?.id || crypto.randomUUID(),
        visitId: crypto.randomUUID(),
        name: existingPatient?.name || data.name,
        age: existingPatient?.age || data.age,
        gender: existingPatient?.gender || data.gender,
        occupation: existingPatient?.occupation || data.occupation,
        imageUrl: existingPatient?.imageUrl || `https://api.dicebear.com/9.x/glass/svg?seed=${(data.name || "Unknown").replace(/\s/g, '')}&backgroundColor=c084fc`,
        description: data.description,
        ailment: data.ailment,
        symptoms: data.symptoms,
        diagnosisOptions: data.diagnosisOptions,
        correctDiagnosisIndex: data.correctDiagnosisIndex,
        treatmentOptions: data.treatmentOptions,
        correctTreatmentIndex: data.correctTreatmentIndex,
        treatmentDescription: data.treatmentDescription,
        requiresAudio: requiresAudio,
        glossary: data.glossary,
        species: "Human",
        isTreated: false,
        timestamp: Date.now(),
        reward: Math.floor(Math.random() * 50) + 100,
        visitCount: existingPatient ? (existingPatient.visitCount || 1) + 1 : 1,
        visitReason: existingPatient ? (data.visitReason || "Follow-up") : "New Patient",
        pastHistory: existingPatient?.pastHistory || []
      };
    });
  },

  async generatePatientAvatar(patient: Patient): Promise<string | undefined> {
    return withRetry(async () => {
      const ai = getClient();
      const variations = ["wearing a small medical badge", "with a warm smile", "with kind eyes", "wearing cute glasses", "with tidy hair"];
      const randomDetail = variations[Math.floor(Math.random() * variations.length)];
      
      const prompt = `Close-up headshot portrait, face only. Kawaii 3D chibi style. A ${patient.age} year old ${patient.gender} person, occupation: ${patient.occupation}. ${randomDetail}. Style: soft clay-like textures, pastel color palette, friendly expression. Centered face, high quality, plain white background.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: "1:1", 
          }
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return undefined;
    });
  },

  async generateConditionImage(patient: Patient): Promise<string | undefined> {
    return withRetry(async () => {
      const ai = getClient();
      const prompt = `Kawaii style medical illustration of ${patient.ailment}. ${patient.description}. White background, isometric view, simple kawaii clinical setting, pastel colors, soft lighting, 3d render style cute. No text.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: "16:9", 
          }
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return undefined;
    });
  },

  async generateAuscultationAudio(patient: Patient): Promise<{ data: string, type: 'Heart' | 'Lungs' | 'Abdomen' } | undefined> {
    return withRetry(async () => {
      const ai = getClient();
      
      let soundPrompt = "";
      let type: 'Heart' | 'Lungs' | 'Abdomen' | undefined;
      const condition = (patient.ailment + " " + patient.symptoms.join(" ")).toLowerCase();
      
      if (condition.match(/murmur|stenosis|regurgitation|arrhythmia|fibrillation|tachycardia|gallop|heart failure/)) {
          soundPrompt = "Whoosh-dub, whoosh-dub, whoosh-dub"; 
          type = 'Heart';
      } else if (condition.match(/wheeze|asthma|copd|stridor|bronchospasm|obstructive/)) {
          soundPrompt = "Hhhhheeeeeee, hhhhheeeeeee";
          type = 'Lungs';
      } else if (condition.match(/crackle|rales|pneumonia|edema|fibrosis|fluid in lung|bronchitis/)) {
          soundPrompt = "Crackle-pop, crackle-pop, crackle-pop";
          type = 'Lungs';
      } else if (condition.match(/gastroenteritis|obstruction|borborygmi|hyperactive|bowel sound/)) {
          soundPrompt = "Gurgle, gurgle, bloop";
          type = 'Abdomen';
      }

      if (!soundPrompt || !type) return undefined;

      const prompt = `
        You are simulating a stethoscope sound for a medical case of ${patient.ailment}. 
        Repeat this sound effect slowly and rhythmically 4 times: "${soundPrompt}". 
        Do not say any introductory words. Just make the sound.
      `;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: { parts: [{ text: prompt }] },
          config: {
            responseModalities: [Modality.AUDIO], 
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });

        const audioPart = response.candidates?.[0]?.content?.parts?.[0];
        if (audioPart?.inlineData?.data) {
          return {
            data: audioPart.inlineData.data,
            type: type
          };
        }
      } catch (error: any) {
        // Handle "model not found" or similar availability errors gracefully for TTS
        const errorMsg = error.message?.toLowerCase() || "";
        if (errorMsg.includes("model") && (errorMsg.includes("not found") || errorMsg.includes("404") || errorMsg.includes("invalid"))) {
          console.error("Gemini TTS model 'gemini-2.5-flash-preview-tts' is currently unavailable or restricted in this region. Audio generation skipped.", error);
          return undefined; 
        }
        throw error;
      }
      
      return undefined;
    });
  }
};
