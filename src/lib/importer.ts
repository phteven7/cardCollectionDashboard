import Papa from "papaparse";
import { REQUIRED_CARD_LADDER_HEADERS } from "./constants";
import { ImportPreview, InventoryRecord, InventoryRow } from "./types";
import { validateInventoryRow } from "./model";
import { isoNow, uuid } from "./utils";

interface CsvFrame {
  name: string;
  text: string;
}

type RawCsvRow = Record<string, string | undefined>;

const HEADER_ALIASES = {
  estimatedValue: ["Estimated Value", "Current Value"],
  slabSerial: ["Slab Serial #", "Slab Serial", "Serial #"],
  population: ["Population"],
  card: ["Card"]
} as const;

function readCell(raw: RawCsvRow, header: string) {
  return raw[header]?.trim() ?? "";
}

function readFirstCell(raw: RawCsvRow, headers: readonly string[]) {
  for (const header of headers) {
    const value = readCell(raw, header);
    if (value) {
      return value;
    }
  }

  return "";
}

function readNumber(raw: RawCsvRow, headers: readonly string[], fallback: number): number;
function readNumber(raw: RawCsvRow, headers: readonly string[], fallback: null): number | null;
function readNumber(raw: RawCsvRow, headers: readonly string[], fallback: number | null) {
  const value = readFirstCell(raw, headers);
  const normalized = value.replace(/[$,]/g, "");
  return normalized ? Number(normalized) : fallback;
}

function buildNotes(raw: RawCsvRow) {
  const notes = readCell(raw, "Notes");
  const card = readFirstCell(raw, HEADER_ALIASES.card);
  const slabSerial = readFirstCell(raw, HEADER_ALIASES.slabSerial);
  const population = readFirstCell(raw, HEADER_ALIASES.population);
  const details = [
    notes,
    card ? `Card: ${card}` : "",
    slabSerial ? `Slab Serial: ${slabSerial}` : "",
    population ? `Population: ${population}` : ""
  ];

  return details.filter(Boolean).join(" | ");
}

function normalizeImportedRow(raw: RawCsvRow, current?: InventoryRecord): InventoryRow {
  return {
    appId: current?.appId ?? uuid(),
    datePurchased: readCell(raw, "Date Purchased"),
    quantity: readNumber(raw, ["Quantity"], 1),
    player: readCell(raw, "Player"),
    year: readCell(raw, "Year"),
    set: readCell(raw, "Set"),
    variation: readCell(raw, "Variation"),
    number: readCell(raw, "Number"),
    category: readCell(raw, "Category"),
    condition: readCell(raw, "Condition"),
    investment: readNumber(raw, ["Investment"], 0),
    estimatedValue: readNumber(raw, HEADER_ALIASES.estimatedValue, null),
    ladderId: readCell(raw, "Ladder ID"),
    notes: buildNotes(raw),
    dateSold: readCell(raw, "Date Sold"),
    soldPrice: readNumber(raw, ["Sold Price"], null),
    image: readCell(raw, "Image"),
    createdAt: current?.createdAt ?? isoNow(),
    updatedAt: isoNow(),
    lastImportedAt: isoNow()
  };
}

function cardMatchKey(row: Pick<InventoryRow, "datePurchased" | "quantity" | "player" | "year" | "set" | "variation" | "number" | "category" | "condition" | "investment">) {
  return [
    row.datePurchased,
    row.quantity,
    row.player,
    row.year,
    row.set,
    row.variation,
    row.number,
    row.category,
    row.condition,
    row.investment
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

function uniqueRecordMap(records: InventoryRecord[], keyFor: (row: InventoryRecord) => string) {
  const counts = new Map<string, number>();
  const byKey = new Map<string, InventoryRecord>();

  for (const record of records) {
    const key = keyFor(record);
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
    byKey.set(key, record);
  }

  for (const [key, count] of counts) {
    if (count > 1) {
      byKey.delete(key);
    }
  }

  return byKey;
}

function validateHeaders(headers: string[]) {
  const missingRequiredHeaders = REQUIRED_CARD_LADDER_HEADERS.filter((header) => !headers.includes(header));

  if (missingRequiredHeaders.length) {
    return [`Missing required headers: ${missingRequiredHeaders.join(", ")}`];
  }

  if (!headers.includes("Estimated Value") && !headers.includes("Current Value")) {
    return ["Missing value header: Estimated Value or Current Value"];
  }

  return [];
}

function parseSingleCardLadderPreview(
  csvText: string,
  existingRows: InventoryRecord[],
  sourceName?: string,
  claimedAppIds = new Set<string>()
): ImportPreview {
  const parsed = Papa.parse<RawCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });

  const headers = parsed.meta.fields ?? [];
  const headerErrors = validateHeaders(headers);
  if (headerErrors.length) {
    return {
      newCount: 0,
      matchedCount: 0,
      invalidCount: 1,
      duplicateLadderIds: [],
      rows: [
        {
          action: "invalid",
          sourceRowNumber: 1,
          sourceName,
          ladderId: "",
          errors: headerErrors
        }
      ]
    };
  }

  const existingDuplicates = duplicateIds(existingRows.map((row) => row.ladderId));
  const importDuplicates = duplicateIds(parsed.data.map((row) => readCell(row, "Ladder ID")));
  const duplicateLadderIds = [...new Set([...existingDuplicates, ...importDuplicates])];
  const byLadderId = new Map(existingRows.filter((row) => row.ladderId).map((row) => [row.ladderId, row]));
  const byMatchKey = uniqueRecordMap(existingRows.filter((row) => !row.ladderId), cardMatchKey);

  const rows = parsed.data.map((raw, index) => {
    const ladderId = readCell(raw, "Ladder ID");
    const candidate = normalizeImportedRow(raw);
    const fallbackMatch = ladderId ? undefined : byMatchKey.get(cardMatchKey(candidate));
    const current = ladderId ? byLadderId.get(ladderId) : fallbackMatch;
    const alreadyClaimed = current ? claimedAppIds.has(current.appId) : false;
    const effectiveCurrent = alreadyClaimed ? undefined : current;
    const normalized = normalizeImportedRow(raw, effectiveCurrent);
    if (effectiveCurrent) {
      claimedAppIds.add(effectiveCurrent.appId);
    }
    const errors = validateInventoryRow(normalized).map((error) => error.message);

    return {
      action: errors.length ? "invalid" : effectiveCurrent ? "matched" : "new",
      sourceRowNumber: index + 2,
      sourceName,
      ladderId,
      appId: effectiveCurrent?.appId,
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

export function parseCardLadderPreview(
  csvText: string,
  existingRows: InventoryRecord[],
  sourceName?: string
): ImportPreview {
  return parseSingleCardLadderPreview(csvText, existingRows, sourceName);
}

export function parseCardLadderFramesPreview(frames: CsvFrame[], existingRows: InventoryRecord[]): ImportPreview {
  const claimedAppIds = new Set<string>();
  const previews = frames.map((frame) => (
    parseSingleCardLadderPreview(frame.text, existingRows, frame.name, claimedAppIds)
  ));
  const rows = previews.flatMap((preview) => preview.rows);
  const duplicateLadderIds = [
    ...new Set([
      ...previews.flatMap((preview) => preview.duplicateLadderIds),
      ...duplicateIds(rows.map((row) => row.ladderId))
    ])
  ];

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
