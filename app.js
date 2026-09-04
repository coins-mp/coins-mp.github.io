const state = {
  coins: [],

  section:
    localStorage.getItem(
      "coinSection"
    ) || "home",

  view:
    localStorage.getItem(
      "coinView"
    ) || "cards",

  theme:
    localStorage.getItem(
      "coinTheme"
    ) || "light",

  sort:
    localStorage.getItem(
      "coinSort"
    ) || "country-asc",

  tableSort:
    localStorage.getItem(
      "coinTableSort"
    ) || "",

  page: 1
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
  sort: document.getElementById("sortFilter"),
  search: document.getElementById("searchInput"),
  paginationTop: document.getElementById("paginationTop"),
  paginationBottom: document.getElementById("paginationBottom"),
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
  home: "All Coins",
  collection: "My Collection",
  regular: "Regular Euro Coins",
  commemorative: "2€ Commemorative",
  missing: "Missing Coins",
  duplicates: "Duplicates"
};

let viewerController = null;


function flagEmoji(code) {
  return String(code || "")
    .toUpperCase()
    .replace(
      /./g,
      char =>
        String.fromCodePoint(
          127397 +
          char.charCodeAt()
        )
    );
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

  document.documentElement.dataset.theme =
    theme;

  localStorage.setItem(
    "coinTheme",
    theme
  );

  els.themeToggle.textContent =
    theme === "light"
      ? "🌙 Dark"
      : "☀️ Light";
}


function setView(view) {
  state.view = view;

  localStorage.setItem(
    "coinView",
    view
  );

  els.grid.classList.toggle(
    "hidden",
    view !== "cards"
  );

  els.tableWrap.classList.toggle(
    "hidden",
    view !== "table"
  );

  els.viewToggle.textContent =
    view === "cards"
      ? "▦ Table"
      : "▦ Cards";
}


function populateSelect(
  select,
  values
) {
  const first =
    select.options[0].outerHTML;

  select.innerHTML =
    first;

  values.forEach(
    value => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        value;

      option.textContent =
        value;

      select.appendChild(
        option
      );
    }
  );
}


function populateFilters() {
  populateSelect(
    els.country,
    [
      ...new Set(
        state.coins.map(
          coin =>
            coin.country
        )
      )
    ].sort(
      (a, b) =>
        String(a)
          .localeCompare(
            String(b),
            "en",
            {
              sensitivity:
                "base"
            }
          )
    )
  );

  populateSelect(
    els.year,
    [
      ...new Set(
        state.coins
          .map(
            coin =>
              coin.year
          )
          .filter(
            year =>
              year !== "" &&
              year !== null &&
              year !== undefined
          )
      )
    ].sort(
      (a, b) =>
        Number(b) -
        Number(a)
    )
  );

  populateSelect(
    els.denomination,
    [
      ...new Set(
        state.coins.map(
          coin =>
            coin.denomination
        )
      )
    ]
  );

  populateSelect(
    els.condition,
    [
      ...new Set(
        state.coins
          .map(
            coin =>
              coin.condition
          )
          .filter(Boolean)
      )
    ].sort()
  );
}


function coinIdNumber(coin) {
  const value =
    Number.parseInt(
      coin.id,
      10
    );

  return Number.isFinite(
    value
  )
    ? value
    : 0;
}


function denominationValue(
  value
) {
  const text =
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(",", ".");

  const match =
    text.match(
      /[\d.]+/
    );

  if (!match) {
    return Number
      .MAX_SAFE_INTEGER;
  }

  const number =
    Number.parseFloat(
      match[0]
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return Number
      .MAX_SAFE_INTEGER;
  }

  if (
    text.includes("cent") ||
    text.includes("centime") ||
    text.includes("cént")
  ) {
    return number / 100;
  }

  return number;
}


function compareText(
  a,
  b
) {
  return String(a || "")
    .localeCompare(
      String(b || ""),
      "en",
      {
        sensitivity:
          "base",

        numeric:
          true
      }
    );
}


function compareYearValues(
  a,
  b,
  direction
) {
  const yearA =
    a === "" ||
    a === null ||
    a === undefined
      ? null
      : Number(a);

  const yearB =
    b === "" ||
    b === null ||
    b === undefined
      ? null
      : Number(b);

  /*
   * Empty years always stay
   * at the end.
   */
  if (
    yearA === null &&
    yearB === null
  ) {
    return 0;
  }

  if (
    yearA === null
  ) {
    return 1;
  }

  if (
    yearB === null
  ) {
    return -1;
  }

  return (
    (
      yearA -
      yearB
    ) *
    direction
  );
}


