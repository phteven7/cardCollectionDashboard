import { DerivedInventoryRecord, Filters, LookupValues, SortState } from "../lib/types";
import { formatCurrency } from "../lib/utils";

interface InventoryTableProps {
  records: DerivedInventoryRecord[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
  sortState: SortState;
  onSort: (key: SortState["key"]) => void;
  onSelect: (record: DerivedInventoryRecord) => void;
  selectedAppId: string;
  players: string[];
  years: string[];
  sets: string[];
  lookups: LookupValues;
}

function SortButton({
  label,
  field,
  sortState,
  onSort
}: {
  label: string;
  field: SortState["key"];
  sortState: SortState;
  onSort: (key: SortState["key"]) => void;
}) {
  const active = sortState.key === field;
  return (
    <button type="button" className="sort-button" onClick={() => onSort(field)}>
      {label} {active ? (sortState.direction === "asc" ? "↑" : "↓") : ""}
    </button>
  );
}

export function InventoryTable({
  records,
  filters,
  setFilters,
  sortState,
  onSort,
  onSelect,
  selectedAppId,
  players,
  years,
  sets,
  lookups
}: InventoryTableProps) {
  return (
    <section className="panel inventory-panel">
      <div className="panel-header">
        <h2>Inventory</h2>
        <span>{records.length} visible cards</span>
      </div>

      <div className="filters-grid">
        <input
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          placeholder="Search player, set, notes, ladder ID"
        />
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as Filters["status"] })}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="sold">Sold</option>
        </select>
        <select value={filters.player} onChange={(event) => setFilters({ ...filters, player: event.target.value })}>
          <option value="">All players</option>
          {players.map((player) => (
            <option key={player} value={player}>
              {player}
            </option>
          ))}
        </select>
        <select value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })}>
          <option value="">All years</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select value={filters.set} onChange={(event) => setFilters({ ...filters, set: event.target.value })}>
          <option value="">All sets</option>
          {sets.map((setName) => (
            <option key={setName} value={setName}>
              {setName}
            </option>
          ))}
        </select>
        <select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
          <option value="">All categories</option>
          {lookups.categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select value={filters.condition} onChange={(event) => setFilters({ ...filters, condition: event.target.value })}>
          <option value="">All conditions</option>
          {lookups.conditions.map((condition) => (
            <option key={condition} value={condition}>
              {condition}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th><SortButton label="Player" field="player" sortState={sortState} onSort={onSort} /></th>
              <th><SortButton label="Year" field="year" sortState={sortState} onSort={onSort} /></th>
              <th><SortButton label="Set" field="set" sortState={sortState} onSort={onSort} /></th>
              <th>Category</th>
              <th>Condition</th>
              <th><SortButton label="Investment" field="investment" sortState={sortState} onSort={onSort} /></th>
              <th><SortButton label="Estimated" field="estimatedValue" sortState={sortState} onSort={onSort} /></th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.appId}
                className={record.appId === selectedAppId ? "selected-row" : undefined}
                onClick={() => onSelect(record)}
              >
                <td>
                  {record.image ? (
                    <span className="inventory-thumb-frame">
                      <img className="inventory-thumb" src={record.image} alt={`${record.player} card`} loading="lazy" />
                    </span>
                  ) : (
                    <span className="inventory-thumb inventory-thumb--empty" aria-label="No image available">
                      No image
                    </span>
                  )}
                </td>
                <td>{record.player}</td>
                <td>{record.year}</td>
                <td>{record.set}{record.variation ? ` / ${record.variation}` : ""}</td>
                <td>{record.category}</td>
                <td>{record.condition}</td>
                <td>{formatCurrency(record.investment)}</td>
                <td>{formatCurrency(record.estimatedValue ?? 0)}</td>
                <td>{record.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
