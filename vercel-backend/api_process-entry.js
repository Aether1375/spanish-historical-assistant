const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, chatHistory } = req.body;

    if (!imageBase64) return res.status(400).json({ error: "Missing image screen capture" });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY in Vercel settings" });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imagePart = { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } };

    const systemPrompt = `
You are an intelligent vision assistant for Spanish historical document indexing.
You inspect document images line-by-line while conversing with the user in chat.

Your goals:
1. Listen carefully as the user teaches you line-by-line (e.g. keywords, Spanish phrasing, field mappings).
2. Acknowledge what you learned in plain language.
3. Once you feel you understand enough of the record structure to extract the full record accurately, ask the user: "I have understood the process fully. Can I take over and fill out this record for you?"
4. If the user agrees (e.g. says "yes", "take over", "go ahead", "do entry"), set "shouldFill": true and extract the field values into "fields".

Return ONLY JSON with this format:
{
  "reply": "Conversational reply to user...",
  "shouldFill": false,
  "fields": {
    "FieldName": "Value"
  }
}
`;

    const conversationContext = (chatHistory || []).map(m => `${m.role.toUpperCase()}: ${m.text}`).join("\n");
    const fullPrompt = `${systemPrompt}\n\nRecent Chat History:\n${conversationContext}\n\nCurrent Document Image:`;

    const result = await model.generateContent([fullPrompt, imagePart]);
    const jsonResult = JSON.parse(result.response.text());

    return res.status(200).json(jsonResult);

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({
      reply: "I encountered an error analyzing the image: " + (error.message || "Unknown error"),
      shouldFill: false,
      fields: {}
    });
  }
};