function conditionValue(
  condition
) {
  const order = {
    G: 1,
    VG: 2,
    F: 3,
    VF: 4,
    XF: 5,
    AU: 6,
    UNC: 7
  };

  return (
    order[
      String(
        condition || ""
      ).toUpperCase()
    ] ||
    999
  );
}


function compareCountry(
  a,
  b,
  direction = 1
) {
  const countryCompare =
    String(
      a.country || ""
    )
      .localeCompare(
        String(
          b.country || ""
        ),
        "en",
        {
          sensitivity:
            "base"
        }
      );

  if (
    countryCompare !== 0
  ) {
    return (
      countryCompare *
      direction
    );
  }

  const yearCompare =
    Number(
      a.year || 0
    ) -
    Number(
      b.year || 0
    );

  if (
    yearCompare !== 0
  ) {
    return yearCompare;
  }

  const denominationCompare =
    denominationValue(
      a.denomination
    ) -
    denominationValue(
      b.denomination
    );

  if (
    denominationCompare !==
    0
  ) {
    return (
      denominationCompare
    );
  }

  return (
    coinIdNumber(a) -
    coinIdNumber(b)
  );
}


function sortCoins(
  coins,
  sortValue = state.sort
) {
  const sorted =
    [...coins];

  switch (
    sortValue
  ) {
    case "country-desc":
      sorted.sort(
        (a, b) =>
          compareCountry(
            a,
            b,
            -1
          )
      );
      break;


    case "added-desc":
      sorted.sort(
        (a, b) =>
          coinIdNumber(b) -
          coinIdNumber(a)
      );
      break;


    case "added-asc":
      sorted.sort(
        (a, b) =>
          coinIdNumber(a) -
          coinIdNumber(b)
      );
      break;


    case "year-desc":
      sorted.sort(
        (a, b) => {
          const difference =
            compareYearValues(
              a.year,
              b.year,
              -1
            );

          if (
            difference !==
            0
          ) {
            return difference;
          }

          return compareCountry(
            a,
            b,
            1
          );
        }
      );
      break;


    case "year-asc":
      sorted.sort(
        (a, b) => {
          const difference =
            compareYearValues(
              a.year,
              b.year,
              1
            );

          if (
            difference !==
            0
          ) {
            return difference;
          }

          return compareCountry(
            a,
            b,
            1
          );
        }
      );
      break;


    case "denomination-desc":
      sorted.sort(
        (a, b) => {
          const difference =
            denominationValue(
              b.denomination
            ) -
            denominationValue(
              a.denomination
            );

          if (
            difference !==
            0
          ) {
            return difference;
          }

          return compareCountry(
            a,
            b,
            1
          );
        }
      );
      break;


    case "denomination-asc":
      sorted.sort(
        (a, b) => {
          const difference =
            denominationValue(
              a.denomination
            ) -
            denominationValue(
              b.denomination
            );

          if (
            difference !==
            0
          ) {
            return difference;
          }

          return compareCountry(
            a,
            b,
            1
          );
        }
      );
      break;


    case "type-asc":
      sorted.sort(
        (a, b) =>
          compareText(
            a.type,
            b.type
          )
      );
      break;


    case "type-desc":
      sorted.sort(
        (a, b) =>
          compareText(
            b.type,
            a.type
          )
      );
      break;


    case "name-asc":
      sorted.sort(
        (a, b) =>
          compareText(
            a.name,
            b.name
          )
      );
      break;


    case "name-desc":
      sorted.sort(
        (a, b) =>
          compareText(
            b.name,
            a.name
          )
      );
      break;


    case "condition-asc":
      sorted.sort(
        (a, b) =>
          conditionValue(
            a.condition
          ) -
          conditionValue(
            b.condition
          )
      );
      break;


    case "condition-desc":
      sorted.sort(
        (a, b) =>
          conditionValue(
            b.condition
          ) -
          conditionValue(
            a.condition
          )
      );
      break;


    case "status-asc":
      sorted.sort(
        (a, b) =>
          compareText(
            a.status,
            b.status
          )
      );
      break;


    case "status-desc":
      sorted.sort(
        (a, b) =>
          compareText(
            b.status,
            a.status
          )
      );
      break;


    case "duplicates-asc":
      sorted.sort(
        (a, b) =>
          Number(
            a.duplicates ||
            0
          ) -
          Number(
            b.duplicates ||
            0
          )
      );
      break;


    case "duplicates-desc":
      sorted.sort(
        (a, b) =>
          Number(
            b.duplicates ||
            0
          ) -
          Number(
            a.duplicates ||
            0
          )
      );
      break;


    case "country-asc":
    default:
      sorted.sort(
        (a, b) =>
          compareCountry(
            a,
            b,
            1
          )
      );
      break;
  }

  return sorted;
}


