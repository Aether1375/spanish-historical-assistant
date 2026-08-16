const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  // Set CORS headers so Chrome Extension background script can call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, userMemoryPrompt, spanishDictionary } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }

    // Clean base64 string if data URL prefix exists
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
You are an expert Spanish historical record indexer. Analyze the provided image of the historical document.
Extract all relevant form fields (such as record/certificate numbers, names, dates, parents, event type) into key-value pairs.

Layout Memory Instructions:
${userMemoryPrompt || "No custom layout prompt provided."}

Custom Spanish Dictionary Context:
${(spanishDictionary || []).join(", ")}

You MUST respond strictly with valid JSON using this exact structure:
{
  "confidenceScore": 95,
  "needsAssistance": false,
  "unrecognizedWords": [],
  "fields": {
    "Certificate or Record Number": "00582",
    "Event Day": "15"
  }
}
If handwriting is illegible or formatting is ambiguous, set confidenceScore below 90 or set needsAssistance to true.
`;

    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const jsonResult = JSON.parse(responseText);

    return res.status(200).json(jsonResult);

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({
      confidenceScore: 0,
      needsAssistance: true,
      unrecognizedWords: ["API_ERROR"],
      fields: {}
    });
  }
};