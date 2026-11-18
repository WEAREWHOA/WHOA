/**
 * What a WHOA card is worth.
 *
 * All of it. The ten dollars buys the card and this list, not a
 * balance: a new card starts empty and is loaded with whatever its
 * owner wants. So these perks are the whole of what the money buys,
 * which is worth knowing before wording any of them.
 *
 * In one file because these show up in three places that are nowhere
 * near each other: the landing page selling the card, the wallet of
 * somebody who owns one, and eventually the door on a Wednesday. A
 * perk worded three ways is three perks as far as a customer is
 * concerned.
 *
 * Nothing here enforces anything. These are the promises; the places
 * that honour them are the till and the door.
 */

export interface Perk {
  title: string;
  /** Said once, in the one place somebody reads before deciding. */
  detail?: string;
}

export const MEMBER_PERKS: Perk[] = [
  {
    title: "$1 off any WHOA Wednesday",
    detail: "Every week, on the door.",
  },
  {
    title: "$1 off any WHOADEGA drink",
    detail: "Stacks with the $2 off for RSVPing ahead.",
  },
  {
    title: "Members-only events",
    detail: "Nights we only open to WHOA card holders.",
  },
  {
    title: "Seasonal giveaways & freebies",
    detail: "Drops, prizes and things we just hand out, card holders first.",
  },
  {
    title: "More to come",
    detail: "This list grows. Buying in now keeps whatever gets added later.",
  },
];

/**
 * What the metal card costs over the counter, in cents.
 *
 * The price of the card and the membership, and nothing else. It is
 * NOT credit and it does not land on the balance: a card bought today
 * starts at zero and is loaded separately, for any amount. It used to
 * be handed straight back as ten dollars of credit, which made the
 * card free and the perks the only real product, and that was a
 * mistake about what is being sold.
 */
export const CARD_PRICE_CENTS = 1000;
