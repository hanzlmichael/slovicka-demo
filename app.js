const STORAGE_KEY = "slovicka_state_v1";
const DATASET_URL = "./data/words-b2-c1-100.json";

const el = {
  datasetName: document.getElementById("datasetName"),
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
  drawerHistoryList: document.getElementById("drawerHistoryList"),
  drawerViewMoreBtn: document.getElementById("drawerViewMoreBtn"),
  drawerDataSection: document.getElementById("drawerDataSection"),
  drawerHistorySection: document.getElementById("drawerHistorySection"),
  dataToggle: document.getElementById("dataToggle"),
  historyToggle: document.getElementById("historyToggle"),
  exportBtn2: document.getElementById("exportBtn2"),
  importFile2: document.getElementById("importFile2"),
  clearBtn2: document.getElementById("clearBtn2"),
  // Favorites
  favBtn: document.getElementById("favBtn"),
  favList: document.getElementById("favList"),
  favEmpty: document.getElementById("favEmpty"),
  favCount: document.getElementById("favCount"),
  practiceFavBtn: document.getElementById("practiceFavBtn"),
  exitFavModeBtn: document.getElementById("exitFavModeBtn"),
  drawerFavSection: document.getElementById("drawerFavSection"),
  favToggle: document.getElementById("favToggle"),
  drawerFavList: document.getElementById("drawerFavList"),
  drawerFavEmpty: document.getElementById("drawerFavEmpty"),
  drawerFavCount: document.getElementById("drawerFavCount"),
  drawerPracticeFavBtn: document.getElementById("drawerPracticeFavBtn"),
  drawerExitFavModeBtn: document.getElementById("drawerExitFavModeBtn"),
  // Search
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  // Categories
  catBtn: document.getElementById("catBtn"),
  catModalOverlay: document.getElementById("catModalOverlay"),
  catModalClose: document.getElementById("catModalClose"),
  catModalList: document.getElementById("catModalList"),
  catModalEmpty: document.getElementById("catModalEmpty"),
  catNewName: document.getElementById("catNewName"),
  catCreateBtn: document.getElementById("catCreateBtn"),
  categoriesList: document.getElementById("categoriesList"),
  categoriesEmpty: document.getElementById("categoriesEmpty"),
  drawerCategoriesList: document.getElementById("drawerCategoriesList"),
  drawerCategoriesEmpty: document.getElementById("drawerCategoriesEmpty"),
  drawerCatSection: document.getElementById("drawerCatSection"),
  catToggle: document.getElementById("catToggle"),
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
  favorites: [],
  favoritesSet: new Set(),
  mode: "all",
  favoritesVisible: 20,
  drawerFavoritesVisible: 20,
  categories: [],
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
    state.favorites = Array.isArray(parsed.favorites)
      ? parsed.favorites.filter(Number.isInteger)
      : [];
    state.currentIndex = Number.isInteger(parsed.currentIndex)
      ? parsed.currentIndex
      : null;
    state.seenSet = new Set(state.seen);
    state.favoritesSet = new Set(state.favorites);
    state.categories = Array.isArray(parsed.categories)
      ? parsed.categories
      : [];
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
    favorites: state.favorites,
    categories: state.categories,
    currentIndex: state.currentIndex,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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

  el.wordTag.textContent = `${word.pos.toUpperCase()} • ${word.level}`;
  //el.wordIndex.textContent = `#${String(word.id).padStart(4, "0")}`;
  el.wordText.textContent = word.word;
  el.phonetic.textContent = word.phonetic || "—";
  el.translation.textContent = word.cz;
  el.definition.textContent = word.definition;
  el.example.textContent = `"${word.example}"`;
  el.revealBtn.classList.add("hidden-translation");

  updateFavButton();
  renderHistory();
  renderFavorites();
}

