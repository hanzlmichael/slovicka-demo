const STORAGE_KEY = "slovicka_state_v1";
const DATASET_URL = "./data/words-b2-c1-100.json";

const el = {
  datasetName: document.getElementById("datasetName"),
  progressText: document.getElementById("progressText"),
  progressBar: document.getElementById("progressBar"),
  wordTag: document.getElementById("wordTag"),
  wordIndex: document.getElementById("wordIndex"),
  wordText: document.getElementById("wordText"),
  phonetic: document.getElementById("phonetic"),
  translation: document.getElementById("translation"),
  definition: document.getElementById("definition"),
  example: document.getElementById("example"),
  revealBtn: document.getElementById("revealBtn"),
  againBtn: document.getElementById("againBtn"),
  nextBtn: document.getElementById("nextBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  clearBtn: document.getElementById("clearBtn"),
  historyList: document.getElementById("historyList"),
  viewMoreBtn: document.getElementById("viewMoreBtn"),
  historyItemTpl: document.getElementById("historyItemTpl"),
  // Drawer elements
  hamburgerBtn: document.getElementById("hamburgerBtn"),
  drawer: document.getElementById("drawer"),
  drawerOverlay: document.getElementById("drawerOverlay"),
  drawerClose: document.getElementById("drawerClose"),
  drawerDatasetName: document.getElementById("drawerDatasetName"),
  drawerProgressText: document.getElementById("drawerProgressText"),
  drawerProgressBar: document.getElementById("drawerProgressBar"),
  drawerHistoryList: document.getElementById("drawerHistoryList"),
  drawerViewMoreBtn: document.getElementById("drawerViewMoreBtn"),
  drawerDataSection: document.getElementById("drawerDataSection"),
  drawerHistorySection: document.getElementById("drawerHistorySection"),
  dataToggle: document.getElementById("dataToggle"),
  historyToggle: document.getElementById("historyToggle"),
  exportBtn2: document.getElementById("exportBtn2"),
  importFile2: document.getElementById("importFile2"),
  clearBtn2: document.getElementById("clearBtn2"),
};

const state = {
  words: [],
  seen: [],
  seenSet: new Set(),
  history: [],
  difficult: [],
  currentIndex: null,
  historyVisible: 10,
  drawerHistoryVisible: 10,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    state.seen = Array.isArray(parsed.seen)
      ? parsed.seen.filter(Number.isInteger)
      : [];
    state.history = Array.isArray(parsed.history) ? parsed.history : [];
    state.difficult = Array.isArray(parsed.difficult)
      ? parsed.difficult.filter(Number.isInteger)
      : [];
    state.currentIndex = Number.isInteger(parsed.currentIndex)
      ? parsed.currentIndex
      : null;
    state.seenSet = new Set(state.seen);
  } catch {
    console.warn("Nepodařilo se načíst uložený stav.");
  }
}

