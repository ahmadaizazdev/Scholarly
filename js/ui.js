/* =========================================================
   Scholarship Research Database
   ui.js — reusable, entity-agnostic rendering helpers

   Nothing in this file knows about "scholarships" or
   "universities" specifically — it only knows how to read an
   ENTITY_META definition (from data.js) and render a form,
   a list, a badge, a modal, and so on. app.js supplies the
   entity type and the data; this file supplies the pixels.
   ========================================================= */

/* ---------------------------------------------------------
   Small DOM helper
   --------------------------------------------------------- */

function el(tag, props, children) {
  const node = document.createElement(tag);
  if (props) {
    Object.keys(props).forEach(key => {
      if (key === "class") node.className = props[key];
      else if (key === "html") node.innerHTML = props[key];
      else if (key.startsWith("on") && typeof props[key] === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), props[key]);
      } else if (props[key] !== undefined && props[key] !== null) {
        node.setAttribute(key, props[key]);
      }
    });
  }
  (children || []).forEach(child => {
    if (child === null || child === undefined) return;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  });
  return node;
}

/* Nested-path get/set, e.g. "funding.tuitionCoverage" */
function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}
function setPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

/* ---------------------------------------------------------
   Badges
   --------------------------------------------------------- */

function badge(text, variant) {
  return el("span", { class: "badge badge-" + (variant || "neutral") }, [text]);
}

function fundingStatusVariant(status) {
  if (status === "Fully Funded") return "good";
  if (status === "Unfunded") return "muted";
  if (status === "Unknown") return "muted";
  return "warn";
}

/* ---------------------------------------------------------
   Status chip (dot + text) — used inside table rows, a lighter
   treatment than the filled .badge pill used elsewhere.
   --------------------------------------------------------- */

function statusChip(text, variant) {
  return el("span", { class: "status-chip is-" + (variant || "neutral") }, [
    el("span", { class: "status-chip-dot" }, []),
    el("span", null, [text])
  ]);
}

/* ---------------------------------------------------------
   Charts — plain inline SVG, no dependencies. Colors are
   passed in as CSS color strings (hex or var(--x)).
   --------------------------------------------------------- */

const CHART_PALETTE = [
  "#7c5cfc", "#f5a524", "#14b8a6", "#ec4899", "#3b82f6",
  "#eab308", "#ef4444", "#10b981", "#8b5cf6", "#06b6d4"
];

/* Grouped, multi-series bar chart with a floating tooltip on hover.
   categories: [label, ...] — one per group (e.g. months)
   series: [{ name, color, values: [n, ...] }] — one array of
   values per series, aligned to categories by index. */
function buildBarChart(categories, series, opts) {
  opts = opts || {};
  const width = 640, height = 190;
  const padTop = 16, padBottom = 26, padLeft = 6, padRight = 6;
  const n = categories.length || 1;
  const groupGap = 16;
  const barGap = 3;
  const chartW = width - padLeft - padRight;
  const groupW = (chartW - groupGap * (n - 1)) / n;
  const barsPerGroup = Math.max(1, series.length);
  const barW = Math.max(5, (groupW - barGap * (barsPerGroup - 1)) / barsPerGroup);
  const max = Math.max(1, ...series.flatMap(s => s.values));
  const chartH = height - padTop - padBottom;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("role", "img");

  const wrap = el("div", { class: "bar-chart-wrap" }, [svg]);
  const tooltip = el("div", { class: "chart-tooltip" }, []);
  wrap.appendChild(tooltip);

  function showTooltip(rectEl, label, value, color) {
    tooltip.innerHTML = "";
    tooltip.appendChild(el("span", { class: "chart-tooltip-dot", style: "background:" + color }, []));
    tooltip.appendChild(el("span", null, [
      el("div", { class: "chart-tooltip-value" }, [String(value)]),
      el("div", { class: "chart-tooltip-label" }, [label])
    ]));
    const rectBox = rectEl.getBoundingClientRect();
    const wrapBox = wrap.getBoundingClientRect();
    tooltip.style.left = (rectBox.left - wrapBox.left + rectBox.width / 2) + "px";
    tooltip.style.top = (rectBox.top - wrapBox.top) + "px";
    tooltip.classList.add("is-visible");
  }
  function hideTooltip() { tooltip.classList.remove("is-visible"); }

  categories.forEach((cat, ci) => {
    const groupX = padLeft + ci * (groupW + groupGap);

    series.forEach((s, si) => {
      const value = s.values[ci] || 0;
      const barH = max > 0 ? (value / max) * chartH : 0;
      const x = groupX + si * (barW + barGap);
      const y = padTop + (chartH - barH);

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("class", "bar-chart-bar");
      rect.setAttribute("x", x.toFixed(1));
      rect.setAttribute("y", y.toFixed(1));
      rect.setAttribute("width", barW.toFixed(1));
      rect.setAttribute("height", Math.max(1, barH).toFixed(1));
      rect.setAttribute("rx", "3");
      rect.setAttribute("fill", s.color);
      rect.addEventListener("mouseenter", () => showTooltip(rect, cat + " \u2014 " + s.name, value, s.color));
      rect.addEventListener("mouseleave", hideTooltip);
      svg.appendChild(rect);
    });

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("class", "bar-chart-axis-label");
    label.setAttribute("x", (groupX + groupW / 2).toFixed(1));
    label.setAttribute("y", (height - 6).toFixed(1));
    label.setAttribute("text-anchor", "middle");
    label.textContent = cat;
    svg.appendChild(label);
  });

  return wrap;
}

