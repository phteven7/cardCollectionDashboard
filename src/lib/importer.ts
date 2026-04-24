import Papa from "papaparse";
import { CARD_LADDER_HEADERS, REQUIRED_CARD_LADDER_HEADERS } from "./constants";
import { ImportPreview, InventoryRecord, InventoryRow } from "./types";
import { validateInventoryRow } from "./model";
import { isoNow, uuid } from "./utils";

function normalizeImportedRow(raw: Record<string, string>, current?: InventoryRecord): InventoryRow {
  return {
    appId: current?.appId ?? uuid(),
    datePurchased: raw["Date Purchased"]?.trim() ?? "",
    quantity: Number(raw["Quantity"]?.trim() || 1),
    player: raw["Player"]?.trim() ?? "",
    year: raw["Year"]?.trim() ?? "",
    set: raw["Set"]?.trim() ?? "",
    variation: raw["Variation"]?.trim() ?? "",
    number: raw["Number"]?.trim() ?? "",
    category: raw["Category"]?.trim() ?? "",
    condition: raw["Condition"]?.trim() ?? "",
    investment: Number(raw["Investment"]?.trim() || 0),
    estimatedValue: raw["Estimated Value"]?.trim() ? Number(raw["Estimated Value"].trim()) : null,
    ladderId: raw["Ladder ID"]?.trim() ?? "",
    notes: raw["Notes"]?.trim() ?? "",
    dateSold: raw["Date Sold"]?.trim() ?? "",
    soldPrice: raw["Sold Price"]?.trim() ? Number(raw["Sold Price"].trim()) : null,
    image: raw["Image"]?.trim() ?? "",
    createdAt: current?.createdAt ?? isoNow(),
    updatedAt: isoNow(),
    lastImportedAt: isoNow()
  };
}

export function parseCardLadderPreview(csvText: string, existingRows: InventoryRecord[]): ImportPreview {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });

  const headers = parsed.meta.fields ?? [];
  const expected = [...CARD_LADDER_HEADERS];

  if (headers.join("|") !== expected.join("|")) {
    return {
      newCount: 0,
      matchedCount: 0,
      invalidCount: 1,
      duplicateLadderIds: [],
      rows: [
        {
          action: "invalid",
          sourceRowNumber: 1,
          ladderId: "",
          errors: ["CSV headers do not exactly match the Card Ladder export format."]
        }
      ]
    };
  }

  const missingRequiredHeaders = REQUIRED_CARD_LADDER_HEADERS.filter((header) => !headers.includes(header));
  if (missingRequiredHeaders.length) {
    return {
      newCount: 0,
      matchedCount: 0,
      invalidCount: 1,
      duplicateLadderIds: [],
      rows: [
        {
          action: "invalid",
          sourceRowNumber: 1,
          ladderId: "",
          errors: [`Missing required headers: ${missingRequiredHeaders.join(", ")}`]
        }
      ]
    };
  }

  const existingDuplicates = duplicateIds(existingRows.map((row) => row.ladderId));
  const importDuplicates = duplicateIds(parsed.data.map((row) => (row["Ladder ID"] ?? "").trim()));
  const duplicateLadderIds = [...new Set([...existingDuplicates, ...importDuplicates])];
  const byLadderId = new Map(existingRows.filter((row) => row.ladderId).map((row) => [row.ladderId, row]));

  const rows = parsed.data.map((raw, index) => {
    const ladderId = (raw["Ladder ID"] ?? "").trim();
    const current = ladderId ? byLadderId.get(ladderId) : undefined;
    const normalized = normalizeImportedRow(raw, current);
    const errors = validateInventoryRow(normalized).map((error) => error.message);

    return {
      action: errors.length ? "invalid" : current ? "matched" : "new",
      sourceRowNumber: index + 2,
      ladderId,
      appId: current?.appId,
      errors,
      row: errors.length ? undefined : normalized
    } satisfies ImportPreview["rows"][number];
  });

  return {
    newCount: rows.filter((row) => row.action === "new").length,
    matchedCount: rows.filter((row) => row.action === "matched").length,
    invalidCount: rows.filter((row) => row.action === "invalid").length,
    duplicateLadderIds,
    rows
  };
}
function duplicateIds(ids: string[]) {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const normalized = id.trim();
    if (!normalized) {
      continue;
    }
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}
