import { forwardRef } from "react";

const WhoaSphere = forwardRef<HTMLDivElement>(function WhoaSphere(_props, ref) {
  return (
    <div
      ref={ref}
      className="whoa-sphere relative flex shrink-0 items-center justify-center rounded-full"
      style={{ width: "clamp(150px, 34vw, 330px)", height: "clamp(150px, 34vw, 330px)" }}
    >
      <div className="whoa-sphere-spin absolute inset-0 rounded-full" aria-hidden />
      <div className="whoa-sphere-shade absolute inset-0 rounded-full" aria-hidden />

      <div className="relative z-10 flex w-[74%] flex-col items-center justify-center text-center">
        <span className="text-[0.5rem] leading-tight font-semibold tracking-[0.22em] text-white/80 uppercase sm:text-[0.6rem]">
          Welcome to the WHOA universe
        </span>
        <h1 className="text-psychedelic font-display mt-1 text-4xl leading-[0.9] tracking-wide sm:text-5xl">
          WHOA.
        </h1>
        <p className="mt-1 text-[0.6rem] text-white/70 sm:text-xs">Pick your path.</p>
      </div>
    </div>
  );
});

export default WhoaSphere;
