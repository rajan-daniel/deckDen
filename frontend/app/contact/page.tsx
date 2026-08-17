import type { Metadata } from "next";
import { PageHero } from "@/app/components/page-hero";

export const metadata: Metadata = {
  title: "Contact · DeckDen",
  description: "Get in touch about bugs, feature ideas, or your account.",
};

const CONTACT_EMAIL = "rajan.daniel.dev@gmail.com";

const REASONS = [
  {
    label: "Report a bug",
    detail: "Something broken or behaving unexpectedly.",
    subject: "Bug report",
  },
  {
    label: "Suggest a feature",
    detail: "An idea for something DeckDen should support.",
    subject: "Feature suggestion",
  },
  {
    label: "Account or data request",
    detail: "Delete your account, or a question about your data.",
    subject: "Account request",
  },
  {
    label: "Something else",
    detail: "General feedback, or anything else.",
    subject: "General feedback",
  },
];

function mailto(subject: string) {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`DeckDen — ${subject}`)}`;
}

export default function ContactPage() {
  return (
    <div className="flex-1 flex flex-col items-center px-6 pb-24">
      <PageHero
        eyebrow="Get in touch"
        title="Contact"
        subtitle="DeckDen is a solo-built project — please feel free to reach out with any questions, bug reports, and feature ideas."
      />

      <div className="w-full max-w-2xl flex flex-col gap-8">
        <div className="card-surface p-8 text-center">
          <p className="text-sm text-neutral-400 mb-3">Reach out directly at</p>
          <a
            href={mailto("General feedback")}
            className="text-xl sm:text-2xl font-semibold gradient-text hover:underline break-all"
          >
            {CONTACT_EMAIL}
          </a>
          <p className="text-sm text-neutral-500 mt-4">
            I read every message. Response times vary since this is a
            one-person project, but I'll get back to you as soon as I can.
          </p>
        </div>

        <div>
          <p className="footer-heading text-center mb-4">Or pick a reason</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REASONS.map((reason) => (
              <a
                key={reason.label}
                href={mailto(reason.subject)}
                className="card-surface group p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-sky-500/50 hover:shadow-lg hover:shadow-purple-500/15"
              >
                <p className="font-medium text-neutral-100 group-hover:text-sky-400 transition-colors">
                  {reason.label}
                </p>
                <p className="text-sm text-neutral-500 mt-1">{reason.detail}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
