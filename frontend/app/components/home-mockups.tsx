import { GAME_ACCENT, GAME_LOGO, GAMES } from "@/lib/games";
import { enterDelay, itemIndex, motionStyle, revealDelay, staggerGap } from "@/lib/motion";
import { CardArt } from "./card-art";
import { Icon } from "./icons";

// Static, decorative previews of the app used on the marketing home page.
// They are built from plain markup (no data fetching) and use placeholder art.
// Their lists carry data-reveal / --i hooks so they animate as they scroll in.

const YGO: [string, string] = ["#8b5cf6", "#c026d3"];
const SPELL: [string, string] = ["#10b981", "#065f46"];
const TRAP: [string, string] = ["#f43f5e", "#881337"];
const UA: [string, string] = ["#38bdf8", "#2563eb"];

function WindowFrame({
  url,
  children,
  className = "",
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl shadow-black/60 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-neutral-800 bg-ink px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto w-full max-w-sm truncate rounded-full bg-neutral-800 px-4 py-1 text-center text-[11px] text-neutral-400">
          {url}
        </span>
        <span className="w-12" />
      </div>
      <div className="bg-background">{children}</div>
    </div>
  );
}

const HERO_CARDS: { name: string; kind: string; colors: [string, string]; qty: number }[] = [
  { name: "Dark Magician", kind: "Monster", colors: YGO, qty: 3 },
  { name: "Magician's Rod", kind: "Spell", colors: SPELL, qty: 3 },
  { name: "Mystical Space Typhoon", kind: "Spell", colors: SPELL, qty: 2 },
  { name: "Dark Magic Attack", kind: "Spell", colors: SPELL, qty: 3 },
  { name: "Fiendish Chain", kind: "Trap", colors: TRAP, qty: 3 },
  { name: "Soul Taker", kind: "Spell", colors: SPELL, qty: 1 },
];

