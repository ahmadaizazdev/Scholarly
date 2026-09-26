/* =========================================================
   Scholarship Research Database
   app.js — application state, routing, and view assembly

   This file wires data.js (shape), storage.js (persistence)
   and ui.js (rendering primitives) together. It is the only
   file that knows what a "region" or "scholarship" means in
   terms of user-facing screens.
   ========================================================= */

let db = loadData();
let currentView = "dashboard";
let viewParams = {};
const listState = {}; // per-type { search, filters }

/* Quick Add — lets the user create any kind of record from one
   place (the dashboard panel, or the sidebar button/modal from
   anywhere) instead of opening each section separately. */
let quickAddType = "regions";      // last-used type in the dashboard panel
let sidebarQuickAddType = "regions"; // last-used type in the sidebar modal

const VIEW_META = {
  dashboard:    { title: "Dashboard",       subtitle: "An overview of everything you've documented so far." },
  regions:      { title: "Regions",         subtitle: "The highest-level grouping for your research." },
  countries:    { title: "Countries",       subtitle: "Every country you're researching, grouped by region." },
  universities: { title: "Universities",    subtitle: "Institutions you're tracking, grouped by country." },
  programmes:   { title: "Programmes",      subtitle: "Degree programmes offered at each university." },
  scholarships: { title: "Scholarships",    subtitle: "Funding opportunities tied to programmes." },
  applications: { title: "Applications",    subtitle: "Your eligibility and application status per opportunity." },
  notes:        { title: "Research Notes",  subtitle: "Freeform notes linked to your research." },
  calendar:     { title: "Calendar",        subtitle: "Deadlines and personal preparation tasks." },
  settings:     { title: "Settings",        subtitle: "Backup, restore, and reset your database." }
};

const NAV_TYPES = ["regions", "countries", "universities", "programmes", "scholarships", "notes"];

/* ---------------------------------------------------------
   Routing
   --------------------------------------------------------- */

function go(view, params) {
  currentView = view;
  viewParams = params || {};
  updateHeader();
  updateNavHighlight();
  renderView();
  closeMobileNav();
  window.scrollTo(0, 0);
}

function renderView() {
  replaceBody(buildViewContent());
}

function replaceBody(contentEl) {
  const active = document.activeElement;
  const wasSearchFocused = active && active.classList && active.classList.contains("list-search");
  const cursorPos = wasSearchFocused ? active.selectionStart : null;

  const body = document.getElementById("viewBody");
  body.innerHTML = "";
  body.appendChild(contentEl);

  if (wasSearchFocused) {
    const newInput = body.querySelector(".list-search");
    if (newInput) {
      newInput.focus();
      if (cursorPos !== null) newInput.setSelectionRange(cursorPos, cursorPos);
    }
  }
}

function updateHeader() {
  const titleEl = document.getElementById("viewTitle");
  const subtitleEl = document.getElementById("viewSubtitle");

  if (VIEW_META[currentView]) {
    titleEl.textContent = VIEW_META[currentView].title;
    subtitleEl.textContent = VIEW_META[currentView].subtitle;
    return;
  }
  if (currentView === "detail") {
    const record = getRecord(db, viewParams.type, viewParams.id);
    titleEl.textContent = record ? (record.name || record.title) : "Not found";
    subtitleEl.textContent = ENTITY_META[viewParams.type].label;
    return;
  }
  if (currentView === "scholarship-detail") {
    const record = getRecord(db, "scholarships", viewParams.id);
    titleEl.textContent = record ? record.name : "Not found";
    subtitleEl.textContent = "Scholarship";
    return;
  }
  if (currentView === "search-results") {
    titleEl.textContent = "Search";
    subtitleEl.textContent = viewParams.query ? "Results for \u201c" + viewParams.query + "\u201d" : "Search across your whole database.";
  }
}

function updateNavHighlight() {
  let key = currentView;
  if (currentView === "detail") key = viewParams.type;
  if (currentView === "scholarship-detail") key = "scholarships";
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.view === key);
  });
}

function buildViewContent() {
  if (NAV_TYPES.includes(currentView)) return buildEntityListView(currentView);

  switch (currentView) {
    case "dashboard": return buildDashboard();
    case "applications": return buildApplicationsView();
    case "calendar": return buildCalendarView();
    case "settings": return buildSettingsView();
    case "detail": return buildDetailView(viewParams.type, viewParams.id);
    case "scholarship-detail": return buildScholarshipDetail(viewParams.id);
    case "search-results": return buildSearchResultsView(viewParams.query || "");
    default: return buildPlaceholder(currentView);
  }
}

function buildPlaceholder(title) {
  const panel = el("div", { class: "placeholder-panel" }, [
    el("h2", null, [title + " isn't available"]),
    el("p", null, ["Nothing is wired up for this view."])
  ]);
  return panel;
}

function openDetail(type, id) {
  if (type === "scholarships") go("scholarship-detail", { id });
  else go("detail", { type, id });
}

/* ---------------------------------------------------------
   Dashboard
   --------------------------------------------------------- */

function buildDashboard() {
  const grid = el("div", { class: "dashboard-grid" }, []);

  grid.appendChild(buildStatCards());

  grid.appendChild(el("div", { class: "dashboard-columns" }, [
    buildAddedOverTimePanel(),
    buildFundingBreakdownPanel()
  ]));

  grid.appendChild(el("div", { class: "dashboard-row-3" }, [
    buildDeadlinesPanel(),
    buildCountryRankingPanel()
  ]));

  grid.appendChild(el("div", { class: "dashboard-columns" }, [
    buildRecentPanel(),
    buildProgressPanel()
  ]));

  grid.appendChild(buildQuickAddPanel());

  return grid;
}

/* icons are plain inline SVG paths so the stat cards don't need
   any icon font or asset file — keeps this a single offline app */
const STAT_ICONS = {
  regions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 4 5.8 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.8-4-9s1.5-6.4 4-9z"/></svg>',
  countries: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  universities: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/></svg>',
  programmes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M8 8h7M8 12h7"/></svg>',
  scholarships: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="5"/><path d="m8.5 12.5-2 8 5.5-3 5.5 3-2-8"/></svg>',
  funded: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9 12.5 11 15l4.5-5.5"/></svg>'
};

function statIcon(key) {
  return el("span", { class: "stat-card-icon", html: STAT_ICONS[key] || "" }, []);
}

/* Records created within the last N days, used for the little
   "+N this month" trend line on each stat card. */
function countRecentlyAdded(records, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return records.filter(r => r.createdAt && new Date(r.createdAt).getTime() >= cutoff).length;
}

function buildTrendTag(count) {
  if (count > 0) {
    return el("span", { class: "stat-trend is-up" }, ["\u2191 +" + count + " / 30d"]);
  }
  return el("span", { class: "stat-trend is-flat" }, ["No change / 30d"]);
}

