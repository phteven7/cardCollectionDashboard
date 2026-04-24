import { ImportPreview } from "../lib/types";

interface ImportPanelProps {
  preview: ImportPreview | null;
  readOnly: boolean;
  importing: boolean;
  onChooseFile: (file: File | null) => void;
  onApply: () => void;
}

export function ImportPanel({ preview, readOnly, importing, onChooseFile, onApply }: ImportPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Card Ladder Import</h2>
      </div>
      <input
        type="file"
        accept=".csv,text/csv"
        disabled={readOnly}
        onChange={(event) => onChooseFile(event.target.files?.[0] ?? null)}
      />
      {readOnly ? <p className="helper-text">Imports are unavailable until the local database loads.</p> : null}

      {preview ? (
        <div className="import-preview">
          <div className="import-stats">
            <span>New: {preview.newCount}</span>
            <span>Matched: {preview.matchedCount}</span>
            <span>Invalid: {preview.invalidCount}</span>
          </div>
          {preview.duplicateLadderIds.length ? (
            <p className="error-text">Duplicate Ladder IDs blocked: {preview.duplicateLadderIds.join(", ")}</p>
          ) : null}
          <div className="import-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Action</th>
                  <th>Ladder ID</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 25).map((row) => (
                  <tr key={`${row.sourceRowNumber}-${row.ladderId}`}>
                    <td>{row.sourceRowNumber}</td>
                    <td>{row.action}</td>
                    <td>{row.ladderId || "—"}</td>
                    <td>{row.errors.join("; ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="primary-button"
            disabled={readOnly || importing || preview.invalidCount > 0 || preview.duplicateLadderIds.length > 0}
            onClick={onApply}
          >
            {importing ? "Applying..." : "Apply Import"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
