"use strict";

/* =====================================================================
   Helpers
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
if (matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.defaults({ duration: 0 });

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { ...(opts.headers || {}), "X-Lang": LANG } });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.detail || msg; } catch { /* not JSON */ }
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return res.json();
}
const json = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function toast(msg, err = false, action = null) {
  const el = h("div", { class: "toast rise" + (err ? " err" : "") }, msg, action && h("button", { onclick: () => { action.fn(); el.remove(); } }, action.label));
  $("#toasts").append(el);
  setTimeout(() => el.classList.add("leaving"), err ? 7000 : 4000);
  setTimeout(() => el.remove(), err ? 7300 : 4300);
}

/** Fade-in via CSS: never gets stuck invisible (unlike a JS tween in a throttled tab). */
function rise(els, cap = 14) {
  [...els].forEach((el, i) => {
    el.style.setProperty("--i", Math.min(i, cap));
    el.classList.remove("rise");
    void el.offsetWidth;
    el.classList.add("rise");
  });
}

/** Make errors visible instead of failing silently. */
window.addEventListener("error", (e) => toast(t("err.prefix", { m: e.message }), true));
window.addEventListener("unhandledrejection", (e) => toast(t("err.prefix", { m: e.reason?.message || e.reason }), true));

const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const fmtDate = (ts) => new Date(ts * 1000).toLocaleString(LOCALE(), { dateStyle: "short", timeStyle: "short" });
const fmtBytes = (b) => (b > 1e9 ? (b / 1e9).toFixed(1) + " GB" : (b / 1e6).toFixed(b > 1e8 ? 0 : 1) + " MB");
const ICON_PLAY = '<svg viewBox="0 0 12 12"><path d="M2 1l9 5-9 5z"/></svg>';
const ICON_STOP = '<svg viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" rx="1"/></svg>';
const vlabel = (v) => t("verdict." + v);
const sampleLabel = (s) => (["Erste Aufnahme", "First recording"].includes(s.label) ? t("manage.firstRecording") : s.label);
const voiceLabel = (name) => (name === "Eingebaute Stimme" ? t("common.builtinLegacy") : name);

const state = {
  settings: { lang: null, gen_lang: "en", disclaimer: null, disclaimer_version: 1 },
  sys: null,
  voices: [],
  history: [],
  selected: null, // voice id, null = built-in voice
  builtin: "", // "" = automatic
  builtinList: [],
  prompts: { en: [], de: [] },
  promptLang: "en",
  promptIdx: 0,
  pending: null,
  genLang: "en",
  lastItem: null,
  lastReport: null,
  captureTarget: "", // "" = new voice
  view: "studio",
  selecting: false,
  sel: new Set(),
  gal: { f: "all", q: "", voice: "", lang: "", sort: "new" },
  vq: "",
  manage: null,
  discReadOnly: false,
};

/* =====================================================================
   Overlay windows (not <dialog>: nothing can stay invisible and block the page)
   ===================================================================== */
const modalStack = [];
const Modal = {
  open(el, onCancel) {
    el._cancel = onCancel || (() => Modal.close(el));
    el.hidden = false;
    modalStack.push(el);
    rise([el.querySelector(".modal-box")], 0);
  },
  close(el) {
    el.hidden = true;
    const i = modalStack.indexOf(el);
    if (i >= 0) modalStack.splice(i, 1);
    el.dispatchEvent(new Event("modalclose"));
  },
};
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modalStack.length) modalStack[modalStack.length - 1]._cancel(); });
$$(".modal").forEach((m) => m.addEventListener("mousedown", (e) => { if (e.target === m) m._cancel?.(); }));

function ask({ title, text = "", input = false, value = "", ok = t("common.ok"), danger = false }) {
  return new Promise((resolve) => {
    const dlg = $("#dlg"), inp = $("#dlgInput"), okb = $("#dlgOk"), form = $("#dlgForm");
    $("#dlgTitle").textContent = title;
    $("#dlgText").textContent = text;
    $("#dlgText").hidden = !text;
    inp.hidden = !input;
    inp.value = value;
    okb.textContent = ok;
    okb.classList.toggle("danger", danger);
    const done = (v) => { Modal.close(dlg); resolve(v); };
    form.onsubmit = (e) => { e.preventDefault(); done(input ? inp.value.trim() : true); };
    $("#dlgCancel").onclick = () => done(null);
    Modal.open(dlg, () => done(null));
    (input ? inp : okb).focus();
    if (input) inp.select();
  });
}

/* =====================================================================
   Settings, language, disclaimer
   ===================================================================== */
async function loadSettings() {
  let s = null;
  try { s = await api("/api/settings"); } catch { try { s = JSON.parse(localStorage.getItem("vc.settings") || "null"); } catch { /* ignore */ } }
  state.settings = { ...state.settings, ...(s || {}) };
  LANG = state.settings.lang || ((navigator.language || "en").toLowerCase().startsWith("de") ? "de" : "en");
  state.genLang = state.settings.gen_lang || "en";
}
async function saveSettings(patch) {
  Object.assign(state.settings, patch);
  try { localStorage.setItem("vc.settings", JSON.stringify(state.settings)); } catch { /* ignore */ }
  try { Object.assign(state.settings, await api("/api/settings", json("PUT", patch))); } catch { /* server without settings support: stays stored locally */ }
}

function setLang(l) {
  if (l === LANG) return;
  LANG = l;
  saveSettings({ lang: l });
  applyAll();
}

/** Re-label everything that is not static data-i18n. */
function applyAll() {
  applyI18n();
  $("#genLang").value = state.genLang;
  $$("#galSort option").forEach((o) => (o.textContent = t({ new: "gal.sortNew", old: "gal.sortOld", long: "gal.sortLong" }[o.value])));
  $("#recHint").textContent = rec.active ? t("cap.hintRec") : t("cap.hint");
  $("#resultPlay").textContent = resultWS?.isPlaying() ? t("result.pause") : t("result.play");
  $("#resultFav").textContent = state.lastItem?.fav ? t("result.faved") : t("result.fav");
  if (state.lastItem) { $("#resultMeta").textContent = resultMetaText(state.lastItem); $("#resultLock").textContent = t("ctl.lock"); }
  renderExpressionBars(); renderPresets(); renderRefOptions(); syncControlsUI();
  $("#reviewPlay").textContent = reviewWS?.isPlaying() ? t("result.pause") : t("cap.listen");
  renderPicker(); renderRecent(); renderPromptChips(); syncSaveTarget(); renderVoices(false); renderGallery(false); renderSettings();
  updateSelBar();
  if (!$("#vdlg").hidden) renderManage();
  if (!$("#disc").hidden) renderDisclaimer();
  if (state.lastReport && !$("#report").hidden) showReport(state.lastReport, false);
  refreshSystem();
}

function renderSettings() {
  setSeg($("#uiLang"), LANG);
  $("#defGenLang").value = state.settings.gen_lang || "en";
  const d = state.settings.disclaimer;
  $("#discStatus").textContent = d ? t("set.accepted", { d: new Date(d.accepted_at * 1000).toLocaleDateString(LOCALE(), { dateStyle: "long" }) }) : t("set.notAccepted");
  const e = state.sys?.engine;
  if (e) {
    $("#aboutModel").textContent = e.model;
    $("#aboutWeights").textContent = e.weights;
    $("#aboutNet").textContent = e.offline ? t("set.offline") : t("set.online");
    $("#aboutDevice").textContent = e.device && e.device !== "?" ? e.device.replace("cuda:", "") : "-";
  }
}

