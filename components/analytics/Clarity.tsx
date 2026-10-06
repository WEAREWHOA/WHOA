"use client";

import Script from "next/script";

/**
 * Microsoft Clarity: heatmaps and session recordings.
 *
 * Clarity's own bootstrap, verbatim, rather than a tidier src-only tag.
 * The snippet defines window.clarity as a queue before the real script
 * lands, so anything called in that window is buffered rather than
 * thrown away. Rewriting it to "just load the file" is the version that
 * silently drops the first events of a session.
 *
 * afterInteractive, not beforeInteractive: this is measurement, and
 * nothing on the page waits for it. It must never sit in front of the
 * shop rendering.
 *
 * Mounted only when the id is set, which is how dev and preview
 * deployments stay out of the data. A heatmap polluted by the people
 * building the site is a heatmap of the people building the site.
 */
export default function Clarity({ projectId }: { projectId: string }) {
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${projectId}");`}
    </Script>
  );
}
