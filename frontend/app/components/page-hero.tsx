type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
};

export function PageHero({ eyebrow, title, subtitle }: Props) {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="halftone absolute inset-x-0 top-0 -z-10 h-72 opacity-[0.12]" />
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center text-center pt-20 pb-14 px-4">
        <span className="badge-accent mb-5">{eyebrow}</span>
        <h1 className="font-display-xl text-4xl sm:text-6xl leading-[1.05] text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 max-w-xl text-neutral-300 text-lg">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
