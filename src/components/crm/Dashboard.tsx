"use client";

import { SOURCES, type Stats } from "@/lib/crm/constants";

function percent(value: number | null) {
  return value === null ? "–" : `${(value * 100).toFixed(1)}%`;
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className="mt-2 text-4xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}

export default function Dashboard({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return <p className="p-8 text-muted">Loading dashboard…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6">
      <section>
        <h2 className="text-lg font-extrabold">Free course opt-ins</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Past 24 hours"
            value={String(stats.freeCourseOptIns.day)}
            detail="New free-course applications"
          />
          <StatCard
            label="Past 7 days"
            value={String(stats.freeCourseOptIns.week)}
            detail="New free-course applications"
          />
          <StatCard
            label="Past 30 days"
            value={String(stats.freeCourseOptIns.month)}
            detail="New free-course applications"
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold">Calls and closes</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total leads"
            value={String(stats.totalLeads)}
            detail={`${stats.dialed} dialed so far`}
          />
          <StatCard
            label="Leads closed"
            value={String(stats.closed)}
            detail="Leads in the Closed column"
          />
          <StatCard
            label="Conversion rate"
            value={percent(stats.conversionRate)}
            detail={`${stats.closed} closed out of ${stats.dialed} dialed`}
          />
          <StatCard
            label="Answer rate"
            value={percent(stats.answerRate)}
            detail={`${stats.answered} picked up out of ${stats.dialed} dialed`}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          A lead counts as dialed once it leaves To dial or is called from the
          CRM. It counts as answered when it sits in Callback, Not interested,
          Closed or Do not call.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-extrabold">By list</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-widest text-muted">
              <tr>
                <th className="px-5 py-3 font-bold">List</th>
                <th className="px-5 py-3 text-right font-bold">Leads</th>
                <th className="px-5 py-3 text-right font-bold">Dialed</th>
                <th className="px-5 py-3 text-right font-bold">Answered</th>
                <th className="px-5 py-3 text-right font-bold">Closed</th>
                <th className="px-5 py-3 text-right font-bold">Answer rate</th>
                <th className="px-5 py-3 text-right font-bold">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {stats.bySource.map((row) => (
                <tr key={row.source} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-semibold">
                    {SOURCES.find((s) => s.id === row.source)?.label}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.total}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.dialed}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.answered}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.closed}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {percent(row.dialed ? row.answered / row.dialed : null)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {percent(row.dialed ? row.closed / row.dialed : null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
