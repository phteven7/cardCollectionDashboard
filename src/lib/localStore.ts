import { AppSnapshot, InventoryRow } from "./types";

function getDesktopApi() {
  if (!window.cardTracker) {
    throw new Error("Local database API is unavailable. Run CardTracker from the Electron app.");
  }

  return window.cardTracker;
}

export function loadSnapshot(): Promise<AppSnapshot> {
  return getDesktopApi().loadSnapshot();
}

export function saveInventoryRow(row: InventoryRow): Promise<AppSnapshot> {
  return getDesktopApi().saveRecord(row);
}

export function batchSaveInventoryRows(rows: InventoryRow[]): Promise<AppSnapshot> {
  return getDesktopApi().importRows(rows);
}

export function deleteInventoryRow(appId: string): Promise<AppSnapshot> {
  return getDesktopApi().deleteRecord(appId);
}
