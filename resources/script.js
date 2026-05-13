/* ── CONFIG ────────────────────────────────────────────────────────────────── */
const VOCAB_FILE = "./resources/vocab.json";
const LS_KEY = "lexicon_progress_v2"; // word-keyed; v2 incompatible with v1

/* ── PROGRESS (word-keyed) ──────────────────────────────────────────────────
   Shape: { "ephemeral": "done", "sycophant": "forgot" }
   "none" is NEVER written — absence === none.
   Resetting a word removes its key entirely.
──────────────────────────────────────────────────────────────────────────── */
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
}
function saveProgress(p) {
  localStorage.setItem(LS_KEY, JSON.stringify(p));
}

let progress = loadProgress();

function getStatus(word) {
  return progress[word] || "none";
}
function setWordStatus(word, status) {
  if (!status || status === "none") {
    delete progress[word];
  } else {
    progress[word] = status;
  }
  saveProgress(progress);
}
function clearDayProgress(words) {
  words.forEach((w) => delete progress[w.word]);
  saveProgress(progress);
}

/* ── STATE ──────────────────────────────────────────────────────────────────── */
let VOCAB_DATA = [];
let dayIndex = 0; // index into VOCAB_DATA array
let wordIndex = 0;
let sidebarOpen = false;

/* ── DOM REFS ───────────────────────────────────────────────────────────────── */
const daySelect = document.getElementById("day-select");
const wordListPanel = document.getElementById("word-list-panel");
const panelToggle = document.getElementById("panel-toggle");
const panelLabel = document.getElementById("panel-toggle-label");
const wordList = document.getElementById("word-list");
const wordDisplay = document.getElementById("word-display");
const loadingMsg = document.getElementById("loading-msg");
const emptyState = document.getElementById("empty-state");
const wordNumber = document.getElementById("word-number");
const bigWord = document.getElementById("big-word");
const phonetic = document.getElementById("phonetic");
const formsStrip = document.getElementById("forms-strip");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const sbWord = document.getElementById("sb-word");
const sbMeanings = document.getElementById("sb-meanings");
const sbForms = document.getElementById("sb-forms");
const sbStatus = document.getElementById("sb-status");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const progressText = document.getElementById("progress-text");
const toast = document.getElementById("toast");

// Mobile action buttons
const mobMeaning = document.getElementById("mob-meaning");
const mobDone = document.getElementById("mob-done");
const mobForgot = document.getElementById("mob-forgot");
const mobResetWord = document.getElementById("mob-reset-word");

/* ── FETCH VOCAB ─────────────────────────────────────────────────────────────── */
async function loadVocab() {
  try {
    const res = await fetch(VOCAB_FILE);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    VOCAB_DATA = await res.json();
    initDaySelect();
    render();
  } catch (err) {
    loadingMsg.textContent = `Could not load vocab.json — ${err.message}`;
  }
}