function getFilteredCoins() {
  const search =
    els.search.value
      .trim()
      .toLowerCase();

  const filtered =
    state.coins.filter(
      coin => {

        /*
         * HOME
         *
         * No status filter.
         * Shows absolutely all coins.
         */


        /*
         * MY COLLECTION
         *
         * Regular +
         * Commemorative,
         * status = collection.
         */
        if (
          state.section ===
            "collection" &&
          coin.status !==
            "collection"
        ) {
          return false;
        }


        /*
         * REGULAR
         */
        if (
          state.section ===
            "regular" &&
          (
            coin.status !==
              "collection" ||
            coin.type !==
              "Regular"
          )
        ) {
          return false;
        }


        /*
         * 2€ COMMEMORATIVE
         */
        if (
          state.section ===
            "commemorative" &&
          (
            coin.status !==
              "collection" ||
            coin.type !==
              "Commemorative"
          )
        ) {
          return false;
        }


        /*
         * MISSING
         */
        if (
          state.section ===
            "missing" &&
          coin.status !==
            "missing"
        ) {
          return false;
        }


        /*
         * DUPLICATES
         */
        if (
          state.section ===
            "duplicates" &&
          coin.status !==
            "duplicate"
        ) {
          return false;
        }


        if (
          els.country.value &&
          coin.country !==
            els.country.value
        ) {
          return false;
        }


        if (
          els.year.value &&
          String(
            coin.year
          ) !==
            els.year.value
        ) {
          return false;
        }


        if (
          els.denomination
            .value &&
          coin.denomination !==
            els.denomination
              .value
        ) {
          return false;
        }


        if (
          els.condition.value &&
          coin.condition !==
            els.condition.value
        ) {
          return false;
        }


        if (
          search
        ) {
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
          ]
            .join(" ")
            .toLowerCase();

          if (
            !haystack.includes(
              search
            )
          ) {
            return false;
          }
        }

        return true;
      }
    );

  const activeSort =
    state.view ===
      "table" &&
    state.tableSort
      ? state.tableSort
      : state.sort;

  return sortCoins(
    filtered,
    activeSort
  );
}


function getColumnsPerRow() {
  const width =
    window.innerWidth;

  if (
    width <= 560
  ) {
    return 1;
  }

  if (
    width <= 900
  ) {
    return 2;
  }

  const gridWidth =
    els.grid
      .getBoundingClientRect()
      .width;

  if (
    !gridWidth
  ) {
    return 4;
  }

  const minCardWidth =
    245;

  const gap =
    16;

  return Math.max(
    1,
    Math.floor(
      (
        gridWidth +
        gap
      ) /
      (
        minCardWidth +
        gap
      )
    )
  );
}


function getCoinsPerPage() {
  return (
    getColumnsPerRow() *
    5
  );
}


function createPaginationHtml(
  totalPages
) {
  let html = "";

  html += `
    <button
      class="pagination-btn"
      data-page="${state.page - 1}"
      ${
        state.page === 1
          ? "disabled"
          : ""
      }
    >
      Previous
    </button>
  `;

  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {
    html += `
      <button
        class="pagination-btn ${
          page === state.page
            ? "active"
            : ""
        }"
        data-page="${page}"
      >
        ${page}
      </button>
    `;
  }

  html += `
    <button
      class="pagination-btn"
      data-page="${state.page + 1}"
      ${
        state.page === totalPages
          ? "disabled"
          : ""
      }
    >
      Next
    </button>
  `;

  return html;
}


function bindPaginationButtons(
  container,
  totalPages
) {
  container
    .querySelectorAll(
      ".pagination-btn"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const nextPage =
              Number(
                button.dataset.page
              );

            if (
              !Number.isFinite(
                nextPage
              ) ||
              nextPage < 1 ||
              nextPage >
                totalPages
            ) {
              return;
            }

            state.page =
              nextPage;

            render();

            window.scrollTo({
              top:
                els.sectionTitle
                  .getBoundingClientRect()
                  .top +
                window.scrollY -
                20,

              behavior:
                "smooth"
            });
          }
        );
      }
    );
}


function renderPagination(
  totalCoins
) {
  const perPage =
    getCoinsPerPage();

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalCoins /
        perPage
      )
    );

  if (
    state.page >
    totalPages
  ) {
    state.page =
      totalPages;
  }

  const containers = [
    els.paginationTop,
    els.paginationBottom
  ];

  if (
    totalPages <= 1
  ) {
    containers.forEach(
      container => {
        container.innerHTML =
          "";

        container
          .classList
          .add(
            "hidden"
          );
      }
    );

    return;
  }

  const html =
    createPaginationHtml(
      totalPages
    );

  containers.forEach(
    container => {
      container
        .classList
        .remove(
          "hidden"
        );

      container.innerHTML =
        html;

      bindPaginationButtons(
        container,
        totalPages
      );
    }
  );
}


