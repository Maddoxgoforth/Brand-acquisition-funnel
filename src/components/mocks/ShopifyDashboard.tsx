import { ReactNode } from "react";
import GrowthChart from "./GrowthChart";

type Stat = {
  label: string;
  value: string;
  delta?: string;
};

export default function ShopifyDashboard({
  storeInitials,
  storeName,
  dateRange,
  stats,
  chartPath,
  chartAreaPath,
  chartLabels,
  footer,
}: {
  storeInitials: string;
  storeName: string;
  dateRange: string;
  stats: Stat[];
  chartPath: string;
  chartAreaPath: string;
  chartLabels: string[];
  footer?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-lg">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-fuchsia-600 text-[10px] font-bold text-white">
            {storeInitials}
          </span>
          <span className="text-sm font-semibold">{storeName}</span>
        </div>
        <span aria-hidden className="text-zinc-400">
          🔔
        </span>
      </div>

      <div className="px-4 pt-3">
        <div className="h-9 rounded-md bg-zinc-100 px-3 text-sm leading-9 text-zinc-400">
          🔍 Search
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pt-3">
        <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600">
          {dateRange} ⌄
        </span>
        <span className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700">
          ⌗ Report
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 pt-4 text-xs">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-zinc-500">{stat.label}</p>
            <p className="text-base font-bold text-zinc-900">{stat.value}</p>
            {stat.delta ? (
              <p className="font-medium text-emerald-600">↗ {stat.delta}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="px-4 pt-3">
        <GrowthChart
          path={chartPath}
          areaPath={chartAreaPath}
          gridLabels={chartLabels}
        />
      </div>

      {footer ? <div className="mt-2">{footer}</div> : <div className="pb-4" />}
    </div>
  );
}