/* Donut chart. segments: [{ label, value, color }] */
function buildDonutChart(segments) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const size = 150, r = 62, stroke = 20;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 " + size + " " + size);

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  bg.setAttribute("cx", cx); bg.setAttribute("cy", cy); bg.setAttribute("r", r);
  bg.setAttribute("fill", "none");
  bg.setAttribute("stroke", "var(--border)");
  bg.setAttribute("stroke-width", stroke);
  svg.appendChild(bg);

  let offset = 0;
  segments.forEach(seg => {
    const frac = total > 0 ? seg.value / total : 0;
    if (frac <= 0) return;
    const dash = frac * circumference;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", cx); circle.setAttribute("cy", cy); circle.setAttribute("r", r);
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", seg.color);
    circle.setAttribute("stroke-width", stroke);
    circle.setAttribute("stroke-dasharray", dash.toFixed(2) + " " + (circumference - dash).toFixed(2));
    circle.setAttribute("stroke-dashoffset", (-offset).toFixed(2));
    circle.setAttribute("transform", "rotate(-90 " + cx + " " + cy + ")");
    const titleEl = document.createElementNS("http://www.w3.org/2000/svg", "title");
    titleEl.textContent = seg.label + ": " + seg.value;
    circle.appendChild(titleEl);
    svg.appendChild(circle);
    offset += dash;
  });

  const centerText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  centerText.setAttribute("x", cx); centerText.setAttribute("y", cy + 5);
  centerText.setAttribute("text-anchor", "middle");
  centerText.setAttribute("font-family", "var(--font-display)");
  centerText.setAttribute("font-size", "20");
  centerText.setAttribute("font-weight", "600");
  centerText.setAttribute("fill", "var(--ink)");
  centerText.textContent = String(total);
  svg.appendChild(centerText);

  return el("div", { class: "donut-svg-wrap" }, [svg]);
}

function buildDonutLegend(segments) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const list = el("ul", { class: "donut-legend" }, []);
  segments.forEach(seg => {
    const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
    list.appendChild(el("li", { class: "donut-legend-row" }, [
      el("span", { class: "donut-legend-dot", style: "background:" + seg.color }, []),
      el("span", { class: "donut-legend-label" }, [seg.label]),
      el("span", { class: "donut-legend-pct" }, [pct + "%"])
    ]));
  });
  return list;
}

/* ---------------------------------------------------------
   Empty state
   --------------------------------------------------------- */

function emptyState(title, description, action) {
  const children = [
    el("p", { class: "empty-state-title" }, [title]),
    el("p", { class: "empty-state-desc" }, [description])
  ];
  if (action) {
    children.push(el("button", { class: "btn btn-primary", onClick: action.onClick }, [action.label]));
  }
  return el("div", { class: "empty-state" }, children);
}

/* ---------------------------------------------------------
   Toast
   --------------------------------------------------------- */

let toastTimer = null;
function toast(message) {
  let host = document.getElementById("toastHost");
  if (!host) {
    host = el("div", { id: "toastHost", class: "toast-host" }, []);
    document.body.appendChild(host);
  }
  host.textContent = message;
  host.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.classList.remove("is-visible"), 2600);
}

/* ---------------------------------------------------------
   Modal
   --------------------------------------------------------- */

