import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/app/components/page-hero";

export const metadata: Metadata = {
  title: "Privacy Policy · DeckDen",
  description: "What DeckDen collects, how it's used, and how it's stored.",
};

const LAST_UPDATED = "August 17, 2026";

export default function PrivacyPage() {
  return (
    <div className="flex-1 flex flex-col items-center px-6 pb-24">
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle={`Last updated ${LAST_UPDATED}`}
      />

      <div className="w-full max-w-3xl legal-content">
        <p>
          This policy explains what information DeckDen collects when you use
          the site, how it's used, and what control you have over it. DeckDen
          is a free, independently-run deck-building tool — we don't sell
          data, and we don't run ads or trackers.
        </p>

        <h2>Information we collect</h2>
        <p>When you create an account, we collect:</p>
        <ul>
          <li>Your <strong>username</strong>, which is shown publicly on your profile and on any decks you make public.</li>
          <li>Your <strong>email address</strong>, used to log you in — it is never shown publicly.</li>
          <li>Your <strong>password</strong>, which is hashed with bcrypt before it's stored. We never store or have access to your password in plain text.</li>
        </ul>
        <p>When you build a deck, we store the deck's name, game, format, description, and public/private status, along with the cards you add to it — each card's name, quantity, category, and an image link sourced from that game's card database.</p>

        <h2>Card search and third-party services</h2>
        <p>
          DeckDen doesn't maintain its own database for every game. When you
          search for a Yu-Gi-Oh! or Pokémon card, that search is sent
          directly from your browser to the relevant third-party card
          database — {" "}
          <a href="https://db.ygoprodeck.com" target="_blank" rel="noopener noreferrer">YGOPRODeck</a>
          {" "}for Yu-Gi-Oh! and{" "}
          <a href="https://pokemontcg.io" target="_blank" rel="noopener noreferrer">the Pokémon TCG API</a>
          {" "}for Pokémon. DeckDen's own servers don't see or log those
          searches. Union Arena card search is handled by DeckDen's own
          database instead.
        </p>

        <h2>Public vs. private decks</h2>
        <p>
          Decks you mark <strong>public</strong> — along with your username —
          are visible to anyone who visits DeckDen, including on the Browse
          Decks pages and your public profile. Decks left <strong>private</strong>{" "}
          are visible only to you when you're logged in.
        </p>

        <h2>How your data is stored</h2>
        <p>
          Account and deck data is stored in a PostgreSQL database. When you
          log in, we issue a session token (a JWT) that's stored in your
          browser's local storage and expires an hour after it's issued, at
          which point you'll need to log in again.
        </p>

        <h2>Cookies and tracking</h2>
        <p>
          DeckDen does not use tracking cookies, third-party analytics, or
          advertising scripts of any kind. The only thing kept in your
          browser is the login session token described above.
        </p>

        <h2>Your data, your control</h2>
        <p>
          You can delete individual decks and cards yourself at any time from
          within your account. There's currently no self-service option to
          delete your account entirely — to do that, or to ask what data we
          have on file for you,{" "}
          <Link href="/contact">contact us</Link> and we'll take care of it.
        </p>

        <h2>Children's privacy</h2>
        <p>
          DeckDen is not directed at children under 13, and we don't
          knowingly collect information from anyone under that age.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If this policy changes in a meaningful way, we'll update the date
          at the top of this page. Continuing to use DeckDen after a change
          means you accept the updated policy.
        </p>

        <h2>Questions</h2>
        <p>
          If anything here is unclear, or you want to know more about your
          data, <Link href="/contact">reach out</Link> — we're happy to
          explain.
        </p>
      </div>
    </div>
  );
}
