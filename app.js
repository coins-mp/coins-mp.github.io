const state = {
  coins: [],
  section: "all",
  view: localStorage.getItem("coinView") || "cards",
  theme: localStorage.getItem("coinTheme") || "light"
};

const els = {
  grid: document.getElementById("coinGrid"),
  tableWrap: document.getElementById("coinTableWrap"),
  tableBody: document.getElementById("coinTableBody"),
  stats: document.getElementById("statsGrid"),
  country: document.getElementById("countryFilter"),
  year: document.getElementById("yearFilter"),
  denomination: document.getElementById("denominationFilter"),
  condition: document.getElementById("conditionFilter"),
  search: document.getElementById("searchInput"),
  sectionTitle: document.getElementById("sectionTitle"),
  resultCount: document.getElementById("resultCount"),
  themeToggle: document.getElementById("themeToggle"),
  viewToggle: document.getElementById("viewToggle"),
  modal: document.getElementById("coinModal"),
  modalImagePanel: document.getElementById("modalImagePanel"),
  modalCountry: document.getElementById("modalCountry"),
  modalTitle: document.getElementById("modalTitle"),
  modalSubtitle: document.getElementById("modalSubtitle"),
  modalBadges: document.getElementById("modalBadges"),
  modalFacts: document.getElementById("modalFacts"),
  modalDescription: document.getElementById("modalDescription"),
  modalNotes: document.getElementById("modalNotes"),
  descriptionSection: document.getElementById("descriptionSection"),
  notesSection: document.getElementById("notesSection")
};

const sectionTitles = {
  all: "Collection",
  regular: "Regular Euro Coins",
  commemorative: "2€ Commemorative",
  missing: "Missing Coins",
  duplicates: "Duplicates",
  statistics: "Statistics"
};

function flagEmoji(code) {
  return code
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("coinTheme", theme);
  els.themeToggle.textContent = theme === "light" ? "🌙 Dark" : "☀️ Light";
}

function setView(view) {
  state.view = view;
  localStorage.setItem("coinView", view);
  els.grid.classList.toggle("hidden", view !== "cards");
  els.tableWrap.classList.toggle("hidden", view !== "table");
  els.viewToggle.textContent = view === "cards" ? "▦ Table" : "▦ Cards";
}