function statusBadges(coin) {
  const badges = [];

  if (
    coin.condition
  ) {
    badges.push(
      `<span class="badge condition">${escapeHtml(
        coin.condition
      )}</span>`
    );
  }

  if (
    coin.status ===
    "duplicate"
  ) {
    badges.push(
      `<span class="badge duplicate">↻ Duplicate</span>`
    );
  } else if (
    coin.status ===
    "missing"
  ) {
    badges.push(
      `<span class="badge missing">○ Missing</span>`
    );
  } else {
    badges.push(
      `<span class="badge collection">✓ In collection</span>`
    );
  }

  if (
    coin.duplicates > 0 &&
    coin.status !==
      "duplicate"
  ) {
    badges.push(
      `<span class="badge duplicate">↻ Duplicate ×${coin.duplicates}</span>`
    );
  }

  if (
    coin.wanted
  ) {
    badges.push(
      `<span class="badge wanted">Wanted</span>`
    );
  }

  return badges.join("");
}


function imageMarkup(
  coin,
  modal = false
) {
  if (
    coin.image
  ) {
    const extraClass =
      modal
        ? ' class="modal-coin-image"'
        : "";

    const alt =
      `${coin.country} ` +
      `${coin.year} ` +
      `${coin.denomination}`;

    return `
      <img${extraClass}
        src="${escapeHtml(
          coin.image
        )}"
        alt="${escapeHtml(
          alt
        )}"
        loading="lazy">
    `;
  }

  return `
    <div class="coin-placeholder">
      ${escapeHtml(
        coin.denomination
      )}
    </div>
  `;
}


function renderCards(coins) {
  if (
    !coins.length
  ) {
    els.grid.innerHTML =
      `<div class="empty-state">No coins match the selected filters.</div>`;

    return;
  }

  els.grid.innerHTML =
    coins
      .map(
        coin => `
          <article class="coin-card">

            <button
              class="coin-image coin-open"
              type="button"
              data-coin-index="${state.coins.indexOf(
                coin
              )}"
              aria-label="Open details for ${escapeHtml(
                coin.name ||
                `${coin.denomination} ${coin.country}`
              )}"
            >
              ${imageMarkup(
                coin
              )}
            </button>

            <div class="coin-content">

              <div class="coin-topline">
                <span>
                  ${flagEmoji(
                    coin.countryCode
                  )}
                  ${escapeHtml(
                    coin.country
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    coin.year
                  )}
                </span>
              </div>

              <h3 class="coin-title">
                ${escapeHtml(
                  coin.name ||
                  `${coin.denomination} ${coin.country}`
                )}
              </h3>

              <div class="coin-meta">
                ${escapeHtml(
                  coin.denomination
                )}

                ·

                ${escapeHtml(
                  coin.type
                )}

                ${
                  coin.mint
                    ? ` · Mint ${escapeHtml(
                        coin.mint
                      )}`
                    : ""
                }
              </div>

              ${
                coin.description
                  ? `<p class="coin-preview">${escapeHtml(
                      coin.description
                    )}</p>`
                  : ""
              }

              <div class="badges">
                ${statusBadges(
                  coin
                )}
              </div>

            </div>
          </article>
        `
      )
      .join("");

  document
    .querySelectorAll(
      ".coin-open"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const coin =
              state.coins[
                Number(
                  button.dataset
                    .coinIndex
                )
              ];

            if (
              !coin
            ) {
              return;
            }

            openCoinModal(
              coin
            );
          }
        );
      }
    );
}


const tableSortColumns = [
  "country",
  "year",
  "denomination",
  "type",
  "name",
  "condition",
  "status",
  "duplicates"
];


function updateTableSortHeaders() {
  const headers =
    els.tableWrap
      .querySelectorAll(
        "thead th"
      );

  headers.forEach(
    (
      header,
      index
    ) => {
      const key =
        tableSortColumns[
          index
        ];

      if (
        !key
      ) {
        return;
      }

      if (
        !header.dataset
          .originalLabel
      ) {
        header.dataset
          .originalLabel =
          header.textContent
            .trim();
      }

      const label =
        header.dataset
          .originalLabel;

      let arrow = "";

      if (
        state.tableSort ===
        `${key}-asc`
      ) {
        arrow =
          " ↑";
      }

      if (
        state.tableSort ===
        `${key}-desc`
      ) {
        arrow =
          " ↓";
      }

      header.textContent =
        `${label}${arrow}`;
    }
  );
}