function openModal(title, bodyEl, options) {
  closeModal();
  const overlay = el("div", { class: "modal-overlay", id: "modalOverlay" }, [
    el("div", { class: "modal " + ((options && options.wide) ? "modal-wide" : "") }, [
      el("div", { class: "modal-header" }, [
        el("h2", null, [title]),
        el("button", { class: "modal-close", "aria-label": "Close", onClick: closeModal }, ["\u00d7"])
      ]),
      el("div", { class: "modal-body" }, [bodyEl])
    ])
  ]);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  document.body.classList.add("modal-open");
}

function closeModal() {
  const overlay = document.getElementById("modalOverlay");
  if (overlay) overlay.remove();
  document.body.classList.remove("modal-open");
}

function confirmDialog(message, onConfirm, confirmLabel) {
  const body = el("div", { class: "confirm-body" }, [
    el("p", null, [message]),
    el("div", { class: "form-actions" }, [
      el("button", { class: "btn", onClick: closeModal }, ["Cancel"]),
      el("button", {
        class: "btn btn-danger",
        onClick: () => { onConfirm(); closeModal(); }
      }, [confirmLabel || "Delete"])
    ])
  ]);
  openModal("Please confirm", body);
}

/* A dropdown of predefined names (REFERENCE_REGIONS or
   REFERENCE_COUNTRIES from data.js) with a "not listed" escape
   hatch that reveals a plain text input instead. Exposes a
   .getValue() method so buildForm's submit handler can read it
   the same way regardless of which path was used. `onPick(match)`
   fires with the matching reference entry (or null for "not
   listed") so callers can auto-fill sibling fields — e.g. a
   country's region and country code. */
function buildPredefinedPicker(opts) {
  const wrapper = el("div", { class: "predefined-picker" }, []);
  const sorted = opts.source.slice().sort((a, b) => a.name.localeCompare(b.name));
  const isKnown = sorted.some(item => item.name === opts.currentValue);

  const select = el("select", null, [el("option", { value: "" }, ["\u2014 " + opts.placeholder + " \u2014"])]);
  sorted.forEach(item => {
    const o = el("option", { value: item.name }, [item.name]);
    if (opts.currentValue === item.name) o.setAttribute("selected", "selected");
    select.appendChild(o);
  });
  const otherOpt = el("option", { value: "__other__" }, ["Other (not listed \u2014 type manually)"]);
  if (opts.currentValue && !isKnown) otherOpt.setAttribute("selected", "selected");
  select.appendChild(otherOpt);

  const customInput = el("input", { type: "text", placeholder: "Type the name" }, []);
  const showCustom = opts.currentValue && !isKnown;
  customInput.value = showCustom ? opts.currentValue : "";
  customInput.style.display = showCustom ? "" : "none";

  select.addEventListener("change", () => {
    if (select.value === "__other__") {
      customInput.style.display = "";
      customInput.focus();
      if (opts.onPick) opts.onPick(null);
    } else {
      customInput.style.display = "none";
      customInput.value = "";
      const match = opts.source.find(item => item.name === select.value);
      if (opts.onPick) opts.onPick(match);
    }
  });

  wrapper.appendChild(select);
  wrapper.appendChild(customInput);
  wrapper.getValue = () => (select.value === "__other__" ? customInput.value.trim() : select.value);
  return wrapper;
}

/* ---------------------------------------------------------
   Generic form builder
   Reads ENTITY_META[type].fields, renders inputs, validates
   required fields on submit, and calls onSubmit(data).
   `db` is passed so select-relation fields can list options.
   --------------------------------------------------------- */

