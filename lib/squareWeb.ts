// Shared Square Web Payments SDK plumbing.
//
// Three surfaces talk to Square in the browser — the shop checkout, the
// event ticket modal and the POS register — and each of them used to carry
// its own copy of these constants plus its own `declare global` for
// window.Square. Two of those copies described only `payments.card()`,
// which made adding wallets (Apple Pay / Google Pay / Cash App Pay)
// impossible without duplicating the types a third time. This is the one
// description of the SDK surface we actually use.

export const SQUARE_APPLICATION_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
export const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";

export const SQUARE_JS_SRC =
  process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";

export interface SquareTokenResult {
  status: string;
  token?: string;
  errors?: { message: string }[];
}

export interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<SquareTokenResult>;
  destroy: () => Promise<void>;
}

/** Apple Pay and Google Pay share this shape. Apple Pay is never attached. */
export interface SquareWallet {
  attach?: (selector: string, options?: Record<string, unknown>) => Promise<void>;
  tokenize: () => Promise<SquareTokenResult>;
  destroy?: () => Promise<void>;
}

/**
 * Cash App Pay is the odd one out: it renders its own button, and hands
 * back the token through an event rather than from tokenize() — on a phone
 * it bounces the customer out to the Cash App and back, so there is no
 * promise left alive to resolve by then.
 */
export interface SquareCashAppPay {
  attach: (selector: string, options?: Record<string, unknown>) => Promise<void>;
  addEventListener: (
    event: "ontokenization",
    handler: (event: { detail: { tokenResult: SquareTokenResult } }) => void,
  ) => void;
  destroy: () => Promise<void>;
}

export interface SquarePaymentRequestOptions {
  countryCode: string;
  currencyCode: string;
  total: { amount: string; label: string };
}

export interface SquarePaymentRequest {
  [key: string]: unknown;
}

export interface SquarePayments {
  card: (options?: Record<string, unknown>) => Promise<SquareCard>;
  paymentRequest: (options: SquarePaymentRequestOptions) => SquarePaymentRequest;
  applePay: (request: SquarePaymentRequest) => Promise<SquareWallet>;
  googlePay: (request: SquarePaymentRequest) => Promise<SquareWallet>;
  cashAppPay: (
    request: SquarePaymentRequest,
    options: { redirectURL: string; referenceId: string },
  ) => Promise<SquareCashAppPay>;
}

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<SquarePayments>;
    };
  }
}

/**
 * Dark-theme styling for the hosted card iframe. Square renders the card
 * fields in a cross-origin frame, so none of our CSS variables reach it —
 * these have to be literal colors, kept in step with app/globals.css.
 */
export const SQUARE_CARD_STYLE = {
  input: {
    backgroundColor: "#1c1610",
    color: "#f7f0e6",
    fontSize: "16px",
  },
  "input::placeholder": {
    color: "#a89686",
  },
  ".input-container": {
    borderColor: "#433d36",
    borderRadius: "10px",
    borderWidth: "1px",
  },
  ".input-container.is-focus": {
    borderColor: "#ff7a00",
  },
  ".input-container.is-error": {
    borderColor: "#ff2f1a",
  },
  ".message-text": {
    color: "#a89686",
  },
  ".message-text.is-error": {
    color: "#ff2f1a",
  },
  ".message-icon.is-error": {
    color: "#ff2f1a",
  },
  "input.is-error": {
    color: "#ff2f1a",
  },
} as const;

/** Square wants a plain decimal string ("46.75"), not cents. */
export function squareAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}