function bindTableSorting() {
  const headers =
    els.tableWrap
      .querySelectorAll(
        "thead th"
      );

  headers.forEach(
    (
      header,
      index
    ) => {
      const key =
        tableSortColumns[
          index
        ];

      if (
        !key
      ) {
        return;
      }

      header.style.cursor =
        "pointer";

      header.style.userSelect =
        "none";

      header.setAttribute(
        "role",
        "button"
      );

      header.setAttribute(
        "tabindex",
        "0"
      );

      header.setAttribute(
        "title",
        "Click to sort"
      );

      function sortColumn() {
        const asc =
          `${key}-asc`;

        const desc =
          `${key}-desc`;

        state.tableSort =
          state.tableSort ===
            asc
            ? desc
            : asc;

        localStorage.setItem(
          "coinTableSort",
          state.tableSort
        );

        state.page =
          1;

        render();
      }

      header.addEventListener(
        "click",
        sortColumn
      );

      header.addEventListener(
        "keydown",
        event => {
          if (
            event.key ===
              "Enter" ||
            event.key ===
              " "
          ) {
            event.preventDefault();

            sortColumn();
          }
        }
      );
    }
  );

  updateTableSortHeaders();
}


function renderTable(coins) {
  els.tableBody.innerHTML =
    coins
      .map(
        coin => {
          let status =
            "In collection";

          if (
            coin.status ===
            "missing"
          ) {
            status =
              "Missing";
          }

          if (
            coin.status ===
            "duplicate"
          ) {
            status =
              "Duplicate";
          }

          const coinIndex =
            state.coins.indexOf(
              coin
            );

          return `
            <tr
              class="coin-table-row"
              data-coin-index="${coinIndex}"
              tabindex="0"
              role="button"
              aria-label="Open details for ${escapeHtml(
                coin.name ||
                `${coin.denomination} ${coin.country}`
              )}"
            >
              <td>
                ${flagEmoji(
                  coin.countryCode
                )}
                ${escapeHtml(
                  coin.country
                )}
              </td>

              <td>
                ${escapeHtml(
                  coin.year
                )}
              </td>

              <td>
                ${escapeHtml(
                  coin.denomination
                )}
              </td>

              <td>
                ${escapeHtml(
                  coin.type
                )}
              </td>

              <td>
                ${escapeHtml(
                  coin.name ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  coin.condition ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  status
                )}
              </td>

              <td>
                ${coin.duplicates || 0}
              </td>
            </tr>
          `;
        }
      )
      .join("");

  els.tableBody
    .querySelectorAll(
      ".coin-table-row"
    )
    .forEach(
      row => {
        function openRowCoin() {
          const coinIndex =
            Number(
              row.dataset
                .coinIndex
            );

          const coin =
            state.coins[
              coinIndex
            ];

          if (
            !coin
          ) {
            return;
          }

          openCoinModal(
            coin
          );
        }

        row.addEventListener(
          "click",
          openRowCoin
        );

        row.addEventListener(
          "keydown",
          event => {
            if (
              event.key ===
                "Enter" ||
              event.key ===
                " "
            ) {
              event.preventDefault();

              openRowCoin();
            }
          }
        );
      }
    );
}


function renderStats() {
  if (
    !els.stats
  ) {
    return;
  }

  const collection =
    state.coins.filter(
      coin =>
        coin.status ===
        "collection"
    ).length;

  const regular =
    state.coins.filter(
      coin =>
        coin.status ===
          "collection" &&
        coin.type ===
          "Regular"
    ).length;

  const commemorative =
    state.coins.filter(
      coin =>
        coin.status ===
          "collection" &&
        coin.type ===
          "Commemorative"
    ).length;

  const missing =
    state.coins.filter(
      coin =>
        coin.status ===
        "missing"
    ).length;

  const duplicates =
    state.coins.filter(
      coin =>
        coin.status ===
        "duplicate"
    ).length;

  const cards = [
    {
      label:
        "My Collection",

      value:
        collection,

      section:
        "collection"
    },

    {
      label:
        "Regular €",

      value:
        regular,

      section:
        "regular"
    },

    {
      label:
        "2€ Commemorative",

      value:
        commemorative,

      section:
        "commemorative"
    },

    {
      label:
        "Missing",

      value:
        missing,

      section:
        "missing"
    },

    {
      label:
        "Duplicates",

      value:
        duplicates,

      section:
        "duplicates"
    }
  ];

  els.stats.innerHTML =
    cards
      .map(
        card => `
          <div
            class="stat-card"
            data-stat-section="${card.section}"
            role="button"
            tabindex="0"
            style="cursor: pointer;"
          >
            <div class="stat-label">
              ${escapeHtml(
                card.label
              )}
            </div>

            <div class="stat-value">
              ${card.value}
            </div>
          </div>
        `
      )
      .join("");

  els.stats
    .querySelectorAll(
      "[data-stat-section]"
    )
    .forEach(
      card => {
        function openSection() {
          state.section =
            card.dataset
              .statSection;

          localStorage.setItem(
            "coinSection",
            state.section
          );

          state.page =
            1;

          updateActiveNav();

          render();

          window.scrollTo({
            top:
              els.sectionTitle
                .getBoundingClientRect()
                .top +
              window.scrollY -
                20,

            behavior:
              "smooth"
          });
        }

        card.addEventListener(
          "click",
          openSection
        );

        card.addEventListener(
          "keydown",
          event => {
            if (
              event.key ===
                "Enter" ||
              event.key ===
                " "
            ) {
              event.preventDefault();

              openSection();
            }
          }
        );
      }
    );
}


