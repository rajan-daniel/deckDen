import Link from "next/link";
import { HeroCtas } from "@/app/components/hero-ctas";
import { Icon, type IconName } from "@/app/components/icons";
import { ScrollReveal } from "@/app/components/scroll-reveal";
import {
  BuilderWindow,
  ChatCard,
  DeckPreviewWindow,
  FannedGames,
  ProfilePhone,
} from "@/app/components/home-mockups";
import {
  enterDelay,
  enterRise,
  itemIndex,
  motionStyle,
  parallax,
  revealDelay,
  staggerGap,
} from "@/lib/motion";

const TRUST: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "key",
    title: "Sign in with a passkey",
    body: "Use your fingerprint, face or PIN next to your password.",
  },
  {
    icon: "lock",
    title: "Passwords stay hashed",
    body: "Reset links are single-use and expire in 30 minutes.",
  },
  {
    icon: "eye",
    title: "AI access is read-only",
    body: "Assistant tokens can look at your decks, never change them.",
  },
  {
    icon: "trash",
    title: "Delete any time",
    body: "Remove your account and your decks, passkeys and tokens go with it.",
  },
];

// Each section below follows the same recipe: the backdrop drifts with the
// scroll (.parallax), the copy arrives as a staggered group, and the product
// shot slides in from the side it is anchored to. <ScrollReveal /> flips the
// data-reveal elements on as they enter the viewport.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <ScrollReveal />
      <div aria-hidden className="scroll-progress" />

      <div className="bg-brand px-4 py-2.5 text-center text-sm font-medium text-white">
        <span className="font-extrabold">New:</span> connect Claude to your decks with a read-only
        access token.{" "}
        <a href="#ai" className="font-bold underline underline-offset-2">
          Learn more
        </a>
      </div>

      {/* HERO: plays once on load, in a deliberate order. */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#101014] to-background">
        <div
          aria-hidden
          style={parallax(9)}
          className="parallax brush-bg absolute -right-[22%] -top-[4%] -z-10 aspect-[1280/880] w-[120%] rotate-[8deg] opacity-80"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-background/35" />
        <div
          aria-hidden
          style={parallax(5)}
          className="parallax halftone absolute left-0 top-8 -z-10 h-[30rem] w-[34rem] opacity-[0.28]"
        />
        <div
          aria-hidden
          style={parallax(6)}
          className="parallax halftone absolute -right-24 bottom-0 -z-10 h-[26rem] w-[30rem] opacity-[0.22]"
        />

        <div
          aria-hidden
          style={parallax(3)}
          className="parallax pointer-events-none absolute bottom-0 left-0 hidden select-none gap-1 pl-1 xl:flex"
        >
          <span className="vertical-text font-display-xl outline-text text-[4.6rem] leading-none">EVERY GAME</span>
          <span className="vertical-text font-display-xl text-[4.6rem] leading-none text-white">DECKDEN</span>
        </div>
        <span aria-hidden className="mono-tag anim-rise absolute left-44 top-6 hidden xl:block" style={enterDelay(900)}>
          010101_01
        </span>
        {[
          "left-[18%] top-[22%]",
          "left-[24%] top-[52%]",
          "right-[14%] top-[16%]",
          "right-[10%] top-[44%]",
          "right-[30%] top-[60%]",
        ].map((pos, i) => (
          // Slow, out-of-step drifting keeps the backdrop alive without pulling focus.
          <span
            key={pos}
            aria-hidden
            style={enterDelay(i * 1100)}
            className={`float absolute hidden h-2 w-2 rounded-full bg-brand-hi shadow-[0_0_26px_8px_rgb(224_72_91/0.35)] md:block ${pos}`}
          />
        ))}

        <div className="relative mx-auto max-w-5xl px-6 pt-16 text-center sm:pt-24">
          <span className="badge-accent anim-rise" style={enterDelay(0)}>
            TCG deck tracker
          </span>
          <h1 className="mt-6 font-serif text-[3.6rem] font-normal leading-[0.95] tracking-[-0.03em] text-white sm:text-[6rem] lg:text-[8.4rem]">
            <span className="line-mask">
              <span style={enterDelay(120)}>Every Deck,</span>
            </span>
            <span className="line-mask">
              <span style={enterDelay(260)}>
                Every Game<span className="text-brand-hi">.</span>
              </span>
            </span>
          </h1>
          <p
            className="anim-rise mx-auto mt-7 max-w-2xl text-lg text-neutral-200 sm:text-xl"
            style={enterDelay(520)}
          >
            Build, share and browse decklists across Yu-Gi-Oh!, Union Arena and more. One account, one
            public profile, every game you play.
          </p>
          <div className="anim-rise" style={enterDelay(660)}>
            <HeroCtas />
          </div>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl px-6 sm:mt-20">
          <div
            className="anim-rise relative max-h-[26rem] overflow-hidden"
            style={motionStyle(enterDelay(820), enterRise("90px"))}
          >
            <DeckPreviewWindow />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background to-transparent" />
          </div>
        </div>
      </section>

      {/* DECK TOOLS */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-[#14090c]">
        <div
          aria-hidden
          style={parallax(7)}
          className="parallax halftone absolute right-0 top-10 h-[34rem] w-[38rem] opacity-[0.14]"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-24 lg:grid-cols-2 lg:py-32">
          <div data-reveal="left">
            <BuilderWindow />
          </div>
          <div data-reveal="stagger" style={staggerGap(110)}>
            <p style={itemIndex(0)} className="text-4xl font-medium text-brand-hi sm:text-5xl">
              Intuitive deck tools
            </p>
            <h2
              style={itemIndex(1)}
              className="mt-3 max-w-lg text-4xl font-medium leading-[1.15] text-white sm:text-5xl"
            >
              Search any card and build your list, seamlessly
            </h2>
            <p style={itemIndex(2)} className="mt-6 max-w-md text-lg leading-relaxed text-neutral-200">
              Live search for Yu-Gi-Oh! and Union Arena, with one-tap controls to add or remove copies.
            </p>
            <div style={itemIndex(3)}>
              <Link href="/decks/new" className="btn-primary mt-8 px-7 py-3.5 text-base">
                Create a deck
              </Link>
            </div>
            <p style={itemIndex(4)} className="mt-16 max-w-md text-xs text-neutral-500">
              Card search pulls live from each game&apos;s card database. Card art belongs to its publisher.
            </p>
          </div>
        </div>
      </section>

      {/* GAMES */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#7d1626] to-brand">
        <div
          aria-hidden
          style={parallax(6)}
          className="parallax halftone absolute left-0 top-4 h-[36rem] w-[40rem] opacity-20"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:py-28">
          <FannedGames />
          <div data-reveal="stagger" style={staggerGap(120)}>
            <h2 style={itemIndex(0)} className="text-5xl font-medium leading-[1.1] text-white sm:text-6xl">
              One account,
              <br />
              every game
            </h2>
            <p style={itemIndex(1)} className="mt-6 max-w-lg text-lg leading-relaxed text-[#ffe9ec]">
              Yu-Gi-Oh! and Union Arena are live today. Pokémon is on its way back. Every deck sits under
              one name and one public profile.
            </p>
            <div style={itemIndex(2)}>
              <Link
                href="/decks"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-[#0f0b0c] px-7 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-black active:scale-[0.98]"
              >
                Browse decks
              </Link>
            </div>
            <p style={itemIndex(3)} className="mt-14 text-xs text-[#ffd5da]">
              Card search is live for Yu-Gi-Oh! and Union Arena.
            </p>
          </div>
        </div>
      </section>

      {/* PROFILES */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#050506] via-[#17141a] to-[#3a2a31]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pt-24 lg:grid-cols-2 lg:pt-28">
          <div data-reveal="stagger" className="pb-4 lg:pb-24">
            <span style={itemIndex(0)} className="badge-accent">
              Profiles
            </span>
            <h2
              style={itemIndex(1)}
              className="mt-5 text-4xl font-medium leading-[1.15] text-white sm:text-5xl"
            >
              One profile for
              <br />
              every game you play
            </h2>
            <p style={itemIndex(2)} className="mt-6 max-w-md text-lg leading-relaxed text-neutral-200">
              Share a single link at locals instead of a separate account per game. Only the decks you
              mark public show up.
            </p>
            <div style={itemIndex(3)}>
              <Link href="/signup" className="btn-primary mt-8 px-7 py-3.5 text-base">
                Create your profile
              </Link>
            </div>
            <p style={itemIndex(4)} className="mt-16 text-xs text-neutral-500">
              Private decks stay private. You choose per deck.
            </p>
          </div>
          <div className="h-[34rem] overflow-hidden">
            <div data-reveal="up-lg" style={revealDelay(150)}>
              <ProfilePhone />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="relative overflow-hidden bg-[#140c0e]">
        <div aria-hidden className="halftone absolute inset-0 opacity-[0.05]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 text-center lg:py-28">
          <h2
            data-reveal="up"
            className="mx-auto max-w-xl text-4xl font-medium leading-[1.15] text-white sm:text-5xl"
          >
            Built to keep your account safe
          </h2>
          <ul
            data-reveal="stagger"
            style={motionStyle(revealDelay(150), staggerGap(130))}
            className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4"
          >
            {TRUST.map((item, i) => (
              <li key={item.title} style={itemIndex(i)} className="flex flex-col items-center">
                <span className="reveal-pop flex h-28 w-28 items-center justify-center rounded-full border border-brand/70 bg-brand/10 text-white">
                  <Icon name={item.icon} className="h-12 w-12" strokeWidth={1.2} />
                </span>
                <p className="mt-6 text-xl font-bold text-white">{item.title}</p>
                <p className="mt-2 max-w-[16rem] text-[15px] leading-relaxed text-neutral-400">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* AI ASSISTANTS */}
      <section id="ai" className="relative isolate overflow-hidden bg-brand">
        <div
          aria-hidden
          style={parallax(8)}
          className="parallax brush-bg absolute -left-[12%] -top-[20%] -z-10 aspect-[1280/880] w-[90%] rotate-[6deg] opacity-40"
        />
        <div
          aria-hidden
          style={parallax(5)}
          className="parallax halftone absolute -right-10 top-4 -z-10 h-[26rem] w-[34rem] opacity-20"
        />
        <div className="mx-auto max-w-4xl px-6 pt-24 text-center lg:pt-28">
          <div data-reveal="stagger" style={staggerGap(120)}>
            <h2 style={itemIndex(0)} className="text-5xl font-medium leading-[1.1] text-white sm:text-6xl">
              Bring your decks to
              <br />
              your AI assistant
            </h2>
            <p style={itemIndex(1)} className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#ffe9ec]">
              Connect Claude Desktop with a read-only access token, then ask about your decks in plain words.
            </p>
            <div style={itemIndex(2)}>
              <Link
                href="/account"
                className="mt-9 inline-flex items-center justify-center rounded-full bg-[#0f0b0c] px-8 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-black active:scale-[0.98]"
              >
                Create an access token
              </Link>
            </div>
          </div>
          <div className="mt-14 h-[21rem] overflow-hidden">
            <div data-reveal="up-lg" style={revealDelay(100)}>
              <ChatCard />
            </div>
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div
          aria-hidden
          style={parallax(10)}
          className="parallax brush-bg absolute -right-[10%] -top-[40%] -z-10 aspect-[1280/880] w-[80%] rotate-[14deg] opacity-50"
        />
        <div
          aria-hidden
          style={parallax(5)}
          className="parallax halftone absolute left-0 top-0 -z-10 h-[24rem] w-[30rem] opacity-20"
        />
        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">
          <h2
            data-reveal="scale"
            className="font-serif text-[4rem] font-normal leading-none tracking-[-0.03em] text-white sm:text-[7rem]"
          >
            Join the den<span className="text-brand-hi">.</span>
          </h2>
          <p data-reveal="up" style={revealDelay(180)} className="mt-6 text-xl text-neutral-200">
            Free to start. Bring every deck you play.
          </p>
          <div data-reveal="up" style={revealDelay(300)}>
            <HeroCtas single />
          </div>
        </div>
      </section>
    </div>
  );
}
