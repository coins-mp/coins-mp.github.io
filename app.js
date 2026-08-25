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
  viewToggle: document.getElementById("viewToggle")
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
        coin.mint
      ].join(" ").toLowerCase();

      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

function statusBadges(coin) {
  const badges = [];

  if (coin.condition) {
    badges.push(`<span class="badge condition">${coin.condition}</span>`);
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

function imageMarkup(coin) {
  if (coin.image) {
    return `<img src="${coin.image}" alt="${coin.country} ${coin.year} ${coin.denomination}" loading="lazy">`;
  }

  return `<div class="coin-placeholder">${coin.denomination}</div>`;
}

function renderCards(coins) {
  if (!coins.length) {
    els.grid.innerHTML = `<div class="empty-state">No coins match the selected filters.</div>`;
    return;
  }

  els.grid.innerHTML = coins.map(coin => `
    <article class="coin-card">
      <div class="coin-image">${imageMarkup(coin)}</div>
      <div class="coin-content">
        <div class="coin-topline">
          <span>${flagEmoji(coin.countryCode)} ${coin.country}</span>
          <span>${coin.year}</span>
        </div>
        <h3 class="coin-title">${coin.name || `${coin.denomination} ${coin.country}`}</h3>
        <div class="coin-meta">${coin.denomination} · ${coin.type}${coin.mint ? ` · Mint ${coin.mint}` : ""}</div>
        <div class="badges">${statusBadges(coin)}</div>
      </div>
    </article>
  `).join("");
}

function renderTable(coins) {
  els.tableBody.innerHTML = coins.map(coin => {
    const status = coin.inCollection ? "In collection" : "Missing";
    return `
      <tr>
        <td>${flagEmoji(coin.countryCode)} ${coin.country}</td>
        <td>${coin.year}</td>
        <td>${coin.denomination}</td>
        <td>${coin.type}</td>
        <td>${coin.name || "—"}</td>
        <td>${coin.condition || "—"}</td>
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

function render() {
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
}

async function init() {
  setTheme(state.theme);
  setView(state.view);
  bindEvents();

  try {
    const response = await fetch("data/coins.json");
    if (!response.ok) throw new Error("Could not load coins.json");
    state.coins = await response.json();
    populateFilters();
    renderStats();
    render();
  } catch (error) {
    els.grid.innerHTML = `<div class="empty-state">Could not load coin data. ${error.message}</div>`;
    console.error(error);
  }
}

init();