function initDaySelect() {
  daySelect.innerHTML = "";
  VOCAB_DATA.forEach((d, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Day ${d.day}`;
    daySelect.appendChild(opt);
  });
  daySelect.value = dayIndex;
  daySelect.disabled = false;

  daySelect.addEventListener("change", () => {
    dayIndex = parseInt(daySelect.value);
    wordIndex = 0;
    closeSidebar();
    render();
  });
}

/* ── HELPERS ─────────────────────────────────────────────────────────────────── */
function getDayEntry() {
  return VOCAB_DATA[dayIndex] ?? { day: "?", words: [] };
}
function getDayWords() {
  return getDayEntry().words ?? [];
}

function isMobile() {
  return window.innerWidth <= 640;
}

/* ── SIDEBAR ─────────────────────────────────────────────────────────────────── */
function openSidebar() {
  sidebarOpen = true;
  sidebar.classList.add("open");
  if (isMobile()) sidebarOverlay.classList.add("visible");
  renderSidebar(getDayWords()[wordIndex]);
}
function closeSidebar() {
  sidebarOpen = false;
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("visible");
}
function toggleSidebar() {
  sidebarOpen ? closeSidebar() : openSidebar();
}

/* ── WORD LIST PANEL COLLAPSE (mobile) ──────────────────────────────────────── */
let panelCollapsed = false;

function togglePanel() {
  panelCollapsed = !panelCollapsed;
  wordListPanel.classList.toggle("collapsed", panelCollapsed);
  panelLabel.textContent = panelCollapsed ? "words ▸" : "words";
}

/* ── RENDER ──────────────────────────────────────────────────────────────────── */
function render() {
  const words = getDayWords();
  loadingMsg.style.display = "none";

  if (!words.length) {
    wordDisplay.style.display = "none";
    emptyState.style.display = "block";
    wordList.innerHTML = "";
    progressText.innerHTML = "<b>0</b> / 0 done";
    return;
  }

  emptyState.style.display = "none";
  wordDisplay.style.display = "flex";

  renderWordList(words);
  renderStage(words);
  renderProgress(words);
  if (sidebarOpen) renderSidebar(words[wordIndex]);

  // Scroll active word into view in sidebar list
  wordList
    .querySelectorAll(".word-item")
    [wordIndex]?.scrollIntoView({ block: "nearest" });
}

function renderWordList(words) {
  wordList.innerHTML = "";
  words.forEach((w, i) => {
    const st = getStatus(w.word);
    const div = document.createElement("div");
    div.className = [
      "word-item",
      st !== "none" ? st : "",
      i === wordIndex ? "active" : "",
    ]
      .filter(Boolean)
      .join(" ");
    div.innerHTML = `<span class="status-dot"></span>${w.word}`;
    div.addEventListener("click", () => {
      wordIndex = i;
      // On mobile, collapse the panel after picking a word
      if (isMobile() && !panelCollapsed) togglePanel();
      render();
    });
    wordList.appendChild(div);
  });
}

function renderStage(words) {
  const w = words[wordIndex];
  const st = getStatus(w.word);

  wordNumber.textContent = `${wordIndex + 1} of ${words.length}`;
  bigWord.textContent = w.word;
  bigWord.className =
    "big-word" +
    (st === "done" ? " status-done" : st === "forgot" ? " status-forgot" : "");
  phonetic.textContent = w.phonetic ?? "";

  formsStrip.innerHTML = "";
  (w.forms ?? []).forEach((f) => {
    const tag = document.createElement("span");
    tag.className = "form-tag";
    tag.innerHTML = `<b>${f.type}</b>${f.word}`;
    formsStrip.appendChild(tag);
  });

  btnPrev.disabled = wordIndex === 0;
  btnNext.disabled = wordIndex === words.length - 1;
}

function renderSidebar(w) {
  if (!w) return;
  sbWord.textContent = w.word;

  sbMeanings.innerHTML = "";
  (w.definition ?? []).forEach((m, i) => {
    sbMeanings.innerHTML += `
      <div class="meaning-block">
        <div class="meaning-index">${i + 1}.</div>
        <div class="meaning-text">${m}</div>
      </div>`;
  });

  sbForms.innerHTML = "";
  (w.forms ?? []).forEach((f) => {
    sbForms.innerHTML += `
      <div class="form-row">
        <span class="form-type">${f.type}</span>
        <span class="form-word">${f.word}</span>
      </div>`;
  });

  const st = getStatus(w.word);
  sbStatus.className = "status-banner";
  if (st === "done") {
    sbStatus.classList.add("done");
    sbStatus.textContent = "✓ Marked as done";
  }
  if (st === "forgot") {
    sbStatus.classList.add("forgot");
    sbStatus.textContent = "✗ Marked as forgot";
  }
}

function renderProgress(words) {
  const done = words.filter((w) => getStatus(w.word) === "done").length;
  progressText.innerHTML = `<b>${done}</b> / ${words.length} done`;
}

/* ── TOAST ───────────────────────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg, type = "") {
  toast.textContent = msg;
  toast.className = "show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = "";
  }, 1800);
}

/* ── ACTIONS ─────────────────────────────────────────────────────────────────── */
function markDone() {
  const w = getDayWords()[wordIndex];
  if (!w) return;
  setWordStatus(w.word, "done");
  showToast("Marked as done ✓", "green");
  render();
}
function markForgot() {
  const w = getDayWords()[wordIndex];
  if (!w) return;
  setWordStatus(w.word, "forgot");
  showToast("Marked as forgot ✗", "red");
  render();
}
function resetCurrentWord() {
  const w = getDayWords()[wordIndex];
  if (!w) return;
  setWordStatus(w.word, "none");
  showToast("Word reset", "amber");
  render();
}
function resetCurrentDay() {
  const words = getDayWords();
  if (!words.length) return;
  clearDayProgress(words);
  showToast(`Day ${getDayEntry().day} reset`, "amber");
  render();
}

/* ── NAVIGATION ──────────────────────────────────────────────────────────────── */
// ↑ / ↓  — move between words
function wordUp() {
  if (wordIndex > 0) {
    wordIndex--;
    render();
  }
}
function wordDown() {
  if (wordIndex < getDayWords().length - 1) {
    wordIndex++;
    render();
  }
}

// ← / →  — move between days
function dayPrev() {
  if (dayIndex > 0) {
    dayIndex--;
    wordIndex = 0;
    daySelect.value = dayIndex;
    closeSidebar();
    render();
  }
}
function dayNext() {
  if (dayIndex < VOCAB_DATA.length - 1) {
    dayIndex++;
    wordIndex = 0;
    daySelect.value = dayIndex;
    closeSidebar();
    render();
  }
}

/* ── KEYBOARD ────────────────────────────────────────────────────────────────── */
document.addEventListener("keydown", (e) => {
  // Don't fire when typing in a select
  if (e.target.tagName === "SELECT") return;

  switch (e.key.toLowerCase()) {
    case "d":
      toggleSidebar();
      break;
    case "g":
      markDone();
      break;
    case "f":
      markForgot();
      break;
    case "s":
      resetCurrentWord();
      break;
    case "a":
      resetCurrentDay();
      break;
    case "arrowup":
      wordUp();
      e.preventDefault();
      break;
    case "arrowdown":
      wordDown();
      e.preventDefault();
      break;
    case "arrowleft":
      dayPrev();
      e.preventDefault();
      break;
    case "arrowright":
      dayNext();
      e.preventDefault();
      break;
    case "escape":
      closeSidebar();
      break;
  }
});

/* ── EVENT WIRING ────────────────────────────────────────────────────────────── */
// Desktop nav buttons (prev/next word)
btnPrev.addEventListener("click", wordUp);
btnNext.addEventListener("click", wordDown);

// Mobile action bar
mobMeaning.addEventListener("click", toggleSidebar);
mobDone.addEventListener("click", markDone);
mobForgot.addEventListener("click", markForgot);
mobResetWord.addEventListener("click", resetCurrentWord);

// Sidebar overlay tap to close (mobile)
sidebarOverlay.addEventListener("click", closeSidebar);

// Mobile word-list panel toggle
panelToggle.addEventListener("click", togglePanel);

/* ── SWIPE NAVIGATION (mobile) ───────────────────────────────────────────────── */
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  },
  { passive: true },
);

document.addEventListener(
  "touchend",
  (e) => {
    // Ignore if sidebar or word-list panel is being interacted with
    if (sidebarOpen) return;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // Only register mostly-horizontal or mostly-vertical swipes (min 50px)
    if (Math.abs(dx) < 50 && Math.abs(dy) < 50) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe → change day
      if (dx < 0) dayNext();
      else dayPrev();
    } else {
      // Vertical swipe → change word
      if (dy < 0) wordDown();
      else wordUp();
    }
  },
  { passive: true },
);

/* ── BOOT ────────────────────────────────────────────────────────────────────── */
loadVocab();