export function DeckPreviewWindow() {
  return (
    <WindowFrame url="deck-den.vercel.app/decks/12">
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xl font-bold text-white sm:text-3xl">Dark Magician Control</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-neutral-400 sm:text-sm">
              <span className="rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-600 px-2.5 py-1 text-[11px] font-bold text-white">
                Yu-Gi-Oh!
              </span>
              Advanced · 40 cards · Public
            </div>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-semibold text-white">
              Edit
            </span>
            <span className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand/30">
              Share
            </span>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
          {HERO_CARDS.map((card, i) => (
            // The window rises into place first; its cards then arrive one by one.
            <div
              key={card.name}
              className="anim-rise flex items-start gap-4"
              style={enterDelay(1050 + i * 90)}
            >
              <CardArt
                from={card.colors[0]}
                to={card.colors[1]}
                variant={i}
                qty={card.qty}
                className="aspect-[5/7] w-20 shrink-0 sm:w-28"
              />
              <div className="min-w-0 pt-1">
                <p className="text-xs font-bold leading-snug text-white sm:text-sm">{card.name}</p>
                <p className="mt-1 text-xs text-neutral-400">{card.kind}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WindowFrame>
  );
}

const SEARCH_ROWS = [
  { name: "Levi", code: "UEX07BT/AOT-2-041" },
  { name: "Levi's Barrage", code: "UE10BT/AOT-1-034" },
  { name: "Levi", code: "UE10BT/AOT-1-007" },
  { name: "Erwin Smith", code: "UE10BT/AOT-1-002" },
];
const LIST_ROWS = [
  { name: "Levi", qty: 4 },
  { name: "Levi's Barrage", qty: 4 },
  { name: "Erwin Smith", qty: 4 },
  { name: "Petra Rall", qty: 2 },
  { name: "Sweet Candy", qty: 2 },
  { name: "Eld Gin", qty: 4 },
];

export function BuilderWindow() {
  return (
    <WindowFrame url="deck-den.vercel.app/decks/new/union-arena">
      <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-7">
        <div>
          <p className="text-lg font-bold text-white">Add cards</p>
          <div className="mt-3 flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white">
            <Icon name="search" className="h-4 w-4 text-neutral-400" />
            levi
          </div>
          {/* Once the window has slid in, the results drop in row by row. */}
          <ul
            data-reveal="stagger"
            style={motionStyle(revealDelay(420), staggerGap(110))}
            className="mt-3 flex flex-col gap-2.5"
          >
            {SEARCH_ROWS.map((row, i) => (
              <li
                key={row.code}
                style={itemIndex(i)}
                className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-2.5"
              >
                <CardArt from={UA[0]} to={UA[1]} variant={i} className="aspect-[5/7] w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{row.name}</p>
                  <p className="truncate font-mono text-[11px] text-neutral-500">{row.code}</p>
                </div>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                  <Icon name="plus" className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-bold text-white">Your list</p>
            <p className="text-sm font-semibold text-neutral-400">50 / 50</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-800">
            <div className="reveal-bar h-2 w-full rounded-full bg-brand" />
          </div>
          <ul
            data-reveal="stagger"
            style={motionStyle(revealDelay(650), staggerGap(90))}
            className="mt-4 flex flex-col gap-2"
          >
            {LIST_ROWS.map((row, i) => (
              <li
                key={row.name}
                style={itemIndex(i)}
                className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-2.5 py-2"
              >
                <CardArt from={UA[0]} to={UA[1]} variant={i + 3} className="aspect-[5/7] w-6 shrink-0" />
                <span className="flex-1 truncate text-sm font-semibold text-white">{row.name}</span>
                <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-bold text-white">
                  − {row.qty} +
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </WindowFrame>
  );
}

const GAME_PALETTE: Record<string, { rotate: string; z: string }> = {
  "Yu-Gi-Oh!": { rotate: "-rotate-[11deg] translate-y-8", z: "z-10" },
  "Union Arena": { rotate: "rotate-0 -translate-y-4", z: "z-20" },
  Pokemon: { rotate: "rotate-[10deg] translate-y-10", z: "z-10" },
};

export function FannedGames() {
  const live = new Set<string>(GAMES.map((g) => g.name));
  const order = ["Yu-Gi-Oh!", "Union Arena", "Pokemon"];

  return (
    <div className="relative mx-auto flex h-[22rem] w-full max-w-xl items-center justify-center sm:h-[26rem]">
      {order.map((name, i) => {
        const isLive = live.has(name);
        const place = GAME_PALETTE[name];
        return (
          // Each card starts stacked and fans out into its own rotation as the
          // section scrolls in (see data-reveal="fan" in globals.css).
          <div
            key={name}
            data-reveal="fan"
            style={itemIndex(i)}
            className={`relative -mx-4 flex h-64 w-44 flex-col items-center justify-between overflow-hidden rounded-3xl border-2 border-white/80 p-4 text-center shadow-2xl shadow-black/50 sm:h-72 sm:w-48 sm:-mx-3 ${GAME_ACCENT[name]} ${place.rotate} ${place.z}`}
          >
            <div className="halftone absolute inset-0 opacity-25" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={GAME_LOGO[name]}
              alt=""
              className="relative mt-8 max-h-16 w-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
            />
            <div className="relative">
              <p className="text-lg font-extrabold text-white">
                {name === "Pokemon" ? "Pokémon" : name}
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/85">
                {isLive ? "Live" : "Coming back"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const PROFILE_DECKS = [
  { name: "Dark Magician Control", game: "Yu-Gi-Oh!", cards: 40, colors: YGO, chip: "from-purple-500 to-fuchsia-600" },
  { name: "Bleach Aggro", game: "Union Arena", cards: 50, colors: UA, chip: "from-sky-400 to-blue-600" },
  { name: "Blue Levi", game: "Union Arena", cards: 50, colors: UA, chip: "from-sky-400 to-blue-600" },
];

export function ProfilePhone() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-[19rem] rounded-[2.75rem] border-2 border-neutral-700 bg-black p-2.5 shadow-2xl shadow-black/70"
    >
      <div className="overflow-hidden rounded-[2.2rem] bg-background px-4 pb-6 pt-4">
        <div className="mx-auto mb-5 h-6 w-24 rounded-full bg-black" />
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl font-extrabold text-white">
            M
          </span>
          <div>
            <p className="text-lg font-extrabold text-white">mirai</p>
            <p className="text-xs text-neutral-400">5 public decks · 2 games</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 rounded-full border border-neutral-700 bg-neutral-800 py-2.5 text-sm font-semibold text-white">
          <Icon name="link" className="h-4 w-4" />
          Copy profile link
        </div>
        <ul
          data-reveal="stagger"
          style={motionStyle(revealDelay(550), staggerGap(130))}
          className="mt-4 flex flex-col gap-3"
        >
          {PROFILE_DECKS.map((deck, i) => (
            <li
              key={deck.name}
              style={itemIndex(i)}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3.5"
            >
              <div className="flex items-start justify-between">
                <span className={`rounded-full bg-gradient-to-r ${deck.chip} px-2.5 py-1 text-[10px] font-bold text-white`}>
                  {deck.game}
                </span>
                <div className="flex -space-x-5">
                  {[0, 1, 2, 3].map((k) => (
                    <CardArt
                      key={k}
                      from={deck.colors[0]}
                      to={deck.colors[1]}
                      variant={k + i}
                      className="aspect-[5/7] w-8"
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-base font-extrabold text-white">{deck.name}</p>
              <p className="text-xs text-neutral-400">{deck.cards} cards · Public</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ChatCard() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-xl rounded-t-[1.75rem] border border-neutral-800 bg-[#101014] p-5 shadow-2xl shadow-black/60 sm:p-6"
    >
      {/* The conversation plays out in order once the card is on screen. */}
      <div data-reveal="stagger" style={motionStyle(revealDelay(700), staggerGap(520))}>
        <div className="flex items-center gap-2.5" style={itemIndex(0)}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white">
            <Icon name="spark" className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold text-white">Claude</span>
        </div>
        <p
          style={itemIndex(1)}
          className="ml-auto mt-4 w-fit max-w-[85%] rounded-2xl bg-neutral-800 px-4 py-2.5 text-sm font-medium text-white"
        >
          Which decks do I have in DeckDen?
        </p>
        <p
          style={itemIndex(2)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-brand-dk bg-[#1b1115] px-3 py-1 text-xs font-semibold text-[#f4b9c1]"
        >
          <Icon name="shield" className="h-3.5 w-3.5 text-brand-hi" />
          list_my_decks · read-only
        </p>
        <p style={itemIndex(3)} className="mt-3 text-sm leading-relaxed text-neutral-200">
          You have two decks. Dark Magician Control is a Yu-Gi-Oh! deck with 40 cards. Bleach Aggro is a
          Union Arena deck with 50 cards. Want the card list for either?
        </p>
        <div style={itemIndex(4)} className="mt-5 h-10 rounded-full border border-neutral-800 bg-neutral-900" />
      </div>
    </div>
  );
}