function renderDisclaimer() {
  $("#discList").replaceChildren(...[1, 2, 3, 4, 5].map((i) => h("li", {}, h("strong", {}, t(`disc.${i}.t`)), h("span", {}, t(`disc.${i}.p`)))));
  $("#discAgreeRow").hidden = state.discReadOnly;
  const btn = $("#discBtn");
  btn.textContent = state.discReadOnly ? t("disc.close") : t("disc.start");
  btn.disabled = !state.discReadOnly && !$("#discAgree").checked;
  setSeg($("#discLang"), LANG);
}
function showDisclaimer(readOnly = false) {
  state.discReadOnly = readOnly;
  $("#discAgree").checked = false;
  renderDisclaimer();
  // On first start it cannot be dismissed: neither Esc nor a click outside closes the window.
  Modal.open($("#disc"), readOnly ? () => Modal.close($("#disc")) : () => {});
}
$("#discAgree").addEventListener("change", () => ($("#discBtn").disabled = !$("#discAgree").checked));
$("#discBtn").addEventListener("click", async () => {
  if (!state.discReadOnly) await saveSettings({ disclaimer: { version: state.settings.disclaimer_version, accepted_at: Date.now() / 1000 } });
  Modal.close($("#disc"));
  renderSettings();
});
$("#discOpen").addEventListener("click", () => showDisclaimer(true));

/* =====================================================================
   Global audio player
   ===================================================================== */
const Player = { audio: new Audio(), key: null };
function syncPlayers() {
  const a = Player.audio, playing = !a.paused;
  $$(".play[data-pkey]").forEach((el) => {
    const on = el.dataset.pkey === Player.key && playing;
    el.classList.toggle("is-playing", on);
    if (el.dataset.icon !== (on ? "s" : "p")) { el.innerHTML = on ? ICON_STOP : ICON_PLAY; el.dataset.icon = on ? "s" : "p"; }
  });
  $$("[data-prog]").forEach((p) => {
    const on = p.dataset.prog === Player.key && a.duration;
    p.firstElementChild.style.width = on ? `${(a.currentTime / a.duration) * 100}%` : "0%";
  });
}
["play", "pause", "ended", "timeupdate"].forEach((ev) => Player.audio.addEventListener(ev, syncPlayers));
function playBtn(key, url, big = false) {
  return h("button", {
    class: "play" + (big ? " lg" : ""), "data-pkey": key,
    onclick: (e) => {
      e.stopPropagation();
      const a = Player.audio;
      if (Player.key === key && !a.paused) return a.pause();
      if (Player.key !== key) { Player.key = key; a.src = url; }
      a.play();
    },
  });
}
function stopPlayer() { Player.audio.pause(); }

/* =====================================================================
   Router / navigation
   ===================================================================== */
const VIEWS = ["studio", "capture", "voices", "gallery", "settings"];
const navInk = $(".nav-ink");

function moveNavInk() {
  const item = $(`.nav-item[data-view="${state.view}"]`);
  navInk.style.transform = `translateY(${item.offsetTop}px)`;
}
function route() {
  const name = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "studio";
  showView(name);
}
function showView(name) {
  const first = !$(".view:not([hidden])");
  if (state.selecting) exitSelect();
  state.view = name;
  for (const v of VIEWS) {
    const el = $(`#view-${v}`);
    if (v === name) {
      if (!el.hidden) continue;
      el.hidden = false;
      el.scrollTop = 0;
      if (!first) rise(el.querySelectorAll(".vhead, .card, .filters, .big-empty"));
    } else el.hidden = true;
  }
  $$(".nav-item").forEach((n) => n.classList.toggle("is-on", n.dataset.view === name));
  moveNavInk();
  if (name === "capture") { moveTabInk(); syncSaveTarget(); }
  if (name === "voices") renderVoices();
  if (name === "gallery") renderGallery();
  if (name === "studio") { renderPicker(); renderRecent(); }
  if (name === "settings") renderSettings();
}
window.addEventListener("hashchange", route);
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea, select") || e.ctrlKey || e.metaKey || e.altKey || modalStack.length) return;
  const i = "12345".indexOf(e.key);
  if (i >= 0) location.hash = VIEWS[i];
});

/* =====================================================================
   System / status bar
   ===================================================================== */
let lastEngineState = "";
let genTimer = null;

async function refreshSystem() {
  try {
    const s = await api("/api/system");
    state.sys = s;
    const e = s.engine;
    $("#stEngine").dataset.state = e.state;
    $("#stEngineText").textContent = t("st." + (["ready", "error", "warming", "loading", "idle"].includes(e.state) ? e.state : "idle"));
    if (e.state === "error" && lastEngineState !== "error") toast(e.error || t("st.error"), true);
    if (e.state === "ready" && lastEngineState !== "ready") onEngineReady();
    lastEngineState = e.state;
    $("#stVoices").textContent = s.voices;
    $("#stBytes").textContent = fmtBytes(s.bytes);
    $("#navVoices").textContent = s.voices;
    $("#navClips").textContent = s.clips;
    const g = s.gpu;
    $("#stGpu").hidden = !g;
    if (g) {
      $("#stGpuName").textContent = g.name.replace("NVIDIA GeForce ", "");
      $("#stVram").style.width = `${(g.used / g.total) * 100}%`;
      $("#stVramText").textContent = `${(g.used / 1e9).toFixed(1)} / ${(g.total / 1e9).toFixed(0)} GB`;
    }
    if (!genTimer && !rec.active) setActivity(e.busy ? t("st.generating") : e.state === "ready" ? t("st.ready") : "", e.busy);
    if (state.view === "settings") renderSettings();
  } catch {
    $("#stEngineText").textContent = t("st.unreachable");
    $("#stEngine").dataset.state = "error";
  }
}
function setActivity(text, busy = false) {
  $("#stActivity").replaceChildren(h("span", { class: busy ? "act-busy" : "" }, text));
  $("#status").classList.toggle("busy", busy);
}
async function onEngineReady() {
  gsap.fromTo("#stEngine", { scale: 1.08 }, { scale: 1, duration: 0.5, ease: "back.out(3)", clearProps: "all" });
  try { state.builtinList = await api("/api/builtin-voices"); } catch { /* optional */ }
  renderPicker();
}
function pollSystem() {
  refreshSystem().finally(() => setTimeout(pollSystem, lastEngineState === "ready" ? 4000 : 1500));
}

/* =====================================================================
   Studio
   ===================================================================== */
function bindSeg(root, onChange) {
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-lang]");
    if (!b) return;
    setSeg(root, b.dataset.lang);
    onChange(b.dataset.lang);
  });
}
function setSeg(root, lang) { $$("button", root).forEach((b) => b.classList.toggle("is-on", b.dataset.lang === lang)); }
/** Fill a language select (speech languages of the model). */
function fillLangSelect(sel, value) {
  sel.replaceChildren(...SPEECH_LANGS.map(([c, n]) => h("option", { value: c }, n)));
  sel.value = value;
}
const setGenLang = (l) => { state.genLang = l; $("#genLang").value = l; };

