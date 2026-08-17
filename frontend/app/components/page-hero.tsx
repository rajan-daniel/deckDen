type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
};

export function PageHero({ eyebrow, title, subtitle }: Props) {
  return (
    <section className="w-full max-w-3xl mx-auto flex flex-col items-center text-center pt-20 pb-14 px-4">
      <span className="badge-accent mb-5">{eyebrow}</span>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-4 max-w-xl text-neutral-400 text-lg">{subtitle}</p>
      )}
    </section>
  );
}
