import { InventoryRow, LookupValues, ValidationError } from "../lib/types";

interface RecordFormProps {
  row: InventoryRow;
  lookups: LookupValues;
  readOnly: boolean;
  saving: boolean;
  errors: ValidationError[];
  onChange: (row: InventoryRow) => void;
  onSave: () => void;
  onNew: () => void;
}

function errorFor(errors: ValidationError[], field: ValidationError["field"]) {
  return errors.find((error) => error.field === field)?.message;
}

export function RecordForm({ row, lookups, readOnly, saving, errors, onChange, onSave, onNew }: RecordFormProps) {
  return (
    <section className="panel editor-panel">
      <div className="panel-header">
        <h2>Record Editor</h2>
        <button type="button" className="secondary-button" onClick={onNew}>
          New Card
        </button>
      </div>

      <div className="form-grid">
        <label className="full-width">
          Frame
          <input value={row.frameName} onChange={(event) => onChange({ ...row, frameName: event.target.value })} />
        </label>
        <label>
          Date Purchased
          <input value={row.datePurchased} onChange={(event) => onChange({ ...row, datePurchased: event.target.value })} />
          <span>{errorFor(errors, "datePurchased")}</span>
        </label>
        <label>
          Quantity
          <input
            type="number"
            min="1"
            value={row.quantity}
            onChange={(event) => onChange({ ...row, quantity: Number(event.target.value) })}
          />
          <span>{errorFor(errors, "quantity")}</span>
        </label>
        <label>
          Player
          <input value={row.player} onChange={(event) => onChange({ ...row, player: event.target.value })} />
          <span>{errorFor(errors, "player")}</span>
        </label>
        <label>
          Set
          <input value={row.set} onChange={(event) => onChange({ ...row, set: event.target.value })} />
          <span>{errorFor(errors, "set")}</span>
        </label>
        <label>
          Variation
          <input value={row.variation} onChange={(event) => onChange({ ...row, variation: event.target.value })} />
        </label>
        <label>
          Number
          <input value={row.number} onChange={(event) => onChange({ ...row, number: event.target.value })} />
        </label>
        <label>
          Category
          <input
            list="category-options"
            value={row.category}
            onChange={(event) => onChange({ ...row, category: event.target.value })}
            placeholder="Category"
          />
          <datalist id="category-options">
            {lookups.categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <span>{errorFor(errors, "category")}</span>
        </label>
        <label>
          Condition
          <input
            list="condition-options"
            value={row.condition}
            onChange={(event) => onChange({ ...row, condition: event.target.value })}
            placeholder="Condition"
          />
          <datalist id="condition-options">
            {lookups.conditions.map((condition) => (
              <option key={condition} value={condition} />
            ))}
          </datalist>
          <span>{errorFor(errors, "condition")}</span>
        </label>
        <label>
          Year
          <input value={row.year} onChange={(event) => onChange({ ...row, year: event.target.value })} />
          <span>{errorFor(errors, "year")}</span>
        </label>
        <label>
          Estimated Value
          <input
            type="number"
            min="0"
            step="0.01"
            value={row.estimatedValue ?? ""}
            onChange={(event) => onChange({ ...row, estimatedValue: event.target.value ? Number(event.target.value) : null })}
          />
          <span>{errorFor(errors, "estimatedValue")}</span>
        </label>
        <label>
          Investment
          <input
            type="number"
            min="0"
            step="0.01"
            value={row.investment}
            onChange={(event) => onChange({ ...row, investment: Number(event.target.value) })}
          />
          <span>{errorFor(errors, "investment")}</span>
        </label>
        <label>
          Ladder ID
          <input value={row.ladderId} onChange={(event) => onChange({ ...row, ladderId: event.target.value })} />
        </label>
        <label className="full-width">
          Notes
          <textarea rows={4} value={row.notes} onChange={(event) => onChange({ ...row, notes: event.target.value })} />
        </label>
        <label>
          Date Sold
          <input value={row.dateSold} onChange={(event) => onChange({ ...row, dateSold: event.target.value })} />
          <span>{errorFor(errors, "dateSold")}</span>
        </label>
        <label>
          Sold Price
          <input
            type="number"
            min="0"
            step="0.01"
            value={row.soldPrice ?? ""}
            onChange={(event) => onChange({ ...row, soldPrice: event.target.value ? Number(event.target.value) : null })}
          />
          <span>{errorFor(errors, "soldPrice")}</span>
        </label>
        <label className="full-width">
          Image URL
          <input value={row.image} onChange={(event) => onChange({ ...row, image: event.target.value })} />
        </label>
      </div>
      <button type="button" className="primary-button" disabled={readOnly || saving} onClick={onSave}>
        {saving ? "Saving..." : "Save Record"}
      </button>
      {readOnly ? <p className="helper-text">Edits are unavailable until the local database loads.</p> : null}
    </section>
  );
}