$("#genLang").addEventListener("change", (e) => (state.genLang = e.target.value));
bindSeg($("#uiLang"), setLang);
bindSeg($("#discLang"), setLang);
$("#defGenLang").addEventListener("change", (e) => { saveSettings({ gen_lang: e.target.value }); setGenLang(e.target.value); });
const textarea = $("#text");
textarea.addEventListener("input", () => { $("#chars").textContent = `${textarea.value.length} / 2000`; syncEmotionChips(); syncSegInfo(); });
textarea.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) generate(); });
$("#genBtn").addEventListener("click", generate);


/* ----- Expression: emotion, sounds, emphasis ----- */
const EMOTIONS = ["angry", "contemplative", "excited", "joyful", "mundane", "nervous", "sad", "stern", "surprised", "tender"];
const EVENTS = ["pause", "sigh", "gasp", "laugh", "giggle", "growl", "gulp", "scoff", "sob", "um"];
const EMO_RE = /^\s*\[(\w+)\]\s*/;

function currentEmotion() {
  const m = textarea.value.match(EMO_RE);
  return m && EMOTIONS.includes(m[1]) ? m[1] : null;
}
function setText(v) {
  if (v.length > 2000) return toast(t("err.prefix", { m: "2000" }), true);
  textarea.value = v;
  textarea.dispatchEvent(new Event("input"));
}
const EMO_ALL = new RegExp("\\[(" + EMOTIONS.join("|") + ")\\]", "gi");
let emoMode = "start"; // "start": set/replace the emotion at the start of the text, "cursor": start a new section with an emotion at the cursor

/** Mirror of the server logic (app/emotions.py), display only: which sections will be generated? */
function emotionSections(text) {
  const ms = [...text.matchAll(EMO_ALL)];
  const parts = [];
  const head = (ms.length ? text.slice(0, ms[0].index) : text).trim();
  if (head) parts.push([null, head]);
  ms.forEach((m, i) => {
    const body = text.slice(m.index + m[0].length, i + 1 < ms.length ? ms[i + 1].index : text.length).trim();
    if (body) parts.push([m[1].toLowerCase(), body]);
  });
  return parts.filter((p, i) => i === 0 || p[0] !== parts[i - 1][0]);
}
function syncSegInfo() {
  const box = $("#segInfo");
  const parts = state.ctl.split === "off" ? [] : emotionSections(textarea.value);
  box.hidden = parts.length < 2;
  if (parts.length >= 2) box.textContent = t("ctl.segments", { n: parts.length, list: parts.map(([e]) => (e ? `[${e}]` : "…")).join(" → ") });
}
function insertEmotionAtCursor(emo) {
  const el = textarea, a = el.selectionStart, b = el.selectionEnd;
  const before = el.value.slice(0, a), after = el.value.slice(b);
  const nl = before && !before.endsWith("\n") ? "\n" : ""; // every new section starts on its own line
  setText(before + nl + `[${emo}] ` + after.replace(/^[ \t]+/, ""));
  const pos = (before + nl + `[${emo}] `).length;
  el.focus(); el.setSelectionRange(pos, pos);
}
$$("#emoMode button").forEach((b) => b.addEventListener("click", () => {
  emoMode = b.dataset.mode;
  $$("#emoMode button").forEach((x) => x.classList.toggle("is-on", x === b));
}));
function setEmotion(emo) {
  if (emoMode === "cursor") { insertEmotionAtCursor(emo); $("#expressive").checked = true; return; }
  const cur = currentEmotion();
  const rest = cur ? textarea.value.replace(EMO_RE, "") : textarea.value;
  setText(emo && emo !== cur ? `[${emo}] ${rest}` : rest);
  if (emo && emo !== cur) $("#expressive").checked = true; // emotions work best with the "expressive" preset
  textarea.focus();
}
function insertAtCursor(snippet) {
  const el = textarea, a = el.selectionStart, b = el.selectionEnd;
  const before = el.value.slice(0, a), after = el.value.slice(b);
  const left = before && !/\s$/.test(before) ? " " : "";
  const right = after && !/^\s/.test(after) ? " " : "";
  setText(before + left + snippet + right + after);
  const pos = (before + left + snippet + right).length;
  el.focus(); el.setSelectionRange(pos, pos);
}
function emphasize() {
  const a = textarea.selectionStart, b = textarea.selectionEnd;
  if (a === b) return toast(t("ctl.emphasisHint"), true);
  const sel = textarea.value.slice(a, b);
  setText(textarea.value.slice(0, a) + `(((${sel.trim()})))` + textarea.value.slice(b));
  textarea.focus();
}
function renderExpressionBars() {
  // The chips show the real syntax (as you would type it by hand) and the meaning in small print
  const chip = (tag, gloss, props) => h("button", { class: "chip tagchip", type: "button", title: gloss, ...props },
    h("span", { class: "tg" }, tag), gloss && gloss.toLowerCase() !== tag.slice(1, -1).toLowerCase() ? h("small", {}, gloss) : null);
  $("#emoChips").replaceChildren(...EMOTIONS.map((e) => chip(`[${e}]`, t("emo." + e), { "data-emo": e, onclick: () => setEmotion(e) })));
  $("#evtChips").replaceChildren(...EVENTS.map((e) => chip(`<${e}>`, t("evt." + e), { onclick: () => insertAtCursor(`<${e}>`) })));
  $("#emphBtn").replaceChildren(h("span", { class: "tg" }, "(((…)))"), h("small", {}, t("ctl.emphasisBtn")));
  syncEmotionChips();
}
function syncEmotionChips() {
  const cur = currentEmotion();
  $$("#emoChips .chip").forEach((c) => c.classList.toggle("is-on", c.dataset.emo === cur));
}
$("#emphBtn").addEventListener("click", emphasize);

/* ----- Fine controls: speed, liveliness, pause, seed ----- */
const CTL_DEFAULT = { speed: 1, temperature: null, pause: 1, top_p: null, ref: "auto", seed: "", split: "on" };
const CTL_PRESETS = {
  natural: {},
  stable: { temperature: 0.65, top_p: 0.8 },
  lively: { temperature: 0.95, top_p: 0.92, speed: 1.05, expressive: true },
  audiobook: { speed: 0.92, pause: 1.5, temperature: 0.75 },
  fast: { speed: 1.2, pause: 0.6 },
};
state.ctl = { ...CTL_DEFAULT };
try { Object.assign(state.ctl, JSON.parse(localStorage.getItem("vc.ctl") || "{}")); } catch { /* ignore */ }

