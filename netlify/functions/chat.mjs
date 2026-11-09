const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
const json = (statusCode, data) => ({ statusCode, headers, body: JSON.stringify(data) });
const buckets = new Map();

function rateLimited(event) {
  const ip = event.headers?.["x-nf-client-connection-ip"] || event.headers?.["client-ip"] || "unknown";
  const now = Date.now();
  const record = buckets.get(ip) || { start: now, count: 0 };
  if (now - record.start > 60_000) { record.start = now; record.count = 0; }
  record.count += 1;
  buckets.set(ip, record);
  if (buckets.size > 2000) {
    for (const [key, value] of buckets) if (now - value.start > 60_000) buckets.delete(key);
  }
  return record.count > 12;
}

const retryableStatus = status => [401, 402, 403, 408, 409, 425, 429].includes(status) || status >= 500;
const cleanKey = value => typeof value === "string" && value.trim().length >= 12 && value.trim().length <= 500 ? value.trim() : "";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Only POST requests are allowed." });
  const origin = event.headers?.origin;
  const allowedOrigins = [process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean);
  if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) return json(403, { error: "Request origin is not allowed." });
  if (rateLimited(event)) return json(429, { error: "Too many requests. Wait a minute and try again." });

  try {
    if ((event.body || "").length > 250_000) return json(413, { error: "Request is too large." });
    const body = JSON.parse(event.body || "{}");
    const model = typeof body.model === "string" ? body.model : "";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!model || model.length > 200) return json(400, { error: "Choose a valid model." });
    if (!messages.length || messages.length > 30) return json(400, { error: "Send between 1 and 30 messages." });
    const safeMessages = messages.map(message => ({
      role: ["user", "assistant"].includes(message.role) ? message.role : "user",
      content: typeof message.content === "string" ? message.content.slice(0, 12000) : ""
    })).filter(message => message.content.trim());
    if (!safeMessages.length) return json(400, { error: "Message cannot be empty." });

    const personalKeys = Array.isArray(body.apiKeys) ? body.apiKeys.map(cleanKey).filter(Boolean) : [];
    const sharedKeys = [
      ...(process.env.OPENROUTER_API_KEYS || "").split(/[\n,;]+/),
      process.env.OPENROUTER_API_KEY || ""
    ].map(cleanKey).filter(Boolean);
    const candidates = [
      ...personalKeys.map((key, index) => ({ key, source: "personal", index })),
      ...sharedKeys.map((key, index) => ({ key, source: "shared", index }))
    ].filter((entry, index, all) => all.findIndex(other => other.key === entry.key) === index);
    if (!candidates.length) return json(503, { error: "Henüz API anahtarı eklenmedi. Ayarlardan kendi OpenRouter anahtarını ekle veya site sahibinin ortak havuzu yapılandırmasını bekle." });

    const personalKeyStatuses = Array(personalKeys.length).fill("not_tested");
    let lastFailure = { status: 502, message: "No API key could complete the request." };
    for (const candidate of candidates) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${candidate.key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.URL || "https://ai-hub.netlify.app",
            "X-Title": "AI Hub"
          },
          body: JSON.stringify({ model, messages: safeMessages, temperature: 0.7, max_tokens: 1800 })
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          const answer = result?.choices?.[0]?.message?.content;
          if (!answer) return json(502, { error: "The model returned an empty response." });
          if (candidate.source === "personal") personalKeyStatuses[candidate.index] = "active";
          return json(200, {
            answer,
            model: result.model || model,
            usage: result.usage || null,
            usedKeySource: candidate.source,
            usedPersonalKeyIndex: candidate.source === "personal" ? candidate.index : null,
            personalKeyStatuses
          });
        }
        lastFailure = { status: response.status, message: (result?.error?.message || "The AI provider returned an error.").slice(0, 500) };
        if (candidate.source === "personal") personalKeyStatuses[candidate.index] = [402, 429].includes(response.status) ? "rate_limited" : [401, 403].includes(response.status) ? "invalid" : "error";
        if (!retryableStatus(response.status)) {
          return json(response.status, { error: lastFailure.message, personalKeyStatuses });
        }
      } catch {
        lastFailure = { status: 502, message: "A network error occurred while contacting the AI provider." };
        if (candidate.source === "personal") personalKeyStatuses[candidate.index] = "error";
      }
    }
    return json(lastFailure.status, {
      error: "Tüm API anahtarları denendi ancak hiçbiri yanıt veremedi. Anahtar limitlerini ve bakiyelerini kontrol et. Son hata: " + lastFailure.message,
      personalKeyStatuses
    });
  } catch (error) {
    return json(400, { error: error.message || "Invalid request." });
  }
};