function buildForm(type, db, existingRecord, onSubmit) {
  const meta = ENTITY_META[type];
  const record = existingRecord || {};
  const form = el("form", { class: "record-form" }, []);
  const inputs = {};

  meta.fields.forEach(field => {
    if (field.group) {
      form.appendChild(el("div", { class: "form-group-heading" }, [field.group]));
      return;
    }

    const row = el("div", { class: "form-row" }, []);
    const labelText = field.label + (field.required ? " *" : "");
    row.appendChild(el("label", null, [labelText]));

    const currentValue = getPath(record, field.key);
    let input;

    if (field.type === "textarea" || field.type === "textarea-md") {
      input = el("textarea", { rows: field.type === "textarea-md" ? 6 : 3 }, []);
      input.value = currentValue || "";
    } else if (field.type === "select") {
      input = el("select", null, [el("option", { value: "" }, ["— Select —"])]);
      field.options.forEach(opt => {
        const o = el("option", { value: opt }, [opt]);
        if ((currentValue || field.default) === opt) o.setAttribute("selected", "selected");
        input.appendChild(o);
      });
    } else if (field.type === "select-relation") {
      input = el("select", null, [el("option", { value: "" }, ["— None —"])]);
      getAll(db, field.relation).forEach(opt => {
        const o = el("option", { value: opt.id }, [opt.name + (opt.demo ? " (demo)" : "")]);
        if (currentValue === opt.id) o.setAttribute("selected", "selected");
        input.appendChild(o);
      });
    } else if (field.type === "multiselect") {
      input = el("div", { class: "multiselect" }, []);
      const selected = Array.isArray(currentValue) ? currentValue : [];
      field.options.forEach(opt => {
        const id = field.key + "-" + opt.replace(/\s+/g, "_");
        const cb = el("input", { type: "checkbox", id, value: opt }, []);
        cb.checked = selected.includes(opt);
        input.appendChild(el("label", { class: "check-pill", for: id }, [cb, opt]));
      });
    } else if (field.type === "region-picker") {
      input = buildPredefinedPicker({
        currentValue, source: REFERENCE_REGIONS, placeholder: "Select a region",
        onPick: (match) => {
          if (match && inputs["description"] && !inputs["description"].value.trim()) {
            inputs["description"].value = match.description || "";
          }
        }
      });
    } else if (field.type === "country-picker") {
      input = buildPredefinedPicker({
        currentValue, source: REFERENCE_COUNTRIES, placeholder: "Select a country",
        onPick: (match) => {
          if (!match) return;
          const regionSelect = inputs["regionId"];
          const codeInput = inputs["countryCode"];
          if (regionSelect) {
            const targetRegion = getAll(db, "regions").find(r => r.name === match.region);
            if (targetRegion) regionSelect.value = targetRegion.id;
          }
          if (codeInput) codeInput.value = match.code || "";
        }
      });
    } else if (field.type === "checkbox") {
      input = el("input", { type: "checkbox" }, []);
      input.checked = !!currentValue;
      row.classList.add("form-row-inline");
    } else if (field.type === "tags") {
      input = el("input", { type: "text", placeholder: "e.g. deadline, funding, ielts" }, []);
      input.value = Array.isArray(currentValue) ? currentValue.join(", ") : (currentValue || "");
    } else if (field.type === "lines") {
      input = el("textarea", { rows: 3, placeholder: "One link per line" }, []);
      input.value = Array.isArray(currentValue) ? currentValue.join("\n") : (currentValue || "");
    } else {
      input = el("input", { type: field.type === "url" ? "url" : field.type, placeholder: field.placeholder || "" }, []);
      input.value = currentValue !== undefined && currentValue !== null ? currentValue : (field.default || "");
    }

    input.dataset.key = field.key;
    input.dataset.type = field.type;
    inputs[field.key] = input;
    row.appendChild(input);
    if (field.hint) row.appendChild(el("p", { class: "field-hint" }, [field.hint]));
    form.appendChild(row);
  });

  form.appendChild(el("div", { class: "form-actions" }, [
    el("button", { type: "button", class: "btn", onClick: closeModal }, ["Cancel"]),
    el("button", { type: "submit", class: "btn btn-primary" }, [existingRecord ? "Save changes" : "Add"])
  ]));

  form.addEventListener("submit", e => {
    e.preventDefault();
    const data = {};
    let hasError = false;

    meta.fields.forEach(field => {
      if (field.group) return;
      const input = inputs[field.key];
      let value;

      if (field.type === "multiselect") {
        value = Array.from(input.querySelectorAll("input:checked")).map(cb => cb.value);
      } else if (field.type === "checkbox") {
        value = input.checked;
      } else if (field.type === "country-picker" || field.type === "region-picker") {
        value = input.getValue();
      } else if (field.type === "tags") {
        value = input.value.split(",").map(s => s.trim()).filter(Boolean);
      } else if (field.type === "lines") {
        value = input.value.split("\n").map(s => s.trim()).filter(Boolean);
      } else {
        value = input.value.trim();
      }

      if (field.required && (value === "" || value === undefined || (Array.isArray(value) && value.length === 0))) {
        input.classList.add("field-error");
        hasError = true;
      } else {
        input.classList.remove("field-error");
      }

      setPath(data, field.key, value);
    });

    if (hasError) {
      toast("Please fill in the required fields.");
      return;
    }
    onSubmit(data);
  });

  return form;
}

/* ---------------------------------------------------------
   Generic list / table view
   --------------------------------------------------------- */

