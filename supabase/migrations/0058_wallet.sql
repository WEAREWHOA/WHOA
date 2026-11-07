-- THE WALLET, AND THE WHOA CARD.
--
-- Two things that are easy to confuse, so they are separated here.
--
--   The WALLET is store credit, and everybody has one. A balance on
--   an account, topped up and spent, held by us rather than by a card
--   processor.
--
--   The WHOA CARD is a membership. A metal card sold over the counter
--   for ten dollars, which puts credit in the wallet AND marks the
--   account as a member, which is what the perks hang off.
--
-- Every metal card carries the SAME QR, which lands on /whoa-card and
-- nothing else. So the card proves nothing by itself: whoever sees a
-- photograph of one reaches the same page. What connects "paid ten
-- dollars at the till" to an account is a one-time code the till
-- issues, which is what the claims table below is for.
--
-- Square holds none of the money. This is the whole record, which is
-- why it is a ledger:
--
--   Every movement is a row that is never updated and never deleted.
--   A balance column that is written to is a number with no history:
--   when it is wrong, and one day it will be, there is nothing to
--   rebuild it from and no way to tell a bug from a theft.
--
--   The balance is still stored, as a cache, and only ever changed
--   inside the same statement that writes the ledger row. Summing the
--   ledger on every read is correct and gets slower forever; this is
--   fast AND reconcilable, and one function may touch it.
--
--   Cents, as integers. Money in a float is money that rounds.

-- ─────────────────────────────────────────────────────────────────────
-- One wallet per account
-- ─────────────────────────────────────────────────────────────────────

create table if not exists whoa_wallets (
  id uuid primary key default gen_random_uuid(),

  -- One per account, enforced here rather than hoped for in code. Two
  -- balances for one person is two places to look and one of them
  -- forgotten.
  ambassador_code text not null unique,

  -- What they read out at the till. Kept in the clear because the
  -- owner has to be able to see it in their portal, which rules out a
  -- hash.
  --
  -- The protection is not secrecy of this column but what spending
  -- requires: a staff member signed into the portal or the register.
  -- A leaked code on its own buys nothing. That is a deliberate trade
  -- and the reason it is safe to show.
  credit_code text not null unique,

  balance_cents integer not null default 0 check (balance_cents >= 0),

  -- A card that is lost or being argued about. Keeps its balance and
  -- its history and refuses to move either. Never deleted: the money
  -- is still owed to somebody.
  status text not null default 'active'
    check (status in ('active', 'frozen', 'closed')),

  -- Null until they buy a metal card. A timestamp rather than a
  -- boolean because "since when" is a question somebody will ask, and
  -- because a true/false cannot answer it afterwards.
  member_since timestamptz,

  created_at timestamptz not null default now(),
  note text
);

create index if not exists whoa_wallets_credit_code_idx on whoa_wallets (credit_code);

-- ─────────────────────────────────────────────────────────────────────
-- The ledger
-- ─────────────────────────────────────────────────────────────────────

create table if not exists whoa_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references whoa_wallets(id) on delete restrict,

  -- Never zero. A movement of nothing is not a movement, and a row for
  -- it is noise in the one table that has to stay readable.
  delta_cents integer not null check (delta_cents <> 0),

  -- What the balance was afterwards. Denormalised on purpose: it makes
  -- a statement readable without summing every earlier row, and it
  -- makes a broken balance obvious rather than merely wrong.
  balance_after_cents integer not null check (balance_after_cents >= 0),

  reason text not null check (reason in (
    'card-purchase', -- they bought the metal card over the counter
    'topup',         -- money added later
    'purchase',      -- spent in the shop or at the register
    'refund',        -- a purchase given back
    'adjustment'     -- somebody fixing something by hand
  )),

  reference text,
  actor text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists whoa_wallet_transactions_wallet_idx
  on whoa_wallet_transactions (wallet_id, created_at desc);

-- One movement per reference per card and per reason, so a checkout
-- retried twice cannot charge twice. Partial, because adjustments and
-- counter sales legitimately arrive with no reference.
create unique index if not exists whoa_wallet_transactions_once
  on whoa_wallet_transactions (wallet_id, reason, reference)
  where reference is not null;

-- ─────────────────────────────────────────────────────────────────────
-- Proof that somebody paid
-- ─────────────────────────────────────────────────────────────────────

-- A one-time code handed over at the till.
--
-- This is the piece the shared QR cannot provide. Staff issue one when
-- a card is sold, the buyer redeems it on /whoa-card, and the value
-- lands on their account. It is single use and it expires, so a code
-- photographed over somebody's shoulder is worth nothing for long.
create table if not exists whoa_card_claims (
  id uuid primary key default gen_random_uuid(),

  -- Hashed, unlike the credit code above, because nothing ever needs
  -- to read this one back: it is typed in once and then spent. A
  -- leaked database should not be a pile of redeemable credit.
  code_hash text not null unique,
  last_four text not null,

  value_cents integer not null check (value_cents > 0),

  -- A code sold with a metal card makes the buyer a member; a plain
  -- top-up code only adds credit. One column rather than two kinds of
  -- code, because they are the same object with one thing different
  -- about them.
  grants_membership boolean not null default false,

  issued_by text not null,
  issued_at timestamptz not null default now(),
  -- Unredeemed codes should not be good forever. Ninety days is long
  -- enough that nobody loses money by going on holiday.
  expires_at timestamptz not null default (now() + interval '90 days'),

  redeemed_by text,
  redeemed_at timestamptz,
  note text
);

create index if not exists whoa_card_claims_open_idx
  on whoa_card_claims (issued_at desc)
  where redeemed_at is null;

