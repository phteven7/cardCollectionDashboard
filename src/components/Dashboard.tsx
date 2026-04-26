import { DashboardStats } from "../lib/types";
import { formatCurrency } from "../lib/utils";

interface DashboardProps {
  stats: DashboardStats;
}

const items = [
  { key: "totalRows", label: "Total Rows", format: (value: number) => value.toString() },
  { key: "totalQuantity", label: "Total Quantity", format: (value: number) => value.toString() },
  { key: "totalInvestment", label: "Total Investment", format: formatCurrency },
  { key: "totalEstimatedValue", label: "Estimated Value", format: formatCurrency }
] as const satisfies Array<{
  key: keyof DashboardStats;
  label: string;
  format: (value: number) => string;
}>;

export function Dashboard({ stats }: DashboardProps) {
  return (
    <section className="dashboard-grid">
      {items.map((item) => (
        <article key={item.key} className="dashboard-card">
          <span>{item.label}</span>
          <strong>{item.format(stats[item.key])}</strong>
        </article>
      ))}
    </section>
  );
}
