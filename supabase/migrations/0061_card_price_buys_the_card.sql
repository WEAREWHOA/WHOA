-- THE TEN DOLLARS BUYS THE CARD. IT IS NOT CREDIT.
--
-- 0058 built the card as a ten dollar membership that handed the ten
-- dollars straight back as credit, so the card paid for itself and
-- every new holder started at ten dollars. That was wrong about the
-- product. The ten dollars is the price of the card and the membership
-- that comes with it; the balance starts at zero, and the owner loads
-- whatever they want onto it afterwards.
--
-- So a claim code now has two independent jobs, and either on its own
-- is a whole code:
--
--   grants_membership  makes the account a WHOA card holder. No money.
--   value_cents        puts money on the balance. No membership.
--
-- A code sold with a metal card is the first kind and is worth nothing,
-- which is the shape 0058 forbade twice over: value_cents had to be
-- positive, and a zero-value claim that got past that would have been
-- refused by adjust_wallet_balance as a movement of nothing, released
-- again, and reported as a failure. Both are fixed below.
--
-- Codes already issued are left exactly as they are. A ten dollar
-- card code printed under the old promise still credits ten dollars
-- and still grants membership, because somebody was told it would.
-- Only what gets issued from here on changes.

-- ─────────────────────────────────────────────────────────────────────
-- A claim may be worth nothing, as long as it does something
-- ─────────────────────────────────────────────────────────────────────

alter table whoa_card_claims
  drop constraint if exists whoa_card_claims_value_cents_check;
alter table whoa_card_claims
  add constraint whoa_card_claims_value_cents_check
  check (value_cents >= 0);

-- The replacement for "worth something". A code that neither carries
-- money nor grants membership is a code that does nothing, and minting
-- one is always a mistake rather than a choice.
alter table whoa_card_claims
  drop constraint if exists whoa_card_claims_does_something;
alter table whoa_card_claims
  add constraint whoa_card_claims_does_something
  check (value_cents > 0 or grants_membership);

-- ─────────────────────────────────────────────────────────────────────
-- Redeeming, with the two jobs separated
-- ─────────────────────────────────────────────────────────────────────

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
  v_wallet whoa_wallets%rowtype;
  v_result record;
begin
  -- Unchanged, and the part that matters most: the claim is marked
  -- used in the same statement that checks it is unused, so two taps
  -- a moment apart cannot both win.
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

  -- A membership code moves no money, so there is no ledger row to
  -- write and nothing for adjust_wallet_balance to do. The card still
  -- has to be one we are willing to touch: a frozen card does not
  -- quietly become a member while it is being argued about.
  --
  -- Locked rather than merely read, because the whole point of putting
  -- the guard in one statement elsewhere is that reading a row and
  -- then deciding about it is the race. Here the decision needs the
  -- row, so the row is held.
  if v_claim.value_cents = 0 then
    select * into v_wallet from whoa_wallets where id = p_wallet_id for update;

    if v_wallet.id is null or v_wallet.status <> 'active' then
      -- Put the code back. Somebody paid for it, so a code that landed
      -- nowhere must still be redeemable.
      update whoa_card_claims
         set redeemed_by = null, redeemed_at = null
       where id = v_claim.id;
      return query select 0, coalesce(v_wallet.balance_cents, 0), false,
             coalesce(nullif(v_wallet.status, 'active'), 'failed');
      return;
    end if;

    update whoa_wallets
       set member_since = coalesce(member_since, now())
     where id = p_wallet_id;

    -- Already a member, redeeming a second card code: nothing moves
    -- and member_since keeps its original date, which is the whole
    -- reason that coalesce is there. Still 'redeemed', because the
    -- code was theirs and is now spent.
    return query select 0, v_wallet.balance_cents, true, 'redeemed'::text;
    -- Returned, not fallen out of. `return query` appends a row and
    -- carries on, so without this the money path below runs with a
    -- delta of zero, is refused as a movement of nothing, and RELEASES
    -- the claim it just spent. A membership code would be good forever.
    return;
  end if;

  -- Money. 'topup' rather than 'card-purchase' because that is what
  -- the movement is now: the card is paid for at the till and never
  -- appears in this ledger. 'card-purchase' stays legal in the check
  -- constraint so the rows written before this migration remain
  -- readable, and the note carries which kind of code it was.
  select * into v_result
    from adjust_wallet_balance(p_wallet_id, v_claim.value_cents, 'topup',
                              v_claim.id::text, upper(p_ambassador_code),
                              case when v_claim.grants_membership
                                   then 'Card and credit at the counter'
                                   else 'Loaded at the counter' end);

  if v_result.applied and v_claim.grants_membership then
    update whoa_wallets
       set member_since = coalesce(member_since, now())
     where id = p_wallet_id;
  end if;

  if not v_result.applied then
    update whoa_card_claims
       set redeemed_by = null, redeemed_at = null
     where id = v_claim.id;
    return query select v_claim.value_cents, v_result.balance_cents, false,
           coalesce(v_result.reason_refused, 'failed');
    return;
  end if;

  return query select v_claim.value_cents, v_result.balance_cents,
         v_claim.grants_membership, 'redeemed'::text;
end;
$$;