function buildStatCards() {
  const fullyFundedCount = db.scholarships.filter(s => s.fundingStatus === "Fully Funded").length;

  const stats = [
    { key: "regions", label: "Regions", value: db.regions.length, recent: countRecentlyAdded(db.regions, 30) },
    { key: "countries", label: "Countries", value: db.countries.length, recent: countRecentlyAdded(db.countries, 30) },
    { key: "universities", label: "Universities", value: db.universities.length, recent: countRecentlyAdded(db.universities, 30) },
    { key: "programmes", label: "Programmes", value: db.programmes.length, recent: countRecentlyAdded(db.programmes, 30) },
    { key: "scholarships", label: "Scholarships", value: db.scholarships.length, recent: countRecentlyAdded(db.scholarships, 30) },
    { key: "funded", label: "Fully funded", value: fullyFundedCount, recent: countRecentlyAdded(db.scholarships.filter(s => s.fundingStatus === "Fully Funded"), 30) }
  ];

  const grid = el("div", { class: "stat-cards" }, []);
  stats.forEach(stat => {
    grid.appendChild(el("div", { class: "stat-card" }, [
      el("div", { class: "stat-card-top" }, [statIcon(stat.key), el("span", null, [stat.label])]),
      el("div", { class: "stat-card-bottom" }, [
        el("div", { class: "stat-value" }, [String(stat.value)]),
        buildTrendTag(stat.recent)
      ])
    ]));
  });
  return grid;
}

/* ---- Bar chart: scholarships documented per month, last 6 months,
   split into "All" vs "Fully funded" so the two-tone bars mean
   something (not just decoration) ---- */

function buildAddedOverTimePanel() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: d.getFullYear() + "-" + d.getMonth(), label: d.toLocaleDateString(undefined, { month: "short" }) });
  }
  const allValues = months.map(() => 0);
  const fundedValues = months.map(() => 0);

  db.scholarships.forEach(s => {
    if (!s.createdAt) return;
    const d = new Date(s.createdAt);
    const key = d.getFullYear() + "-" + d.getMonth();
    const idx = months.findIndex(m => m.key === key);
    if (idx === -1) return;
    allValues[idx]++;
    if (s.fundingStatus === "Fully Funded") fundedValues[idx]++;
  });

  const series = [
    { name: "All scholarships", color: "#7c5cfc", values: allValues },
    { name: "Fully funded", color: "#14b8a6", values: fundedValues }
  ];

  const panel = el("div", { class: "panel" }, [
    el("div", { class: "panel-header" }, [
      el("h2", null, ["Scholarships Documented"]),
      el("span", { class: "chart-legend" }, series.map(s => el("span", { class: "chart-legend-item" }, [
        el("span", { class: "chart-legend-dot", style: "background:" + s.color }, []),
        s.name
      ])))
    ])
  ]);
  panel.appendChild(buildBarChart(months.map(m => m.label), series));
  return panel;
}

/* ---- Donut: scholarships grouped by funding status ---- */

function buildFundingBreakdownPanel() {
  const counts = {};
  db.scholarships.forEach(s => {
    const key = s.fundingStatus || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  });
  const segments = Object.keys(counts).map((label, i) => ({
    label, value: counts[label], color: CHART_PALETTE[i % CHART_PALETTE.length]
  })).sort((a, b) => b.value - a.value);

  const panel = el("div", { class: "panel" }, [
    el("div", { class: "panel-header" }, [el("h2", null, ["Funding Status"])])
  ]);

  const body = el("div", { class: "donut-panel-body" }, []);
  if (!segments.length) {
    body.appendChild(emptyState("No scholarships yet", "Once you add scholarships, their funding status breaks down here."));
  } else {
    body.appendChild(buildDonutChart(segments));
    body.appendChild(buildDonutLegend(segments));
  }
  panel.appendChild(body);
  return panel;
}

/* ---- Ranked list: countries by number of scholarships tracked ---- */

