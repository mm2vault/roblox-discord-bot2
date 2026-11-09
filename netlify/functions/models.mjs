const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300"
};

export default async () => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { "HTTP-Referer": process.env.URL || "https://ai-hub.netlify.app", "X-Title": "AI Hub" }
    });
    if (!response.ok) throw new Error("Model list could not be loaded.");
    const payload = await response.json();
    const models = (payload.data || [])
      .filter(model => model.id && model.name)
      .map(model => ({
        id: model.id,
        name: model.name,
        description: model.description || "",
        contextLength: model.context_length || null,
        pricing: model.pricing || null
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { statusCode: 200, headers, body: JSON.stringify({ models }) };
  } catch (error) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: error.message || "Models unavailable." }) };
  }
};