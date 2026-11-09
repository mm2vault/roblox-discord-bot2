const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*"
};

const json = (statusCode, data) => ({ statusCode, headers, body: JSON.stringify(data) });

export default async (request) => {
  if (request.method !== "POST") return json(405, { error: "Only POST requests are allowed." });
  if (!process.env.OPENROUTER_API_KEY) return json(503, { error: "AI service is not configured yet. Add OPENROUTER_API_KEY in Netlify environment variables." });

  try {
    const body = await request.json();
    const model = typeof body.model === "string" ? body.model : "";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!model || model.length > 200) return json(400, { error: "Choose a valid model." });
    if (!messages.length || messages.length > 30) return json(400, { error: "Send between 1 and 30 messages." });

    const safeMessages = messages.map(message => {
      const role = ["user", "assistant"].includes(message.role) ? message.role : "user";
      const content = typeof message.content === "string" ? message.content.slice(0, 12000) : "";
      return { role, content };
    }).filter(message => message.content.trim());

    if (!safeMessages.length) return json(400, { error: "Message cannot be empty." });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.URL || "https://ai-hub.netlify.app",
        "X-Title": "AI Hub"
      },
      body: JSON.stringify({
        model,
        messages: safeMessages,
        temperature: 0.7,
        max_tokens: 1800
      })
    });

    const result = await response.json();
    if (!response.ok) {
      const message = result?.error?.message || "The AI provider returned an error.";
      return json(response.status, { error: message.slice(0, 500) });
    }
    const answer = result?.choices?.[0]?.message?.content;
    if (!answer) return json(502, { error: "The model returned an empty response." });
    return json(200, { answer, model: result.model || model, usage: result.usage || null });
  } catch (error) {
    return json(400, { error: error.message || "Invalid request." });
  }
};