function formatCellValue(db, type, field, record) {
  const value = getPath(record, field);
  const meta = ENTITY_META[type];
  const relation = meta.relations.find(r => r.key === field);

  if (relation) {
    const target = getRecord(db, relation.type, value);
    return target ? target.name : "—";
  }
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field.toLowerCase().includes("status") && value) {
    return null; // handled as a badge by caller
  }
  return value || "—";
}

function buildListView(type, db, records, handlers) {
  const meta = ENTITY_META[type];
  const wrap = el("div", { class: "list-view" }, []);

  const toolbar = el("div", { class: "list-toolbar" }, [
    el("input", {
      type: "search", class: "list-search", placeholder: "Search " + meta.labelPlural.toLowerCase() + "…",
      onInput: e => handlers.onSearch(e.target.value)
    }, []),
    el("button", { class: "btn btn-primary", onClick: handlers.onAdd }, ["+ Add " + meta.label])
  ]);
  wrap.appendChild(toolbar);

  if (handlers.filters && handlers.filters.length) {
    const filterBar = el("div", { class: "filter-bar" }, []);
    handlers.filters.forEach(f => {
      const select = el("select", { onChange: e => handlers.onFilter(f.key, e.target.value) }, [
        el("option", { value: "" }, [f.label + ": All"])
      ]);
      f.options.forEach(opt => select.appendChild(el("option", { value: opt }, [opt])));
      filterBar.appendChild(select);
    });
    wrap.appendChild(filterBar);
  }

  if (!records.length) {
    wrap.appendChild(emptyState(
      "No " + meta.labelPlural.toLowerCase() + " yet",
      "Add your first " + meta.label.toLowerCase() + " to start building out this part of your research.",
      { label: "+ Add " + meta.label, onClick: handlers.onAdd }
    ));
    return wrap;
  }

  const table = el("div", { class: "record-table" }, []);
  const headerRow = el("div", { class: "record-row record-row-head" },
    meta.listFields.map(f => el("div", { class: "record-cell" }, [fieldLabel(meta, f)]))
      .concat([el("div", { class: "record-cell record-cell-actions" }, [""])])
  );
  table.appendChild(headerRow);

  records.forEach(record => {
    const cells = meta.listFields.map(f => {
      const isStatusField = f.toLowerCase().includes("status") || f === "priority";
      const raw = getPath(record, f);
      if (isStatusField && raw) {
        return el("div", { class: "record-cell" }, [statusChip(raw, statusVariant(raw))]);
      }
      const displayValue = formatCellValue(db, type, f, record);
      const cellChildren = [displayValue];
      if (f === meta.listFields[0] && record.demo) {
        return el("div", { class: "record-cell" }, [displayValue + "  ", badge("DEMO", "muted")]);
      }
      return el("div", { class: "record-cell" }, cellChildren);
    });

    const actions = el("div", { class: "record-cell record-cell-actions" }, [
      el("button", { class: "link-btn", onClick: () => handlers.onView(record.id) }, ["View"]),
      el("button", { class: "link-btn", onClick: () => handlers.onEdit(record.id) }, ["Edit"]),
      el("button", { class: "link-btn link-btn-danger", onClick: () => handlers.onDelete(record.id) }, ["Delete"])
    ]);

    const row = el("div", { class: "record-row" }, cells.concat([actions]));
    table.appendChild(row);
  });

  wrap.appendChild(table);
  return wrap;
}

function fieldLabel(meta, key) {
  const field = meta.fields.find(f => f.key === key);
  if (field) return field.label;
  const relation = meta.relations.find(r => r.key === key);
  if (relation) return relation.label;
  return key;
}

function statusVariant(value) {
  const positive = ["Fully Funded", "Accepted", "Ready to Apply", "Ready", "Submitted", "Active", "Completed", "Yes"];
  const negative = ["Unfunded", "Rejected", "Does Not Meet", "No", "Not Started"];
  const warning = ["Substantial Funding", "Partial Funding", "Preparing", "Applied", "Interview", "Needs Verification", "Unclear", "Need Verification", "On Hold"];
  if (positive.includes(value)) return "good";
  if (negative.includes(value)) return "muted";
  if (warning.includes(value)) return "warn";
  return "neutral";
}

/* ---------------------------------------------------------
   Minimal markdown-ish renderer for notes content:
   **bold**, *italic*, line breaks. Nothing else — on purpose.
   --------------------------------------------------------- */

function renderLiteMarkdown(text) {
  const escaped = (text || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withItalic = withBold.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return withItalic.replace(/\n/g, "<br>");
}
