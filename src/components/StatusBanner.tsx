import { formatDateTime } from "../lib/utils";

interface StatusBannerProps {
  databaseName: string;
  lastUpdatedAt: string;
  mode: "ready" | "error";
  message?: string;
}

export function StatusBanner({ databaseName, lastUpdatedAt, mode, message }: StatusBannerProps) {
  return (
    <section className={`status-banner status-banner--${mode}`}>
      <div>
        <strong>{mode === "ready" ? "Local database" : "Storage status"}</strong>
        <p>{message ?? `Connected database: ${databaseName || "CardTracker"}`}</p>
      </div>
      <span>Last saved: {formatDateTime(lastUpdatedAt)}</span>
    </section>
  );
}
