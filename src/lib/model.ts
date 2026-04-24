import { InventoryRow, DerivedInventoryRecord, DashboardStats, Filters, LookupValues, ValidationError } from "./types";
import { isValidDateString, uniqueSorted } from "./utils";

export function emptyInventoryRow(lookups?: LookupValues): InventoryRow {
  void lookups;
  return {
    appId: "",
    datePurchased: "",
    quantity: 1,
    player: "",
    year: "",
    set: "",
    variation: "",
    number: "",
    category: "",
    condition: "",
    investment: 0,
    estimatedValue: null,
    ladderId: "",
    notes: "",
    dateSold: "",
    soldPrice: null,
    image: "",
    createdAt: "",
    updatedAt: "",
    lastImportedAt: ""
  };
}

export function validateInventoryRow(row: InventoryRow): ValidationError[] {
  const errors: ValidationError[] = [];

  const requiredTextFields: Array<[keyof InventoryRow, string]> = [
    ["datePurchased", "Date Purchased is required."],
    ["player", "Player is required."],
    ["year", "Year is required."],
    ["set", "Set is required."],
    ["category", "Category is required."],
    ["condition", "Condition is required."]
  ];

  for (const [field, message] of requiredTextFields) {
    if (!String(row[field] ?? "").trim()) {
      errors.push({ field, message });
    }
  }

  if (!Number.isInteger(row.quantity) || row.quantity <= 0) {
    errors.push({ field: "quantity", message: "Quantity must be a whole number above 0." });
  }

  if (!Number.isFinite(row.investment) || row.investment < 0) {
    errors.push({ field: "investment", message: "Investment must be 0 or greater." });
  }

  if (row.estimatedValue !== null && (!Number.isFinite(row.estimatedValue) || row.estimatedValue < 0)) {
    errors.push({ field: "estimatedValue", message: "Estimated Value must be 0 or greater." });
  }

  if (row.soldPrice !== null && (!Number.isFinite(row.soldPrice) || row.soldPrice < 0)) {
    errors.push({ field: "soldPrice", message: "Sold Price must be 0 or greater." });
  }

  if (!isValidDateString(row.datePurchased)) {
    errors.push({ field: "datePurchased", message: "Date Purchased must use MM/DD/YYYY." });
  }

  if (!isValidDateString(row.dateSold)) {
    errors.push({ field: "dateSold", message: "Date Sold must use MM/DD/YYYY." });
  }

  return errors;
}

export function deriveRecord(record: InventoryRow & { rowNumber: number }): DerivedInventoryRecord {
  const sold = Boolean(record.dateSold || record.soldPrice !== null);
  return {
    ...record,
    status: sold ? "sold" : "active",
    unrealizedDelta: sold ? 0 : (record.estimatedValue ?? 0) - record.investment,
    realizedProfit: sold ? (record.soldPrice ?? 0) - record.investment : 0
  };
}

export function calculateDashboard(records: DerivedInventoryRecord[]): DashboardStats {
  return records.reduce<DashboardStats>(
    (stats, record) => {
      stats.totalRows += 1;
      stats.totalQuantity += record.quantity;
      stats.totalInvestment += record.investment;
      stats.totalEstimatedValue += record.estimatedValue ?? 0;
      stats.unrealizedGainLoss += record.unrealizedDelta;
      stats.realizedProfitLoss += record.realizedProfit;
      if (record.status === "sold") {
        stats.soldCount += 1;
      }
      return stats;
    },
    {
      totalRows: 0,
      totalQuantity: 0,
      totalInvestment: 0,
      totalEstimatedValue: 0,
      unrealizedGainLoss: 0,
      realizedProfitLoss: 0,
      soldCount: 0
    }
  );
}

export function filterRecords(records: DerivedInventoryRecord[], filters: Filters) {
  const search = filters.search.trim().toLowerCase();

  return records.filter((record) => {
    if (filters.status !== "all" && record.status !== filters.status) {
      return false;
    }

    if (filters.player && record.player !== filters.player) {
      return false;
    }

    if (filters.year && record.year !== filters.year) {
      return false;
    }

    if (filters.set && record.set !== filters.set) {
      return false;
    }

    if (filters.category && record.category !== filters.category) {
      return false;
    }

    if (filters.condition && record.condition !== filters.condition) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      record.player,
      record.year,
      record.set,
      record.variation,
      record.number,
      record.category,
      record.condition,
      record.notes,
      record.ladderId
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });
}

export function sortRecords<T>(
  records: T[],
  key: keyof T,
  direction: "asc" | "desc"
) {
  const sign = direction === "asc" ? 1 : -1;
  return [...records].sort((left, right) => {
    const leftValue = left[key];
    const rightValue = right[key];

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * sign;
    }

    return String(leftValue ?? "").localeCompare(String(rightValue ?? "")) * sign;
  });
}

export function filterOptions(records: DerivedInventoryRecord[], key: keyof DerivedInventoryRecord) {
  return uniqueSorted(records.map((record) => String(record[key] ?? "")));
}