function openCoinModal(coin) {
  const dialog =
    els.modal.querySelector(
      ".modal-dialog"
    );

  if (
    !dialog
  ) {
    return;
  }

  dialog.classList.remove(
    "image-viewer"
  );

  viewerController =
    null;

  els.modalImagePanel.innerHTML =
    imageMarkup(
      coin,
      true
    );

  els.modalCountry.textContent =
    `${flagEmoji(
      coin.countryCode
    )} ${coin.country}`;

  els.modalTitle.textContent =
    coin.name ||
    `${coin.denomination} ${coin.country}`;

  const subtitleParts = [];

  if (
    coin.year !== "" &&
    coin.year !== null &&
    coin.year !== undefined
  ) {
    subtitleParts.push(
      coin.year
    );
  }

  if (
    coin.denomination
  ) {
    subtitleParts.push(
      coin.denomination
    );
  }

  if (
    coin.type
  ) {
    subtitleParts.push(
      coin.type
    );
  }

  els.modalSubtitle.textContent =
    subtitleParts.join(
      " · "
    );

  els.modalBadges.innerHTML =
    statusBadges(
      coin
    );

  const facts = [
    [
      "Country",
      coin.country
    ],

    [
      "Year",
      coin.year
    ],

    [
      "Denomination",
      coin.denomination
    ],

    [
      "Type",
      coin.type
    ],

    [
      "Condition",
      coin.condition
    ],

    [
      "Mint",
      coin.mint
    ],

    [
      "Mintage",
      coin.mintage
    ],

    [
      "Metal",
      coin.metal
    ],

    [
      "Weight",
      coin.weight
    ],

    [
      "Diameter",
      coin.diameter
    ]
  ].filter(
    ([, value]) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );

  els.modalFacts.innerHTML =
    facts
      .map(
        ([
          label,
          value
        ]) => `
          <div class="fact">
            <div class="fact-label">
              ${escapeHtml(
                label
              )}
            </div>

            <div class="fact-value">
              ${escapeHtml(
                value
              )}
            </div>
          </div>
        `
      )
      .join("");

  if (
    coin.description
  ) {
    els.modalDescription.textContent =
      coin.description;

    els.descriptionSection
      .classList
      .remove(
        "hidden"
      );
  } else {
    els.descriptionSection
      .classList
      .add(
        "hidden"
      );
  }

  if (
    coin.notes
  ) {
    els.modalNotes.textContent =
      coin.notes;

    els.notesSection
      .classList
      .remove(
        "hidden"
      );
  } else {
    els.notesSection
      .classList
      .add(
        "hidden"
      );
  }

  els.modal.classList.remove(
    "hidden"
  );

  els.modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-open"
  );

  const image =
    els.modalImagePanel
      .querySelector(
        "img"
      );

  if (
    !image
  ) {
    return;
  }

  let viewerOpen =
    false;

  let scale =
    1;

  let posX =
    0;

  let posY =
    0;

  let dragging =
    false;

  let moved =
    false;

  let startX =
    0;

  let startY =
    0;

  let startPosX =
    0;

  let startPosY =
    0;

  const pointers =
    new Map();

  let pinchStartDistance =
    0;

  let pinchStartScale =
    1;


  function applyTransform() {
    image.style.transform =
      `translate3d(${posX}px, ${posY}px, 0) scale(${scale})`;
  }


  function resetTransform() {
    scale =
      1;

    posX =
      0;

    posY =
      0;

    dragging =
      false;

    moved =
      false;

    pointers.clear();

    image.style.transform =
      "";

    image.classList.remove(
      "dragging"
    );
  }


  function initialScale() {
    if (
      window.innerWidth <=
      560
    ) {
      return 1.8;
    }

    if (
      window.innerWidth <=
      900
    ) {
      return 2;
    }

    return 2.2;
  }


  function openViewer() {
    viewerOpen =
      true;

    dialog.classList.add(
      "image-viewer"
    );

    scale =
      initialScale();

    posX =
      0;

    posY =
      0;

    applyTransform();
  }


  function closeViewer() {
    viewerOpen =
      false;

    dialog.classList.remove(
      "image-viewer"
    );

    resetTransform();
  }


  function pointerDistance() {
    const points =
      [
        ...pointers.values()
      ];

    if (
      points.length < 2
    ) {
      return 0;
    }

    return Math.hypot(
      points[0].x -
      points[1].x,

      points[0].y -
      points[1].y
    );
  }


  image.addEventListener(
    "click",
    () => {
      if (
        moved
      ) {
        moved =
          false;

        return;
      }

      if (
        !viewerOpen
      ) {
        openViewer();

        return;
      }

      closeViewer();
    }
  );


  image.addEventListener(
    "pointerdown",
    event => {
      if (
        !viewerOpen
      ) {
        return;
      }

      pointers.set(
        event.pointerId,
        {
          x:
            event.clientX,

          y:
            event.clientY
        }
      );

      try {
        image.setPointerCapture(
          event.pointerId
        );
      } catch (_) {}

      if (
        pointers.size === 2
      ) {
        pinchStartDistance =
          pointerDistance();

        pinchStartScale =
          scale;

        dragging =
          false;

        image.classList.remove(
          "dragging"
        );

        return;
      }

      if (
        scale > 1
      ) {
        dragging =
          true;

        moved =
          false;

        startX =
          event.clientX;

        startY =
          event.clientY;

        startPosX =
          posX;

        startPosY =
          posY;

        image.classList.add(
          "dragging"
        );
      }
    }
  );


  image.addEventListener(
    "pointermove",
    event => {
      if (
        !pointers.has(
          event.pointerId
        )
      ) {
        return;
      }

      pointers.set(
        event.pointerId,
        {
          x:
            event.clientX,

          y:
            event.clientY
        }
      );

      if (
        pointers.size === 2
      ) {
        const distance =
          pointerDistance();

        if (
          pinchStartDistance >
          0
        ) {
          scale =
            pinchStartScale *
            (
              distance /
              pinchStartDistance
            );

          scale =
            Math.min(
              4,
              Math.max(
                1,
                scale
              )
            );

          if (
            scale === 1
          ) {
            posX =
              0;

            posY =
              0;
          }

          moved =
            true;

          applyTransform();
        }

        return;
      }

      if (
        !dragging ||
        scale <= 1
      ) {
        return;
      }

      const dx =
        event.clientX -
        startX;

      const dy =
        event.clientY -
        startY;

      if (
        Math.abs(dx) >
          4 ||
        Math.abs(dy) >
          4
      ) {
        moved =
          true;
      }

      posX =
        startPosX +
        dx;

      posY =
        startPosY +
        dy;

      applyTransform();
    }
  );


  function stopPointer(
    event
  ) {
    pointers.delete(
      event.pointerId
    );

    dragging =
      false;

    image.classList.remove(
      "dragging"
    );

    try {
      if (
        image.hasPointerCapture(
          event.pointerId
        )
      ) {
        image.releasePointerCapture(
          event.pointerId
        );
      }
    } catch (_) {}

    if (
      pointers.size < 2
    ) {
      pinchStartDistance =
        0;
    }
  }


  image.addEventListener(
    "pointerup",
    stopPointer
  );

  image.addEventListener(
    "pointercancel",
    stopPointer
  );

  viewerController = {
    isOpen() {
      return viewerOpen;
    },

    close() {
      closeViewer();
    }
  };
}