-- ─────────────────────────────────────────────────────────────────────
-- Moving money
-- ─────────────────────────────────────────────────────────────────────

-- The only thing allowed to change a balance.
--
-- The guard is in the WHERE clause of one update, not in an IF above
-- it. Reading the balance and then deciding is the race that lets two
-- tills spend the same ten dollars; this way Postgres takes the row
-- lock and the second one finds the money already gone.
create or replace function adjust_wallet_balance(
  p_wallet_id uuid,
  p_delta_cents integer,
  p_reason text,
  p_reference text default null,
  p_actor text default null,
  p_note text default null
)
returns table (balance_cents integer, applied boolean, reason_refused text)
language plpgsql
as $$
declare
  v_wallet whoa_wallets%rowtype;
begin
  if p_delta_cents = 0 then
    select c.balance_cents into v_wallet.balance_cents from whoa_wallets c where c.id = p_wallet_id;
    return query select coalesce(v_wallet.balance_cents, 0), false, 'zero'::text;
    return;
  end if;

  -- A frozen card moves in neither direction. Taking money off a
  -- disputed card is as wrong as putting more on it.
  update whoa_wallets c
     set balance_cents = c.balance_cents + p_delta_cents
   where c.id = p_wallet_id
     and c.status = 'active'
     and c.balance_cents + p_delta_cents >= 0
  returning c.* into v_wallet;

  if not found then
    select * into v_wallet from whoa_wallets where id = p_wallet_id;
    if v_wallet.id is null then
      return query select 0, false, 'no-card'::text;
    elsif v_wallet.status <> 'active' then
      return query select v_wallet.balance_cents, false, v_wallet.status;
    else
      return query select v_wallet.balance_cents, false, 'insufficient'::text;
    end if;
    return;
  end if;

  insert into whoa_wallet_transactions
    (wallet_id, delta_cents, balance_after_cents, reason, reference, actor, note)
  values
    (p_wallet_id, p_delta_cents, v_wallet.balance_cents, p_reason, p_reference, p_actor, p_note);

  return query select v_wallet.balance_cents, true, null::text;
end;
$$;

-- Give an account its card, or hand back the one it has.
--
-- Called the first time somebody lands on /whoa-card signed in, so
-- that a code exists to show them before any money does.
create or replace function ensure_wallet(
  p_ambassador_code text,
  p_credit_code text
)
returns table (wallet_id uuid, credit_code text, balance_cents integer, member_since timestamptz, created boolean)
language plpgsql
as $$
declare
  v_wallet whoa_wallets%rowtype;
begin
  insert into whoa_wallets (ambassador_code, credit_code)
  values (upper(p_ambassador_code), p_credit_code)
  on conflict (ambassador_code) do nothing
  returning * into v_wallet;

  if found then
    return query select v_wallet.id, v_wallet.credit_code, v_wallet.balance_cents, v_wallet.member_since, true;
    return;
  end if;

  select * into v_wallet from whoa_wallets where ambassador_code = upper(p_ambassador_code);
  return query select v_wallet.id, v_wallet.credit_code, v_wallet.balance_cents, v_wallet.member_since, false;
end;
$$;

-- Redeem a till code onto an account's card.
--
-- The claim is marked used in the same statement that checks it is
-- unused, which is what stops one code being redeemed twice by two
-- taps a moment apart. Only then is the money moved, and if that
-- somehow fails the claim is released again rather than being
-- swallowed.
create or replace function redeem_wallet_claim(
  p_code_hash text,
  p_ambassador_code text,
  p_wallet_id uuid
)
returns table (value_cents integer, balance_cents integer, became_member boolean, outcome text)
language plpgsql
as $$
declare
  v_claim whoa_card_claims%rowtype;
  v_result record;
begin
  update whoa_card_claims c
     set redeemed_by = upper(p_ambassador_code),
         redeemed_at = now()
   where c.code_hash = p_code_hash
     and c.redeemed_at is null
     and c.expires_at > now()
  returning c.* into v_claim;

  if not found then
    select * into v_claim from whoa_card_claims where code_hash = p_code_hash;
    if v_claim.id is null then
      return query select 0, 0, false, 'unknown'::text;
    elsif v_claim.redeemed_at is not null then
      return query select 0, 0, false, 'used'::text;
    else
      return query select 0, 0, false, 'expired'::text;
    end if;
    return;
  end if;

  select * into v_result
    from adjust_wallet_balance(p_wallet_id, v_claim.value_cents, 'card-purchase',
                             v_claim.id::text, upper(p_ambassador_code),
                             'Redeemed at the counter');

  -- Membership before the balance check below returns, and only when
  -- the money actually landed: a claim that could not be credited has
  -- not been redeemed, so it must not make anybody a member either.
  if v_result.applied and v_claim.grants_membership then
    update whoa_wallets
       set member_since = coalesce(member_since, now())
     where id = p_wallet_id;
  end if;

  if not v_result.applied then
    -- Put the claim back. A code that took the money nowhere must
    -- still be redeemable, or somebody has paid for nothing.
    update whoa_card_claims
       set redeemed_by = null, redeemed_at = null
     where id = v_claim.id;
    return query select v_claim.value_cents, v_result.balance_cents, false, coalesce(v_result.reason_refused, 'failed');
    return;
  end if;

  return query select v_claim.value_cents, v_result.balance_cents, v_claim.grants_membership, 'redeemed'::text;
end;
$$;

-- Service role only, same as every other table here. Balances are
-- written by server code holding the service key and by nothing else,
-- which is what stops a browser topping itself up.
alter table whoa_wallets enable row level security;
alter table whoa_wallet_transactions enable row level security;
alter table whoa_card_claims enable row level security;
