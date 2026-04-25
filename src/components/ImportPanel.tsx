import { ImportPreview } from "../lib/types";

interface ImportPanelProps {
  preview: ImportPreview | null;
  readOnly: boolean;
  importing: boolean;
  onChooseFiles: (files: File[]) => void;
  onApply: () => void;
}

export function ImportPanel({ preview, readOnly, importing, onChooseFiles, onApply }: ImportPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Frame Import</h2>
      </div>
      <input
        type="file"
        accept=".csv,text/csv"
        multiple
        disabled={readOnly}
        onChange={(event) => onChooseFiles(Array.from(event.target.files ?? []))}
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
                  <th>Frame</th>
                  <th>Row</th>
                  <th>Action</th>
                  <th>Ladder ID</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 25).map((row) => (
                  <tr key={`${row.sourceName ?? "frame"}-${row.sourceRowNumber}-${row.ladderId}`}>
                    <td>{row.sourceName || "CSV"}</td>
                    <td>{row.sourceRowNumber}</td>
                    <td>{row.action}</td>
                    <td>{row.ladderId || "-"}</td>
                    <td>{row.errors.join("; ") || "-"}</td>
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
