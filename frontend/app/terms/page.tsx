import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/app/components/page-hero";

export const metadata: Metadata = {
  title: "Terms of Service · DeckDen",
  description: "The rules for using DeckDen.",
};

const LAST_UPDATED = "August 17, 2026";

export default function TermsPage() {
  return (
    <div className="flex-1 flex flex-col items-center px-6 pb-24">
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        subtitle={`Last updated ${LAST_UPDATED}`}
      />

      <div className="w-full max-w-3xl legal-content">
        <p>
          These terms cover your use of DeckDen. By creating an account or
          browsing the site, you agree to them. DeckDen is a free,
          independently-run project — these terms are here to keep things
          fair and clear for everyone using it.
        </p>

        <h2>What DeckDen is</h2>
        <p>
          DeckDen lets you build, save, and share trading card game
          decklists across supported games. Browsing public decks doesn't
          require an account; creating, saving, and managing your own decks
          does.
        </p>

        <h2>Your account</h2>
        <ul>
          <li>You're responsible for keeping your password confidential and for all activity that happens under your account.</li>
          <li>You need to provide a working email address and choose a username that doesn't impersonate another person or brand.</li>
          <li>If you believe your account has been compromised, <Link href="/contact">contact us</Link> right away.</li>
        </ul>

        <h2>Acceptable use</h2>
        <p>When using DeckDen, you agree not to:</p>
        <ul>
          <li>Post deck names, descriptions, or other content that is illegal, harassing, or hateful.</li>
          <li>Impersonate another person, player, or organization.</li>
          <li>Attempt to disrupt, scrape at abusive scale, or gain unauthorized access to DeckDen or the third-party card databases it relies on.</li>
          <li>Use another user's account without permission.</li>
        </ul>
        <p>We may remove content or suspend accounts that violate these terms.</p>

        <h2>Public content</h2>
        <p>
          Marking a deck as <strong>public</strong> makes it, and your
          username, visible to anyone who visits the site. You're
          responsible for what you choose to publish. You can switch a deck
          back to private, or delete it, at any time.
        </p>

        <h2>Card data and intellectual property</h2>
        <p>
          Card names, artwork, and game data displayed on DeckDen belong to
          their respective publishers and are sourced through the games'
          public card databases for reference purposes only. DeckDen doesn't
          claim ownership of any card content. The DeckDen name, design, and
          codebase are the work of its developer.
        </p>

        <h2>No warranty</h2>
        <p>
          DeckDen is provided as-is, free of charge, with no guarantee of
          uptime or that it will always be available or error-free. Card
          search depends on third-party databases we don't control, so
          search results may occasionally be delayed or unavailable.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, DeckDen and its developer aren't
          liable for any indirect or incidental damages arising from your
          use of the site, including loss of data such as saved decklists.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          These terms may be updated from time to time. Continuing to use
          DeckDen after a change means you accept the updated terms.
        </p>

        <h2>Questions</h2>
        <p>
          If anything here doesn't make sense, <Link href="/contact">get in touch</Link>.
        </p>
      </div>
    </div>
  );
}