function nextWord() {
  if (state.mode === "favorites") {
    if (state.favorites.length === 0) return;
    const idx =
      state.favorites[Math.floor(Math.random() * state.favorites.length)];
    renderWord(idx);
    return;
  }
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
      `${item.level} • ${relativeTime(item.time)}`;

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

function toggleFavorite(index) {
  if (state.favoritesSet.has(index)) {
    state.favorites = state.favorites.filter((i) => i !== index);
    state.favoritesSet.delete(index);
  } else {
    state.favorites.push(index);
    state.favoritesSet.add(index);
  }
  saveState();
  updateFavButton();
  renderFavorites();
}

function updateFavButton() {
  if (state.currentIndex === null) return;
  const isFav = state.favoritesSet.has(state.currentIndex);
  el.favBtn.textContent = isFav ? "♥" : "♡";
  el.favBtn.classList.toggle("is-fav", isFav);
  el.favBtn.title = isFav ? "Odebrat z oblíbených" : "Přidat do oblíbených";
}

function renderFavoritesList(container, emptyEl, items) {
  container.innerHTML = "";
  if (items.length === 0) {
    emptyEl.style.display = "";
    return;
  }
  emptyEl.style.display = "none";
  items.forEach((index) => {
    const word = state.words[index];
    if (!word) return;
    const node = el.historyItemTpl.content.cloneNode(true);
    const li = node.querySelector(".history-item");
    li.dataset.index = String(index);
    li.tabIndex = 0;
    li.querySelector(".h-word").textContent = word.word;
    li.querySelector(".h-meta").textContent =
      `${word.level} • ${word.pos}`;
    li.querySelector(".pill").textContent = "♥";
    li.querySelector(".pill").style.background = "#ffe0e0";
    li.querySelector(".pill").style.color = "#e25555";

    const go = () => {
      renderWord(index);
      if (el.drawer.classList.contains("open")) closeDrawer();
    };
    li.addEventListener("click", go);
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
    container.appendChild(node);
  });
}

function renderFavorites() {
  const count = state.favorites.length;
  el.favCount.textContent = String(count);
  el.drawerFavCount.textContent = String(count);

  renderFavoritesList(
    el.favList,
    el.favEmpty,
    state.favorites.slice(0, state.favoritesVisible),
  );
  renderFavoritesList(
    el.drawerFavList,
    el.drawerFavEmpty,
    state.favorites.slice(0, state.drawerFavoritesVisible),
  );
  updateModeUI();
}

function setMode(mode) {
  state.mode = mode;
  updateModeUI();
  if (mode === "favorites" && state.favorites.length > 0) {
    const idx =
      state.favorites[Math.floor(Math.random() * state.favorites.length)];
    renderWord(idx);
  } else if (mode === "all") {
    nextWord();
  }
}

function updateModeUI() {
  const isFav = state.mode === "favorites";
  const hasFavs = state.favorites.length > 0;

  el.nextBtn.textContent = isFav ? "Další oblíbené" : "Další";
  el.practiceFavBtn.style.display = !isFav && hasFavs ? "" : "none";
  el.exitFavModeBtn.style.display = isFav ? "" : "none";
  el.drawerPracticeFavBtn.style.display = !isFav && hasFavs ? "" : "none";
  el.drawerExitFavModeBtn.style.display = isFav ? "" : "none";
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
      renderHistory();
      renderFavorites();
      renderCategories();
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
  state.favorites = [];
  state.favoritesSet = new Set();
  state.categories = [];
  renderHistory();
  renderFavorites();
  renderCategories();
  nextWord();
}

/* ── Search ── */
function handleSearch() {
  const query = el.searchInput.value.trim().toLowerCase();
  if (query.length < 1) {
    el.searchResults.classList.remove("open");
    return;
  }
  const matches = [];
  for (let i = 0; i < state.words.length && matches.length < 10; i++) {
    const w = state.words[i];
    if (
      w.word.toLowerCase().includes(query) ||
      w.cz.toLowerCase().includes(query)
    ) {
      matches.push(i);
    }
  }
  renderSearchResults(matches);
}

function renderSearchResults(indices) {
  el.searchResults.innerHTML = "";
  if (indices.length === 0) {
    el.searchResults.classList.remove("open");
    return;
  }
  el.searchResults.classList.add("open");
  indices.forEach((idx, i) => {
    const w = state.words[idx];
    const li = document.createElement("li");
    li.className = "search-result-item";
    if (i === 0) li.classList.add("active");
    li.dataset.index = String(idx);
    li.innerHTML = `<span class="search-result-word">${escapeHtml(w.word)}</span><span class="search-result-meta">${escapeHtml(w.cz)} · ${w.level}</span>`;
    li.addEventListener("click", () => {
      renderWord(idx);
      el.searchInput.value = "";
      el.searchResults.classList.remove("open");
    });
    el.searchResults.appendChild(li);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

/* ── Categories ── */
function nextCatId() {
  return state.categories.length > 0
    ? Math.max(...state.categories.map((c) => c.id)) + 1
    : 1;
}

function createCategory(name) {
  if (!name.trim()) return;
  state.categories.push({ id: nextCatId(), name: name.trim(), words: [] });
  saveState();
  renderCatModal();
  renderCategories();
}

function deleteCategory(id) {
  state.categories = state.categories.filter((c) => c.id !== id);
  saveState();
  renderCatModal();
  renderCategories();
}

function renameCategory(id, newName) {
  const cat = state.categories.find((c) => c.id === id);
  if (cat && newName.trim()) {
    cat.name = newName.trim();
    saveState();
    renderCatModal();
    renderCategories();
  }
}

function toggleWordInCategory(catId, wordIndex) {
  const cat = state.categories.find((c) => c.id === catId);
  if (!cat) return;
  const i = cat.words.indexOf(wordIndex);
  if (i >= 0) {
    cat.words.splice(i, 1);
  } else {
    cat.words.push(wordIndex);
  }
  saveState();
  renderCategories();
}

function openCatModal() {
  renderCatModal();
  el.catModalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
  el.catNewName.value = "";
}

function closeCatModal() {
  el.catModalOverlay.classList.remove("open");
  if (!el.drawer.classList.contains("open")) {
    document.body.style.overflow = "";
  }
}

function renderCatModal() {
  const wordIdx = state.currentIndex;
  el.catModalList.innerHTML = "";
  if (state.categories.length === 0) {
    el.catModalEmpty.style.display = "";
    return;
  }
  el.catModalEmpty.style.display = "none";

  state.categories.forEach((cat) => {
    const li = document.createElement("li");
    li.className = "cat-modal-item";

    const isIn = wordIdx !== null && cat.words.includes(wordIdx);
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = isIn;
    cb.addEventListener("change", () => {
      if (wordIdx !== null) toggleWordInCategory(cat.id, wordIdx);
      renderCatModal();
    });

    const label = document.createElement("label");
    label.textContent = cat.name;
    label.addEventListener("click", () => cb.click());

    const actions = document.createElement("div");
    actions.className = "cat-modal-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "cat-modal-action-btn";
    editBtn.textContent = "✎";
    editBtn.title = "Přejmenovat";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const newName = prompt("Nový název kategorie:", cat.name);
      if (newName !== null) renameCategory(cat.id, newName);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "cat-modal-action-btn delete";
    delBtn.textContent = "✕";
    delBtn.title = "Smazat";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`Opravdu smazat kategorii "${cat.name}"?`))
        deleteCategory(cat.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(cb);
    li.appendChild(label);
    li.appendChild(actions);
    el.catModalList.appendChild(li);
  });
}

function renderCategoriesList(container, emptyEl) {
  container.innerHTML = "";
  if (state.categories.length === 0) {
    emptyEl.style.display = "";
    return;
  }
  emptyEl.style.display = "none";

  state.categories.forEach((cat) => {
    const section = document.createElement("div");
    section.className = "cat-section";

    const head = document.createElement("div");
    head.className = "cat-section-head";
    head.innerHTML = `<span>${escapeHtml(cat.name)}</span><span class="cat-section-count">${cat.words.length}</span>`;

    const list = document.createElement("ul");
    list.className = "history-list";
    list.style.display = "none";

    head.addEventListener("click", () => {
      const isOpen = list.style.display !== "none";
      list.style.display = isOpen ? "none" : "";
    });

    cat.words.forEach((idx) => {
      const word = state.words[idx];
      if (!word) return;
      const node = el.historyItemTpl.content.cloneNode(true);
      const li = node.querySelector(".history-item");
      li.dataset.index = String(idx);
      li.tabIndex = 0;
      li.querySelector(".h-word").textContent = word.word;
      li.querySelector(".h-meta").textContent =
        `${word.level} · ${word.pos}`;
      li.querySelector(".pill").textContent = "📁";
      li.querySelector(".pill").style.background = "#e8effd";
      li.querySelector(".pill").style.color = "#1f5fd1";

      const go = () => {
        renderWord(idx);
        if (el.drawer.classList.contains("open")) closeDrawer();
      };
      li.addEventListener("click", go);
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
      list.appendChild(node);
    });

    section.appendChild(head);
    section.appendChild(list);
    container.appendChild(section);
  });
}

function renderCategories() {
  renderCategoriesList(el.categoriesList, el.categoriesEmpty);
  renderCategoriesList(el.drawerCategoriesList, el.drawerCategoriesEmpty);
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

  renderHistory();
  renderFavorites();
  renderCategories();

  if (state.currentIndex !== null && state.words[state.currentIndex]) {
    renderWord(state.currentIndex);
  } else {
    nextWord();
  }

  el.revealBtn.addEventListener("click", () => {
    el.revealBtn.classList.toggle("hidden-translation");
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

  // Favorites
  el.favBtn.addEventListener("click", () => {
    if (state.currentIndex !== null) toggleFavorite(state.currentIndex);
  });
  el.practiceFavBtn.addEventListener("click", () => setMode("favorites"));
  el.exitFavModeBtn.addEventListener("click", () => setMode("all"));
  el.drawerPracticeFavBtn.addEventListener("click", () => {
    setMode("favorites");
    closeDrawer();
  });
  el.drawerExitFavModeBtn.addEventListener("click", () => {
    setMode("all");
    closeDrawer();
  });
  setDrawerSectionState(el.drawerFavSection, el.favToggle, false);
  el.favToggle.addEventListener("click", () => {
    toggleDrawerSection(el.drawerFavSection, el.favToggle);
  });

  // Categories
  el.catBtn.addEventListener("click", openCatModal);
  el.catModalClose.addEventListener("click", closeCatModal);
  el.catModalOverlay.addEventListener("click", (e) => {
    if (e.target === el.catModalOverlay) closeCatModal();
  });
  el.catCreateBtn.addEventListener("click", () => {
    createCategory(el.catNewName.value);
    el.catNewName.value = "";
  });
  el.catNewName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      createCategory(el.catNewName.value);
      el.catNewName.value = "";
    }
  });
  setDrawerSectionState(el.drawerCatSection, el.catToggle, false);
  el.catToggle.addEventListener("click", () => {
    toggleDrawerSection(el.drawerCatSection, el.catToggle);
  });

  // Search
  el.searchInput.addEventListener("input", handleSearch);
  el.searchInput.addEventListener("keydown", (e) => {
    const activeItem = el.searchResults.querySelector(
      ".search-result-item.active",
    );
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (activeItem && activeItem.nextElementSibling) {
        activeItem.classList.remove("active");
        activeItem.nextElementSibling.classList.add("active");
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (activeItem && activeItem.previousElementSibling) {
        activeItem.classList.remove("active");
        activeItem.previousElementSibling.classList.add("active");
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeItem) activeItem.click();
    } else if (e.key === "Escape") {
      el.searchResults.classList.remove("open");
      el.searchInput.blur();
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) {
      el.searchResults.classList.remove("open");
    }
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
