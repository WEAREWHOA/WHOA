"use client";

import { Fragment, useMemo, useState } from "react";

import {
  loadCustomerDirectoryAction,
  loadCustomerOrdersAction,
} from "@/app/customer-admin/actions";
import type { CustomerDirectory, DirectoryRow } from "@/lib/customerDirectory";
import type { CustomerOrderSummary } from "@/lib/squareCustomers";

/**
 * CUSTOMER ADMIN — the rolodex of everyone who has ever bought from WHOA.
 *
 * Two populations in one list, and the difference matters: people with a
 * WHOA account (they can log in, they may be ambassadors) and people
 * Square knows only from the register. Most of the directory is the
 * second kind, which is the whole reason this isn't just the accounts
 * table with a search box on it.
 *
 * The search runs in the browser over the loaded directory rather than
 * asking Square per keystroke — Square's customer search filters on
 * specific fields and can't do "match anything", and a round trip per
 * character would make the box unusable anyway.
 */

type Filter = "all" | "account" | "square-only" | "ambassador";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "EVERYONE" },
  { id: "account", label: "HAS ACCOUNT" },
  { id: "square-only", label: "SQUARE ONLY" },
  { id: "ambassador", label: "AMBASSADORS" },
];

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        timeZone: "America/Los_Angeles",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

