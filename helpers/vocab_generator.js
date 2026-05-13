import { JSONFilePreset } from "lowdb/node";
import OpenAI from "openai";

// uses local model - Apple On-Device (e.g. LLaMA 2)
const client = new OpenAI({
  baseURL: "http://127.0.0.1:11535/v1",
  apiKey: "not-needed",
});

const word_list = await JSONFilePreset("word_list.json", []);

// create db.json
const dbSchema = [
  {
    day: "string",
    words: [
      {
        word: "string",
        phonetic: "string",
        definition: ["string"],
        example: ["string"],
        forms: [{ type: "string", word: "string" }],
      },
    ],
  },
];

const db = await JSONFilePreset("db.json", []);
await db.read();

// ensure db.data exists
db.data ||= [];

for (let i = 0; i < word_list.data.length; i += 30) {
  const day = String(i / 30 + 1);
  console.log(`Processing Day ${day}...`);
  const words = [];

  for (const entry of word_list.data.slice(i, i + 30)) {
    try {
      console.log(`Generating data for: ${entry}`);

      const response = await client.chat.completions.create({
        model: "apple-on-device",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant for English learners. Always return valid JSON only.",
          },
          {
            role: "user",
            content: `
For the word I provide, return:
- phonetic pronunciation
- two definitions
- two example sentences
- other forms of the word

Return ONLY valid JSON in this exact format:

{
  "word": "string",
  "phonetic": "string",
  "definition": ["string", "string"],
  "example": ["string", "string"],
  "forms": [
    {
      "type": "string",
      "word": "string"
    }
  ]
}

Word: ${entry}
            `,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content || "";

      // clean markdown if model wraps json in ```
      const cleaned = raw
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const data = JSON.parse(cleaned);

      words.push({
        word: data.word || entry,
        phonetic: data.phonetic || "",
        definition: Array.isArray(data.definition) ? data.definition : [],
        example: Array.isArray(data.example) ? data.example : [],
        forms: Array.isArray(data.forms) ? data.forms : [],
      });

      // optional small delay for local model stability
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.error(`Failed for word: ${entry}`);
      console.error(err);
    }
  }

  db.data.push({
    day,
    words,
  });

  // save after each batch/day
  await db.write();

  console.log(`Saved Day ${day}`);
}

console.log("Done!");
