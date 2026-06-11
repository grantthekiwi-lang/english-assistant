export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (url.pathname === "/api/translate" && request.method === "POST") {
      const apiKey = env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return Response.json({ error: "API key not configured" }, { status: 500 });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "Invalid request" }, { status: 400 });
      }

      const { query, direction, nativeLang } = body;
      if (!query) return Response.json({ error: "No query provided" }, { status: 400 });

      const prompt = buildPrompt(query, direction, nativeLang);

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const text = data.content.map((b) => b.text || "").join("");
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);

        return Response.json(parsed, {
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    try {
  return await env.ASSETS.fetch(request);
} catch {
  return new Response("Not found", { status: 404 });
}
  },
};

function buildPrompt(query, direction, nativeLang) {
  const langNames = { zh: "Simplified Chinese", ja: "Japanese", es: "Spanish" };

  if (direction === "en-to-native") {
    return `You are an English language teacher's assistant. The student has entered the English word or phrase: "${query}".

Return ONLY valid JSON (no markdown, no preamble) in this exact shape:
{
  "english": {
    "word": "the word or phrase",
    "part_of_speech": "noun / verb / adjective / adverb / etc",
    "phonetic": "IPA phonetic, e.g. /bjuːtɪfəl/",
    "example": "A simple clear example sentence suitable for language learners."
  },
  "translations": {
    "zh": {
      "word": "translation in Simplified Chinese",
      "romanization": "Pinyin with tone marks",
      "example": "The example sentence translated into Simplified Chinese"
    },
    "ja": {
      "word": "translation in Japanese (kanji/kana)",
      "romanization": "Romaji",
      "example": "The example sentence translated into Japanese"
    },
    "es": {
      "word": "translation in Spanish",
      "romanization": "",
      "example": "The example sentence translated into Spanish"
    }
  }
}`;
  } else {
    const langName = langNames[nativeLang] || "Chinese";
    return `You are an English language teacher's assistant. A student who speaks ${langName} has entered: "${query}".

Identify what English word or phrase this represents, then return ONLY valid JSON (no markdown) in this exact shape:
{
  "english": {
    "word": "the English word or phrase",
    "part_of_speech": "noun / verb / adjective / adverb / etc",
    "phonetic": "IPA phonetic",
    "example": "A simple clear example sentence suitable for language learners."
  },
  "translations": {
    "zh": {
      "word": "translation in Simplified Chinese",
      "romanization": "Pinyin with tone marks",
      "example": "The example sentence in Simplified Chinese"
    },
    "ja": {
      "word": "translation in Japanese",
      "romanization": "Romaji",
      "example": "The example sentence in Japanese"
    },
    "es": {
      "word": "translation in Spanish",
      "romanization": "",
      "example": "The example sentence in Spanish"
    }
  }
}`;
  }
}
