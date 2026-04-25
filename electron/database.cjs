const fs = require("node:fs");
const path = require("node:path");
const initSqlJs = require("sql.js");

let handlersRegistered = false;
let storePromise = null;
const DEFAULT_FRAME_NAME = "Personal Collection";

function resolveWasmPath() {
  const candidates = [
    path.join(__dirname, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
    path.join(process.resourcesPath ?? "", "app.asar.unpacked", "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
    path.join(process.resourcesPath ?? "", "app.asar", "node_modules", "sql.js", "dist", "sql-wasm.wasm")
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Unable to find the SQLite runtime file.");
}

async function createStore(app) {
  const SQL = await initSqlJs({
    locateFile: () => resolveWasmPath()
  });

  const dbPath = path.join(app.getPath("userData"), "cardtracker.db");
  const bytes = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  const db = bytes ? new SQL.Database(bytes) : new SQL.Database();

  initializeSchema(db);
  setMetaValue(db, "schemaVersion", "3");
  if (!bytes) {
    setMetaValue(db, "createdAt", new Date().toISOString());
  }
  persistDatabase(dbPath, db);

  return { db, dbPath };
}

function getStore(app) {
  if (!storePromise) {
    storePromise = createStore(app);
  }

  return storePromise;
}

function initializeSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      app_id TEXT PRIMARY KEY,
      date_purchased TEXT NOT NULL DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 1,
      player TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      set_name TEXT NOT NULL DEFAULT '',
      variation TEXT NOT NULL DEFAULT '',
      card_number TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      card_condition TEXT NOT NULL DEFAULT '',
      investment REAL NOT NULL DEFAULT 0,
      estimated_value REAL,
      ladder_id TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      date_sold TEXT NOT NULL DEFAULT '',
      sold_price REAL,
      image TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      last_imported_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  ensureColumn(db, "inventory", "frame_name", `TEXT NOT NULL DEFAULT 'Personal Collection'`);

  db.run(`
    CREATE INDEX IF NOT EXISTS inventory_updated_at_idx ON inventory(updated_at DESC);
    CREATE INDEX IF NOT EXISTS inventory_frame_name_idx ON inventory(frame_name);
    CREATE INDEX IF NOT EXISTS inventory_ladder_id_idx ON inventory(ladder_id);
  `);
}

function ensureColumn(db, tableName, columnName, definition) {
  const statement = db.prepare(`PRAGMA table_info(${tableName})`);
  let exists = false;

  while (statement.step()) {
    if (String(statement.getAsObject().name ?? "") === columnName) {
      exists = true;
      break;
    }
  }

  statement.free();

  if (!exists) {
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function persistDatabase(dbPath, db) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function setMetaValue(db, key, value) {
  const statement = db.prepare(`
    INSERT INTO meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  statement.run([key, value]);
  statement.free();
}

function getMetaValue(db, key) {
  const statement = db.prepare("SELECT value FROM meta WHERE key = ?");
  statement.bind([key]);
  const value = statement.step() ? String(statement.getAsObject().value ?? "") : "";
  statement.free();
  return value;
}

function normalizeInventoryRow(row, rowNumber) {
  return {
    appId: String(row.app_id ?? ""),
    frameName: String(row.frame_name ?? DEFAULT_FRAME_NAME) || DEFAULT_FRAME_NAME,
    datePurchased: String(row.date_purchased ?? ""),
    quantity: Number(row.quantity ?? 1),
    player: String(row.player ?? ""),
    year: String(row.year ?? ""),
    set: String(row.set_name ?? ""),
    variation: String(row.variation ?? ""),
    number: String(row.card_number ?? ""),
    category: String(row.category ?? ""),
    condition: String(row.card_condition ?? ""),
    investment: Number(row.investment ?? 0),
    estimatedValue: row.estimated_value === null || row.estimated_value === undefined ? null : Number(row.estimated_value),
    ladderId: String(row.ladder_id ?? ""),
    notes: String(row.notes ?? ""),
    dateSold: String(row.date_sold ?? ""),
    soldPrice: row.sold_price === null || row.sold_price === undefined ? null : Number(row.sold_price),
    image: String(row.image ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    lastImportedAt: String(row.last_imported_at ?? ""),
    rowNumber
  };
}

function buildSnapshot(store) {
  const statement = store.db.prepare(`
    SELECT
      app_id,
      frame_name,
      date_purchased,
      quantity,
      player,
      year,
      set_name,
      variation,
      card_number,
      category,
      card_condition,
      investment,
      estimated_value,
      ladder_id,
      notes,
      date_sold,
      sold_price,
      image,
      created_at,
      updated_at,
      last_imported_at
    FROM inventory
    ORDER BY updated_at DESC, player ASC, app_id ASC
  `);

  const inventory = [];
  let rowNumber = 2;

  while (statement.step()) {
    inventory.push(normalizeInventoryRow(statement.getAsObject(), rowNumber));
    rowNumber += 1;
  }

  statement.free();

  const categories = [...new Set(inventory.map((row) => row.category).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  const conditions = [...new Set(inventory.map((row) => row.condition).filter(Boolean))].sort((left, right) => left.localeCompare(right));

  return {
    databaseName: path.basename(store.dbPath),
    databasePath: store.dbPath,
    inventory,
    lookups: {
      categories,
      conditions
    },
    lastUpdatedAt: getMetaValue(store.db, "lastWriteAt") || new Date().toISOString()
  };
}

function upsertInventoryRow(db, row) {
  const statement = db.prepare(`
    INSERT INTO inventory (
      app_id,
      frame_name,
      date_purchased,
      quantity,
      player,
      year,
      set_name,
      variation,
      card_number,
      category,
      card_condition,
      investment,
      estimated_value,
      ladder_id,
      notes,
      date_sold,
      sold_price,
      image,
      created_at,
      updated_at,
      last_imported_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(app_id) DO UPDATE SET
      frame_name = excluded.frame_name,
      date_purchased = excluded.date_purchased,
      quantity = excluded.quantity,
      player = excluded.player,
      year = excluded.year,
      set_name = excluded.set_name,
      variation = excluded.variation,
      card_number = excluded.card_number,
      category = excluded.category,
      card_condition = excluded.card_condition,
      investment = excluded.investment,
      estimated_value = excluded.estimated_value,
      ladder_id = excluded.ladder_id,
      notes = excluded.notes,
      date_sold = excluded.date_sold,
      sold_price = excluded.sold_price,
      image = excluded.image,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      last_imported_at = excluded.last_imported_at
  `);

  statement.run([
    row.appId,
    row.frameName || DEFAULT_FRAME_NAME,
    row.datePurchased,
    row.quantity,
    row.player,
    row.year,
    row.set,
    row.variation,
    row.number,
    row.category,
    row.condition,
    row.investment,
    row.estimatedValue,
    row.ladderId,
    row.notes,
    row.dateSold,
    row.soldPrice,
    row.image,
    row.createdAt,
    row.updatedAt,
    row.lastImportedAt
  ]);

  statement.free();
}

async function loadSnapshot(app) {
  const store = await getStore(app);
  return buildSnapshot(store);
}

async function saveRecord(app, row) {
  const store = await getStore(app);

  store.db.run("BEGIN");
  try {
    upsertInventoryRow(store.db, row);
    setMetaValue(store.db, "lastWriteAt", row.updatedAt || new Date().toISOString());
    store.db.run("COMMIT");
  } catch (error) {
    store.db.run("ROLLBACK");
    throw error;
  }

  persistDatabase(store.dbPath, store.db);
  return buildSnapshot(store);
}

async function importRows(app, rows) {
  const store = await getStore(app);
  const lastWriteAt = rows.at(-1)?.updatedAt || new Date().toISOString();

  store.db.run("BEGIN");
  try {
    for (const row of rows) {
      upsertInventoryRow(store.db, row);
    }
    setMetaValue(store.db, "lastWriteAt", lastWriteAt);
    store.db.run("COMMIT");
  } catch (error) {
    store.db.run("ROLLBACK");
    throw error;
  }

  persistDatabase(store.dbPath, store.db);
  return buildSnapshot(store);
}

function registerDatabaseHandlers(app, ipcMain) {
  if (handlersRegistered) {
    return;
  }

  ipcMain.handle("cardtracker:load-snapshot", () => loadSnapshot(app));
  ipcMain.handle("cardtracker:save-record", (_event, row) => saveRecord(app, row));
  ipcMain.handle("cardtracker:import-rows", (_event, rows) => importRows(app, rows));

  handlersRegistered = true;
}

module.exports = {
  registerDatabaseHandlers
};
