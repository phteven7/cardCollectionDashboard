import { useEffect, useMemo, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { ImportPanel } from "./components/ImportPanel";
import { InventoryTable } from "./components/InventoryTable";
import { RecordForm } from "./components/RecordForm";
import { StatusBanner } from "./components/StatusBanner";
import { batchSaveInventoryRows, loadSnapshot, saveInventoryRow } from "./lib/localStore";
import { APP_VERSION, CARD_LADDER_CATEGORIES, CARD_LADDER_CONDITIONS } from "./lib/constants";
import { parseCardLadderFramesPreview } from "./lib/importer";
import { calculateDashboard, deriveRecord, emptyInventoryRow, filterOptions, filterRecords, sortRecords, validateInventoryRow } from "./lib/model";
import { AppSnapshot, DerivedInventoryRecord, Filters, ImportPreview, InventoryRecord, InventoryRow, LookupValues, SortState, ValidationError } from "./lib/types";
import { isoNow, uuid } from "./lib/utils";

const EMPTY_LOOKUPS: LookupValues = {
  categories: [...CARD_LADDER_CATEGORIES],
  conditions: [...CARD_LADDER_CONDITIONS]
};

function mergeLookups(lookups: LookupValues): LookupValues {
  return {
    categories: [...new Set([...CARD_LADDER_CATEGORIES, ...lookups.categories])],
    conditions: [...new Set([...CARD_LADDER_CONDITIONS, ...lookups.conditions])]
  };
}

function asInventoryRow(record: InventoryRecord | DerivedInventoryRecord): InventoryRow {
  const { rowNumber, ...row } = record;
  void rowNumber;
  return row;
}

function SelectedCardPreview({ row }: { row: InventoryRow }) {
  const cardName = [row.year, row.player, row.set].filter(Boolean).join(" ");
  const detail = [row.variation, row.condition].filter(Boolean).join(" / ");

  return (
    <section className="panel selected-card-panel">
      <div className="panel-header">
        <div>
          <h2>Selected Card</h2>
          <p>{cardName || "Choose a card from inventory"}</p>
        </div>
      </div>

      <div className="selected-card-preview">
        {row.image ? (
          <img src={row.image} alt={`${cardName || row.player || "Selected"} card`} />
        ) : (
          <div className="selected-card-placeholder">
            <span>No image</span>
          </div>
        )}
      </div>

      {detail ? <p className="selected-card-detail">{detail}</p> : null}
    </section>
  );
}

export default function App() {
  const [records, setRecords] = useState<DerivedInventoryRecord[]>([]);
  const [lookups, setLookups] = useState<LookupValues>(EMPTY_LOOKUPS);
  const [selected, setSelected] = useState<InventoryRow>(emptyInventoryRow());
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [sortState, setSortState] = useState<SortState>({ key: "updatedAt", direction: "desc" });
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
    player: "",
    year: "",
    set: "",
    category: "",
    condition: ""
  });
  const [statusMode, setStatusMode] = useState<"ready" | "error">("error");
  const [statusMessage, setStatusMessage] = useState("Loading local database...");
  const [databaseName, setDatabaseName] = useState("");
  const [databasePath, setDatabasePath] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  useEffect(() => {
    void refreshSnapshot();
  }, []);

  function applySnapshot(snapshot: AppSnapshot) {
    const mergedLookups = mergeLookups(snapshot.lookups);
    setRecords(snapshot.inventory.map(deriveRecord));
    setLookups(mergedLookups);
    setDatabaseName(snapshot.databaseName);
    setDatabasePath(snapshot.databasePath);
    setLastUpdatedAt(snapshot.lastUpdatedAt);
    setSelected((current) => {
      if (!current.appId) {
        return emptyInventoryRow(mergedLookups);
      }

      const matchingRow = snapshot.inventory.find((record) => record.appId === current.appId);
      return matchingRow ? asInventoryRow(matchingRow) : emptyInventoryRow(mergedLookups);
    });
  }

  async function refreshSnapshot() {
    setLoading(true);
    try {
      const snapshot = await loadSnapshot();
      applySnapshot(snapshot);
      setStatusMode("ready");
      setStatusMessage(`Database ready: ${snapshot.databaseName}`);
    } catch (error) {
      setStatusMode("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to load the local database.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(record: DerivedInventoryRecord) {
    const { status, unrealizedDelta, realizedProfit, ...inventoryRecord } = record;
    void status;
    void unrealizedDelta;
    void realizedProfit;
    setSelected(asInventoryRow(inventoryRecord));
    setErrors([]);
  }

  async function handleSave() {
    const nextRow: InventoryRow = {
      ...selected,
      appId: selected.appId || uuid(),
      createdAt: selected.createdAt || isoNow(),
      updatedAt: isoNow()
    };

    const validation = validateInventoryRow(nextRow);
    setErrors(validation);
    if (validation.length) {
      return;
    }

    setSaving(true);
    try {
      const snapshot = await saveInventoryRow(nextRow);
      applySnapshot(snapshot);
      setSelected(nextRow);
      setStatusMode("ready");
      setStatusMessage(`Saved record to ${snapshot.databaseName}.`);
    } catch (error) {
      setStatusMode("error");
      setStatusMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImportFiles(files: File[]) {
    if (!files.length) {
      setPreview(null);
      return;
    }

    const frames = await Promise.all(files.map(async (file) => ({
      name: file.name,
      text: await file.text()
    })));
    setPreview(parseCardLadderFramesPreview(frames, records));
  }

  async function handleApplyImport() {
    if (!preview) {
      return;
    }

    setImporting(true);
    try {
      const rows = preview.rows.flatMap((row) => (row.row ? [row.row] : []));
      const snapshot = await batchSaveInventoryRows(rows);
      applySnapshot(snapshot);
      setPreview(null);
      setStatusMode("ready");
      setStatusMessage(`Imported ${rows.length} rows into ${snapshot.databaseName}.`);
    } catch (error) {
      setStatusMode("error");
      setStatusMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  const visibleRecords = useMemo(() => {
    const filtered = filterRecords(records, filters);
    return sortRecords(filtered, sortState.key, sortState.direction);
  }, [filters, records, sortState.direction, sortState.key]);

  const stats = useMemo(() => calculateDashboard(visibleRecords), [visibleRecords]);
  const players = useMemo(() => filterOptions(records, "player"), [records]);
  const years = useMemo(() => filterOptions(records, "year"), [records]);
  const sets = useMemo(() => filterOptions(records, "set"), [records]);

  return (
    <main className="app-shell">
      <div className="app-top">
        <header className="hero">
          <div>
            <p className="eyebrow">CardTracker {APP_VERSION}</p>
            <h1>Collection Dashboard</h1>
            {databasePath ? <p className="hero-copy">Database: {databasePath}</p> : null}
          </div>
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={() => void refreshSnapshot()} disabled={loading}>
              {loading ? "Loading..." : "Reload"}
            </button>
          </div>
        </header>

        <StatusBanner
          databaseName={databaseName}
          lastUpdatedAt={lastUpdatedAt}
          mode={statusMode}
          message={statusMessage}
        />

        <Dashboard stats={stats} />
      </div>

      <div className="main-grid">
        <InventoryTable
          records={visibleRecords}
          filters={filters}
          setFilters={setFilters}
          sortState={sortState}
          onSort={(key) => setSortState((current) => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
          }))}
          onSelect={handleSelect}
          selectedAppId={selected.appId}
          players={players}
          years={years}
          sets={sets}
          lookups={lookups}
        />

        <div className="side-column">
          <SelectedCardPreview row={selected} />

          <RecordForm
            row={selected}
            lookups={lookups}
            readOnly={statusMode !== "ready"}
            saving={saving}
            errors={errors}
            onChange={setSelected}
            onSave={() => void handleSave()}
            onNew={() => {
              setSelected(emptyInventoryRow(lookups));
              setErrors([]);
            }}
          />

          <ImportPanel
            preview={preview}
            readOnly={statusMode !== "ready"}
            importing={importing}
            onChooseFiles={(files) => void handleImportFiles(files)}
            onApply={() => void handleApplyImport()}
          />
        </div>
      </div>
    </main>
  );
}
