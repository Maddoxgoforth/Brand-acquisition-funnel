import Link from "next/link";
import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { ASSET_KINDS, assetKindLabel, listPartnerAssets } from "@/lib/crm/partnerAccount";
import { addPartnerAssetAction, deletePartnerAssetAction } from "../actions";
import Shell from "../Shell";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  missing_title: "Give the asset a name.",
  bad_url: "That link doesn't look right. Paste the full link (https://...).",
  full: "You've reached the limit of 200 assets. Delete some first.",
};
const input =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const SORTS = [
  ["recent", "Recently added"],
  ["oldest", "Oldest first"],
  ["name", "Name (A–Z)"],
] as const;

export default async function PartnerAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; error?: string; added?: string; sort?: string; q?: string }>;
}) {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  const sp = await searchParams;
  const sort = sp.sort === "oldest" || sp.sort === "name" ? sp.sort : "recent";
  const q = (sp.q ?? "").slice(0, 100);
  const assets = await listPartnerAssets(partner.id, sort, q);
  const adding = sp.new === "1";

  return (
    <Shell partner={partner} active="/partner/assets">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Marketing Assets</h1>
          <p className="mt-0.5 text-sm text-slate-600">Keep links to your VSLs, webinars, ad campaigns and docs in one place.</p>
        </div>
        <Link href="/partner/assets?new=1" className="whitespace-nowrap rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          + Add new asset
        </Link>
      </div>

      {sp.added ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Asset added.</p> : null}

      {adding ? (
        <form action={addPartnerAssetAction} className="mt-5 grid gap-4 rounded-xl border border-slate-200/80 p-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-950" htmlFor="title">Name</label>
            <input id="title" name="title" required maxLength={140} placeholder="e.g. Pressure washing VSL" className={input} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-950" htmlFor="kind">Type</label>
            <select id="kind" name="kind" className={input} defaultValue="vsl">
              {ASSET_KINDS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-950" htmlFor="url">Link</label>
            <input id="url" name="url" required placeholder="https://" className={input} />
            <p className="mt-1 text-xs text-slate-500">For a PDF or image, upload it to Google Drive or Dropbox and paste the share link.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-950" htmlFor="notes">Notes (optional)</label>
            <input id="notes" name="notes" maxLength={500} className={input} />
          </div>
          {sp.error ? <p className="text-sm font-medium text-red-600 sm:col-span-2">{ERRORS[sp.error] ?? "Something went wrong. Try again."}</p> : null}
          <div className="flex items-center gap-3 sm:col-span-2">
            <button type="submit" className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Add asset</button>
            <Link href="/partner/assets" className="text-sm font-medium text-slate-600 hover:text-slate-950">Cancel</Link>
          </div>
        </form>
      ) : null}

      <form className="mt-5 flex gap-2" action="/partner/assets">
        <select name="sort" defaultValue={sort} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-950">
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input name="q" defaultValue={q} placeholder="Search marketing assets" className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
        <button type="submit" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50">Search</button>
      </form>

      {assets.length === 0 ? (
        <div className="py-16 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">★</span>
          <p className="mt-3 font-semibold text-slate-950">{q ? "No assets match that search" : "No assets yet"}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">Add a link to a VSL, webinar or ad campaign, or a shared PDF, doc or image.</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200/80 rounded-xl border border-slate-200/80">
          {assets.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">
                  {a.title} <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{assetKindLabel(a.kind)}</span>
                </p>
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="block truncate text-[13px] text-indigo-600 hover:underline">
                  {a.url}
                </a>
                {a.notes ? <p className="mt-0.5 text-[13px] text-slate-600">{a.notes}</p> : null}
              </div>
              <form action={deletePartnerAssetAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-xs font-medium text-slate-500 hover:text-red-600">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
