export interface InventoryRow {
  appId: string;
  frameName: string;
  datePurchased: string;
  quantity: number;
  player: string;
  year: string;
  set: string;
  variation: string;
  number: string;
  category: string;
  condition: string;
  investment: number;
  estimatedValue: number | null;
  ladderId: string;
  notes: string;
  dateSold: string;
  soldPrice: number | null;
  image: string;
  createdAt: string;
  updatedAt: string;
  lastImportedAt: string;
}

export interface InventoryRecord extends InventoryRow {
  rowNumber: number;
}

export interface DerivedInventoryRecord extends InventoryRecord {
  status: "active" | "sold";
  unrealizedDelta: number;
  realizedProfit: number;
}

export interface LookupValues {
  categories: string[];
  conditions: string[];
}

export interface AppSnapshot {
  databaseName: string;
  databasePath: string;
  inventory: InventoryRecord[];
  lookups: LookupValues;
  lastUpdatedAt: string;
}

export interface ValidationError {
  field: keyof InventoryRow | "csv";
  message: string;
}

export interface ImportPreviewRow {
  action: "new" | "matched" | "invalid";
  sourceRowNumber: number;
  sourceName?: string;
  ladderId: string;
  appId?: string;
  errors: string[];
  row?: InventoryRow;
}

export interface ImportPreview {
  newCount: number;
  matchedCount: number;
  invalidCount: number;
  duplicateLadderIds: string[];
  rows: ImportPreviewRow[];
}

export interface DashboardStats {
  totalRows: number;
  totalQuantity: number;
  totalInvestment: number;
  totalEstimatedValue: number;
}

export interface SortState {
  key: keyof DerivedInventoryRecord;
  direction: "asc" | "desc";
}

export interface Filters {
  search: string;
  status: "all" | "active" | "sold";
  image: "all" | "missing" | "with-image";
  player: string;
  year: string;
  set: string;
  category: string;
  condition: string;
}

export interface CardTrackerApi {
  loadSnapshot(): Promise<AppSnapshot>;
  saveRecord(row: InventoryRow): Promise<AppSnapshot>;
  importRows(rows: InventoryRow[]): Promise<AppSnapshot>;
  deleteRecord(appId: string): Promise<AppSnapshot>;
  openExternal(url: string): Promise<void>;
}

declare global {
  interface Window {
    cardTracker?: CardTrackerApi;
  }
}