function closeCoinModal() {
  if (
    viewerController &&
    viewerController.isOpen()
  ) {
    viewerController.close();

    return;
  }

  const dialog =
    els.modal.querySelector(
      ".modal-dialog"
    );

  if (
    dialog
  ) {
    dialog.classList.remove(
      "image-viewer"
    );
  }

  viewerController =
    null;

  els.modal.classList.add(
    "hidden"
  );

  els.modal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "modal-open"
  );
}


function render() {
  const coins =
    getFilteredCoins();

  const perPage =
    getCoinsPerPage();

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        coins.length /
        perPage
      )
    );

  if (
    state.page >
    totalPages
  ) {
    state.page =
      totalPages;
  }

  const start =
    (
      state.page -
      1
    ) *
    perPage;

  const end =
    start +
    perPage;

  const pageCoins =
    coins.slice(
      start,
      end
    );

  els.sectionTitle.textContent =
    sectionTitles[
      state.section
    ] ||
    "All Coins";

  els.resultCount.textContent =
    `${coins.length} coin${
      coins.length === 1
        ? ""
        : "s"
    }`;

  renderCards(
    pageCoins
  );

  renderTable(
    pageCoins
  );

  updateTableSortHeaders();

  renderPagination(
    coins.length
  );
}


function updateActiveNav() {
  /*
   * My Collection is opened from
   * a statistics card, not from
   * the main navigation.
   *
   * Therefore Home remains highlighted.
   */
  const activeSection =
    state.section ===
      "collection"
      ? "home"
      : state.section;

  document
    .querySelectorAll(
      ".nav-link"
    )
    .forEach(
      button => {
        button.classList.toggle(
          "active",
          button.dataset
            .section ===
            activeSection
        );
      }
    );
}


