import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const configured = SUPABASE_URL.includes("YOUR_PROJECT_REF") === false && SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_") && !SUPABASE_PUBLISHABLE_KEY.includes("REPLACE_ME");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
const $ = (s) => document.querySelector(s);
const state = { user: null, scripts: [], category: "All", search: "" };
const demo = [
 {id:"demo-1",title:"Round System Starter",game_name:"Roblox Studio",category:"Gameplay",description:"A beginner-friendly round manager structure for your own Roblox experience. Includes clear phases and server-side flow.",code_text:"-- Round System Starter (educational example)\nlocal Players = game:GetService(\"Players\")\nlocal INTERMISSION = 15\nlocal ROUND_LENGTH = 120\n\nwhile true do\n  print(\"Intermission\")\n  task.wait(INTERMISSION)\n  print(\"Round started\")\n  task.wait(ROUND_LENGTH)\n  print(\"Round ended\")\nend",author_name:"ScriptStore Team",likes_count:24,created_at:new Date().toISOString()},
 {id:"demo-2",title:"Reusable UI Button",game_name:"UI Toolkit",category:"UI",description:"A small reusable Luau function that creates a consistently styled TextButton for a Studio interface.",code_text:"local function styleButton(button)\n  button.AutoButtonColor = true\n  button.Font = Enum.Font.GothamSemibold\n  button.TextSize = 16\n  button.BackgroundColor3 = Color3.fromRGB(110, 88, 220)\n  button.TextColor3 = Color3.new(1, 1, 1)\n  button.BorderSizePixel = 0\nend\n\nreturn styleButton",author_name:"ScriptStore Team",likes_count:18,created_at:new Date().toISOString()},
 {id:"demo-3",title:"Safe DataStore Pattern",game_name:"Learning Lab",category:"Data",description:"A teaching example showing how to wrap DataStore calls with pcall and handle failures gracefully.",code_text:"local DataStoreService = game:GetService(\"DataStoreService\")\nlocal store = DataStoreService:GetDataStore(\"PlayerScores\")\n\nlocal function loadScore(userId)\n  local ok, result = pcall(function()\n    return store:GetAsync(tostring(userId))\n  end)\n  if not ok then\n    warn(\"Could not load score:\", result)\n    return 0\n  end\n  return result or 0\nend\n\nreturn loadScore",author_name:"ScriptStore Team",likes_count:13,created_at:new Date().toISOString()}
];
function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function notice(message){const el=$("#notice");el.textContent=message;el.classList.remove("hidden");}
function setUser(user){state.user=user;$("#loginBtn").classList.toggle("hidden",!!user);$("#accountBtn").classList.toggle("hidden",!user);if(user)$("#accountBtn").textContent=(user.email||"U").slice(0,1).toUpperCase();}
async function loadScripts(){
 if(!supabase){state.scripts=demo;notice("Önizleme modu: Supabase bağlantısı için scriptstore/supabase-config.js dosyasını yapılandır ve SQL şemasını çalıştır.");render();return;}
 const {data,error}=await supabase.from("script_items").select("id,title,game_name,category,description,code_text,created_at,author_id,script_likes(count)").eq("status","published").order("created_at",{ascending:false}).limit(60);
 if(error){state.scripts=demo;notice("Veritabanı henüz hazır değil. SQL şemasını Supabase SQL Editor'de çalıştır.");console.error(error);}
 else state.scripts=(data||[]).map(s=>({...s,likes_count:s.script_likes?.[0]?.count||0,author_name:"Community Developer"}));
 render();
}
function render(){
 let list=state.scripts.filter(s=>(state.category==="All"||s.category===state.category)&&[s.title,s.description,s.game_name,s.category].join(" ").toLowerCase().includes(state.search));
 if($("#sortSelect").value==="popular")list.sort((a,b)=>(b.likes_count||0)-(a.likes_count||0));
 $("#resultCount").textContent=list.length;
 const host=$("#scriptGrid");host.replaceChildren();
 if(!list.length){const e=document.createElement("div");e.className="empty-card";e.textContent="Bu filtrede henüz paylaşım yok. İlk Luau örneğini sen paylaş!";host.append(e);return;}
 list.forEach(s=>{
  const card=document.createElement("article");card.className="script-card";
  const top=document.createElement("div");top.className="card-top";
  const cat=document.createElement("span");cat.className="category";cat.textContent=s.category;
  const stats=document.createElement("span");stats.className="card-stat";stats.textContent="♡ "+(s.likes_count||0);
  top.append(cat,stats);
  const title=document.createElement("h3");title.textContent=s.title;
  const desc=document.createElement("p");desc.textContent=s.description;
  const bottom=document.createElement("div");bottom.className="card-bottom";
  const author=document.createElement("span");author.className="author";author.textContent="◉ "+(s.author_name||"Community");
  const actions=document.createElement("div");actions.className="card-actions";
  const view=document.createElement("button");view.className="small-btn";view.textContent="Kodu görüntüle";view.addEventListener("click",()=>showDetail(s));
  actions.append(view);bottom.append(author,actions);card.append(top,title,desc,bottom);host.append(card);
 });
}
function showDetail(s){
 const host=$("#detailContent");host.replaceChildren();
 const eyebrow=document.createElement("div");eyebrow.className="eyebrow";eyebrow.textContent="LUAU RESOURCE";
 const h=document.createElement("h2");h.textContent=s.title;
 const desc=document.createElement("p");desc.className="muted";desc.textContent=s.description;
 const meta=document.createElement("div");meta.className="detail-meta";
 [s.category,s.game_name||"Roblox Studio","♡ "+(s.likes_count||0)].forEach(t=>{const x=document.createElement("span");x.className="category";x.textContent=t;meta.append(x);});
 const pre=document.createElement("pre");pre.className="code-block";pre.textContent=s.code_text||"";
 const copy=document.createElement("button");copy.className="btn btn-primary";copy.textContent="Kodu kopyala";copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(s.code_text||"");copy.textContent="Kopyalandı ✓";}catch{copy.textContent="Kopyalama başarısız";}});
 host.append(eyebrow,h,desc,meta,pre,copy);$("#detailDialog").showModal();
}
function setCategory(category){state.category=category;document.querySelectorAll("[data-category]").forEach(b=>b.classList.toggle("active",b.dataset.category===category));render();}
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>setCategory(b.dataset.category)));
$("#searchInput").addEventListener("input",e=>{state.search=e.target.value.toLowerCase().trim();render();});
$("#sortSelect").addEventListener("change",render);
$("#loginBtn").addEventListener("click",()=>{if(!supabase){notice("Önce Supabase ayarlarını tamamla.");return;}$("#authDialog").showModal();});
$("#authSwitch").addEventListener("click",()=>{const signup=$("#authTitle").textContent!=="Hesap oluştur";$("#authTitle").textContent=signup?"Hesap oluştur":"Topluluğa katıl";$("#authSubmit").textContent=signup?"Kayıt ol":"Giriş yap";$("#authSwitch").textContent=signup?"Zaten hesabın var mı? Giriş yap":"Hesabın yok mu? Kayıt ol";});
$("#authForm").addEventListener("submit",async e=>{e.preventDefault();if(!supabase)return;const email=$("#authEmail").value.trim(),password=$("#authPassword").value;const signup=$("#authTitle").textContent==="Hesap oluştur";const result=signup?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});$("#authMessage").textContent=result.error?result.error.message:(signup?"Kayıt başarılı. E-posta doğrulaması gerekiyorsa gelen kutunu kontrol et.":"Giriş başarılı.");if(!result.error&&result.data.user){setUser(result.data.user);if(!signup)$("#authDialog").close();}});
$("#publishBtn").addEventListener("click",()=>{if(!state.user){if(supabase)$("#authDialog").showModal();else notice("Paylaşım için önce Supabase kurulumu ve kullanıcı girişi gerekli.");return;}$("#publishDialog").showModal();});
$("#publishForm").addEventListener("submit",async e=>{e.preventDefault();if(!supabase||!state.user)return;const payload={author_id:state.user.id,title:$("#scriptTitle").value.trim(),game_name:$("#gameName").value.trim(),category:$("#scriptCategory").value,description:$("#scriptDescription").value.trim(),code_text:$("#scriptCode").value,status:"pending"};const {error}=await supabase.from("script_items").insert(payload);$("#publishMessage").textContent=error?error.message:"Gönderin inceleme kuyruğuna alındı. Onaylanınca listede görünecek.";if(!error){$("#publishForm").reset();setTimeout(()=>$("#publishDialog").close(),1400);}});
$("#accountBtn").addEventListener("click",async()=>{if(supabase){await supabase.auth.signOut();setUser(null);}});
if(supabase){const {data}=await supabase.auth.getSession();setUser(data.session?.user||null);supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user||null));}
loadScripts();