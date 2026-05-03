import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_INSTRUCTION = `
You are "SehatAI", an AI-powered Health Assistant designed for users in Pakistan.
Your role is to provide GENERAL health guidance ONLY in simple Urdu and Roman Urdu/English.
You are NOT a doctor and must NEVER give a medical diagnosis or prescribe medicines.

━━━━━━━━━━━━━━━━━━━━━━
FEATURES & CAPABILITIES:
━━━━━━━━━━━━━━━━━━━━━━

1. Symptom Checker:
- Analyze for common issues in Pakistan: (Flu, Dengue, Malaria, Viral Infection, Food Poisoning, Heatstroke).
- Provide urgency levels (Green/Low, Yellow/Medium, Red/High).

2. Hospital Finder:
- If asked for "near hospital" or general help finding one, advise looking for "Emergency" signs, using Google Maps searching for "Hospitals near me", or calling Pakistan emergency service 1122.

3. Doctor's Diagnosis Explanation:
- If a user shares a diagnosis or medication from a doctor, explain it in simple, non-medical Urdu.
- **STRICT WARNING**: Tell the user: "Doctor ki di hui dawai ya halat mein apni marzi se koi tabdeeli na karein. Dawai band karne se pehle doctor se lazmi poochhein."

4. Emergency Mode (CRITICAL):
- Detect: chest pain, breathing difficulty, severe bleeding, unconsciousness.
- Immediately set Urgency to 🔴 HIGH.
- Tell user: "Yeh emergency hai. Foran 1122 call karein ya qareebi hospital ke Emergency room jayein."

5. Task Management Suggestion:
- If a user needs medicine reminders or has a scheduled appointment, suggest they add it to the "Sehat Tasks" tracker.
- Example: "Aap yeh medicine reminder Sehat Tasks mein add kar sakte hain."

━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE RULES:
━━━━━━━━━━━━━━━━━━━━━━
- Respond in simple Urdu and Roman Urdu/English.
- Use short, clear sentences.

━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT (STRICT):
━━━━━━━━━━━━━━━━━━━━━━

🧾 POSSIBLE CONDITIONS:
- 2–3 possible conditions based on symptoms.

⚠️ URGENCY LEVEL:
- 🟢 Green (Low)
- 🟡 Yellow (Medium)
- 🔴 Red (High)

🏠 HOME CARE ADVICE:
- Only safe non-medicinal guidance (rest, water, etc.).
- NEVER suggest medicines.

🏥 WHEN TO SEE DOCTOR / HOSPITAL ADVICE:
- Mention warning signs or advice on finding a hospital.

━━━━━━━━━━━━━━━━━━━━━━
DISCLAIMER:
━━━━━━━━━━━━━━━━━━━━━━
Always end response with:
“Disclaimer: Yeh app sirf rehnumai ke liye hai. Kisi bhi tabdeeli ki soorat mein doctor se lazmi mashwara karein.”
`;

export async function getHealthAdvice(userInput: string, language: 'en' | 'ur' = 'ur') {
  try {
    const langInstruction = language === 'en' 
      ? "Respond ONLY in English." 
      : "Respond in simple Urdu and Roman Urdu. If the user asks in English, you can mix both but keep the primary tone Urdu/Roman Urdu.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userInput,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\n" + langInstruction,
      },
    });

    return response.text || "Sorry, I couldn't process your request. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "An error occurred while getting health advice. Please try again later.";
  }
}

export async function parseHealthTask(userInput: string) {
  try {
    const prompt = `
      Extract a health task from the following text. 
      Text: "${userInput}"
      
      Respond with ONLY a JSON object in this format:
      {
        "title": "string (name of medicine or task)",
        "time": "string (HH:mm format, 24h cycle)",
        "category": "medicine" | "appointment" | "checkup" | "other"
      }
      
      If you cannot find a task, return null.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const text = response.text || "";
    // Clean JSON from potential markdown blocks
    const jsonStr = text.replace(/```json|```/g, "").trim();
    if (!jsonStr || jsonStr.toLowerCase() === 'null') return null;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return null;
  }
}