function saveCtl() { try { localStorage.setItem("vc.ctl", JSON.stringify(state.ctl)); } catch { /* ignore */ } }
function renderPresets() {
  $("#ctlPresets").replaceChildren(...Object.keys(CTL_PRESETS).map((k) =>
    h("button", { class: "chip", type: "button", onclick: () => applyPreset(k) }, t("pre." + k))));
}
function applyPreset(k) {
  const { expressive, ...vals } = CTL_PRESETS[k];
  state.ctl = { ...CTL_DEFAULT, seed: state.ctl.seed, ref: state.ctl.ref, split: state.ctl.split, ...vals };
  $("#expressive").checked = !!expressive;
  syncControlsUI(); saveCtl();
}
function syncControlsUI() {
  const c = state.ctl;
  const set = (id, val, shown, auto) => {
    const el = $("#" + id);
    el.value = val;
    el.classList.toggle("set", !auto);
    const out = $("#" + id + "Out");
    out.textContent = shown;
    out.classList.toggle("auto", auto);
  };
  set("ctlSpeed", c.speed, `${Number(c.speed).toFixed(2)}×`, Math.abs(c.speed - 1) < 0.001);
  set("ctlTemp", c.temperature ?? 0.8, c.temperature == null ? t("ctl.auto") : Number(c.temperature).toFixed(2), c.temperature == null);
  set("ctlPause", c.pause, `${Number(c.pause).toFixed(2)}×`, Math.abs(c.pause - 1) < 0.001);
  set("ctlTopP", c.top_p ?? 0.8, c.top_p == null ? t("ctl.auto") : Number(c.top_p).toFixed(2), c.top_p == null);
  $("#ctlRef").value = c.ref;
  $("#ctlSplit").value = c.split;
  $("#ctlSeed").value = c.seed;
  syncSegInfo();
}
function renderRefOptions() {
  $("#ctlRef").replaceChildren(h("option", { value: "auto" }, t("ctl.refAuto")), h("option", { value: "on" }, t("ctl.refOn")), h("option", { value: "off" }, t("ctl.refOff")));
  $("#ctlRef").value = state.ctl.ref;
  $("#ctlSplit").replaceChildren(h("option", { value: "on" }, t("ctl.splitOn")), h("option", { value: "off" }, t("ctl.splitOff")));
  $("#ctlSplit").value = state.ctl.split;
}
[["ctlSpeed", "speed"], ["ctlTemp", "temperature"], ["ctlPause", "pause"], ["ctlTopP", "top_p"]].forEach(([id, key]) =>
  $("#" + id).addEventListener("input", (e) => { state.ctl[key] = parseFloat(e.target.value); syncControlsUI(); saveCtl(); }));
$("#ctlRef").addEventListener("change", (e) => { state.ctl.ref = e.target.value; saveCtl(); });
$("#ctlSplit").addEventListener("change", (e) => { state.ctl.split = e.target.value; saveCtl(); syncSegInfo(); });
$("#ctlSeed").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10); state.ctl.seed = e.target.value; saveCtl(); });
$("#ctlDice").addEventListener("click", () => { state.ctl.seed = ""; syncControlsUI(); saveCtl(); });
$("#ctlReset").addEventListener("click", () => { state.ctl = { ...CTL_DEFAULT }; syncControlsUI(); saveCtl(); });

/** What goes to the API: only changed values, otherwise the model defaults apply. */
function controlPayload() {
  const c = state.ctl;
  const seed = c.seed === "" ? null : parseInt(c.seed, 10);
  return {
    speed: c.speed, temperature: c.temperature, top_p: c.top_p, pause_scale: c.pause,
    ref_prompt: c.ref === "auto" ? null : c.ref === "on", seed: Number.isFinite(seed) ? seed : null, split_emotions: c.split !== "off",
  };
}
/** Adopt the settings of an earlier clip (without the seed: the next take should roll anew). */
function restoreParams(p) {
  if (!p) return;
  state.ctl = { ...CTL_DEFAULT, seed: state.ctl.seed, speed: p.speed ?? 1, temperature: p.temperature ?? null, pause: p.pause_scale ?? 1,
    top_p: p.top_p ?? null, ref: p.ref_prompt == null ? "auto" : p.ref_prompt ? "on" : "off", split: p.split_emotions === false ? "off" : "on" };
  $("#expressive").checked = !!p.expressive;
  syncControlsUI(); saveCtl();
}

function renderPicker() {
  const ul = $("#picker");
  const builtin = h("li", { class: "pick" + (state.selected === null ? " is-sel" : ""), onclick: () => selectVoice(null) },
    h("i", { class: "radio" }),
    h("div", {}, h("div", { class: "pick-name" }, t("picker.builtin")), h("div", { class: "pick-meta" }, t("picker.noClone"))),
    h("span"));
  if (state.builtinList.length) {
    const sel = h("select", { class: "field", onclick: (e) => e.stopPropagation(), onchange: (e) => { state.builtin = e.target.value; selectVoice(null); } },
      h("option", { value: "" }, t("picker.auto")),
      state.builtinList.map((v) => h("option", { value: v, selected: v === state.builtin }, v)));
    builtin.querySelector("div").append(h("div", { class: "builtin-sel" }, sel));
  }
  const items = state.voices.map((v) =>
    h("li", { class: "pick" + (state.selected === v.id ? " is-sel" : ""), onclick: () => selectVoice(v.id) },
      h("i", { class: "radio" }),
      h("div", { style: "min-width:0" }, h("div", { class: "pick-name" }, v.name),
        h("div", { class: "pick-meta" }, `${v.language.toUpperCase()} · ${tn("sample", v.samples.length)} · ${v.duration.toFixed(0)} s`)),
      playBtn(`v:${v.id}`, `/api/voices/${v.id}/audio`)));
  ul.replaceChildren(builtin, ...items);
  syncPlayers();
}
function selectVoice(id) {
  state.selected = id;
  const v = state.voices.find((x) => x.id === id);
  if (v) setGenLang(v.language);
  renderPicker();
  if (state.view === "voices") $$("#voiceGrid .tile").forEach((el) => el.classList.toggle("is-cur", el.dataset.id === id));
}

function renderRecent() {
  const ul = $("#recent");
  const items = state.history.slice(0, 5);
  ul.replaceChildren(...items.map((it) => h("li", {}, playBtn(`c:${it.id}`, it.url),
    h("div", { style: "min-width:0" }, h("div", { class: "t" }, it.text), h("div", { class: "m" }, `${voiceLabel(it.voice)} · ${it.duration.toFixed(1)} s`)))));
  if (!items.length) ul.append(h("li", { class: "empty" }, t("recent.none")));
  syncPlayers();
}

let resultWS = null;
const resultMetaText = (it) => t("result.meta", { voice: voiceLabel(it.voice), d: it.duration.toFixed(1), t: it.took.toFixed(1) }) + (it.segments > 1 ? " · " + t("result.segments", { n: it.segments }) : "") + (it.seed != null ? " · " + t("result.seed", { s: it.seed }) : "");
async function generate() {
  const text = textarea.value.trim();
  if (!text) { toast(t("gen.emptyText"), true); gsap.fromTo(textarea, { x: -6 }, { x: 0, duration: 0.5, ease: "elastic.out(1,.3)", clearProps: "all" }); return; }
  if (lastEngineState !== "ready") return toast(t("gen.loading"), true);
  const btn = $("#genBtn");
  btn.disabled = true; btn.classList.add("busy");
  const t0 = performance.now();
  genTimer = setInterval(() => setActivity(t("st.generatingN", { s: ((performance.now() - t0) / 1000).toFixed(0) }), true), 250);
  setActivity(t("st.generating"), true);
  try {
    const item = await api("/api/generate", json("POST", {
      text, voice_id: state.selected, builtin: state.selected ? null : state.builtin || null,
      language: state.genLang, expressive: $("#expressive").checked, ...controlPayload(),
    }));
    state.history.unshift(item);
    state.lastItem = item;
    showResult(item);
    renderRecent();
    refreshSystem();
  } catch (e) {
    toast(e.message, true);
  } finally {
    clearInterval(genTimer); genTimer = null;
    btn.disabled = false; btn.classList.remove("busy");
    setActivity(t("st.ready"));
  }
}

