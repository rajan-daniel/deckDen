import { enterDelay, parallax } from "@/lib/motion";

type Props = {
  /** Small mono label above the title, e.g. "010101_BROWSE". */
  tag: string;
  title: string;
  subtitle?: string;
  /** Shown to the left of the title (an avatar, for profiles). */
  leading?: React.ReactNode;
  /** Chips or buttons shown under the subtitle. */
  children?: React.ReactNode;
};

// The dark header band at the top of the listing pages: a brush stroke and
// halftone dots behind a heavy display title. The text rises in on load, and
// the brush drifts slowly as the page scrolls (where the browser supports it).
export function PageBanner({ tag, title, subtitle, leading, children }: Props) {
  return (
    <section className="relative isolate overflow-hidden border-b border-neutral-800 bg-[#0e0e12]">
      <div
        aria-hidden
        className="parallax brush-bg absolute -right-[14%] -top-[70%] -z-10 aspect-[1280/880] w-[72%] rotate-[6deg] opacity-80"
        style={parallax(5)}
      />
      <div aria-hidden className="halftone absolute right-0 top-0 -z-10 h-full w-[42rem] opacity-20" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-background/45" />
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="mono-tag anim-rise" style={enterDelay(0)}>
          {tag}
        </p>
        <div className="mt-3 flex items-center gap-4 anim-rise" style={enterDelay(80)}>
          {leading}
          <h1 className="font-display-xl text-4xl leading-[1.05] text-white sm:text-6xl">{title}</h1>
        </div>
        {subtitle && (
          <p className="mt-4 max-w-2xl text-lg text-neutral-200 anim-rise" style={enterDelay(180)}>
            {subtitle}
          </p>
        )}
        {children && (
          <div className="mt-6 flex flex-wrap items-center gap-3 anim-rise" style={enterDelay(280)}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