function saveState() {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    seen: state.seen,
    history: state.history,
    difficult: state.difficult,
    currentIndex: state.currentIndex,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function updateProgress() {
  const total = state.words.length;
  const seenCount = state.seenSet.size;
  const text = `${seenCount} / ${total}`;
  const percent = total ? (seenCount / total) * 100 : 0;
  const width = `${Math.min(100, percent)}%`;

  el.progressText.textContent = text;
  el.progressBar.style.width = width;

  // Sync drawer progress
  el.drawerProgressText.textContent = text;
  el.drawerProgressBar.style.width = width;
}

function historyEntry(word, index) {
  return {
    word: word.word,
    index,
    level: word.level,
    time: Date.now(),
  };
}

function registerSeen(index) {
  if (!state.seenSet.has(index)) {
    state.seen.push(index);
    state.seenSet.add(index);
    state.history.unshift(historyEntry(state.words[index], index));
    state.history = state.history.slice(0, 500);
  }
}

function pickUnseenIndex() {
  const total = state.words.length;
  if (!total) return null;

  if (state.seenSet.size >= total) {
    return Math.floor(Math.random() * total);
  }

  let attempts = 0;
  while (attempts < 200) {
    const idx = Math.floor(Math.random() * total);
    if (!state.seenSet.has(idx)) return idx;
    attempts += 1;
  }

  const unseen = [];
  for (let i = 0; i < total; i += 1) {
    if (!state.seenSet.has(i)) unseen.push(i);
  }
  return unseen[Math.floor(Math.random() * unseen.length)] ?? null;
}

function renderWord(index) {
  const word = state.words[index];
  if (!word) return;

  state.currentIndex = index;
  registerSeen(index);
  saveState();
  updateProgress();

  el.wordTag.textContent = `${word.pos.toUpperCase()} • LEVEL ${word.level}`;
  el.wordIndex.textContent = `#${String(word.id).padStart(4, "0")}`;
  el.wordText.textContent = word.word;
  el.phonetic.textContent = word.phonetic || "—";
  el.translation.textContent = word.cz;
  el.definition.textContent = word.definition;
  el.example.textContent = `"${word.example}"`;
  el.revealBtn.classList.add("hidden-translation");

  renderHistory();
}

function nextWord() {
  const nextIndex = pickUnseenIndex();
  if (nextIndex === null) return;
  renderWord(nextIndex);
}

function markAgain() {
  if (state.currentIndex === null) return;
  state.difficult.push(state.currentIndex);
  saveState();
  nextWord();
}

function relativeTime(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "právě teď";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `před ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `před ${hours} h`;
  const days = Math.floor(hours / 24);
  return `před ${days} dny`;
}

function renderHistoryList(container, items) {
  container.innerHTML = "";
  items.forEach((item) => {
    const node = el.historyItemTpl.content.cloneNode(true);
    const historyItem = node.querySelector(".history-item");
    historyItem.dataset.index = String(item.index);
    historyItem.tabIndex = 0;
    historyItem.querySelector(".h-word").textContent = item.word;
    historyItem.querySelector(".h-meta").textContent =
      `idx: ${item.index} • ${item.level} • ${relativeTime(item.time)}`;

    const openFromHistory = () => {
      renderWord(item.index);
      if (el.drawer.classList.contains("open")) {
        closeDrawer();
      }
    };

    historyItem.addEventListener("click", openFromHistory);
    historyItem.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openFromHistory();
      }
    });

    container.appendChild(node);
  });
}

function setDrawerSectionState(sectionEl, toggleEl, isExpanded) {
  if (!sectionEl || !toggleEl) return;
  sectionEl.classList.toggle("is-collapsed", !isExpanded);
  toggleEl.setAttribute("aria-expanded", String(isExpanded));
}

function toggleDrawerSection(sectionEl, toggleEl) {
  if (!sectionEl || !toggleEl) return;
  const isCollapsed = sectionEl.classList.contains("is-collapsed");
  setDrawerSectionState(sectionEl, toggleEl, isCollapsed);
}

function openDrawer() {
  el.drawer.classList.add("open");
  el.drawerOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  el.drawer.classList.remove("open");
  el.drawerOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

function renderHistory() {
  // Desktop history panel
  const desktopList = state.history.slice(0, state.historyVisible);
  renderHistoryList(el.historyList, desktopList);
  el.viewMoreBtn.style.display =
    state.historyVisible >= state.history.length ? "none" : "";

  // Drawer history panel
  const drawerList = state.history.slice(0, state.drawerHistoryVisible);
  renderHistoryList(el.drawerHistoryList, drawerList);
  el.drawerViewMoreBtn.style.display =
    state.drawerHistoryVisible >= state.history.length ? "none" : "";
}

function exportData() {
  const payload = localStorage.getItem(STORAGE_KEY) || "{}";
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `slovicka-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || !Array.isArray(parsed.seen)) {
        alert("Import selhal: neplatný JSON formát.");
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      loadState();
      updateProgress();
      renderHistory();
      if (state.currentIndex !== null && state.words[state.currentIndex]) {
        renderWord(state.currentIndex);
      } else {
        nextWord();
      }
      alert("Import dokončen.");
    } catch {
      alert("Import selhal: soubor není validní JSON.");
    }
  };
  reader.readAsText(file);
}

function clearData() {
  if (!confirm("Opravdu chceš smazat uložená lokální data?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state.seen = [];
  state.seenSet = new Set();
  state.history = [];
  state.difficult = [];
  state.currentIndex = null;
  updateProgress();
  renderHistory();
  nextWord();
}

async function boot() {
  loadState();

  const res = await fetch(DATASET_URL);
  if (!res.ok) {
    throw new Error("Nepodařilo se načíst dataset slov.");
  }

  const data = await res.json();
  state.words = data.words || [];
  el.datasetName.textContent = data.dataset || "Custom dataset";
  el.drawerDatasetName.textContent = data.dataset || "Custom dataset";

  updateProgress();
  renderHistory();

  if (state.currentIndex !== null && state.words[state.currentIndex]) {
    renderWord(state.currentIndex);
  } else {
    nextWord();
  }

  el.revealBtn.addEventListener("click", () => {
    el.revealBtn.classList.remove("hidden-translation");
  });

  el.nextBtn.addEventListener("click", nextWord);
  el.againBtn.addEventListener("click", markAgain);
  el.exportBtn.addEventListener("click", exportData);
  el.importFile.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importData(file);
    e.target.value = "";
  });
  el.clearBtn.addEventListener("click", clearData);

  // Drawer duplicate buttons
  el.exportBtn2.addEventListener("click", exportData);
  el.importFile2.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importData(file);
    e.target.value = "";
  });
  el.clearBtn2.addEventListener("click", clearData);

  // History "load more" buttons
  el.viewMoreBtn.addEventListener("click", () => {
    state.historyVisible += 10;
    renderHistory();
  });
  el.drawerViewMoreBtn.addEventListener("click", () => {
    state.drawerHistoryVisible += 10;
    renderHistory();
  });

  // Drawer collapsible sections
  setDrawerSectionState(el.drawerDataSection, el.dataToggle, false);
  setDrawerSectionState(el.drawerHistorySection, el.historyToggle, false);
  el.dataToggle.addEventListener("click", () => {
    toggleDrawerSection(el.drawerDataSection, el.dataToggle);
  });
  el.historyToggle.addEventListener("click", () => {
    toggleDrawerSection(el.drawerHistorySection, el.historyToggle);
  });

  // Drawer open/close
  el.hamburgerBtn.addEventListener("click", openDrawer);
  el.drawerClose.addEventListener("click", closeDrawer);
  el.drawerOverlay.addEventListener("click", closeDrawer);
}

boot().catch((err) => {
  console.error(err);
  el.wordText.textContent = "Chyba při načítání aplikace";
  el.definition.textContent =
    "Zkontroluj, že otevíráš projekt přes lokální server a existuje dataset JSON.";
});
