/**
 * Shipping rates: tiered by order value, zoned by destination.
 *
 * Two rules decide a rate. Where it's going picks the zone; what the
 * merchandise came to (after any ambassador discount, before tax) picks
 * the tier within it.
 *
 * WHOA ships worldwide, but "worldwide" is not one price. Posting a
 * hoodie to Vancouver and posting it to Perth differ by more than the
 * hoodie costs, so a single international rate would quietly lose money
 * on every distant order. The zones below are the cheapest honest way to
 * keep one rate table without that.
 *
 * ──────────────────────────────────────────────────────────────────────
 * THE NUMBERS BELOW ARE PLACEHOLDERS. They are plausible for a small
 * apparel brand shipping from San Diego, and they are not quotes. Check
 * them against what you actually pay at the counter before going live —
 * especially the international ones, where a heavy order can cost more
 * to post than the tier charges.
 * ──────────────────────────────────────────────────────────────────────
 */

export type ZoneId = "US" | "CA_MX" | "EUROPE" | "WORLD";

export interface ShippingTier {
  /** Applies when the merchandise subtotal is at least this. */
  minSubtotalCents: number;
  rateCents: number;
}

export interface ShippingZone {
  id: ZoneId;
  label: string;
  /** ISO-3166 alpha-2 codes. Empty means "everywhere not listed above". */
  countries: string[];
  /** Highest minSubtotal first — the first match wins. */
  tiers: ShippingTier[];
}

export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: "US",
    label: "United States",
    countries: ["US"],
    tiers: [
      { minSubtotalCents: 10000, rateCents: 0 },
      { minSubtotalCents: 5000, rateCents: 495 },
      { minSubtotalCents: 0, rateCents: 695 },
    ],
  },
  {
    id: "CA_MX",
    label: "Canada & Mexico",
    countries: ["CA", "MX"],
    // No free tier outside the US on purpose: free international
    // shipping on a $150 order is usually a loss, not a promotion.
    tiers: [
      { minSubtotalCents: 15000, rateCents: 1295 },
      { minSubtotalCents: 0, rateCents: 1695 },
    ],
  },
  {
    id: "EUROPE",
    label: "Europe & UK",
    countries: [
      "GB", "IE", "FR", "DE", "ES", "IT", "PT", "NL", "BE", "LU", "AT", "CH",
      "DK", "SE", "NO", "FI", "IS", "PL", "CZ", "SK", "HU", "SI", "HR", "RO",
      "BG", "GR", "EE", "LV", "LT", "MT", "CY",
    ],
    tiers: [
      { minSubtotalCents: 15000, rateCents: 1995 },
      { minSubtotalCents: 0, rateCents: 2495 },
    ],
  },
  {
    id: "WORLD",
    label: "Rest of world",
    countries: [],
    tiers: [
      { minSubtotalCents: 15000, rateCents: 2495 },
      { minSubtotalCents: 0, rateCents: 2995 },
    ],
  },
];

const ZONE_BY_COUNTRY = new Map<string, ShippingZone>();
for (const zone of SHIPPING_ZONES) {
  for (const country of zone.countries) ZONE_BY_COUNTRY.set(country, zone);
}
const FALLBACK_ZONE = SHIPPING_ZONES.find((z) => z.id === "WORLD")!;

export function normalizeCountry(country: string | null | undefined): string {
  return (country ?? "").trim().toUpperCase().slice(0, 2);
}

/** Anything not named in a zone ships at the rest-of-world rate, which
 *  is the safe direction to be wrong in. */
export function zoneFor(country: string | null | undefined): ShippingZone {
  return ZONE_BY_COUNTRY.get(normalizeCountry(country)) ?? FALLBACK_ZONE;
}

/**
 * What to charge, in cents.
 *
 * Tiers are matched highest-threshold-first, so the order of the array
 * above is the order of the rules. A subtotal below every threshold
 * falls to the 0-cent tier, which every zone has.
 */
export function shippingRateCents(
  country: string | null | undefined,
  merchandiseSubtotalCents: number,
): number {
  const subtotal = Math.max(0, Math.round(merchandiseSubtotalCents));
  const zone = zoneFor(country);
  const tiers = [...zone.tiers].sort((a, b) => b.minSubtotalCents - a.minSubtotalCents);
  const tier = tiers.find((t) => subtotal >= t.minSubtotalCents);
  return tier ? tier.rateCents : 0;
}

/** How much more to spend for the next tier down, or null if there
 *  isn't one. Drives the "spend $12 more for free shipping" nudge. */
export function nextTierSaving(
  country: string | null | undefined,
  merchandiseSubtotalCents: number,
): { addCents: number; newRateCents: number } | null {
  const subtotal = Math.max(0, Math.round(merchandiseSubtotalCents));
  const zone = zoneFor(country);
  const current = shippingRateCents(country, subtotal);

  const better = zone.tiers
    .filter((t) => t.minSubtotalCents > subtotal && t.rateCents < current)
    .sort((a, b) => a.minSubtotalCents - b.minSubtotalCents)[0];

  return better
    ? { addCents: better.minSubtotalCents - subtotal, newRateCents: better.rateCents }
    : null;
}