function showResult(item) {
  const box = $("#result");
  const first = box.hidden;
  box.hidden = false;
  stopPlayer();
  resultWS?.destroy();
  resultWS = WaveSurfer.create({ container: "#resultWave", height: 88, waveColor: "#5c5a54", progressColor: "#ff5a2c", cursorColor: "#ece9e1", barWidth: 3, barGap: 2, barRadius: 2, normalize: true, url: item.url });
  resultWS.on("ready", () => resultWS.play());
  resultWS.on("play", () => ($("#resultPlay").textContent = t("result.pause")));
  resultWS.on("pause", () => ($("#resultPlay").textContent = t("result.play")));
  $("#resultPlay").textContent = t("result.play");
  $("#resultMeta").textContent = resultMetaText(item);
  $("#resultLock").textContent = t("ctl.lock");
  const dl = $("#resultDl");
  dl.href = item.url; dl.download = `voiceclone-${item.id}.wav`;
  $("#resultFav").textContent = item.fav ? t("result.faved") : t("result.fav");
  const wv = $("#resultWave");
  wv.classList.remove("wave-reveal"); void wv.offsetWidth; wv.classList.add("wave-reveal");
  if (first) rise([box], 0);
}
$("#resultPlay").addEventListener("click", () => resultWS?.playPause());
$("#resultLock").addEventListener("click", () => {
  const it = state.lastItem;
  if (!it || it.seed == null) return;
  state.ctl.seed = String(it.seed);
  syncControlsUI(); saveCtl();
  $(".adv").open = true;
  toast(t("ctl.locked", { s: it.seed }));
});
$("#resultFav").addEventListener("click", async () => {
  const it = state.lastItem;
  if (!it) return;
  try {
    await api(`/api/history/${it.id}`, json("PATCH", { fav: !it.fav }));
    it.fav = !it.fav;
    $("#resultFav").textContent = it.fav ? t("result.faved") : t("result.fav");
  } catch (e) { toast(e.message, true); }
});

/* =====================================================================
   Recording
   ===================================================================== */
const tabInk = $("#view-capture .tab-ink");
function moveTabInk() {
  const tab = $("#view-capture .tab.is-on");
  tabInk.style.width = `${tab.offsetWidth}px`;
  tabInk.style.transform = `translateX(${tab.offsetLeft - 3}px)`;
}
$$("#view-capture .tab").forEach((tab) => tab.addEventListener("click", () => {
  if (rec.active) return;
  $$("#view-capture .tab").forEach((x) => x.classList.toggle("is-on", x === tab));
  moveTabInk();
  for (const p of ["rec", "file"]) {
    const el = $(`#pane-${p}`);
    if (p === tab.dataset.tab) { if (el.hidden) { el.hidden = false; rise([el], 0); } } else el.hidden = true;
  }
}));

function renderPromptChips() {
  const en = LANG === "en";
  $("#promptChips").replaceChildren(...state.prompts[state.promptLang].map((p, i) =>
    h("button", { class: "chip" + (i === state.promptIdx ? " is-on" : ""), onclick: () => { if (!rec.active) { state.promptIdx = i; renderPromptChips(); renderPrompter(); } } },
      `${en ? p.title_en : p.title} · ${en ? p.tone_en : p.tone}`)));
}
/** Words; Chinese has no spaces, so it is split into sections at punctuation instead. */
function promptTokens(text) {
  if (state.promptLang === "zh") return text.match(/[^，。！？、；：]+[，。！？、；：”]*/g) || [text];
  return text.split(/\s+/);
}
function renderPrompter() {
  const p = state.prompts[state.promptLang][state.promptIdx];
  const box = $("#prompter");
  if (!p) return box.replaceChildren();
  box.dir = RTL_LANGS.includes(state.promptLang) ? "rtl" : "ltr";
  box.replaceChildren(...promptTokens(p.text).map((w) => h("span", { class: "w" }, w + (state.promptLang === "zh" ? "" : " "))));
  rise([box], 0);
}
$("#promptLang").addEventListener("change", (e) => {
  if (rec.active) { e.target.value = state.promptLang; return; }
  state.promptLang = e.target.value; state.promptIdx = 0; renderPromptChips(); renderPrompter(); $("#saveLang").value = state.promptLang;
});

let prompterTimer = null;
function startPrompter() {
  const words = $$("#prompter .w");
  let i = 0;
  const step = () => {
    words.forEach((w, j) => { w.classList.toggle("done", j < i); w.classList.toggle("cur", j === i); });
    if (++i > words.length) return stopPrompter();
    const cur = words[i - 1];
    const ms = state.promptLang === "zh" ? Math.max(500, cur.textContent.length * 230) : 400;
    prompterTimer = setTimeout(step, ms);
  };
  step();
}
function stopPrompter() { clearTimeout(prompterTimer); $$("#prompter .w").forEach((w) => w.classList.remove("done", "cur")); }

const rec = { active: false, recorder: null, stream: null, chunks: [], ctx: null, analyser: null, raf: 0, t0: 0, levels: [] };
const meter = $("#meter"), mctx = meter.getContext("2d");
function drawMeter(idle = false) {
  const W = meter.width, H = meter.height, n = 90, gap = 3, bw = (W - gap * (n - 1)) / n;
  mctx.clearRect(0, 0, W, H);
  for (let i = 0; i < n; i++) {
    const v = idle ? 0.04 : rec.levels[rec.levels.length - n + i] || 0.02;
    const bh = Math.max(3, v * H);
    mctx.fillStyle = idle ? "#2a2a27" : i > n - 4 ? "#ff5a2c" : "#6c6a63";
    mctx.beginPath(); mctx.roundRect(i * (bw + gap), (H - bh) / 2, bw, bh, 1.5); mctx.fill();
  }
}
drawMeter(true);
function loop() {
  const buf = new Float32Array(rec.analyser.fftSize);
  rec.analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const x of buf) sum += x * x;
  rec.levels.push(Math.min(1, Math.pow(Math.sqrt(sum / buf.length) * 6, 0.7)));
  if (rec.levels.length > 400) rec.levels.splice(0, 200);
  drawMeter();
  $("#timer").textContent = fmtTime((performance.now() - rec.t0) / 1000);
  rec.raf = requestAnimationFrame(loop);
}
async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) return toast(t("cap.micUnsupported"), true);
  try {
    rec.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch { return toast(t("cap.micDenied"), true); }
  discardPending();
  rec.ctx = new AudioContext();
  rec.analyser = rec.ctx.createAnalyser();
  rec.analyser.fftSize = 1024;
  rec.ctx.createMediaStreamSource(rec.stream).connect(rec.analyser);
  rec.chunks = []; rec.levels = [];
  rec.recorder = new MediaRecorder(rec.stream);
  rec.recorder.ondataavailable = (e) => e.data.size && rec.chunks.push(e.data);
  rec.recorder.onstop = onRecorded;
  rec.recorder.start();
  rec.active = true; rec.t0 = performance.now();
  $("#recBtn").classList.add("is-rec");
  $("#recHint").textContent = t("cap.hintRec");
  setActivity(t("cap.recording"), true);
  startPrompter(); loop();
}
function stopRecording() {
  rec.active = false;
  cancelAnimationFrame(rec.raf);
  rec.recorder.stop();
  rec.stream.getTracks().forEach((tr) => tr.stop());
  rec.ctx.close();
  stopPrompter();
  $("#recBtn").classList.remove("is-rec");
  $("#recHint").textContent = t("cap.hint");
  setActivity(t("st.ready"));
  drawMeter(true);
}
$("#recBtn").addEventListener("click", () => (rec.active ? stopRecording() : startRecording()));

