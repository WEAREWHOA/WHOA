import CustomDesignEditor from "@/components/customDesign/CustomDesignEditor";

export default function CustomDesignPage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 py-16 text-center">
      <span className="text-xs font-semibold tracking-[0.3em] text-muted uppercase">
        Custom Design
      </span>
      <h1 className="text-psychedelic font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        Editor Tool
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Pick a black piece, then bleach your own design onto it with a marker or spray — mouse on
        desktop, finger on mobile.
      </p>
      <p className="mt-2 max-w-md text-xs text-muted">
        This is a test of the tool itself — designs here don&apos;t place a real order yet.
      </p>

      <div className="mt-10 w-full">
        <CustomDesignEditor />
      </div>
    </section>
  );
}