function buildCountryRankingPanel() {
  const counts = {};
  db.scholarships.forEach(s => {
    const country = getRecord(db, "countries", s.countryId);
    const label = country ? country.name : "Unassigned";
    counts[label] = (counts[label] || 0) + 1;
  });
  const rows = Object.keys(counts)
    .map((label, i) => ({ label, value: counts[label] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  const panel = el("div", { class: "panel" }, [
    el("div", { class: "panel-header" }, [
      el("h2", null, ["Scholarships by Country"]),
      el("span", { class: "panel-count" }, [String(rows.length)])
    ])
  ]);

  if (!rows.length) {
    panel.appendChild(el("div", { class: "panel-body" }, [
      emptyState("No scholarships yet", "Assign a country to a scholarship and this ranking fills in automatically.")
    ]));
    return panel;
  }

  const list = el("ul", { class: "ranked-list" }, []);
  rows.forEach((row, i) => {
    const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
    list.appendChild(el("li", { class: "ranked-row" }, [
      el("span", { class: "ranked-label" }, [row.label]),
      el("span", { class: "ranked-pct" }, [pct + "%"])
    ]));
  });
  panel.appendChild(list);
  return panel;
}

function collectUpcomingDeadlines() {
  const items = [];
  db.scholarships.forEach(s => {
    if (s.applicationDeadline) {
      items.push({
        name: s.name, date: s.applicationDeadline, kind: "Scholarship",
        meta: relatedLabel(s), onClick: () => openDetail("scholarships", s.id)
      });
    }
  });
  db.programmes.forEach(p => {
    if (p.applicationDeadline) {
      const uni = getRecord(db, "universities", p.universityId);
      items.push({
        name: p.name, date: p.applicationDeadline, kind: "Programme",
        meta: uni ? uni.name : "", onClick: () => openDetail("programmes", p.id)
      });
    }
  });
  db.tasks.forEach(t => {
    if (t.deadline) {
      items.push({
        name: t.task, date: t.deadline, kind: "Task",
        meta: t.status, onClick: () => go("calendar")
      });
    }
  });
  items.sort((a, b) => a.date.localeCompare(b.date));
  return items;
}

function relatedLabel(scholarship) {
  const uni = getRecord(db, "universities", scholarship.universityId);
  const country = getRecord(db, "countries", scholarship.countryId);
  return [uni ? uni.name : null, country ? country.name : null].filter(Boolean).join(", ");
}

function buildDeadlinesPanel() {
  const upcoming = collectUpcomingDeadlines().slice(0, 6);
  const panel = el("div", { class: "panel" }, [
    el("div", { class: "panel-header" }, [
      el("h2", null, ["Upcoming Deadlines"]),
      el("span", { class: "panel-count" }, [String(upcoming.length)])
    ])
  ]);

  const body = el("div", { class: "panel-body" }, []);
  if (!upcoming.length) {
    body.appendChild(emptyState(
      "No deadlines yet",
      "Add an application deadline on a scholarship or programme and it will show up here automatically."
    ));
  } else {
    upcoming.forEach(item => {
      const row = el("div", { class: "deadline-row" }, [
        el("div", null, [
          el("div", { class: "deadline-name" }, [item.name]),
          el("div", { class: "deadline-meta" }, [item.kind + (item.meta ? " \u2014 " + item.meta : "")])
        ]),
        el("div", { class: "deadline-date" }, [formatDate(item.date)])
      ]);
      row.style.cursor = "pointer";
      row.addEventListener("click", item.onClick);
      body.appendChild(row);
    });
  }
  panel.appendChild(body);
  return panel;
}

function buildRecentPanel() {
  const items = [];
  const push = (type, r) => items.push({ type, record: r });
  db.regions.forEach(r => push("regions", r));
  db.countries.forEach(r => push("countries", r));
  db.universities.forEach(r => push("universities", r));
  db.programmes.forEach(r => push("programmes", r));
  db.scholarships.forEach(r => push("scholarships", r));
  db.notes.forEach(r => push("notes", r));
  items.sort((a, b) => (b.record.createdAt || "").localeCompare(a.record.createdAt || ""));
  const recent = items.slice(0, 6);

  const panel = el("div", { class: "panel" }, [
    el("div", { class: "panel-header" }, [
      el("h2", null, ["Recently Added"]),
      el("span", { class: "panel-count" }, [String(recent.length)])
    ])
  ]);

  const body = el("div", { class: "panel-body" }, []);
  if (!recent.length) {
    body.appendChild(emptyState("Nothing added yet", "New records you create will show up here, newest first."));
  } else {
    recent.forEach(item => {
      const label = item.record.name || item.record.title || "Untitled";
      const row = el("div", { class: "deadline-row" }, [
        el("div", null, [
          el("div", { class: "deadline-name" }, [label]),
          el("div", { class: "deadline-meta" }, [ENTITY_META[item.type].label])
        ]),
        el("div", { class: "deadline-date" }, [formatDate(item.record.createdAt, true)])
      ]);
      row.style.cursor = "pointer";
      row.addEventListener("click", () => openDetail(item.type, item.record.id));
      body.appendChild(row);
    });
  }
  panel.appendChild(body);
  return panel;
}

function buildProgressPanel() {
  const statuses = ["Researching", "Preparing", "Ready to Apply", "Applied"];
  const panel = el("div", { class: "panel progress-panel" }, [
    el("div", { class: "panel-header" }, [el("h2", null, ["Research Progress"])])
  ]);
  const body = el("div", { class: "panel-body" }, []);
  statuses.forEach(status => {
    const count = db.scholarships.filter(s => s.applicationStatus === status).length;
    body.appendChild(el("div", { class: "progress-item" }, [
      el("div", { class: "progress-value" }, [String(count)]),
      el("div", { class: "progress-label" }, [status])
    ]));
  });
  panel.appendChild(body);
  return panel;
}

function formatDate(iso, withYear) {
  if (!iso) return "\u2014";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ---------------------------------------------------------
   Generic entity list views (regions, countries, universities,
   programmes, scholarships, notes)
   --------------------------------------------------------- */

function buildFilterDefsFor(type) {
  if (type === "scholarships") {
    return [
      { key: "fundingStatus", label: "Funding", options: ENUMS.fundingStatus },
      { key: "applicationStatus", label: "Status", options: ENUMS.applicationStatus },
      { key: "pakistani.eligible", label: "PK eligible", options: ENUMS.pakistaniEligible }
    ];
  }
  if (type === "countries") return [{ key: "priority", label: "Priority", options: ENUMS.countryPriority }];
  if (type === "programmes") return [{ key: "degreeLevel", label: "Degree", options: ENUMS.degreeLevel }];
  return [];
}

function buildEntityListView(type) {
  listState[type] = listState[type] || { search: "", filters: {} };
  const state = listState[type];
  const meta = ENTITY_META[type];

  let records = getAll(db, type);

  if (state.search) {
    const q = state.search.toLowerCase();
    records = records.filter(r => meta.searchFields.some(f => String(getPath(r, f) || "").toLowerCase().includes(q)));
  }
  Object.keys(state.filters).forEach(key => {
    const val = state.filters[key];
    if (!val) return;
    records = records.filter(r => {
      const fieldVal = getPath(r, key);
      return Array.isArray(fieldVal) ? fieldVal.includes(val) : fieldVal === val;
    });
  });

  records = records.slice().sort((a, b) => String(a.name || a.title || "").localeCompare(String(b.name || b.title || "")));

  return buildListView(type, db, records, {
    onSearch: val => { state.search = val; renderView(); },
    onFilter: (key, val) => { state.filters[key] = val; renderView(); },
    onAdd: () => openAddModal(type),
    onEdit: id => openEditModal(type, id),
    onDelete: id => confirmDeleteRecord(type, id),
    onView: id => openDetail(type, id),
    filters: buildFilterDefsFor(type)
  });
}

/* Creates a record, filling in the extra sub-structures a
   scholarship needs (requirements/documents/eligibility) that
   the generic form doesn't cover. Shared by every add path:
   per-section "+ Add", child-section "+ Add" (with prefill),
   the dashboard Quick Add panel, and the sidebar Quick Add modal. */
function createEntityRecord(type, data) {
  if (type === "scholarships") {
    data.requirements = emptyRequirements();
    data.documents = defaultDocuments();
    data.myEligibility = emptyEligibility();
    data.applicationStatus = "Researching";
  }
  return createRecord(db, type, data);
}

function openAddModal(type, prefill) {
  const meta = ENTITY_META[type];
  const form = buildForm(type, db, prefill || null, data => {
    createEntityRecord(type, data);
    closeModal();
    toast(meta.label + " added.");
    renderView();
  });
  openModal("Add " + meta.label, form);
}

/* ---- Quick Add: one unified place to add any record type ---- */

const QUICK_ADD_TYPES = ["regions", "countries", "universities", "programmes", "scholarships", "notes", "tasks"];

function buildTypeTabs(activeType, onSelect) {
  const row = el("div", { class: "quickadd-tabs" }, []);
  QUICK_ADD_TYPES.forEach(type => {
    row.appendChild(el("button", {
      type: "button",
      class: "quickadd-tab" + (type === activeType ? " is-active" : ""),
      onClick: () => onSelect(type)
    }, [ENTITY_META[type].label]));
  });
  return row;
}

/* Embedded panel at the top of the Dashboard — add anything
   without leaving the home page. Re-renders the whole dashboard
   on submit, which conveniently leaves a fresh empty form ready
   for the next record (handy for entering a batch in one go). */
function buildQuickAddPanel() {
  const panel = el("div", { class: "detail-section quickadd-panel" }, [
    el("div", { class: "detail-section-header" }, [el("h2", null, ["Quick Add"])])
  ]);

  const body = el("div", { class: "quickadd-body" }, [
    el("p", { class: "quickadd-hint" }, [
      "Add a region, country, university, programme, scholarship, note, or task right here \u2014 no need to open its section first."
    ]),
    buildTypeTabs(quickAddType, type => { quickAddType = type; renderView(); }),
    buildForm(quickAddType, db, null, data => {
      createEntityRecord(quickAddType, data);
      toast(ENTITY_META[quickAddType].label + " added.");
      renderView();
    })
  ]);

  panel.appendChild(body);
  return panel;
}

/* Same idea, reachable from anywhere via the sidebar button,
   for when you're deep in a detail page and don't want to lose
   your place just to add something unrelated. */
function openQuickAddModal(initialType) {
  const type = initialType || sidebarQuickAddType;
  sidebarQuickAddType = type;

  const wrap = el("div", null, [
    el("p", { class: "quickadd-hint" }, [
      "Add a region, country, university, programme, scholarship, note, or task."
    ]),
    buildTypeTabs(type, t => openQuickAddModal(t)),
    buildForm(type, db, null, data => {
      createEntityRecord(type, data);
      closeModal();
      toast(ENTITY_META[type].label + " added.");
      renderView();
    })
  ]);

  openModal("Quick Add", wrap, { wide: true });
}

function openEditModal(type, id) {
  const meta = ENTITY_META[type];
  const record = getRecord(db, type, id);
  if (!record) { toast("That record no longer exists."); return; }
  const form = buildForm(type, db, record, data => {
    updateRecord(db, type, id, data);
    closeModal();
    toast(meta.label + " updated.");
    renderView();
  });
  openModal("Edit " + meta.label, form);
}

function confirmDeleteRecord(type, id) {
  const meta = ENTITY_META[type];
  const record = getRecord(db, type, id);
  if (!record) return;
  const label = record.name || record.title || "this record";
  confirmDialog(
    "Delete \u201c" + label + "\u201d? Linked child records won't be deleted, but they'll lose this reference. This cannot be undone.",
    () => {
      deleteRecord(db, type, id);
      toast(meta.label + " deleted.");
      if (currentView === "detail" || currentView === "scholarship-detail") go(type);
      else renderView();
    }
  );
}

/* ---------------------------------------------------------
   Generic detail view (regions, countries, universities,
   programmes, notes) — fields + linked children
   --------------------------------------------------------- */

function buildDetailView(type, id) {
  const meta = ENTITY_META[type];
  const record = getRecord(db, type, id);
  if (!record) {
    return el("div", { class: "placeholder-panel" }, [
      el("h2", null, ["Not found"]),
      el("p", null, ["This record may have been deleted."])
    ]);
  }

  const wrap = el("div", null, []);

  wrap.appendChild(el("div", { class: "detail-header" }, [
    el("div", null, [
      el("p", { class: "detail-breadcrumb" }, [breadcrumbFor(type, record)]),
    ]),
    el("div", { class: "detail-header-actions" }, [
      el("button", { class: "btn", onClick: () => openEditModal(type, id) }, ["Edit"]),
      el("button", { class: "btn btn-danger", onClick: () => confirmDeleteRecord(type, id) }, ["Delete"])
    ])
  ]));

  const kv = el("div", { class: "detail-section" }, [
    el("div", { class: "detail-section-header" }, [el("h2", null, ["Details"])])
  ]);
  const grid = el("div", { class: "kv-grid" }, []);
  meta.fields.forEach(field => {
    if (field.group) return;
    if (field.type === "textarea" && !getPath(record, field.key)) return;
    grid.appendChild(kvItem(field.label, renderFieldValue(type, field, record)));
  });
  kv.appendChild(grid);
  wrap.appendChild(kv);

  if (type === "notes") {
    wrap.appendChild(el("div", { class: "detail-section" }, [
      el("div", { class: "detail-section-header" }, [el("h2", null, ["Content"])]),
      el("div", { class: "notes-prose", html: renderLiteMarkdown(record.content || "") })
    ]));
  }

  Object.keys(ENTITY_META).forEach(childType => {
    const childMeta = ENTITY_META[childType];
    childMeta.relations.forEach(rel => {
      if (rel.type !== type) return;
      const children = getChildren(db, childType, rel.key, id);
      wrap.appendChild(buildChildSection(childType, rel, id, children));
    });
  });

  return wrap;
}

function breadcrumbFor(type, record) {
  const meta = ENTITY_META[type];
  const parts = [meta.labelPlural];
  const rel = meta.relations[0];
  if (rel) {
    const parent = getRecord(db, rel.type, record[rel.key]);
    if (parent) parts.push(parent.name);
  }
  parts.push(record.name || record.title);
  return parts.join(" \u203a ");
}

function kvItem(label, valueNode) {
  const value = el("p", { class: "kv-value" }, []);
  if (typeof valueNode === "string") value.textContent = valueNode;
  else value.appendChild(valueNode);
  return el("div", { class: "kv-item" }, [
    el("p", { class: "kv-label" }, [label]),
    value
  ]);
}

function renderFieldValue(type, field, record) {
  const value = getPath(record, field.key);
  if (field.type === "select-relation") {
    const target = getRecord(db, field.relation, value);
    if (!target) return "\u2014";
    const link = el("a", { href: "#" }, [target.name]);
    link.addEventListener("click", e => { e.preventDefault(); openDetail(field.relation, target.id); });
    return link;
  }
  if (field.type === "url") {
    if (!value) return "\u2014";
    return el("a", { href: normalizeUrl(value), target: "_blank", rel: "noopener" }, [value]);
  }
  if (field.type === "checkbox") return value ? "Yes" : "No";
  if (field.type === "multiselect") return Array.isArray(value) && value.length ? value.join(", ") : "\u2014";
  if (field.type === "select" && field.options === ENUMS.fundingStatus) {
    return value ? badge(value, fundingStatusVariant(value)) : "\u2014";
  }
  return value || "\u2014";
}

function normalizeUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return "https://" + url;
}

function buildChildSection(childType, rel, parentId, children) {
  const childMeta = ENTITY_META[childType];
  const section = el("div", { class: "detail-section" }, [
    el("div", { class: "detail-section-header" }, [
      el("h2", null, [childMeta.labelPlural]),
      el("button", {
        class: "btn",
        onClick: () => openAddModal(childType, { [rel.key]: parentId })
      }, ["+ Add " + childMeta.label])
    ])
  ]);

  if (!children.length) {
    section.appendChild(emptyState(
      "None yet",
      "No " + childMeta.labelPlural.toLowerCase() + " linked to this record yet."
    ));
    return section;
  }

  const list = el("ul", { class: "linked-list" }, []);
  children.forEach(child => {
    const label = child.name || child.title || child.task;
    const row = el("li", { class: "linked-row" }, [
      el("span", null, [label + (child.demo ? "  " : "")]),
      el("button", { class: "link-btn", onClick: () => openDetail(childType, child.id) }, ["View"])
    ]);
    if (child.demo) row.firstChild.appendChild(badge("DEMO", "muted"));
    list.appendChild(row);
  });
  section.appendChild(list);
  return section;
}

/* ---------------------------------------------------------
   Scholarship detail page (rich, per the spec's section 18)
   --------------------------------------------------------- */

function buildScholarshipDetail(id) {
  const s = getRecord(db, "scholarships", id);
  if (!s) {
    return el("div", { class: "placeholder-panel" }, [
      el("h2", null, ["Not found"]),
      el("p", null, ["This scholarship may have been deleted."])
    ]);
  }

  const university = getRecord(db, "universities", s.universityId);
  const country = getRecord(db, "countries", s.countryId);
  const programme = getRecord(db, "programmes", s.programmeId);

  const wrap = el("div", null, []);

  wrap.appendChild(el("div", { class: "detail-header" }, [
    el("div", null, [
      el("p", { class: "detail-breadcrumb" }, ["Scholarships \u203a " + s.name]),
      el("div", { class: "detail-header-badges" }, [
        badge(s.fundingStatus || "Unknown", fundingStatusVariant(s.fundingStatus)),
        badge(s.applicationStatus || "Researching", statusVariant(s.applicationStatus)),
        s.demo ? badge("DEMO DATA", "muted") : null
      ].filter(Boolean))
    ]),
    el("div", { class: "detail-header-actions" }, [
      el("button", { class: "btn", onClick: () => openEditModal("scholarships", id) }, ["Edit"]),
      el("button", { class: "btn btn-danger", onClick: () => confirmDeleteRecord("scholarships", id) }, ["Delete"])
    ])
  ]));

  // Programme / location
  wrap.appendChild(sectionWithGrid("Programme", null, [
    ["University", university ? linkTo("universities", university) : "\u2014"],
    ["Country", country ? linkTo("countries", country) : "\u2014"],
    ["Programme", programme ? linkTo("programmes", programme) : "\u2014"],
    ["Degree level", programme ? programme.degreeLevel || "\u2014" : "\u2014"],
    ["Duration", programme ? programme.duration || "\u2014" : "\u2014"],
    ["Language", programme ? programme.language || "\u2014" : "\u2014"]
  ]));

  // Funding
  const fundingRows = [
    ["Tuition coverage", s.funding.tuitionCoverage],
    ["Accommodation", s.funding.accommodation],
    ["Health insurance", s.funding.healthInsurance],
    ["Travel allowance", s.funding.travelAllowance],
    ["Visa / relocation support", s.funding.visaRelocation],
    ["Research funding", s.funding.researchFunding]
  ];
  const fundingSection = el("div", { class: "detail-section" }, [
    el("div", { class: "detail-section-header" }, [el("h2", null, ["Funding"])])
  ]);
  const fundingChecklist = el("div", { class: "checklist" }, []);
  fundingRows.forEach(([label, on]) => {
    fundingChecklist.appendChild(el("div", { class: "checklist-row" }, [
      el("span", null, [el("span", { class: "checklist-mark " + (on ? "on" : "off") }, [on ? "\u2713" : "\u2014"]), label])
    ]));
  });
  fundingSection.appendChild(fundingChecklist);
  fundingSection.appendChild(el("div", { class: "kv-grid" }, [
    kvItem("Monthly stipend", s.funding.monthlyStipend || "\u2014"),
    kvItem("Funding duration", s.funding.fundingDuration || "\u2014"),
    kvItem("Funding type", s.fundingType || "\u2014"),
    kvItem("Provider", s.provider || "\u2014")
  ]));
  wrap.appendChild(fundingSection);

  // Requirements
  wrap.appendChild(buildRequirementsSection(s));

  // Documents
  wrap.appendChild(buildDocumentsSection(s));

  // Application
  wrap.appendChild(sectionWithGrid("Application", null, [
    ["Deadline", formatDate(s.applicationDeadline)],
    ["Scholarship website", s.scholarshipWebsite ? linkOut(s.scholarshipWebsite) : "\u2014"],
    ["Application portal", s.applicationWebsite ? linkOut(s.applicationWebsite) : "\u2014"]
  ]));

  // My eligibility
  wrap.appendChild(buildEligibilitySection(s));

  // Pakistani eligibility
  wrap.appendChild(sectionWithGrid("Pakistani Eligibility", null, [
    ["Eligible?", s.pakistani.eligible ? badge(s.pakistani.eligible, statusVariant(s.pakistani.eligible)) : "\u2014"],
    ["Nationality restrictions", s.pakistani.nationalityRestrictions || "\u2014"],
    ["Pakistan-specific requirements", s.pakistani.specificRequirements || "\u2014"],
    ["HEC requirement", s.pakistani.hecRequirement || "\u2014"],
    ["Embassy requirement", s.pakistani.embassyRequirement || "\u2014"],
    ["Notes", s.pakistani.notes || "\u2014"]
  ]));

  // Data quality
  wrap.appendChild(sectionWithGrid("Data Quality", null, [
    ["Source verified", s.sourceVerified ? badge("Verified", "good") : badge("Unverified", "muted")],
    ["Last verified", formatDate(s.lastVerifiedDate)],
    ["Verification notes", s.verificationNotes || "\u2014"]
  ]));

  // Notes
  if (s.notes || s.eligibility) {
    wrap.appendChild(el("div", { class: "detail-section" }, [
      el("div", { class: "detail-section-header" }, [el("h2", null, ["Notes"])]),
      el("div", { class: "notes-prose" }, [
        s.eligibility ? el("p", null, ["Eligibility (free text): " + s.eligibility]) : null,
        s.notes ? el("p", null, [s.notes]) : null
      ].filter(Boolean))
    ]));
  }

  // Official sources
  const sources = [
    s.scholarshipWebsite && ["Scholarship website", s.scholarshipWebsite],
    s.applicationWebsite && ["Application portal", s.applicationWebsite],
    university && university.officialWebsite && ["University website", university.officialWebsite],
    university && university.admissionsWebsite && ["Admissions website", university.admissionsWebsite],
    university && university.scholarshipWebsite && ["University scholarship page", university.scholarshipWebsite],
    programme && programme.programmeWebsite && ["Programme website", programme.programmeWebsite]
  ].filter(Boolean);

  const sourcesSection = el("div", { class: "detail-section" }, [
    el("div", { class: "detail-section-header" }, [el("h2", null, ["Official Sources"])])
  ]);
  if (sources.length) {
    const list = el("ul", { class: "source-list" }, []);
    sources.forEach(([label, url]) => {
      list.appendChild(el("li", null, [linkOut(url, label)]));
    });
    sourcesSection.appendChild(list);
  } else {
    sourcesSection.appendChild(emptyState("No sources yet", "Add official links via Edit so you always know where this information came from."));
  }
  wrap.appendChild(sourcesSection);

  // Related notes & tasks
  wrap.appendChild(buildChildSection("notes", { key: "scholarshipId", type: "scholarships" }, id, getChildren(db, "notes", "scholarshipId", id)));
  wrap.appendChild(buildChildSection("tasks", { key: "relatedScholarshipId", type: "scholarships" }, id, getChildren(db, "tasks", "relatedScholarshipId", id)));

  return wrap;
}

function linkTo(type, record) {
  const a = el("a", { href: "#" }, [record.name]);
  a.addEventListener("click", e => { e.preventDefault(); openDetail(type, record.id); });
  return a;
}

function linkOut(url, label) {
  return el("a", { href: normalizeUrl(url), target: "_blank", rel: "noopener" }, [label || url]);
}

function sectionWithGrid(title, subtitle, rows) {
  const section = el("div", { class: "detail-section" }, [
    el("div", { class: "detail-section-header" }, [el("h2", null, [title])])
  ]);
  const grid = el("div", { class: "kv-grid" }, []);
  rows.forEach(([label, value]) => grid.appendChild(kvItem(label, typeof value === "string" ? value : value)));
  section.appendChild(grid);
  return section;
}

/* ---- Requirements sub-section + edit modal ---- */

function buildRequirementsSection(s) {
  const req = s.requirements;
  const section = el("div", { class: "detail-section" }, [
    el("div", { class: "detail-section-header" }, [
      el("h2", null, ["Requirements"]),
      el("button", { class: "btn", onClick: () => openRequirementsModal(s.id) }, ["Edit requirements"])
    ])
  ]);

  section.appendChild(el("div", { class: "kv-grid" }, [
    kvItem("Minimum degree", req.academic.minDegree || "\u2014"),
    kvItem("Required field", req.academic.requiredField || "\u2014"),
    kvItem("Minimum GPA", req.academic.minGPA || "\u2014"),
    kvItem("Required credits", req.academic.requiredCredits || "\u2014"),
    kvItem("Degree recognition", req.academic.degreeRecognition || "\u2014"),
    kvItem("Graduation date requirement", req.academic.graduationDateRequirement || "\u2014")
  ]));

  if (req.technical.length) {
    const pills = el("div", { class: "pill-list" }, []);
    req.technical.forEach(t => pills.appendChild(badge(t.skill + ": " + t.level, t.level === "Required" ? "warn" : "neutral")));
    section.appendChild(pills);
  }

  section.appendChild(el("div", { class: "kv-grid" }, [
    kvItem("IELTS", req.english.ieltsRequired ? ("Required" + (req.english.ieltsMin ? ", min " + req.english.ieltsMin : "")) : "Not required"),
    kvItem("TOEFL", req.english.toeflRequired ? ("Required" + (req.english.toeflMin ? ", min " + req.english.toeflMin : "")) : "Not required"),
    kvItem("Duolingo accepted", req.english.duolingoAccepted ? "Yes" : "No"),
    kvItem("MOI accepted", req.english.moiAccepted ? "Yes" : "No")
  ]));

  const researchFlags = ["researchExperience", "publicationRequired", "researchProposal", "thesisRequired", "supervisorRequired", "supervisorContact", "portfolioRequired", "interview"];
  const researchLabels = {
    researchExperience: "Research experience", publicationRequired: "Publication required",
    researchProposal: "Research proposal", thesisRequired: "Thesis required",
    supervisorRequired: "Supervisor required", supervisorContact: "Contact supervisor first",
    portfolioRequired: "Portfolio required", interview: "Interview"
  };
  const activeResearch = researchFlags.filter(k => req.research[k]);
  if (activeResearch.length) {
    const pills = el("div", { class: "pill-list" }, []);
    activeResearch.forEach(k => pills.appendChild(badge(researchLabels[k], "warn")));
    section.appendChild(pills);
  }

  return section;
}

function openRequirementsModal(scholarshipId) {
  const s = getRecord(db, "scholarships", scholarshipId);
  const req = JSON.parse(JSON.stringify(s.requirements));
  const form = el("form", { class: "record-form" }, []);
  const refs = {};

  form.appendChild(el("div", { class: "form-group-heading" }, ["Academic"]));
  [["minDegree", "Minimum degree"], ["requiredField", "Required field"], ["minGPA", "Minimum GPA"],
   ["requiredCredits", "Required credits"], ["degreeRecognition", "Degree recognition"],
   ["graduationDateRequirement", "Graduation date requirement"]].forEach(([key, label]) => {
    const input = el("input", { type: "text" }, []);
    input.value = req.academic[key] || "";
    refs["academic." + key] = input;
    form.appendChild(el("div", { class: "form-row" }, [el("label", null, [label]), input]));
  });
  const coursesInput = el("textarea", { rows: 2 }, []);
  coursesInput.value = req.academic.requiredCourses || "";
  refs["academic.requiredCourses"] = coursesInput;
  form.appendChild(el("div", { class: "form-row" }, [el("label", null, ["Required courses"]), coursesInput]));

  form.appendChild(el("div", { class: "form-group-heading" }, ["Technical"]));
  const techWrap = el("div", { class: "multiselect" }, []);
  const techRefs = {};
  ENUMS.technicalSkills.forEach(skill => {
    const existing = req.technical.find(t => t.skill === skill);
    const select = el("select", null, []);
    ENUMS.requirementLevel.concat(["Not listed"]).forEach(level => {
      const opt = el("option", { value: level }, [level]);
      if ((existing ? existing.level : "Not listed") === level) opt.setAttribute("selected", "selected");
      select.appendChild(opt);
    });
    techRefs[skill] = select;
    techWrap.appendChild(el("div", { class: "form-row" }, [el("label", null, [skill]), select]));
  });
  form.appendChild(techWrap);

  form.appendChild(el("div", { class: "form-group-heading" }, ["English"]));
  const ieltsReq = checkboxRow("IELTS required", req.english.ieltsRequired);
  const ieltsMin = textRow("IELTS minimum score", req.english.ieltsMin);
  const toeflReq = checkboxRow("TOEFL required", req.english.toeflRequired);
  const toeflMin = textRow("TOEFL minimum score", req.english.toeflMin);
  const duolingo = checkboxRow("Duolingo accepted", req.english.duolingoAccepted);
  const moi = checkboxRow("MOI accepted", req.english.moiAccepted);
  [ieltsReq, ieltsMin, toeflReq, toeflMin, duolingo, moi].forEach(r => form.appendChild(r.row));

  form.appendChild(el("div", { class: "form-group-heading" }, ["Research"]));
  const researchChecks = {
    researchExperience: checkboxRow("Research experience", req.research.researchExperience),
    publicationRequired: checkboxRow("Publication required", req.research.publicationRequired),
    researchProposal: checkboxRow("Research proposal", req.research.researchProposal),
    thesisRequired: checkboxRow("Thesis required", req.research.thesisRequired),
    supervisorRequired: checkboxRow("Supervisor required", req.research.supervisorRequired),
    supervisorContact: checkboxRow("Contact supervisor before applying", req.research.supervisorContact),
    portfolioRequired: checkboxRow("Portfolio required", req.research.portfolioRequired),
    interview: checkboxRow("Interview", req.research.interview)
  };
  Object.values(researchChecks).forEach(r => form.appendChild(r.row));

  form.appendChild(el("div", { class: "form-actions" }, [
    el("button", { type: "button", class: "btn", onClick: closeModal }, ["Cancel"]),
    el("button", { type: "submit", class: "btn btn-primary" }, ["Save requirements"])
  ]));

  form.addEventListener("submit", e => {
    e.preventDefault();
    const newReq = {
      academic: {
        minDegree: refs["academic.minDegree"].value.trim(),
        requiredField: refs["academic.requiredField"].value.trim(),
        minGPA: refs["academic.minGPA"].value.trim(),
        requiredCredits: refs["academic.requiredCredits"].value.trim(),
        requiredCourses: coursesInput.value.trim(),
        degreeRecognition: refs["academic.degreeRecognition"].value.trim(),
        graduationDateRequirement: refs["academic.graduationDateRequirement"].value.trim()
      },
      technical: Object.keys(techRefs)
        .map(skill => ({ skill, level: techRefs[skill].value }))
        .filter(t => t.level !== "Not listed"),
      english: {
        ieltsRequired: ieltsReq.get(), ieltsMin: ieltsMin.get(),
        toeflRequired: toeflReq.get(), toeflMin: toeflMin.get(),
        duolingoAccepted: duolingo.get(), moiAccepted: moi.get(), otherLanguage: ""
      },
      research: {
        researchExperience: researchChecks.researchExperience.get(),
        publicationRequired: researchChecks.publicationRequired.get(),
        researchProposal: researchChecks.researchProposal.get(),
        thesisRequired: researchChecks.thesisRequired.get(),
        supervisorRequired: researchChecks.supervisorRequired.get(),
        supervisorContact: researchChecks.supervisorContact.get(),
        portfolioRequired: researchChecks.portfolioRequired.get(),
        interview: researchChecks.interview.get()
      }
    };
    updateRecord(db, "scholarships", scholarshipId, { requirements: newReq });
    closeModal();
    toast("Requirements updated.");
    renderView();
  });

  openModal("Edit Requirements \u2014 " + s.name, form, { wide: true });
}

function checkboxRow(label, value) {
  const input = el("input", { type: "checkbox" }, []);
  input.checked = !!value;
  const row = el("div", { class: "form-row form-row-inline" }, [el("label", null, [label]), input]);
  return { row, get: () => input.checked };
}

function textRow(label, value) {
  const input = el("input", { type: "text" }, []);
  input.value = value || "";
  const row = el("div", { class: "form-row" }, [el("label", null, [label]), input]);
  return { row, get: () => input.value.trim() };
}

/* ---- Documents sub-section (inline editable) ---- */

function buildDocumentsSection(s) {
  const section = el("div", { class: "detail-section" }, [
    el("div", { class: "detail-section-header" }, [el("h2", null, ["Documents"])])
  ]);
  const list = el("div", { class: "checklist" }, []);
  s.documents.forEach(doc => {
    const select = el("select", null, []);
    ENUMS.documentStatus.forEach(status => {
      const opt = el("option", { value: status }, [status]);
      if (doc.status === status) opt.setAttribute("selected", "selected");
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      doc.status = select.value;
      updateRecord(db, "scholarships", s.id, { documents: s.documents });
      toast(doc.type + " marked " + doc.status + ".");
    });
    list.appendChild(el("div", { class: "checklist-row" }, [
      el("span", null, [doc.type]),
      select
    ]));
  });
  section.appendChild(list);
  return section;
}

/* ---- My eligibility sub-section + edit modal ---- */

function buildEligibilitySection(s) {
  const e2 = s.myEligibility;
  const section = el("div", { class: "detail-section" }, [
    el("div", { class: "detail-section-header" }, [
      el("h2", null, ["My Eligibility"]),
      el("button", { class: "btn", onClick: () => openEligibilityModal(s.id) }, ["Edit eligibility"])
    ])
  ]);
  const grid = el("div", { class: "kv-grid" }, [
    kvItem("Academic match", badge(e2.academicMatch, statusVariant(e2.academicMatch))),
    kvItem("Technical match", badge(e2.technicalMatch, statusVariant(e2.technicalMatch))),
    kvItem("English match", badge(e2.englishMatch, statusVariant(e2.englishMatch))),
    kvItem("Research match", badge(e2.researchMatch, statusVariant(e2.researchMatch))),
    kvItem("Experience match", badge(e2.experienceMatch, statusVariant(e2.experienceMatch))),
    kvItem("Document readiness", badge(e2.documentReadiness, statusVariant(e2.documentReadiness)))
  ]);
  section.appendChild(grid);
  if (e2.personalNotes) {
    section.appendChild(el("div", { class: "notes-prose" }, [e2.personalNotes]));
  }
  return section;
}

function openEligibilityModal(scholarshipId) {
  const s = getRecord(db, "scholarships", scholarshipId);
  const e2 = s.myEligibility;
  const form = el("form", { class: "record-form" }, []);
  const fields = [
    ["academicMatch", "Academic match"], ["technicalMatch", "Technical match"],
    ["englishMatch", "English match"], ["researchMatch", "Research match"],
    ["experienceMatch", "Experience match"], ["documentReadiness", "Document readiness"]
  ];
  const selects = {};
  fields.forEach(([key, label]) => {
    const select = el("select", null, []);
    ENUMS.matchStatus.forEach(opt => {
      const o = el("option", { value: opt }, [opt]);
      if (e2[key] === opt) o.setAttribute("selected", "selected");
      select.appendChild(o);
    });
    selects[key] = select;
    form.appendChild(el("div", { class: "form-row" }, [el("label", null, [label]), select]));
  });

  const statusSelect = el("select", null, []);
  ENUMS.applicationStatus.forEach(opt => {
    const o = el("option", { value: opt }, [opt]);
    if (s.applicationStatus === opt) o.setAttribute("selected", "selected");
    statusSelect.appendChild(o);
  });
  form.appendChild(el("div", { class: "form-row" }, [el("label", null, ["Overall application status"]), statusSelect]));

  const notes = el("textarea", { rows: 4 }, []);
  notes.value = e2.personalNotes || "";
  form.appendChild(el("div", { class: "form-row" }, [el("label", null, ["Personal notes"]), notes]));

  form.appendChild(el("div", { class: "form-actions" }, [
    el("button", { type: "button", class: "btn", onClick: closeModal }, ["Cancel"]),
    el("button", { type: "submit", class: "btn btn-primary" }, ["Save"])
  ]));

  form.addEventListener("submit", ev => {
    ev.preventDefault();
    const newEligibility = { personalNotes: notes.value.trim() };
    fields.forEach(([key]) => { newEligibility[key] = selects[key].value; });
    updateRecord(db, "scholarships", scholarshipId, { myEligibility: newEligibility, applicationStatus: statusSelect.value });
    closeModal();
    toast("Eligibility updated.");
    renderView();
  });

  openModal("My Eligibility \u2014 " + s.name, form);
}

/* ---------------------------------------------------------
   Applications view
   --------------------------------------------------------- */

function buildApplicationsView() {
  const scholarships = db.scholarships.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (!scholarships.length) {
    return emptyState(
      "No opportunities to evaluate yet",
      "Add a scholarship first, then come back here to track your eligibility and application status against it.",
      { label: "Go to Scholarships", onClick: () => go("scholarships") }
    );
  }

  const table = el("div", { class: "record-table" }, []);
  table.appendChild(el("div", { class: "record-row record-row-head" }, [
    el("div", { class: "record-cell" }, ["Scholarship"]),
    el("div", { class: "record-cell" }, ["University"]),
    el("div", { class: "record-cell" }, ["Overall match"]),
    el("div", { class: "record-cell" }, ["Status"])
  ]));

  scholarships.forEach(s => {
    const uni = getRecord(db, "universities", s.universityId);
    const matches = ["academicMatch", "technicalMatch", "englishMatch", "researchMatch"].map(k => s.myEligibility[k]);
    const summary = matches.filter(m => m === "Meets Requirement").length + " / " + matches.length + " met";

    const row = el("div", { class: "record-row" }, [
      el("div", { class: "record-cell" }, [(() => {
        const b = el("button", { class: "link-btn" }, [s.name]);
        b.addEventListener("click", () => openDetail("scholarships", s.id));
        return b;
      })()]),
      el("div", { class: "record-cell" }, [uni ? uni.name : "\u2014"]),
      el("div", { class: "record-cell" }, [summary]),
      el("div", { class: "record-cell" }, [badge(s.applicationStatus || "Researching", statusVariant(s.applicationStatus))])
    ]);
    table.appendChild(row);
  });

  return el("div", null, [table]);
}

/* ---------------------------------------------------------
   Calendar view
   --------------------------------------------------------- */

function buildCalendarView() {
  const wrap = el("div", null, []);
  wrap.appendChild(el("div", { class: "calendar-toolbar" }, [
    el("button", { class: "btn btn-primary", onClick: () => openTaskModal() }, ["+ Add personal task"])
  ]));

  const items = collectUpcomingDeadlines();
  if (!items.length) {
    wrap.appendChild(emptyState(
      "Nothing on the calendar yet",
      "Deadlines from scholarships and programmes appear here automatically, or add a personal preparation task."
    ));
    return wrap;
  }

  const today = new Date().toISOString().slice(0, 10);
  items.forEach(item => {
    const isPast = item.date < today;
    const isSoon = !isPast && item.date <= addDays(today, 14);
    const row = el("div", { class: "calendar-row" }, [
      el("div", { class: "calendar-date" + (isPast ? " is-past" : isSoon ? " is-soon" : "") }, [formatDate(item.date)]),
      el("div", null, [
        el("div", { class: "calendar-name" }, [item.name]),
        el("div", { class: "calendar-meta" }, [item.kind + (item.meta ? " \u2014 " + item.meta : "")])
      ]),
      el("div", null, [badge(item.kind, item.kind === "Task" ? "neutral" : "warn")]),
      el("div", { class: "record-cell-actions" }, [
        el("button", { class: "link-btn", onClick: item.onClick }, ["Open"])
      ])
    ]);
    wrap.appendChild(row);
  });

  return wrap;
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function openTaskModal() {
  const form = buildForm("tasks", db, null, data => {
    createRecord(db, "tasks", data);
    closeModal();
    toast("Task added.");
    renderView();
  });
  openModal("Add Personal Task", form);
}

/* ---------------------------------------------------------
   Settings view
   --------------------------------------------------------- */

function buildSettingsView() {
  const wrap = el("div", null, []);

  const statTypes = ["regions", "countries", "universities", "programmes", "scholarships", "notes", "tasks"];
  const statsGrid = el("div", { class: "settings-stat-grid" }, statTypes.map(type =>
    el("div", { class: "settings-stat" }, [
      el("div", { class: "stat-value" }, [String(getAll(db, type).length)]),
      el("div", { class: "stat-label" }, [ENTITY_META[type] ? ENTITY_META[type].labelPlural : type])
    ])
  ));
  wrap.appendChild(el("div", { class: "settings-section" }, [
    el("h2", null, ["Overview"]),
    statsGrid
  ]));

  wrap.appendChild(el("div", { class: "settings-section" }, [
    el("h2", null, ["Backup"]),
    el("p", null, ["Export everything to a single JSON file you can keep as a backup or move to another browser."]),
    el("div", { class: "settings-actions" }, [
      el("button", { class: "btn btn-primary", onClick: () => exportData(db) }, ["Export database (.json)"])
    ])
  ]));

  const fileInput = el("input", { type: "file", accept: "application/json", id: "importFile" }, []);
  fileInput.style.display = "none";
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    importData(file, merged => {
      db = merged;
      toast("Database restored from backup.");
      go("settings");
    }, err => {
      console.error(err);
      toast("That file couldn't be read as a valid backup.");
    });
  });
  wrap.appendChild(el("div", { class: "settings-section" }, [
    el("h2", null, ["Restore"]),
    el("p", null, ["Import a previously exported backup. This replaces your current database — export first if you want to keep it."]),
    el("div", { class: "settings-actions" }, [
      fileInput,
      el("button", { class: "btn", onClick: () => fileInput.click() }, ["Import database (.json)"])
    ])
  ]));

  wrap.appendChild(el("div", { class: "settings-section" }, [
    el("h2", null, ["Reference geography"]),
    el("p", null, ["Top up your Regions and Countries with the built-in list (8 regions, ~90 countries) \u2014 useful after a reset, or if you deleted some by mistake. Only adds what's missing; never duplicates or overwrites what you already have."]),
    el("div", { class: "settings-actions" }, [
      el("button", { class: "btn", onClick: () => {
        const result = mergeReferenceGeography(db);
        if (!result.regionsAdded && !result.countriesAdded) {
          toast("Already up to date \u2014 nothing to add.");
        } else {
          toast("Added " + result.regionsAdded + " region(s) and " + result.countriesAdded + " countries.");
        }
        go("settings");
      } }, ["Load reference regions & countries"])
    ])
  ]));

  wrap.appendChild(el("div", { class: "settings-section" }, [
    el("h2", null, ["Demo data"]),
    el("p", null, ["Remove the sample \u201cEurope / Germany / Example University\u201d records that came pre-loaded, once you understand how the app works."]),
    el("div", { class: "settings-actions" }, [
      el("button", { class: "btn", onClick: () => {
        confirmDialog("Remove all records flagged as demo data?", () => {
          removeDemoData(db);
          toast("Demo data removed.");
          go("settings");
        }, "Remove demo data");
      } }, ["Remove demo data"])
    ])
  ]));

  wrap.appendChild(el("div", { class: "settings-section" }, [
    el("h2", null, ["Reset database"]),
    el("p", null, ["Permanently delete everything in this browser and start over. This cannot be undone — export a backup first if there's a chance you'll want this data again."]),
    el("div", { class: "settings-actions" }, [
      el("button", { class: "btn btn-danger", onClick: () => {
        confirmDialog("This deletes every region, country, university, programme, scholarship, note and task. Are you absolutely sure?", () => {
          db = resetData(false);
          toast("Database reset.");
          go("dashboard");
        }, "Reset everything");
      } }, ["Reset database"])
    ])
  ]));

  return wrap;
}

/* ---------------------------------------------------------
   Global search
   --------------------------------------------------------- */

function buildSearchResultsView(query) {
  const wrap = el("div", null, []);
  if (!query || query.trim().length < 2) {
    wrap.appendChild(emptyState("Type at least 2 characters", "Search looks across regions, countries, universities, programmes, scholarships and notes."));
    return wrap;
  }

  const q = query.toLowerCase();
  let totalHits = 0;

  NAV_TYPES.forEach(type => {
    const meta = ENTITY_META[type];
    const hits = getAll(db, type).filter(r => meta.searchFields.some(f => String(getPath(r, f) || "").toLowerCase().includes(q)));
    if (!hits.length) return;
    totalHits += hits.length;

    const group = el("div", { class: "search-results-group" }, [
      el("h2", null, [meta.labelPlural + " (" + hits.length + ")"])
    ]);
    hits.slice(0, 8).forEach(hit => {
      const row = el("div", { class: "search-hit" }, []);
      const btn = el("button", null, [hit.name || hit.title]);
      btn.addEventListener("click", () => openDetail(type, hit.id));
      row.appendChild(btn);
      group.appendChild(row);
    });
    wrap.appendChild(group);
  });

  if (!totalHits) {
    wrap.appendChild(emptyState("No matches", "Nothing in your database matches \u201c" + query + "\u201d."));
  }
  return wrap;
}

function initGlobalSearch() {
  const input = document.getElementById("globalSearch");
  input.addEventListener("input", () => {
    const value = input.value.trim();
    if (value.length >= 2) {
      viewParams = { query: value };
      currentView = "search-results";
      updateHeader();
      renderView();
    } else if (currentView === "search-results") {
      go("dashboard");
    }
  });
}

/* ---------------------------------------------------------
   Navigation (header bar) — always visible, no collapse/hide
   --------------------------------------------------------- */

function initNav() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => go(btn.dataset.view));
  });
  document.getElementById("sidebarQuickAdd").addEventListener("click", () => openQuickAddModal());
}

/* ---------------------------------------------------------
   Init
   --------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initGlobalSearch();
  updateHeader();
  renderView();
});