async function blobToWav24k(blob) {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * 24000), 24000);
  const s = off.createBufferSource();
  s.buffer = decoded; s.connect(off.destination); s.start();
  const out = (await off.startRendering()).getChannelData(0);
  const dv = new DataView(new ArrayBuffer(44 + out.length * 2));
  const w = (o, str) => [...str].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); dv.setUint32(4, 36 + out.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 24000, true); dv.setUint32(28, 48000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  w(36, "data"); dv.setUint32(40, out.length * 2, true);
  for (let i = 0; i < out.length; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, out[i])) * 0x7fff, true);
  return new Blob([dv], { type: "audio/wav" });
}
async function onRecorded() {
  try { showReview(await blobToWav24k(new Blob(rec.chunks, { type: rec.recorder.mimeType })), ""); }
  catch { toast(t("cap.recFailed"), true); }
}

const drop = $("#drop"), fileInput = $("#fileInput");
fileInput.addEventListener("change", () => fileInput.files[0] && takeFile(fileInput.files[0]));
["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
drop.addEventListener("drop", (e) => e.dataTransfer.files[0] && takeFile(e.dataTransfer.files[0]));
function takeFile(file) { discardPending(); showReview(file, file.name.replace(/\.[^.]+$/, "")); fileInput.value = ""; }

/* ----- Preview / save ----- */
let reviewWS = null;
function showReview(blob, name) {
  state.pending = { blob };
  $("#voiceName").value = name;
  $("#saveLang").value = state.promptLang;
  $("#report").hidden = true;
  $("#reviewEmpty").hidden = true;
  const box = $("#review");
  box.hidden = false;
  rise([box], 0);
  reviewWS?.destroy();
  reviewWS = WaveSurfer.create({ container: "#reviewWave", height: 72, waveColor: "#5c5a54", progressColor: "#ff5a2c", cursorColor: "#ece9e1", barWidth: 3, barGap: 2, barRadius: 2, normalize: true });
  reviewWS.loadBlob(blob).catch(() => {});
  reviewWS.on("finish", () => ($("#reviewPlay").textContent = t("cap.listen")));
  $("#reviewPlay").textContent = t("cap.listen");
  syncSaveTarget();
}
function discardPending() {
  state.pending = null;
  reviewWS?.destroy(); reviewWS = null;
  $("#review").hidden = true;
  $("#reviewEmpty").hidden = false;
}
$("#reviewPlay").addEventListener("click", () => {
  if (!reviewWS) return;
  reviewWS.playPause();
  $("#reviewPlay").textContent = reviewWS.isPlaying() ? t("result.pause") : t("cap.listen");
});
$("#discard").addEventListener("click", discardPending);

function syncSaveTarget() {
  const sel = $("#saveTarget");
  const keep = state.captureTarget;
  sel.replaceChildren(h("option", { value: "" }, t("cap.newVoice")),
    ...state.voices.map((v) => h("option", { value: v.id, selected: v.id === keep }, t("cap.addTo", { n: v.name }))));
  if (!state.voices.some((v) => v.id === keep)) state.captureTarget = "";
  sel.value = state.captureTarget;
  const adding = !!state.captureTarget;
  $("#nameLbl").textContent = adding ? t("cap.nameSample") : t("cap.nameVoice");
  $("#voiceName").placeholder = adding ? t("cap.phSample") : t("cap.phVoice");
  $("#langRow").hidden = adding;
  $("#saveVoice").textContent = adding ? t("cap.saveAdd") : t("cap.saveNew");
}
$("#saveTarget").addEventListener("change", (e) => { state.captureTarget = e.target.value; syncSaveTarget(); });

$("#saveVoice").addEventListener("click", async () => {
  if (!state.pending) return;
  const adding = state.captureTarget;
  const existing = adding && state.voices.find((v) => v.id === adding);
  let name = $("#voiceName").value.trim();
  if (!name && !adding) return toast(t("cap.needName"), true);
  if (!name) name = `Sample ${(existing?.samples.length || 0) + 1}`;
  const fd = new FormData();
  fd.append("file", state.pending.blob, "ref");
  let url = "/api/voices";
  if (adding) { fd.append("label", name); url = `/api/voices/${adding}/samples`; }
  else { fd.append("name", name); fd.append("language", $("#saveLang").value); }
  const btn = $("#saveVoice");
  btn.disabled = true;
  try {
    const { voice, analysis } = await api(url, { method: "POST", body: fd });
    showReport(analysis);
    await loadVoices();
    toast(adding ? t("cap.sampleAdded", { n: voice.name }) : t("cap.saved", { n: voice.name }), false, { label: t("cap.useInStudio"), fn: () => { selectVoice(voice.id); location.hash = "studio"; } });
  } catch (e) { toast(e.message, true); } finally { btn.disabled = false; }
});

function showReport(a, animate = true) {
  state.lastReport = a;
  const colors = { good: "var(--ok)", ok: "var(--warn)", poor: "var(--bad)" };
  const box = $("#report");
  box.replaceChildren(
    h("h3", {}, h("span", { class: "vd", style: `background:${colors[a.verdict]}` }), t("report." + a.verdict)),
    h("div", { class: "nums" }, t("report.nums", { d: a.duration.toFixed(1), snr: a.snr_db, lvl: a.level_db })),
    a.issues.length ? h("ul", {}, a.issues.map((i) => h("li", { class: i.level }, t("issue." + i.code, { d: a.duration.toFixed(1) })))) : h("p", { class: "hint", style: "margin:0" }, t("report.none")));
  box.hidden = false;
  if (animate) rise([box], 0);
}

/* =====================================================================
   Selection mode (voices & gallery)
   ===================================================================== */
function enterSelect() { state.selecting = true; state.sel.clear(); document.body.classList.add("selecting"); updateSelBar(); }
function exitSelect() {
  state.selecting = false; state.sel.clear(); document.body.classList.remove("selecting");
  $$(".tile.is-sel").forEach((el) => el.classList.remove("is-sel"));
  updateSelBar();
}
function updateSelBar() {
  const bar = $("#selbar");
  const was = bar.hidden;
  bar.hidden = !state.selecting;
  if (was && state.selecting) rise([bar], 0);
  $("#selCount").textContent = t("sel.count", { n: state.sel.size });
  $("#selDelete").disabled = !state.sel.size;
  $("#voiceSelectBtn").textContent = state.selecting && state.view === "voices" ? t("common.done") : t("common.select");
  $("#galSelectBtn").textContent = state.selecting && state.view === "gallery" ? t("common.done") : t("common.select");
}
function toggleSel(id, tile) {
  state.sel.has(id) ? state.sel.delete(id) : state.sel.add(id);
  tile.classList.toggle("is-sel", state.sel.has(id));
  updateSelBar();
}
$("#voiceSelectBtn").addEventListener("click", () => (state.selecting ? exitSelect() : enterSelect()));
$("#galSelectBtn").addEventListener("click", () => (state.selecting ? exitSelect() : enterSelect()));
$("#selCancel").addEventListener("click", exitSelect);
$("#selAll").addEventListener("click", () => {
  const tiles = $$(`#view-${state.view} .tile`);
  const all = tiles.every((el) => state.sel.has(el.dataset.id));
  tiles.forEach((el) => { all ? state.sel.delete(el.dataset.id) : state.sel.add(el.dataset.id); el.classList.toggle("is-sel", !all); });
  updateSelBar();
});
$("#selDelete").addEventListener("click", async () => {
  const ids = [...state.sel];
  if (!ids.length) return;
  const voices = state.view === "voices";
  const ok = await ask({ title: tn(voices ? "sel.voices" : "sel.clips", ids.length), text: t("sel.undone"), ok: t("common.delete"), danger: true });
  if (!ok) return;
  try {
    await api(voices ? "/api/voices/delete" : "/api/history/delete", json("POST", { ids }));
    exitSelect();
    voices ? await loadVoices() : await loadHistory();
    toast(t("sel.deleted", { n: ids.length }));
  } catch (e) { toast(e.message, true); }
});

/* =====================================================================
   Voices
   ===================================================================== */
async function loadVoices() {
  state.voices = await api("/api/voices");
  if (state.selected && !state.voices.some((v) => v.id === state.selected)) state.selected = null;
  renderPicker();
  if (state.view === "voices") renderVoices();
  if (state.view === "capture") syncSaveTarget();
  refreshSystem();
}

$("#voiceSearch").addEventListener("input", (e) => { state.vq = e.target.value.toLowerCase(); renderVoices(false); });

function renderVoices(animate = true) {
  const grid = $("#voiceGrid");
  const list = state.voices.filter((v) => v.name.toLowerCase().includes(state.vq));
  $("#voicesSub").textContent = state.voices.length ? tn("voices.sub", state.voices.length) : t("voices.sub0");
  grid.replaceChildren(...list.map((v) => {
    const inRef = v.samples.filter((s) => s.used).length;
    const tile = h("div", { class: "tile" + (state.selected === v.id ? " is-cur" : "") + (state.sel.has(v.id) ? " is-sel" : ""), "data-id": v.id,
      onclick: () => { if (state.selecting) toggleSel(v.id, tile); } },
      h("div", { class: "chk" }, "✓"),
      h("div", { class: "tile-top" }, playBtn(`v:${v.id}`, `/api/voices/${v.id}/audio`, true),
        h("div", { style: "min-width:0;flex:1" },
          h("div", { class: "tile-title" }, h("i", { class: "vd " + v.verdict }), v.name),
          h("div", { class: "tile-meta" }, t("voices.meta", { s: tn("sample", v.samples.length), r: inRef, d: v.duration.toFixed(0) })))),
      h("div", { class: "prog", "data-prog": `v:${v.id}` }, h("i")),
      h("div", { class: "tile-foot" },
        h("span", { class: "tag" }, v.language.toUpperCase()),
        h("span", { class: "tag" }, vlabel(v.verdict)),
        h("span", { class: "sp" }),
        h("button", { class: "ibtn", onclick: (e) => { e.stopPropagation(); openManage(v.id); } }, t("voices.samples")),
        h("button", { class: "ibtn", onclick: (e) => { e.stopPropagation(); selectVoice(v.id); location.hash = "studio"; } }, t("voices.use")),
        h("button", { class: "ibtn del", onclick: (e) => { e.stopPropagation(); deleteVoice(v, tile); } }, t("common.delete"))));
    return tile;
  }));
  if (!list.length) {
    grid.append(h("div", { class: "big-empty" },
      h("strong", {}, state.voices.length ? t("voices.noHits") : t("voices.emptyTitle")),
      h("span", {}, state.voices.length ? t("voices.otherSearch") : t("voices.emptyText")),
      !state.voices.length && h("a", { class: "btn", href: "#capture" }, t("voices.emptyBtn"))));
  }
  syncPlayers();
  if (animate) rise(grid.children);
}

async function deleteVoice(v, tile) {
  const ok = await ask({ title: t("voices.deleteTitle", { n: v.name }), text: t("voices.deleteText", { c: v.samples.length }), ok: t("common.delete"), danger: true });
  if (!ok) return;
  tile.classList.add("leaving");
  try { await api(`/api/voices/${v.id}`, { method: "DELETE" }); toast(t("voices.deleted", { n: v.name })); } catch (e) { toast(e.message, true); }
  loadVoices();
}

/* ----- Manage samples ----- */
function openManage(id) {
  state.manage = id;
  renderManage();
  const dlg = $("#vdlg");
  if (dlg.hidden) Modal.open(dlg);
}
function renderManage() {
  const v = state.voices.find((x) => x.id === state.manage);
  if (!v) return Modal.close($("#vdlg"));
  $("#vdName").textContent = v.name;
  $("#vdSub").textContent = t("manage.sub", { l: v.language.toUpperCase(), s: tn("sample", v.samples.length), d: v.duration.toFixed(1) });
  $("#vdInfo").textContent = t("manage.info");
  $("#vdList").replaceChildren(...v.samples.map((s) => {
    const tag = !s.enabled ? h("span", { class: "tag" }, t("manage.off")) : s.used ? h("span", { class: "tag in" }, t("manage.in")) : h("span", { class: "tag" }, t("manage.over"));
    return h("li", { class: "sample" + (s.enabled ? "" : " off") },
      playBtn(`s:${v.id}:${s.id}`, `/api/voices/${v.id}/samples/${s.id}/audio`),
      h("div", { style: "min-width:0" }, h("div", { class: "t" }, sampleLabel(s), tag),
        h("div", { class: "m" }, `${s.duration.toFixed(1)} s · ${vlabel(s.verdict)} · ${s.snr_db} dB · ${fmtDate(s.created)}`)),
      h("div", { class: "acts" },
        h("button", { class: "ibtn", onclick: () => patchSample(v.id, s.id, { enabled: !s.enabled }) }, s.enabled ? t("manage.turnOff") : t("manage.on")),
        h("button", { class: "ibtn", onclick: async () => { const n = await ask({ title: t("manage.renameSample"), input: true, value: sampleLabel(s), ok: t("common.save") }); if (n) patchSample(v.id, s.id, { label: n }); } }, t("manage.name")),
        h("button", { class: "ibtn del", onclick: () => deleteSample(v, s) }, t("common.delete"))));
  }));
  syncPlayers();
}
async function patchSample(vid, sid, body) {
  try { await api(`/api/voices/${vid}/samples/${sid}`, json("PATCH", body)); await loadVoices(); renderManage(); }
  catch (e) { toast(e.message, true); }
}
async function deleteSample(v, s) {
  const ok = await ask({ title: t("manage.deleteSample"), text: t("manage.deleteSampleText", { n: sampleLabel(s) }), ok: t("common.delete"), danger: true });
  if (!ok) return;
  try { await api(`/api/voices/${v.id}/samples/${s.id}`, { method: "DELETE" }); await loadVoices(); renderManage(); }
  catch (e) { toast(e.message, true); }
}
$("#vdClose").addEventListener("click", () => Modal.close($("#vdlg")));
$("#vdRename").addEventListener("click", async () => {
  const v = state.voices.find((x) => x.id === state.manage);
  const n = await ask({ title: t("manage.renameVoice"), input: true, value: v.name, ok: t("common.save") });
  if (!n) return;
  try { await api(`/api/voices/${v.id}`, json("PATCH", { name: n })); await loadVoices(); renderManage(); } catch (e) { toast(e.message, true); }
});
$("#vdAdd").addEventListener("click", () => { state.captureTarget = state.manage; Modal.close($("#vdlg")); location.hash = "capture"; discardPending(); syncSaveTarget(); });
$("#vdlg").addEventListener("modalclose", stopPlayer);

/* =====================================================================
   Gallery
   ===================================================================== */
async function loadHistory() {
  state.history = await api("/api/history");
  if (state.view === "gallery") renderGallery(false);
  if (state.view === "studio") renderRecent();
  refreshSystem();
}

$("#galSearch").addEventListener("input", (e) => { state.gal.q = e.target.value.toLowerCase(); renderGallery(false); });
$("#galSort").addEventListener("change", (e) => { state.gal.sort = e.target.value; renderGallery(); });
$("#galVoice").addEventListener("change", (e) => { state.gal.voice = e.target.value; renderGallery(); });
$("#galLang").addEventListener("change", (e) => { state.gal.lang = e.target.value; renderGallery(); });
$("#galFilters").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  state.gal.f = b.dataset.f;
  $$("#galFilters .chip").forEach((c) => c.classList.toggle("is-on", c === b));
  renderGallery();
});