function populateSelect(select, values) {
  const first = select.options[0].outerHTML;
  select.innerHTML = first;
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function populateFilters() {
  populateSelect(els.country, [...new Set(state.coins.map(c => c.country))].sort());
  populateSelect(els.year, [...new Set(state.coins.map(c => c.year))].sort((a,b) => b-a));
  populateSelect(els.denomination, [...new Set(state.coins.map(c => c.denomination))]);
  populateSelect(els.condition, [...new Set(state.coins.map(c => c.condition).filter(Boolean))].sort());
}

function getFilteredCoins() {
  const search = els.search.value.trim().toLowerCase();

  return state.coins.filter(coin => {
    if (state.section === "regular" && coin.type !== "Regular") return false;
    if (state.section === "commemorative" && coin.type !== "Commemorative") return false;
    if (state.section === "missing" && coin.inCollection) return false;
    if (state.section === "duplicates" && !(coin.duplicates > 0)) return false;

    if (els.country.value && coin.country !== els.country.value) return false;
    if (els.year.value && String(coin.year) !== els.year.value) return false;
    if (els.denomination.value && coin.denomination !== els.denomination.value) return false;
    if (els.condition.value && coin.condition !== els.condition.value) return false;

    if (search) {
      const haystack = [
        coin.country,
        coin.year,
        coin.denomination,
        coin.type,
        coin.name,
        coin.condition,
        coin.mint,
        coin.description,
        coin.notes
      ].join(" ").toLowerCase();

      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

function statusBadges(coin) {
  const badges = [];

  if (coin.condition) {
    badges.push(`<span class="badge condition">${escapeHtml(coin.condition)}</span>`);
  }

  if (coin.inCollection) {
    badges.push(`<span class="badge collection">✓ In collection</span>`);
  } else {
    badges.push(`<span class="badge missing">○ Missing</span>`);
  }

  if (coin.duplicates > 0) {
    badges.push(`<span class="badge duplicate">↻ Duplicate ×${coin.duplicates}</span>`);
  }

  if (coin.wanted) {
    badges.push(`<span class="badge wanted">Wanted</span>`);
  }

  return badges.join("");
}

function imageMarkup(coin, modal = false) {
  if (coin.image) {
    const extraClass = modal ? ' class="modal-coin-image"' : "";
    return `<img${extraClass} src="${escapeHtml(coin.image)}" alt="${escapeHtml(`${coin.country} ${coin.year} ${coin.denomination}`)}" loading="lazy">`;
  }

  return `<div class="coin-placeholder">${escapeHtml(coin.denomination)}</div>`;
}

function renderCards(coins) {
  if (!coins.length) {
    els.grid.innerHTML = `<div class="empty-state">No coins match the selected filters.</div>`;
    return;
  }

  els.grid.innerHTML = coins.map((coin, index) => `
    <article class="coin-card">
      <button class="coin-image coin-open" type="button" data-coin-index="${state.coins.indexOf(coin)}" aria-label="Open details for ${escapeHtml(coin.name || `${coin.denomination} ${coin.country}`)}">
        ${imageMarkup(coin)}
      </button>
      <div class="coin-content">
        <div class="coin-topline">
          <span>${flagEmoji(coin.countryCode)} ${escapeHtml(coin.country)}</span>
          <span>${coin.year}</span>
        </div>
        <h3 class="coin-title">${escapeHtml(coin.name || `${coin.denomination} ${coin.country}`)}</h3>
        <div class="coin-meta">${escapeHtml(coin.denomination)} · ${escapeHtml(coin.type)}${coin.mint ? ` · Mint ${escapeHtml(coin.mint)}` : ""}</div>
        ${coin.description ? `<p class="coin-preview">${escapeHtml(coin.description)}</p>` : ""}
        <div class="badges">${statusBadges(coin)}</div>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".coin-open").forEach(button => {
    button.addEventListener("click", () => {
      const coin = state.coins[Number(button.dataset.coinIndex)];
      openCoinModal(coin);
    });
  });
}

function renderTable(coins) {
  els.tableBody.innerHTML = coins.map(coin => {
    const status = coin.inCollection ? "In collection" : "Missing";
    return `
      <tr>
        <td>${flagEmoji(coin.countryCode)} ${escapeHtml(coin.country)}</td>
        <td>${coin.year}</td>
        <td>${escapeHtml(coin.denomination)}</td>
        <td>${escapeHtml(coin.type)}</td>
        <td>${escapeHtml(coin.name || "—")}</td>
        <td>${escapeHtml(coin.condition || "—")}</td>
        <td>${status}</td>
        <td>${coin.duplicates || 0}</td>
      </tr>
    `;
  }).join("");
}

function renderStats() {
  const total = state.coins.length;
  const collected = state.coins.filter(c => c.inCollection).length;
  const missing = state.coins.filter(c => !c.inCollection).length;
  const duplicates = state.coins.reduce((sum, c) => sum + (c.duplicates || 0), 0);

  const cards = [
    ["Catalog", total],
    ["In collection", collected],
    ["Missing", missing],
    ["Duplicates", duplicates]
  ];

  els.stats.innerHTML = cards.map(([label, value]) => `
    <div class="stat-card">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    </div>
  `).join("");
}

function updateStatsVisibility() {
  const isMobile = window.matchMedia("(max-width: 560px)").matches;

  if (isMobile && state.section !== "all") {
    els.stats.classList.add("hidden");
  } else {
    els.stats.classList.remove("hidden");
  }
}

function openCoinModal(coin) {
  els.modalImagePanel.innerHTML = imageMarkup(coin, true);
  els.modalCountry.textContent = `${flagEmoji(coin.countryCode)} ${coin.country}`;
  els.modalTitle.textContent = coin.name || `${coin.denomination} ${coin.country}`;
  els.modalSubtitle.textContent = `${coin.year} · ${coin.denomination} · ${coin.type}`;
  els.modalBadges.innerHTML = statusBadges(coin);

  const facts = [
    ["Country", coin.country],
    ["Year", coin.year],
    ["Denomination", coin.denomination],
    ["Type", coin.type],
    ["Condition", coin.condition],
    ["Mint", coin.mint],
    ["Mintage", coin.mintage],
    ["Metal", coin.metal],
    ["Weight", coin.weight],
    ["Diameter", coin.diameter]
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  els.modalFacts.innerHTML = facts.map(([label, value]) => `
    <div class="fact">
      <div class="fact-label">${escapeHtml(label)}</div>
      <div class="fact-value">${escapeHtml(value)}</div>
    </div>
  `).join("");

  if (coin.description) {
    els.modalDescription.textContent = coin.description;
    els.descriptionSection.classList.remove("hidden");
  } else {
    els.descriptionSection.classList.add("hidden");
  }

  if (coin.notes) {
    els.modalNotes.textContent = coin.notes;
    els.notesSection.classList.remove("hidden");
  } else {
    els.notesSection.classList.add("hidden");
  }

  els.modal.classList.remove("hidden");
  els.modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  const modalImage = els.modalImagePanel.querySelector("img");

if (modalImage) {
  let scale = 1;
  let posX = 0;
  let posY = 0;

  let startX = 0;
  let startY = 0;
  let startPosX = 0;
  let startPosY = 0;

  let dragging = false;
  let moved = false;

  function updateImageTransform() {
    modalImage.style.transform =
      `translate(${posX}px, ${posY}px) scale(${scale})`;

    modalImage.classList.toggle("zoomed", scale > 1);
  }

  function resetImage() {
    scale = 1;
    posX = 0;
    posY = 0;
    updateImageTransform();
  }

  function zoomImage() {
  if (window.innerWidth <= 560) {
    scale = 1.65;
  } else if (window.innerWidth <= 900) {
    scale = 2;
  } else {
    scale = 2.5;
  }

  posX = 0;
  posY = 0;
  updateImageTransform();
}

  modalImage.addEventListener("click", () => {
    if (moved) {
      moved = false;
      return;
    }

    if (scale === 1) {
      zoomImage();
    } else {
      resetImage();
    }
  });

  modalImage.addEventListener("pointerdown", event => {
    if (scale === 1) return;

    dragging = true;
    moved = false;

    startX = event.clientX;
    startY = event.clientY;
    startPosX = posX;
    startPosY = posY;

    modalImage.setPointerCapture(event.pointerId);
    modalImage.classList.add("dragging");
  });

  modalImage.addEventListener("pointermove", event => {
    if (!dragging) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      moved = true;
    }

    posX = startPosX + dx;
    posY = startPosY + dy;

    updateImageTransform();
  });

  function stopDragging(event) {
    if (!dragging) return;

    dragging = false;
    modalImage.classList.remove("dragging");

    if (modalImage.hasPointerCapture(event.pointerId)) {
      modalImage.releasePointerCapture(event.pointerId);
    }
  }

  modalImage.addEventListener("pointerup", stopDragging);
  modalImage.addEventListener("pointercancel", stopDragging);
}
}

function closeCoinModal() {
  els.modal.classList.add("hidden");
  els.modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function render() {
  updateStatsVisibility();
  const coins = getFilteredCoins();
  els.sectionTitle.textContent = sectionTitles[state.section];
  els.resultCount.textContent = `${coins.length} coin${coins.length === 1 ? "" : "s"}`;
  renderCards(coins);
  renderTable(coins);
}

function bindEvents() {
  [els.country, els.year, els.denomination, els.condition].forEach(el => {
    el.addEventListener("change", render);
  });

  els.search.addEventListener("input", render);

  document.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      state.section = button.dataset.section;
      render();
    });
  });

  els.themeToggle.addEventListener("click", () => {
    setTheme(state.theme === "light" ? "dark" : "light");
  });

  els.viewToggle.addEventListener("click", () => {
    setView(state.view === "cards" ? "table" : "cards");
  });

  document.querySelectorAll("[data-close-modal]").forEach(el => {
    el.addEventListener("click", closeCoinModal);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !els.modal.classList.contains("hidden")) {
      closeCoinModal();
    }
  });

  window.addEventListener("resize", updateStatsVisibility);
}

async function init() {
  setTheme(state.theme);
  setView(state.view);
  bindEvents();

  try {
    const response = await fetch("data/coins.json?v=4");
    if (!response.ok) throw new Error("Could not load coins.json");
    state.coins = await response.json();
    populateFilters();
    renderStats();
    render();
  } catch (error) {
    els.grid.innerHTML = `<div class="empty-state">Could not load coin data. ${escapeHtml(error.message)}</div>`;
    console.error(error);
  }
}

init();
