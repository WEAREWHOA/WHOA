"use client";

import { useMemo, useState } from "react";
import {
  ROLODEX_STATUSES,
  categoriesInUse,
  searchContacts,
  type RolodexContact,
} from "@/lib/rolodex";
import { createContactAction, deleteContactAction, updateContactAction } from "@/app/rolodex/actions";

const FIELD =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm outline-none focus:border-flame-2";
const LABEL = "text-xs font-semibold tracking-wide text-muted uppercase";

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={FIELD}
      />
    </label>
  );
}

/**
 * Every field of a contact, used for both creating and editing.
 *
 * One component rather than two forms kept in step by hand: an edit form
 * that's quietly missing a field the create form has is how a CRM starts
 * losing data.
 */
function ContactFields({
  contact,
  categories,
}: {
  contact?: RolodexContact;
  categories: string[];
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" name="name" required defaultValue={contact?.name} placeholder="Who they are" />
        <Field label="Company" name="company" defaultValue={contact?.company ?? ""} placeholder="Shop, venue, label…" />
        <Field label="Phone" name="phone" type="tel" defaultValue={contact?.phone ?? ""} />
        <Field label="Email" name="email" type="email" defaultValue={contact?.email ?? ""} />
        <Field label="Website" name="website" type="url" defaultValue={contact?.website ?? ""} placeholder="https://" />
        <Field label="Instagram" name="instagram" defaultValue={contact?.instagram ?? ""} placeholder="@handle" />
        <Field label="City" name="city" defaultValue={contact?.city ?? ""} />
        <Field
          label="Last contacted"
          name="lastContactedAt"
          type="date"
          defaultValue={contact?.lastContactedAt ?? ""}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={LABEL}>Category</span>
          <select name="category" defaultValue={contact?.category ?? "RETAILER"} className={FIELD}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        {/* Typing here beats the picker, so a new kind of relationship can
            be filed the moment it exists rather than forced into OTHER. */}
        <Field label="…or a new category" name="newCategory" placeholder="e.g. DISTRIBUTOR" />

        <label className="block">
          <span className={LABEL}>Status</span>
          <select name="status" defaultValue={contact?.status ?? "LEAD"} className={FIELD}>
            {ROLODEX_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block">
        <span className={LABEL}>Type of partnership</span>
        <input
          name="partnership"
          type="text"
          defaultValue={contact?.partnership ?? ""}
          placeholder="Stocks the hoodie line · books us for WHOA Wednesday · prints our blanks"
          className={FIELD}
        />
      </label>

      <label className="mt-3 block">
        <span className={LABEL}>Notes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={contact?.notes ?? ""}
          placeholder="How you met, what they asked for, who introduced you…"
          className={FIELD}
        />
      </label>
    </>
  );
}

function ContactRow({ contact, categories }: { contact: RolodexContact; categories: string[] }) {
  const [editing, setEditing] = useState(false);

  const lines = [
    contact.company,
    contact.partnership,
    contact.city,
    contact.lastContactedAt ? `Last contacted ${contact.lastContactedAt}` : null,
  ].filter(Boolean);

  return (
    <li className="card-surface rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg">{contact.name}</p>
            <span className="bg-flame-2/15 text-flame-3 rounded-full px-2.5 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase">
              {contact.category}
            </span>
            <span className="rounded-full border border-border-strong px-2.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-muted uppercase">
              {contact.status}
            </span>
          </div>

          {lines.length > 0 && <p className="mt-1 text-sm text-muted">{lines.join(" · ")}</p>}

          {/* Tappable on a phone — the whole point of having a number in
              your pocket is not having to retype it. */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="text-flame hover:underline">
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="text-flame hover:underline">
                {contact.email}
              </a>
            )}
            {contact.website && (
              <a
                href={contact.website}
                target="_blank"
                rel="noreferrer"
                className="text-flame hover:underline"
              >
                Website
              </a>
            )}
            {contact.instagram && (
              <a
                href={`https://instagram.com/${contact.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="text-flame hover:underline"
              >
                @{contact.instagram}
              </a>
            )}
          </div>

          {contact.notes && <p className="mt-2 text-sm text-foreground/80">{contact.notes}</p>}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setEditing((open) => !open)}
            className="rounded-full border border-border-strong px-4 py-1.5 text-xs font-semibold uppercase transition-colors hover:border-flame-2/60"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <form action={deleteContactAction}>
            <input type="hidden" name="id" value={contact.id} />
            <button
              type="submit"
              className="rounded-full border border-border-strong px-4 py-1.5 text-xs font-semibold text-muted uppercase transition-colors hover:text-flame-3"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {editing && (
        <form action={updateContactAction} className="mt-4 border-t border-border pt-4">
          <input type="hidden" name="id" value={contact.id} />
          <ContactFields contact={contact} categories={categories} />
          <button type="submit" className="btn-flame mt-4 rounded-full px-6 py-2.5 text-sm">
            Save changes
          </button>
        </form>
      )}
    </li>
  );
}

/**
 * ROLODEX: search at the top, add below it, browse the book underneath.
 *
 * Filtering happens in the browser against the whole list rather than
 * round-tripping per keystroke — a contact book is hundreds of rows, and
 * instant results are most of what makes one usable instead of a
 * spreadsheet nobody opens.
 */
export default function RolodexTab({ contacts }: { contacts: RolodexContact[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [adding, setAdding] = useState(false);

  const categories = useMemo(() => categoriesInUse(contacts), [contacts]);

  const shown = useMemo(() => {
    let list = searchContacts(contacts, query);
    if (category !== "ALL") list = list.filter((c) => c.category === category);
    if (status !== "ALL") list = list.filter((c) => c.status === status);
    return list;
  }, [contacts, query, category, status]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1 — Search */}
      <div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a name, shop, city, handle, or anything in the notes…"
          className="w-full rounded-xl border border-border-strong bg-surface-raised px-5 py-4 text-base outline-none focus:border-flame-2"
        />
        <p className="mt-2 text-xs text-muted">
          {contacts.length} {contacts.length === 1 ? "contact" : "contacts"} in the book
          {query || category !== "ALL" || status !== "ALL" ? ` · ${shown.length} showing` : ""}
        </p>
      </div>

      {/* 2 — Create entry */}
      <div className="card-surface rounded-2xl border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl tracking-wide">Add a contact</h3>
            <p className="mt-0.5 text-sm text-muted">
              Only a name is required — the rest can be filled in later.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdding((open) => !open)}
            className={
              adding
                ? "rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold uppercase text-muted transition-colors hover:text-foreground"
                : "btn-flame rounded-full px-6 py-2.5 text-sm font-semibold uppercase"
            }
          >
            {adding ? "Close" : "New entry"}
          </button>
        </div>

        {adding && (
          <form action={createContactAction} className="mt-4 border-t border-border pt-4">
            <ContactFields categories={categories} />
            <button type="submit" className="btn-flame mt-4 rounded-full px-8 py-3 text-sm">
              Save contact
            </button>
          </form>
        )}
      </div>

      {/* 3 — Browse & filter */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm outline-none focus:border-flame-2"
          >
            <option value="ALL">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm outline-none focus:border-flame-2"
          >
            <option value="ALL">Any status</option>
            {ROLODEX_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {(query || category !== "ALL" || status !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("ALL");
                setStatus("ALL");
              }}
              className="text-xs font-semibold text-muted uppercase transition-colors hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {shown.length === 0 ? (
          <p className="mt-4 rounded-xl border border-border px-5 py-4 text-sm text-muted">
            {contacts.length === 0
              ? "Nothing in the rolodex yet — add the first contact above."
              : "No contacts match that. Try a different search or clear the filters."}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {shown.map((contact) => (
              <ContactRow key={contact.id} contact={contact} categories={categories} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
