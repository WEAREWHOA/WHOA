-- Retires the legacy `WHOA-<NAME>15` ambassador code format.
--
-- Codes are generated from an account's own name run together now
-- (generateAmbassadorCode in lib/store.ts: first + last, uppercased,
-- non-alphanumerics stripped, 20 chars max, numeric suffix on collision) —
-- "Jane Doe" becomes JANEDOE. Accounts created before that change still
-- carry the old pattern, and the code is customer-facing: it's the referral
-- URL (/r/<code>), the promo code typed at checkout, and the text inside
-- the Square discount name on every attributed order, online and at the
-- register alike.
--
-- Three steps, in order:
--   1. Make the code column renameable at all (ON UPDATE CASCADE).
--   2. Rename every legacy code to the current format.
--   3. Keep the old code working anyway, as a link slug.
--
-- Safe to run more than once: each step no-ops if it's already been done.

-- 1. Every table pointing at ambassadors(code) was created with the default
-- ON UPDATE NO ACTION, so renaming a code would raise a foreign key
-- violation rather than following through. Rebuild each of those
-- constraints with ON UPDATE CASCADE, reusing the existing definition so
-- each one keeps its own ON DELETE behaviour (CASCADE for most,
-- SET NULL for event_rsvps.account_code).
do $$
declare
  fk record;
  definition text;
begin
  for fk in
    select
      con.conname,
      con.conrelid::regclass::text as child_table,
      pg_get_constraintdef(con.oid) as def
    from pg_constraint con
    where con.contype = 'f'
      and con.confrelid = 'ambassadors'::regclass
      and pg_get_constraintdef(con.oid) not like '%ON UPDATE CASCADE%'
  loop
    definition := fk.def || ' ON UPDATE CASCADE';
    execute format('alter table %s drop constraint %I', fk.child_table, fk.conname);
    execute format('alter table %s add constraint %I %s', fk.child_table, fk.conname, definition);
  end loop;
end $$;

-- 2. Rename the legacy codes. The SQL below mirrors generateAmbassadorCode
-- rather than inventing its own scheme, so an account renamed here gets
-- exactly the code it would have been given had it signed up today.
do $$
declare
  account record;
  parts text[];
  base text;
  candidate text;
  suffix int;
begin
  for account in
    select code, name from ambassadors where code like 'WHOA-%15'
  loop
    parts := regexp_split_to_array(btrim(coalesce(account.name, '')), '\s+');

    -- First name + last name run together; a single-word name uses just it.
    base := upper(regexp_replace(
      coalesce(parts[1], '') ||
        case when coalesce(array_length(parts, 1), 0) > 1
             then parts[array_length(parts, 1)]
             else '' end,
      '[^A-Za-z0-9]', '', 'g'));
    base := left(base, 20);
    if base = '' then
      base := 'AMBASSADOR';
    end if;

    -- Same collision rule as the app: plain base first, then 2, 3, 4...
    candidate := base;
    suffix := 1;
    while exists (select 1 from ambassadors where code = candidate) loop
      suffix := suffix + 1;
      candidate := left(base, 20 - length(suffix::text)) || suffix::text;
    end loop;

    update ambassadors set code = candidate where code = account.code;

    -- A default link's slug is its account's code (ensureDefaultLink in
    -- lib/store.ts), so move it onto the new code first. This has to happen
    -- BEFORE the legacy link below, or that insert collides with this row's
    -- old slug, gets skipped by the ON CONFLICT, and the old code is left
    -- pointing nowhere once this update runs.
    update links
    set slug = candidate
    where ambassador_code = candidate
      and slug = account.code
      and not exists (select 1 from links other where other.slug = candidate);

    -- 3. The old code stays live. /r/<slug> and the promo code box at
    -- checkout both resolve through links.slug (getLinkBySlug), so giving
    -- the account a link whose slug is its former code means every card,
    -- sticker, story link and word-of-mouth promo code already out in the
    -- world keeps working and keeps being attributed to them.
    insert into links (id, ambassador_code, label, slug, clicks, created_at)
    values (
      'link_legacy_' || lower(replace(account.code, '-', '_')),
      candidate,
      'Old code (' || account.code || ')',
      account.code,
      0,
      now()
    )
    on conflict (slug) do nothing;
  end loop;
end $$;
