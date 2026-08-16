const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, exemplars, prompt } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 payload" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Free-form LLM Chat
    if (prompt) {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const currentImage = {
        inlineData: { mimeType: "image/jpeg", data: imageBase64.replace(/^data:image\/\w+;base64,/, "") }
      };
      const result = await model.generateContent([prompt, currentImage]);
      return res.status(200).json({ result: result.response.text() });
    }

    // In-Context Learning Mode (Few-Shot Vision)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const contents = [];

    // System prompt instructing LLM to infer reasoning pattern
    contents.push(`You are an expert Spanish historical record indexer. 
Study the example image(s) and their verified field extractions below to understand the handwriting style, record format, and extraction logic.
Then extract the fields from the final target image following that exact same reasoning and structure.`);

    // Attach saved teaching exemplars (Image + JSON output pairs)
    if (exemplars && exemplars.length > 0) {
      exemplars.forEach((ex, idx) => {
        const exImage = {
          inlineData: {
            mimeType: "image/jpeg",
            data: ex.image.replace(/^data:image\/\w+;base64,/, "")
          }
        };
        contents.push(`Example ${idx + 1} Image:`);
        contents.push(exImage);
        contents.push(`Example ${idx + 1} Target Extraction:\n${JSON.stringify(ex.fields, null, 2)}`);
      });
    }

    // Attach target document image to be indexed
    const targetImage = {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64.replace(/^data:image\/\w+;base64,/, "")
      }
    };
    contents.push("Target Document Image to Index:");
    contents.push(targetImage);
    contents.push("Extract the fields into JSON matching the structure and reasoning shown in the examples above:");

    const result = await model.generateContent(contents);
    const jsonResult = JSON.parse(result.response.text());

    return res.status(200).json({ fields: jsonResult });

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ error: error.message });
  }
};