const $ = (selector) => document.querySelector(selector);
const state = { models: [], currentId: null, messages: [], busy: false };
const STORAGE_KEY = "aihub_conversations_v1";
const API_KEYS_KEY = "aihub_personal_api_keys_v1";

function loadApiKeys() {
  try { return JSON.parse(localStorage.getItem(API_KEYS_KEY) || "[]").filter(item => item && typeof item.key === "string"); }
  catch { return []; }
}
function saveApiKeys(keys) {
  localStorage.setItem(API_KEYS_KEY, JSON.stringify(keys));
  renderApiKeys();
}
function maskKey(key) {
  return key.length > 9 ? key.slice(0, 5) + "••••••" + key.slice(-4) : "••••••••";
}
function renderApiKeys() {
  const host = $("#apiKeyList");
  if (!host) return;
  const keys = loadApiKeys();
  host.innerHTML = "";
  if (!keys.length) {
    const empty = document.createElement("p");
    empty.className = "api-key-empty";
    empty.textContent = "Henüz kişisel anahtar eklenmedi. İstersen site sahibinin ortak havuzu kullanılabilir.";
    host.appendChild(empty);
    return;
  }
  keys.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "api-key-row";
    const info = document.createElement("div");
    info.className = "api-key-info";
    const label = document.createElement("strong");
    label.textContent = "Anahtar " + (index + 1) + " · " + maskKey(item.key);
    const status = document.createElement("small");
    status.textContent = ({active:"Son istekte başarılı", rate_limited:"Limit dolu — sonraki anahtar denenir", invalid:"Anahtar geçersiz — sonraki anahtar denenir", error:"Geçici hata — sonraki anahtar denenir"})[item.status] || "Hazır";
    info.append(label, status);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-api-key";
    remove.textContent = "Sil";
    remove.setAttribute("aria-label", "Anahtarı sil");
    remove.addEventListener("click", () => saveApiKeys(loadApiKeys().filter(entry => entry.id !== item.id)));
    row.append(info, remove);
    host.appendChild(row);
  });
}
function addApiKey() {
  const input = $("#apiKeyInput");
  const key = input.value.trim();
  if (!key) { alert("Önce API anahtarını yapıştır."); return; }
  if (!/^sk-or-v1-[A-Za-z0-9_-]+$/.test(key)) { alert("Bu anahtar OpenRouter biçiminde görünmüyor. Anahtarı kontrol et."); return; }
  const keys = loadApiKeys();
  if (keys.some(item => item.key === key)) { alert("Bu anahtar zaten eklenmiş."); return; }
  keys.push({ id: newId(), key, status: "ready" });
  saveApiKeys(keys);
  input.value = "";
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveHistory() { localStorage.setItem(STORAGE_KEY, JSON.stringify(loadHistory())); }
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function titleFrom(messages) {
  const first = messages.find(m => m.role === "user")?.content || "Yeni sohbet";
  return first.length > 42 ? first.slice(0, 42) + "…" : first;
}
function persistCurrent() {
  if (!state.messages.length) return;
  const all = loadHistory();
  const item = { id: state.currentId || newId(), title: titleFrom(state.messages), messages: state.messages, updatedAt: Date.now() };
  state.currentId = item.id;
  const index = all.findIndex(entry => entry.id === item.id);
  if (index >= 0) all[index] = item; else all.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 40)));
  renderHistory();
}
function renderHistory() {
  const history = loadHistory();
  $("#historyList").innerHTML = history.length ? history.slice(0, 8).map(item => `<button class="history-entry" data-id="${item.id}">${escapeHtml(item.title)}</button>`).join("") : '<p class="empty-history">Henüz sohbet yok</p>';
  $("#libraryCards").innerHTML = history.length ? history.map(item => `<button class="library-card" data-id="${item.id}"><strong>${escapeHtml(item.title)}</strong><small>${new Date(item.updatedAt).toLocaleString("tr-TR")} · ${item.messages.length} mesaj</small></button>`).join("") : '<div class="settings-card">Henüz kaydedilmiş sohbet yok.</div>';
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
function showMessages() {
  $("#messages").innerHTML = state.messages.map(message => `<article class="message ${message.role === "user" ? "user" : "assistant"}"><div class="message-avatar">${message.role === "user" ? "●" : "✳"}</div><div><div class="message-meta">${message.role === "user" ? "Sen" : "AI Hub"}</div><div class="message-content">${escapeHtml(message.content)}</div></div></article>`).join("");
  $("#messages").scrollTop = $("#messages").scrollHeight;
  $("#welcome").classList.toggle("hidden", state.messages.length > 0);
}
function setView(view) {
  $("#chatView").classList.toggle("hidden", view !== "chat");
  $("#libraryView").classList.toggle("hidden", view !== "library");
  $("#settingsView").classList.toggle("hidden", view !== "settings");
  $("#topTitle").textContent = view === "chat" ? "AI Sohbet" : view === "library" ? "Sohbet geçmişi" : "Ayarlar";
  document.querySelectorAll(".nav-item[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("#sidebar").classList.remove("open");
}
async function loadModels() {
  try {
    const response = await fetch("/.netlify/functions/models");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Modeller yüklenemedi.");
    state.models = data.models || [];
    $("#modelSelect").innerHTML = state.models.length ? state.models.map(model => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.name)}</option>`).join("") : '<option value="">Model bulunamadı</option>';
    $("#apiStatus").textContent = state.models.length + " model hazır";
    $("#settingsStatus").textContent = "● Model listesi bağlantısı aktif";
    $("#settingsStatus").style.color = "#7cdaa7";
    updateModelNote();
  } catch (error) {
    $("#modelSelect").innerHTML = '<option value="">Bağlantı kurulamadı</option>';
    $("#apiStatus").textContent = "API kurulumu gerekli";
    $("#settingsStatus").textContent = "● " + error.message;
  }
}
function updateModelNote() {
  const model = state.models.find(item => item.id === $("#modelSelect").value);
  $("#modelNote").textContent = model?.contextLength ? Math.round(model.contextLength / 1000) + "K context" : "Model seçildi";
}
async function sendMessage(prefill) {
  if (state.busy) return;
  const input = $("#messageInput");
  const content = (prefill ?? input.value).trim();
  const model = $("#modelSelect").value;
  if (!content) return;
  if (!model) { alert("Önce bir model seç. Ayarlar bölümünden API kurulumunu kontrol edebilirsin."); return; }
  if (!state.currentId) state.currentId = newId();
  state.messages.push({ role: "user", content });
  input.value = "";
  input.style.height = "auto";
  state.busy = true;
  $("#sendButton").disabled = true;
  showMessages();
  const loading = document.createElement("article");
  loading.className = "message assistant";
  loading.innerHTML = '<div class="message-avatar">✳</div><div><div class="message-meta">AI Hub</div><div class="message-content typing">Yanıt hazırlanıyor…</div></div>';
  $("#messages").appendChild(loading);
  $("#messages").scrollTop = $("#messages").scrollHeight;
  try {
    const response = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: state.messages, apiKeys: loadApiKeys().map(item => item.key) })
    });
    const data = await response.json();
    if (Array.isArray(data.personalKeyStatuses)) {
      const keys = loadApiKeys();
      data.personalKeyStatuses.forEach((status, index) => { if (keys[index]) keys[index].status = status; });
      if (Number.isInteger(data.usedPersonalKeyIndex) && keys[data.usedPersonalKeyIndex]) keys[data.usedPersonalKeyIndex].status = "active";
      saveApiKeys(keys);
    }
    if (!response.ok) throw new Error(data.error || "Bir hata oluştu.");
    state.messages.push({ role: "assistant", content: data.answer + (data.usedKeySource === "shared" ? "\\n\\n_Not: Site sahibinin ortak API havuzu kullanıldı._" : "") });
  } catch (error) {
    state.messages.push({ role: "assistant", content: "Bağlantı hatası: " + error.message });
  } finally {
    state.busy = false;
    $("#sendButton").disabled = false;
    showMessages();
    persistCurrent();
    input.focus();
  }
}
function openConversation(id) {
  const item = loadHistory().find(entry => entry.id === id);
  if (!item) return;
  state.currentId = item.id;
  state.messages = item.messages || [];
  showMessages();
  setView("chat");
}
function startNewChat() {
  state.currentId = null;
  state.messages = [];
  showMessages();
  setView("chat");
  $("#messageInput").focus();
}

$("#sendButton").addEventListener("click", () => sendMessage());
$("#messageInput").addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
});
$("#messageInput").addEventListener("input", event => {
  event.target.style.height = "auto";
  event.target.style.height = Math.min(event.target.scrollHeight, 180) + "px";
});
$("#modelSelect").addEventListener("change", updateModelNote);
$("#newChat").addEventListener("click", startNewChat);
$("#clearChat").addEventListener("click", startNewChat);
$("#settingsButton").addEventListener("click", () => setView("settings"));
document.querySelectorAll(".nav-item[data-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelectorAll(".suggestion").forEach(button => button.addEventListener("click", () => { $("#messageInput").value = button.dataset.prompt + " "; $("#messageInput").focus(); }));
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#historyList").addEventListener("click", event => { const button = event.target.closest("[data-id]"); if (button) openConversation(button.dataset.id); });
$("#libraryCards").addEventListener("click", event => { const button = event.target.closest("[data-id]"); if (button) openConversation(button.dataset.id); });
$("#deleteHistory").addEventListener("click", () => { if (confirm("Bu cihazdaki tüm sohbet geçmişi silinsin mi?")) { localStorage.removeItem(STORAGE_KEY); renderHistory(); startNewChat(); } });
renderHistory();
renderApiKeys();
$("#addApiKey")?.addEventListener("click", addApiKey);
$("#apiKeyInput")?.addEventListener("keydown", event => { if (event.key === "Enter") addApiKey(); });
loadModels();
showMessages();