/** Everything about a person that's worth matching a search against. */
function haystack(row: DirectoryRow): string {
  return [
    row.name,
    row.email,
    row.phone,
    // Digits only as well, so "6196309551" finds "(619) 630-9551".
    row.phone?.replace(/\D/g, ""),
    row.company,
    row.note,
    row.location,
    row.accountCode,
    row.squareCustomerId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function CustomerAdmin({ initial }: { initial: CustomerDirectory }) {
  const [data, setData] = useState(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [orders, setOrders] = useState<Record<string, { loading: boolean; error?: string; list: CustomerOrderSummary[] }>>({});

  const searchable = useMemo(
    () => data.rows.map((row) => ({ row, text: haystack(row) })),
    [data.rows],
  );

  const filtered = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return searchable
      .filter(({ row }) => {
        if (filter === "account" && !row.hasAccount) return false;
        if (filter === "square-only" && row.hasAccount) return false;
        if (filter === "ambassador" && !row.isAmbassador) return false;
        return true;
      })
      // Every word has to match something, so "sam gmail" narrows rather
      // than widening the way an OR would.
      .filter(({ text }) => terms.every((t) => text.includes(t)))
      .map(({ row }) => row);
  }, [searchable, filter, query]);

  function refresh() {
    setBusy(true);
    loadCustomerDirectoryAction()
      .then((fresh) => {
        if (fresh) setData(fresh);
        setBusy(false);
      })
      .catch(() => setBusy(false));
  }

  function toggle(row: DirectoryRow) {
    const key = row.squareCustomerId ?? row.accountCode ?? "";
    if (open === key) {
      setOpen(null);
      return;
    }
    setOpen(key);

    // Fetched once per customer per visit — reopening a row doesn't ask
    // Square again.
    if (!row.squareCustomerId || orders[key]) return;
    setOrders((prev) => ({ ...prev, [key]: { loading: true, list: [] } }));
    loadCustomerOrdersAction(row.squareCustomerId)
      .then((result) => {
        setOrders((prev) => ({
          ...prev,
          [key]: { loading: false, list: result.orders, error: result.ok ? undefined : result.error },
        }));
      })
      .catch(() => {
        setOrders((prev) => ({
          ...prev,
          [key]: { loading: false, list: [], error: "Couldn't load this customer's orders." },
        }));
      });
  }

  return (
    <div className={`an-root ${busy ? "an-loading" : ""}`}>
      <header className="an-head">
        <div>
          <h2 className="an-title">CUSTOMER ADMIN</h2>
          <p className="an-sub">
            Everyone who has ever bought from WHOA — Square&apos;s directory and this site&apos;s
            accounts, in one searchable list.
          </p>
        </div>
        <button type="button" className="ba-btn" disabled={busy} onClick={refresh}>
          {busy ? "REFRESHING…" : "REFRESH"}
        </button>
      </header>

      {data.squareError && <p className="ba-caution">{data.squareError}</p>}

      {data.truncated && (
        <p className="ba-caution">
          Square has more customers than this tab loads at once, so the oldest profiles
          aren&apos;t listed. Search still covers everything shown below.
        </p>
      )}

      <div className="an-kpis">
        {[
          ["People", data.rows.length.toLocaleString(), "in the directory"],
          ["In Square", data.squareCount.toLocaleString(), "customer profiles"],
          ["WHOA accounts", data.accountCount.toLocaleString(), "can sign in"],
          ["Linked", data.linkedCount.toLocaleString(), "account and Square profile"],
        ].map(([label, value, hint]) => (
          <article key={label} className="an-kpi">
            <p className="an-kpi-value">{value}</p>
            <p className="an-kpi-label">{label}</p>
            <p className="an-kpi-hint">{hint}</p>
          </article>
        ))}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, email, phone, company, note, account code…"
        aria-label="Search customers"
        className="an-search"
      />

      <div className="an-periods" role="tablist" aria-label="Filter">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={`an-period ${filter === id ? "an-period-on" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="an-panel">
        <header className="an-panel-head">
          <h3 className="an-panel-title">
            {filtered.length.toLocaleString()}
            {filtered.length === data.rows.length ? " people" : ` of ${data.rows.length.toLocaleString()}`}
          </h3>
          <span className="an-panel-group">newest first</span>
        </header>

        {filtered.length === 0 ? (
          <p className="an-empty">Nobody matches that search.</p>
        ) : (
          <table className="an-table ba-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Where from</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((row) => {
                const key = row.squareCustomerId ?? row.accountCode ?? "";
                const history = orders[key];
                return (
                  <Fragment key={key}>
                    <tr
                      onClick={() => toggle(row)}
                      className="cust-row"
                      tabIndex={0}
                      role="button"
                      aria-expanded={open === key}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle(row);
                        }
                      }}
                    >
                      <td>
                        <span className="ba-name">{row.name || "—"}</span>
                        {row.isSuperAdmin && <span className="an-journey-meta"> · super admin</span>}
                        {row.isAmbassador && !row.isSuperAdmin && (
                          <span className="an-journey-meta"> · ambassador</span>
                        )}
                        {row.company && row.company !== row.name && (
                          <span className="an-journey-meta"> · {row.company}</span>
                        )}
                      </td>
                      <td className="an-table-path">{row.email ?? "—"}</td>
                      <td className="an-table-path">{row.phone ?? "—"}</td>
                      <td className="an-journey-meta">
                        {row.hasAccount && row.inSquare
                          ? row.matchedByEmail
                            ? "Account + Square (by email)"
                            : "Account + Square"
                          : row.hasAccount
                            ? "WHOA account"
                            : "Square only"}
                      </td>
                      <td className="an-journey-meta">
                        {shortDate(row.accountCreatedAt ?? row.squareCreatedAt)}
                      </td>
                    </tr>

                    {open === key && (
                      <tr>
                        <td colSpan={5}>
                          <div className="cust-detail">
                            <dl className="cust-facts">
                              {row.accountCode && (
                                <div>
                                  <dt>Account</dt>
                                  <dd className="an-table-path">{row.accountCode}</dd>
                                </div>
                              )}
                              {row.squareCustomerId && (
                                <div>
                                  <dt>Square id</dt>
                                  <dd className="an-table-path">{row.squareCustomerId}</dd>
                                </div>
                              )}
                              {row.location && (
                                <div>
                                  <dt>Location</dt>
                                  <dd>{row.location}</dd>
                                </div>
                              )}
                              {row.squareCreatedAt && (
                                <div>
                                  <dt>In Square since</dt>
                                  <dd>{shortDate(row.squareCreatedAt)}</dd>
                                </div>
                              )}
                              {row.accountCreatedAt && (
                                <div>
                                  <dt>Signed up</dt>
                                  <dd>{shortDate(row.accountCreatedAt)}</dd>
                                </div>
                              )}
                            </dl>

                            {row.note && <p className="ba-note">Square note: {row.note}</p>}

                            {!row.squareCustomerId ? (
                              <p className="ba-note">
                                No Square profile linked, so there&apos;s no purchase history to
                                show. One is linked automatically the first time they check out.
                              </p>
                            ) : history?.loading ? (
                              <p className="ba-note">Loading their orders…</p>
                            ) : history?.error ? (
                              <p className="ba-caution">{history.error}</p>
                            ) : history && history.list.length === 0 ? (
                              <p className="ba-note">No orders against this Square profile yet.</p>
                            ) : history ? (
                              <>
                                <p className="ba-note">
                                  <strong>{history.list.length}</strong>{" "}
                                  {history.list.length === 1 ? "order" : "orders"} ·{" "}
                                  <strong>
                                    {money(history.list.reduce((s, o) => s + o.totalCents, 0))}
                                  </strong>{" "}
                                  lifetime
                                </p>
                                <table className="an-table ba-table">
                                  <thead>
                                    <tr>
                                      <th>Date</th>
                                      <th>Items</th>
                                      <th>Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {history.list.slice(0, 25).map((order) => (
                                      <tr key={order.id}>
                                        <td className="an-journey-meta">{shortDate(order.createdAt)}</td>
                                        <td className="an-journey-meta">
                                          {order.lines
                                            .map((l) => `${l.name} × ${l.quantity}`)
                                            .join(", ") || "—"}
                                        </td>
                                        <td className="ba-strong">{money(order.totalCents)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {filtered.length > 500 && (
          <p className="ba-note">
            Showing the first 500. Narrow the search to see the rest — every one of the{" "}
            {filtered.length.toLocaleString()} matches is searchable, only the table is capped.
          </p>
        )}
      </section>
    </div>
  );
}
