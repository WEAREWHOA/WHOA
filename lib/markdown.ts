/**
 * A small Markdown renderer for blog posts.
 *
 * ───────────────────────────────────────────────────────────────────────
 * The rule that makes this safe: EVERY character of input is escaped
 * before any tag is produced, and tags are only ever added afterwards
 * from patterns matched against already-escaped text.
 *
 * Done the other way round, a post containing <script> or an onerror=
 * attribute would reach the reader's browser intact, and a blog is
 * precisely the surface where somebody pastes HTML from elsewhere
 * without thinking about it. Escaping first means the worst a paste can
 * do is appear as literal text.
 *
 * Link hrefs are checked separately, because escaping does nothing about
 * javascript: — that is a valid URL made of harmless characters, and it
 * runs. Only http, https and mailto, plus site-relative paths, survive.
 *
 * Deliberately not a full Markdown implementation. It covers headings,
 * paragraphs, bold, italic, inline code, links, images, lists,
 * blockquotes, horizontal rules and fenced code, which is what a post
 * for this site actually uses. Anything it does not recognise comes
 * through as text rather than as a surprise.
 * ───────────────────────────────────────────────────────────────────────
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A link target we are willing to emit.
 *
 * Checked against the RAW url before escaping, because the decision is
 * about the scheme and escaping does not change a scheme. Anything
 * unrecognised becomes "#", so the link still renders and simply goes
 * nowhere.
 */
function safeUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return "#";
  // Relative paths and anchors on this site.
  if (url.startsWith("/") || url.startsWith("#")) return escapeHtml(url);
  // A scheme we allow, matched case-insensitively and after any leading
  // whitespace or control characters a browser would ignore.
  if (/^(https?:|mailto:)/i.test(url.replace(/[\u0000- ]/g, ""))) return escapeHtml(url);
  return "#";
}

/** Bold, italic, code and links, inside one already-escaped line. */
function inline(escaped: string): string {
  let out = escaped;

  // Code first, so markup inside backticks is left alone.
  const codeSpans: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => {
    codeSpans.push(code);
    return `\u0000CODE${codeSpans.length - 1}\u0000`;
  });

  // Images before links: the syntax differs by one leading character.
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, url: string) => {
    return `<img src="${safeUrl(unescapeForUrl(url))}" alt="${alt}" loading="lazy" class="blog-img" />`;
  });

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    const href = safeUrl(unescapeForUrl(url));
    // Anything leaving the site gets rel="noopener", and nofollow,
    // because a comment-free blog still should not hand out endorsement
    // to every URL anybody pastes.
    const external = /^https?:/i.test(href) && !href.includes("wearewhoa");
    const attrs = external ? ' target="_blank" rel="noopener noreferrer nofollow"' : "";
    return `<a href="${href}"${attrs}>${text}</a>`;
  });

  out = out
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  out = out.replace(/\u0000CODE(\d+)\u0000/g, (_m, i: string) => `<code>${codeSpans[Number(i)]}</code>`);
  return out;
}

/**
 * Undo the escaping for a URL that is about to be re-escaped.
 *
 * The line was escaped whole before parsing, so by the time a URL is
 * matched its ampersands are already `&amp;`. Feeding that to safeUrl
 * would hide a `javascript&#58;` style scheme from the check, so it is
 * put back first and escaped again on the way out.
 */
function unescapeForUrl(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function renderMarkdown(source: string): string {
  const lines = escapeHtml(source.replace(/\r\n/g, "\n")).split("\n");
  const out: string[] = [];

  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let quote: string[] = [];
  let codeLines: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    out.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (listItems.length === 0) return;
    const tag = listOrdered ? "ol" : "ul";
    out.push(`<${tag}>${listItems.map((i) => `<li>${inline(i)}</li>`).join("")}</${tag}>`);
    listItems = [];
  };
  const flushQuote = () => {
    if (quote.length === 0) return;
    out.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const line of lines) {
    // A fence toggles verbatim mode. Inside it nothing is parsed, which
    // is the whole point of a code block.
    if (/^\s*```/.test(line)) {
      if (codeLines) {
        out.push(`<pre><code>${codeLines.join("\n")}</code></pre>`);
        codeLines = null;
      } else {
        flushAll();
        codeLines = [];
      }
      continue;
    }
    if (codeLines) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      // h1 is the post title, rendered by the page. A heading inside the
      // body starts at h2 so the document outline stays legal: two h1s
      // on a page is the single most common structural SEO mistake.
      const level = Math.min(6, heading[1].length + 1);
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      flushAll();
      out.push("<hr />");
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      flushQuote();
      const ordered = Boolean(numbered);
      if (listItems.length > 0 && ordered !== listOrdered) flushList();
      listOrdered = ordered;
      listItems.push((bullet?.[1] ?? numbered?.[1] ?? "").trim());
      continue;
    }

    const quoted = /^\s*&gt;\s?(.*)$/.exec(line);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1].trim());
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  if (codeLines) out.push(`<pre><code>${codeLines.join("\n")}</code></pre>`);
  flushAll();
  return out.join("\n");
}