function filteredClips() {
  const g = state.gal;
  const list = state.history.filter((it) =>
    (g.f === "all" || (g.f === "fav" && it.fav)) && (!g.lang || it.language === g.lang) &&
    (!g.voice || it.voice === g.voice) && (!g.q || it.text.toLowerCase().includes(g.q)));
  return [...list].sort((a, b) => (g.sort === "old" ? a.created - b.created : g.sort === "long" ? b.duration - a.duration : b.created - a.created));
}

function renderGallery(animate = true) {
  const sel = $("#galVoice");
  const inUse = [...new Set(state.history.map((i) => i.voice))].sort();
  sel.replaceChildren(h("option", { value: "" }, t("gal.allVoices")), ...inUse.map((v) => h("option", { value: v, selected: v === state.gal.voice }, voiceLabel(v))));
  const langs = [...new Set(state.history.map((i) => i.language))];
  $("#galLang").replaceChildren(h("option", { value: "" }, t("gal.allLangs")), ...langs.map((c) => h("option", { value: c }, langName(c))));
  $("#galLang").value = state.gal.lang;
  if (state.gal.lang && !langs.includes(state.gal.lang)) state.gal.lang = "";
  const list = filteredClips();
  $("#gallerySub").textContent = state.history.length ? t("gal.sub", { a: list.length, b: state.history.length }) : t("gal.sub0");
  const grid = $("#galGrid");
  grid.replaceChildren(...list.map(clipTile));
  if (!list.length) {
    grid.append(h("div", { class: "big-empty" },
      h("strong", {}, state.history.length ? t("gal.noHits") : t("gal.emptyTitle")),
      h("span", {}, state.history.length ? t("gal.adjust") : t("gal.emptyText")),
      !state.history.length && h("a", { class: "btn", href: "#studio" }, t("gal.toStudio"))));
  }
  syncPlayers();
  if (animate) rise(grid.children);
}

