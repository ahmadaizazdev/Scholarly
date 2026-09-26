/* =========================================================
   Scholarship Research Database
   storage.js — all localStorage reads/writes and generic CRUD

   Everything here works against a single namespaced blob in
   localStorage. Swapping this out for fetch() calls to a
   Node/Express + MySQL API later should not require changing
   app.js or ui.js, as long as these function signatures
   (loadData, saveData, createRecord, updateRecord, deleteRecord,
   getRecord, getAll) are preserved.
   ========================================================= */

const STORAGE_KEY = "scholarshipResearchDB";

function loadData() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn("localStorage unavailable, using in-memory data only.", err);
    return buildDemoData();
  }

  if (!raw) {
    const seeded = buildDemoData();
    saveData(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw);
    return mergeWithDefaults(parsed);
  } catch (err) {
    console.error("Stored data was corrupted and could not be parsed.", err);
    return createEmptyDatabase();
  }
}

/* Ensures every top-level key from createEmptyDatabase() exists,
   even if the stored blob is from an older, smaller version. */
function mergeWithDefaults(parsed) {
  const defaults = createEmptyDatabase();
  const merged = Object.assign({}, defaults, parsed);
  Object.keys(defaults).forEach(key => {
    if (merged[key] === undefined || merged[key] === null) {
      merged[key] = defaults[key];
    }
  });
  return merged;
}

function saveData(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch (err) {
    console.error("Failed to save to localStorage.", err);
    return false;
  }
}

function resetData(reseedDemo) {
  const fresh = reseedDemo ? buildDemoData() : createEmptyDatabase();
  saveData(fresh);
  return fresh;
}

/* ---------------------------------------------------------
   Export / Import
   --------------------------------------------------------- */

function exportData(db) {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "scholarship-research-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const merged = mergeWithDefaults(parsed);
      saveData(merged);
      onSuccess(merged);
    } catch (err) {
      onError(err);
    }
  };
  reader.onerror = () => onError(reader.error);
  reader.readAsText(file);
}

/* ---------------------------------------------------------
   Generic CRUD
   Every entity is a flat array under db[type]. Records carry
   id, createdAt, updatedAt, demo.
   --------------------------------------------------------- */

function genId(prefix) {
  return (prefix || "rec") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function getAll(db, type) {
  return db[type] || [];
}

function getRecord(db, type, id) {
  return getAll(db, type).find(r => r.id === id) || null;
}

function createRecord(db, type, data) {
  const now = new Date().toISOString();
  const record = Object.assign({}, data, {
    id: genId(type.slice(0, 4)),
    demo: false,
    createdAt: now,
    updatedAt: now
  });
  db[type].push(record);
  saveData(db);
  return record;
}

function updateRecord(db, type, id, data) {
  const record = getRecord(db, type, id);
  if (!record) return null;
  Object.assign(record, data, { updatedAt: new Date().toISOString() });
  saveData(db);
  return record;
}

function deleteRecord(db, type, id) {
  db[type] = getAll(db, type).filter(r => r.id !== id);
  cascadeDelete(db, type, id);
  saveData(db);
}

/* When a parent record is deleted, its children lose a dangling
   reference rather than being silently deleted too — we clear
   the foreign key so the child still shows up (as "Unassigned")
   instead of disappearing without explanation. */
function cascadeDelete(db, parentType, parentId) {
  Object.keys(ENTITY_META).forEach(childType => {
    const meta = ENTITY_META[childType];
    meta.relations.forEach(rel => {
      if (rel.type === parentType) {
        getAll(db, childType).forEach(record => {
          if (record[rel.key] === parentId) {
            record[rel.key] = "";
          }
        });
      }
    });
  });
}

function getChildren(db, type, foreignKey, parentId) {
  return getAll(db, type).filter(r => r[foreignKey] === parentId);
}

/* Strips every record flagged demo: true across all entity
   types in one pass — used by the Settings "Remove demo data"
   action. */
function removeDemoData(db) {
  Object.keys(ENTITY_META).forEach(type => {
    db[type] = getAll(db, type).filter(r => !r.demo);
  });
  saveData(db);
  return db;
}

/* Idempotently tops up db.regions/db.countries with anything
   from REFERENCE_REGIONS/REFERENCE_COUNTRIES (data.js) that
   isn't already there by name — used by the Settings "Load
   reference regions & countries" action, e.g. after a reset. */
function mergeReferenceGeography(db) {
  const now = new Date().toISOString();
  let regionsAdded = 0;
  let countriesAdded = 0;

  const regionIdByName = {};
  getAll(db, "regions").forEach(r => { regionIdByName[r.name.toLowerCase()] = r.id; });

  REFERENCE_REGIONS.forEach(r => {
    const key = r.name.toLowerCase();
    if (regionIdByName[key]) return;
    const record = {
      id: genId("region"), name: r.name, description: r.description || "", notes: "",
      demo: false, createdAt: now, updatedAt: now
    };
    db.regions.push(record);
    regionIdByName[key] = record.id;
    regionsAdded++;
  });

  const countryNames = new Set(getAll(db, "countries").map(c => c.name.toLowerCase()));
  REFERENCE_COUNTRIES.forEach(c => {
    const key = c.name.toLowerCase();
    if (countryNames.has(key)) return;
    const record = {
      id: genId("country"), name: c.name, regionId: regionIdByName[c.region.toLowerCase()] || "",
      countryCode: c.code || "", priority: "Researching", notes: "",
      demo: false, createdAt: now, updatedAt: now
    };
    db.countries.push(record);
    countryNames.add(key);
    countriesAdded++;
  });

  saveData(db);
  return { regionsAdded, countriesAdded };
}