/**
 * The country list for the checkout dropdown.
 *
 * Every country Square will accept on a fulfillment address, because the
 * rates above ship worldwide and a destination missing from this list is
 * a destination nobody can buy from. The four biggest markets are pinned
 * to the top; the rest are alphabetical.
 *
 * A static list, not `Intl.DisplayNames` at runtime: the server and the
 * browser can ship different ICU data, and a name that disagrees across
 * the two is a hydration mismatch. Regenerate against the Square SDK's
 * own Country enum if it ever gains a code.
 */
export const SHIPPING_COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "MX", name: "Mexico" },
  { code: "GB", name: "United Kingdom" },
  { code: "AF", name: "Afghanistan" },
  { code: "AX", name: "Åland Islands" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AS", name: "American Samoa" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AI", name: "Anguilla" },
  { code: "AG", name: "Antigua & Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AW", name: "Aruba" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BM", name: "Bermuda" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia & Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "IO", name: "British Indian Ocean Territory" },
  { code: "VG", name: "British Virgin Islands" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CV", name: "Cape Verde" },
  { code: "BQ", name: "Caribbean Netherlands" },
  { code: "KY", name: "Cayman Islands" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CX", name: "Christmas Island" },
  { code: "CC", name: "Cocos (Keeling) Islands" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo - Brazzaville" },
  { code: "CD", name: "Congo - Kinshasa" },
  { code: "CK", name: "Cook Islands" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d’Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CW", name: "Curaçao" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FK", name: "Falkland Islands" },
  { code: "FO", name: "Faroe Islands" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GF", name: "French Guiana" },
  { code: "PF", name: "French Polynesia" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GI", name: "Gibraltar" },
  { code: "GR", name: "Greece" },
  { code: "GL", name: "Greenland" },
  { code: "GD", name: "Grenada" },
  { code: "GP", name: "Guadeloupe" },
  { code: "GU", name: "Guam" },
  { code: "GT", name: "Guatemala" },
  { code: "GG", name: "Guernsey" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HK", name: "Hong Kong SAR China" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IM", name: "Isle of Man" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JE", name: "Jersey" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MO", name: "Macao SAR China" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MQ", name: "Martinique" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "YT", name: "Mayotte" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MS", name: "Montserrat" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar (Burma)" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NC", name: "New Caledonia" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NU", name: "Niue" },
  { code: "NF", name: "Norfolk Island" },
  { code: "KP", name: "North Korea" },
  { code: "MK", name: "North Macedonia" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestinian Territories" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PN", name: "Pitcairn Islands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "PR", name: "Puerto Rico" },
  { code: "QA", name: "Qatar" },
  { code: "RE", name: "Réunion" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "São Tomé & Príncipe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SX", name: "Sint Maarten" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "BL", name: "St. Barthélemy" },
  { code: "SH", name: "St. Helena" },
  { code: "KN", name: "St. Kitts & Nevis" },
  { code: "LC", name: "St. Lucia" },
  { code: "MF", name: "St. Martin" },
  { code: "PM", name: "St. Pierre & Miquelon" },
  { code: "VC", name: "St. Vincent & Grenadines" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SJ", name: "Svalbard & Jan Mayen" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TK", name: "Tokelau" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad & Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Türkiye" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TC", name: "Turks & Caicos Islands" },
  { code: "TV", name: "Tuvalu" },
  { code: "VI", name: "U.S. Virgin Islands" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "WF", name: "Wallis & Futuna" },
  { code: "EH", name: "Western Sahara" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];


/**
 * The cheapest US order that ships free, or null if nothing does.
 *
 * Marketing copy quotes this number, and copy that disagrees with the
 * checkout is worse than copy that says nothing — so it's read from the
 * table rather than typed out wherever it's mentioned.
 */
export function freeShippingThresholdCents(zoneId: ZoneId = "US"): number | null {
  const zone = SHIPPING_ZONES.find((z) => z.id === zoneId);
  const free = zone?.tiers.filter((t) => t.rateCents === 0) ?? [];
  if (free.length === 0) return null;
  return Math.min(...free.map((t) => t.minSubtotalCents));
}

const NAME_BY_COUNTRY = new Map(SHIPPING_COUNTRIES.map((c) => [c.code, c.name]));

/** The country's English name, or the bare code if it isn't one we know —
 *  a receipt saying "ZZ" is still better than one saying nothing. */
export function countryName(country: string | null | undefined): string {
  const code = normalizeCountry(country);
  return NAME_BY_COUNTRY.get(code) ?? code;
}

/**
 * A destination as it should read on a receipt.
 *
 * The country is spelled out rather than left as a code: "JP" on a
 * confirmation email tells an international customer nothing about
 * whether we got their address right.
 */
export function formatShipTo(shipping: {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}): string {
  const street = [shipping.line1.trim(), shipping.line2?.trim()].filter(Boolean).join(", ");
  const region = [shipping.city.trim(), shipping.state.trim()].filter(Boolean).join(", ");
  return [
    street,
    [region, shipping.zip.trim()].filter(Boolean).join(" "),
    countryName(shipping.country),
  ]
    .filter(Boolean)
    .join("\n");
}

/** US states need a real value for Square; elsewhere the field is a
 *  region name and Square accepts it as free text. */
export function isDomestic(country: string | null | undefined): boolean {
  return normalizeCountry(country) === "US";
}