function bindEvents() {
  [
    els.country,
    els.year,
    els.denomination,
    els.condition
  ].forEach(
    el => {
      el.addEventListener(
        "change",
        () => {
          state.page =
            1;

          render();
        }
      );
    }
  );


  els.sort.addEventListener(
    "change",
    () => {
      state.sort =
        els.sort.value;

      /*
       * Dropdown sorting takes
       * control again.
       */
      state.tableSort =
        "";

      localStorage.removeItem(
        "coinTableSort"
      );

      localStorage.setItem(
        "coinSort",
        state.sort
      );

      state.page =
        1;

      render();
    }
  );


  els.search.addEventListener(
    "input",
    () => {
      state.page =
        1;

      render();
    }
  );


  document
    .querySelectorAll(
      ".nav-link"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            state.section =
              button.dataset
                .section;

            localStorage.setItem(
              "coinSection",
              state.section
            );

            state.page =
              1;

            updateActiveNav();

            render();
          }
        );
      }
    );


  els.themeToggle.addEventListener(
    "click",
    () => {
      setTheme(
        state.theme ===
          "light"
          ? "dark"
          : "light"
      );
    }
  );


  els.viewToggle.addEventListener(
    "click",
    () => {
      setView(
        state.view ===
          "cards"
          ? "table"
          : "cards"
      );

      state.page =
        1;

      render();
    }
  );


  document
    .querySelectorAll(
      "[data-close-modal]"
    )
    .forEach(
      el => {
        el.addEventListener(
          "click",
          closeCoinModal
        );
      }
    );


  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key !==
          "Escape" ||
        els.modal
          .classList
          .contains(
            "hidden"
          )
      ) {
        return;
      }

      closeCoinModal();
    }
  );


  window.addEventListener(
    "resize",
    () => {
      state.page =
        1;

      render();
    }
  );
}


async function init() {
  /*
   * Protect against old values
   * such as:
   *
   * statistics
   * all
   */
  const validSections = [
    "home",
    "collection",
    "regular",
    "commemorative",
    "missing",
    "duplicates"
  ];

  if (
    !validSections.includes(
      state.section
    )
  ) {
    state.section =
      "home";

    localStorage.setItem(
      "coinSection",
      state.section
    );
  }


  setTheme(
    state.theme
  );

  setView(
    state.view
  );


  const validSorts = [
    "country-asc",
    "country-desc",
    "added-desc",
    "added-asc",
    "year-desc",
    "year-asc",
    "denomination-asc",
    "denomination-desc"
  ];

  if (
    !validSorts.includes(
      state.sort
    )
  ) {
    state.sort =
      "country-asc";

    localStorage.setItem(
      "coinSort",
      state.sort
    );
  }


  const validTableSorts =
    tableSortColumns.flatMap(
      key => [
        `${key}-asc`,
        `${key}-desc`
      ]
    );

  if (
    state.tableSort &&
    !validTableSorts.includes(
      state.tableSort
    )
  ) {
    state.tableSort =
      "";

    localStorage.removeItem(
      "coinTableSort"
    );
  }


  els.sort.value =
    state.sort;

  updateActiveNav();

  bindEvents();

  bindTableSorting();


  try {
    const response =
      await fetch(
        "data/coins.json?v=6"
      );

    if (
      !response.ok
    ) {
      throw new Error(
        "Could not load coins.json"
      );
    }

    state.coins =
      await response.json();

    populateFilters();

    renderStats();

    render();

  } catch (
    error
  ) {
    els.grid.innerHTML = `
      <div class="empty-state">
        Could not load coin data.
        ${escapeHtml(
          error.message
        )}
      </div>
    `;

    console.error(
      error
    );
  }
}


init();