function clipTile(it) {
  const tile = h("div", { class: "tile" + (state.sel.has(it.id) ? " is-sel" : ""), "data-id": it.id, onclick: () => { if (state.selecting) toggleSel(it.id, tile); } },
    h("div", { class: "chk" }, "✓"),
    h("div", { class: "tile-top" }, playBtn(`c:${it.id}`, it.url, true),
      h("div", { style: "min-width:0;flex:1" }, h("div", { class: "tile-text" }, it.text),
        h("div", { class: "tile-meta" }, `${voiceLabel(it.voice)} · ${it.duration.toFixed(1)} s · ${fmtDate(it.created)}`))),
    h("div", { class: "prog", "data-prog": `c:${it.id}` }, h("i")),
    h("div", { class: "tile-foot" },
      h("span", { class: "tag" }, it.language.toUpperCase()),
      it.cloned && h("span", { class: "tag in" }, t("gal.clone")),
      h("span", { class: "sp" }),
      h("button", { class: "ibtn fav" + (it.fav ? " on" : ""), "aria-label": t("gal.favAria"), onclick: async (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        try { await api(`/api/history/${it.id}`, json("PATCH", { fav: !it.fav })); it.fav = !it.fav; btn.classList.toggle("on", it.fav); btn.textContent = it.fav ? "★" : "☆"; if (state.gal.f === "fav") renderGallery(false); }
        catch (err) { toast(err.message, true); }
      } }, it.fav ? "★" : "☆"),
      h("a", { class: "ibtn", href: it.url, download: `voiceclone-${it.id}.wav`, onclick: (e) => e.stopPropagation() }, "WAV"),
      h("button", { class: "ibtn", title: t("gal.againTitle"), onclick: (e) => { e.stopPropagation(); textarea.value = it.text; $("#chars").textContent = `${it.text.length} / 2000`; setGenLang(it.language); restoreParams(it.params); location.hash = "studio"; } }, t("gal.again")),
      h("button", { class: "ibtn del", onclick: async (e) => {
        e.stopPropagation();
        const ok = await ask({ title: t("gal.deleteTitle"), text: it.text.length > 90 ? it.text.slice(0, 90) + " …" : it.text, ok: t("common.delete"), danger: true });
        if (!ok) return;
        tile.classList.add("leaving");
        try { await api(`/api/history/${it.id}`, { method: "DELETE" }); } catch (err) { toast(err.message, true); }
        loadHistory();
      } }, t("common.delete"))));
  return tile;
}

/* =====================================================================
   Startup
   ===================================================================== */
(async function init() {
  await loadSettings();
  [["genLang", state.genLang], ["promptLang", "en"], ["saveLang", "en"], ["defGenLang", state.genLang]].forEach(([id, v]) => fillLangSelect($("#" + id), v));
  applyAll();
  rise([$(".side"), $(".status")], 0);
  pollSystem();
  route();
  if (!state.settings.disclaimer || state.settings.disclaimer.version < state.settings.disclaimer_version) showDisclaimer(false);
  try {
    state.prompts = await api("/api/prompts");
    renderPromptChips();
    renderPrompter();
    await Promise.all([loadVoices(), loadHistory()]);
    renderPicker(); renderRecent();
  } catch (e) {
    toast(t("err.server", { m: e.message }), true);
  }
})();
