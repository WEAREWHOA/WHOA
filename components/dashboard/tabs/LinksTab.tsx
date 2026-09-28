"use client";

import QRCode from "qrcode";
import { useMemo, useState, useTransition } from "react";
import CopyField from "@/components/portal/CopyField";
import { deleteUtmLinkAction, saveUtmLinksAction } from "@/app/utm-links/actions";
import { channelById, classifyChannel } from "@/lib/channels";
import {
  SUGGESTED_PATHS,
  UTM_PLATFORMS,
  buildUtmUrl,
  normalizeLinkPath,
  placementById,
  platformForPlacement,
  previewChannel,
  slugifyTag,
  sourceWarning,
  tagKey,
} from "@/lib/utmLinks";
import type { UtmLink, UtmPerformance } from "@/lib/utmLinkStore";

const FIELD =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm outline-none focus:border-flame-2";
const LABEL = "text-xs font-semibold tracking-wide text-muted uppercase";
const CHIP = "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors";
const CHIP_ON = "bg-foreground text-background";
const CHIP_OFF = "border border-border-strong text-muted hover:text-foreground";
const SMALL_BTN =
  "rounded-full border border-border-strong px-4 py-1.5 text-xs font-semibold uppercase transition-colors hover:border-flame-2/60";

const CUSTOM_ID = "custom";

interface Draft {
  key: string;
  name: string;
  source: string;
  medium: string;
}

