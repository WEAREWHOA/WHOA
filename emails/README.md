# The three recurring emails

Paste-ready HTML for the Weekly Upcoming Events, Monthly Collection Drops
and Monthly WHOA Newsletter sends.

## How to use one

1. Portal → **EMAIL/TEXT** → Campaigns → new campaign.
2. Paste the file's contents into the HTML body.
3. Replace every `{{ }}` placeholder. They are deliberately obvious so an
   unreplaced one is visible in the preview rather than in somebody's
   inbox.
4. Send a test to yourself first. The composer has a button for it.

Resend's own unsubscribe link is appended to every broadcast, so none of
these carry a hard-coded one. The footer leaves room for it.

## Why these are files rather than a drag-and-drop builder

A builder is a month of work that produces worse HTML than this. Email
clients are not browsers: Outlook renders through Word, Gmail strips
`<style>` blocks, and dark mode inverts colours nobody asked it to. These
templates are already table-based, inline-styled and tested against that
reality.

Editing one is editing the copy between the tags. Everything structural
is already decided, which is the part a builder would get wrong.

## Placeholders

| Placeholder | What it is |
| --- | --- |
| `{{PREHEADER}}` | The grey line after the subject in an inbox list. Write it; leaving it out lets the client invent one from your first sentence. |
| `{{HEADLINE}}` | The big line at the top. |
| `{{INTRO}}` | One or two sentences under it. |
| `{{EVENT_*}}` / `{{DROP_*}}` / `{{STORY_*}}` | One block per item. Duplicate or delete whole blocks as needed. |
| `{{CTA_URL}}` | Always an absolute `https://www.wearewhoa.art/...` URL. A relative one is a dead link in an email. |

## Images

Host them somewhere public and link absolutely. No attachments, no
`data:` URIs: both are how a send lands in spam. Every `<img>` here
already carries a `width`, an `alt` and a background colour, so a client
that blocks images still shows a readable layout.
