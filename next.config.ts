import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Every upload on this site goes through a Server Action, and the
      // default cap on a Server Action request body is 1MB — small enough
      // that an ordinary phone photo is rejected by Next before our own code
      // ever runs, which is why profile pictures and product photos appeared
      // to fail for no reason.
      //
      // 4.5MB is the ceiling worth asking for rather than an arbitrary
      // number: Vercel caps a serverless function's request body there, so
      // raising this past it would only move the failure, not fix it. The
      // per-file and per-batch limits in lib/media.ts sit just under this
      // with room for multipart overhead (boundaries and part headers add
      // 10-20KB, per Next's own guidance).
      //
      // Anything genuinely larger needs uploading straight to Supabase
      // Storage from the browser with a signed URL, which bypasses the
      // function body entirely. That's a separate piece of work.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