/** A QR for any link, generated in the browser and downloadable as a PNG for print. */
function QrButton({ url, filename }: { url: string; filename: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  async function toggle() {
    if (dataUrl) {
      setDataUrl(null);
      return;
    }
    try {
      setDataUrl(await QRCode.toDataURL(url, { margin: 2, width: 720 }));
    } catch {
      // A URL too long for a QR code; nothing useful to show.
    }
  }

  return (
    <div>
      <button type="button" onClick={toggle} className={SMALL_BTN}>
        {dataUrl ? "Hide QR" : "QR"}
      </button>
      {dataUrl && (
        <div className="mt-3 flex items-end gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL, nothing for next/image to optimise */}
          <img src={dataUrl} alt={`QR code for ${url}`} className="h-36 w-36 rounded-lg bg-white p-1" />
          <a href={dataUrl} download={`${filename}.png`} className="text-xs font-semibold text-flame hover:underline">
            Download PNG
          </a>
        </div>
      )}
    </div>
  );
}

function StatLine({ stats }: { stats?: { sessions: number; engaged: number; converted: number; lastSeen: string } }) {
  if (!stats || stats.sessions === 0) {
    return <p className="text-xs text-muted">No visits yet</p>;
  }
  return (
    <p className="text-xs text-muted">
      <span className="font-semibold text-foreground">{stats.sessions.toLocaleString()}</span> visits ·{" "}
      {stats.engaged.toLocaleString()} browsed on ·{" "}
      <span className="text-flame">{stats.converted.toLocaleString()}</span> reached checkout / check-in · last{" "}
      {new Date(stats.lastSeen).toLocaleDateString()}
    </p>
  );
}

/**
 * UTM LINKS: build → save → track.
 *
 * Pick every place a link is going (one Instagram story, or the whole
 * launch across every channel), the page and the campaign, and it writes
 * a correctly tagged link for each. Tags are never typed free-hand unless
 * someone deliberately opens "custom", and even then they're slugged and
 * checked against how the dashboard will file them.
 */
export default function LinksTab({
  origin,
  links,
  performance,
}: {
  origin: string;
  links: UtmLink[] | null;
  performance: UtmPerformance;
}) {
  const [selected, setSelected] = useState<string[]>(["instagram:bio"]);
  const [path, setPath] = useState("/");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [label, setLabel] = useState("");
  const [customSource, setCustomSource] = useState("");
  const [customMedium, setCustomMedium] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const [query, setQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("ALL");

  const library = useMemo(() => links ?? [], [links]);
  const knownCampaigns = useMemo(
    () => [...new Set(library.map((l) => l.campaign))].sort(),
    [library],
  );

  const campaignSlug = slugifyTag(campaign);
  const contentSlug = slugifyTag(content);
  const cleanPath = normalizeLinkPath(path);

  const drafts: Draft[] = useMemo(() => {
    return selected.flatMap((id): Draft[] => {
      if (id === CUSTOM_ID) {
        const source = slugifyTag(customSource);
        const medium = slugifyTag(customMedium);
        if (!source || !medium) return [];
        return [{ key: id, name: `Custom · ${source} / ${medium}`, source, medium }];
      }
      const placement = placementById(id);
      const platform = platformForPlacement(id);
      if (!placement || !platform) return [];
      return [{ key: id, name: `${platform.label} · ${placement.label}`, source: placement.source, medium: placement.medium }];
    });
  }, [selected, customSource, customMedium]);

  const customWarning = selected.includes(CUSTOM_ID) ? sourceWarning(customSource) : null;
  const ready = Boolean(campaignSlug) && drafts.length > 0;

  function toggle(id: string) {
    setMessage(null);
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function toggleWholePlatform(platformId: string) {
    const platform = UTM_PLATFORMS.find((p) => p.id === platformId);
    if (!platform) return;
    const ids = platform.placements.map((pl) => pl.id);
    const allOn = ids.every((id) => selected.includes(id));
    setSelected((current) =>
      allOn ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])],
    );
  }

  function selectEveryOrganic() {
    // Everything but ads: a launch kit usually goes out organically first,
    // and a paid link that nobody runs is a row that says nothing.
    const ids = UTM_PLATFORMS.flatMap((p) => p.placements)
      .filter((pl) => !/^(paid_social|cpc)$/.test(pl.medium))
      .map((pl) => pl.id);
    setSelected(ids);
  }

  const urlFor = (d: Draft) =>
    buildUtmUrl(origin, { path: cleanPath, source: d.source, medium: d.medium, campaign: campaignSlug, content: contentSlug });

  function copyAll() {
    const text = drafts.map((d) => `${d.name}\n${urlFor(d)}`).join("\n\n");
    navigator.clipboard?.writeText(text).then(
      () => setMessage({ ok: true, text: `Copied ${drafts.length} ${drafts.length === 1 ? "link" : "links"}.` }),
      () => setMessage({ ok: false, text: "Your browser blocked the clipboard — copy them one by one below." }),
    );
  }

  function saveAll() {
    startSaving(async () => {
      const result = await saveUtmLinksAction(
        drafts.map((d) => ({
          label: label.trim() ? (drafts.length > 1 ? `${label.trim()} — ${d.name}` : label.trim()) : d.name,
          path: cleanPath,
          source: d.source,
          medium: d.medium,
          campaign: campaignSlug,
          content: contentSlug,
        })),
      );
      if (!result.ok) {
        setMessage({ ok: false, text: result.error ?? "Couldn't save." });
        return;
      }
      const skipped = drafts.length - result.saved;
      setMessage({
        ok: true,
        text:
          `Saved ${result.saved} ${result.saved === 1 ? "link" : "links"} to the library.` +
          (skipped > 0 ? ` ${skipped} ${skipped === 1 ? "was" : "were"} already there.` : ""),
      });
    });
  }

  // ── library ──────────────────────────────────────────────────────
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter((l) => {
      if (campaignFilter !== "ALL" && l.campaign !== campaignFilter) return false;
      if (!q) return true;
      return [l.label, l.path, l.source, l.medium, l.campaign, l.content].some((f) => f?.toLowerCase().includes(q));
    });
  }, [library, query, campaignFilter]);

  // Tagged traffic arriving from links that aren't in the library: hand-
  // typed tags, old links, typos. The thing this whole tab exists to stop.
  const strays = useMemo(() => {
    const saved = new Set(library.map((l) => tagKey(l.source, l.medium, l.campaign)));
    return Object.entries(performance.byTags)
      .filter(([key]) => !saved.has(key))
      .map(([, stats]) => stats)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 25);
  }, [library, performance]);

  const totalTagged = Object.values(performance.byTags).reduce((sum, s) => sum + s.sessions, 0);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Build ── */}
      <div className="card-surface rounded-2xl border border-border p-5">
        <h3 className="font-display text-xl tracking-wide">Build tracked links</h3>
        <p className="mt-0.5 text-sm text-muted">
          Pick every place the link is going. You get one correctly tagged link for each, all filed under the
          right channel in ANALYTICS.
        </p>

        {/* 1 — where */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={LABEL}>1 · Where is it going?</span>
            <div className="flex gap-3 text-xs font-semibold uppercase">
              <button type="button" onClick={selectEveryOrganic} className="text-flame hover:underline">
                Every channel
              </button>
              <button type="button" onClick={() => setSelected([])} className="text-muted hover:text-foreground">
                Clear
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {UTM_PLATFORMS.map((platform) => (
              <div key={platform.id} className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleWholePlatform(platform.id)}
                  className="w-28 shrink-0 text-left text-sm font-semibold hover:text-flame"
                  title={`Select every ${platform.label} placement`}
                >
                  {platform.label}
                </button>
                {platform.placements.map((pl) => {
                  const on = selected.includes(pl.id);
                  return (
                    <button
                      key={pl.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(pl.id)}
                      className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
                    >
                      {pl.label}
                    </button>
                  );
                })}
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-sm font-semibold">Other</span>
              <button
                type="button"
                aria-pressed={selected.includes(CUSTOM_ID)}
                onClick={() => toggle(CUSTOM_ID)}
                className={`${CHIP} ${selected.includes(CUSTOM_ID) ? CHIP_ON : CHIP_OFF}`}
              >
                Custom source
              </button>
            </div>

            {selected.includes(CUSTOM_ID) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={LABEL}>utm_source</span>
                  <input
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                    placeholder="e.g. linkedin, partner-shop"
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  <span className={LABEL}>utm_medium</span>
                  <input
                    value={customMedium}
                    onChange={(e) => setCustomMedium(e.target.value)}
                    placeholder="e.g. post, referral, sms"
                    className={FIELD}
                  />
                </label>
                {customWarning && <p className="text-xs text-flame-3 sm:col-span-2">⚠ {customWarning}</p>}
              </div>
            )}
          </div>
        </div>

        {/* 2 — what */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>2 · Page it lands on</span>
            <input
              list="utm-paths"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/shop or a full product URL"
              className={FIELD}
            />
            <datalist id="utm-paths">
              {SUGGESTED_PATHS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className={LABEL}>3 · Campaign</span>
            <input
              list="utm-campaigns"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="e.g. fall-drop-2026, evergreen"
              className={FIELD}
            />
            <datalist id="utm-campaigns">
              {["evergreen", ...knownCampaigns.filter((c) => c !== "evergreen")].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {campaign && campaignSlug !== campaign && (
              <span className="mt-1 block text-xs text-muted">
                Will be saved as <span className="font-mono-code text-flame">{campaignSlug || "—"}</span>
              </span>
            )}
          </label>

          <label className="block">
            <span className={LABEL}>Content (optional)</span>
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Which post or button, e.g. story-1, reel-0928"
              className={FIELD}
            />
            <span className="mt-1 block text-xs text-muted">Shows in Google Analytics only.</span>
          </label>

          <label className="block">
            <span className={LABEL}>Name in the library (optional)</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Fall drop launch"
              className={FIELD}
            />
          </label>
        </div>

        {/* 3 — results */}
        <div className="mt-6 border-t border-border pt-5">
          {!ready ? (
            <p className="text-sm text-muted">
              {drafts.length === 0 ? "Pick at least one place above" : "Add a campaign name"} to see your links.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  {drafts.length} {drafts.length === 1 ? "link" : "links"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={copyAll} className={SMALL_BTN}>
                    Copy all
                  </button>
                  <button
                    type="button"
                    onClick={saveAll}
                    disabled={saving || links === null}
                    className="btn-flame rounded-full px-5 py-1.5 text-xs font-semibold uppercase disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save to library"}
                  </button>
                </div>
              </div>

              {message && (
                <p className={`mt-2 text-sm ${message.ok ? "text-flame" : "text-flame-3"}`}>{message.text}</p>
              )}

              <ul className="mt-4 flex flex-col gap-4">
                {drafts.map((d) => {
                  const url = urlFor(d);
                  const channel = previewChannel({ source: d.source, medium: d.medium, path: cleanPath });
                  return (
                    <li key={d.key}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{d.name}</p>
                        <span className="bg-flame-2/15 text-flame-3 rounded-full px-2.5 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase">
                          Counts as {channel.label}
                        </span>
                      </div>
                      <CopyField value={url} mono compact />
                      <div className="mt-2">
                        <QrButton url={url} filename={`${campaignSlug}-${d.source}-${d.medium}`} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* ── Library ── */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-xl tracking-wide">Link library</h3>
            <p className="mt-0.5 text-sm text-muted">
              Every saved link and what it brought in over the last {performance.periodDays} days.
              {performance.truncated ? " (Counts are a minimum — there was more traffic than one read covers.)" : ""}
            </p>
          </div>
          <p className="text-xs text-muted">
            {totalTagged.toLocaleString()} tagged visits in {performance.periodDays} days
          </p>
        </div>

        {links === null ? (
          <p className="mt-4 rounded-xl border border-border px-5 py-4 text-sm text-muted">
            The link library isn&apos;t set up yet — run migration <span className="font-mono-code">0034_utm_links.sql</span>{" "}
            in Supabase. The builder above works without it; links just can&apos;t be saved.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search links…"
                className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm outline-none focus:border-flame-2"
              />
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm outline-none focus:border-flame-2"
              >
                <option value="ALL">All campaigns</option>
                {knownCampaigns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {shown.length === 0 ? (
              <p className="mt-4 rounded-xl border border-border px-5 py-4 text-sm text-muted">
                {library.length === 0
                  ? "No saved links yet — build some above and hit Save to library."
                  : "No links match that."}
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {shown.map((link) => {
                  const url = buildUtmUrl(origin, {
                    path: link.path,
                    source: link.source,
                    medium: link.medium,
                    campaign: link.campaign,
                    content: link.content ?? undefined,
                  });
                  const channel = previewChannel(link);
                  return (
                    <li key={link.id} className="card-surface rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-lg">{link.label || `${link.source} / ${link.medium}`}</p>
                            <span className="bg-flame-2/15 text-flame-3 rounded-full px-2.5 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase">
                              {channel.label}
                            </span>
                            <span className="rounded-full border border-border-strong px-2.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-muted uppercase">
                              {link.campaign}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {link.path} · {link.source} / {link.medium}
                            {link.content ? ` · ${link.content}` : ""}
                            {link.createdBy ? ` · by ${link.createdBy}` : ""}
                          </p>
                          <div className="mt-1">
                            <StatLine stats={performance.byTags[tagKey(link.source, link.medium, link.campaign)]} />
                          </div>
                        </div>
                        <form action={deleteUtmLinkAction}>
                          <input type="hidden" name="id" value={link.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-border-strong px-4 py-1.5 text-xs font-semibold text-muted uppercase transition-colors hover:text-flame-3"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                      <CopyField value={url} mono compact />
                      <div className="mt-2">
                        <QrButton url={url} filename={`${link.campaign}-${link.source}-${link.medium}`} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {/* ── Strays ── */}
      {strays.length > 0 && (
        <div>
          <h3 className="font-display text-xl tracking-wide">Tagged traffic not from the library</h3>
          <p className="mt-0.5 text-sm text-muted">
            Visits carrying UTM tags that don&apos;t match a saved link — old links, hand-typed tags, or typos.
            Rebuild them above so they&apos;re counted in one place.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted uppercase">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 font-semibold">Source</th>
                  <th className="px-4 py-2 font-semibold">Medium</th>
                  <th className="px-4 py-2 font-semibold">Campaign</th>
                  <th className="px-4 py-2 font-semibold">Counted as</th>
                  <th className="px-4 py-2 text-right font-semibold">Visits</th>
                  <th className="px-4 py-2 text-right font-semibold">Converted</th>
                </tr>
              </thead>
              <tbody>
                {strays.map((s) => (
                  <tr key={tagKey(s.source, s.medium, s.campaign)} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-mono-code">{s.source || "—"}</td>
                    <td className="px-4 py-2 font-mono-code">{s.medium || "—"}</td>
                    <td className="px-4 py-2 font-mono-code">{s.campaign || "—"}</td>
                    <td className="px-4 py-2 text-muted">
                      {channelById(classifyChannel({ utmSource: s.source, utmMedium: s.medium })).label}
                    </td>
                    <td className="px-4 py-2 text-right">{s.sessions.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{s.converted.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
